const fs = require('fs');
const css = fs.readFileSync('app/assets/css/main.css', 'utf8');

const getClasses = (concept) => {
  const re = new RegExp(`html\\[data-concept="${concept}"\\]\\s+([^:{,\\s]+)`, 'g');
  const matches = [...css.matchAll(re)];
  const set = new Set();
  matches.forEach(m => set.add(m[1].replace('.dark', '').trim()));
  return set;
}

const g = getClasses('glass');
const m = getClasses('m3');

const missing = [...g].filter(x => !m.has(x) && !x.startsWith('>') && x !== '');
fs.writeFileSync('tmp_missing_m3.txt', missing.join('\n'));
console.log(`Missing classes: ${missing.length}`);
