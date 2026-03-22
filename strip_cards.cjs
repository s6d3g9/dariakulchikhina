const fs = require('fs');

let content = fs.readFileSync('messenger/web/app/components/messenger/MessengerSettingsSection.vue', 'utf8');

// Replace VCard wrappers with simple divs
content = content.replace(/<VCard\b[^>]*class="([^"]*)"[^>]*>/g, '<div class="$1">');
content = content.replace(/<VCard\b[^>]*>/g, '<div>');
content = content.replace(/<\/VCard>/g, '</div>');

content = content.replace(/<VCardText\b[^>]*class="([^"]*)"[^>]*>/g, '<div class="$1">');
content = content.replace(/<VCardText\b[^>]*>/g, '<div>');
content = content.replace(/<\/VCardText>/g, '</div>');

// Write back
fs.writeFileSync('messenger/web/app/components/messenger/MessengerSettingsSection.vue', content);
console.log('Cards stripped');
