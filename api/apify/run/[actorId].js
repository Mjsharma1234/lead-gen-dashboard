// api/apify/run/[actorId].js — Vercel serverless: POST /api/apify/run/:actorId
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = req.headers['x-apify-key'] || process.env.APIFY_API_KEY;
  if (!key) return res.status(401).json({ error: 'Apify API key not configured' });

  const { actorId } = req.query;
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${key}&timeout=60`;

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {})
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) { res.status(502).json({ error: e.message }); }
}
