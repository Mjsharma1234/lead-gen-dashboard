// src/ui/serverStatus.js
export async function checkServerHealth() {
  const badge = document.getElementById('server-badge');
  const text = document.getElementById('server-status-text');
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      badge.classList.add('connected');
      text.textContent = 'Proxy Online';
    } else throw new Error();
  } catch {
    badge.classList.remove('connected');
    text.textContent = 'Proxy Offline';
  }
}
