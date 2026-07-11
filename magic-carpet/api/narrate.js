// api/narrate.js — Claude 旁白生成代理
// 接收 { destination, context?, story? }
//   story: 0-100 故事感比例。低=体验性(纯观景冥想)，高=故事性(听众是主角，情节互动)
// 返回 { text, mood, choices }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { destination, context, story } = req.body;
  if (!destination) return res.status(400).json({ error: 'destination is required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' });

  const contextBlock = context
    ? `\n\n此前的旅程情节（请自然衔接，不要重复）：\n${context}`
    : '';

  // 故事感档位 → 写作风格要求
  const s = Number.isFinite(Number(story)) ? Math.max(0, Math.min(100, Number(story))) : 50;
  let styleReq, choiceReq;
  if (s <= 30) {
    styleReq = '本段以"体验感"为主：纯粹的观景与感官沉浸，像一次安静的呼吸练习。以光线、声音、气息、温度的细腻描写为核心，节奏最缓、留白最多；主角时刻最多一个（比如一片叶子落在你的肩上），也可以完全没有，让听众只是安然地在场';
    choiceReq = '三个选项偏向安静的去处或停留方式（如：在湖边多坐一会儿｜看夕阳沉入云海｜听风穿过松林）';
  } else if (s <= 65) {
    styleReq = '观景与互动均衡：必须安排至少一个"主角时刻"——让世界主动与听众互动，比如一条鱼跃到你面前、一滴水落在你脸上、有人轻声对你说一句话——听众是故事的主角而不只是旁观的游客，但观景与互动要交替，不要每句都是互动';
    choiceReq = '三个选项兼顾探索与停留（如：跟着鲸鱼去深处｜浮上月光海面｜去珊瑚宫殿做客）';
  } else {
    styleReq = '本段以"故事感"为主：听众就是这个故事的主角。安排两到三个互动事件——有角色迎向你、直接对你说话（引用一句简短对白，如：嫦娥轻声说，你终于来了）、把什么放进你手心、或拉起你的手带你行动；情节要有一点推进或小小的惊喜转折，让听众有强烈的"这是发生在我身上"的临场感；但语气始终温柔包裹，不惊吓、不紧迫';
    choiceReq = '三个选项写成剧情抉择，以"你"的行动开头（如：接过她递来的灯｜跟他跃入云海｜推开那扇发光的门）';
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        // sonnet 比 opus 快很多，130字旁白质量足够，显著降低等待
        model:      'claude-sonnet-4-5',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `你是一位极致温柔的冥想引导师，带领听众乘坐神奇魔毯旅行。魔毯正飞向"${destination}"。${contextBlock}

请严格按以下三行格式输出（不要输出任何其他内容）：
MOOD: 从 sky/sea/space/desert/battle/stream/calm 中选一个最贴合本段氛围的词（海洋水下选sea；太空月宫仙境星河选space；沙漠戈壁选desert；紧张冒险打斗风暴选battle；高空飞行云端选sky；溪流泉水瀑布选stream；其余选calm）
TEXT: 一段90-140字的沉浸式中文冥想旁白。要求：第一句必须少于15字（如"风，托起了魔毯。"）；语调极度温柔缓慢如呢喃；先用15-25字描绘移动体感（风、云、水流、失重、速度）；${styleReq}；如有神话人物（嫦娥、孙悟空、龙王等）、科幻元素或著名地标自然融入；结尾一句10-15字以温柔的邀请或提问收束；每句都短，用句号或省略号断句
CHOICES: 三个后续故事走向，每个6-12字，用｜分隔；${choiceReq}`,
        }],
      }),
    });

    const data = await response.json();

    if (!data.content || !data.content[0]) {
      console.error('Claude API error:', data);
      return res.status(502).json({ error: 'Claude API error', detail: data.error?.message });
    }

    // 解析结构化输出；解析失败时优雅降级为纯文本
    const raw = data.content[0].text.trim();
    let text = raw, mood = null, choices = [];
    const mMood = raw.match(/MOOD[:：]\s*([a-zA-Z]+)/);
    const mText = raw.match(/TEXT[:：]\s*([\s\S]*?)(?=\n\s*CHOICES[:：]|$)/);
    const mCh   = raw.match(/CHOICES[:：]\s*(.+)/);
    if (mText && mText[1].trim()) text = mText[1].trim();
    if (mMood) mood = mMood[1].toLowerCase();
    if (mCh) choices = mCh[1].split(/[｜|]/).map(x => x.trim()).filter(Boolean).slice(0, 3);

    res.json({ text, mood, choices });

  } catch (err) {
    console.error('Narrate handler error:', err);
    res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}
