// api/story.js — 世界模式回合引擎
// 明线(玩家) → 暗线(DeepSeek 推演 soul) → 惊喜引擎(seed+surprise 加权抽branch) → 汇聚判定 → 旁白(Claude Sonnet)
// 请求 { state?, choice?, world_id?, params? }；返回 { narration, choices[], state, done, ending? }
// 环境变量：ANTHROPIC_API_KEY（旁白）、DEEPSEEK_API_KEY（暗线）
import WORLDS from './_worlds.js';

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';
const DEEPSEEK_MODEL  = process.env.DEEPSEEK_MODEL  || 'deepseek-chat';

// ── 可复现随机：mulberry32 ──
function rngFrom(n) {
  let a = (n >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function safeJson(text) {
  if (!text) return null;
  let t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/,'').trim();
  const i = t.indexOf('{'), j = t.lastIndexOf('}');
  if (i >= 0 && j > i) t = t.slice(i, j + 1);
  try { return JSON.parse(t); } catch (e) { return null; }
}

// ── 初始化一场故事的状态（下发给前端，不含任何 secret）──
function initState(world, params) {
  const p = Object.assign({}, world.default_params, params || {});
  if (!p.seed) p.seed = Math.floor(Math.random() * 1e6);
  const souls = {};
  for (const s of world.souls) {
    souls[s.name] = { mood: s.opening_mood, arc: 0, memory: [], rel_player: s.relationship_to_player_init };
  }
  return {
    world_id: world.id, turn: 0, act: 1, tension: 0,
    params: p, player_choices: [], souls,
    world_events: [], flags: { fired: [], foreshadows: [], leaning: { A: 0, B: 0, C: 0 }, scene: null },
  };
}

function advanceAct(state, world) {
  const c = world.act_clock;
  if (state.turn >= c.act3_at) state.act = 3;
  else if (state.turn >= c.act2_at) state.act = 2;
  else state.act = 1;
}

function triggeredBeats(world, state) {
  return world.beats.filter(b =>
    b.act <= state.act && state.turn >= b.after_turn && !state.flags.fired.includes(b.id));
}

// ── 暗线：DeepSeek 对涉及角色做推演，返回 预期动作 + 替代分支 ──
async function advanceSouls(world, state, beats, key) {
  const involved = [...new Set(beats.flatMap(b => b.involves))];
  const dossiers = world.souls.filter(s => involved.includes(s.name)).map(s => ({
    name: s.name, role: s.role, core_desire: s.core_desire, values: s.values,
    secret: s.secret, // 仅后端可见
    now: state.souls[s.name],
  }));
  const lastMove = state.world_events.slice(-1)[0] || '（故事刚开始）';
  const sys = '你是一部互动小说的"暗线推演引擎"。依据每个角色的欲望/价值观/秘密，推演他们此刻的抉择。只输出 JSON，不要任何解释。';
  const user =
`世界基调：${world.tone}
玩家刚才：${lastMove}
需要推进的暗线节拍：
${beats.map(b => `- [${b.id}] ${b.cue}；方向：${b.hint}`).join('\n')}

涉及角色档案（含仅你可见的秘密）：
${JSON.stringify(dossiers, null, 1)}

优先让角色主动与"你"（玩家）产生互动：迎向你、对你说话、请你帮忙、把东西交给你、或因你此前的选择而改变对你的态度。
对每个涉及角色，输出一个"预期动作"（最符合其价值观与欲望）+ 1~2 个"合理但不显眼"的替代分支。
字段：gist(该角色此刻的抉择/行动，一句), foreshadow(可埋的一处细小伏笔，一句), surfaced(玩家能察觉到的后果，一句), soul_delta{mood,arc_advance(true/false),memory_add,rel_player_shift(-2到2整数)}, leaning("A"救灯团圆/"B"以人代灯/"C"错过, 或 null), plausibility(0到1, 仅替代分支需要)。
严格输出：{"advances":[{"character":"名","expected":{...},"alternatives":[{...}]}]}`;

  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL, temperature: 1.0,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
    }),
  });
  if (!r.ok) throw new Error('deepseek ' + r.status);
  const data = await r.json();
  const parsed = safeJson(data?.choices?.[0]?.message?.content);
  return parsed?.advances || [];
}

