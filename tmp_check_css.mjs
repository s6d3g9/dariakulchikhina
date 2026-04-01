import fs from 'fs';
const css = fs.readFileSync('app/assets/css/main.css', 'utf8');

const getClasses = (concept) => {
  const re = new RegExp(\`html\\\\[data-concept="\\$\\{concept\\}"\\\\]\\s+([^:{,]+)\`, 'g');
  const matches = [...css.matchAll(re)];
  return new Set(matches.map(m => m[1].replace('.dark', '').trim()));
}

const g = getClasses('glass');
const m = getClasses('m3');

const missing = [...g].filter(x => !m.has(x));
console.log(missing.join('\\n'));
