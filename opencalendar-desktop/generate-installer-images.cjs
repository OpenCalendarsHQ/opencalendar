const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const iconsDir = path.join(__dirname, 'src-tauri/icons');
const sourceIcon = path.join(__dirname, '../public/icon-512.png');

async function generateInstallerImages() {
  try {
    console.log('🎨 Generating NSIS installer images...');

    if (!fs.existsSync(sourceIcon)) {
      console.error('❌ Source icon not found:', sourceIcon);
      process.exit(1);
    }

    // NSIS Banner (top of installer) - 150x57 pixels
    // Blue gradient background with logo
    await sharp({
      create: {
        width: 150,
        height: 57,
        channels: 4,
        background: { r: 0, g: 128, b: 255, alpha: 1 }
      }
    })
    .composite([
      {
        input: await sharp(sourceIcon)
          .resize(40, 40)
          .toBuffer(),
        top: Math.floor((57 - 40) / 2),
        left: 10
      }
    ])
    .png()
    .toFile(path.join(iconsDir, 'nsis-header.png'));

    console.log('✅ Created nsis-header.png (150x57)');

    // NSIS Sidebar (left side of installer) - 164x314 pixels
    // Blue gradient with centered logo
    await sharp({
      create: {
        width: 164,
        height: 314,
        channels: 4,
        background: { r: 0, g: 80, b: 200, alpha: 1 }
      }
    })
    .composite([
      {
        input: await sharp(sourceIcon)
          .resize(120, 120)
          .toBuffer(),
        top: Math.floor((314 - 120) / 2),
        left: Math.floor((164 - 120) / 2)
      }
    ])
    .png()
    .toFile(path.join(iconsDir, 'nsis-sidebar.png'));

    console.log('✅ Created nsis-sidebar.png (164x314)');
    
    console.log('✨ NSIS installer images generated successfully!');

  } catch (error) {
    console.error('❌ Error generating installer images:', error);
    process.exit(1);
  }
}

generateInstallerImages();
