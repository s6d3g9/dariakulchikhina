import fs from 'fs';

const m3Styles = `
/* ==========================================================================
   MATERIAL 3 COMPREHENSIVE OVERRIDES
   ========================================================================== */

/* 1. Modals & Dialogs */
html[data-concept="concept-m3"] .u-modal,
html[data-concept="concept-m3"] .cab-modal,
html[data-concept="concept-m3"] .cab-modal-overlay,
html[data-concept="concept-m3"] .glass-modal {
  background: var(--sys-color-surface-container-high, #ECE6F0) !important;
  border: none !important;
  border-radius: 28px !important;
  box-shadow: 0px 8px 12px 6px rgba(0, 0, 0, 0.15) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
html.dark[data-concept="concept-m3"] .u-modal,
html.dark[data-concept="concept-m3"] .cab-modal,
html.dark[data-concept="concept-m3"] .cab-modal-overlay,
html.dark[data-concept="concept-m3"] .glass-modal {
  background: var(--sys-color-surface-container-high, #2B2930) !important;
}

/* 2. Dropdowns & Selects & Popovers */
html[data-concept="concept-m3"] .glass-dropdown,
html[data-concept="concept-m3"] .dp-panel,
html[data-concept="concept-m3"] .dp-popup,
html[data-concept="concept-m3"] .dp__menu {
  background: var(--sys-color-surface-container, #F3EDF7) !important;
  border: none !important;
  border-radius: 8px !important;
  box-shadow: 0px 2px 6px 2px rgba(0, 0, 0, 0.15) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
html.dark[data-concept="concept-m3"] .glass-dropdown,
html.dark[data-concept="concept-m3"] .dp-panel,
html.dark[data-concept="concept-m3"] .dp-popup,
html.dark[data-concept="concept-m3"] .dp__menu {
  background: var(--sys-color-surface-container, #211F26) !important;
}

html[data-concept="concept-m3"] select.glass-input {
  background: var(--sys-color-surface-container-highest, #E6E0E9) !important;
  border: none !important;
  border-bottom: 1px solid var(--sys-color-on-surface-variant, #49454F) !important;
  border-radius: 4px 4px 0 0 !important;
  box-shadow: none !important;
}
html.dark[data-concept="concept-m3"] select.glass-input {
  background: var(--sys-color-surface-container-highest, #36343B) !important;
  border-bottom-color: var(--sys-color-on-surface-variant, #CAC4D0) !important;
}

/* 3. Tables */
html[data-concept="concept-m3"] .std-table,
html[data-concept="concept-m3"] table {
  background: transparent !important;
  border-collapse: collapse !important;
}
html[data-concept="concept-m3"] .std-table th,
html[data-concept="concept-m3"] .std-table td,
html[data-concept="concept-m3"] th,
html[data-concept="concept-m3"] td {
  border-bottom: 1px solid var(--sys-color-outline-variant, #CAC4D0) !important;
  backdrop-filter: none !important;
  background: transparent !important;
}
html.dark[data-concept="concept-m3"] .std-table th,
html.dark[data-concept="concept-m3"] .std-table td,
html.dark[data-concept="concept-m3"] th,
html.dark[data-concept="concept-m3"] td {
  border-bottom-color: var(--sys-color-outline-variant, #49454F) !important;
}

/* 4. Navigation items & Tabs */
html[data-concept="concept-m3"] .ent-nav-item,
html[data-concept="concept-m3"] .cab-nav-item,
html[data-concept="concept-m3"] .nav-item,
html[data-concept="concept-m3"] .std-nav-item {
  border-radius: 100px !important;
  border: none !important;
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
html[data-concept="concept-m3"] .ent-nav-item.active,
html[data-concept="concept-m3"] .cab-nav-item.active,
html[data-concept="concept-m3"] .nav-item--active,
html[data-concept="concept-m3"] .std-nav-item.active {
  background: var(--sys-color-secondary-container, #E8DEF8) !important;
  color: var(--sys-color-on-secondary-container, #1D192B) !important;
  font-weight: 500 !important;
}
html.dark[data-concept="concept-m3"] .ent-nav-item.active,
html.dark[data-concept="concept-m3"] .cab-nav-item.active,
html.dark[data-concept="concept-m3"] .nav-item--active,
html.dark[data-concept="concept-m3"] .std-nav-item.active {
  background: var(--sys-color-secondary-container, #4A4458) !important;
  color: var(--sys-color-on-secondary-container, #E8DEF8) !important;
}

/* 5. Tooltips */
html[data-concept="concept-m3"] .u-tooltip,
html[data-concept="concept-m3"] [role="tooltip"] {
  background: var(--sys-color-inverse-surface, #313033) !important;
  color: var(--sys-color-inverse-on-surface, #F4EFF4) !important;
  border-radius: 4px !important;
  border: none !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
html.dark[data-concept="concept-m3"] .u-tooltip,
html.dark[data-concept="concept-m3"] [role="tooltip"] {
  background: var(--sys-color-inverse-surface, #E6E1E5) !important;
  color: var(--sys-color-inverse-on-surface, #313033) !important;
}

/* 6. Status pills */
html[data-concept="concept-m3"] [class^="ws-status"] {
  border-radius: 8px !important;
  border: 1px solid var(--sys-color-outline, #79747E) !important;
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: none !important;
}
html.dark[data-concept="concept-m3"] [class^="ws-status"] {
  border-color: var(--sys-color-outline, #938F99) !important;
}

/* 7. General Surfaces fixes (HPC Boards) */
html[data-concept="concept-m3"] .hpc-board,
html[data-concept="concept-m3"] .hpc-module-nav,
html[data-concept="concept-m3"] .acp2-wrap,
html[data-concept="concept-m3"] .acp2-stage,
html[data-concept="concept-m3"] .acp2-task-row,
html[data-concept="concept-m3"] .hpc-call-insight-card,
html[data-concept="concept-m3"] .hpc-recommendation-card,
html[data-concept="concept-m3"] .hpc-playbook-card,
html[data-concept="concept-m3"] .hpc-agent-card,
html[data-concept="concept-m3"] .hpc-board__entity {
  background: var(--sys-color-surface-container-low, #F7F2FA) !important;
  border: 1px solid var(--sys-color-outline-variant, #CAC4D0) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: none !important;
}
html.dark[data-concept="concept-m3"] .hpc-board,
html.dark[data-concept="concept-m3"] .hpc-module-nav,
html.dark[data-concept="concept-m3"] .acp2-wrap,
html.dark[data-concept="concept-m3"] .acp2-stage,
html.dark[data-concept="concept-m3"] .acp2-task-row,
html.dark[data-concept="concept-m3"] .hpc-call-insight-card,
html.dark[data-concept="concept-m3"] .hpc-recommendation-card,
html.dark[data-concept="concept-m3"] .hpc-playbook-card,
html.dark[data-concept="concept-m3"] .hpc-agent-card,
html.dark[data-concept="concept-m3"] .hpc-board__entity {
  background: var(--sys-color-surface-container-low, #1D1B20) !important;
  border-color: var(--sys-color-outline-variant, #49454F) !important;
}
`;

fs.appendFileSync('/Users/oxo/work/dariakulchikhina/app/assets/css/main.css', m3Styles);
console.log('Appended M3 styles successfully');
