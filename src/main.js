// ── Elden Ring Enemy Analyzer — Main Controller ─────────

import { createSearch } from './components/search.js';
import { renderEnemyProfile } from './components/enemy-profile.js';

let enemies = [];
let ngScaling = [];

async function init() {
  const loadingEl = document.getElementById('loading');
  const welcomeEl = document.getElementById('welcome-screen');

  try {
    // Load data files in parallel
    const base = import.meta.env.BASE_URL;
    const [enemiesRes, ngRes] = await Promise.all([
      fetch(`${base}data/enemies.json`),
      fetch(`${base}data/ng-scaling.json`),
    ]);

    if (!enemiesRes.ok) throw new Error(`Failed to load enemies.json: ${enemiesRes.status}`);
    if (!ngRes.ok) throw new Error(`Failed to load ng-scaling.json: ${ngRes.status}`);

    const enemiesData = await enemiesRes.json();
    const ngData = await ngRes.json();

    enemies = enemiesData.enemies;
    ngScaling = ngData.scaling;

    // Update welcome screen with real counts
    const metadata = enemiesData.metadata;
    const sub = welcomeEl.querySelector('.welcome-sub');
    if (sub && metadata) {
      sub.textContent = `${metadata.totalEnemies} enemies \u00B7 ${metadata.totalBosses} bosses \u00B7 ${metadata.totalAttacks.toLocaleString()} attacks`;
    }

    // Initialize search
    const search = createSearch(enemies, (enemy) => {
      renderEnemyProfile(enemy, ngScaling);
      updateHash(enemy.id);
    });

    // Hide loading, show welcome
    loadingEl.classList.add('hidden');
    welcomeEl.classList.remove('hidden');

    // Handle hash routing (direct links to enemies)
    handleHash();
    window.addEventListener('hashchange', handleHash);

    // Focus search input
    search.focus();

    console.log(`Loaded ${enemies.length} enemies with ${ngScaling.length} NG+ cycles`);

  } catch (err) {
    loadingEl.textContent = `Error loading data: ${err.message}`;
    loadingEl.style.color = 'var(--accent-red)';
    console.error('Init error:', err);
  }
}

function handleHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;

  const id = parseInt(hash);
  if (isNaN(id)) return;

  const enemy = enemies.find(e => e.id === id);
  if (enemy) {
    renderEnemyProfile(enemy, ngScaling);
  }
}

function updateHash(id) {
  history.replaceState(null, '', `#${id}`);
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
