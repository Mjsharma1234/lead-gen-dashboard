// api/apollo/people/enrich.js — Vercel serverless: POST /api/apollo/people/enrich
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = req.headers['x-apollo-key'] || process.env.APOLLO_API_KEY;
  if (!key) return res.status(401).json({ error: 'Apollo API key not configured' });

  const body = { ...(req.body || {}), api_key: key };

  try {
    const upstream = await fetch('https://api.apollo.io/api/v1/people/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify(body)
    });
    res.status(upstream.status).json(await upstream.json());
  } catch (e) { res.status(502).json({ error: e.message }); }
}
