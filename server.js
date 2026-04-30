import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (simple parser)
function loadEnv() {
  try {
    const envPath = join(__dirname, '.env');
    const content = readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...valueParts] = trimmed.split('=');
      if (key) process.env[key.trim()] = valueParts.join('=').trim();
    });
  } catch {
    console.log('No .env file found, using environment variables or Settings panel keys');
  }
}
loadEnv();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-apollo-key', 'x-explee-key', 'x-explorium-key', 'x-apify-key']
}));

// ─── Helper: forward fetch ────────────────────────────────────────────────────
async function forwardFetch(res, url, options) {
  try {
    const { default: fetch } = await import('node-fetch');
    const upstream = await fetch(url, options);
    const contentType = upstream.headers.get('content-type') || '';
    const body = contentType.includes('application/json')
      ? await upstream.json()
      : await upstream.text();
    res.status(upstream.status).json(
      typeof body === 'string' ? { raw: body } : body
    );
  } catch (err) {
    res.status(502).json({ error: 'Upstream request failed', details: err.message });
  }
}

// ─── Health / key check ──────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    keys: {
      apollo: !!process.env.APOLLO_API_KEY,
      explee: !!process.env.EXPLEE_API_KEY,
      explorium: !!process.env.EXPLORIUM_API_KEY,
      apify: !!process.env.APIFY_API_KEY
    }
  });
});

// ─── Apollo.io ───────────────────────────────────────────────────────────────
// Apollo requires api_key in the JSON body — header-only auth is unreliable
app.post('/api/apollo/people/search', async (req, res) => {
  const key = req.headers['x-apollo-key'] || process.env.APOLLO_API_KEY;
  if (!key) return res.status(401).json({ error: 'Apollo API key not configured' });

  // Inject api_key into body — the officially required auth method
  const body = { ...(req.body || {}), api_key: key };

  await forwardFetch(res,
    'https://api.apollo.io/api/v1/mixed_people/search',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify(body)
    }
  );
});

app.post('/api/apollo/people/enrich', async (req, res) => {
  const key = req.headers['x-apollo-key'] || process.env.APOLLO_API_KEY;
  if (!key) return res.status(401).json({ error: 'Apollo API key not configured' });
  const body = { ...(req.body || {}), api_key: key };
  await forwardFetch(res, 'https://api.apollo.io/api/v1/people/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    body: JSON.stringify(body)
  });
});

app.post('/api/apollo/companies/search', async (req, res) => {
  const key = req.headers['x-apollo-key'] || process.env.APOLLO_API_KEY;
  if (!key) return res.status(401).json({ error: 'Apollo API key not configured' });
  const body = { ...(req.body || {}), api_key: key };
  await forwardFetch(res,
    'https://api.apollo.io/api/v1/mixed_companies/search',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify(body)
    }
  );
});

// ─── Explee ──────────────────────────────────────────────────────────────────
app.post('/api/explee/*path', async (req, res) => {
  const key = req.headers['x-explee-key'] || process.env.EXPLEE_API_KEY;
  if (!key) return res.status(401).json({ error: 'Explee API key not configured' });
  const subpath = req.params.path ? (Array.isArray(req.params.path) ? req.params.path.join('/') : req.params.path) : '';
  await forwardFetch(res, `https://api.explee.io/${subpath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify(req.body)
  });
});

app.get('/api/explee/*path', async (req, res) => {
  const key = req.headers['x-explee-key'] || process.env.EXPLEE_API_KEY;
  if (!key) return res.status(401).json({ error: 'Explee API key not configured' });
  const subpath = req.params.path ? (Array.isArray(req.params.path) ? req.params.path.join('/') : req.params.path) : '';
  await forwardFetch(res, `https://api.explee.io/${subpath}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${key}` }
  });
});

// ─── Explorium ───────────────────────────────────────────────────────────────
app.post('/api/explorium/*path', async (req, res) => {
  const key = req.headers['x-explorium-key'] || process.env.EXPLORIUM_API_KEY;
  if (!key) return res.status(401).json({ error: 'Explorium API key not configured' });
  const subpath = req.params.path ? (Array.isArray(req.params.path) ? req.params.path.join('/') : req.params.path) : '';
  await forwardFetch(res, `https://app.explorium.ai/api/${subpath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify(req.body)
  });
});

// ─── Apify ───────────────────────────────────────────────────────────────────
app.post('/api/apify/run/:actorId', async (req, res) => {
  const key = req.headers['x-apify-key'] || process.env.APIFY_API_KEY;
  if (!key) return res.status(401).json({ error: 'Apify API key not configured' });
  await forwardFetch(res,
    `https://api.apify.com/v2/acts/${req.params.actorId}/run-sync-get-dataset-items?token=${key}&timeout=60`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    }
  );
});

app.get('/api/apify/dataset/:datasetId', async (req, res) => {
  const key = req.headers['x-apify-key'] || process.env.APIFY_API_KEY;
  if (!key) return res.status(401).json({ error: 'Apify API key not configured' });
  await forwardFetch(res,
    `https://api.apify.com/v2/datasets/${req.params.datasetId}/items?token=${key}&format=json`,
    { method: 'GET' }
  );
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Lead Gen Proxy Server running at http://localhost:${PORT}`);
  console.log(`   Apollo:   ${process.env.APOLLO_API_KEY ? '✅ key loaded' : '⚠️  not set (use Settings panel)'}`);
  console.log(`   Explee:   ${process.env.EXPLEE_API_KEY ? '✅ key loaded' : '⚠️  not set (use Settings panel)'}`);
  console.log(`   Explorium:${process.env.EXPLORIUM_API_KEY ? '✅ key loaded' : '⚠️  not set (use Settings panel)'}`);
  console.log(`   Apify:    ${process.env.APIFY_API_KEY ? '✅ key loaded' : '⚠️  not set (use Settings panel)'}\n`);
});
