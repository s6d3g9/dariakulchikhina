const fs = require('fs');
const content = fs.readFileSync('settings.vue.txt', 'utf-8');
const template = content.substring(content.indexOf('<template>'));
fs.writeFileSync('settings_template.txt', template);
