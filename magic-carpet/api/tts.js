// api/tts.js — 火山引擎 豆包语音合成 TTS 代理
// 接收文本，返回 MP3 音频流
//
// 环境变量：
//   VOLC_APPID          — 应用管理页面的 APP ID（纯数字，如 2823290919）
//   VOLC_ACCESS_TOKEN   — 应用的 AccessToken（91a05c4a... 格式）
//   VOLC_VOICE          — 可选，默认使用灿灿温柔女声

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const appid = process.env.VOLC_APPID;
  const token = process.env.VOLC_ACCESS_TOKEN;
  const voice = process.env.VOLC_VOICE || 'zh_female_wanqudashu_moon_bigtts';

  if (!appid || !token) {
    return res.status(500).json({ error: 'Missing VOLC_APPID or VOLC_ACCESS_TOKEN' });
  }

  try {
    const response = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        // 注意：火山引擎 TTS 鉴权格式是 Bearer; 加分号，不是空格
        'Authorization': `Bearer;${token}`,
        'Resource-Id':   'volc.service_type.10029',
      },
      body: JSON.stringify({
        app: {
          appid,           // 数字型 APP ID
          token,           // AccessToken
          cluster: 'volcano_mega',
        },
        user: { uid: 'magic-carpet-user' },
        audio: {
          voice_type:   voice,
          encoding:     'mp3',
          rate:         24000,
          bits:         16,
          channel:      1,
          speed_ratio:  0.88,  // 稍慢，适合冥想引导
          volume_ratio: 1.0,
          pitch_ratio:  1.0,
        },
        request: {
          reqid:         `mc-${Date.now()}`,
          text,
          text_type:     'plain',
          operation:     'query',
          with_frontend: 1,
          frontend_type: 'unitTson',
        },
      }),
    });

    const data = await response.json();

    // 火山引擎 code 3000 = 成功
    if (data.code !== 3000 || !data.data) {
      console.error('Volcengine TTS error:', JSON.stringify(data));
      return res.status(502).json({
        error:  'TTS service error',
        code:   data.code,
        detail: data.message,
      });
    }

    // base64 音频 → MP3 二进制流
    const audioBuffer = Buffer.from(data.data, 'base64');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'no-store');
    res.send(audioBuffer);

  } catch (err) {
    console.error('TTS handler error:', err);
    res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}
