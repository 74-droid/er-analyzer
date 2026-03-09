const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const DATA_DIR = path.resolve(__dirname, '../../ER Data');
const OUT_DIR = path.resolve(__dirname, '../public/data');

function readCSV(filename) {
  const filepath = path.join(DATA_DIR, filename);
  console.log(`  Reading ${filename}...`);
  const raw = fs.readFileSync(filepath, 'utf-8');
  const records = parse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true });
  console.log(`    → ${records.length} rows, ${Object.keys(records[0] || {}).length} columns`);
  return records;
}

function num(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function int(val) {
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

function cleanName(name) {
  if (!name) return '';
  // Replace "- " with ", " (e.g. "Malenia- Blade of Miquella" -> "Malenia, Blade of Miquella")
  let cleaned = name.replace(/- /g, ', ');
  // Remove leading/trailing whitespace
  return cleaned.trim();
}

function extractLocation(gaName) {
  // GameAreaParam names look like "[Stormveil Castle] Godrick the Grafted"
  const match = gaName.match(/^\[([^\]]+)\]\s*(.+)$/);
  if (match) return { location: match[1].replace(/- /g, ', '), bossName: match[2].replace(/- /g, ', ') };
  return { location: '', bossName: gaName.replace(/- /g, ', ') };
}

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Attack attribute decoder
const ATK_TYPES = {
  0: 'Standard', 1: 'Slash', 2: 'Strike', 3: 'Thrust',
  4: 'Standard', 5: 'Slash', 6: 'Strike', 7: 'Thrust',
  8: 'Standard', 9: 'Pierce', 10: 'Standard', 11: 'Standard',
  12: 'Standard', 13: 'Standard', 14: 'Standard', 15: 'Standard'
};

console.log('=== Elden Ring Data Builder ===\n');

// ── 1. Read all CSVs ──────────────────────────────────────
console.log('Step 1: Reading CSV files...');
const npcRows = readCSV('NpcParam.csv');
const behaviorRows = readCSV('BehaviorParam.csv');
const atkRows = readCSV('AtkParam_Npc.csv');
const gameAreaRows = readCSV('GameAreaParam.csv');
const ngRows = readCSV('ClearCountCorrectParam.csv');
const toughnessRows = readCSV('ToughnessParam.csv');

// ── 2. Build lookup maps ──────────────────────────────────
console.log('\nStep 2: Building lookup maps...');

// BehaviorParam: group by variationId, keep only attack refs (refType 0)
const behaviorMap = new Map();
for (const row of behaviorRows) {
  const varId = int(row.variationId);
  const refType = int(row.refType);
  const refId = int(row.refId);
  const judgeId = int(row.behaviorJudgeId);
  if (varId === 0 && judgeId === 0) continue;
  if (!behaviorMap.has(varId)) behaviorMap.set(varId, []);
  behaviorMap.get(varId).push({ judgeId, refType, refId });
}
console.log(`  → ${behaviorMap.size} behavior variation groups`);

// AtkParam_Npc: map by ID
const atkMap = new Map();
for (const row of atkRows) {
  const id = int(row.ID);
  if (id === 0) continue;
  const atkPhys = int(row.atkPhys);
  const atkMag = int(row.atkMag);
  const atkFire = int(row.atkFire);
  const atkThun = int(row.atkThun);
  const atkDark = int(row.atkDark);
  const atkStam = int(row.atkStam);
  const atkSuperArmor = int(row.atkSuperArmor);
  // Skip entries with zero damage across the board (non-damaging behaviors)
  if (atkPhys === 0 && atkMag === 0 && atkFire === 0 && atkThun === 0 && atkDark === 0 && atkSuperArmor === 0) continue;
  atkMap.set(id, {
    name: row.Name || '',
    atkPhys, atkMag, atkFire, atkThun, atkDark, atkStam,
    poiseDamage: atkSuperArmor,
    hitRadius: Math.max(num(row.hit0_Radius), num(row.hit1_Radius), num(row.hit2_Radius), num(row.hit3_Radius)),
    knockback: num(row.knockbackDist),
    atkAttribute: int(row.atkAttribute),
    type: ATK_TYPES[int(row.atkAttribute)] || 'Standard',
    dmgLevel: int(row.dmgLevel),
    spAttribute: int(row.spAttribute)
  });
}
console.log(`  → ${atkMap.size} attack entries (with damage)`);

// GameAreaParam: map boss names to rune rewards and locations
const gameAreaMap = new Map();
const gameAreaList = [];
for (const row of gameAreaRows) {
  const name = row.Name || '';
  if (!name || !name.includes(']')) continue;
  const { location, bossName } = extractLocation(name);
  const normBoss = normalizeName(bossName);
  const entry = {
    location,
    bossName,
    runeReward: int(row.bonusSoul_single),
    runeRewardCoop: int(row.bonusSoul_multi)
  };
  gameAreaMap.set(normBoss, entry);
  gameAreaList.push({ ...entry, id: int(row.ID) });
}
console.log(`  → ${gameAreaMap.size} boss area entries`);

// ── 3. Process NpcParam ───────────────────────────────────
console.log('\nStep 3: Processing enemies...');

const enemies = [];
const seenVariations = new Map(); // behaviorVariationId -> array of entries

for (const row of npcRows) {
  const id = int(row.ID);
  const name = cleanName(row.Name);
  const hp = int(row.hp);

  // Skip unnamed, zero-hp, or dummy entries
  if (!name || hp <= 0) continue;
  if (name === 'Human' || name === 'dummyText') continue;

  const behaviorVariationId = int(row.behaviorVariationId);
  const poise = Math.max(0, int(row.superArmorDurability));
  const getSoul = int(row.getSoul);
  const npcType = int(row.npcType);

  // Build the enemy record
  const enemy = {
    id,
    name,
    hp,
    poise,
    getSoul,
    npcType,
    behaviorVariationId,
    // DamageCutRate values: lower = more resistant, >1 = vulnerable
    // These are the REAL per-enemy damage absorption (flat def_ values are 100/0/0/0 for all NPCs)
    absorption: {
      physical: num(row.neutralDamageCutRate),
      slash: num(row.slashDamageCutRate),
      blow: num(row.blowDamageCutRate),
      thrust: num(row.thrustDamageCutRate),
      magic: num(row.magicDamageCutRate),
      fire: num(row.fireDamageCutRate),
      lightning: num(row.thunderDamageCutRate),
      holy: num(row.darkDamageCutRate)
    },
    flatDefense: int(row.def_phys),
    resistances: {
      poison: int(row.resist_poison),
      scarletRot: int(row.resist_desease),
      hemorrhage: int(row.resist_blood),
      deathBlight: int(row.resist_curse),
      frost: int(row.resist_freeze),
      sleep: int(row.resist_sleep),
      madness: int(row.resist_madness)
    },
    spEffectIds: [
      int(row.spEffectID0), int(row.spEffectID1), int(row.spEffectID2), int(row.spEffectID3),
      int(row.spEffectID4), int(row.spEffectID5), int(row.spEffectID6), int(row.spEffectID7)
    ].filter(id => id !== 0)
  };

  // Look up attacks via BehaviorParam
  const behaviors = behaviorMap.get(behaviorVariationId) || [];
  const attacks = [];
  for (const beh of behaviors) {
    if (beh.refType === 0) {
      // Direct attack reference
      const atk = atkMap.get(beh.refId);
      if (atk) {
        attacks.push({ behaviorId: beh.judgeId, ...atk });
      }
    }
  }
  enemy.attacks = attacks;

  // Try to match to GameAreaParam for rune reward and location
  const normName = normalizeName(name);
  let bestMatch = null;
  let bestScore = 0;
  for (const [gaNorm, gaEntry] of gameAreaMap) {
    // Check if the NPC name is contained in the GameArea boss name or vice versa
    if (gaNorm.includes(normName) || normName.includes(gaNorm)) {
      const score = Math.min(normName.length, gaNorm.length);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = gaEntry;
      }
    }
  }

  if (bestMatch) {
    enemy.location = bestMatch.location;
    enemy.runeReward = bestMatch.runeReward;
    enemy.isBoss = true;
  } else {
    enemy.location = '';
    enemy.runeReward = getSoul;
    enemy.isBoss = false;
  }

  // Group by behaviorVariationId for variant detection
  if (behaviorVariationId > 0) {
    if (!seenVariations.has(behaviorVariationId)) {
      seenVariations.set(behaviorVariationId, []);
    }
    seenVariations.get(behaviorVariationId).push(enemy);
  }

  enemies.push(enemy);
}

