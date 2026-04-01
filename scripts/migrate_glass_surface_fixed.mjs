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
  let preventInfinite = 0;

  while (preventInfinite < 50) {
    preventInfinite++;
    let regex = /<div([^>]*?\bglass-card\b[^>]*?)>/i;
    let match = content.match(regex);
    if (!match) break;

    let startIndex = match.index;
    let innerContentStartIndex = startIndex + match[0].length;

    // Ensure it wasn't self-closing
    if (match[0].endsWith('/>')) {
      // Just replace this tag and move on
      let attrs = match[1];
      attrs = attrs.replace(/\bglass-card\b/g, '').replace(/class="\s*"/g, '').replace(/\s+/g, ' ');
      let newTag = `<GlassSurface${attrs}/>`;
      content = content.slice(0, startIndex) + newTag + content.slice(innerContentStartIndex);
      continue;
    }
    
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
        // Okay, we found a div before closing tag. But is it self-closing?
        // Let's find the `>` of the opening tag.
        let tagEndIndex = content.indexOf('>', nextDivOpen);
        if (tagEndIndex !== -1 && content.charAt(tagEndIndex - 1) === '/') {
           // self-closing
           currentIndex = tagEndIndex + 1;
           // depth remains same
        } else {
           depth++;
           currentIndex = tagEndIndex + 1;
        }
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
    attrs = attrs.replace(/\bglass-card\b/g, '');
    attrs = attrs.replace(/class="\s+"/gi, ''); 
    attrs = attrs.replace(/\s+/g, ' ');

    let newOpenTag = `<GlassSurface ${attrs}>`;
    newOpenTag = newOpenTag.replace(/ >/g, '>');

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
