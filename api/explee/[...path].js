// api/explee/[...path].js — Vercel catch-all: /api/explee/*
export default async function handler(req, res) {
  const key = req.headers['x-explee-key'] || process.env.EXPLEE_API_KEY;
  if (!key) return res.status(401).json({ error: 'Explee API key not configured' });

  const subpath = (req.query.path || []).join('/');
  const url = `https://api.explee.io/${subpath}`;

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
