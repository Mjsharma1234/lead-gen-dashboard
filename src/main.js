// src/main.js — LeadFlow Entry Point
import './style.css';
import { initNav } from './ui/nav.js';
import { initLeadSearch } from './ui/leadSearch.js';
import { initCompetition } from './ui/competition.js';
import { initSaved } from './ui/saved.js';
import { initSettings } from './ui/settings.js';
import { checkServerHealth } from './ui/serverStatus.js';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initSettings();
  initLeadSearch();
  initCompetition();
  initSaved();
  checkServerHealth();
  // Poll server health every 15s
  setInterval(checkServerHealth, 15000);
});
