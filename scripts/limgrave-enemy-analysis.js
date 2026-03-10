const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data/enemies.json'), 'utf-8'));

// ─── UTILITY ──────────────────────────────────────────────
function fmt(n) { return typeof n === 'number' ? n.toLocaleString('en-US') : n; }
function pct(n, d = 1) { return (n * 100).toFixed(d) + '%'; }
function fmtDec(n, d = 1) { return n.toFixed(d); }
function padR(s, n) { return String(s).padEnd(n); }
function padL(s, n) { return String(s).padStart(n); }

// ─── SPELL ATTRIBUTE MAPPING ──────────────────────────────
const SP_ATTR_LABELS = {
  0: 'None',
  10: 'Magic',
  11: 'Fire',
  12: 'Lightning',
  13: 'Holy',
  20: 'Gravity',
  21: 'Scarlet Rot',
  22: 'Frost',
  23: 'Destined Death',
  24: 'Blood',
  25: 'Madness',
  26: 'Frost/Blight',
  254: 'Perfume',
};

// spAttribute values that indicate an elemental buff variant
const ELEMENTAL_SP_ATTRS = new Set([10, 11, 12, 13, 20, 21, 22, 23, 24, 25, 26, 254]);

// ─── CONCEPTUAL ATTACK COLLAPSING ─────────────────────────
// Group attacks by their conceptual identity:
// Same attack = same type + radius + knockback + dmgLevel with different spAttribute
// Also collapse directional variants and multi-hit combo parts
function collapseAttacks(attacks) {
  if (!attacks || attacks.length === 0) return { conceptual: [], rawCount: 0 };

  // Step 1: Group by core signature (type + radius + knockback + dmgLevel)
  // This groups elemental variants together
  const groups = {};
  attacks.forEach(a => {
    const key = `${a.type}|${a.hitRadius}|${a.knockback}|${a.dmgLevel}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });

  // Step 2: Within each group, find the "base" (spAttribute=0) version if it exists,
  // otherwise use the first entry. Note elemental variants.
  const conceptualRaw = [];
  for (const [key, group] of Object.entries(groups)) {
    const base = group.find(a => a.spAttribute === 0) || group[0];
    const elemVariants = [...new Set(group.filter(a => a.spAttribute !== 0).map(a => SP_ATTR_LABELS[a.spAttribute] || `sp${a.spAttribute}`))];

    conceptualRaw.push({
      name: base.name || '(unnamed)',
      atkPhys: base.atkPhys,
      atkMag: base.atkMag,
      atkFire: base.atkFire,
      atkThun: base.atkThun,
      atkDark: base.atkDark,
      type: base.type,
      hitRadius: base.hitRadius,
      knockback: base.knockback,
      dmgLevel: base.dmgLevel,
      poiseDamage: base.poiseDamage,
      atkStam: base.atkStam,
      spAttribute: base.spAttribute,
      elementalVariants: elemVariants,
      rawVariantCount: group.length,
    });
  }

  // Step 3: Further collapse by name patterns (directional variants, combo parts)
  // Group by cleaned name (remove directional prefixes, combo numbers)
  const nameGroups = {};
  conceptualRaw.forEach(a => {
    // Clean the name: remove [Enemy Name] prefix, trim
    let cleanName = a.name.replace(/\[.*?\]\s*/, '').trim();
    // Remove directional variants: Left/Right, L/R at end
    cleanName = cleanName.replace(/\s*(Left|Right|L|R)\s*$/i, '');
    // Remove combo numbers like " 1", " 2", " 3" at end
    cleanName = cleanName.replace(/\s+\d+\s*$/, '');
    // Remove trailing whitespace
    cleanName = cleanName.trim();
    // If empty after cleaning, use the original
    if (!cleanName) cleanName = a.name.replace(/\[.*?\]\s*/, '').trim() || '(unnamed)';

    const nameKey = `${cleanName}|${a.type}`;
    if (!nameGroups[nameKey]) nameGroups[nameKey] = [];
    nameGroups[nameKey].push(a);
  });

  // Step 4: From name groups, produce final conceptual attacks
  const conceptual = [];
  for (const [nameKey, group] of Object.entries(nameGroups)) {
    // Pick the highest-damage variant as representative
    const rep = group.reduce((best, a) => (a.atkPhys > best.atkPhys ? a : best), group[0]);
    const allElemVariants = [...new Set(group.flatMap(a => a.elementalVariants))];
    const comboHits = group.length > 1 ? group.length : 0;
    const totalRawVariants = group.reduce((s, a) => s + a.rawVariantCount, 0);

    conceptual.push({
      ...rep,
      elementalVariants: allElemVariants,
      comboHits: comboHits,
      totalRawVariants: totalRawVariants,
    });
  }

  return { conceptual, rawCount: attacks.length };
}

// ─── FORMAT ABSORPTION ────────────────────────────────────
// absorption values: < 1.0 = resistant, 1.0 = neutral, > 1.0 = weak
function formatAbsorption(absorption) {
  if (!absorption) return '  (No absorption data)';
  const lines = [];
  const types = [
    { key: 'physical', label: 'Physical' },
    { key: 'slash', label: 'Slash' },
    { key: 'blow', label: 'Strike' },
    { key: 'thrust', label: 'Thrust' },
    { key: 'magic', label: 'Magic' },
    { key: 'fire', label: 'Fire' },
    { key: 'lightning', label: 'Lightning' },
    { key: 'holy', label: 'Holy' },
  ];
  for (const t of types) {
    const val = absorption[t.key];
    if (val === undefined || val === null) continue;
    const dmgMult = val;
    const reduction = ((1 - dmgMult) * 100).toFixed(1);
    let note = '';
    if (dmgMult < 0.8) note = ' [STRONG RESIST]';
    else if (dmgMult < 1.0) note = ' [Resist]';
    else if (dmgMult > 1.2) note = ' [WEAK]';
    else if (dmgMult > 1.0) note = ' [Weak]';
    lines.push(`    ${padR(t.label + ':', 12)} ${dmgMult.toFixed(2)}x (${reduction}% reduction)${note}`);
  }
  return lines.join('\n');
}

// ─── FORMAT RESISTANCES ───────────────────────────────────
function formatResistances(resistances) {
  if (!resistances) return '  (No resistance data)';
  const lines = [];
  const types = [
    { key: 'poison', label: 'Poison' },
    { key: 'scarletRot', label: 'Scarlet Rot' },
    { key: 'hemorrhage', label: 'Hemorrhage' },
    { key: 'frost', label: 'Frostbite' },
    { key: 'sleep', label: 'Sleep' },
    { key: 'madness', label: 'Madness' },
    { key: 'deathBlight', label: 'Death Blight' },
  ];
  for (const t of types) {
    const val = resistances[t.key];
    if (val === undefined || val === null) continue;
    const note = val >= 999 ? ' [IMMUNE]' : '';
    lines.push(`    ${padR(t.label + ':', 14)} ${val}${note}`);
  }
  return lines.join('\n');
}

// ─── FORMAT SINGLE ENEMY ──────────────────────────────────
function formatEnemy(enemy, note) {
  const { conceptual, rawCount } = collapseAttacks(enemy.attacks);
  const lines = [];

  lines.push(`  ── ${enemy.name} ──`);
  if (note) lines.push(`  Note: ${note}`);
  lines.push(`  JSON Name: "${enemy.name}" | ID: ${enemy.id}`);
  lines.push(`  HP: ${fmt(enemy.hp)} | Poise: ${enemy.poise}`);
  lines.push(`  Total Behavior Count (raw): ${rawCount}`);
  lines.push(`  Unique Conceptual Attacks: ${conceptual.length}`);
  lines.push('');

  // Attack Summary
  if (conceptual.length > 0) {
    lines.push('  Attack Summary:');
    conceptual.forEach((a, i) => {
      const dmgParts = [];
      if (a.atkPhys > 0) dmgParts.push(`Phys:${a.atkPhys}`);
      if (a.atkMag > 0) dmgParts.push(`Mag:${a.atkMag}`);
      if (a.atkFire > 0) dmgParts.push(`Fire:${a.atkFire}`);
      if (a.atkThun > 0) dmgParts.push(`Ltn:${a.atkThun}`);
      if (a.atkDark > 0) dmgParts.push(`Holy:${a.atkDark}`);

      const extras = [];
      if (a.elementalVariants.length > 0) extras.push(`Elem variants: ${a.elementalVariants.join(', ')}`);
      if (a.comboHits > 0) extras.push(`${a.comboHits}-part combo`);
      const spLabel = a.spAttribute !== 0 ? ` [${SP_ATTR_LABELS[a.spAttribute] || 'sp' + a.spAttribute}]` : '';

      lines.push(`    ${i + 1}. ${a.name}${spLabel}`);
      lines.push(`       Damage: ${dmgParts.join(', ') || 'None'} | Type: ${a.type} | Radius: ${fmtDec(a.hitRadius, 2)} | KB: ${fmtDec(a.knockback, 2)} | DmgLvl: ${a.dmgLevel}`);
      if (extras.length > 0) lines.push(`       ${extras.join(' | ')}`);
    });
    lines.push('');
  } else {
    lines.push('  Attack Summary: No attack data in dataset');
    lines.push('');
  }

  // Defense/Absorption Profile
  lines.push('  Defense/Absorption Profile (DamageCutRate):');
  lines.push(formatAbsorption(enemy.absorption));
  lines.push('');

  // Status Effect Resistances
  lines.push('  Status Effect Resistances:');
  lines.push(formatResistances(enemy.resistances));
  lines.push('');

  // Flat Defense
  lines.push(`  Flat Defense: ${enemy.flatDefense}`);
  lines.push('');

  return { text: lines.join('\n'), conceptualCount: conceptual.length, conceptual };
}

// ─── ENEMY LOOKUP HELPERS ─────────────────────────────────
const allEnemies = data.enemies;
const nonBosses = allEnemies.filter(e => !e.isBoss);

function findNonBoss(name) {
  return nonBosses.find(e => e.name === name);
}
function findNonBosses(name) {
  return nonBosses.filter(e => e.name === name);
}
function findByPartial(term) {
  return nonBosses.filter(e => e.name.toLowerCase().includes(term.toLowerCase()));
}
// For enemies that are boss-flagged but represent field encounters (like wolves)
function findBoss(name) {
  return allEnemies.find(e => e.isBoss && e.name === name);
}
function findLowestHP(name) {
  const matches = allEnemies.filter(e => e.name === name);
  if (matches.length === 0) return null;
  return matches.reduce((a, b) => a.hp < b.hp ? a : b);
}

// ─── DEFINE LIMGRAVE ENEMIES BY SUB-REGION ────────────────

function getEnemyEntry(name, dataName, note, bossOk) {
  let enemy = findNonBoss(dataName);
  if (!enemy && bossOk) {
    // Some field enemies are tagged as boss in the data (wolves, strays)
    enemy = findLowestHP(dataName);
    if (enemy) note = (note ? note + '. ' : '') + 'NOTE: Tagged as boss in dataset — using lowest-HP variant as field enemy proxy';
  }
  if (!enemy) {
    return { name, note: note || '', missing: true };
  }
  return { name, dataName: enemy.name, enemy, note: note || '', missing: false };
}

const SECTIONS = [
  {
    title: 'SECTION 1: WEST LIMGRAVE',
    subtitle: '(Gatefront, Church of Elleh, Agheel Lake South, Waypoint Ruins area)',
    enemies: [
      getEnemyEntry('Godrick Soldier', 'Godrick Soldier', 'Covers sword, spear variants. Named "Castle Soldier" in attack data'),
      getEnemyEntry('Godrick Foot Soldier', 'Godrick Foot Soldier', 'Bow, torch, crossbow variants'),
      getEnemyEntry('Godrick Knight', 'Godrick Knight', 'Mounted (horse) and dismounted. Sword, spear variants with elemental buffs'),
      getEnemyEntry("Godrick Knight's Horse", "Godrick Knight's Horse", 'The horse mount for Godrick Knights'),
      getEnemyEntry('Wandering Noble', 'Wandering Noble', 'Common fodder enemy throughout Limgrave'),
      getEnemyEntry('Wolf', 'Wolf', 'Field wolves (Agheel Lake, Gatefront). Also found in Stormhill, dungeons', true),
      getEnemyEntry('Large Stray (Wild Dog)', 'Large Stray', 'Wild dogs. Also found at Waypoint Ruins, roads'),
      getEnemyEntry('Boar', 'Boar', 'Wild boars near forests and roads'),
      getEnemyEntry('Goat', 'Goat', 'Passive/semi-passive wildlife'),
      getEnemyEntry('Deer', 'Deer', 'Passive wildlife — flees from player'),
      getEnemyEntry('Ram', 'Ram', 'Found in fields. Giant Ram variant also exists'),
      getEnemyEntry('Giant Rat', 'Giant Rat', 'Found in tunnels and near ruins'),
      getEnemyEntry('Kaiden Sellsword', 'Kaiden Sellsword', 'Mounted warriors at Agheel Lake North camps. Also Stormhill'),
      getEnemyEntry('Horse (Kaiden mount)', 'Horse', 'Kaiden Sellsword horse mount'),
      getEnemyEntry('Demi-Human (Large)', 'Demi-Human (Large)', 'Coastal Cave area, also Waypoint Ruins cellar'),
      getEnemyEntry('Demi-Human Shaman', 'Demi-Human Shaman', 'Spellcaster variant found in Coastal Cave'),
      getEnemyEntry('Land Squirt', 'Land Squirt', 'Poison-spitting plants near lakes'),
      getEnemyEntry('Giant Land Squirt', 'Giant Land Squirt', 'Large variant near Agheel Lake'),
      getEnemyEntry('Eagle', 'Eagle', 'Flying above Limgrave — passive/ambient'),
    ],
  },
  {
    title: 'SECTION 2: EAST LIMGRAVE',
    subtitle: '(Mistwood, Siofra River Well area, Fort Haight)',
    enemies: [
      getEnemyEntry('Runebear', 'Runebear', 'Found in Mistwood. Major field threat', true),
      getEnemyEntry('Demi-Human (Large) [Mistwood]', 'Demi-Human (Large)', 'Same type as West Limgrave — see Section 1 for full data'),
      getEnemyEntry('Miranda Sprout', 'Miranda Sprout', 'Giant Poison Flowers — found near Mistwood edges'),
      getEnemyEntry('Catacomb Skeleton', 'Catacomb Skeleton', 'Skeletal Militiaman equivalent. Sword and shield skeletons'),
      getEnemyEntry('Skeleton (Sword and Shield)', 'Skeleton (Sword and Shield)', 'Found at various ruins and catacombs'),
      getEnemyEntry('Catacombs Sorcerer', 'Catacombs Sorcerer', 'Skeleton Mage equivalent'),
      getEnemyEntry('Large Skeleton (Spear)', 'Large Skeleton (Spear)', 'Skeletal Bandit equivalent'),
      getEnemyEntry('Living Jar', 'Living Jar', 'Small living jar found near roads'),
      getEnemyEntry('Living Jar Warrior', 'Living Jar Warrior', 'Larger, more aggressive jar warrior'),
    ],
  },
  {
    title: 'SECTION 3: AGHEEL LAKE & SHORELINE',
    subtitle: '(Agheel Lake, Dragon-Burnt Ruins, Seaside Ruins, coastal areas)',
    enemies: [
      getEnemyEntry('Giant Crab', 'Giant Crab', 'Found in shallow water at Agheel Lake'),
      getEnemyEntry('Crab (Small)', 'Crab', 'Small crabs on shoreline'),
      getEnemyEntry('Small Land Octopus', 'Small Land Octopus', 'Found along coast and at Agheel Lake'),
      getEnemyEntry('Giant Land Octopus', 'Giant Land Octopus', 'Massive octopus — also found in Highroad Cave'),
      getEnemyEntry('Slug (Skeletal Slime)', 'Slug', 'Slug/slime enemies near water. "Skeletal Slime" may not be in dataset under that name'),
      getEnemyEntry('Dragonfly', 'Dragonfly', 'Small ambient dragonflies'),
      getEnemyEntry('Great Dragonfly (Giant)', 'Great Dragonfly', 'Giant dragonfly variant'),
      getEnemyEntry('Guillemot', 'Murre', 'Seabird — called "Murre" in game data. Passive wildlife'),
      getEnemyEntry('Turtle', 'Turtle', 'Dog. Passive wildlife near lakes and churches'),
      getEnemyEntry('Spirit Jellyfish', 'Spirit Jellyfish', 'Found at Stormhill Shack area at night'),
    ],
  },
  {
    title: 'SECTION 4: STORMHILL',
    subtitle: '(Northern Limgrave, approach to Stormveil Castle)',
    enemies: [
      getEnemyEntry('Godrick Soldier [Stormhill]', 'Godrick Soldier', 'Same as Section 1 — Stormhill camp variants'),
      getEnemyEntry('Godrick Knight [Stormhill]', 'Godrick Knight', 'Same as Section 1 — mounted patrols on Stormhill'),
      getEnemyEntry('Kaiden Sellsword [Stormhill]', 'Kaiden Sellsword', 'Same as Section 1 — Stormhill camp encounters'),
      getEnemyEntry('Wolf [Stormhill]', 'Wolf', 'Same as Section 1 — packs near Stormhill Shack', true),
      getEnemyEntry('Giant Ram', 'Giant Ram', 'Rolling rams on Stormhill road'),
      getEnemyEntry('Man-Bat (Giant Bat)', 'Man-Bat', 'Flying bat enemies at night and in caves'),
      getEnemyEntry('Crimson Tear Scarab', 'Crimson Tear Scarab', 'Teardrop Scarab — runs from player, drops flask charge'),
      getEnemyEntry('Scarab', 'Scarab', 'Generic scarab — runs from player'),
    ],
  },
  {
    title: 'SECTION 5: STORMVEIL CASTLE',
    subtitle: '(Interior and ramparts of Stormveil Castle)',
    enemies: [
      getEnemyEntry('Exile Soldier', 'Exile Soldier', 'Castle defenders — sword variants'),
      getEnemyEntry('Large Exile Soldier', 'Large Exile Soldier', 'Larger, more heavily-armed exile soldiers'),
      getEnemyEntry('Banished Knight', 'Banished Knight', 'Elite castle enemies — multiple weapon variants'),
      getEnemyEntry('Commoner', 'Commoner', 'Castle servants — HP:105 variant is the basic one'),
      getEnemyEntry('Commoner (Pot)', 'Commoner (Pot)', 'Servants throwing pots'),
      getEnemyEntry('Warhawk (Stormhawk)', 'Warhawk', 'Blade Eagles — Stormhawk enemies with blade-attached talons'),
      getEnemyEntry('Gravebird', 'Gravebird', 'Flying undead birds in castle areas'),
      getEnemyEntry('Grafted Scion', 'Grafted Scion (Unscaled)', 'Multi-limbed grafted horror. Only boss version in data', true),
      getEnemyEntry('Omen', 'Omen', 'Horned cursed creature in castle depths. Only boss version in data', true),
      getEnemyEntry('Operatic Bat (Chanting Winged Dame)', 'Operatic Bat', 'Singing bat creature in castle interiors'),
      getEnemyEntry('Man-Bat [Castle Interior]', 'Man-Bat', 'Same as Section 4 — found in dark castle corridors'),
      getEnemyEntry('Living Jar [Stormveil]', 'Living Jar', 'Same as Section 2 — found in castle areas'),
    ],
  },
  {
    title: 'SECTION 6: LIMGRAVE DUNGEONS',
    subtitle: '(Grouped by dungeon)',
    subsections: [
      {
        subtitle: 'Limgrave Tunnels',
        enemies: [
          getEnemyEntry('Glintstone Digger (Small)', 'Glintstone Digger', 'Miners in Limgrave Tunnels — HP:70 variant (small)'),
          // Second variant
        ],
      },
      {
        subtitle: 'Stormfoot Catacombs',
        enemies: [
          getEnemyEntry('Imp (Fanged Imp)', 'Imp (Lion Head)', 'Fanged Imps — lion-headed variant with melee attacks'),
        ],
      },
      {
        subtitle: 'Murkwater Cave',
        enemies: [
          // Highwaymen not in dataset
          { name: 'Highwayman', note: 'Not in dataset — may be categorized under a different name or share data with another enemy type (possibly Godrick Foot Soldier or similar). The Murkwater Cave enemies are generically-armed bandits.', missing: true },
        ],
      },
      {
        subtitle: 'Murkwater Catacombs',
        enemies: [
          getEnemyEntry('Imp (Fanged Imp) [Murkwater]', 'Imp (Lion Head)', 'Same as Stormfoot Catacombs — see above'),
          getEnemyEntry('Catacomb Skeleton [Murkwater]', 'Catacomb Skeleton', 'Same as Section 2 — see above'),
        ],
      },
      {
        subtitle: 'Deathtouched Catacombs',
        enemies: [
          getEnemyEntry('Skeleton (Sword and Shield) [Deathtouched]', 'Skeleton (Sword and Shield)', 'Same as Section 2'),
          getEnemyEntry('Large Skeleton (Spear) [Deathtouched]', 'Large Skeleton (Spear)', 'Same as Section 2'),
        ],
      },
      {
        subtitle: 'Coastal Cave',
        enemies: [
          getEnemyEntry('Demi-Human (Large) [Coastal]', 'Demi-Human (Large)', 'Same as Section 1'),
          getEnemyEntry('Demi-Human Shaman [Coastal]', 'Demi-Human Shaman', 'Same as Section 1'),
        ],
      },
      {
        subtitle: 'Highroad Cave',
        enemies: [
          getEnemyEntry('Wolf [Highroad]', 'Wolf', 'Same as Section 1', true),
          getEnemyEntry('Man-Bat [Highroad]', 'Man-Bat', 'Same as Section 4'),
          getEnemyEntry('Giant Land Octopus [Highroad]', 'Giant Land Octopus', 'Same as Section 3'),
        ],
      },
      {
        subtitle: 'Groveside Cave',
        enemies: [
          getEnemyEntry('Wolf [Groveside]', 'Wolf', 'Same as Section 1 — uses same data entry', true),
        ],
      },
      {
        subtitle: 'Waypoint Ruins Cellar',
        enemies: [
          getEnemyEntry('Wandering Noble [Waypoint]', 'Wandering Noble', 'Same as Section 1'),
        ],
      },
    ],
  },
];

// ─── GENERATE OUTPUT ──────────────────────────────────────

const output = [];
const allEntries = []; // For summary table

output.push('================================================================================');
output.push('  LIMGRAVE NON-BOSS ENEMY DATA — ELDEN RING ANALYZER');
output.push('  Datamined Combat Data Extraction');
output.push(`  Generated: ${new Date().toISOString().split('T')[0]}`);
output.push(`  Source: enemies.json (${data.metadata.totalEnemies} total enemies, ${data.metadata.totalAttacks} total attacks)`);
output.push('================================================================================');
output.push('');
output.push('METHODOLOGY NOTES:');
output.push('─────────────────');
output.push('1. All data extracted from the ER Analyzer enemies.json datamined dataset.');
output.push('2. "Unique Conceptual Attacks" are collapsed from raw behavior entries using:');
output.push('   - Elemental buff variants (Fire/Magic/Lightning/Holy versions of same animation)');
output.push('     count as 1 attack with noted elemental variants.');
output.push('   - Directional variants (Left/Right) of the same move count as 1 attack.');
output.push('   - Multi-hit combo parts count as 1 attack with noted hit count.');
output.push('3. Absorption values: < 1.0 = resistant (takes less damage), 1.0 = neutral,');
output.push('   > 1.0 = weak (takes more damage). Shown as multiplier and % reduction.');
output.push('4. spAttribute on attacks indicates elemental/status effects:');
output.push('   0=None, 10=Magic, 11=Fire, 12=Lightning, 13=Holy, 21=Rot, 22=Frost,');
output.push('   24=Blood, 25=Madness');
output.push('5. Some enemies (Wolf, Stray, Runebear, Omen, Grafted Scion) are tagged as boss');
output.push('   in the dataset despite also appearing as field enemies. For these, the lowest-HP');
output.push('   variant is used as a proxy for the field version, and this is noted.');
output.push('6. Enemies appearing in multiple sub-regions are fully detailed in their primary');
output.push('   location and cross-referenced in subsequent sections.');
output.push('');
output.push('');

// Track which enemies have been fully detailed (for cross-references)
const detailedEnemies = new Set();

for (const section of SECTIONS) {
  output.push('================================================================================');
  output.push(`  ${section.title}`);
  output.push(`  ${section.subtitle}`);
  output.push('================================================================================');
  output.push('');

  const enemyList = section.subsections ? null : section.enemies;

  if (section.subsections) {
    for (const sub of section.subsections) {
      output.push(`  ─── ${sub.subtitle} ───`);
      output.push('');
      processEnemyList(sub.enemies, section.title);
      output.push('');
    }
  } else {
    processEnemyList(enemyList, section.title);
  }

  output.push('');
}

function processEnemyList(enemies, sectionTitle) {
  for (const entry of enemies) {
    if (entry.missing) {
      output.push(`  ── ${entry.name} ──`);
      output.push(`  NOT IN DATASET — ${entry.note || 'Passive/ambient creature with no combat data'}`);
      output.push('');
      allEntries.push({
        name: entry.name,
        section: sectionTitle,
        hp: '—',
        poise: '—',
        uniqueAttacks: '—',
        primaryDmgType: '—',
        resistances: '—',
        specialEffects: '—',
        tier: 'N/A',
      });
      continue;
    }

    const dataKey = entry.enemy.name + '|' + entry.enemy.id;
    if (detailedEnemies.has(dataKey)) {
      output.push(`  ── ${entry.name} ──`);
      output.push(`  Cross-reference: Same data as "${entry.enemy.name}" — see primary listing above.`);
      if (entry.note) output.push(`  Note: ${entry.note}`);
      output.push('');
      continue;
    }

    detailedEnemies.add(dataKey);
    const result = formatEnemy(entry.enemy, entry.note);
    output.push(result.text);

    // Determine tier and primary damage type for summary
    let tier = 'Fodder';
    if (entry.enemy.hp >= 1000) tier = 'Mini-boss equivalent';
    else if (entry.enemy.hp >= 400) tier = 'Elite';
    else if (entry.enemy.hp >= 150) tier = 'Standard';

    let primaryDmgType = '—';
    if (result.conceptual.length > 0) {
      const typeCounts = {};
      result.conceptual.forEach(a => { typeCounts[a.type] = (typeCounts[a.type] || 0) + 1; });
      primaryDmgType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0];
    }

    // Notable resistances
    const absorption = entry.enemy.absorption;
    const notableResist = [];
    if (absorption) {
      if (absorption.physical < 0.9) notableResist.push('Phys');
      if (absorption.magic < 0.9) notableResist.push('Magic');
      if (absorption.fire < 0.9) notableResist.push('Fire');
      if (absorption.lightning < 0.9) notableResist.push('Ltn');
      if (absorption.holy < 0.9) notableResist.push('Holy');
    }
    const weaknesses = [];
    if (absorption) {
      if (absorption.physical > 1.1) weaknesses.push('Phys');
      if (absorption.magic > 1.1) weaknesses.push('Magic');
      if (absorption.fire > 1.1) weaknesses.push('Fire');
      if (absorption.lightning > 1.1) weaknesses.push('Ltn');
      if (absorption.holy > 1.1) weaknesses.push('Holy');
    }

    // Special effects
    const specialEffects = [];
    const resistances = entry.enemy.resistances;
    if (resistances) {
      if (resistances.poison < 999) specialEffects.push('Vulnerable:Poison');
      if (resistances.hemorrhage < 999) specialEffects.push('Vulnerable:Bleed');
      if (resistances.frost < 999) specialEffects.push('Vulnerable:Frost');
      if (resistances.scarletRot < 999) specialEffects.push('Vulnerable:Rot');
    }
    // Check if attacks have special spAttributes
    const attackSpecials = [];
    if (result.conceptual) {
      result.conceptual.forEach(a => {
        a.elementalVariants.forEach(v => {
          if (!attackSpecials.includes(v)) attackSpecials.push(v);
        });
        if (a.spAttribute !== 0) {
          const label = SP_ATTR_LABELS[a.spAttribute] || 'sp' + a.spAttribute;
          if (!attackSpecials.includes(label)) attackSpecials.push(label);
        }
      });
    }

    allEntries.push({
      name: entry.name,
      section: sectionTitle,
      hp: entry.enemy.hp,
      poise: entry.enemy.poise,
      uniqueAttacks: result.conceptualCount,
      primaryDmgType,
      resistances: notableResist.length > 0 ? notableResist.join(', ') : '—',
      weaknesses: weaknesses.length > 0 ? weaknesses.join(', ') : '—',
      specialEffects: attackSpecials.length > 0 ? attackSpecials.join(', ') : '—',
      tier,
    });
  }
}

// ─── MASTER SUMMARY TABLE ─────────────────────────────────
output.push('================================================================================');
output.push('  MASTER SUMMARY TABLE');
output.push('================================================================================');
output.push('');

// Build table
const validEntries = allEntries.filter(e => e.hp !== '—');
const col = {
  name: 35,
  section: 20,
  hp: 6,
  poise: 6,
  attacks: 8,
  dmgType: 10,
  resist: 20,
  special: 25,
};

output.push(`| ${padR('Enemy', col.name)} | ${padR('Sub-Region', col.section)} | ${padL('HP', col.hp)} | ${padL('Poise', col.poise)} | ${padL('Uniq Atk', col.attacks)} | ${padR('Prim. Dmg', col.dmgType)} | ${padR('Notable Resists', col.resist)} | ${padR('Special Effects', col.special)} |`);
output.push(`|${'-'.repeat(col.name + 2)}|${'-'.repeat(col.section + 2)}|${'-'.repeat(col.hp + 2)}|${'-'.repeat(col.poise + 2)}|${'-'.repeat(col.attacks + 2)}|${'-'.repeat(col.dmgType + 2)}|${'-'.repeat(col.resist + 2)}|${'-'.repeat(col.special + 2)}|`);

for (const e of allEntries) {
  output.push(`| ${padR(e.name, col.name)} | ${padR(e.section.replace(/SECTION \d+: /, ''), col.section)} | ${padL(String(e.hp), col.hp)} | ${padL(String(e.poise), col.poise)} | ${padL(String(e.uniqueAttacks), col.attacks)} | ${padR(e.primaryDmgType, col.dmgType)} | ${padR(e.resistances, col.resist)} | ${padR(e.specialEffects, col.special)} |`);
}

output.push('');
output.push('');

// ─── COMPARISON METRICS ───────────────────────────────────
output.push('================================================================================');
output.push('  COMPARISON METRICS');
output.push('================================================================================');
output.push('');

// Group by tier
const tiers = {};
for (const e of validEntries) {
  if (!tiers[e.tier]) tiers[e.tier] = [];
  tiers[e.tier].push(e);
}

output.push('1. AVERAGE UNIQUE ATTACK COUNT BY ENEMY TIER');
output.push('─────────────────────────────────────────────');
output.push('');
output.push(`| ${padR('Tier', 25)} | ${padL('Count', 6)} | ${padL('Avg Attacks', 12)} | ${padL('Min Attacks', 12)} | ${padL('Max Attacks', 12)} |`);
output.push(`|${'-'.repeat(27)}|${'-'.repeat(8)}|${'-'.repeat(14)}|${'-'.repeat(14)}|${'-'.repeat(14)}|`);

for (const [tier, entries] of Object.entries(tiers)) {
  const attacks = entries.map(e => e.uniqueAttacks).filter(a => typeof a === 'number');
  if (attacks.length === 0) continue;
  const avg = attacks.reduce((a, b) => a + b, 0) / attacks.length;
  output.push(`| ${padR(tier, 25)} | ${padL(entries.length, 6)} | ${padL(fmtDec(avg), 12)} | ${padL(Math.min(...attacks), 12)} | ${padL(Math.max(...attacks), 12)} |`);
}
output.push('');

output.push('2. HP RANGE BY TIER');
output.push('───────────────────');
output.push('');
output.push(`| ${padR('Tier', 25)} | ${padL('Min HP', 8)} | ${padL('Avg HP', 8)} | ${padL('Max HP', 8)} |`);
output.push(`|${'-'.repeat(27)}|${'-'.repeat(10)}|${'-'.repeat(10)}|${'-'.repeat(10)}|`);

for (const [tier, entries] of Object.entries(tiers)) {
  const hps = entries.map(e => e.hp).filter(h => typeof h === 'number');
  if (hps.length === 0) continue;
  const avg = hps.reduce((a, b) => a + b, 0) / hps.length;
  output.push(`| ${padR(tier, 25)} | ${padL(Math.min(...hps), 8)} | ${padL(Math.round(avg), 8)} | ${padL(Math.max(...hps), 8)} |`);
}
output.push('');

output.push('3. POISE RANGE BY TIER');
output.push('──────────────────────');
output.push('');
output.push(`| ${padR('Tier', 25)} | ${padL('Min Poise', 10)} | ${padL('Avg Poise', 10)} | ${padL('Max Poise', 10)} |`);
output.push(`|${'-'.repeat(27)}|${'-'.repeat(12)}|${'-'.repeat(12)}|${'-'.repeat(12)}|`);

for (const [tier, entries] of Object.entries(tiers)) {
  const poises = entries.map(e => e.poise).filter(p => typeof p === 'number');
  if (poises.length === 0) continue;
  const avg = poises.reduce((a, b) => a + b, 0) / poises.length;
  output.push(`| ${padR(tier, 25)} | ${padL(Math.min(...poises), 10)} | ${padL(fmtDec(avg), 10)} | ${padL(Math.max(...poises), 10)} |`);
}
output.push('');

output.push('4. MOST COMMON DAMAGE TYPES ACROSS ALL LIMGRAVE FIELD ENEMIES');
output.push('──────────────────────────────────────────────────────────────');
output.push('');
const dmgTypeCounts = {};
validEntries.forEach(e => {
  if (e.primaryDmgType && e.primaryDmgType !== '—') {
    dmgTypeCounts[e.primaryDmgType] = (dmgTypeCounts[e.primaryDmgType] || 0) + 1;
  }
});
const sortedDmgTypes = Object.entries(dmgTypeCounts).sort((a, b) => b[1] - a[1]);
for (const [type, count] of sortedDmgTypes) {
  const bar = '█'.repeat(Math.round((count / validEntries.length) * 30));
  output.push(`  ${padR(type, 12)} ${padL(count, 3)} enemies (${pct(count / validEntries.length)}) ${bar}`);
}
output.push('');

output.push('5. MOST COMMON SPECIAL EFFECTS (ON ENEMY ATTACKS)');
output.push('─────────────────────────────────────────────────');
output.push('');
const effectCounts = {};
validEntries.forEach(e => {
  if (e.specialEffects && e.specialEffects !== '—') {
    e.specialEffects.split(', ').forEach(eff => {
      effectCounts[eff] = (effectCounts[eff] || 0) + 1;
    });
  }
});
const sortedEffects = Object.entries(effectCounts).sort((a, b) => b[1] - a[1]);
if (sortedEffects.length > 0) {
  for (const [effect, count] of sortedEffects) {
    output.push(`  ${padR(effect, 20)} ${padL(count, 3)} enemies`);
  }
} else {
  output.push('  Most Limgrave field enemies deal pure physical damage with no special effects.');
}
output.push('');

output.push('6. KEY OBSERVATIONS');
output.push('───────────────────');
output.push('');

// Calculate some insights
const avgHP = validEntries.reduce((s, e) => s + (typeof e.hp === 'number' ? e.hp : 0), 0) / validEntries.length;
const avgPoise = validEntries.reduce((s, e) => s + (typeof e.poise === 'number' ? e.poise : 0), 0) / validEntries.length;
const avgAttacks = validEntries.filter(e => typeof e.uniqueAttacks === 'number').reduce((s, e) => s + e.uniqueAttacks, 0) / validEntries.filter(e => typeof e.uniqueAttacks === 'number').length;

output.push(`  - Average HP across all Limgrave non-boss enemies: ${Math.round(avgHP)}`);
output.push(`  - Average Poise: ${fmtDec(avgPoise)}`);
output.push(`  - Average Unique Conceptual Attacks: ${fmtDec(avgAttacks)}`);
output.push(`  - Total unique enemy types cataloged: ${validEntries.length}`);
output.push(`  - Enemies with no attack data: ${validEntries.filter(e => e.uniqueAttacks === 0).length}`);
output.push(`  - Most complex enemy (highest unique attack count): ${validEntries.filter(e => typeof e.uniqueAttacks === 'number').sort((a, b) => b.uniqueAttacks - a.uniqueAttacks)[0]?.name || '—'}`);
output.push(`  - Tankiest non-boss enemy (highest HP): ${validEntries.sort((a, b) => (typeof b.hp === 'number' ? b.hp : 0) - (typeof a.hp === 'number' ? a.hp : 0))[0]?.name || '—'} (${validEntries.sort((a, b) => (typeof b.hp === 'number' ? b.hp : 0) - (typeof a.hp === 'number' ? a.hp : 0))[0]?.hp || '—'} HP)`);
output.push('');
output.push('================================================================================');
output.push('  END OF LIMGRAVE ENEMY DATA');
output.push('================================================================================');

// Write output
const outPath = path.resolve(__dirname, '../Limgrave_Enemy_Data.txt');
fs.writeFileSync(outPath, output.join('\n'), 'utf-8');
console.log(`Report written to: ${outPath}`);
console.log(`Report size: ${(Buffer.byteLength(output.join('\n'), 'utf-8') / 1024).toFixed(1)} KB`);
console.log(`Total enemies cataloged: ${allEntries.length}`);
console.log(`Unique enemies with full data: ${validEntries.length}`);
