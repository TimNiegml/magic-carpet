// api/coach.js — 私人健身助教（Claude 生成口语化动作指导）
// 接收一个动作对象，返回适合朗读的中文教学口播稿。
// 若未配置 ANTHROPIC_API_KEY，则返回 501，前端会自动回退到内置讲解。

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { exercise } = req.body || {}
  if (!exercise || !exercise.name) {
    return res.status(400).json({ error: 'exercise is required' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // 未配置 key —— 前端会回退到本地讲解
    return res.status(501).json({ error: 'AI coach not configured' })
  }

  const ctx = [
    `动作名称：${exercise.name}${exercise.nameEn ? '（' + exercise.nameEn + '）' : ''}`,
    `组数次数：${exercise.sets} 组 × ${exercise.reps}`,
    exercise.focus ? `目标：${exercise.focus}` : '',
    exercise.cue ? `要点：${exercise.cue}` : '',
    exercise.steps?.length ? `步骤：${exercise.steps.join('；')}` : '',
    exercise.mistakes?.length ? `常见错误：${exercise.mistakes.join('；')}` : '',
    exercise.breathing ? `呼吸：${exercise.breathing}` : '',
    exercise.cervicalNote ? `颈椎提示：${exercise.cervicalNote}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: `你是一位专业、亲切的私人健身教练，正在现场带一位有颈椎问题、想增肌和改善体态的学员训练。

请根据下面的动作信息，写一段 120-180 字的口语化指导词，将由语音直接朗读给学员听。要求：
1. 语气像真人教练在身边轻声指导，鼓励、清晰、不啰嗦
2. 先一句话说清这个动作练哪里、做几组几次
3. 然后讲清楚怎么做（关键发力和姿态），自然地带出 1-2 个最重要的常见错误提醒
4. 提到呼吸节奏
5. 如有颈椎相关提示，务必强调（保护颈椎是这位学员的重点）
6. 结尾给一句简短鼓励
7. 只输出朗读文本本身，不要标题、不要列表符号、不要任何格式标记

动作信息：
${ctx}`,
          },
        ],
      }),
    })

    const data = await response.json()
    if (!data.content || !data.content[0]) {
      return res.status(502).json({ error: 'Claude API error', detail: data.error?.message })
    }
    res.json({ text: data.content[0].text.trim() })
  } catch (err) {
    res.status(500).json({ error: 'Internal error', detail: err.message })
  }
}
