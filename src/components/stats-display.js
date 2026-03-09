// ── Defense Bars & Resistance Grid ──────────────────────

const ABSORPTION_TYPES = [
  { key: 'physical', label: 'Physical', barClass: 'bar-physical' },
  { key: 'slash', label: 'Slash', barClass: 'bar-slash' },
  { key: 'blow', label: 'Strike', barClass: 'bar-blow' },
  { key: 'thrust', label: 'Thrust', barClass: 'bar-thrust' },
  { key: 'magic', label: 'Magic', barClass: 'bar-magic' },
  { key: 'fire', label: 'Fire', barClass: 'bar-fire' },
  { key: 'lightning', label: 'Lightning', barClass: 'bar-lightning' },
  { key: 'holy', label: 'Holy', barClass: 'bar-holy' },
];

const RESIST_TYPES = [
  { key: 'poison', label: 'Poison', icon: '&#9762;' },
  { key: 'scarletRot', label: 'Scarlet Rot', icon: '&#9763;' },
  { key: 'hemorrhage', label: 'Hemorrhage', icon: '&#128167;' },
  { key: 'frost', label: 'Frostbite', icon: '&#10052;' },
  { key: 'sleep', label: 'Sleep', icon: '&#128164;' },
  { key: 'madness', label: 'Madness', icon: '&#128293;' },
  { key: 'deathBlight', label: 'Death Blight', icon: '&#9760;' },
];

export function renderAbsorptionCard(absorption) {
  // DamageCutRate: 1.0 = no absorption, 0.5 = 50% absorbed, 1.1 = -10% (vulnerable)
  const bars = ABSORPTION_TYPES.map(dt => {
    const raw = absorption[dt.key] ?? 1;
    const pct = Math.round((1 - raw) * 100); // positive = absorbed, negative = vulnerable
    const barWidth = Math.min(Math.abs(pct), 100);
    const isVuln = pct < 0;

    return `
      <div class="stat-row">
        <span class="stat-row-label">${dt.label}</span>
        <div class="stat-bar-container">
          <div class="stat-bar ${dt.barClass}" style="width:${Math.max(barWidth, 1)}%; opacity:${isVuln ? 0.4 : 1}"></div>
          <span class="stat-bar-value" style="${isVuln ? 'color:var(--accent-red)' : ''}">${pct}%</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="profile-card">
      <div class="card-title">Damage Absorption</div>
      ${bars}
    </div>
  `;
}

// Legacy compat — redirect old calls
export function renderDefenseCard(defense) {
  return renderAbsorptionCard(defense);
}

export function renderNegationCard() {
  return ''; // Consolidated into absorption card
}

export function renderResistancesCard(resistances) {
  const items = RESIST_TYPES.map(rt => {
    const val = resistances[rt.key] || 0;
    let colorClass = 'resist-medium';
    if (val >= 999) colorClass = 'resist-immune';
    else if (val >= 400) colorClass = 'resist-high';
    else if (val >= 200) colorClass = 'resist-medium';
    else if (val >= 100) colorClass = 'resist-low';
    else colorClass = 'resist-weak';

    const displayVal = val >= 999 ? 'Immune' : val;

    return `
      <div class="resist-item">
        <div class="resist-value ${colorClass}">${displayVal}</div>
        <div class="resist-label">${rt.label}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="profile-card">
      <div class="card-title">Status Resistances</div>
      <div class="resist-grid">${items}</div>
    </div>
  `;
}
