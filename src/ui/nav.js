// src/ui/nav.js — Tab navigation
export function initNav() {
  const btns = document.querySelectorAll('.nav-btn');
  const panels = document.querySelectorAll('.panel');

  function activate(id) {
    btns.forEach(b => b.classList.toggle('active', b.dataset.panel === id));
    panels.forEach(p => p.classList.toggle('active', p.id === `panel-${id}`));
    if (id === 'saved') window.dispatchEvent(new Event('refreshSaved'));
  }

  btns.forEach(btn => btn.addEventListener('click', () => activate(btn.dataset.panel)));
}

export function updateSavedBadge(count) {
  const badge = document.getElementById('saved-count');
  if (!badge) return;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline' : 'none';
}
