// api/tts.js — 火山引擎 TTS 代理
// 接收 { text, emotion?, speed? }，返回 MP3 音频流
// emotion 需音色支持多情感（bigtts 系列部分支持）；不支持时自动降级重试

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, emotion, speed } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const appid = process.env.VOLC_APPID;
  const token = process.env.VOLC_ACCESS_TOKEN;
  const voice = process.env.VOLC_VOICE || 'zh_female_cancan_mars_bigtts';

  if (!appid || !token) {
    return res.status(500).json({ error: 'Missing VOLC_APPID or VOLC_ACCESS_TOKEN' });
  }

  async function synth(withEmotion) {
    const audio = {
      voice_type:   voice,
      encoding:     'mp3',
      rate:         24000,
      speed_ratio:  typeof speed === 'number' ? speed : 0.9,
      volume_ratio: 1.0,
      pitch_ratio:  1.0,
    };
    if (withEmotion && emotion) {
      audio.emotion        = emotion;
      audio.enable_emotion = true;
    }
    const response = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        // v1 接口的鉴权格式就是 "Bearer;token"（分号）
        'Authorization': `Bearer;${token}`,
      },
      body: JSON.stringify({
        app:  { appid, token, cluster: 'volcano_tts' },
        user: { uid: 'magic-carpet-user' },
        audio,
        request: {
          reqid:     `mc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text,
          text_type: 'plain',
          operation: 'query',
        },
      }),
    });
    return response.json();
  }

  try {
    let data = await synth(true);

    // 若带情感参数失败，降级为不带情感重试一次
    if ((data.code !== 3000 || !data.data) && emotion) {
      console.warn('TTS with emotion failed, retrying without:', data.code, data.message);
      data = await synth(false);
    }

    if (data.code !== 3000 || !data.data) {
      console.error('Volcengine TTS error:', data);
      return res.status(502).json({
        error:  'TTS service error',
        code:   data.code,
        detail: data.message || 'unknown',
      });
    }

    const audioBuffer = Buffer.from(data.data, 'base64');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.send(audioBuffer);

  } catch (err) {
    console.error('TTS handler error:', err);
    res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}
