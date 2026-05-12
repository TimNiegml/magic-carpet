// api/tts.js — 火山引擎 TTS 代理
// 接收文本，返回 MP3 音频流

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const appid  = process.env.VOLC_APPID;
  const token  = process.env.VOLC_ACCESS_TOKEN;
  const voice  = process.env.VOLC_VOICE || 'zh_female_cancan_mars_bigtts';

  if (!appid || !token) {
    return res.status(500).json({ error: 'Missing VOLC_APPID or VOLC_ACCESS_TOKEN' });
  }

  try {
    const response = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer;${token}`,
        'Resource-Id':   'volc.tts.default',
      },
      body: JSON.stringify({
        app: {
          appid,
          token,
          cluster: 'volcano_tts',
        },
        user: { uid: 'magic-carpet-user' },
        audio: {
          voice_type:    voice,
          encoding:      'mp3',
          rate:          24000,
          bits:          16,
          channel:       1,
          speed_ratio:   0.88,   // 稍慢，适合冥想
          volume_ratio:  1.0,
          pitch_ratio:   1.0,
        },
        request: {
          reqid:        `mc-${Date.now()}`,
          text,
          text_type:    'plain',
          operation:    'query',
          with_frontend: 1,
          frontend_type: 'unitTson',
        },
      }),
    });

    const data = await response.json();

    // code 3000 = 成功
    if (data.code !== 3000 || !data.data) {
      console.error('Volcengine TTS error:', data);
      return res.status(502).json({ error: 'TTS service error', detail: data.message });
    }

    // 将 base64 音频解码后直接返回 MP3 流
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
