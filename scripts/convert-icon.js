const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../app/icon.svg');
const outputDir = path.join(__dirname, '../app');

async function convertIcon() {
  try {
    // Lezen van de SVG
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Converteren naar verschillende PNG formaten
    const sizes = [
      { size: 16, name: 'icon-16.png' },
      { size: 32, name: 'icon-32.png' },
      { size: 48, name: 'icon-48.png' },
      { size: 192, name: 'icon-192.png' },
      { size: 512, name: 'icon-512.png' },
    ];

    console.log('Converteren van SVG naar PNG...');
    for (const { size, name } of sizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, name));
      console.log(`✓ ${name} (${size}x${size}) aangemaakt`);
    }

    // Favicon.ico maken (16x16 en 32x32)
    console.log('Converteren naar favicon.ico...');
    const favicon16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
    const favicon32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
    
    // Voor ICO formaat gebruiken we gewoon PNG (browsers accepteren dit ook)
    // Next.js gebruikt automatisch icon.png als favicon
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(outputDir, 'favicon.png'));
    
    console.log('✓ favicon.png aangemaakt');
    console.log('\nKlaar! Iconen zijn geconverteerd.');
  } catch (error) {
    console.error('Fout bij converteren:', error);
    process.exit(1);
  }
}

convertIcon();
