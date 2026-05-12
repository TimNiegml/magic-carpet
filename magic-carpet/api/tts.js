// api/tts.js — 火山引擎 豆包语音合成大模型 TTS 代理
// 自动尝试多种 cluster + resource 组合

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
    return res.status(500).json({ error: 'Missing env vars', hasAppid: !!appid, hasToken: !!token });
  }

  // 自动尝试所有可能的 cluster + resourceId 组合
  const attempts = [
    { cluster: 'volcano_mega', resourceId: 'volc.service_type.10029' },
    { cluster: 'volcano_tts',  resourceId: 'volc.service_type.10029' },
    { cluster: 'volcano_mega', resourceId: 'volc.tts.default' },
    { cluster: 'volcano_tts',  resourceId: 'volc.tts.default' },
    { cluster: 'volcano_mega', resourceId: 'volc.megatts.default' },
    { cluster: 'volcano_tts',  resourceId: 'volc.megatts.default' },
  ];

  let lastError = null;

  for (const attempt of attempts) {
    try {
      const response = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer;' + token,
          'Resource-Id':   attempt.resourceId,
        },
        body: JSON.stringify({
          app: {
            appid:   appid,
            token:   token,
            cluster: attempt.cluster,
          },
          user: { uid: 'magic-carpet-user' },
          audio: {
            voice_type:   voice,
            encoding:     'mp3',
            rate:         24000,
            bits:         16,
            channel:      1,
            speed_ratio:  0.88,
            volume_ratio: 1.0,
            pitch_ratio:  1.0,
          },
          request: {
            reqid:         'mc-' + Date.now().toString(),
            text:          text,
            text_type:     'plain',
            operation:     'query',
            with_frontend: 1,
            frontend_type: 'unitTson',
          },
        }),
      });

      const data = await response.json();

      if (data.code === 3000 && data.data) {
        console.log('TTS SUCCESS with cluster=' + attempt.cluster + ' resource=' + attempt.resourceId);
        const audioBuffer = Buffer.from(data.data, 'base64');
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioBuffer.length);
        res.setHeader('Cache-Control', 'no-store');
        return res.send(audioBuffer);
      }

      lastError = { cluster: attempt.cluster, resource: attempt.resourceId, code: data.code, msg: data.message };
      console.log('TTS attempt failed: ' + JSON.stringify(lastError));

    } catch (err) {
      lastError = { cluster: attempt.cluster, resource: attempt.resourceId, err: err.message };
    }
  }

  console.error('ALL TTS attempts failed. appid_prefix=' + appid.substring(0,4) + ' token_prefix=' + token.substring(0,8) + ' voice=' + voice);
  console.error('Last error: ' + JSON.stringify(lastError));

  res.status(502).json({
    error: 'All TTS combinations failed',
    lastError: lastError,
    debug: {
      appid_start: appid.substring(0, 4),
      token_start: token.substring(0, 8),
      voice: voice,
    },
  });
}
