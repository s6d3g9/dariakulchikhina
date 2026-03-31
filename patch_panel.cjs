const fs = require('fs');
const path = 'app/components/UIDesignPanel.vue';
let content = fs.readFileSync(path, 'utf8');

const strToRemove = `                  <div class="dp-field">
                    <label class="dp-label">насыщенность <span class="dp-val">{{ tokens.glassSaturation }}%</span></label>
                    <input type="range" min="100" max="200" step="5" :value="tokens.glassSaturation" class="dp-range" @input="onRange('glassSaturation', $event)">
                  </div>`;

if (content.includes(strToRemove)) {
  content = content.replace(strToRemove + '\n', '');
  fs.writeFileSync(path, content, 'utf8');
  console.log('Removed duplicate code');
} else {
  console.log('Not found');
}
