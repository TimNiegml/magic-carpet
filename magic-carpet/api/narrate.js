// api/narrate.js — Claude 旁白生成代理
// 接收 { destination, context? }
// 返回 { text, mood, choices }：
//   text    旁白正文
//   mood    氛围标签 sky/sea/space/desert/battle/calm（前端据此切换背景音乐）
//   choices 三个后续故事走向选项

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { destination, context } = req.body;
  if (!destination) return res.status(400).json({ error: 'destination is required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' });

  const contextBlock = context
    ? `\n\n此前的旅程情节（请自然衔接，不要重复）：\n${context}`
    : '';

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
MOOD: 从 sky/sea/space/desert/battle/calm 中选一个最贴合本段氛围的词（海洋水下选sea；太空月宫仙境星河选space；沙漠戈壁选desert；紧张冒险打斗风暴选battle；高空飞行云端选sky；其余选calm）
TEXT: 一段90-130字的沉浸式中文冥想旁白。要求：第一句必须少于15字（如"风，托起了魔毯。"）；语调极度温柔缓慢如呢喃；先用15-25字描绘移动体感（风、云、水流、失重、速度）；再用70-90字描写到达${destination}的感官细节（看到的颜色光线、听到的声音、闻到的气息、皮肤的温度触感）；如有神话人物（嫦娥、孙悟空、龙王等）、科幻元素或著名地标自然融入；结尾一句10-15字以温柔的邀请或提问收束；每句都短，用句号或省略号断句
CHOICES: 三个后续故事走向，每个6-12字，用｜分隔（例如：跟着鲸鱼去深处｜浮上月光海面｜去珊瑚宫殿做客）`,
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
    if (mCh) choices = mCh[1].split(/[｜|]/).map(s => s.trim()).filter(Boolean).slice(0, 3);

    res.json({ text, mood, choices });

  } catch (err) {
    console.error('Narrate handler error:', err);
    res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}
