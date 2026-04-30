// src/ui/competition.js — Competitive analysis panel
import { enrichFirmographics, normalizeFirmographics, getBusinessSignals } from '../modules/explorium.js';
import { scrapeWebsite, extractCompetitorInsights } from '../modules/apify.js';
import { exportCompetitorReport } from '../modules/export.js';
import { toast } from './toast.js';

let analyzed = [];

export function initCompetition() {
  document.getElementById('btn-analyze').addEventListener('click', doAnalyze);
  document.getElementById('btn-export-comp').addEventListener('click', () => {
    if (!analyzed.length) return toast('Nothing to export yet', 'error');
    exportCompetitorReport(analyzed, 'competitor_analysis');
    toast('Competitor report downloaded!', 'success');
  });
}

async function doAnalyze() {
  const name = document.getElementById('comp-name').value.trim();
  const domain = document.getElementById('comp-domain').value.trim();
  const country = document.getElementById('comp-country').value.trim();

  if (!name && !domain) return toast('Enter a company name or domain', 'error');

  const btn = document.getElementById('btn-analyze');
  btn.disabled = true;
  btn.textContent = '⏳ Analyzing…';

  const container = document.getElementById('comp-results');
  container.innerHTML = `<div class="empty-state"><div class="spinner"></div><p>Fetching firmographics + scraping website…</p></div>`;

  try {
    // Run both in parallel
    const [firmData, signals, webData] = await Promise.allSettled([
      enrichFirmographics({ companyName: name, domain, country }),
      getBusinessSignals({ companyName: name, domain }),
      domain ? scrapeWebsite({ url: `https://${domain.replace(/^https?:\/\//, '')}`, maxDepth: 1, maxPages: 6 }) : Promise.resolve(null),
    ]);

    const firm = firmData.status === 'fulfilled' ? normalizeFirmographics(firmData.value) : null;
    const webInsights = webData.status === 'fulfilled' && webData.value
      ? extractCompetitorInsights(webData.value)
      : null;
    const signalData = signals.status === 'fulfilled' ? signals.value : null;

    const comp = buildCompetitorObject({ name, domain, country, firm, webInsights, signalData });
    analyzed.unshift(comp);

    renderCompCard(comp, container);
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${e.message}</p></div>`;
    toast('Analysis failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Analyze';
  }
}

function buildCompetitorObject({ name, domain, country, firm, webInsights }) {
  return {
    name: firm?.name || name,
    domain: firm?.domain || domain,
    industry: firm?.industry || '',
    subIndustry: firm?.subIndustry || '',
    employees: firm?.employees || '',
    revenue: firm?.revenue || '',
    founded: firm?.founded || '',
    country: firm?.country || country,
    city: firm?.city || '',
    description: firm?.description || '',
    technologies: [...(firm?.techStack || []), ...(webInsights?.technologies || [])].filter((v, i, a) => a.indexOf(v) === i),
    pricing: webInsights?.pricing || [],
    socialLinks: webInsights?.socialLinks || [],
    pages: webInsights?.pages || [],
    funding: firm?.fundingTotal || '',
    fundingRound: firm?.fundingRound || '',
    linkedin: firm?.linkedinUrl || '',
    phone: firm?.phone || '',
  };
}

function renderCompCard(comp, container) {
  const emoji = getIndustryEmoji(comp.industry);
  const html = `
  <div class="comp-cards">
  <div class="comp-card fade-in">
    <div class="comp-card-header">
      <div class="comp-logo">${emoji}</div>
      <div>
        <div class="comp-card-name">${esc(comp.name)}</div>
        <div class="comp-card-domain">${comp.domain ? `<a href="https://${comp.domain}" target="_blank" style="color:var(--cyan)">${esc(comp.domain)}</a>` : '—'}</div>
      </div>
    </div>
    <div class="comp-card-body">
      <div class="comp-section-title">Firmographics</div>
      ${row('Industry', comp.industry || comp.subIndustry)}
      ${row('Country / HQ', [comp.city, comp.country].filter(Boolean).join(', '))}
      ${row('Employees', comp.employees)}
      ${row('Revenue', comp.revenue)}
      ${row('Founded', comp.founded)}
      ${row('Funding', comp.funding ? `${comp.funding} (${comp.fundingRound || 'unknown round'})` : '')}
      ${row('Phone', comp.phone)}
      ${row('LinkedIn', comp.linkedin ? `<a href="${esc(comp.linkedin)}" target="_blank" style="color:var(--primary)">View Profile</a>` : '')}

      ${comp.description ? `<div style="font-size:.8rem;color:var(--text-dim);border-top:1px solid var(--border);padding-top:10px;margin-top:4px">${esc(comp.description)}</div>` : ''}

      ${comp.technologies.length ? `
        <div class="comp-section-title" style="margin-top:6px">Tech Stack Detected</div>
        <div class="comp-tags">${comp.technologies.map(t => `<span class="comp-tag tech">⚙ ${esc(t)}</span>`).join('')}</div>
      ` : ''}

      ${comp.pricing.length ? `
        <div class="comp-section-title" style="margin-top:6px">Pricing Signals</div>
        <div class="comp-tags">${comp.pricing.map(p => `<span class="comp-tag">💰 ${esc(p)}</span>`).join('')}</div>
      ` : ''}

      ${comp.pages.length ? `
        <div class="comp-section-title" style="margin-top:6px">Scraped Pages (${comp.pages.length})</div>
        <div style="max-height:100px;overflow-y:auto;font-size:.75rem;color:var(--text-dim)">
          ${comp.pages.map(p => `<div style="truncate;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">• ${esc(p.title || p.url)}</div>`).join('')}
        </div>
      ` : ''}

      ${comp.socialLinks.length ? `
        <div class="comp-section-title" style="margin-top:6px">Social Links</div>
        <div class="comp-tags">${comp.socialLinks.map(l => `<a class="comp-tag" href="${esc(l)}" target="_blank" style="text-decoration:none;color:var(--text-dim)">🔗 ${shortUrl(l)}</a>`).join('')}</div>
      ` : ''}

      ${!comp.industry && !comp.employees && !comp.technologies.length && !comp.pricing.length ? `
        <div style="color:var(--text-muted);font-size:.82rem;padding:10px 0">
          ⚠️ Limited data returned — ensure Explorium &amp; Apify keys are set in Settings, or the proxy server is running.
        </div>
      ` : ''}
    </div>
    <div class="comp-card-footer">
      ${comp.domain ? `<a href="https://${comp.domain}" target="_blank" class="btn btn-outline btn-sm">Visit Site ↗</a>` : ''}
      ${comp.linkedin ? `<a href="${esc(comp.linkedin)}" target="_blank" class="btn btn-outline btn-sm">LinkedIn ↗</a>` : ''}
    </div>
  </div>
  </div>`;
  container.innerHTML = html;
}

function row(label, value) {
  if (!value) return '';
  return `<div class="comp-row"><span class="lbl">${label}</span><span class="val">${value}</span></div>`;
}

function shortUrl(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url.slice(0, 30); }
}

function getIndustryEmoji(industry = '') {
  const i = industry.toLowerCase();
  if (i.includes('tech') || i.includes('software') || i.includes('saas')) return '💻';
  if (i.includes('finance') || i.includes('fintech')) return '💳';
  if (i.includes('health')) return '🏥';
  if (i.includes('retail') || i.includes('commerce')) return '🛒';
  if (i.includes('edu')) return '🎓';
  if (i.includes('real estate')) return '🏠';
  if (i.includes('media')) return '📺';
  return '🏢';
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
