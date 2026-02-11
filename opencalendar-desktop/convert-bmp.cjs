const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'src-tauri', 'icons');

async function pngToRawBMP(inputPng, outputBmp, width, height) {
  try {
    // Get raw RGB pixel data
    const { data } = await sharp(inputPng)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Create BMP header for 24-bit RGB
    const fileSize = 54 + (width * height * 3);
    const header = Buffer.alloc(54);

    // BMP File Header (14 bytes)
    header.write('BM', 0);                    // Signature
    header.writeUInt32LE(fileSize, 2);        // File size
    header.writeUInt32LE(0, 6);               // Reserved
    header.writeUInt32LE(54, 10);             // Pixel data offset

    // DIB Header (40 bytes - BITMAPINFOHEADER)
    header.writeUInt32LE(40, 14);             // Header size
    header.writeInt32LE(width, 18);           // Width
    header.writeInt32LE(height, 22);          // Height (positive = bottom-up)
    header.writeUInt16LE(1, 26);              // Color planes
    header.writeUInt16LE(24, 28);             // Bits per pixel
    header.writeUInt32LE(0, 30);              // Compression (0 = none)
    header.writeUInt32LE(0, 34);              // Image size (can be 0 for uncompressed)
    header.writeInt32LE(0, 38);               // X pixels per meter (0 = no preference)
    header.writeInt32LE(0, 42);               // Y pixels per meter (0 = no preference)
    header.writeUInt32LE(0, 46);              // Colors in palette (0 = no palette)
    header.writeUInt32LE(0, 50);              // Important colors (0 = all)

    // Convert RGBA to BGR (BMP uses BGR order) and flip rows (bottom-up)
    const rowSize = width * 3;
    const padding = (4 - (rowSize % 4)) % 4;
    const pixelData = Buffer.alloc((rowSize + padding) * height);

    for (let y = 0; y < height; y++) {
      const srcY = height - 1 - y; // Flip vertically for bottom-up
      for (let x = 0; x < width; x++) {
        const srcIdx = (srcY * width + x) * 4; // RGBA
        const dstIdx = y * (rowSize + padding) + x * 3; // BGR
        pixelData[dstIdx + 0] = data[srcIdx + 2]; // B
        pixelData[dstIdx + 1] = data[srcIdx + 1]; // G
        pixelData[dstIdx + 2] = data[srcIdx + 0]; // R
      }
    }

    // Write BMP file
    fs.writeFileSync(outputBmp, Buffer.concat([header, pixelData]));
    console.log(`✓ Created ${path.basename(outputBmp)} (${width}x${height}, 24-bit RGB)`);
  } catch (error) {
    console.error(`✗ Error creating ${outputBmp}:`, error.message);
  }
}

async function main() {
  // NSIS requirements:
  // Header: 150x57 pixels, 24-bit RGB
  // Sidebar: 164x314 pixels, 24-bit RGB

  await pngToRawBMP(
    path.join(iconsDir, 'nsis-header.png'),
    path.join(iconsDir, 'nsis-header.bmp'),
    150, 57
  );

  await pngToRawBMP(
    path.join(iconsDir, 'nsis-sidebar.png'),
    path.join(iconsDir, 'nsis-sidebar.bmp'),
    164, 314
  );

  console.log('\n✓ All NSIS BMP files created successfully!');
}

main();