console.log(`  → ${enemies.length} total enemy entries`);

// ── 4. Deduplicate and mark variants ─────────────────────
console.log('\nStep 4: Grouping variants...');

// For entries sharing the same behaviorVariationId and name, keep only the first
// as the "primary" and mark the rest as variants
let finalEnemies = [];
const processedVariations = new Set();

for (const enemy of enemies) {
  const bvId = enemy.behaviorVariationId;

  if (bvId > 0 && seenVariations.has(bvId)) {
    if (processedVariations.has(bvId)) continue;
    processedVariations.add(bvId);

    const variants = seenVariations.get(bvId);
    // Use the first entry as primary
    const primary = { ...variants[0] };

    if (variants.length > 1) {
      primary.variants = variants.slice(1).map((v, i) => ({
        id: v.id,
        name: v.name,
        hp: v.hp,
        poise: v.poise,
        label: v.hp !== primary.hp ? `Variant (HP: ${v.hp})` : `Variant ${i + 2}`,
        absorption: v.absorption,
        flatDefense: v.flatDefense,
        resistances: v.resistances
      }));
    }

    finalEnemies.push(primary);
  } else if (bvId === 0) {
    // No behavior variation - standalone entry
    finalEnemies.push(enemy);
  }
}

// ── 4b. Name-based boss dedup ─────────────────────────────
// Merge entries that are clearly the same boss encounter
// (e.g. "Malenia, Blade of Miquella" and "Malenia, Blade of Miquella (Boss)")
console.log('  Name-based boss deduplication...');

