// api/feedback.js — 用户反馈 → 自动在 GitHub 仓库开 Issue
// 接收 { message, contact?, journey?, meta? }
// 需要环境变量：
//   GITHUB_TOKEN  —— 有 repo/issues 写权限的 GitHub Token（Fine-grained: Issues=Read&Write，或经典 token 勾选 repo）
//   GITHUB_REPO   —— 目标仓库，格式 owner/repo，例如 niegaowei/magic-carpet
// 可选：
//   GITHUB_ISSUE_LABELS —— 逗号分隔的标签，默认 "feedback"

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, contact, journey, meta } = req.body || {};
  const text = (message || '').toString().trim();
  if (!text) return res.status(400).json({ error: 'message is required' });
  if (text.length > 2000) return res.status(400).json({ error: 'message too long' });

  const token = process.env.GITHUB_TOKEN;
  const repo  = process.env.GITHUB_REPO;
  if (!token || !repo) {
    return res.status(500).json({ error: 'Missing GITHUB_TOKEN or GITHUB_REPO' });
  }

  const labels = (process.env.GITHUB_ISSUE_LABELS || 'feedback')
    .split(',').map(s => s.trim()).filter(Boolean);

  // 标题取反馈首行前 50 字
  const firstLine = text.split('\n')[0].slice(0, 50);
  const title = `[反馈] ${firstLine}${firstLine.length >= 50 ? '…' : ''}`;

  const bodyLines = [
    text,
    '',
    '---',
    journey ? `**旅程 / 目的地**：${String(journey).slice(0, 120)}` : '',
    contact ? `**联系方式**：${String(contact).slice(0, 120)}` : '',
    `**提交时间**：${new Date().toISOString()}`,
    meta ? `**环境**：${String(meta).slice(0, 300)}` : '',
    '',
    '_由「魔毯」应用内反馈箱自动创建_',
  ].filter(Boolean);

  try {
    const gh = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization':        `Bearer ${token}`,
        'Accept':               'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type':         'application/json',
        'User-Agent':           'magic-carpet-feedback',
      },
      body: JSON.stringify({ title, body: bodyLines.join('\n'), labels }),
    });

    const data = await gh.json().catch(() => null);

    if (gh.ok && data && data.html_url) {
      return res.json({ ok: true, url: data.html_url, number: data.number });
    }

    console.error('GitHub issue error:', gh.status, data && (data.message || JSON.stringify(data).slice(0, 300)));
    return res.status(502).json({
      error:  'GitHub error',
      detail: (data && data.message) || `HTTP ${gh.status}（请检查 GITHUB_TOKEN 权限与 GITHUB_REPO 是否正确）`,
    });
  } catch (err) {
    console.error('feedback handler error:', err);
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}
