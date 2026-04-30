// src/ui/settings.js — API key management UI
import { toast } from './toast.js';

const APIS = [
  {
    id: 'apollo', label: 'Apollo.io', color: '#6366F1', emoji: '🪐',
    storageKey: 'apollo_key',
    docsUrl: 'https://app.apollo.io/#/settings/integrations/api',
    testUrl: '/api/apollo/people/search',
    testBody: { per_page: 1, page: 1 },
    testMethod: 'POST',
  },
  {
    id: 'explee', label: 'Explee', color: '#22D3EE', emoji: '🔵',
    storageKey: 'explee_key',
    docsUrl: 'https://app.explee.io/settings/api',
    testUrl: null,
  },
  {
    id: 'explorium', label: 'Explorium', color: '#10B981', emoji: '🌿',
    storageKey: 'explorium_key',
    docsUrl: 'https://app.explorium.ai/',
    testUrl: null,
  },
  {
    id: 'apify', label: 'Apify', color: '#F59E0B', emoji: '🕷',
    storageKey: 'apify_key',
    docsUrl: 'https://console.apify.com/account/integrations',
    testUrl: null,
  },
];

export function initSettings() {
  const grid = document.getElementById('settings-grid');
  if (!grid) return;
  grid.innerHTML = APIS.map(api => renderCard(api)).join('');

  APIS.forEach(api => {
    const input = document.getElementById(`key-${api.id}`);
    const toggle = document.getElementById(`toggle-${api.id}`);
    const saveBtn = document.getElementById(`save-${api.id}`);
    const testBtn = document.getElementById(`test-${api.id}`);
    const result = document.getElementById(`result-${api.id}`);
    const dot = document.getElementById(`dot-${api.id}`);

    // Load existing key
    const stored = localStorage.getItem(api.storageKey) || '';
    if (stored) { input.value = stored; dot.classList.add('ok'); }

    // Toggle visibility
    toggle.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
      toggle.textContent = input.type === 'password' ? '👁' : '🙈';
    });

    // Save key
    saveBtn.addEventListener('click', () => {
      const val = input.value.trim();
      if (val) {
        localStorage.setItem(api.storageKey, val);
        dot.className = 'api-dot ok';
        toast(`${api.label} key saved`, 'success');
      } else {
        localStorage.removeItem(api.storageKey);
        dot.className = 'api-dot';
        toast(`${api.label} key removed`, 'info');
      }
    });

    // Test key
    if (testBtn) {
      testBtn.addEventListener('click', async () => {
        if (!api.testUrl) { result.className = 'test-result info'; result.textContent = 'Live test not available — save key and try a search.'; result.style.display='block'; return; }
        testBtn.textContent = '…';
        testBtn.disabled = true;
        try {
          const res = await fetch(api.testUrl, {
            method: api.testMethod || 'GET',
            headers: { 'Content-Type': 'application/json', [`x-${api.id}-key`]: input.value.trim() },
            body: api.testBody ? JSON.stringify(api.testBody) : undefined
          });
          if (res.status === 401 || res.status === 403) throw new Error('Invalid API key');
          result.className = 'test-result ok';
          result.textContent = `✅ Connected! Status ${res.status}`;
          dot.className = 'api-dot ok';
        } catch (e) {
          result.className = 'test-result err';
          result.textContent = `❌ ${e.message}`;
          dot.className = 'api-dot err';
        } finally {
          testBtn.textContent = 'Test';
          testBtn.disabled = false;
        }
      });
    }
  });
}

function renderCard(api) {
  return `
  <div class="settings-card">
    <div class="settings-card-header">
      <span style="font-size:1.4rem">${api.emoji}</span>
      <div class="api-dot" id="dot-${api.id}"></div>
      <h3>${api.label}</h3>
      <a href="${api.docsUrl}" target="_blank" style="margin-left:auto;font-size:.75rem;color:var(--text-dim)">Docs ↗</a>
    </div>
    <div class="form-group">
      <label for="key-${api.id}">API Key</label>
      <div class="key-input-wrap">
        <input class="form-control" id="key-${api.id}" type="password" placeholder="Paste your ${api.label} API key…" autocomplete="off" />
        <button class="key-toggle" id="toggle-${api.id}" type="button">👁</button>
      </div>
    </div>
    <div class="settings-actions">
      <button class="btn btn-primary btn-sm" id="save-${api.id}">Save Key</button>
      <button class="btn btn-outline btn-sm" id="test-${api.id}">Test</button>
    </div>
    <div class="test-result" id="result-${api.id}"></div>
  </div>`;
}
