const fs = require('fs');
const path = 'app/assets/css/main.css';
let content = fs.readFileSync(path, 'utf8');

const oldLift = `[data-card-hover="lift"] .glass:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 36px rgba(0,0,0,0.10), 0 3px 10px rgba(0,0,0,0.06);
}`;
const newLift = `[data-card-hover="lift"] .glass:hover,
[data-card-hover="lift"] .glass-card:hover,
[data-card-hover="lift"] .glass-surface:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 36px rgba(0,0,0,0.10), 0 3px 10px rgba(0,0,0,0.06);
}`;

content = content.replace(oldLift, newLift);

const oldReveal = `[data-card-hover="reveal"] .glass       { overflow: hidden; position: relative; }
[data-card-hover="reveal"] .glass::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(255,255,255,.06) 0%, transparent 60%);
  opacity: 0;
  transition: opacity var(--ds-anim-duration, 180ms) var(--ds-anim-easing, ease);
  pointer-events: none;
}`;

const newReveal = `[data-card-hover="reveal"] .glass,
[data-card-hover="reveal"] .glass-card,
[data-card-hover="reveal"] .glass-surface { overflow: hidden; position: relative; }
[data-card-hover="reveal"] .glass::after,
[data-card-hover="reveal"] .glass-card::after,
[data-card-hover="reveal"] .glass-surface::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(255,255,255,.12) 0%, transparent 60%);
  opacity: 0;
  transition: opacity var(--ds-anim-duration, 180ms) var(--ds-anim-easing, ease);
  pointer-events: none;
}`;
content = content.replace(oldReveal, newReveal);

const oldHover = `[data-card-hover="reveal"] .glass:hover::after { opacity: 1; }`;
const newHover = `[data-card-hover="reveal"] .glass:hover::after,
[data-card-hover="reveal"] .glass-card:hover::after,
[data-card-hover="reveal"] .glass-surface:hover::after { opacity: 1; }`;
content = content.replace(oldHover, newHover);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed card hover rules to apply on liquid glass primitives');
