// ── Search Bar with Autocomplete ─────────────────────────

export function createSearch(enemies, onSelect) {
  const container = document.getElementById('search-container');
  let activeIndex = -1;
  let filtered = [];
  let bossOnly = false;
  let debounceTimer = null;

  container.innerHTML = `
    <div class="search-wrapper">
      <span class="search-icon">&#128269;</span>
      <input type="text" class="search-input" placeholder="Search enemies and bosses..." autocomplete="off" spellcheck="false" />
    </div>
    <div class="search-filters">
      <button class="filter-btn" data-filter="all">All</button>
      <button class="filter-btn active" data-filter="all">All</button>
      <button class="filter-btn" data-filter="bosses">Bosses Only</button>
    </div>
    <div class="search-results hidden"></div>
  `;

  // Fix: only two filter buttons
  const filtersDiv = container.querySelector('.search-filters');
  filtersDiv.innerHTML = `
    <button class="filter-btn active" data-filter="all">All</button>
    <button class="filter-btn" data-filter="bosses">Bosses Only</button>
  `;

  const input = container.querySelector('.search-input');
  const resultsDiv = container.querySelector('.search-results');
  const filterBtns = filtersDiv.querySelectorAll('.filter-btn');

  // Filter button handling
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      bossOnly = btn.dataset.filter === 'bosses';
      if (input.value.trim()) {
        performSearch(input.value.trim());
      }
    });
  });

  function performSearch(query) {
    if (!query) {
      hideResults();
      return;
    }

    const q = query.toLowerCase();
    const pool = bossOnly ? enemies.filter(e => e.isBoss) : enemies;

    // Score-based matching
    filtered = pool
      .map(enemy => {
        const name = enemy.name.toLowerCase();
        let score = 0;
        if (name === q) score = 100;
        else if (name.startsWith(q)) score = 80;
        else if (name.includes(q)) score = 60;
        else {
          // Check individual words
          const words = name.split(/[\s,]+/);
          for (const w of words) {
            if (w.startsWith(q)) { score = 40; break; }
          }
        }
        return { enemy, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Bosses first
        if (a.enemy.isBoss !== b.enemy.isBoss) return a.enemy.isBoss ? -1 : 1;
        return a.enemy.name.localeCompare(b.enemy.name);
      })
      .slice(0, 30)
      .map(x => x.enemy);

    renderResults();
  }

  function renderResults() {
    if (filtered.length === 0) {
      resultsDiv.innerHTML = `<div class="search-result-item"><span class="result-name" style="color:var(--text-muted)">No results found</span></div>`;
      resultsDiv.classList.remove('hidden');
      return;
    }

    resultsDiv.innerHTML = filtered.map((e, i) => `
      <div class="search-result-item${i === activeIndex ? ' active' : ''}" data-index="${i}">
        <span class="result-name">${highlightMatch(e.name, input.value.trim())}</span>
        <span class="result-meta">
          ${e.location ? `<span>${e.location}</span>` : ''}
          <span class="result-tag ${e.isBoss ? 'tag-boss' : 'tag-enemy'}">${e.isBoss ? 'Boss' : 'Enemy'}</span>
        </span>
      </div>
    `).join('');

    resultsDiv.classList.remove('hidden');

    // Click handlers
    resultsDiv.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.index);
        if (filtered[idx]) {
          selectEnemy(filtered[idx]);
        }
      });
    });
  }

  function highlightMatch(name, query) {
    if (!query) return escapeHtml(name);
    const idx = name.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(name);
    const before = name.slice(0, idx);
    const match = name.slice(idx, idx + query.length);
    const after = name.slice(idx + query.length);
    return `${escapeHtml(before)}<strong style="color:var(--accent-gold)">${escapeHtml(match)}</strong>${escapeHtml(after)}`;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function selectEnemy(enemy) {
    input.value = enemy.name;
    hideResults();
    activeIndex = -1;
    onSelect(enemy);
  }

  function hideResults() {
    resultsDiv.classList.add('hidden');
    activeIndex = -1;
  }

  // Input handler with debounce
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    activeIndex = -1;
    debounceTimer = setTimeout(() => {
      performSearch(input.value.trim());
    }, 120);
  });

  // Keyboard navigation
  input.addEventListener('keydown', (e) => {
    if (resultsDiv.classList.contains('hidden')) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
      renderResults();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, -1);
      renderResults();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) {
        selectEnemy(filtered[activeIndex]);
      } else if (filtered.length > 0) {
        selectEnemy(filtered[0]);
      }
    } else if (e.key === 'Escape') {
      hideResults();
      input.blur();
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      hideResults();
    }
  });

  // Focus shows results if input has content
  input.addEventListener('focus', () => {
    if (input.value.trim() && filtered.length > 0) {
      resultsDiv.classList.remove('hidden');
    }
  });

  return { input, focus: () => input.focus() };
}
