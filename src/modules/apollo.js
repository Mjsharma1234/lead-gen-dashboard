// src/modules/apollo.js
// Apollo.io API Client

const BASE = '/api/apollo';

function getKey() { return localStorage.getItem('apollo_key') || ''; }

function headers() {
  const k = getKey();
  return { 'Content-Type': 'application/json', ...(k ? { 'x-apollo-key': k } : {}) };
}

export async function searchPeople({ titles = [], industries = [], countries = [], seniorities = [], keywords = '', page = 1, perPage = 25 } = {}) {
  const body = {
    page,
    per_page: perPage,
    ...(titles.length && { person_titles: titles }),
    ...(industries.length && { organization_industry_tag_ids: industries, organization_industries: industries }),
    ...(countries.length && { person_locations: countries }),
    ...(seniorities.length && { person_seniorities: seniorities }),
    ...(keywords && { q_keywords: keywords }),
    contact_email_status: ['verified', 'likely to engage', 'email_not_empty'],
    include_similar_titles: true
  };
  const res = await fetch(`${BASE}/people/search`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Apollo People Search: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function enrichPerson({ firstName, lastName, email, domain, linkedinUrl }) {
  const body = { first_name: firstName, last_name: lastName, email, domain, linkedin_url: linkedinUrl, reveal_personal_emails: true, reveal_phone_number: true };
  const res = await fetch(`${BASE}/people/enrich`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Apollo Enrich: ${res.status}`);
  return res.json();
}

export async function searchCompanies({ industries = [], countries = [], keywords = '', employeeRanges = [], page = 1, perPage = 25 } = {}) {
  const body = {
    page, per_page: perPage,
    ...(industries.length && { organization_industry_tag_ids: industries }),
    ...(countries.length && { organization_locations: countries }),
    ...(keywords && { q_organization_keyword_tags: [keywords] }),
    ...(employeeRanges.length && { num_employees_ranges: employeeRanges })
  };
  const res = await fetch(`${BASE}/companies/search`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Apollo Companies Search: ${res.status}`);
  return res.json();
}

export function normalizeApolloLeads(data, type = 'person') {
  const items = type === 'person' ? (data.people || data.contacts || []) : (data.organizations || data.accounts || []);
  return items.map(item => {
    if (type === 'person') {
      return {
        id: item.id,
        source: 'Apollo',
        sourceColor: '#6366F1',
        name: `${item.first_name || ''} ${item.last_name || ''}`.trim(),
        title: item.title || '',
        company: item.organization?.name || item.account?.name || '',
        industry: item.organization?.industry || '',
        country: item.country || item.location_country || '',
        email: item.email || '',
        phone: item.phone_numbers?.[0]?.raw_number || '',
        website: item.organization?.website_url || item.account?.website_url || '',
        linkedin: item.linkedin_url || '',
        employees: item.organization?.num_employees || '',
        revenue: item.organization?.annual_revenue_printed || '',
        type: 'person',
        raw: item
      };
    } else {
      return {
        id: item.id,
        source: 'Apollo',
        sourceColor: '#6366F1',
        name: item.name || '',
        title: '',
        company: item.name || '',
        industry: item.industry || '',
        country: item.country || '',
        email: item.email || '',
        phone: item.phone || '',
        website: item.website_url || '',
        linkedin: item.linkedin_url || '',
        employees: item.num_employees || '',
        revenue: item.annual_revenue_printed || '',
        type: 'company',
        raw: item
      };
    }
  });
}
