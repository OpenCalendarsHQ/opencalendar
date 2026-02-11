import { createCanvas, registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';

// Create OG image (1200x630)
const width = 1200;
const height = 630;

const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Create Aurora-like gradient background
const gradient = ctx.createRadialGradient(
  width / 2, height / 2, 0,
  width / 2, height / 2, width
);

// Aurora colors from the app
gradient.addColorStop(0, '#0080ff');
gradient.addColorStop(0.4, '#00ffff');
gradient.addColorStop(0.8, '#004080');
gradient.addColorStop(1, '#0a0a0a');

ctx.fillStyle = gradient;
ctx.fillRect(0, 0, width, height);

// Add some noise/texture for the aurora effect
for (let i = 0; i < 100; i++) {
  const x = Math.random() * width;
  const y = Math.random() * height;
  const radius = Math.random() * 200 + 50;
  const opacity = Math.random() * 0.1;
  
  const auroraGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  auroraGradient.addColorStop(0, `rgba(0, 255, 255, ${opacity})`);
  auroraGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
  
  ctx.fillStyle = auroraGradient;
  ctx.fillRect(0, 0, width, height);
}

// Add dark vignette overlay
const vignette = ctx.createRadialGradient(
  width / 2, height / 2, width * 0.3,
  width / 2, height / 2, width * 0.8
);
vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
vignette.addColorStop(1, 'rgba(0, 0, 0, 0.6)');

ctx.fillStyle = vignette;
ctx.fillRect(0, 0, width, height);

// Try to load Geist Pixel font (fallback to system monospace)
const fontPath = path.join(process.cwd(), 'node_modules', 'geist', 'dist', 'fonts', 'geist-pixel', 'GeistPixelSquare.woff2');
if (fs.existsSync(fontPath)) {
  try {
    registerFont(fontPath, { family: 'Geist Pixel' });
  } catch (e) {
    console.log('Could not register Geist Pixel font, using fallback');
  }
}

// Draw title
ctx.fillStyle = '#ffffff';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

// Try Geist Pixel, fallback to monospace
ctx.font = 'bold 80px "Geist Pixel", monospace';
ctx.fillText('OPENCALENDARS', width / 2, height / 2 - 30);

// Draw tagline
ctx.font = '36px "Geist Pixel", system-ui, sans-serif';
ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
ctx.fillText('Al je kalenders op één plek', width / 2, height / 2 + 60);

// Draw subtext
ctx.font = '24px system-ui, sans-serif';
ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
ctx.fillText('Google Calendar • iCloud • Microsoft • CalDAV', width / 2, height / 2 + 120);

// Save the image
const outputPath = path.join(process.cwd(), 'public', 'og-image.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);

console.log(`✅ OG image generated: ${outputPath}`);
console.log(`Dimensions: ${width}x${height}`);
