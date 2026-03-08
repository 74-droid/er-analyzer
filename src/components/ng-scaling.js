// ── NG+ Scaling Calculator ───────────────────────────────

const STAT_ROWS = [
  { key: 'maxHp', label: 'HP' },
  { key: 'physAtk', label: 'Phys ATK' },
  { key: 'magAtk', label: 'Magic ATK' },
  { key: 'fireAtk', label: 'Fire ATK' },
  { key: 'lightningAtk', label: 'Lightning ATK' },
  { key: 'holyAtk', label: 'Holy ATK' },
  { key: 'physDef', label: 'Phys DEF' },
  { key: 'magDef', label: 'Magic DEF' },
  { key: 'fireDef', label: 'Fire DEF' },
  { key: 'lightningDef', label: 'Lightning DEF' },
  { key: 'holyDef', label: 'Holy DEF' },
  { key: 'soulRate', label: 'Rune Reward' },
  { key: 'staminaAtk', label: 'Stamina DMG' },
  { key: 'poiseDmg', label: 'Poise DMG' },
];

export function renderNGScaling(ngScaling, enemy) {
  if (!ngScaling || ngScaling.length === 0) {
    return `
      <div class="profile-card full-width">
        <div class="card-title">NG+ Scaling</div>
        <div style="color:var(--text-muted); padding: 1rem 0;">No NG+ scaling data available.</div>
      </div>
    `;
  }

  let selectedCycle = 0;

  const wrapper = document.createElement('div');
  wrapper.className = 'profile-card full-width';

  function render() {
    const cycleHeaders = ngScaling.map((ng, i) => {
      const label = i === 0 ? 'NG' : `NG+${i}`;
      const isSelected = i === selectedCycle;
      return `<th class="${isSelected ? 'selected-col' : ''}" data-cycle="${i}">${label}</th>`;
    }).join('');

    const rows = STAT_ROWS.map(sr => {
      const cells = ngScaling.map((ng, i) => {
        const rate = ng[sr.key] || 1;
        const isSelected = i === selectedCycle;

        // Calculate actual value for certain stats
        let display = '';
        let colorClass = 'ng-neutral';

        if (rate === 1) {
          display = '1.00x';
          colorClass = 'ng-neutral';
        } else if (rate > 1) {
          display = rate.toFixed(2) + 'x';
          colorClass = 'ng-increase';
        } else {
          display = rate.toFixed(2) + 'x';
          colorClass = 'ng-decrease';
        }

        return `<td class="${isSelected ? 'selected-col' : ''} ${colorClass}">${display}</td>`;
      }).join('');

      return `<tr><td>${sr.label}</td>${cells}</tr>`;
    }).join('');

    // Build the scaled values summary for the selected cycle
    const sel = ngScaling[selectedCycle];
    const scaledHP = enemy ? Math.floor(enemy.hp * (sel.maxHp || 1)) : null;
    const scaledRunes = enemy ? Math.floor(enemy.runeReward * (sel.soulRate || 1)) : null;

    const summaryHtml = enemy ? `
      <div style="display:flex; gap:2rem; margin-bottom:1rem; flex-wrap:wrap;">
        <div style="font-size:0.85rem; color:var(--text-secondary);">
          <span style="color:var(--accent-gold); font-weight:600;">${selectedCycle === 0 ? 'NG' : 'NG+' + selectedCycle}</span> Scaled Values:
          <span style="color:var(--accent-red); font-family:var(--font-mono); margin-left:0.5rem;">${scaledHP.toLocaleString()} HP</span>
          <span style="color:var(--accent-gold); font-family:var(--font-mono); margin-left:1rem;">${scaledRunes.toLocaleString()} Runes</span>
        </div>
      </div>
    ` : '';

    wrapper.innerHTML = `
      <div class="card-title">NG+ Scaling</div>
      ${summaryHtml}
      <div class="ng-table-wrapper">
        <table class="ng-table">
          <thead><tr><th>Stat</th>${cycleHeaders}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    // Bind click handlers to cycle headers
    wrapper.querySelectorAll('.ng-table th[data-cycle]').forEach(th => {
      th.addEventListener('click', () => {
        selectedCycle = parseInt(th.dataset.cycle);
        render();
      });
    });
  }

  render();
  return wrapper;
}
