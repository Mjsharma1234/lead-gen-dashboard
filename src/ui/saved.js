// src/ui/saved.js — Saved leads panel
import { getSavedLeads, unsaveLead, clearSavedLeads } from '../modules/leads.js';
import { exportToExcel } from '../modules/export.js';
import { toast } from './toast.js';
import { updateSavedBadge } from './nav.js';

export function initSaved() {
  window.addEventListener('refreshSaved', renderSaved);
  document.getElementById('btn-export-saved').addEventListener('click', () => {
    const leads = getSavedLeads();
    if (!leads.length) return toast('No saved leads', 'error');
    exportToExcel(leads, 'saved_leads');
    toast('Saved leads exported!', 'success');
  });
  document.getElementById('btn-clear-saved').addEventListener('click', () => {
    if (!confirm('Clear all saved leads?')) return;
    clearSavedLeads();
    updateSavedBadge(0);
    renderSaved();
    toast('Saved leads cleared', 'info');
  });
  renderSaved();
}

function renderSaved() {
  const leads = getSavedLeads();
  updateSavedBadge(leads.length);
  const tbody = document.getElementById('saved-tbody');
  if (!tbody) return;

  if (!leads.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">★</div><p>No saved leads yet — search and click ★ to save</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = leads.map(lead => {
    const src = lead.source?.toLowerCase() || '';
    return `<tr>
      <td class="td-name">${esc(lead.name)}</td>
      <td class="td-title">${esc(lead.title)}</td>
      <td>${esc(lead.company)}</td>
      <td class="td-email">${lead.email ? `<a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a>` : '—'}</td>
      <td>${esc(lead.phone)}</td>
      <td>${lead.website ? `<a href="${esc(lead.website)}" target="_blank" style="color:var(--primary)">↗</a>` : '—'}</td>
      <td><span class="badge badge-${src}">${esc(lead.source)}</span></td>
      <td><button class="btn-ghost btn-sm" data-id="${lead.id}" title="Remove">🗑</button></td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const updated = unsaveLead(btn.dataset.id);
      updateSavedBadge(updated.length);
      renderSaved();
    });
  });
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
