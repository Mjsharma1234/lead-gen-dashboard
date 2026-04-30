// api/health.js — Vercel serverless: GET /api/health
export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    keys: {
      apollo:    !!process.env.APOLLO_API_KEY,
      explee:    !!process.env.EXPLEE_API_KEY,
      explorium: !!process.env.EXPLORIUM_API_KEY,
      apify:     !!process.env.APIFY_API_KEY,
    }
  });
}
