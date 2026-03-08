// ── Sortable Attack Table ────────────────────────────────

const COLUMNS = [
  { key: 'name', label: 'Attack Name', numeric: false },
  { key: 'atkPhys', label: 'Phys', numeric: true, dmgClass: 'dmg-phys' },
  { key: 'atkMag', label: 'Magic', numeric: true, dmgClass: 'dmg-mag' },
  { key: 'atkFire', label: 'Fire', numeric: true, dmgClass: 'dmg-fire' },
  { key: 'atkThun', label: 'Ltn', numeric: true, dmgClass: 'dmg-ltn' },
  { key: 'atkDark', label: 'Holy', numeric: true, dmgClass: 'dmg-holy' },
  { key: 'poiseDamage', label: 'Poise', numeric: true, dmgClass: 'dmg-poise' },
  { key: 'atkStam', label: 'Stamina', numeric: true, dmgClass: 'dmg-phys' },
  { key: 'hitRadius', label: 'Range', numeric: true },
  { key: 'knockback', label: 'KB', numeric: true },
  { key: 'type', label: 'Type', numeric: false },
];

export function renderAttackTable(attacks) {
  if (!attacks || attacks.length === 0) {
    return `
      <div class="profile-card full-width">
        <div class="card-title">Attacks</div>
        <div style="color:var(--text-muted); padding: 1rem 0;">No attack data available for this enemy.</div>
      </div>
    `;
  }

  let sortKey = 'atkPhys';
  let sortDir = 'desc';

  const wrapper = document.createElement('div');
  wrapper.className = 'profile-card full-width';

  function render() {
    const sorted = [...attacks].sort((a, b) => {
      const col = COLUMNS.find(c => c.key === sortKey);
      let aVal = a[sortKey] ?? '';
      let bVal = b[sortKey] ?? '';

      if (col && col.numeric) {
        aVal = typeof aVal === 'number' ? aVal : parseFloat(aVal) || 0;
        bVal = typeof bVal === 'number' ? bVal : parseFloat(bVal) || 0;
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        const cmp = aVal.localeCompare(bVal);
        return sortDir === 'asc' ? cmp : -cmp;
      }
    });

    const headers = COLUMNS.map(col => {
      const isSorted = col.key === sortKey;
      const arrow = isSorted ? (sortDir === 'asc' ? '&#9650;' : '&#9660;') : '';
      return `<th class="${isSorted ? 'sorted' : ''}" data-key="${col.key}">${col.label}<span class="sort-arrow">${arrow}</span></th>`;
    }).join('');

    const totalDmg = (atk) => (atk.atkPhys || 0) + (atk.atkMag || 0) + (atk.atkFire || 0) + (atk.atkThun || 0) + (atk.atkDark || 0);

    const rows = sorted.map(atk => {
      const cells = COLUMNS.map(col => {
        const val = atk[col.key];
        if (col.key === 'name') {
          const displayName = val || `Attack ${atk.behaviorId || '?'}`;
          return `<td title="${escapeAttr(displayName)}">${escapeHtml(displayName)}</td>`;
        }
        if (col.key === 'type') {
          return `<td><span class="type-badge">${escapeHtml(val || 'Standard')}</span></td>`;
        }
        if (col.key === 'hitRadius' || col.key === 'knockback') {
          return `<td>${typeof val === 'number' ? val.toFixed(2) : val || '0'}</td>`;
        }
        // Numeric damage columns
        const n = val || 0;
        const cls = n === 0 ? 'dmg-zero' : (col.dmgClass || '');
        return `<td class="${cls}">${n}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    wrapper.innerHTML = `
      <div class="card-title">Attacks</div>
      <div class="attack-count">${attacks.length} attack${attacks.length !== 1 ? 's' : ''} &middot; Click column headers to sort</div>
      <div class="attack-table-wrapper">
        <table class="attack-table">
          <thead><tr>${headers}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    // Bind sort click handlers
    wrapper.querySelectorAll('.attack-table th').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (sortKey === key) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortKey = key;
          const col = COLUMNS.find(c => c.key === key);
          sortDir = col && col.numeric ? 'desc' : 'asc';
        }
        render();
      });
    });
  }

  render();
  return wrapper;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
