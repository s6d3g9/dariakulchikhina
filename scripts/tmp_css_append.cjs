const fs = require('fs');
const css = `
/* ====== GLASS INPUT WRAPPER FIXES ====== */
.glass-input {
  backdrop-filter: var(--input-blur, blur(12px));
  -webkit-backdrop-filter: var(--input-blur, blur(12px));
  background: var(--input-bg, transparent); /* fallback if not set */
}

/* Error States Generic (for Glass / Brutalism where appropriate) */
.glass-input.error {
  border-color: rgba(239, 68, 68, 0.5) !important;
  background: rgba(239, 68, 68, 0.05) !important;
  box-shadow: inset 0 1px 4px rgba(220, 38, 38, 0.2);
}

.glass-input.error:focus {
  box-shadow: inset 0 1px 4px rgba(220, 38, 38, 0.2), 0 0 0 3px rgba(220, 38, 38, 0.3) !important;
}

/* Ensure M3 and Brutalism disable the blur */
html[data-concept="m3"] .glass-input,
html[data-concept="brutal"] .glass-input {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* M3 Override for Error */
html[data-concept="m3"] .glass-input.error {
  border-bottom: 2px solid var(--sys-color-error) !important;
  background: var(--sys-color-error-container, rgba(179, 38, 30, 0.08)) !important;
  box-shadow: none !important;
}
`;
fs.appendFileSync('/Users/oxo/work/dariakulchikhina/app/assets/css/main.css', '\n' + css + '\n');
console.log('Appended successfully');
