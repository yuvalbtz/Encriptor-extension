import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple SVG icon
const svgIcon = `<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="24" fill="#2196F3"/>
  <path d="M64 32L96 96H32L64 32Z" fill="white"/>
</svg>`;

// Ensure the public directory exists
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Write the SVG file
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon);

console.log('Icon files generated successfully!'); 