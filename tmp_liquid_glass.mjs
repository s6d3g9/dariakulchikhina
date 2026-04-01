import fs from 'fs';

const cssPath = 'app/assets/css/main.css';
let cssText = fs.readFileSync(cssPath, 'utf8');

const injection = `

/* ========================================================================
   LIQUID GLASS (ЖИДКОЕ СТЕКЛО) - GLOBAL & PRIMITIVES
   ======================================================================== */
html[data-concept="liquid-glass"] {
  --liquid-refraction: inset 0 1px 1px rgba(255, 255, 255, 0.4), inset 0 -1px 1px rgba(255, 255, 255, 0.05);
  --liquid-refraction-deep: inset 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 -1px 1px rgba(255, 255, 255, 0.1);
  --liquid-glow: 0 0 20px rgba(var(--sys-color-primary-rgb, 14, 165, 233), 0.3);
  --liquid-transition: backdrop-filter 0.4s cubic-bezier(0.16, 1, 0.3, 1), background 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
}

html.dark[data-concept="liquid-glass"] {
  --liquid-refraction: inset 0 1px 1px rgba(255, 255, 255, 0.1), inset 0 -1px 1px rgba(0, 0, 0, 0.4);
  --liquid-glow: 0 0 20px rgba(var(--sys-color-primary-rgb, 14, 165, 233), 0.5);
}

/* 1. GlassSurface */
html[data-concept="liquid-glass"] .glass-card,
html[data-concept="liquid-glass"] .glass-surface,
html[data-concept="liquid-glass"] .dash-widget,
html[data-concept="liquid-glass"] .widget-card {
  backdrop-filter: blur(var(--glass-blur, 48px)) !important;
  background: rgba(255, 255, 255, var(--glass-opacity, 0.15)) !important;
  box-shadow: var(--liquid-refraction), 0 var(--shadow-offset-y, 12px) var(--shadow-blur, 32px) rgba(0,0,0,var(--shadow-opacity, 0.1)) !important;
  border: 1px solid rgba(255, 255, 255, var(--glass-border-opacity, 0.3)) !important;
  transition: var(--liquid-transition), transform 0.3s ease !important;
}

html.dark[data-concept="liquid-glass"] .glass-card,
html.dark[data-concept="liquid-glass"] .glass-surface,
html.dark[data-concept="liquid-glass"] .dash-widget,
html.dark[data-concept="liquid-glass"] .widget-card {
  background: rgba(24, 24, 27, var(--glass-opacity, 0.25)) !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
}

html[data-concept="liquid-glass"] .glass-card:hover,
html[data-concept="liquid-glass"] .dash-widget:hover {
  backdrop-filter: blur(calc(var(--glass-blur, 48px) + 12px)) brightness(1.1) !important;
  transform: translateY(-2px) !important;
  box-shadow: var(--liquid-refraction), 0 calc(var(--shadow-offset-y, 12px) + 8px) calc(var(--shadow-blur, 32px) + 8px) rgba(0,0,0,var(--shadow-opacity, 0.15)) !important;
}

html.dark[data-concept="liquid-glass"] .glass-card:hover,
html.dark[data-concept="liquid-glass"] .dash-widget:hover {
  backdrop-filter: blur(calc(var(--glass-blur, 48px) + 12px)) brightness(1.2) !important;
}

/* 2. GlassButton */
html[data-concept="liquid-glass"] .a-btn-save,
html[data-concept="liquid-glass"] .a-btn-danger,
html[data-concept="liquid-glass"] .a-btn-ai,
html[data-concept="liquid-glass"] .a-btn-sm {
  border-radius: 999px !important;
  box-shadow: var(--liquid-refraction) !important;
  transition: var(--liquid-transition), transform 0.2s ease !important;
  position: relative !important;
  overflow: hidden !important;
}

html[data-concept="liquid-glass"] .a-btn-save {
  background: rgba(var(--sys-color-primary-rgb, 14, 165, 233), 0.8) !important;
  box-shadow: var(--liquid-refraction), var(--liquid-glow) !important;
}
html[data-concept="liquid-glass"] .a-btn-save:hover {
  background: rgba(var(--sys-color-primary-rgb, 14, 165, 233), 0.95) !important;
  transform: scale(1.02) !important;
}

html[data-concept="liquid-glass"] .a-btn-danger {
  background: rgba(220, 38, 38, 0.8) !important;
  box-shadow: var(--liquid-refraction), 0 0 20px rgba(220, 38, 38, 0.3) !important;
}
html[data-concept="liquid-glass"] .a-btn-danger:hover {
  background: rgba(220, 38, 38, 0.95) !important;
  transform: scale(1.02) !important;
}

html[data-concept="liquid-glass"] .a-btn-ai {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(59, 130, 246, 0.8)) !important;
  box-shadow: var(--liquid-refraction), 0 0 20px rgba(139, 92, 246, 0.4) !important;
}
html[data-concept="liquid-glass"] .a-btn-ai:hover {
  filter: brightness(1.2) !important;
  transform: scale(1.02) !important;
}

/* 3. GlassInput */
html[data-concept="liquid-glass"] .glass-input,
html[data-concept="liquid-glass"] .glass-input--inline,
html[data-concept="liquid-glass"] input.u-field {
  box-shadow: var(--liquid-refraction-deep) !important;
  background: rgba(255, 255, 255, var(--input-bg-opacity, 0.1)) !important;
  border: 1px solid rgba(255, 255, 255, var(--input-border-opacity, 0.15)) !important;
  transition: var(--liquid-transition) !important;
  border-radius: var(--input-radius, 16px) !important;
}

html.dark[data-concept="liquid-glass"] .glass-input,
html.dark[data-concept="liquid-glass"] .glass-input--inline,
html.dark[data-concept="liquid-glass"] input.u-field {
  background: rgba(0, 0, 0, 0.2) !important;
  border-color: rgba(255, 255, 255, 0.05) !important;
}

html[data-concept="liquid-glass"] .glass-input:focus,
html[data-concept="liquid-glass"] .glass-input--inline:focus,
html[data-concept="liquid-glass"] input.u-field:focus {
  background: rgba(255, 255, 255, calc(var(--input-bg-opacity, 0.1) + 0.1)) !important;
  border-color: rgba(var(--sys-color-primary-rgb, 14, 165, 233), 0.5) !important;
  box-shadow: var(--liquid-refraction-deep), 0 0 12px rgba(var(--sys-color-primary-rgb, 14, 165, 233), 0.2) !important;
  outline: none !important;
}

html.dark[data-concept="liquid-glass"] .glass-input:focus,
html.dark[data-concept="liquid-glass"] .glass-input--inline:focus,
html.dark[data-concept="liquid-glass"] input.u-field:focus {
  background: rgba(0, 0, 0, 0.4) !important;
}

/* 4. GlassNavigation */
html[data-concept="liquid-glass"] .adm-sidebar,
html[data-concept="liquid-glass"] .cab-sidebar,
html[data-concept="liquid-glass"] .adm-util-bar {
  background: rgba(255, 255, 255, var(--glass-opacity, 0.15)) !important;
  backdrop-filter: blur(var(--glass-blur, 48px)) saturate(var(--glass-saturation, 200%)) !important;
  border-right: 1px solid rgba(255, 255, 255, var(--glass-border-opacity, 0.3)) !important;
}

html.dark[data-concept="liquid-glass"] .adm-sidebar,
html.dark[data-concept="liquid-glass"] .cab-sidebar,
html.dark[data-concept="liquid-glass"] .adm-util-bar {
  background: rgba(24, 24, 27, calc(var(--glass-opacity, 0.25) - 0.1)) !important;
  border-color: rgba(255, 255, 255, 0.05) !important;
}

/* 5. Modals & Drawers */
html[data-concept="liquid-glass"] .u-modal,
html[data-concept="liquid-glass"] .glass-dropdown,
html[data-concept="liquid-glass"] .admin-notif-dropdown {
  backdrop-filter: blur(calc(var(--glass-blur, 48px) * 1.5)) saturate(250%) !important;
  background: rgba(255, 255, 255, calc(var(--glass-opacity, 0.15) + 0.1)) !important;
  box-shadow: var(--liquid-refraction), 0 24px 48px rgba(0,0,0,0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.4) !important;
  border-radius: var(--modal-radius, 32px) !important;
}

html.dark[data-concept="liquid-glass"] .u-modal,
html.dark[data-concept="liquid-glass"] .glass-dropdown,
html.dark[data-concept="liquid-glass"] .admin-notif-dropdown {
  background: rgba(24, 24, 27, 0.4) !important;
  box-shadow: var(--liquid-refraction), 0 24px 48px rgba(0,0,0,0.5) !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
}

html[data-concept="liquid-glass"] .u-modal-overlay {
  backdrop-filter: blur(24px) !important;
  background: rgba(0, 0, 0, 0.2) !important;
}

`;

if (!cssText.includes('LIQUID GLASS (ЖИДКОЕ СТЕКЛО) - GLOBAL & PRIMITIVES')) {
    fs.appendFileSync(cssPath, injection);
    console.log('Liquid Glass CSS appended successfully.');
} else {
    console.log('Liquid Glass CSS already exists. Skipping append.');
}
