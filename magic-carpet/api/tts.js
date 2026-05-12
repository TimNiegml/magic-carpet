// api/tts.js — 火山引擎 豆包语音合成 新版 API Key 接入
// 使用 V3 单向流式 HTTP 接口

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const apiKey = process.env.VOLC_ACCESS_TOKEN;
  const appid  = process.env.VOLC_APPID;
  const voice  = process.env.VOLC_VOICE || 'zh_female_wanqudashu_moon_bigtts';

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing VOLC_ACCESS_TOKEN' });
  }

  const strategies = [
    {
      name: 'V3-apikey',
      url:  'https://openspeech.bytedance.com/api/v3/tts',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: {
        user: { uid: 'magic-carpet' },
        req_params: {
          text:   text,
          speaker: voice,
          audio_params: { format: 'mp3', sample_rate: 24000 },
          speed_ratio:  0.88,
          volume_ratio: 1.0,
          pitch_ratio:  1.0,
        },
      },
      parseResponse: async (resp) => {
        const rawText = await resp.text();
        const chunks = rawText.trim().split('\n').filter(Boolean);
        const audioChunks = [];
        for (const chunk of chunks) {
          try {
            const parsed = JSON.parse(chunk);
            if (parsed.data) audioChunks.push(parsed.data);
          } catch (e) {}
        }
        if (audioChunks.length > 0) {
          return Buffer.concat(audioChunks.map(c => Buffer.from(c, 'base64')));
        }
        try {
          const single = JSON.parse(rawText);
          if (single.data) return Buffer.from(single.data, 'base64');
          throw new Error('code=' + single.code + ' msg=' + single.message);
        } catch (e) {
          throw new Error('V3 parse failed: ' + e.message + ' raw=' + rawText.substring(0, 200));
        }
      },
    },
    {
      name: 'V3-bearer-semicolon',
      url:  'https://openspeech.bytedance.com/api/v3/tts',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer;' + apiKey,
      },
      body: {
        user: { uid: 'magic-carpet' },
        req_params: {
          text:   text,
          speaker: voice,
          audio_params: { format: 'mp3', sample_rate: 24000 },
          speed_ratio: 0.88,
        },
      },
      parseResponse: async (resp) => {
        const rawText = await resp.text();
        const chunks = rawText.trim().split('\n').filter(Boolean);
        const audioChunks = [];
        for (const chunk of chunks) {
          try {
            const parsed = JSON.parse(chunk);
            if (parsed.data) audioChunks.push(parsed.data);
          } catch (e) {}
        }
        if (audioChunks.length > 0) {
          return Buffer.concat(audioChunks.map(c => Buffer.from(c, 'base64')));
        }
        try {
          const single = JSON.parse(rawText);
          if (single.data) return Buffer.from(single.data, 'base64');
          throw new Error('code=' + single.code + ' msg=' + single.message);
        } catch (e) {
          throw new Error('parse failed: ' + e.message);
        }
      },
    },
    {
      name: 'V1-apikey-mega',
      url:  'https://openspeech.bytedance.com/api/v1/tts',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer;' + apiKey,
        'Resource-Id':   'volc.service_type.10029',
      },
      body: {
        app: { appid: appid || '0', token: apiKey, cluster: 'volcano_mega' },
        user: { uid: 'magic-carpet' },
        audio: { voice_type: voice, encoding: 'mp3', rate: 24000, speed_ratio: 0.88 },
        request: { reqid: 'mc-' + Date.now(), text: text, text_type: 'plain', operation: 'query' },
      },
      parseResponse: async (resp) => {
        const data = await resp.json();
        if (data.code === 3000 && data.data) return Buffer.from(data.data, 'base64');
        throw new Error('code=' + data.code + ' msg=' + data.message);
      },
    },
  ];

  for (const strategy of strategies) {
    try {
      console.log('Trying strategy: ' + strategy.name);
      const resp = await fetch(strategy.url, {
        method:  'POST',
        headers: strategy.headers,
        body:    JSON.stringify(strategy.body),
      });

      const audioBuffer = await strategy.parseResponse(resp);

      if (audioBuffer && audioBuffer.length > 100) {
        console.log('TTS SUCCESS with strategy: ' + strategy.name + ' audioSize=' + audioBuffer.length);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioBuffer.length);
        res.setHeader('Cache-Control', 'no-store');
        return res.send(audioBuffer);
      }

      console.log('Strategy ' + strategy.name + ': got empty or too-small audio');
    } catch (err) {
      console.log('Strategy ' + strategy.name + ' failed: ' + err.message);
    }
  }

  console.error('ALL strategies failed. apiKey_prefix=' + apiKey.substring(0, 12) + ' voice=' + voice);
  res.status(502).json({ error: 'All TTS strategies failed', voice: voice });
}
