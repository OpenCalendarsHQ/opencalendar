const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

async function convertIcon() {
  try {
    // Use 192px icon instead of 512px (max size for ICO is 256)
    const inputPath = path.join(__dirname, '../public/icon-192.png');
    const outputPath = path.join(__dirname, 'src-tauri/icons/icon.ico');

    const input = fs.readFileSync(inputPath);
    const ico = await toIco([input], { sizes: [128, 64, 48, 32, 16] });

    fs.writeFileSync(outputPath, ico);
    console.log('✅ Icon converted successfully!');
    console.log('   Output:', outputPath);
  } catch (error) {
    console.error('❌ Error converting icon:', error);
    process.exit(1);
  }
}

convertIcon();
