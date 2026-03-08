const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data/enemies.json'), 'utf-8'));
const ngData = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data/ng-scaling.json'), 'utf-8'));
const bosses = data.enemies.filter(e => e.isBoss);

// ─── Utility functions ─────────────────────────────────
function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function stdev(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}
function percentile(arr, p) {
  const s = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (s.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (idx - lo);
}
function fmt(n) { return typeof n === 'number' ? n.toLocaleString('en-US') : n; }
function pct(n) { return (n * 100).toFixed(1) + '%'; }
function fmtDec(n, d = 1) { return n.toFixed(d); }

// ─── PROGRESSION TIERS ─────────────────────────────────
// Group bosses by approximate game progression using rune reward as proxy
// Combined with location knowledge
const PROGRESSION_TIERS = {
  'Early Game (0–15k Runes)': b => b.runeReward > 0 && b.runeReward <= 15000,
  'Mid Game (15k–50k Runes)': b => b.runeReward > 15000 && b.runeReward <= 50000,
  'Late Game (50k–120k Runes)': b => b.runeReward > 50000 && b.runeReward <= 120000,
  'Endgame (120k–250k Runes)': b => b.runeReward > 120000 && b.runeReward <= 250000,
  'DLC / Pinnacle (250k+ Runes)': b => b.runeReward > 250000,
};

// ─── 1. HP RANGES BY PROGRESSION ────────────────────────
function analyzeHPByProgression() {
  const lines = [];
  lines.push('## 1. HP Ranges by Game Progression');
  lines.push('');
  lines.push('Bosses grouped by rune reward as a proxy for intended encounter order.');
  lines.push('');
  lines.push('| Tier | Count | Min HP | Median HP | Mean HP | Max HP | Std Dev |');
  lines.push('|------|-------|--------|-----------|---------|--------|---------|');

  for (const [tier, filter] of Object.entries(PROGRESSION_TIERS)) {
    const group = bosses.filter(filter);
    if (group.length === 0) continue;
    const hps = group.map(b => b.hp);
    lines.push(`| ${tier} | ${group.length} | ${fmt(Math.min(...hps))} | ${fmt(median(hps))} | ${fmt(Math.round(mean(hps)))} | ${fmt(Math.max(...hps))} | ${fmt(Math.round(stdev(hps)))} |`);
  }

  // Bosses with 0 runes
  const zeroRune = bosses.filter(b => b.runeReward === 0);
  if (zeroRune.length > 0) {
    const hps = zeroRune.map(b => b.hp);
    lines.push(`| No Rune Reward | ${zeroRune.length} | ${fmt(Math.min(...hps))} | ${fmt(median(hps))} | ${fmt(Math.round(mean(hps)))} | ${fmt(Math.max(...hps))} | ${fmt(Math.round(stdev(hps)))} |`);
  }

  lines.push('');

  // Per-tier boss listings
  lines.push('### Detailed Boss Listings by Tier');
  lines.push('');
  for (const [tier, filter] of Object.entries(PROGRESSION_TIERS)) {
    const group = bosses.filter(filter).sort((a, b) => a.runeReward - b.runeReward);
    if (group.length === 0) continue;
    lines.push(`**${tier}** (${group.length} bosses)`);
    lines.push('');
    lines.push('| Boss | Location | HP | Poise | Runes | Attacks |');
    lines.push('|------|----------|-----|-------|-------|---------|');
    for (const b of group) {
      lines.push(`| ${b.name} | ${b.location || '—'} | ${fmt(b.hp)} | ${b.poise} | ${fmt(b.runeReward)} | ${b.attacks.length} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ─── 2. ATTACK COUNT ANALYSIS ───────────────────────────
function analyzeAttackCounts() {
  const lines = [];
  lines.push('## 2. Attack Counts per Boss');
  lines.push('');

  const counts = bosses.map(b => b.attacks.length);
  const withAttacks = bosses.filter(b => b.attacks.length > 0);

  lines.push(`- **Total bosses**: ${bosses.length}`);
  lines.push(`- **Bosses with attack data**: ${withAttacks.length}`);
  lines.push(`- **Total boss attacks across all bosses**: ${fmt(counts.reduce((a, b) => a + b, 0))}`);
  lines.push(`- **Mean attacks per boss**: ${fmtDec(mean(counts))}`);
  lines.push(`- **Median attacks per boss**: ${median(counts)}`);
  lines.push(`- **Std deviation**: ${fmtDec(stdev(counts))}`);
  lines.push('');

  // Distribution buckets
  const buckets = [
    { label: '0 attacks', min: 0, max: 0 },
    { label: '1–20', min: 1, max: 20 },
    { label: '21–50', min: 21, max: 50 },
    { label: '51–100', min: 51, max: 100 },
    { label: '101–200', min: 101, max: 200 },
    { label: '200+', min: 201, max: Infinity },
  ];

  lines.push('| Bucket | Count | Percentage |');
  lines.push('|--------|-------|------------|');
  for (const bk of buckets) {
    const cnt = bosses.filter(b => b.attacks.length >= bk.min && b.attacks.length <= bk.max).length;
    lines.push(`| ${bk.label} | ${cnt} | ${pct(cnt / bosses.length)} |`);
  }
  lines.push('');

  // Top 15 most attack-dense bosses
  lines.push('### Top 15 Bosses by Attack Count');
  lines.push('');
  lines.push('| Boss | Attacks | Location |');
  lines.push('|------|---------|----------|');
  const sorted = [...bosses].sort((a, b) => b.attacks.length - a.attacks.length);
  for (const b of sorted.slice(0, 15)) {
    lines.push(`| ${b.name} | ${b.attacks.length} | ${b.location || '—'} |`);
  }
  lines.push('');

  // Bottom 10 (fewest attacks, excluding 0)
  lines.push('### Simplest Bosses (Fewest Attacks)');
  lines.push('');
  lines.push('| Boss | Attacks | Location |');
  lines.push('|------|---------|----------|');
  const simplest = withAttacks.sort((a, b) => a.attacks.length - b.attacks.length);
  for (const b of simplest.slice(0, 10)) {
    lines.push(`| ${b.name} | ${b.attacks.length} | ${b.location || '—'} |`);
  }
  lines.push('');

  // Attack count by progression tier
  lines.push('### Average Attack Count by Progression Tier');
  lines.push('');
  lines.push('| Tier | Mean Attacks | Median Attacks |');
  lines.push('|------|-------------|----------------|');
  for (const [tier, filter] of Object.entries(PROGRESSION_TIERS)) {
    const group = bosses.filter(filter);
    if (group.length === 0) continue;
    const atks = group.map(b => b.attacks.length);
    lines.push(`| ${tier} | ${fmtDec(mean(atks))} | ${median(atks)} |`);
  }
  lines.push('');

  return lines.join('\n');
}

// ─── 3. DAMAGE TYPE ANALYSIS ────────────────────────────
function analyzeDamageTypes() {
  const lines = [];
  lines.push('## 3. Damage Type Distribution');
  lines.push('');

  const allAttacks = bosses.flatMap(b => b.attacks);
  lines.push(`Across **${fmt(allAttacks.length)}** total boss attacks:`);
  lines.push('');

  // Attack type (physical subtype)
  const typeCounts = {};
  allAttacks.forEach(a => { typeCounts[a.type] = (typeCounts[a.type] || 0) + 1; });

  lines.push('### Physical Damage Subtypes');
  lines.push('');
  lines.push('| Type | Count | Percentage |');
  lines.push('|------|-------|------------|');
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedTypes) {
    lines.push(`| ${type} | ${fmt(count)} | ${pct(count / allAttacks.length)} |`);
  }
  lines.push('');

  // Elemental damage prevalence
  lines.push('### Elemental Damage Prevalence');
  lines.push('');
  lines.push('How many attacks deal each damage type (non-zero values):');
  lines.push('');

  const dmgTypes = [
    { key: 'atkPhys', label: 'Physical' },
    { key: 'atkMag', label: 'Magic' },
    { key: 'atkFire', label: 'Fire' },
    { key: 'atkThun', label: 'Lightning' },
    { key: 'atkDark', label: 'Holy' },
  ];

  lines.push('| Element | Attacks with > 0 | Percentage | Mean (when present) | Max |');
  lines.push('|---------|-----------------|------------|---------------------|-----|');
  for (const dt of dmgTypes) {
    const withDmg = allAttacks.filter(a => (a[dt.key] || 0) > 0);
    const vals = withDmg.map(a => a[dt.key]);
    lines.push(`| ${dt.label} | ${fmt(withDmg.length)} | ${pct(withDmg.length / allAttacks.length)} | ${vals.length ? fmtDec(mean(vals)) : '—'} | ${vals.length ? fmt(Math.max(...vals)) : '—'} |`);
  }
  lines.push('');

  // Bosses with elemental attacks
  lines.push('### Bosses Using Elemental Damage');
  lines.push('');
  for (const dt of dmgTypes.slice(1)) { // skip physical
    const bossesWithElem = bosses.filter(b => b.attacks.some(a => (a[dt.key] || 0) > 0));
    lines.push(`**${dt.label}** (${bossesWithElem.length} bosses): ${bossesWithElem.map(b => b.name).join(', ')}`);
    lines.push('');
  }

  // Multi-element attacks
  const multiElem = allAttacks.filter(a => {
    let count = 0;
    if (a.atkPhys > 0) count++;
    if (a.atkMag > 0) count++;
    if (a.atkFire > 0) count++;
    if (a.atkThun > 0) count++;
    if (a.atkDark > 0) count++;
    return count >= 2;
  });
  lines.push(`### Multi-Element Attacks: ${fmt(multiElem.length)} attacks (${pct(multiElem.length / allAttacks.length)}) deal 2+ damage types simultaneously.`);
  lines.push('');

  return lines.join('\n');
}

// ─── 4. POISE ANALYSIS ─────────────────────────────────
function analyzePoiseThresholds() {
  const lines = [];
  lines.push('## 4. Poise Thresholds');
  lines.push('');

  const poises = bosses.map(b => b.poise);
  const nonZero = poises.filter(p => p > 0);

  lines.push(`- **Bosses with poise > 0**: ${nonZero.length} / ${bosses.length}`);
  lines.push(`- **Bosses with poise = 0**: ${poises.filter(p => p === 0).length}`);
  if (nonZero.length > 0) {
    lines.push(`- **Min poise (non-zero)**: ${Math.min(...nonZero)}`);
    lines.push(`- **Median poise (non-zero)**: ${median(nonZero)}`);
    lines.push(`- **Mean poise (non-zero)**: ${fmtDec(mean(nonZero))}`);
    lines.push(`- **Max poise**: ${Math.max(...nonZero)}`);
  }
  lines.push('');

  // Poise by progression tier
  lines.push('### Poise by Progression Tier');
  lines.push('');
  lines.push('| Tier | Bosses w/ Poise | Mean | Median | Max |');
  lines.push('|------|----------------|------|--------|-----|');
  for (const [tier, filter] of Object.entries(PROGRESSION_TIERS)) {
    const group = bosses.filter(filter);
    if (group.length === 0) continue;
    const p = group.map(b => b.poise).filter(v => v > 0);
    if (p.length === 0) {
      lines.push(`| ${tier} | 0 / ${group.length} | — | — | — |`);
    } else {
      lines.push(`| ${tier} | ${p.length} / ${group.length} | ${fmtDec(mean(p))} | ${median(p)} | ${Math.max(...p)} |`);
    }
  }
  lines.push('');

  // Top poise bosses
  lines.push('### Highest Poise Bosses');
  lines.push('');
  lines.push('| Boss | Poise | HP | Location |');
  lines.push('|------|-------|-----|----------|');
  const byPoise = [...bosses].filter(b => b.poise > 0).sort((a, b) => b.poise - a.poise);
  for (const b of byPoise.slice(0, 15)) {
    lines.push(`| ${b.name} | ${b.poise} | ${fmt(b.hp)} | ${b.location || '—'} |`);
  }
  lines.push('');

  // Poise damage dealt by bosses
  lines.push('### Poise Damage Dealt by Boss Attacks');
  lines.push('');
  const allAttacks = bosses.flatMap(b => b.attacks);
  const poiseDmgs = allAttacks.map(a => a.poiseDamage || 0).filter(v => v > 0);
  if (poiseDmgs.length > 0) {
    lines.push(`- **Attacks that deal poise damage**: ${fmt(poiseDmgs.length)} / ${fmt(allAttacks.length)}`);
    lines.push(`- **Mean poise damage per attack**: ${fmtDec(mean(poiseDmgs))}`);
    lines.push(`- **Median poise damage**: ${median(poiseDmgs)}`);
    lines.push(`- **Max poise damage**: ${Math.max(...poiseDmgs)}`);

    // Distribution
    lines.push('');
    lines.push('| Poise Damage Range | Count | % of Attacks |');
    lines.push('|-------------------|-------|-------------|');
    const pdBuckets = [
      { label: '1–5', min: 1, max: 5 },
      { label: '6–10', min: 6, max: 10 },
      { label: '11–20', min: 11, max: 20 },
      { label: '21–50', min: 21, max: 50 },
      { label: '51–100', min: 51, max: 100 },
      { label: '100+', min: 101, max: Infinity },
    ];
    for (const bk of pdBuckets) {
      const cnt = poiseDmgs.filter(v => v >= bk.min && v <= bk.max).length;
      lines.push(`| ${bk.label} | ${fmt(cnt)} | ${pct(cnt / allAttacks.length)} |`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

// ─── 5. ATTACK DAMAGE DISTRIBUTIONS ────────────────────
function analyzeAttackDamage() {
  const lines = [];
  lines.push('## 5. Attack Damage Distributions');
  lines.push('');

  const allAttacks = bosses.flatMap(b => b.attacks);
  const physDmgs = allAttacks.map(a => a.atkPhys || 0).filter(v => v > 0);

  lines.push('### Physical Damage Distribution');
  lines.push('');
  lines.push(`Across ${fmt(physDmgs.length)} attacks with physical damage:`);
  lines.push('');
  lines.push(`- **Min**: ${Math.min(...physDmgs)}`);
  lines.push(`- **25th percentile**: ${fmtDec(percentile(physDmgs, 25))}`);
  lines.push(`- **Median**: ${fmtDec(percentile(physDmgs, 50))}`);
  lines.push(`- **75th percentile**: ${fmtDec(percentile(physDmgs, 75))}`);
  lines.push(`- **90th percentile**: ${fmtDec(percentile(physDmgs, 90))}`);
  lines.push(`- **95th percentile**: ${fmtDec(percentile(physDmgs, 95))}`);
  lines.push(`- **Max**: ${Math.max(...physDmgs)}`);
  lines.push(`- **Mean**: ${fmtDec(mean(physDmgs))}`);
  lines.push(`- **Std Dev**: ${fmtDec(stdev(physDmgs))}`);
  lines.push('');

  // Histogram
  const dmgBuckets = [
    { label: '1–50', min: 1, max: 50 },
    { label: '51–100', min: 51, max: 100 },
    { label: '101–200', min: 101, max: 200 },
    { label: '201–300', min: 201, max: 300 },
    { label: '301–400', min: 301, max: 400 },
    { label: '401–500', min: 401, max: 500 },
    { label: '501–700', min: 501, max: 700 },
    { label: '700+', min: 701, max: Infinity },
  ];

  lines.push('| Damage Range | Count | Percentage | Visual |');
  lines.push('|-------------|-------|------------|--------|');
  const maxBucket = Math.max(...dmgBuckets.map(bk => physDmgs.filter(v => v >= bk.min && v <= bk.max).length));
  for (const bk of dmgBuckets) {
    const cnt = physDmgs.filter(v => v >= bk.min && v <= bk.max).length;
    const barLen = Math.round((cnt / maxBucket) * 30);
    const bar = '\u2588'.repeat(barLen);
    lines.push(`| ${bk.label} | ${fmt(cnt)} | ${pct(cnt / physDmgs.length)} | ${bar} |`);
  }
  lines.push('');

  // Hardest-hitting attacks
  lines.push('### Top 20 Hardest-Hitting Boss Attacks (Total Damage)');
  lines.push('');
  lines.push('| Boss | Attack Name | Phys | Mag | Fire | Ltn | Holy | Total | Type |');
  lines.push('|------|-------------|------|-----|------|-----|------|-------|------|');

  const withTotal = bosses.flatMap(b =>
    b.attacks.map(a => ({
      boss: b.name,
      ...a,
      total: (a.atkPhys || 0) + (a.atkMag || 0) + (a.atkFire || 0) + (a.atkThun || 0) + (a.atkDark || 0)
    }))
  ).sort((a, b) => b.total - a.total);

  // Deduplicate by boss+total (many attacks have same values)
  const seen = new Set();
  let count = 0;
  for (const a of withTotal) {
    const key = `${a.boss}|${a.total}|${a.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`| ${a.boss} | ${a.name || '—'} | ${a.atkPhys} | ${a.atkMag} | ${a.atkFire} | ${a.atkThun} | ${a.atkDark} | **${a.total}** | ${a.type} |`);
    count++;
    if (count >= 20) break;
  }
  lines.push('');

  // Stamina damage
  lines.push('### Stamina Damage');
  lines.push('');
  const stamDmgs = allAttacks.map(a => a.atkStam || 0).filter(v => v > 0);
  lines.push(`- **Attacks with stamina damage**: ${fmt(stamDmgs.length)} / ${fmt(allAttacks.length)}`);
  if (stamDmgs.length > 0) {
    lines.push(`- **Mean**: ${fmtDec(mean(stamDmgs))}`);
    lines.push(`- **Median**: ${median(stamDmgs)}`);
    lines.push(`- **Max**: ${Math.max(...stamDmgs)}`);
  }
  lines.push('');

  // Hitbox radius
  lines.push('### Hitbox Radius');
  lines.push('');
  const radii = allAttacks.map(a => a.hitRadius || 0).filter(v => v > 0);
  if (radii.length > 0) {
    lines.push(`- **Attacks with hitbox data**: ${fmt(radii.length)}`);
    lines.push(`- **Mean radius**: ${fmtDec(mean(radii), 2)}`);
    lines.push(`- **Median radius**: ${fmtDec(median(radii), 2)}`);
    lines.push(`- **Max radius**: ${fmtDec(Math.max(...radii), 2)}`);
    lines.push('');

    // Top 10 biggest hitbox attacks
    lines.push('**Largest hitbox attacks:**');
    lines.push('');
    lines.push('| Boss | Attack | Radius |');
    lines.push('|------|--------|--------|');
    const byRadius = bosses.flatMap(b => b.attacks.map(a => ({ boss: b.name, ...a }))).sort((a, b) => (b.hitRadius || 0) - (a.hitRadius || 0));
    const seenR = new Set();
    let cntR = 0;
    for (const a of byRadius) {
      const k = `${a.boss}|${a.hitRadius}`;
      if (seenR.has(k)) continue;
      seenR.add(k);
      lines.push(`| ${a.boss} | ${a.name || '—'} | ${fmtDec(a.hitRadius, 2)} |`);
      cntR++;
      if (cntR >= 10) break;
    }
  }
  lines.push('');

  return lines.join('\n');
}

// ─── 6. RESISTANCE PROFILES ────────────────────────────
function analyzeResistances() {
  const lines = [];
  lines.push('## 6. Resistance Profiles');
  lines.push('');

  const resistTypes = [
    { key: 'poison', label: 'Poison' },
    { key: 'scarletRot', label: 'Scarlet Rot' },
    { key: 'hemorrhage', label: 'Hemorrhage' },
    { key: 'frost', label: 'Frostbite' },
    { key: 'sleep', label: 'Sleep' },
    { key: 'madness', label: 'Madness' },
    { key: 'deathBlight', label: 'Death Blight' },
  ];

  // Overall statistics
  lines.push('### Overall Resistance Statistics');
  lines.push('');
  lines.push('| Status Effect | Mean | Median | Min | Max | Immune Count | Immune % |');
  lines.push('|---------------|------|--------|-----|-----|--------------|----------|');
  for (const rt of resistTypes) {
    const vals = bosses.map(b => b.resistances[rt.key] || 0);
    const immuneCount = vals.filter(v => v >= 999).length;
    const nonImmune = vals.filter(v => v < 999 && v > 0);
    lines.push(`| ${rt.label} | ${fmtDec(mean(vals))} | ${median(vals)} | ${Math.min(...vals)} | ${Math.max(...vals)} | ${immuneCount} | ${pct(immuneCount / bosses.length)} |`);
  }
  lines.push('');

  // Immunity patterns
  lines.push('### Immunity Patterns');
  lines.push('');
  lines.push('How many bosses are immune (resistance >= 999) to each status:');
  lines.push('');

  for (const rt of resistTypes) {
    const immune = bosses.filter(b => (b.resistances[rt.key] || 0) >= 999);
    lines.push(`**${rt.label} Immune** (${immune.length}): ${immune.map(b => b.name).join(', ') || 'None'}`);
    lines.push('');
  }

  // Most vulnerable bosses (lowest total resistance)
  lines.push('### Most Vulnerable Bosses (Lowest Total Non-Immune Resistance)');
  lines.push('');
  const withTotalResist = bosses.map(b => {
    const total = resistTypes.reduce((s, rt) => {
      const v = b.resistances[rt.key] || 0;
      return s + (v >= 999 ? 0 : v); // Don't count immunities
    }, 0);
    const immunities = resistTypes.filter(rt => (b.resistances[rt.key] || 0) >= 999).length;
    return { ...b, totalResist: total, immunities };
  }).sort((a, b) => a.totalResist - b.totalResist);

  lines.push('| Boss | Total Resist | Immunities | Poison | Rot | Bleed | Frost | Sleep |');
  lines.push('|------|-------------|------------|--------|-----|-------|-------|-------|');
  for (const b of withTotalResist.slice(0, 15)) {
    const r = b.resistances;
    lines.push(`| ${b.name} | ${b.totalResist} | ${b.immunities} | ${r.poison} | ${r.scarletRot} | ${r.hemorrhage} | ${r.frost} | ${r.sleep} |`);
  }
  lines.push('');

  // Damage negation analysis
  lines.push('### Damage Negation Overview');
  lines.push('');
  lines.push('Absorption percentages (higher = more damage absorbed):');
  lines.push('');

  const negTypes = [
    { key: 'neutral', label: 'Physical' },
    { key: 'slash', label: 'Slash' },
    { key: 'blow', label: 'Strike' },
    { key: 'thrust', label: 'Thrust' },
    { key: 'magic', label: 'Magic' },
    { key: 'fire', label: 'Fire' },
    { key: 'lightning', label: 'Lightning' },
    { key: 'holy', label: 'Holy' },
  ];

  lines.push('| Damage Type | Mean Absorption | Median | Min | Max |');
  lines.push('|-------------|----------------|--------|-----|-----|');
  for (const nt of negTypes) {
    const absorptions = bosses.map(b => (1 - (b.damageNegation[nt.key] || 1)) * 100);
    lines.push(`| ${nt.label} | ${fmtDec(mean(absorptions))}% | ${fmtDec(median(absorptions))}% | ${fmtDec(Math.min(...absorptions))}% | ${fmtDec(Math.max(...absorptions))}% |`);
  }
  lines.push('');

  // Weakest and strongest negation bosses
  lines.push('### Most Physically Resilient Bosses');
  lines.push('');
  lines.push('| Boss | Phys Absorb | Magic Absorb | Fire Absorb | Holy Absorb |');
  lines.push('|------|------------|-------------|-------------|-------------|');
  const byPhysAbsorb = [...bosses].sort((a, b) => (a.damageNegation.neutral || 1) - (b.damageNegation.neutral || 1));
  for (const b of byPhysAbsorb.slice(0, 10)) {
    const n = b.damageNegation;
    lines.push(`| ${b.name} | ${fmtDec((1 - n.neutral) * 100)}% | ${fmtDec((1 - n.magic) * 100)}% | ${fmtDec((1 - n.fire) * 100)}% | ${fmtDec((1 - (n.holy || n.dark || 1)) * 100)}% |`);
  }
  lines.push('');

  return lines.join('\n');
}

// ─── 7. OUTLIERS & NOTABLE FINDINGS ────────────────────
function analyzeOutliers() {
  const lines = [];
  lines.push('## 7. Outliers & Notable Findings');
  lines.push('');

  const allAttacks = bosses.flatMap(b => b.attacks);

  // Highest HP bosses
  lines.push('### Tankiest Bosses (Highest HP)');
  lines.push('');
  lines.push('| Boss | HP | Runes | Location |');
  lines.push('|------|----|-------|----------|');
  const byHP = [...bosses].sort((a, b) => b.hp - a.hp);
  for (const b of byHP.slice(0, 10)) {
    lines.push(`| ${b.name} | ${fmt(b.hp)} | ${fmt(b.runeReward)} | ${b.location || '—'} |`);
  }
  lines.push('');

  // Lowest HP bosses
  lines.push('### Glass Cannons / Lowest HP Bosses');
  lines.push('');
  lines.push('| Boss | HP | Runes | Location |');
  lines.push('|------|----|-------|----------|');
  const byHPLow = [...bosses].sort((a, b) => a.hp - b.hp);
  for (const b of byHPLow.slice(0, 10)) {
    lines.push(`| ${b.name} | ${fmt(b.hp)} | ${fmt(b.runeReward)} | ${b.location || '—'} |`);
  }
  lines.push('');

  // Highest rune reward
  lines.push('### Richest Rune Rewards');
  lines.push('');
  lines.push('| Boss | Runes | HP | Location |');
  lines.push('|------|-------|----|----------|');
  const byRunes = [...bosses].sort((a, b) => b.runeReward - a.runeReward);
  for (const b of byRunes.slice(0, 10)) {
    lines.push(`| ${b.name} | ${fmt(b.runeReward)} | ${fmt(b.hp)} | ${b.location || '—'} |`);
  }
  lines.push('');

  // Rune efficiency (runes per HP)
  lines.push('### Rune Efficiency (Runes per HP)');
  lines.push('');
  lines.push('| Boss | Runes/HP | Runes | HP |');
  lines.push('|------|---------|-------|-----|');
  const runeEff = bosses.filter(b => b.runeReward > 0 && b.hp > 0).map(b => ({
    ...b,
    efficiency: b.runeReward / b.hp
  })).sort((a, b) => b.efficiency - a.efficiency);
  for (const b of runeEff.slice(0, 10)) {
    lines.push(`| ${b.name} | ${fmtDec(b.efficiency)} | ${fmt(b.runeReward)} | ${fmt(b.hp)} |`);
  }
  lines.push('');

  // Knockback analysis
  lines.push('### Highest Knockback Attacks');
  lines.push('');
  lines.push('| Boss | Attack | Knockback | Phys Damage |');
  lines.push('|------|--------|-----------|-------------|');
  const byKB = bosses.flatMap(b => b.attacks.map(a => ({ boss: b.name, ...a }))).sort((a, b) => (b.knockback || 0) - (a.knockback || 0));
  const seenKB = new Set();
  let cntKB = 0;
  for (const a of byKB) {
    const k = `${a.boss}|${a.knockback}`;
    if (seenKB.has(k)) continue;
    seenKB.add(k);
    lines.push(`| ${a.boss} | ${a.name || '—'} | ${fmtDec(a.knockback, 2)} | ${a.atkPhys} |`);
    cntKB++;
    if (cntKB >= 10) break;
  }
  lines.push('');

  // Bosses with most variant entries (complex multi-phase encounters)
  lines.push('### Most Complex Encounters (Most Variants)');
  lines.push('');
  lines.push('Variant count indicates different stat versions of the same boss (e.g., phase 2, NG+ versions, different encounter contexts):');
  lines.push('');
  lines.push('| Boss | Variants | Primary HP | Location |');
  lines.push('|------|----------|-----------|----------|');
  const byVariants = [...bosses].filter(b => b.variants && b.variants.length > 1).sort((a, b) => b.variants.length - a.variants.length);
  for (const b of byVariants.slice(0, 15)) {
    lines.push(`| ${b.name} | ${b.variants.length} | ${fmt(b.hp)} | ${b.location || '—'} |`);
  }
  lines.push('');

  // Pure physical vs mixed damage bosses
  const purePhys = bosses.filter(b => {
    if (b.attacks.length === 0) return false;
    return b.attacks.every(a => (a.atkMag || 0) === 0 && (a.atkFire || 0) === 0 && (a.atkThun || 0) === 0 && (a.atkDark || 0) === 0);
  });
  const mixed = bosses.filter(b => {
    return b.attacks.some(a => (a.atkMag || 0) > 0 || (a.atkFire || 0) > 0 || (a.atkThun || 0) > 0 || (a.atkDark || 0) > 0);
  });

  lines.push('### Damage Profile Summary');
  lines.push('');
  lines.push(`- **Pure physical bosses**: ${purePhys.length} (${pct(purePhys.length / bosses.length)})`);
  lines.push(`- **Bosses with elemental attacks**: ${mixed.length} (${pct(mixed.length / bosses.length)})`);
  lines.push(`- **Bosses with no attack data**: ${bosses.filter(b => b.attacks.length === 0).length}`);
  lines.push('');

  // Defense stat analysis
  lines.push('### Defense Stat Distribution');
  lines.push('');
  lines.push('| Stat | Mean | Median | Min | Max |');
  lines.push('|------|------|--------|-----|-----|');
  const defKeys = ['physical', 'slash', 'blow', 'thrust', 'magic', 'fire', 'lightning', 'holy'];
  for (const key of defKeys) {
    const vals = bosses.map(b => b.defense[key] || 0);
    lines.push(`| ${key.charAt(0).toUpperCase() + key.slice(1)} DEF | ${fmtDec(mean(vals))} | ${median(vals)} | ${Math.min(...vals)} | ${Math.max(...vals)} |`);
  }
  lines.push('');

  return lines.join('\n');
}

// ─── 8. NG+ SCALING SUMMARY ────────────────────────────
function analyzeNGScaling() {
  const lines = [];
  lines.push('## 8. NG+ Scaling Reference');
  lines.push('');
  lines.push('How boss stats scale across New Game cycles:');
  lines.push('');

  const scaling = ngData.scaling;
  const keys = [
    { key: 'maxHp', label: 'HP' },
    { key: 'physAtk', label: 'Phys ATK' },
    { key: 'magAtk', label: 'Magic ATK' },
    { key: 'physDef', label: 'Phys DEF' },
    { key: 'magDef', label: 'Magic DEF' },
    { key: 'soulRate', label: 'Rune Reward' },
    { key: 'staminaAtk', label: 'Stamina ATK' },
    { key: 'poiseDmg', label: 'Poise DMG' },
  ];

  const headers = ['Stat', ...scaling.map((s, i) => i === 0 ? 'NG' : `NG+${i}`)];
  lines.push('| ' + headers.join(' | ') + ' |');
  lines.push('| ' + headers.map(() => '---').join(' | ') + ' |');

  for (const k of keys) {
    const row = [k.label, ...scaling.map(s => fmtDec(s[k.key] || 1, 2) + 'x')];
    lines.push('| ' + row.join(' | ') + ' |');
  }
  lines.push('');

  // Example scaled values for key bosses
  lines.push('### Example: Key Boss Stats at NG+7');
  lines.push('');
  const ng7 = scaling[7];
  const keyBosses = ['Malenia, Blade of Miquella', 'Starscourge Radahn', 'Radagon of the Erdtree', 'Promised Consort Radahn', 'Mohg, Lord of Blood'];

  lines.push('| Boss | Base HP | NG+7 HP | Base Runes | NG+7 Runes |');
  lines.push('|------|---------|---------|------------|------------|');
  for (const name of keyBosses) {
    const b = bosses.find(b => b.name === name);
    if (!b) continue;
    lines.push(`| ${b.name} | ${fmt(b.hp)} | ${fmt(Math.floor(b.hp * ng7.maxHp))} | ${fmt(b.runeReward)} | ${fmt(Math.floor(b.runeReward * ng7.soulRate))} |`);
  }
  lines.push('');

  return lines.join('\n');
}

// ─── ASSEMBLE REPORT ────────────────────────────────────
const timestamp = new Date().toISOString().split('T')[0];

const report = `# Elden Ring Boss Design Bible

> Statistical analysis of ${bosses.length} bosses from datamined game parameters.
> Generated ${timestamp} from \`enemies.json\` (${fmt(data.metadata.totalAttacks)} total attacks across ${data.metadata.totalEnemies} enemies).

---

${analyzeHPByProgression()}

---

${analyzeAttackCounts()}

---

${analyzeDamageTypes()}

---

${analyzePoiseThresholds()}

---

${analyzeAttackDamage()}

---

${analyzeResistances()}

---

${analyzeOutliers()}

---

${analyzeNGScaling()}
`;

const outPath = path.resolve('C:/Users/mhbro/OneDrive/Desktop/Ember Throne/Boss Design Bible.md');
fs.writeFileSync(outPath, report, 'utf-8');
console.log(`Report written to: ${outPath}`);
console.log(`Report size: ${(Buffer.byteLength(report, 'utf-8') / 1024).toFixed(1)} KB`);
console.log(`Sections: 8`);
