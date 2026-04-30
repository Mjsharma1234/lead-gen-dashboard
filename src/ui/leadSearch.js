// src/ui/leadSearch.js — Main lead search UI
import { searchPeople, searchCompanies, normalizeApolloLeads } from '../modules/apollo.js';
import { searchLeads as expleeSearch, normalizeExpleeLeads } from '../modules/explee.js';
import { searchProspects, normalizeExploriumLeads } from '../modules/explorium.js';
import { runGoogleMapsSearch, normalizeApifyMapsLeads } from '../modules/apify.js';
import { deduplicateLeads, filterLeads, sortLeads, getLeadStats, saveLead, saveLeads, isLeadSaved } from '../modules/leads.js';
import { exportToExcel } from '../modules/export.js';
import { toast } from './toast.js';
import { updateSavedBadge } from './nav.js';

let allLeads = [];
let filtered = [];
let sortField = 'name';
let sortDir = 'asc';
let currentPage = 1;
const PAGE_SIZE = 20;

export function initLeadSearch() {
  document.getElementById('btn-search').addEventListener('click', doSearch);
  document.getElementById('btn-clear').addEventListener('click', clearForm);
  document.getElementById('btn-export').addEventListener('click', () => {
    if (!filtered.length) return toast('No leads to export', 'error');
    exportToExcel(filtered, 'leads');
    toast('Excel file downloaded!', 'success');
  });
  document.getElementById('btn-save-all').addEventListener('click', () => {
    if (!filtered.length) return toast('No leads to save', 'error');
    saveLeads(filtered);
    updateSavedBadge(JSON.parse(localStorage.getItem('leadgen_saved_leads') || '[]').length);
    toast(`Saved ${filtered.length} leads`, 'success');
    renderTable();
  });
  document.getElementById('inline-search').addEventListener('input', e => {
    currentPage = 1;
    filtered = filterLeads(allLeads, { search: e.target.value });
    renderTable();
  });

  // Source chip toggle
  ['apollo','explee','explorium','apify'].forEach(id => {
    const cb = document.getElementById(`src-${id}`);
    const chip = document.getElementById(`chip-${id}`);
    cb.addEventListener('change', () => chip.classList.toggle('checked', cb.checked));
  });

  // Sort headers
  document.querySelectorAll('#leads-table thead th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      if (sortField === th.dataset.sort) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else { sortField = th.dataset.sort; sortDir = 'asc'; }
      document.querySelectorAll('#leads-table thead th').forEach(t => t.classList.remove('sorted'));
      th.classList.add('sorted');
      th.querySelector('.sort-icon').textContent = sortDir === 'asc' ? '↑' : '↓';
      filtered = sortLeads(filtered, { field: sortField, dir: sortDir });
      currentPage = 1;
      renderTable();
    });
  });
}

async function doSearch() {
  const type = document.getElementById('lead-type').value;
  const industry = document.getElementById('industry').value;
  const country = document.getElementById('country').value;
  const seniority = document.getElementById('seniority').value;
  const keywords = document.getElementById('keywords').value.trim();
  const perPage = parseInt(document.getElementById('per-page').value);

  const sources = {
    apollo: document.getElementById('src-apollo').checked,
    explee: document.getElementById('src-explee').checked,
    explorium: document.getElementById('src-explorium').checked,
    apify: document.getElementById('src-apify').checked,
  };

  if (!Object.values(sources).some(Boolean)) return toast('Select at least one data source', 'error');

  const btn = document.getElementById('btn-search');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Searching…';

  document.getElementById('results-card').style.display = 'block';
  document.getElementById('leads-tbody').innerHTML = `<tr class="loading-row"><td colspan="10"><div style="display:flex;justify-content:center"><div class="spinner"></div></div></td></tr>`;

  const results = [];
  const errors = [];
  const params = { industries: industry ? [industry] : [], countries: country ? [country] : [], keywords, seniorities: seniority ? [seniority] : [], perPage, page: 1 };

  const jobs = [];

  if (sources.apollo) jobs.push(
    (type === 'person'
      ? searchPeople(params).then(d => normalizeApolloLeads(d, 'person'))
      : searchCompanies(params).then(d => normalizeApolloLeads(d, 'company'))
    ).then(leads => results.push(...leads)).catch(e => errors.push(`Apollo: ${e.message}`))
  );

  if (sources.explee) jobs.push(
    expleeSearch({ query: keywords, industry, country, page: 1, limit: perPage })
      .then(d => normalizeExpleeLeads(d))
      .then(leads => results.push(...leads))
      .catch(e => errors.push(`Explee: ${e.message}`))
  );

  if (sources.explorium) jobs.push(
    searchProspects({ industry, country, jobTitles: keywords ? [keywords] : [], page: 1, limit: perPage })
      .then(d => normalizeExploriumLeads(d))
      .then(leads => results.push(...leads))
      .catch(e => errors.push(`Explorium: ${e.message}`))
  );

  if (sources.apify) jobs.push(
    runGoogleMapsSearch({ query: keywords || industry || 'business', country: country || 'US', maxResults: perPage })
      .then(d => normalizeApifyMapsLeads(d))
      .then(leads => results.push(...leads))
      .catch(e => errors.push(`Apify: ${e.message}`))
  );

  await Promise.allSettled(jobs);

  if (errors.length) toast(`Some sources failed: ${errors.join(' | ')}`, 'error', 5000);

  allLeads = deduplicateLeads(results);
  filtered = allLeads;
  currentPage = 1;
  renderTable();
  renderStats();

  btn.disabled = false;
  btn.innerHTML = '🔍 Search Leads';
  if (!allLeads.length) toast('No leads found. Check your API keys in Settings.', 'info');
}

