// api/narrate.js — Claude 旁白生成代理
// 接收 { destination, context? }，返回冥想旁白文字
// context 可选：蓝本场景的上文，让续篇衔接自然

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
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `你是一位极致温柔的冥想引导师，带领听众乘坐神奇魔毯旅行。魔毯正飞向"${destination}"。${contextBlock}

请写一段90-130字的沉浸式中文冥想旁白，风格要求：
1. 第一句必须少于15字（如"风，托起了魔毯。"），这很重要
2. 语调极度温柔、缓慢、如呢喃，让人身心放松
3. 用15-25字描绘飞行/移动的体感（风、云、水流、失重、速度）
4. 再用70-90字描写到达${destination}的感官细节：
   - 看到什么颜色和光线
   - 听到什么声音
   - 感受到什么气息和温度
   - 皮肤和身体的感觉
5. 如有神话人物（嫦娥、孙悟空、龙王等）、科幻元素或著名地标，自然融入
6. 结尾一句10-15字，以温柔的邀请或提问收束，引导听众回应
7. 每句都要短，用句号或省略号自然断句，朗读节奏舒缓

只输出旁白文字，不含任何说明、标点以外的格式标记。`,
        }],
      }),
    });

    const data = await response.json();

    if (!data.content || !data.content[0]) {
      console.error('Claude API error:', data);
      return res.status(502).json({ error: 'Claude API error', detail: data.error?.message });
    }

    res.json({ text: data.content[0].text.trim() });

  } catch (err) {
    console.error('Narrate handler error:', err);
    res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}
