// api/narrate.js — Claude 旁白生成代理
// 接收目的地，返回冥想旁白文字

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { destination } = req.body;
  if (!destination) return res.status(400).json({ error: 'destination is required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-opus-4-5',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `你是一位极致温柔的冥想引导师，带领一群人乘坐神奇魔毯旅行。魔毯正飞向"${destination}"。

请写一段90-130字的沉浸式中文冥想旁白，风格要求：
1. 语调极度温柔、缓慢、如呢喃，让人身心放松
2. 先用15-25字描绘飞行感受（风、云、高空、速度）
3. 再用70-90字描写到达${destination}的感官细节：
   - 看到什么颜色和光线
   - 听到什么声音
   - 感受到什么气息和温度
   - 皮肤和身体的感觉
4. 如有神话人物（嫦娥、孙悟空、龙王等）或著名地标，自然融入
5. 结尾用10-15字描写静静停留的平和状态
6. 句子简短，停顿自然，朗读节奏舒缓

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
