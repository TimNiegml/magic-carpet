// api/tts.js — 火山引擎 豆包语音合成 V3
// 尝试多种鉴权方式

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const appid  = process.env.VOLC_APPID;
  const apiKey = process.env.VOLC_ACCESS_TOKEN;
  const voice  = process.env.VOLC_VOICE || 'zh_female_wanqudashu_moon_bigtts';

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing VOLC_ACCESS_TOKEN' });
  }

  const ttsUrl = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';
  const ttsBody = JSON.stringify({
    user: { uid: 'magic-carpet' },
    req_params: {
      text: text,
      speaker: voice,
      audio_params: { format: 'mp3', sample_rate: 24000 },
      speed_ratio: 0.88,
    },
  });

  // 尝试多种鉴权方式
  const authStrategies = [
    {
      name: 'bearer-space',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    },
    {
      name: 'bearer-semicolon',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer; ' + apiKey },
    },
    {
      name: 'x-api-no-appid',
      headers: { 'Content-Type': 'application/json', 'X-Api-Access-Key': apiKey, 'X-Api-Resource-Id': 'volc.service_type.10029' },
    },
    {
      name: 'x-api-with-appid',
      headers: { 'Content-Type': 'application/json', 'X-Api-App-Id': appid, 'X-Api-Access-Key': apiKey, 'X-Api-Resource-Id': 'volc.service_type.10029' },
    },
  ];

  // 策略5: 先获取临时 JWT Token，再调用 TTS
  if (appid) {
    try {
      console.log('Trying: get JWT token first');
      const tokenResp = await fetch('https://openspeech.bytedance.com/api/v1/sts/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer; ' + apiKey },
        body: JSON.stringify({ appid: appid, duration: 300 }),
      });
      const tokenData = await tokenResp.json();
      console.log('JWT token response: ' + JSON.stringify(tokenData).substring(0, 200));
      if (tokenData.jwt_token) {
        authStrategies.push({
          name: 'jwt-token',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer; ' + tokenData.jwt_token },
        });
        authStrategies.push({
          name: 'jwt-x-api',
          headers: { 'Content-Type': 'application/json', 'X-Api-App-Id': appid, 'X-Api-Access-Key': tokenData.jwt_token, 'X-Api-Resource-Id': 'volc.service_type.10029' },
        });
      }
    } catch (e) {
      console.log('JWT token fetch failed: ' + e.message);
    }
  }

  let lastError = null;

  for (const strategy of authStrategies) {
    try {
      console.log('Trying auth: ' + strategy.name);
      const resp = await fetch(ttsUrl, {
        method: 'POST',
        headers: strategy.headers,
        body: ttsBody,
      });

      const rawText = await resp.text();
      const lines = rawText.trim().split('\n').filter(Boolean);
      const audioChunks = [];

      for (const line of lines) {
        try {
          const p = JSON.parse(line);
          if (p.data) audioChunks.push(Buffer.from(p.data, 'base64'));
        } catch (e) {}
      }

      if (audioChunks.length === 0) {
        try {
          const s = JSON.parse(rawText);
          if (s.data) audioChunks.push(Buffer.from(s.data, 'base64'));
        } catch (e) {}
      }

      if (audioChunks.length > 0) {
        const buf = Buffer.concat(audioChunks);
        if (buf.length > 100) {
          console.log('TTS SUCCESS! auth=' + strategy.name + ' size=' + buf.length);
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Length', buf.length);
          return res.send(buf);
        }
      }

      lastError = { auth: strategy.name, raw: rawText.substring(0, 250) };
      console.log('Auth ' + strategy.name + ' failed: ' + rawText.substring(0, 250));
    } catch (err) {
      lastError = { auth: strategy.name, err: err.message };
      console.log('Auth ' + strategy.name + ' exception: ' + err.message);
    }
  }

  console.error('ALL auth strategies failed');
  res.status(502).json({ error: 'All auth failed', lastError });
}
