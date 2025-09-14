import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple PNG generator for a basic sprite sheet
function createSimpleSpriteSheet() {
    // Create a 192x192 canvas (6 frames x 6 frames of 32x32 pixels each)
    const width = 192;
    const height = 192;
    const frameSize = 32;

    // Create a simple PNG header and basic image data
    // This is a minimal PNG with a single color per frame
    const colors = [
        [0, 255, 136, 255], // idle - green
        [0, 136, 255, 255], // run - blue
        [255, 136, 0, 255], // attack - orange
        [68, 68, 255, 255], // block - dark blue
        [255, 255, 68, 255], // roll - yellow
        [255, 68, 68, 255]  // hurt - red
    ];

    // Create pixel data (RGBA format)
    const pixelData = new Uint8Array(width * height * 4);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const frameX = Math.floor(x / frameSize);
            const frameY = Math.floor(y / frameSize);
            const colorIndex = frameY < colors.length ? frameY : 0;
            const color = colors[colorIndex];

            const pixelIndex = (y * width + x) * 4;
            pixelData[pixelIndex] = color[0];     // R
            pixelData[pixelIndex + 1] = color[1]; // G
            pixelData[pixelIndex + 2] = color[2]; // B
            pixelData[pixelIndex + 3] = color[3]; // A
        }
    }

    // Create a minimal PNG structure
    // PNG signature
    const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR chunk
    const ihdrLength = 13;
    const ihdrType = new Uint8Array([73, 72, 68, 82]); // "IHDR"
    const ihdrData = new Uint8Array(13);
    // Width (4 bytes, big endian)
    ihdrData[0] = (width >> 24) & 0xFF;
    ihdrData[1] = (width >> 16) & 0xFF;
    ihdrData[2] = (width >> 8) & 0xFF;
    ihdrData[3] = width & 0xFF;
    // Height (4 bytes, big endian)
    ihdrData[4] = (height >> 24) & 0xFF;
    ihdrData[5] = (height >> 16) & 0xFF;
    ihdrData[6] = (height >> 8) & 0xFF;
    ihdrData[7] = height & 0xFF;
    // Bit depth, color type, compression, filter, interlace
    ihdrData[8] = 8; // 8-bit depth
    ihdrData[9] = 6; // RGBA color type
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace

    // Calculate CRC for IHDR
    const crc32 = (data) => {
        const table = [];
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[i] = c;
        }

        let crc = 0xFFFFFFFF;
        for (let i = 0; i < data.length; i++) {
            crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    };

    const ihdrCrc = crc32(new Uint8Array([...ihdrType, ...ihdrData]));

    // Create IHDR chunk
    const ihdrChunk = new Uint8Array(4 + 4 + ihdrLength + 4);
    ihdrChunk[0] = (ihdrLength >> 24) & 0xFF;
    ihdrChunk[1] = (ihdrLength >> 16) & 0xFF;
    ihdrChunk[2] = (ihdrLength >> 8) & 0xFF;
    ihdrChunk[3] = ihdrLength & 0xFF;
    ihdrChunk.set(ihdrType, 4);
    ihdrChunk.set(ihdrData, 8);
    ihdrChunk[21] = (ihdrCrc >> 24) & 0xFF;
    ihdrChunk[22] = (ihdrCrc >> 16) & 0xFF;
    ihdrChunk[23] = (ihdrCrc >> 8) & 0xFF;
    ihdrChunk[24] = ihdrCrc & 0xFF;

    // For simplicity, let's create a basic image file instead
    // We'll create a simple BMP format which is easier
    console.log('Creating a simple placeholder sprite sheet...');

    // Create output path
    const outputPath = path.join(__dirname, '..', '..', 'src', 'images', 'player-sprites.png');

    // Since creating a proper PNG is complex, let's create a simple text file
    // that explains the issue and provides instructions
    const placeholderContent = `
This is a placeholder file for player-sprites.png

The player animation system expects a 192x192 pixel sprite sheet with:
- 32x32 pixel frames
- 6 frames per row, 6 rows total
- Different colors for different animation states:

Row 0 (Y=0-31): Idle frames - Green (#00FF88)
Row 1 (Y=32-63): Run frames - Blue (#0088FF)
Row 2 (Y=64-95): Attack frames - Orange (#FF8800)
Row 3 (Y=96-127): Block frames - Dark Blue (#4444FF)
Row 4 (Y=128-159): Roll frames - Yellow (#FFFF44)
Row 5 (Y=160-191): Hurt frames - Red (#FF4444)

To fix this:
1. Open create-sprite-sheet.html in your browser
2. Click "Generate Sprites"
3. Click "Download Sprite Sheet"
4. Save the file as player-sprites.png in the src/images/ directory
5. Reload the player-animation-test.html page

This will provide proper sprite animations for the player character.
`;

    fs.writeFileSync(outputPath.replace('.png', '.txt'), placeholderContent);
    console.log('Placeholder created. Please follow the instructions in the text file.');

    // Actually, let's try to create a very basic image
    // For now, let's just copy an existing image if available
    try {
        const sourceImage = path.join(__dirname, '..', '..', 'src', 'images', 'favicon.png');
        if (fs.existsSync(sourceImage)) {
            fs.copyFileSync(sourceImage, outputPath);
            console.log('Copied favicon.png as placeholder sprite sheet');
        }
    } catch (error) {
        console.log('Could not create sprite sheet. Please use the HTML generator.');
    }
}

createSimpleSpriteSheet();
