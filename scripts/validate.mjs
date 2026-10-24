// Fails the deploy if data/inventory.json is malformed or inconsistent.
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../data/inventory.json', import.meta.url), 'utf8'));
const errors = [];
const ids = new Set();

for (const c of data.components ?? []) {
  if (!c.id || !c.name || !c.category) errors.push(`Component missing id/name/category: ${JSON.stringify(c).slice(0, 80)}`);
  if (ids.has(c.id)) errors.push(`Duplicate component id "${c.id}"`);
  ids.add(c.id);
  if (c.quantity != null && !(Number.isInteger(c.quantity) && c.quantity >= 0)) errors.push(`"${c.id}": quantity must be a whole number or null`);
}

const used = {};
for (const p of data.projects ?? []) {
  if (!['active', 'planned', 'archived'].includes(p.status)) errors.push(`Project "${p.id}": status must be active, planned or archived`);
  for (const a of p.components ?? []) {
    if (!ids.has(a.id)) errors.push(`Project "${p.id}" uses unknown component "${a.id}"`);
    if (p.status !== 'archived') used[a.id] = (used[a.id] ?? 0) + (a.qty ?? 1);
  }
}

for (const c of data.components ?? []) {
  if (c.quantity != null && (used[c.id] ?? 0) > c.quantity) errors.push(`"${c.id}": projects use ${used[c.id]} but only ${c.quantity} owned`);
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${ids.size} components, ${(data.projects ?? []).length} projects`);
