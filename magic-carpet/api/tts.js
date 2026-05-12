// api/tts.js — 火山引擎 豆包语音合成 新版 V3 API
// 自动尝试多个 Resource-Id

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
    return res.status(500).json({ error: 'Missing env vars' });
  }

  const resourceIds = [
    'volc.service_type.10029',
    'volc.tts.default',
    'volc.megatts.default',
    'volc.bigmodel.tts.default',
    'volc.tts_v2.default',
  ];

  let lastError = null;

  for (const rid of resourceIds) {
    try {
      console.log('Trying Resource-Id: ' + rid);
      const response = await fetch('https://openspeech.bytedance.com/api/v3/tts/unidirectional', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'X-Api-App-Id':      appid,
          'X-Api-Access-Key':  apiKey,
          'X-Api-Resource-Id': rid,
        },
        body: JSON.stringify({
          user: { uid: 'magic-carpet' },
          req_params: {
            text:   text,
            speaker: voice,
            audio_params: { format: 'mp3', sample_rate: 24000 },
            speed_ratio: 0.88,
          },
        }),
      });

      const rawText = await response.text();
      const lines = rawText.trim().split('\n').filter(Boolean);
      const audioChunks = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.data) audioChunks.push(Buffer.from(parsed.data, 'base64'));
          if (parsed.code && parsed.code !== 0 && parsed.code !== 3000) {
            lastError = { rid, code: parsed.code, msg: parsed.message };
          }
        } catch (e) {}
      }

      if (audioChunks.length === 0) {
        try {
          const single = JSON.parse(rawText);
          if (single.data) audioChunks.push(Buffer.from(single.data, 'base64'));
          else lastError = { rid, code: single.code || single.header?.code, msg: single.message || single.header?.message, raw: rawText.substring(0, 200) };
        } catch (e) {
          lastError = { rid, raw: rawText.substring(0, 200) };
        }
      }

      if (audioChunks.length > 0) {
        const audioBuffer = Buffer.concat(audioChunks);
        if (audioBuffer.length > 100) {
          console.log('TTS SUCCESS! Resource-Id=' + rid + ' size=' + audioBuffer.length);
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Length', audioBuffer.length);
          res.setHeader('Cache-Control', 'no-store');
          return res.send(audioBuffer);
        }
      }

      console.log('Resource-Id ' + rid + ' failed: ' + JSON.stringify(lastError));
    } catch (err) {
      lastError = { rid, err: err.message };
      console.log('Resource-Id ' + rid + ' exception: ' + err.message);
    }
  }

  console.error('ALL Resource-Ids failed. Last: ' + JSON.stringify(lastError));
  res.status(502).json({ error: 'All attempts failed', lastError });
}
