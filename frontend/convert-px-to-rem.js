import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.join(__dirname, 'src');

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walk(filepath, callback);
    } else if (stat.isFile()) {
      callback(filepath);
    }
  }
}

function convertFile(filepath) {
  const ext = path.extname(filepath);
  if (!['.vue', '.js', '.css', '.html'].includes(ext)) return;
  
  let content = fs.readFileSync(filepath, 'utf8');
  let modified = false;
  
  // Match text-[XXpx] or text-[XX.XXpx]
  const regex = /text-\[(\d+\.?\d*)px\]/g;
  
  const newContent = content.replace(regex, (match, pxStr) => {
    const px = parseFloat(pxStr);
    const rem = px / 16;
    modified = true;
    return `text-[${rem}rem]`;
  });
  
  if (modified) {
    fs.writeFileSync(filepath, newContent, 'utf8');
    console.log(`Converted: ${filepath}`);
  }
}

// Convert all files in src
walk(targetDir, convertFile);

// Convert index.html in root
const indexHtmlPath = path.join(__dirname, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  convertFile(indexHtmlPath);
}

console.log('Conversion completed.');
