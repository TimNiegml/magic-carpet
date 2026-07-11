// api/image.js — 火山方舟 Ark · Seedream 文生图（右侧油画插图）
// 请求 { prompt }；返回 { url }（或 data URL）
// 环境变量：VOLC_ARK_API_KEY（方舟控制台创建的 API Key，Bearer 鉴权）
//   可选：VOLC_ARK_MODEL（默认 doubao-seedream-4-0）、IMAGE_SIZE（默认 1024x1024）
const OIL_STYLE = '，古典油画质感，厚涂笔触，戏剧性光影，电影感，插画风格，暖调烛光与冷调风暴夜色对比';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.VOLC_ARK_API_KEY;
  if (!key) return res.status(500).json({ error: 'Missing VOLC_ARK_API_KEY' });

  const prompt = (req.body && req.body.prompt || '').toString().trim();
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const model = process.env.VOLC_ARK_MODEL || 'doubao-seedream-4-0-250828';
  const size  = process.env.IMAGE_SIZE || '1024x1024';

  try {
    const r = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model, prompt: prompt.slice(0, 400) + OIL_STYLE, size, response_format: 'url', watermark: false }),
    });
    const data = await r.json().catch(() => null);
    const item = data && data.data && data.data[0];
    const url = item && (item.url || (item.b64_json ? `data:image/png;base64,${item.b64_json}` : null));
    if (r.ok && url) return res.json({ url });

    console.error('ark image error:', r.status, data && (data.error?.message || JSON.stringify(data).slice(0, 300)));
    return res.status(502).json({ error: 'image service error', detail: (data && (data.error?.message || data.message)) || `HTTP ${r.status}（请检查 VOLC_ARK_API_KEY 与 VOLC_ARK_MODEL）` });
  } catch (err) {
    console.error('image handler error:', err);
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}
