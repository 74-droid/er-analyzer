// ── Defense Bars & Resistance Grid ──────────────────────

const DEFENSE_TYPES = [
  { key: 'physical', label: 'Physical', barClass: 'bar-physical' },
  { key: 'slash', label: 'Slash', barClass: 'bar-slash' },
  { key: 'blow', label: 'Strike', barClass: 'bar-blow' },
  { key: 'thrust', label: 'Thrust', barClass: 'bar-thrust' },
  { key: 'magic', label: 'Magic', barClass: 'bar-magic' },
  { key: 'fire', label: 'Fire', barClass: 'bar-fire' },
  { key: 'lightning', label: 'Lightning', barClass: 'bar-lightning' },
  { key: 'holy', label: 'Holy', barClass: 'bar-holy' },
];

const NEGATION_TYPES = [
  { key: 'neutral', label: 'Physical', barClass: 'bar-physical' },
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

export function renderDefenseCard(defense) {
  const maxVal = Math.max(...Object.values(defense), 1);
  const barMax = Math.max(maxVal * 1.2, 200);

  const bars = DEFENSE_TYPES.map(dt => {
    const val = defense[dt.key] || 0;
    const pct = Math.max((val / barMax) * 100, 1);
    return `
      <div class="stat-row">
        <span class="stat-row-label">${dt.label}</span>
        <div class="stat-bar-container">
          <div class="stat-bar ${dt.barClass}" style="width:${pct}%"></div>
          <span class="stat-bar-value">${val}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="profile-card">
      <div class="card-title">Defense</div>
      ${bars}
    </div>
  `;
}

export function renderNegationCard(negation) {
  // Negation values: 1.0 = 0% absorption, 0.5 = 50% absorption
  // Lower value = more damage negated
  const bars = NEGATION_TYPES.map(dt => {
    const raw = negation[dt.key];
    const absorption = ((1 - raw) * 100).toFixed(1);
    // Bar width: higher absorption = wider bar
    const pct = Math.max(Math.abs(parseFloat(absorption)), 1);
    const isNegative = parseFloat(absorption) < 0;

    return `
      <div class="stat-row">
        <span class="stat-row-label">${dt.label}</span>
        <div class="stat-bar-container">
          <div class="stat-bar ${dt.barClass}" style="width:${Math.min(Math.abs(pct), 100)}%; opacity:${isNegative ? 0.4 : 1}"></div>
          <span class="stat-bar-value" style="${isNegative ? 'color:var(--accent-red)' : ''}">${isNegative ? '' : ''}${absorption}%</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="profile-card">
      <div class="card-title">Damage Negation</div>
      ${bars}
    </div>
  `;
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
