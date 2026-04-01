const fs = require('fs');
const css = fs.readFileSync('app/assets/css/main.css', 'utf8');

const getClasses = (concept) => {
  const re = new RegExp(`\\[data-concept="${concept}"\\]\\s+([^:\\[{,\\s>]+)`, 'g');
  const matches = [...css.matchAll(re)];
  const set = new Set();
  matches.forEach(m => set.add(m[1].replace('.dark', '').trim()));
  return set;
}

const g = getClasses('glass');
const m = getClasses('concept-m3');

const missing = [...g].filter(x => !m.has(x));
fs.writeFileSync('tmp_missing.txt', missing.join('\n'));
console.log('Missing classes:', missing.length);
