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
    clock: (world.countdown && world.countdown.start) || 0, discovered: [],
    clues: [], layers: [], phase: 'tell',
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
字段：gist(该角色此刻的抉择/行动，一句), foreshadow(可埋的一处细小伏笔，一句), surfaced(玩家能察觉到的后果，一句), soul_delta{mood,arc_advance(true/false),memory_add,rel_player_shift(-2到2整数)}, leaning(结局倾向，取值 ${world.leaning_legend}，或 null), plausibility(0到1, 仅替代分支需要)。
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
  const order = ['A', 'B', 'C'];
  let bestIdx = 0, bv = -Infinity;
  order.forEach((k, i) => { if ((L[k] || 0) > bv) { bv = L[k] || 0; bestIdx = i; } });
  return world.convergence.variants[bestIdx] || world.convergence.variants[0];
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


// ── 副本模式旁白：隐藏规则 + 裁决生死 + 规则发现（硬核死亡游戏）──
async function narrateDungeon(world, state, opts, key) {
  const recent = state.world_events.slice(-6).join('\n') || '（你刚在这个房间里睁开眼）';
  const surfacedTxt = (opts.surfaced || []).map(s => `- ${s.who}：${s.text}${s.twist ? '（这是一个转折，请先埋伏笔、事后回收）' : ''}`).join('\n');
  const rulesTxt = world.rules.map(r => `【${r.id}】${r.text}（可通过：${r.discover_via} 被察觉）`).join('\n');
  const knownTxt = state.discovered.length ? state.discovered.join('、') : '（暂未确认任何规则）';
  const last = state.clock <= 1;
  const sys =
`你是一场高压"死亡游戏"副本的主持人兼旁白，第二人称。基调：${world.tone}
你掌握以下【隐藏规则】（玩家并不知道，必须靠试探与观察去发现；你要像裁判一样公平裁决）：
${rulesTxt}
【真相】（服务端机密，用于埋伏笔与最终反转，绝不可直接说破）：${world.truth}
裁决与写作要求：
- 只有当玩家的行动"确实"违反了某条规则，才让致命后果发生；不无端处死，也绝不放水。踩线时后果冷硬、明确。
- 每回合都要有"针对你"的直接压力：广播点名、他人逼视、镜中异动、倒计时逼近……逼你必须选择。
- 适度掉线索，让敏锐的玩家能推理出规则；埋的伏笔要能在真相揭晓时回收。
- 旁白一段约 90~160 字，克制的恐怖，压力来自规则与倒计时，而非血腥。`;
  const user =
`玩家：${world.player_role.who}
红灯还剩：${state.clock} ${world.countdown.unit}${last ? '（这是最后一次，本回合必须决出生死：活着且识破真相者逃出，否则消失）' : ''}
玩家已确认的规则：${knownTxt}
最近发生：\n${recent}
${surfacedTxt ? '本回合浮现（自然融入）：\n' + surfacedTxt : ''}
${opts.first ? '这是开场：把玩家带进这个没有门窗、只有一盏红灯和一面镜子的密室，交代墙上的血字与手腕上的数字，让危险感立刻立起来。' : ''}

严格按格式输出：
先写旁白正文（一段）；
另起一行写三个减号：---
若玩家还活着，写 2~3 个以"你"开头、具体且带风险的行动选项，每行一个；若玩家在本段已死亡或逃脱，此处留空。
再另起一行写三个等号：===
最后写状态行：STATUS: alive 或 STATUS: dead 或 STATUS: escaped
若本回合玩家确认了某条规则，再加一行：KNOW: 规则编号（如 R1,R3）`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 1000, system: sys, messages: [{ role: 'user', content: user }] }),
  });
  if (!r.ok) { let d = null; try { d = await r.json(); } catch (e) {} throw new Error('anthropic ' + r.status + (d && d.error ? ' ' + (d.error.message || '') : '')); }
  const data = await r.json();
  const rawTxt = cleanText((data && data.content ? data.content : []).map(b => b && b.text).filter(Boolean).join('\n'));
  const seg = rawTxt.split(/\n\s*={3,}\s*\n/);
  const mainPart = seg[0] || rawTxt, metaPart = seg[1] || '';
  const parts = mainPart.split(/\n\s*-{3,}\s*\n/);
  const narration = (parts[0] || '').trim() || '（红灯明灭，你屏住呼吸。）';
  const choices = parts[1] ? parts[1].split('\n').map(l => l.replace(/^\s*(?:[-*•]|\d+[.)、])\s*/, '').replace(/^["'「]+|["'」]+$/g, '').trim()).filter(Boolean).slice(0, 3) : [];
  const status = ((metaPart.match(/STATUS\s*[:：]\s*(alive|dead|escaped)/i) || [])[1] || 'alive').toLowerCase();
  const discover = metaPart.match(/R\d+/g) || [];
  return { narration, choices, status, discover };
}


// ── 推理副本旁白：三层真相 + 线索/层级发现 + 投票结算（清醒推理者视角，引擎适时点破）──
async function narrateDeduction(world, state, opts, key) {
  const recent = state.world_events.slice(-6).join('\n') || '（你在圆桌旁睁开眼）';
  const surfacedTxt = (opts.surfaced || []).map(s => `- ${s.who}：${s.text}${s.twist ? '（转折：先埋伏笔、事后回收）' : ''}`).join('\n');
  const layersTxt = world.layers.map(l => `【${l.id}】${l.secret}（可由：${l.unlock_via} 触发）`).join('\n');
  const cluesTxt = world.clues.map(c => `[${c.id}] ${c.text} → 指向 ${c.layer}`).join('\n');
  const npcTxt = world.souls.map(s => `· ${s.name}（${s.role}）｜公开故事：${s.story}｜藏着的真相[机密]：${s.secret}`).join('\n');
  const knownClues = state.clues.length ? state.clues.join('、') : '（暂无）';
  const knownLayers = state.layers.length ? state.layers.join('、') : '（仍停在表层）';
  const phase = state.phase;
  const phaseName = { tell: '陈述', probe: '质询', vote: '投票' }[phase];

  const sys =
`你是一场"说谎者"推理副本的主持人兼第二人称旁白。基调：${world.tone}
【三层真相】（玩家不知道，必须靠试探逐层揭开；你要公平掉线索）：
${layersTxt}
【可发现的线索】：
${cluesTxt}
【在座角色档案（含仅你可见的机密：各自藏在故事里的真正死法）】：
${npcTxt}
【投票结算规则】：${world.resolution}
裁决与写作要求：
- 玩家是"清醒的推理者"（不是说谎者本人），你要引导而非替他做题：他试探/观察到位就掉对应线索；当他明显逼近某一层真相时，替他点破，形成"原来如此"的坠落感。
- 陈述阶段：让轮到的角色讲述自己的故事（自然带出可被追问的破绽），不要一次讲完所有人。
- 质询阶段：角色会维护自己、隐瞒、甚至反咬玩家；让矛盾自然浮现。
- 投票阶段：给出投票相关的选项；玩家表态后，严格按结算规则判定结局 A/B/C。
- 旁白一段约 90~160 字，克制、高压、情绪浓，不血腥堆砌。`;
  const user =
`玩家：${world.player_role.who}
当前阶段：${phaseName}｜第 ${state.turn} 回合
玩家已掌握的线索：${knownClues}
玩家已揭开的真相层：${knownLayers}
最近发生：\n${recent}
${surfacedTxt ? '本回合浮现（自然融入）：\n' + surfacedTxt : ''}
${opts.first ? '这是开场：把玩家带进这个没有门窗、只有一张旧圆桌和一座座钟的密室，交代山羊面具主持人与"说谎者"游戏规则，让危险与谜团立刻立起来。' : ''}

严格按格式输出：
先写旁白正文（一段）；
另起一行写三个减号：---
写 2~3 个以"你"开头、具体的行动/追问/表态选项，每行一个（投票阶段则为投票相关选项，如"你写下：人羊"/"你写下某位参与者的名字"/"你开口道破：我们其实都已经死了"）；若本段已出结局，此处留空。
再另起一行写三个等号：===
若本回合玩家得到新线索，写一行：NEWCLUE: 线索号（如 C1,C4）
若本回合揭开了某层真相，写一行：UNLOCK: 层号（如 L1 或 L2）
写状态行：STATUS: continue 或 STATUS: ending
若结局产生，再写一行：ENDING: A 或 B 或 C`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 1100, system: sys, messages: [{ role: 'user', content: user }] }),
  });
  if (!r.ok) { let d = null; try { d = await r.json(); } catch (e) {} throw new Error('anthropic ' + r.status + (d && d.error ? ' ' + (d.error.message || '') : '')); }
  const data = await r.json();
  const rawTxt = cleanText((data && data.content ? data.content : []).map(b => b && b.text).filter(Boolean).join('\n'));
  const seg = rawTxt.split(/\n\s*={3,}\s*\n/);
  const mainPart = seg[0] || rawTxt, metaPart = seg[1] || '';
  const parts = mainPart.split(/\n\s*-{3,}\s*\n/);
  const narration = (parts[0] || '').trim() || '（座钟滴答，空气凝滞。）';
  const choices = parts[1] ? parts[1].split('\n').map(l => l.replace(/^\s*(?:[-*•]|\d+[.)、])\s*/, '').replace(/^["'「]+|["'」]+$/g, '').trim()).filter(Boolean).slice(0, 3) : [];
  const clues = metaPart.match(/C\d+/g) || [];
  const unlock = metaPart.match(/L\d+/g) || [];
  const status = /STATUS\s*[:：]\s*ending/i.test(metaPart) ? 'ending' : 'continue';
  const ending = ((metaPart.match(/ENDING\s*[:：]\s*([ABC])/i) || [])[1] || '').toUpperCase() || null;
  return { narration, choices, clues, unlock, status, ending };
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
      if (world.mode === 'dungeon' && typeof state.clock === 'number') state.clock = Math.max(0, state.clock - 1);
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

    // 推理副本：三层真相 + 投票结算
    if (world.mode === 'deduction') {
      const pc = world.phase_clock || { tell_until: 3, probe_until: 7 };
      state.phase = state.turn <= pc.tell_until ? 'tell' : (state.turn <= pc.probe_until ? 'probe' : 'vote');
      const outX = await narrateDeduction(world, state, { surfaced, first }, anthKey);
      (outX.clues || []).forEach(id => { if (world.clues.some(c => c.id === id) && !state.clues.includes(id)) state.clues.push(id); });
      (outX.unlock || []).forEach(id => { if (world.layers.some(l => l.id === id) && !state.layers.includes(id)) state.layers.push(id); });
      let endX = null, endId = outX.status === 'ending' ? outX.ending : null;
      // 兜底：投票阶段拖太久仍未结算，按已揭层级强制收场
      if (!endId && state.phase === 'vote' && state.turn > pc.probe_until + 2) endId = state.layers.includes('L2') ? 'C' : (state.layers.includes('L1') ? 'B' : 'A');
      if (endId) { const map = { A: '全员制裁', B: '识破人羊 · 惨活', C: '难以接受的真相' }; endX = { id: endId, title: map[endId] || '结束' }; }
      const doneX = !!endX;
      const imgX = sceneFor(world, state, endX, first);
      const phaseName = { tell: '陈述', probe: '质询', vote: '投票' }[state.phase];
      return res.json({
        narration: outX.narration, choices: doneX ? [] : outX.choices, image_prompt: imgX,
        world_meta: first ? { title: world.title, logline: world.logline } : undefined,
        hud: { mode: 'deduction', phase: phaseName, clues: state.clues.length, clues_total: world.clues.length, layers: state.layers.slice() },
        state, done: doneX, ending: endX,
      });
    }

    // 副本模式：隐藏规则 + 生死裁决
    if (world.mode === 'dungeon') {
      const outD = await narrateDungeon(world, state, { surfaced, first }, anthKey);
      (outD.discover || []).forEach(id => { if (world.rules.some(r => r.id === id) && !state.discovered.includes(id)) state.discovered.push(id); });
      let status = outD.status;
      if (status === 'alive' && state.clock <= 0 && state.turn > world.countdown.start + 2) status = 'dead';
      let endD = null;
      if (status === 'dead') endD = { id: 'dead', title: '你留在了这里' };
      else if (status === 'escaped') endD = { id: 'escaped', title: '你醒了过来' };
      const doneD = !!endD;
      const imgD = sceneFor(world, state, endD, first);
      return res.json({
        narration: outD.narration,
        choices: doneD ? [] : outD.choices,
        image_prompt: imgD,
        world_meta: first ? { title: world.title, logline: world.logline } : undefined,
        hud: { clock: state.clock, unit: world.countdown.unit, discovered: state.discovered.slice() },
        state, done: doneD, ending: endD,
      });
    }

    // 剧情模式：汇聚判定
    const ending = first ? null : checkConvergence(world, state);
    const out = await narrate(world, state, { surfaced, first, ending }, anthKey);
    const image_prompt = sceneFor(world, state, ending, first);

    return res.json({
      narration: out.narration,
      choices: out.choices,
      image_prompt,
      world_meta: first ? { title: world.title, logline: world.logline } : undefined,
      state,
      done: !!ending,
      ending: ending ? { id: ending.id, title: ending.title } : null,
    });
  } catch (err) {
    console.error('story handler error:', err);
    return res.status(502).json({ error: 'engine error', detail: err.message });
  }
}
