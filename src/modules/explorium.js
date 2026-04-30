// src/modules/explorium.js
// Explorium API Client - Firmographic enrichment & prospect contacts

const BASE = '/api/explorium';

function getKey() { return localStorage.getItem('explorium_key') || ''; }
function headers() {
  const k = getKey();
  return { 'Content-Type': 'application/json', ...(k ? { 'x-explorium-key': k } : {}) };
}

function hasKey() { return !!getKey(); }

export async function enrichFirmographics({ companyName, domain, country }) {
  if (!hasKey()) throw new Error('NO_KEY');
  const body = { businesses: [{ name: companyName, domain, country }] };
  const res = await fetch(`${BASE}/bundle/v1/enrich/firmographics`, {
    method: 'POST', headers: headers(), body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Explorium Firmographics: ${res.status}`);
  return res.json();
}

export async function enrichProspects({ companyName, domain, jobTitles = [], country }) {
  if (!hasKey()) throw new Error('NO_KEY');
  const body = {
    businesses: [{ name: companyName, domain, country }],
    filters: { job_titles: jobTitles }
  };
  const res = await fetch(`${BASE}/v1/prospects/contacts_information/enrich`, {
    method: 'POST', headers: headers(), body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Explorium Prospects: ${res.status}`);
  return res.json();
}

export async function getBusinessSignals({ companyName, domain }) {
  if (!hasKey()) return { data: [] };
  const body = { businesses: [{ name: companyName, domain }] };
  try {
    const res = await fetch(`${BASE}/bundle/v1/enrich/signals`, {
      method: 'POST', headers: headers(), body: JSON.stringify(body)
    });
    if (!res.ok) return { data: [] };
    return res.json();
  } catch { return { data: [] }; }
}

// searchProspects: Explorium's prospect discovery API.
// Falls back to empty list if no key or endpoint unavailable (404/403).
export async function searchProspects({ industry, country, jobTitles = [], companySize, page = 1, limit = 25 }) {
  if (!hasKey()) throw new Error('NO_KEY');

  const body = {
    industry,
    country,
    job_titles: jobTitles,
    ...(companySize && { company_size: companySize }),
    page,
    limit
  };

  // Try v2 endpoint first (newer Explorium API), fall back to v1
  const endpoints = [
    `${BASE}/v2/prospects/search`,
    `${BASE}/v1/prospects/search`,
    `${BASE}/bundle/v1/prospects/search`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
      if (res.status === 401) throw new Error('INVALID_KEY');
      if (res.status === 404) continue; // try next endpoint
      if (!res.ok) throw new Error(`Explorium: ${res.status}`);
      return res.json();
    } catch (e) {
      if (e.message === 'INVALID_KEY') throw e;
      // network error on this endpoint — try next
    }
  }

  // All endpoints returned 404 — Explorium prospect search may not be
  // available on this plan. Return empty so other sources still work.
  return { prospects: [], results: [], data: [] };
}

export function normalizeFirmographics(data) {
  const results = data.data || data.results || data.businesses || [];
  if (!results.length) return null;
  const c = results[0];
  return {
    name: c.name || c.company_name || '',
    domain: c.domain || c.website || '',
    industry: c.industry || '',
    subIndustry: c.sub_industry || '',
    employees: c.employee_count || c.employees || '',
    revenue: c.annual_revenue || c.revenue || '',
    founded: c.founded_year || '',
    country: c.country || c.hq_country || '',
    city: c.city || c.hq_city || '',
    description: c.description || c.company_description || '',
    techStack: c.technologies || c.tech_stack || [],
    fundingTotal: c.total_funding || '',
    fundingRound: c.last_funding_round || '',
    linkedinUrl: c.linkedin_url || '',
    phone: c.phone || '',
    raw: c
  };
}

export function normalizeExploriumLeads(data) {
  const items = data.prospects || data.contacts || data.results || data.data || [];
  return items.map(item => ({
    id: item.id || `explorium-${Math.random()}`,
    source: 'Explorium',
    sourceColor: '#10B981',
    name: item.full_name || `${item.first_name || ''} ${item.last_name || ''}`.trim(),
    title: item.job_title || item.title || '',
    company: item.company_name || item.company || '',
    industry: item.industry || '',
    country: item.country || '',
    email: item.email || item.work_email || '',
    phone: item.phone || item.direct_phone || '',
    website: item.company_domain ? `https://${item.company_domain}` : item.website || '',
    linkedin: item.linkedin_url || '',
    employees: item.company_size || '',
    revenue: item.annual_revenue || '',
    type: 'person',
    raw: item
  }));
}
