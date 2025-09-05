// Proper Sprite Sheet Generator for Player Animations
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple BMP generator for sprite sheet
function createBMPSpriteSheet() {
    const width = 192;
    const height = 192;
    const frameSize = 32;

    // BMP Header
    const fileHeaderSize = 14;
    const dibHeaderSize = 40;
    const pixelDataOffset = fileHeaderSize + dibHeaderSize;
    const fileSize = pixelDataOffset + width * height * 4;

    // Create BMP file header
    const bmpBuffer = Buffer.alloc(fileSize);

    // File header
    bmpBuffer.write('BM', 0); // Signature
    bmpBuffer.writeUInt32LE(fileSize, 2); // File size
    bmpBuffer.writeUInt32LE(0, 6); // Reserved
    bmpBuffer.writeUInt32LE(pixelDataOffset, 10); // Data offset

    // DIB header
    bmpBuffer.writeUInt32LE(dibHeaderSize, 14); // Header size
    bmpBuffer.writeInt32LE(width, 18); // Width
    bmpBuffer.writeInt32LE(-height, 22); // Height (negative for top-down)
    bmpBuffer.writeUInt16LE(1, 26); // Planes
    bmpBuffer.writeUInt16LE(32, 28); // Bits per pixel (RGBA)
    bmpBuffer.writeUInt32LE(0, 30); // Compression
    bmpBuffer.writeUInt32LE(width * height * 4, 34); // Image size
    bmpBuffer.writeInt32LE(0, 38); // X pixels per meter
    bmpBuffer.writeInt32LE(0, 42); // Y pixels per meter
    bmpBuffer.writeUInt32LE(0, 46); // Colors used
    bmpBuffer.writeUInt32LE(0, 50); // Important colors

    // Define colors (BGRA format for BMP)
    const colors = {
        idle: [136, 255, 0, 255],      // Green
        run: [255, 136, 0, 255],       // Blue
        attack: [0, 136, 255, 255],    // Orange
        block: [255, 68, 68, 255],     // Dark blue
        roll: [68, 255, 255, 255],     // Yellow
        hurt: [68, 68, 255, 255]       // Red
    };

    // Generate pixel data
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const frameX = Math.floor(x / frameSize);
            const frameY = Math.floor(y / frameSize);

            let color = [255, 255, 255, 255]; // Default white

            // Determine color based on row
            switch(frameY) {
                case 0: color = colors.idle; break;
                case 1: color = colors.run; break;
                case 2: color = colors.attack; break;
                case 3: color = colors.block; break;
                case 4: color = colors.roll; break;
                case 5: color = colors.hurt; break;
            }

            // Add simple sprite shapes
            const localX = x % frameSize;
            const localY = y % frameSize;

            // Simple stick figure
            if (localY >= 8 && localY <= 24 && localX >= 12 && localX <= 20) {
                // Body
            } else if (localY >= 4 && localY <= 12 && localX >= 14 && localX <= 18) {
                // Head
            } else if ((localX >= 6 && localX <= 10 && localY >= 12 && localY <= 20) ||
                      (localX >= 22 && localX <= 26 && localY >= 12 && localY <= 20)) {
                // Arms
            } else if ((localX >= 10 && localX <= 14 && localY >= 24 && localY <= 28) ||
                      (localX >= 18 && localX <= 22 && localY >= 24 && localY <= 28)) {
                // Legs
            } else {
                color = [255, 255, 255, 0]; // Transparent background
            }

            const pixelIndex = pixelDataOffset + (y * width + x) * 4;
            bmpBuffer[pixelIndex] = color[0];     // B
            bmpBuffer[pixelIndex + 1] = color[1]; // G
            bmpBuffer[pixelIndex + 2] = color[2]; // R
            bmpBuffer[pixelIndex + 3] = color[3]; // A
        }
    }

    return bmpBuffer;
}

// Create and save the sprite sheet
function generateSpriteSheet() {
    console.log('Generating player sprite sheet...');

    const bmpData = createBMPSpriteSheet();
    const outputPath = path.join(__dirname, '..', 'src', 'images', 'player-sprites.png');

    // For now, let's create a simple approach - create a text-based representation
    // and save it as a placeholder, then provide instructions

    const instructions = `
PLAYER SPRITE SHEET NEEDED

The player animation system requires a 192x192 pixel sprite sheet with the following layout:

Dimensions: 192x192 pixels (6x6 grid of 32x32 frames)

Animation States (rows):
0. Idle: Green stick figure frames
1. Running: Blue running animation frames
2. Attack: Orange attack animation frames
3. Block: Dark blue blocking pose
4. Roll: Yellow rolling frames
5. Hurt: Red hurt/damage frames

To create the sprite sheet:
1. Open create-sprite-sheet.html in your browser
2. The canvas will show a generated sprite sheet
3. Click "Download Sprite Sheet" to save player-sprites.png
4. Place the downloaded file in src/images/player-sprites.png

For now, the animation system will use colored rectangles as fallback.
`;

    // Save instructions
    fs.writeFileSync(outputPath.replace('.png', '_instructions.txt'), instructions);

    // Try to create a simple BMP file
    try {
        fs.writeFileSync(outputPath.replace('.png', '.bmp'), bmpData);
        console.log('Created basic BMP sprite sheet');
    } catch (error) {
        console.log('Could not create BMP file:', error.message);
    }

    console.log('Sprite sheet generation completed. Check the instructions file for details.');
}

generateSpriteSheet();
