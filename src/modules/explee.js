// src/modules/explee.js
// Explee API Client - AI-powered B2B prospecting

const BASE = '/api/explee';

function getKey() { return localStorage.getItem('explee_key') || ''; }
function headers() {
  const k = getKey();
  return { 'Content-Type': 'application/json', ...(k ? { 'x-explee-key': k } : {}) };
}

export async function searchLeads({ query, industry, country, companySize, page = 1, limit = 25 }) {
  // Explee uses semantic ICP descriptions
  const body = {
    query: query || `${industry ? industry + ' companies' : 'businesses'} in ${country || 'worldwide'}`,
    filters: {
      ...(industry && { industry }),
      ...(country && { country }),
      ...(companySize && { company_size: companySize })
    },
    page,
    limit
  };
  const res = await fetch(`${BASE}/v1/search`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Explee Search: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function enrichContact({ email, firstName, lastName, company, domain }) {
  const body = { email, first_name: firstName, last_name: lastName, company, domain };
  const res = await fetch(`${BASE}/v1/enrich/contact`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Explee Enrich: ${res.status}`);
  return res.json();
}

export function normalizeExpleeLeads(data) {
  const items = data.results || data.leads || data.data || [];
  return items.map(item => ({
    id: item.id || `explee-${Math.random()}`,
    source: 'Explee',
    sourceColor: '#22D3EE',
    name: item.full_name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.name || '',
    title: item.job_title || item.title || '',
    company: item.company_name || item.company || '',
    industry: item.industry || '',
    country: item.country || item.location?.country || '',
    email: item.email || item.work_email || '',
    phone: item.phone || item.mobile || '',
    website: item.website || item.company_website || '',
    linkedin: item.linkedin_url || '',
    employees: item.company_size || item.employees || '',
    revenue: item.annual_revenue || '',
    type: 'person',
    raw: item
  }));
}