function renderStats() {
  const s = getLeadStats(allLeads);
  document.getElementById('stat-total').textContent = s.total;
  document.getElementById('stat-email').textContent = s.withEmail;
  document.getElementById('stat-phone').textContent = s.withPhone;
  document.getElementById('result-count').textContent = filtered.length;

  const breakdown = Object.entries(s.bySource).map(([k, v]) => `${k}: ${v}`).join(' · ');
  document.getElementById('source-breakdown').textContent = breakdown ? `(${breakdown})` : '';
}

function renderTable() {
  const tbody = document.getElementById('leads-tbody');
  const total = filtered.length;
  const start = (currentPage - 1) * PAGE_SIZE;
  const page = filtered.slice(start, start + PAGE_SIZE);
  document.getElementById('result-count').textContent = total;

  if (!page.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">🔍</div><p>No leads found for this filter</p></div></td></tr>`;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  tbody.innerHTML = page.map(lead => {
    const saved = isLeadSaved(lead);
    const src = lead.source?.toLowerCase() || '';
    return `<tr>
      <td><button class="save-btn ${saved ? 'saved' : ''}" data-id="${lead.id}" title="${saved ? 'Unsave' : 'Save'}">★</button></td>
      <td class="td-name">${esc(lead.name)}</td>
      <td class="td-title">${esc(lead.title)}</td>
      <td class="td-company">${esc(lead.company)}</td>
      <td>${esc(lead.industry)}</td>
      <td>${esc(lead.country)}</td>
      <td class="td-email">${lead.email ? `<a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a>` : '<span style="color:var(--text-muted)">—</span>'}</td>
      <td>${lead.phone ? esc(lead.phone) : '<span style="color:var(--text-muted)">—</span>'}</td>
      <td class="td-website">${lead.website ? `<a href="${esc(lead.website)}" target="_blank">↗</a>` : '<span style="color:var(--text-muted)">—</span>'}</td>
      <td><span class="badge badge-${src}">${esc(lead.source)}</span></td>
    </tr>`;
  }).join('');

  // Save buttons
  tbody.querySelectorAll('.save-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lead = allLeads.find(l => l.id === btn.dataset.id) || filtered.find(l => l.id === btn.dataset.id);
      if (!lead) return;
      saveLead(lead);
      btn.classList.add('saved');
      btn.title = 'Saved!';
      updateSavedBadge(JSON.parse(localStorage.getItem('leadgen_saved_leads') || '[]').length);
      toast(`Saved: ${lead.name || lead.company}`, 'success', 2000);
    });
  });

  renderPagination(total);
}

function renderPagination(total) {
  const pages = Math.ceil(total / PAGE_SIZE);
  const container = document.getElementById('pagination');
  if (pages <= 1) { container.innerHTML = ''; return; }

  let html = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} id="pg-prev">‹</button>`;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - currentPage) <= 1) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    } else if (Math.abs(i - currentPage) === 2) {
      html += `<span style="color:var(--text-muted);padding:0 4px">…</span>`;
    }
  }
  html += `<button class="page-btn" ${currentPage === pages ? 'disabled' : ''} id="pg-next">›</button>`;
  container.innerHTML = html;

  container.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => { currentPage = parseInt(btn.dataset.page); renderTable(); });
  });
  container.querySelector('#pg-prev')?.addEventListener('click', () => { currentPage--; renderTable(); });
  container.querySelector('#pg-next')?.addEventListener('click', () => { currentPage++; renderTable(); });
}

function clearForm() {
  ['industry','country','seniority','keywords'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('lead-type').value = 'person';
  document.getElementById('inline-search').value = '';
  allLeads = []; filtered = [];
  document.getElementById('results-card').style.display = 'none';
  ['stat-total','stat-email','stat-phone'].forEach(id => document.getElementById(id).textContent = '0');
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