const bossGroups = new Map();
const nonBossEntries = [];

for (const enemy of finalEnemies) {
  if (!enemy.isBoss) {
    nonBossEntries.push(enemy);
    continue;
  }
  // Strip trailing "(Boss)" or "(NPC Invader)" to get canonical name
  const canonical = normalizeName(
    enemy.name
      .replace(/\s*\(Boss\)\s*$/i, '')
      .replace(/\s*\(NPC Invader\)\s*$/i, '')
  );
  if (!bossGroups.has(canonical)) {
    bossGroups.set(canonical, []);
  }
  bossGroups.get(canonical).push(enemy);
}

const dedupedBosses = [];
let mergedCount = 0;

for (const [, group] of bossGroups) {
  if (group.length === 1) {
    dedupedBosses.push(group[0]);
    continue;
  }

  // Different HP = different encounters (location variants) — keep all
  const hpSet = new Set(group.map(e => e.hp));
  if (hpSet.size > 1) {
    dedupedBosses.push(...group);
    continue;
  }

  // Same HP = true duplicates — merge, keep the one with more attacks
  group.sort((a, b) => b.attacks.length - a.attacks.length);
  const primary = { ...group[0] };
  if (group.length > 1) {
    primary.variants = [
      ...(primary.variants || []),
      ...group.slice(1).map(v => ({
        id: v.id,
        name: v.name,
        hp: v.hp,
        poise: v.poise,
        label: v.name !== primary.name ? v.name : `Duplicate (ID: ${v.id})`
      }))
    ];
    mergedCount += group.length - 1;
  }
  dedupedBosses.push(primary);
}

finalEnemies = [...dedupedBosses, ...nonBossEntries];
console.log(`  → Merged ${mergedCount} duplicate boss entries`);

