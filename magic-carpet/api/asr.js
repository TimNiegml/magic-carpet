// api/asr.js — 火山引擎 大模型录音文件极速版识别 代理
// 接收 { audio: base64, format?: 'wav' }，返回 { text }
// 需在火山引擎控制台开通「大模型录音文件极速版识别」(资源ID volc.bigasr.auc_turbo)，
// 使用与 TTS 相同的 VOLC_APPID / VOLC_ACCESS_TOKEN

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { audio, format } = req.body;
  if (!audio) return res.status(400).json({ error: 'audio (base64) is required' });

  const appid = process.env.VOLC_APPID;
  const token = process.env.VOLC_ACCESS_TOKEN;
  if (!appid || !token) {
    return res.status(500).json({ error: 'Missing VOLC_APPID or VOLC_ACCESS_TOKEN' });
  }

  const reqId = (globalThis.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : `mc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const response = await fetch('https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'X-Api-App-Key':     appid,
        'X-Api-Access-Key':  token,
        'X-Api-Resource-Id': 'volc.bigasr.auc_turbo',
        'X-Api-Request-Id':  reqId,
        'X-Api-Sequence':    '-1',
      },
      body: JSON.stringify({
        user:  { uid: 'magic-carpet-user' },
        audio: {
          data:   audio,
          format: format || 'wav',
        },
        request: { model_name: 'bigmodel' },
      }),
    });

    const statusCode = response.headers.get('X-Api-Status-Code');
    const statusMsg  = response.headers.get('X-Api-Message');
    const data       = await response.json().catch(() => null);

    const text = data && data.result && typeof data.result.text === 'string'
      ? data.result.text.trim()
      : null;

    if (statusCode === '20000000' && text !== null) {
      return res.json({ text });
    }

    console.error('Volcengine ASR error:', statusCode, statusMsg, JSON.stringify(data).slice(0, 300));
    return res.status(502).json({
      error:  'ASR service error',
      code:   statusCode,
      detail: statusMsg || (data && data.message) || '请确认已开通「大模型录音文件极速版识别」服务',
    });

  } catch (err) {
    console.error('ASR handler error:', err);
    res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}