// ── 惊喜引擎：seed + surprise 决定走"预期"还是"转折" ──
function pickBranch(adv, surprise, rng) {
  const opts = [Object.assign({ _kind: 'expected' }, adv.expected || {})];
  const w = [Math.max(1, 100 - surprise)];
  for (const a of (adv.alternatives || [])) {
    opts.push(Object.assign({ _kind: 'twist' }, a));
    w.push(Math.max(0, surprise * (typeof a.plausibility === 'number' ? a.plausibility : 0.5)));
  }
  const total = w.reduce((x, y) => x + y, 0) || 1;
  let r = rng() * total;
  for (let i = 0; i < opts.length; i++) { if ((r -= w[i]) <= 0) return opts[i]; }
  return opts[0];
}

function applyAdvances(state, advances) {
  const surfaced = [];
  advances.forEach((adv, idx) => {
    const rng = rngFrom(state.params.seed * 1000 + state.turn * 10 + idx);
    const chosen = pickBranch(adv, state.params.surprise, rng);
    const soul = state.souls[adv.character];
    const d = chosen.soul_delta || {};
    if (soul) {
      if (d.mood) soul.mood = d.mood;
      if (d.arc_advance) soul.arc += 1;
      if (d.memory_add) soul.memory.push(d.memory_add);
      if (typeof d.rel_player_shift === 'number') soul.rel_player = adjustRel(soul.rel_player, d.rel_player_shift);
    }
    if (chosen.surfaced) { state.world_events.push(`【${adv.character}】${chosen.surfaced}`); surfaced.push({ who: adv.character, text: chosen.surfaced, twist: chosen._kind === 'twist' }); }
    if (chosen.foreshadow) state.flags.foreshadows.push({ turn: state.turn, who: adv.character, hint: chosen.foreshadow });
    if (chosen.leaning && state.flags.leaning[chosen.leaning] != null) state.flags.leaning[chosen.leaning] += (chosen._kind === 'twist' ? 2 : 1);
    if (chosen._kind === 'twist') state.tension += 1;
  });
  return surfaced;
}

function adjustRel(r, shift) { return `${r}${shift > 0 ? '（更亲近）' : shift < 0 ? '（更疏离）' : ''}`; }

function checkConvergence(world, state) {
  const t = world.convergence.trigger;
  const ready = state.act >= t.act && state.turn >= t.min_turn &&
    (state.turn >= world.act_clock.target_turns || state.tension >= 5);
  if (!ready) return null;
  const L = state.flags.leaning;
  let best = 'A', bv = -Infinity;
  for (const k of ['A', 'B', 'C']) if (L[k] > bv) { bv = L[k]; best = k; }
  const map = { A: 'A_light_on', B: 'B_human_beacon', C: 'C_missed' };
  return world.convergence.variants.find(v => v.id === map[best]) || world.convergence.variants[0];
}


// ── 配图：换幕/开场/结局才出新图（每幕一张，控延时与成本）──
function sceneFor(world, state, ending, first) {
  const sc = world.scenes || {};
  let key, prompt;
  if (ending) { key = 'end:' + ending.id; prompt = (sc.endings || {})[ending.id]; }
  else if (first) { key = 'intro'; prompt = sc.intro; }
  else { key = 'act' + state.act; prompt = sc['act' + state.act]; }
  if (!prompt || state.flags.scene === key) return null;
  state.flags.scene = key;
  return prompt;
}

// ── 旁白：Claude Sonnet（用 --- 分隔正文与选项，避开 JSON 对散文的脆弱性）──
function cleanText(t) { return String(t || '').replace(/^```(?:json)?/i, '').replace(/```$/,'').trim(); }