// ── 4c. Flag Unscaled entries ─────────────────────────────
console.log('  Flagging Unscaled entries...');

let unscaledCount = 0;
for (const enemy of finalEnemies) {
  if (enemy.name.includes('(Unscaled)')) {
    enemy.isUnscaled = true;
    unscaledCount++;

    // Find the scaled equivalent by matching base name
    const baseName = normalizeName(enemy.name.replace(/\s*\(Unscaled\)\s*/i, ''));
    const scaled = finalEnemies.find(e =>
      e.id !== enemy.id &&
      !e.name.includes('(Unscaled)') &&
      normalizeName(e.name).includes(baseName)
    );

    if (scaled) {
      enemy.scaledEquivalentId = scaled.id;
      enemy.scaledEquivalentName = scaled.name;
      // Back-reference on the scaled version
      if (!scaled.unscaledVariantId) {
        scaled.unscaledVariantId = enemy.id;
        scaled.unscaledVariantName = enemy.name;
      }
    }
  }
}
console.log(`  → ${unscaledCount} Unscaled entries flagged`);

// Sort: bosses first, then alphabetically
finalEnemies.sort((a, b) => {
  if (a.isBoss !== b.isBoss) return a.isBoss ? -1 : 1;
  return a.name.localeCompare(b.name);
});

const bossCount = finalEnemies.filter(e => e.isBoss).length;
console.log(`  → ${finalEnemies.length} unique enemies (${bossCount} bosses)`);

// ── 5. Build NG+ scaling table ────────────────────────────
console.log('\nStep 5: Building NG+ scaling table...');

const ngScaling = ngRows
  .filter(row => int(row.ID) >= 0 && int(row.ID) <= 7)
  .map(row => ({
    cycle: row.Name || `NG+${int(row.ID)}`,
    maxHp: num(row.MaxHpRate),
    maxStamina: num(row.MaxStaminaRate),
    physAtk: num(row.PhysicsAttackRate),
    magAtk: num(row.MagicAttackRate),
    fireAtk: num(row.FireAttackRate),
    lightningAtk: num(row.ThunderAttackRate),
    holyAtk: num(row.DarkAttackRate),
    physDef: num(row.PhysicsDefenseRate),
    magDef: num(row.MagicDefenseRate),
    fireDef: num(row.FireDefenseRate),
    lightningDef: num(row.ThunderDefenseRate),
    holyDef: num(row.DarkDefenseRate),
    soulRate: num(row.SoulRate),
    poisonResist: num(row.PoisionResistRate),
    bleedResist: num(row.BloodResistRate),
    frostResist: num(row.FreezeResistRate),
    sleepResist: num(row.SleepResistRate),
    madnessResist: num(row.MadnessResistRate),
    staminaAtk: num(row.StaminaAttackRate),
    poiseDmg: num(row.SuperArmorDamageRate)
  }));

console.log(`  → ${ngScaling.length} NG+ cycles`);

// ── 6. Write output ───────────────────────────────────────
console.log('\nStep 6: Writing JSON files...');

fs.mkdirSync(OUT_DIR, { recursive: true });

const enemiesOutput = {
  enemies: finalEnemies,
  metadata: {
    totalEnemies: finalEnemies.length,
    totalBosses: bossCount,
    totalAttacks: finalEnemies.reduce((sum, e) => sum + e.attacks.length, 0),
    generatedAt: new Date().toISOString()
  }
};

const enemiesJson = JSON.stringify(enemiesOutput);
fs.writeFileSync(path.join(OUT_DIR, 'enemies.json'), enemiesJson);
console.log(`  → enemies.json: ${(enemiesJson.length / 1024 / 1024).toFixed(2)} MB`);

const ngJson = JSON.stringify({ scaling: ngScaling });
fs.writeFileSync(path.join(OUT_DIR, 'ng-scaling.json'), ngJson);
console.log(`  → ng-scaling.json: ${(ngJson.length / 1024).toFixed(1)} KB`);

console.log('\n✓ Build complete!');
