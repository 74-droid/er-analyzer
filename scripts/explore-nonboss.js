const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data/enemies.json'), 'utf-8'));

const nonBosses = data.enemies.filter(e => !e.isBoss);
console.log("Non-boss count:", nonBosses.length);
console.log("\nAll non-boss names:");
nonBosses.forEach(e => {
  console.log(`  ${e.name} | HP:${e.hp} | Poise:${e.poise} | Attacks:${e.attacks.length} | Loc:${e.location || 'none'}`);
});

// Show a sample attack from a non-boss
const withAttacks = nonBosses.filter(e => e.attacks.length > 0);
if (withAttacks.length > 0) {
  const sample = withAttacks[0];
  console.log("\n\nSample non-boss with attacks:", sample.name);
  console.log("First attack:", JSON.stringify(sample.attacks[0], null, 2));
  console.log("Attack keys:", Object.keys(sample.attacks[0]));
  console.log("\nAbsorption:", JSON.stringify(sample.absorption, null, 2));
  console.log("Resistances:", JSON.stringify(sample.resistances, null, 2));
}
