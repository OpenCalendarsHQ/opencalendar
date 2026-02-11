const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const iconsDir = path.join(__dirname, 'src-tauri/icons');
const sourceIcon = path.join(__dirname, '../public/icon-512.png');

// All required Tauri icon sizes
const pngSizes = [
  { size: 32, name: '32x32.png' },
  { size: 128, name: '128x128.png' },
  { size: 256, name: '128x128@2x.png' },
  { size: 512, name: 'icon.png' },
];

// Windows Store logo sizes
const storeSizes = [
  { size: 30, name: 'Square30x30Logo.png' },
  { size: 44, name: 'Square44x44Logo.png' },
  { size: 71, name: 'Square71x71Logo.png' },
  { size: 89, name: 'Square89x89Logo.png' },
  { size: 107, name: 'Square107x107Logo.png' },
  { size: 142, name: 'Square142x142Logo.png' },
  { size: 150, name: 'Square150x150Logo.png' },
  { size: 284, name: 'Square284x284Logo.png' },
  { size: 310, name: 'Square310x310Logo.png' },
  { size: 50, name: 'StoreLogo.png' },
];

async function convertIcon() {
  try {
    console.log('🔄 Converting icons from source:', sourceIcon);
    
    if (!fs.existsSync(sourceIcon)) {
      console.error('❌ Source icon not found:', sourceIcon);
      process.exit(1);
    }

    // Check if sharp is available, otherwise use basic copy
    let sharp;
    try {
      sharp = require('sharp');
    } catch {
      console.log('⚠️  sharp not installed, using basic icon copy...');
      console.log('   Run: npm install sharp --save-dev for proper icon resizing');
      
      // Fallback: copy source icon to required locations
      const source192 = path.join(__dirname, '../public/icon-192.png');
      const source512 = path.join(__dirname, '../public/icon-512.png');
      
      fs.copyFileSync(source512, path.join(iconsDir, 'icon.png'));
      fs.copyFileSync(source192, path.join(iconsDir, '128x128.png'));
      fs.copyFileSync(source192, path.join(iconsDir, '128x128@2x.png'));
      fs.copyFileSync(source192, path.join(iconsDir, '32x32.png'));
      
      // Generate .ico from 192px
      const input = fs.readFileSync(source192);
      const ico = await toIco([input], { sizes: [128, 64, 48, 32, 16] });
      fs.writeFileSync(path.join(iconsDir, 'icon.ico'), ico);
      
      console.log('✅ Basic icon conversion complete!');
      return;
    }

    // Generate PNG icons at all required sizes
    for (const { size, name } of [...pngSizes, ...storeSizes]) {
      await sharp(sourceIcon)
        .resize(size, size)
        .png()
        .toFile(path.join(iconsDir, name));
      console.log(`   ✅ ${name} (${size}x${size})`);
    }

    // Generate .ico file
    const icoSizes = [256, 128, 64, 48, 32, 16];
    const icoBuffers = await Promise.all(
      icoSizes.map(size => sharp(sourceIcon).resize(size, size).png().toBuffer())
    );
    const ico = await toIco(icoBuffers);
    fs.writeFileSync(path.join(iconsDir, 'icon.ico'), ico);
    console.log('   ✅ icon.ico');

    // Generate .icns for macOS (if iconutil is available)
    try {
      const iconsetDir = path.join(iconsDir, 'icon.iconset');
      if (!fs.existsSync(iconsetDir)) {
        fs.mkdirSync(iconsetDir);
      }
      
      const icnsSizes = [
        { size: 16, name: 'icon_16x16.png' },
        { size: 32, name: 'icon_16x16@2x.png' },
        { size: 32, name: 'icon_32x32.png' },
        { size: 64, name: 'icon_32x32@2x.png' },
        { size: 128, name: 'icon_128x128.png' },
        { size: 256, name: 'icon_128x128@2x.png' },
        { size: 256, name: 'icon_256x256.png' },
        { size: 512, name: 'icon_256x256@2x.png' },
        { size: 512, name: 'icon_512x512.png' },
        { size: 1024, name: 'icon_512x512@2x.png' },
      ];

      for (const { size, name } of icnsSizes) {
        await sharp(sourceIcon)
          .resize(size, size)
          .png()
          .toFile(path.join(iconsetDir, name));
      }

      // Try to run iconutil on macOS
      try {
        execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(iconsDir, 'icon.icns')}"`);
        console.log('   ✅ icon.icns');
      } catch {
        // Not on macOS, copy 512px as placeholder
        fs.copyFileSync(path.join(iconsDir, 'icon.png'), path.join(iconsDir, 'icon.icns'));
        console.log('   ⚠️  icon.icns (placeholder - run on macOS for proper .icns)');
      }
      
      // Clean up iconset folder
      fs.rmSync(iconsetDir, { recursive: true, force: true });
    } catch (icnsError) {
      console.log('   ⚠️  icon.icns skipped:', icnsError.message);
    }

    console.log('\n✅ All icons converted successfully!');
  } catch (error) {
    console.error('❌ Error converting icons:', error);
    process.exit(1);
  }
}

convertIcon();
