// api/apollo/people/search.js — Vercel serverless: POST /api/apollo/people/search
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = req.headers['x-apollo-key'] || process.env.APOLLO_API_KEY;
  if (!key) return res.status(401).json({ error: 'Apollo API key not configured' });

  // Apollo requires api_key in the request body — header alone is unreliable
  const body = { ...(req.body || {}), api_key: key };

  try {
    const upstream = await fetch(
      'https://api.apollo.io/api/v1/mixed_people/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(body)
      }
    );
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    res.status(502).json({ error: 'Upstream failed', details: e.message });
  }
}
