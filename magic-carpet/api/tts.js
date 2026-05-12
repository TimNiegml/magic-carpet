// api/tts.js — 火山引擎 豆包语音合成 新版 V3 API
// 正确 endpoint: /api/v3/tts/unidirectional

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const appid  = process.env.VOLC_APPID;
  const apiKey = process.env.VOLC_ACCESS_TOKEN;
  const voice  = process.env.VOLC_VOICE || 'zh_female_wanqudashu_moon_bigtts';

  if (!appid || !apiKey) {
    return res.status(500).json({ error: 'Missing VOLC_APPID or VOLC_ACCESS_TOKEN' });
  }

  try {
    console.log('Calling V3 TTS: voice=' + voice + ' appid=' + appid.substring(0, 4) + '...');

    const response = await fetch('https://openspeech.bytedance.com/api/v3/tts/unidirectional', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'X-Api-App-Id':      appid,
        'X-Api-Access-Key':  apiKey,
        'X-Api-Resource-Id': 'volc.service_type.10029',
      },
      body: JSON.stringify({
        user: { uid: 'magic-carpet' },
        req_params: {
          text:   text,
          speaker: voice,
          audio_params: {
            format:      'mp3',
            sample_rate: 24000,
          },
          speed_ratio:  0.88,
          volume_ratio: 1.0,
          pitch_ratio:  1.0,
        },
      }),
    });

    // V3 返回 HTTP chunked，每行一个 JSON
    const rawText = await response.text();

    // 检查是否是错误响应
    if (rawText.length < 50) {
      console.error('TTS short response: ' + rawText);
      return res.status(502).json({ error: 'TTS error', detail: rawText });
    }

    // 解析所有 chunk，提取 base64 音频数据
    const lines = rawText.trim().split('\n').filter(Boolean);
    const audioChunks = [];

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.data) {
          audioChunks.push(Buffer.from(parsed.data, 'base64'));
        }
        if (parsed.code && parsed.code !== 0 && parsed.code !== 3000) {
          console.error('TTS chunk error: code=' + parsed.code + ' msg=' + parsed.message);
        }
      } catch (e) {
        // 跳过非 JSON 行
      }
    }

    if (audioChunks.length === 0) {
      // 尝试作为单个 JSON 解析
      try {
        const single = JSON.parse(rawText);
        if (single.data) {
          audioChunks.push(Buffer.from(single.data, 'base64'));
        } else {
          console.error('TTS no audio data: ' + rawText.substring(0, 300));
          return res.status(502).json({ error: 'No audio data', raw: rawText.substring(0, 300) });
        }
      } catch (e) {
        console.error('TTS parse failed: ' + rawText.substring(0, 300));
        return res.status(502).json({ error: 'Parse failed', raw: rawText.substring(0, 300) });
      }
    }

    const audioBuffer = Buffer.concat(audioChunks);
    console.log('TTS SUCCESS: ' + audioBuffer.length + ' bytes, ' + audioChunks.length + ' chunks');

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(audioBuffer);

  } catch (err) {
    console.error('TTS handler error: ' + err.message);
    res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}
