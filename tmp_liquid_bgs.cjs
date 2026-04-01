const fs = require('fs');
const cssPath = 'app/assets/css/main.css';
let css = fs.readFileSync(cssPath, 'utf-8');

const bgStyles = `
/* ========================================================
   LIQUID GLASS MESH BACKGROUNDS
   Adds an ambient, moving gradient mesh to make blurs visible
======================================================== */
html[data-concept="glass"] .glass-page,
html[data-concept="glass"] .admin-bg,
html[data-concept="glass"] body {
  background-color: var(--glass-page-bg, #f6f6f6);
  position: relative;
  z-index: 0;
}

html.dark[data-concept="glass"] .glass-page,
html.dark[data-concept="glass"] .admin-bg,
html.dark[data-concept="glass"] body {
  background-color: var(--glass-page-bg, #0a0a0c);
}

html[data-concept="glass"] .glass-page::before,
html[data-concept="glass"] .admin-bg::before {
  content: "";
  position: fixed;
  inset: -50%;
  z-index: -2;
  background-image: 
    radial-gradient(ellipse at 15% 20%, rgba(85, 120, 255, 0.12) 0%, transparent 40%),
    radial-gradient(ellipse at 85% 15%, rgba(60, 200, 180, 0.1) 0%, transparent 40%),
    radial-gradient(ellipse at 50% 80%, rgba(180, 80, 255, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 20% 90%, rgba(255, 150, 100, 0.08) 0%, transparent 40%);
  background-attachment: fixed;
  filter: blur(80px);
  animation: liquidMeshBreathing 30s ease-in-out infinite alternate;
  pointer-events: none;
}

html.dark[data-concept="glass"] .glass-page::before,
html.dark[data-concept="glass"] .admin-bg::before {
  background-image: 
    radial-gradient(ellipse at 10% 20%, rgba(50, 80, 220, 0.15) 0%, transparent 40%),
    radial-gradient(ellipse at 90% 15%, rgba(40, 160, 140, 0.12) 0%, transparent 40%),
    radial-gradient(ellipse at 40% 70%, rgba(140, 60, 220, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 90%, rgba(220, 100, 80, 0.1) 0%, transparent 40%);
  filter: blur(100px);
}

@keyframes liquidMeshBreathing {
  0% {
    transform: rotate(0deg) scale(1) translate(0, 0);
  }
  50% {
    transform: rotate(180deg) scale(1.1) translate(-2%, 5%);
  }
  100% {
    transform: rotate(360deg) scale(1) translate(5%, -2%);
  }
}

html[data-concept="glass"] {
  --liquid-thickness: 1.5px;
  --liquid-opacity: 0.15;
  --liquid-shadow-light: rgba(255, 255, 255, 0.35);
  --liquid-shadow-color: rgba(0, 0, 0, 0.05);
  --liquid-blur: 40px;
  --glass-bg: rgba(255, 255, 255, 0.35);
  --glass-border: rgba(255, 255, 255, 0.4);
  --glass-text: #000;
  
  --liquid-btn-bg: rgba(255,255,255,0.7);
  --liquid-btn-hover: rgba(255,255,255,1);
  --liquid-btn-shadow: rgba(0,0,0,0.06);
}

html.dark[data-concept="glass"] {
  --liquid-thickness: 1px;
  --liquid-opacity: 0.1;
  --liquid-shadow-light: rgba(255, 255, 255, 0.1);
  --liquid-shadow-color: rgba(0, 0, 0, 0.4);
  --liquid-blur: 50px;
  --glass-bg: rgba(20, 20, 24, 0.35);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-text: #fff;
  
  --liquid-btn-bg: rgba(40,40,48,0.6);
  --liquid-btn-hover: rgba(60,60,70,0.8);
  --liquid-btn-shadow: rgba(0,0,0,0.5);
}

/* Enhancing surface realism */
html[data-concept="glass"] .glass-card,
html[data-concept="glass"] .glass-surface,
html[data-concept="glass"] .ent-detail-card,
html[data-concept="glass"] .cab-task,
html[data-concept="glass"] .cab-doc-card,
html[data-concept="glass"] .ws-card,
html[data-concept="glass"] .dash-stat,
html[data-concept="glass"] .dash-project-card {
  box-shadow: 
    inset 0 1px 2px var(--liquid-shadow-light),
    inset 0 0 0 var(--liquid-thickness) var(--glass-border),
    0 12px 32px var(--liquid-shadow-color),
    0 1px 2px rgba(0,0,0,0.03);
}

html.dark[data-concept="glass"] .glass-card,
html.dark[data-concept="glass"] .glass-surface,
html.dark[data-concept="glass"] .ent-detail-card,
html.dark[data-concept="glass"] .cab-task,
html.dark[data-concept="glass"] .cab-doc-card,
html.dark[data-concept="glass"] .ws-card,
html.dark[data-concept="glass"] .dash-stat,
html.dark[data-concept="glass"] .dash-project-card {
  box-shadow: 
    inset 0 1px 2px var(--liquid-shadow-light),
    inset 0 0 0 var(--liquid-thickness) var(--glass-border),
    0 12px 32px var(--liquid-shadow-color),
    0 1px 3px rgba(0,0,0,0.5);
  border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
}

/* Hyper realistic glass borders (inner shine) */
html[data-concept="glass"] .glass-card::before,
html[data-concept="glass"] .glass-surface::before,
html[data-concept="glass"] .ent-detail-card::before,
html[data-concept="glass"] .cab-task::before,
html[data-concept="glass"] .cab-doc-card::before,
html[data-concept="glass"] .ws-card::before,
html[data-concept="glass"] .dash-stat::before,
html[data-concept="glass"] .dash-project-card::before {
  padding: 1px;
  background: linear-gradient(145deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.15) 100%);
  opacity: 0.9;
}

html.dark[data-concept="glass"] .glass-card::before,
html.dark[data-concept="glass"] .glass-surface::before,
html.dark[data-concept="glass"] .ent-detail-card::before,
html.dark[data-concept="glass"] .cab-task::before,
html.dark[data-concept="glass"] .cab-doc-card::before,
html.dark[data-concept="glass"] .ws-card::before,
html.dark[data-concept="glass"] .dash-stat::before,
html.dark[data-concept="glass"] .dash-project-card::before {
  background: linear-gradient(145deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.08) 100%);
}

html[data-concept="glass"] .glass-card:hover,
html[data-concept="glass"] .cab-task:hover,
html[data-concept="glass"] .cab-doc-card:hover,
html[data-concept="glass"] .dash-stat:hover,
html[data-concept="glass"] .dash-project-card:hover {
  transform: translateY(-5px);
  box-shadow: 
    inset 0 1px 2px rgba(255,255,255,0.6),
    inset 0 0 0 var(--liquid-thickness) var(--glass-border),
    0 20px 48px var(--liquid-shadow-color),
    0 4px 12px rgba(0,0,0,0.05);
}

html.dark[data-concept="glass"] .glass-card:hover,
html.dark[data-concept="glass"] .cab-task:hover,
html.dark[data-concept="glass"] .cab-doc-card:hover,
html.dark[data-concept="glass"] .dash-stat:hover,
html.dark[data-concept="glass"] .dash-project-card:hover {
  transform: translateY(-5px);
  box-shadow: 
    inset 0 1px 2px rgba(255,255,255,0.2),
    inset 0 0 0 var(--liquid-thickness) var(--glass-border),
    0 20px 48px rgba(0,0,0,0.8),
    0 4px 12px rgba(0,0,0,0.5);
}

/* Glass Buttons Depth */
html[data-concept="glass"] .a-btn-save,
html[data-concept="glass"] .a-btn-danger,
html[data-concept="glass"] .a-btn-ai,
html[data-concept="glass"] .a-btn-sm,
html[data-concept="glass"] .glass-btn {
  background: var(--liquid-btn-bg);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid var(--glass-border);
  box-shadow: 
    0 4px 12px var(--liquid-btn-shadow), 
    inset 0 1.5px 2px rgba(255,255,255,0.4),
    inset 0 -1px 2px rgba(0,0,0,0.05);
  color: var(--glass-text);
  text-shadow: 0 1px 1px rgba(255,255,255,0.3);
  position: relative;
  overflow: hidden;
}
html.dark[data-concept="glass"] .a-btn-save,
html.dark[data-concept="glass"] .a-btn-danger,
html.dark[data-concept="glass"] .a-btn-ai,
html.dark[data-concept="glass"] .a-btn-sm,
html.dark[data-concept="glass"] .glass-btn {
  text-shadow: 0 1px 2px rgba(0,0,0,0.8);
  box-shadow: 
    0 4px 12px var(--liquid-btn-shadow), 
    inset 0 1.5px 2px rgba(255,255,255,0.1),
    inset 0 -1px 2px rgba(0,0,0,0.2);
}
`;

// Append background effects safely at the end of the file to ensure they take precedence
css += '\n' + bgStyles;
fs.writeFileSync(cssPath, css);
console.log('Appended ultimate glass mesh background & refined shadows.');
