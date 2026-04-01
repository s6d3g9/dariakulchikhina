const fs = require('fs');
const cssPath = '/Users/oxo/work/dariakulchikhina/app/assets/css/main.css';
let css = fs.readFileSync(cssPath, 'utf8');

const m3InputsAPI = `
/* --- M3 INPUTS & FIELDS --- */
html[data-concept="m3"] .glass-input,
html[data-concept="m3"] .glass-input--inline,
html[data-concept="m3"] textarea.glass-input,
html[data-concept="m3"] .form-input,
html[data-concept="m3"] input.std-input {
  /* M3 Filled Text Field Rules */
  background: var(--sys-color-surface-variant) !important;
  color: var(--sys-color-on-surface) !important;
  border: none !important;
  border-bottom: 1px solid var(--sys-color-outline) !important;
  border-radius: var(--sys-radius-xs, 4px) var(--sys-radius-xs, 4px) 0 0 !important;
  padding: 16px 16px 8px 16px !important;
  box-shadow: none !important;
  transition: background 0.2s ease, border-bottom 0.2s ease !important;
  box-sizing: border-box !important;
  backdrop-filter: none !important;
  font-family: inherit !important;
  font-size: 16px !important;
  /* Minimum standard height 56px for text fields */
  min-height: 56px !important;
}
html[data-concept="m3"] textarea.glass-input {
  padding-top: 16px !important;
}

html[data-concept="m3"] .glass-input:hover,
html[data-concept="m3"] .glass-input--inline:hover,
html[data-concept="m3"] input.std-input:hover {
  background: var(--sys-color-surface-container-highest) !important;
  border-bottom-color: var(--sys-color-on-surface) !important;
}

html[data-concept="m3"] .glass-input:focus,
html[data-concept="m3"] .glass-input--inline:focus,
html[data-concept="m3"] input.std-input:focus,
html[data-concept="m3"] .glass-input:focus-within {
  background: var(--sys-color-surface-variant) !important;
  border-bottom: 2px solid var(--sys-color-primary) !important;
  outline: none !important;
  box-shadow: none !important;
  padding-bottom: 7px !important; /* adjust for 2px border vs 1px border */
}

/* Label text color in normal and focus state */
html[data-concept="m3"] .u-field__label,
html[data-concept="m3"] .field-label {
  color: var(--sys-color-on-surface-variant) !important;
  font-family: 'Roboto', 'Inter', sans-serif !important;
  font-size: 14px !important;
  letter-spacing: 0.1px !important;
  font-weight: 500 !important;
  margin-bottom: 4px !important;
  display: block;
}

/* Error state text fields */
html[data-concept="m3"] .glass-input.error,
html[data-concept="m3"] .has-error .glass-input {
  border-bottom-color: var(--sys-color-error) !important;
}
html[data-concept="m3"] .glass-input.error:focus,
html[data-concept="m3"] .has-error .glass-input:focus {
  border-bottom-width: 2px !important;
}
html[data-concept="m3"] .has-error .u-field__label {
  color: var(--sys-color-error) !important;
}

/* Placeholder */
html[data-concept="m3"] .glass-input::placeholder {
  color: var(--sys-color-on-surface-variant) !important;
  opacity: 0.6 !important;
}

/* --- M3 CARDS & SURFACES --- */
html[data-concept="m3"] .glass-card,
html[data-concept="m3"] .project-card,
html[data-concept="m3"] .dash-project-card {
  background: var(--sys-color-surface-container-low) !important;
  border: 1px solid var(--sys-color-outline-variant) !important; /* M3 Outlined card */
  border-radius: var(--sys-radius-md, 12px) !important; /* Medium Shape */
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  color: var(--sys-color-on-surface) !important;
  padding: 16px !important;
  transition: box-shadow 0.2s ease, border-color 0.2s ease !important;
}

html[data-concept="m3"] .glass-card:hover,
html[data-concept="m3"] .project-card:hover {
  /* Elevate on hover M3 behaviour */
  box-shadow: var(--sys-elevation-level1) !important;
  border-color: transparent !important; /* Transitions to Elevated Card */
  background: var(--sys-color-surface-container-highest) !important;
}

/* Elevated Containers / Surfaces (Level 1) */
html[data-concept="m3"] .glass-surface,
html[data-concept="m3"] .cab-module-grid > div {
  background: var(--sys-color-surface) !important;
  border: none !important;
  border-radius: var(--sys-radius-md, 12px) !important;
  box-shadow: var(--sys-elevation-level1) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* Bottom App Bars / Floating Containers */
html[data-concept="m3"] .adm-bottom-actions,
html[data-concept="m3"] .sticky-actions {
  background: var(--sys-color-surface-container) !important;
  border-top: none !important;
  box-shadow: var(--sys-elevation-level2) !important;
  padding: 12px 24px !important;
}

/* --- M3 MODALS & DIALOGS --- */
html[data-concept="m3"] .glass-modal,
html[data-concept="m3"] .admin-modal,
html[data-concept="m3"] .dialog-content {
  background: var(--sys-color-surface-container-high) !important;
  border-radius: var(--sys-radius-xl, 28px) !important; /* Extra Large Shape */
  box-shadow: var(--sys-elevation-level3) !important;
  border: none !important;
  padding: 24px !important;
  backdrop-filter: none !important;
  color: var(--sys-color-on-surface) !important;
}

/* Modal Overlay Scrim */
html[data-concept="m3"] .modal-overlay,
html[data-concept="m3"] .glass-overlay {
  background: rgba(0, 0, 0, 0.4) !important; /* Standard dark scrim */
  backdrop-filter: none !important; /* No blur in M3 backdrop */
}

/* Modal Action Area */
html[data-concept="m3"] .modal-actions {
  padding-top: 24px !important;
  display: flex !important;
  justify-content: flex-end !important;
  gap: 8px !important;
}

`;

if (!css.includes('M3 INPUTS & FIELDS')) {
  // Append safely at the end of M3 Buttons or concepts
  const btnAnchor = '/* --- END M3 BUTTON API --- */';
  if (css.includes(btnAnchor)) {
      css = css.replace(btnAnchor, btnAnchor + '\n\n' + m3InputsAPI);
      fs.writeFileSync(cssPath, css, 'utf8');
      console.log('Successfully injected M3 styles for Inputs, Cards, Dialogs.');
  } else {
      // Just append to end
      fs.writeFileSync(cssPath, css + '\n\n' + m3InputsAPI, 'utf8');
      console.log('Appended to end of file.');
  }
} else {
  console.log('Rules already exist.');
}
