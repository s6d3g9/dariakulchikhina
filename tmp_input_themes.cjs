const fs = require('fs');
const css = fs.readFileSync('app/assets/css/main.css', 'utf8');

const glassInputMatches = css.match(/(\.glass-input[\s\S]*?)(?=\/\* ---|\Z)/g);
if (glassInputMatches) {
    fs.writeFileSync('tmp_inputs_css.txt', glassInputMatches.join('\n'));
}
