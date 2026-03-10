const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data/enemies.json'), 'utf-8'));

// Search for wolf, dog, highwayman, omen, grafted in ALL enemies (boss and non-boss)
const searchTerms = ['wolf', 'dog', 'stray', 'highwayman', 'omen', 'grafted', 'scion', 'runebear', 'bear', 'noble', 'skeleton', 'slug', 'slime', 'jellyfish', 'guillemot', 'gravebird', 'hawk', 'dame', 'chant', 'bat', 'foot soldier', 'miner', 'digger', 'commoner'];

for (const term of searchTerms) {
  const matches = data.enemies.filter(e => e.name.toLowerCase().includes(term));
  if (matches.length > 0) {
    console.log(`\n"${term}" matches:`);
    matches.forEach(e => console.log(`  ${e.isBoss ? '[BOSS]' : '[MOB]'} ${e.name} | HP:${e.hp} | Poise:${e.poise} | Attacks:${e.attacks.length}`));
  } else {
    console.log(`\n"${term}": NO MATCHES`);
  }
}

// Check spAttribute values across all attacks
console.log("\n\n=== spAttribute values across all non-boss attacks ===");
const nonBosses = data.enemies.filter(e => !e.isBoss);
const spAttrCounts = {};
nonBosses.forEach(e => {
  e.attacks.forEach(a => {
    const key = a.spAttribute || 0;
    spAttrCounts[key] = (spAttrCounts[key] || 0) + 1;
  });
});
console.log(spAttrCounts);

// Check spEffectIds on enemies
console.log("\n\n=== Sample spEffectIds on Limgrave-relevant enemies ===");
const relevantNames = ['Godrick Soldier', 'Godrick Knight', 'Godrick Foot Soldier', 'Wandering Noble', 'Kaiden Sellsword', 'Banished Knight', 'Exile Soldier'];
for (const name of relevantNames) {
  const e = data.enemies.find(en => en.name === name);
  if (e) {
    console.log(`${e.name}: spEffectIds=${JSON.stringify(e.spEffectIds)}`);
  }
}

// Check if any attacks have spEffect-related fields beyond spAttribute
console.log("\n\n=== All unique attack field names across dataset ===");
const allAttackKeys = new Set();
data.enemies.forEach(e => e.attacks.forEach(a => Object.keys(a).forEach(k => allAttackKeys.add(k))));
console.log([...allAttackKeys].sort());

// Show Godrick Soldier attacks to understand collapsing
console.log("\n\n=== Godrick Soldier attacks (first 20) ===");
const gs = data.enemies.find(e => e.name === 'Godrick Soldier' && !e.isBoss);
if (gs) {
  gs.attacks.slice(0, 20).forEach((a, i) => {
    console.log(`  ${i+1}. ${a.name} | Phys:${a.atkPhys} | Type:${a.type} | Radius:${a.hitRadius} | KB:${a.knockback} | DmgLvl:${a.dmgLevel} | spAttr:${a.spAttribute}`);
  });
}
