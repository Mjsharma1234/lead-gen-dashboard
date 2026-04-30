// api/explorium/[...path].js — Vercel catch-all: /api/explorium/*
export default async function handler(req, res) {
  const key = req.headers['x-explorium-key'] || process.env.EXPLORIUM_API_KEY;
  if (!key) return res.status(401).json({ error: 'Explorium API key not configured' });

  const subpath = (req.query.path || []).join('/');
  const url = `https://app.explorium.ai/api/${subpath}`;

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: req.method !== 'GET' ? JSON.stringify(req.body || {}) : undefined
    });
    const ct = upstream.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await upstream.json() : await upstream.text();
    res.status(upstream.status).json(typeof data === 'string' ? { raw: data } : data);
  } catch (e) { res.status(502).json({ error: e.message }); }
}
