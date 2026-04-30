// src/modules/apify.js
// Apify API Client - Web scraping actors for leads & competitive analysis

const BASE = '/api/apify';

function getKey() { return localStorage.getItem('apify_key') || ''; }
function headers() {
  const k = getKey();
  return { 'Content-Type': 'application/json', ...(k ? { 'x-apify-key': k } : {}) };
}

// Popular actor IDs
export const ACTORS = {
  GOOGLE_MAPS: 'nwua9Tn5APPbl6HJJ',          // Google Maps Business Scraper
  WEBSITE_CONTENT: 'aYG0l9s7dbB7j3gbS',       // Website Content Crawler
  LINKEDIN_COMPANIES: 'hKByXkMQaC5Qt9UMN',    // LinkedIn Companies Scraper
  GOOGLE_SEARCH: 'nFJndFXA5zjCTuudP',          // Google Search Results Scraper
};

export async function runGoogleMapsSearch({ query, country, maxResults = 20 }) {
  const input = {
    searchStringsArray: [`${query} in ${country}`],
    maxCrawledPlaces: maxResults,
    language: 'en',
    country: 'US'
  };
  const res = await fetch(`${BASE}/run/${ACTORS.GOOGLE_MAPS}`, {
    method: 'POST', headers: headers(), body: JSON.stringify(input)
  });
  if (!res.ok) throw new Error(`Apify Google Maps: ${res.status}`);
  return res.json();
}

export async function scrapeWebsite({ url, maxDepth = 1, maxPages = 5 }) {
  const input = {
    startUrls: [{ url }],
    maxCrawlDepth: maxDepth,
    maxCrawlPages: maxPages,
    crawlerType: 'playwright:adaptive',
    includeUrlGlobs: [],
    readableTextCharThreshold: 100
  };
  const res = await fetch(`${BASE}/run/${ACTORS.WEBSITE_CONTENT}`, {
    method: 'POST', headers: headers(), body: JSON.stringify(input)
  });
  if (!res.ok) throw new Error(`Apify Scrape: ${res.status}`);
  return res.json();
}

export async function googleSearchCompetitors({ query, maxResults = 10 }) {
  const input = {
    queries: query,
    maxPagesPerQuery: 1,
    resultsPerPage: maxResults,
    customDataFunction: `async ({ input, $, request, response, html }) => { return { title: $('title').text() }; }`
  };
  const res = await fetch(`${BASE}/run/${ACTORS.GOOGLE_SEARCH}`, {
    method: 'POST', headers: headers(), body: JSON.stringify(input)
  });
  if (!res.ok) throw new Error(`Apify Google Search: ${res.status}`);
  return res.json();
}

export function normalizeApifyMapsLeads(data) {
  const items = Array.isArray(data) ? data : (data.items || data.data || []);
  return items.map(item => ({
    id: item.placeId || `apify-${Math.random()}`,
    source: 'Apify',
    sourceColor: '#F59E0B',
    name: item.title || item.name || '',
    title: item.categoryName || item.categories?.[0] || '',
    company: item.title || '',
    industry: item.categoryName || '',
    country: item.countryCode || item.address?.countryCode || '',
    email: item.email || item.emails?.[0] || '',
    phone: item.phone || item.phoneNumber || '',
    website: item.website || item.url || '',
    linkedin: '',
    employees: '',
    revenue: '',
    address: item.address || item.fullAddress || '',
    rating: item.rating || item.totalScore || '',
    reviews: item.reviewsCount || item.reviewCount || '',
    type: 'company',
    raw: item
  }));
}

export function extractCompetitorInsights(scrapedPages) {
  const pages = Array.isArray(scrapedPages) ? scrapedPages : (scrapedPages.items || []);
  const insights = {
    pages: [],
    pricing: [],
    socialLinks: [],
    technologies: [],
    keywords: []
  };

  pages.forEach(page => {
    const url = page.url || '';
    const text = (page.text || page.markdown || page.content || '').toLowerCase();
    const title = page.title || '';

    insights.pages.push({ url, title, wordCount: text.split(/\s+/).length });

    // Detect pricing mentions
    if (url.includes('pric') || url.includes('plan') || text.includes('per month') || text.includes('pricing')) {
      const priceMatches = text.match(/\$[\d,]+(?:\.\d{2})?(?:\s*\/\s*(?:month|mo|year|yr))?/g) || [];
      insights.pricing.push(...priceMatches.slice(0, 5));
    }

    // Social links
    const socials = (page.links || []).filter(l => l && /linkedin|twitter|facebook|instagram|youtube/i.test(l));
    insights.socialLinks.push(...socials);

    // Technology detection
    const techKeywords = ['react', 'vue', 'angular', 'wordpress', 'shopify', 'hubspot', 'salesforce', 'stripe', 'intercom', 'zendesk', 'segment', 'google analytics', 'hotjar'];
    techKeywords.forEach(tech => {
      if (text.includes(tech) && !insights.technologies.includes(tech)) {
        insights.technologies.push(tech);
      }
    });
  });

  // Deduplicate
  insights.pricing = [...new Set(insights.pricing)].slice(0, 10);
  insights.socialLinks = [...new Set(insights.socialLinks)];

  return insights;
}
