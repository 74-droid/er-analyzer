const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data/enemies.json'), 'utf-8'));

// Map spAttribute values by looking at attack names
console.log("=== spAttribute value meanings (from attack names) ===");
const allAttacks = data.enemies.flatMap(e => e.attacks);
const bySpAttr = {};
allAttacks.forEach(a => {
  const key = a.spAttribute || 0;
  if (!bySpAttr[key]) bySpAttr[key] = [];
  if (bySpAttr[key].length < 5) bySpAttr[key].push(a.name);
});
for (const [k, v] of Object.entries(bySpAttr)) {
  console.log(`spAttribute=${k}: ${v.join(' | ')}`);
}

// Check for Highwayman variants
console.log("\n=== Searching for dungeon enemy names ===");
const terms2 = ['highway', 'bandit', 'thief', 'rogue', 'brigand', 'fire giant', 'pumpkin', 'mad', 'worm', 'centipede'];
for (const term of terms2) {
  const matches = data.enemies.filter(e => e.name.toLowerCase().includes(term));
  if (matches.length > 0) {
    console.log(`"${term}": ${matches.map(e => `${e.isBoss?'[BOSS]':'[MOB]'} ${e.name} HP:${e.hp}`).join(', ')}`);
  } else {
    console.log(`"${term}": NO MATCHES`);
  }
}

// Show all Godrick Knight attacks to understand weapon variants
console.log("\n=== Godrick Knight attack name patterns ===");
const gk = data.enemies.find(e => e.name === 'Godrick Knight' && !e.isBoss);
if (gk) {
  const namePatterns = {};
  gk.attacks.forEach(a => {
    const baseName = a.name.replace(/\[.*?\]\s*/, '');
    if (!namePatterns[baseName]) namePatterns[baseName] = { count: 0, types: new Set(), spAttrs: new Set() };
    namePatterns[baseName].count++;
    namePatterns[baseName].types.add(a.type);
    namePatterns[baseName].spAttrs.add(a.spAttribute);
  });
  for (const [name, info] of Object.entries(namePatterns)) {
    console.log(`  "${name}" x${info.count} | Types: ${[...info.types]} | spAttrs: ${[...info.spAttrs]}`);
  }
}

// Look at wolf boss data to see if we should include it as non-boss
console.log("\n=== Wolf boss entries ===");
const wolves = data.enemies.filter(e => e.name === 'Wolf');
wolves.forEach(e => {
  console.log(`  ${e.name} | Boss:${e.isBoss} | HP:${e.hp} | Poise:${e.poise} | Runes:${e.runeReward} | Attacks:${e.attacks.length} | ID:${e.id}`);
});

// Check Stray entries
console.log("\n=== Stray/Dog entries ===");
const strays = data.enemies.filter(e => e.name.includes('Stray') || e.name.includes('Giant Dog'));
strays.forEach(e => {
  console.log(`  ${e.name} | Boss:${e.isBoss} | HP:${e.hp} | Runes:${e.runeReward} | Attacks:${e.attacks.length}`);
});