async function narrate(world, state, opts, key) {
  const recent = state.world_events.slice(-6).join('\n') || '（风暴前的宁静，故事正要开始）';
  const surfacedTxt = (opts.surfaced || []).map(s => `- ${s.who}：${s.text}${s.twist ? '（这是一个转折，请先埋一处小伏笔、事后回收，让它意外却合乎情理）' : ''}`).join('\n');
  const payoff = state.flags.foreshadows.slice(-3).map(f => `- ${f.who}：${f.hint}`).join('\n');

  const rules =
`你为一部第二人称互动小说写旁白。基调：${world.tone}
写作要求：
- 称呼玩家为"你"；温柔克制、呢喃般的短句；旁白一段约 80~150 字。
- 每一段都要有至少一次"针对你"的直接互动：某个角色对你说话（引用一句简短对白）、把什么递到你手里、问你一个问题、或拉着你一起做一件事——你是身在其中的当事人，不是旁观者。
- 把本回合"浮现事件"自然融进叙述，不要罗列；给了"可回收的伏笔"就择机点破，形成"原来如此"的瞬间。
- 让此刻有一点推进或悬念，不要停在原地写景；不惊吓、不喧哗。`;

  let user, wantChoices = true;
  if (opts.ending) {
    wantChoices = false;
    user =
`这是故事的结局。走向：《${opts.ending.title}》——${opts.ending.tone}。
玩家：${world.player_role.who}
最近发生：\n${recent}
请只写一段收束全篇的结尾旁白（不要选项、不要任何解释、不要标题）。`;
  } else {
    user =
`玩家角色：${world.player_role.who}
当前第 ${state.act} 幕，第 ${state.turn} 回合。
最近发生：\n${recent}
${surfacedTxt ? '本回合浮现（需自然融入）：\n' + surfacedTxt : ''}
${payoff ? '可回收的伏笔（择机点破）：\n' + payoff : ''}
${opts.first ? '这是开场：把玩家轻轻带入这座风暴将至的孤岛与灯塔。' : ''}

严格按以下格式输出，不要 JSON、不要多余解释：
先写旁白正文（一段）；
然后另起一行，只写三个减号：---
然后每行一个选项，共 2~3 行，每行以"你"开头。选项要具体、当下就能做、彼此差异明显，尽量是推动剧情的抉择或与某个角色的直接互动，不要只是"看看四周/待在原地"这类观望。`;
  }

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL, max_tokens: 1000,
      system: rules,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!r.ok) { let d = null; try { d = await r.json(); } catch (e) {} throw new Error('anthropic ' + r.status + (d && d.error ? ' ' + (d.error.message || '') : '')); }
  const data = await r.json();
  const raw = cleanText((data && data.content ? data.content : []).map(b => b && b.text).filter(Boolean).join('\n'));

  if (!wantChoices) return { narration: raw || '（夜色沉沉，故事在这里静静落幕。）', choices: [] };

  const parts = raw.split(/\n\s*-{3,}\s*\n/);
  let narration = (parts[0] || raw).trim();
  let choices = [];
  if (parts[1]) {
    choices = parts[1].split('\n')
      .map(l => l.replace(/^\s*(?:[-*•]|\d+[.)、])\s*/, '').replace(/^["'「]+|["'」]+$/g, '').trim())
      .filter(Boolean).slice(0, 3);
  }
  if (!narration) narration = '（夜风掠过灯塔，你等待着下一刻。）';
  if (!choices.length) choices = ['你走上前，看得更近些', '你停在原地，静静看着', '你开口，说点什么'];
  return { narration, choices };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const anthKey = process.env.ANTHROPIC_API_KEY;
  if (!anthKey) return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' });
  const dsKey = process.env.DEEPSEEK_API_KEY;

  const { state: inState, choice, world_id, params } = req.body || {};
  const world = WORLDS[(inState && inState.world_id) || world_id || 'storm-lighthouse'];
  if (!world) return res.status(400).json({ error: 'unknown world' });

  let state = inState;
  const first = !state;

  try {
    if (first) {
      state = initState(world, params);
    } else {
      if (choice) { state.player_choices.push(choice); state.world_events.push(`【你】${choice}`); state.tension += 0.5; }
      state.turn += 1;
      advanceAct(state, world);
    }

    // 暗线（首回合不跑；缺 DeepSeek key 则跳过，故事仍可继续）
    let surfaced = [];
    if (!first && dsKey) {
      const beats = triggeredBeats(world, state);
      if (beats.length) {
        try {
          const advances = await advanceSouls(world, state, beats, dsKey);
          surfaced = applyAdvances(state, advances);
          beats.forEach(b => state.flags.fired.push(b.id));
        } catch (e) { console.error('darkline skip:', e.message); }
      }
    }

    // 汇聚判定
    const ending = first ? null : checkConvergence(world, state);
    const out = await narrate(world, state, { surfaced, first, ending }, anthKey);
    const image_prompt = sceneFor(world, state, ending, first);

    return res.json({
      narration: out.narration,
      choices: out.choices,
      image_prompt,
      state,
      done: !!ending,
      ending: ending ? { id: ending.id, title: ending.title } : null,
    });
  } catch (err) {
    console.error('story handler error:', err);
    return res.status(502).json({ error: 'engine error', detail: err.message });
  }
}
