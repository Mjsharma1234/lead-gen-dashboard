// src/modules/leads.js
// Lead aggregation, deduplication, and saved leads management

const SAVED_KEY = 'leadgen_saved_leads';

export function deduplicateLeads(leads) {
  const seen = new Set();
  return leads.filter(lead => {
    // Dedup by email first, then name+company
    const key = lead.email
      ? lead.email.toLowerCase()
      : `${lead.name?.toLowerCase()}-${lead.company?.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mergeLeadSources(sources) {
  // sources: [{source: 'Apollo', leads: [...]}, ...]
  const all = sources.flatMap(s => s.leads || []);
  return deduplicateLeads(all);
}

// ─── Saved Leads ─────────────────────────────────────────────────────────────
export function getSavedLeads() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
  } catch { return []; }
}

export function saveLead(lead) {
  const saved = getSavedLeads();
  const exists = saved.find(l => l.id === lead.id || (l.email && l.email === lead.email));
  if (!exists) {
    saved.unshift({ ...lead, savedAt: new Date().toISOString() });
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  }
  return saved;
}

export function saveLeads(leads) {
  const saved = getSavedLeads();
  const newLeads = leads.filter(l =>
    !saved.find(s => s.id === l.id || (s.email && s.email === l.email))
  );
  const updated = [...newLeads.map(l => ({ ...l, savedAt: new Date().toISOString() })), ...saved];
  localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
  return updated;
}

export function unsaveLead(leadId) {
  const saved = getSavedLeads().filter(l => l.id !== leadId);
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  return saved;
}

export function clearSavedLeads() {
  localStorage.removeItem(SAVED_KEY);
}

export function isLeadSaved(lead) {
  const saved = getSavedLeads();
  return saved.some(s => s.id === lead.id || (s.email && s.email === lead.email));
}

// ─── Filtering / Sorting ─────────────────────────────────────────────────────
export function filterLeads(leads, { search = '', source = 'all', country = '', industry = '' } = {}) {
  return leads.filter(lead => {
    if (source !== 'all' && lead.source !== source) return false;
    if (country && !lead.country?.toLowerCase().includes(country.toLowerCase())) return false;
    if (industry && !lead.industry?.toLowerCase().includes(industry.toLowerCase())) return false;
    if (search) {
      const s = search.toLowerCase();
      return [lead.name, lead.company, lead.title, lead.email, lead.country, lead.industry]
        .some(v => v?.toLowerCase().includes(s));
    }
    return true;
  });
}

export function sortLeads(leads, { field = 'name', dir = 'asc' } = {}) {
  return [...leads].sort((a, b) => {
    const av = (a[field] || '').toString().toLowerCase();
    const bv = (b[field] || '').toString().toLowerCase();
    return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });
}

// ─── Stats ───────────────────────────────────────────────────────────────────
export function getLeadStats(leads) {
  const bySource = {};
  const byCountry = {};
  const byIndustry = {};
  let withEmail = 0;
  let withPhone = 0;

  leads.forEach(l => {
    bySource[l.source] = (bySource[l.source] || 0) + 1;
    if (l.country) byCountry[l.country] = (byCountry[l.country] || 0) + 1;
    if (l.industry) byIndustry[l.industry] = (byIndustry[l.industry] || 0) + 1;
    if (l.email) withEmail++;
    if (l.phone) withPhone++;
  });

  return {
    total: leads.length,
    withEmail,
    withPhone,
    bySource,
    topCountries: Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 5),
    topIndustries: Object.entries(byIndustry).sort((a, b) => b[1] - a[1]).slice(0, 5)
  };
}
