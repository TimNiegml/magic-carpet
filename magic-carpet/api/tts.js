// api/tts.js — 火山引擎 TTS 代理（双引擎）
// 优先：v3 豆包语音合成大模型（bigtts / Seed-TTS，自然度高，支持情感）
//   需开通：https://console.volcengine.com/speech/service/10007（资源ID volc.service_type.10029）
//   或 2.0：https://console.volcengine.com/speech/service/10035（资源ID seed-tts-2.0，环境变量 VOLC_TTS_RESOURCE 切换）
// 回落：v1 经典接口（volcano_tts），未开通大模型时自动使用，保证可用
//
// 环境变量：
//   VOLC_APPID / VOLC_ACCESS_TOKEN  必填
//   VOLC_VOICE_V3     v3 音色，默认 zh_female_wanwanxiaohe_moon_bigtts（湾湾小何·讲故事推荐）
//   VOLC_TTS_RESOURCE v3 资源ID，默认 volc.service_type.10029；开通2.0后可设为 seed-tts-2.0
//   VOLC_VOICE        v1 回落音色，默认灿灿

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, emotion, speed, voice } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const appid = process.env.VOLC_APPID;
  const token = process.env.VOLC_ACCESS_TOKEN;
  if (!appid || !token) {
    return res.status(500).json({ error: 'Missing VOLC_APPID or VOLC_ACCESS_TOKEN' });
  }

  const voiceV3   = voice || process.env.VOLC_VOICE_V3 || 'zh_female_wanwanxiaohe_moon_bigtts';
  const resourceId = process.env.VOLC_TTS_RESOURCE || 'volc.service_type.10029';
  const voiceV1   = process.env.VOLC_VOICE || 'zh_female_cancan_mars_bigtts';
  const speedRatio = typeof speed === 'number' ? speed : 0.9;

  // ── 引擎一：v3 大模型（单向流式 HTTP，聚合分片后整体返回）──
  async function synthV3() {
    const audioParams = {
      format:        'mp3',
      sample_rate:   24000,
      // speed_ratio(0.88~1.0) → speech_rate(-50~100)
      speech_rate:   Math.max(-50, Math.min(100, Math.round((speedRatio - 1) * 100))),
      loudness_rate: 0,
    };
    if (emotion) {
      audioParams.emotion       = emotion;   // 仅多情感音色生效：happy/sad/angry/fearful/surprised/neutral…
      audioParams.emotion_scale = 3;
    }
    const response = await fetch('https://openspeech.bytedance.com/api/v3/tts/unidirectional', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'X-Api-App-Key':     appid,
        'X-Api-Access-Key':  token,
        'X-Api-Resource-Id': resourceId,
        'X-Api-Request-Id':  `mc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
      body: JSON.stringify({
        user: { uid: 'magic-carpet-user' },
        req_params: {
          text,
          speaker:      voiceV3,
          audio_params: audioParams,
        },
      }),
    });

    const bodyText = await response.text();
    if (!response.ok) throw new Error(`v3 HTTP ${response.status}: ${bodyText.slice(0, 200)}`);

    // 响应为按行分隔的 JSON 流（可能带 data: 前缀），聚合所有 base64 音频分片
    const buffers = [];
    for (let line of bodyText.split('\n')) {
      line = line.trim();
      if (!line) continue;
      if (line.startsWith('data:')) line = line.slice(5).trim();
      let obj;
      try { obj = JSON.parse(line); } catch (e) { continue; }
      if (obj.data && typeof obj.data === 'string' && (obj.code === 0 || obj.code === undefined)) {
        buffers.push(Buffer.from(obj.data, 'base64'));
      } else if (obj.code && obj.code !== 0 && obj.code !== 20000000) {
        throw new Error(`v3 code ${obj.code}: ${obj.message || ''}`);
      }
    }
    if (!buffers.length) throw new Error('v3 returned no audio');
    return Buffer.concat(buffers);
  }

  // ── 引擎二：v1 经典接口（回落，保证可用）──
  async function synthV1(withEmotion) {
    const audio = {
      voice_type:   voiceV1,
      encoding:     'mp3',
      rate:         24000,
      speed_ratio:  speedRatio,
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
        'Authorization': `Bearer;${token}`,   // v1 的鉴权格式就是 "Bearer;token"
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
    const data = await response.json();
    if (data.code !== 3000 || !data.data) {
      throw new Error(`v1 code ${data.code}: ${data.message || ''}`);
    }
    return Buffer.from(data.data, 'base64');
  }

  try {
    let audioBuffer, engine = 'v3-bigmodel';
    try {
      audioBuffer = await synthV3();
    } catch (e3) {
      console.warn('TTS v3 failed, falling back to v1:', e3.message);
      engine = 'v1-classic';
      try {
        audioBuffer = await synthV1(true);
      } catch (e1a) {
        if (emotion) audioBuffer = await synthV1(false);   // 情感参数不支持时降级重试
        else throw e1a;
      }
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('X-TTS-Engine', engine);
    res.send(audioBuffer);

  } catch (err) {
    console.error('TTS handler error:', err);
    res.status(502).json({ error: 'TTS service error', detail: err.message });
  }
}
