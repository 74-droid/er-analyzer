// ── Enemy Profile Card ──────────────────────────────────

import { renderDefenseCard, renderNegationCard, renderResistancesCard } from './stats-display.js';
import { renderAttackTable } from './attack-table.js';
import { renderNGScaling } from './ng-scaling.js';

export function renderEnemyProfile(enemy, ngScaling) {
  const container = document.getElementById('enemy-profile');
  container.innerHTML = '';
  container.classList.remove('hidden');

  // Hide welcome screen
  document.getElementById('welcome-screen').classList.add('hidden');

  // ── Hero Card ──────────────────────────────────────
  const hero = document.createElement('div');
  hero.className = 'profile-hero';

  const variantSelector = enemy.variants && enemy.variants.length > 0
    ? `<select class="variant-select" id="variant-select">
        <option value="primary">${enemy.name} (Primary)</option>
        ${enemy.variants.map((v, i) => `<option value="${i}">${v.name} — ${v.label}</option>`).join('')}
       </select>`
    : '';

  hero.innerHTML = `
    <div class="profile-hero-top">
      <div>
        <div class="profile-name">${escapeHtml(enemy.name)}</div>
        ${enemy.location ? `<div class="profile-location">${escapeHtml(enemy.location)}</div>` : ''}
        <div class="profile-id">ID: ${enemy.id} &middot; Behavior Group: ${enemy.behaviorVariationId}</div>
      </div>
      <div>${variantSelector}</div>
    </div>
    <div class="profile-stats">
      <div class="stat-block">
        <div class="stat-value hp">${enemy.hp.toLocaleString()}</div>
        <div class="stat-label">Hit Points</div>
      </div>
      <div class="stat-block">
        <div class="stat-value poise">${enemy.poise}</div>
        <div class="stat-label">Poise</div>
      </div>
      <div class="stat-block">
        <div class="stat-value runes">${enemy.runeReward.toLocaleString()}</div>
        <div class="stat-label">Runes</div>
      </div>
      <div class="stat-block">
        <div class="stat-value" style="color:var(--text-secondary)">${enemy.attacks.length}</div>
        <div class="stat-label">Attacks</div>
      </div>
      ${enemy.isBoss ? '<div class="stat-block"><div class="stat-value" style="color:var(--accent-gold);font-size:1rem;">&#9876;</div><div class="stat-label">Boss</div></div>' : ''}
    </div>
  `;
  container.appendChild(hero);

  // ── Stats Grid (Defense + Negation) ────────────────
  const statsGrid = document.createElement('div');
  statsGrid.className = 'profile-grid';
  statsGrid.innerHTML = renderDefenseCard(enemy.defense) + renderNegationCard(enemy.damageNegation);
  container.appendChild(statsGrid);

  // ── Resistances ────────────────────────────────────
  const resistGrid = document.createElement('div');
  resistGrid.className = 'profile-grid';
  resistGrid.innerHTML = renderResistancesCard(enemy.resistances) + renderSpEffectsCard(enemy.spEffectIds);
  container.appendChild(resistGrid);

  // ── Attack Table ───────────────────────────────────
  const attackEl = renderAttackTable(enemy.attacks);
  if (typeof attackEl === 'string') {
    const div = document.createElement('div');
    div.innerHTML = attackEl;
    container.appendChild(div.firstElementChild);
  } else {
    container.appendChild(attackEl);
  }

  // ── NG+ Scaling ────────────────────────────────────
  const ngEl = renderNGScaling(ngScaling, enemy);
  if (typeof ngEl === 'string') {
    const div = document.createElement('div');
    div.innerHTML = ngEl;
    container.appendChild(div.firstElementChild);
  } else {
    container.appendChild(ngEl);
  }

  // ── Variant selector handler ───────────────────────
  const variantSelect = container.querySelector('#variant-select');
  if (variantSelect) {
    variantSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'primary') {
        renderEnemyProfile(enemy, ngScaling);
      } else {
        const variant = enemy.variants[parseInt(val)];
        // Merge variant data over primary
        const merged = {
          ...enemy,
          ...variant,
          attacks: enemy.attacks, // Attacks stay the same (same behaviorVariationId)
          variants: enemy.variants,
          runeReward: enemy.runeReward,
          location: enemy.location,
          isBoss: enemy.isBoss,
          spEffectIds: enemy.spEffectIds,
        };
        renderEnemyProfile(merged, ngScaling);
        // Re-select the variant in the dropdown
        const newSelect = container.querySelector('#variant-select');
        if (newSelect) newSelect.value = val;
      }
    });
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderSpEffectsCard(spEffectIds) {
  if (!spEffectIds || spEffectIds.length === 0) {
    return `
      <div class="profile-card">
        <div class="card-title">Special Effects</div>
        <div style="color:var(--text-muted); padding: 0.5rem 0;">None</div>
      </div>
    `;
  }

  const tags = spEffectIds.map(id => `<span class="speffect-tag">${id}</span>`).join('');

  return `
    <div class="profile-card">
      <div class="card-title">Special Effect IDs</div>
      <div class="speffect-list">${tags}</div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
