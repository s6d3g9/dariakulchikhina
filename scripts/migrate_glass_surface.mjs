import fs from 'fs';
import path from 'path';

const dir = '/Users/oxo/work/dariakulchikhina';

function getAllVueFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.nuxt') && !file.includes('.git')) {
        arrayOfFiles = getAllVueFiles(path.join(dirPath, file), arrayOfFiles);
      }
    } else {
      if (file.endsWith('.vue')) {
        arrayOfFiles.push(path.join(dirPath, file));
      }
    }
  });
  return arrayOfFiles;
}

const vueFiles = getAllVueFiles(path.join(dir, 'app'));
let totalChanged = 0;

vueFiles.forEach(filepath => {
  let content = fs.readFileSync(filepath, 'utf-8');
  let originalContent = content;

  while (true) {
    let regex = /<div([^>]*?\bglass-card\b[^>]*?)>/i;
    let match = content.match(regex);
    if (!match) break;

    let startIndex = match.index;
    let innerContentStartIndex = startIndex + match[0].length;
    
    // Find matching closing div
    let depth = 1;
    let currentIndex = innerContentStartIndex;
    let endIndex = -1;

    while (depth > 0 && currentIndex < content.length) {
      let nextDivOpen = content.indexOf('<div', currentIndex);
      let nextDivClose = content.indexOf('</div', currentIndex);

      if (nextDivClose === -1) {
        break; // Syntax error in file
      }

      if (nextDivOpen !== -1 && nextDivOpen < nextDivClose) {
        depth++;
        currentIndex = nextDivOpen + 4;
      } else {
        depth--;
        currentIndex = nextDivClose + 5;
        if (depth === 0) {
          endIndex = nextDivClose;
        }
      }
    }

    if (endIndex === -1) {
      console.warn("Could not find matching closing div in", filepath);
      break;
    }

    // Replace the opening tag
    // Convert `<div class="something glass-card something" [...]>`
    // to `<GlassSurface class="something something" [...]>`
    let attrs = match[1];
    // Remove glass-card class
    attrs = attrs.replace(/\bglass-card\b/g, '').replace(/class="\s+"/g, ''); // cleanup empty class
    // clean up multiple spaces
    attrs = attrs.replace(/\s+/g, ' ');

    let newOpenTag = `<GlassSurface${attrs}>`;
    let newCloseTag = `</GlassSurface>`;

    let before = content.slice(0, startIndex);
    let middle = content.slice(innerContentStartIndex, endIndex);
    let after = content.slice(endIndex + 6); // length of '</div>'

    content = before + newOpenTag + middle + newCloseTag + after;
  }

  if (content !== originalContent) {
    fs.writeFileSync(filepath, content, 'utf-8');
    totalChanged++;
    console.log("Updated:", filepath.replace(dir, ''));
  }
});

console.log(`Total files updated: ${totalChanged}`);
