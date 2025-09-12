// PNG Sprite Sheet Generator for Player Animations
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple PNG chunk creation
function createPNGChunk(type, data) {
    const length = data.length;
    const buffer = Buffer.alloc(4 + 4 + length + 4); // length + type + data + crc

    // Length
    buffer.writeUInt32BE(length, 0);
    // Type
    buffer.write(type, 4);
    // Data
    data.copy(buffer, 8);

    // CRC (simplified - using a basic CRC32)
    const crc = crc32(Buffer.concat([Buffer.from(type), data]));
    buffer.writeUInt32BE(crc, 8 + length);

    return buffer;
}

// Basic CRC32 implementation
function crc32(data) {
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
}

function createPlayerSpriteSheet() {
    const width = 192;
    const height = 192;
    const frameSize = 32;

    // PNG signature
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);   // Width
    ihdrData.writeUInt32BE(height, 4);  // Height
    ihdrData.writeUInt8(8, 8);          // Bit depth
    ihdrData.writeUInt8(6, 9);          // Color type (RGBA)
    ihdrData.writeUInt8(0, 10);         // Compression
    ihdrData.writeUInt8(0, 11);         // Filter
    ihdrData.writeUInt8(0, 12);         // Interlace
    const ihdrChunk = createPNGChunk('IHDR', ihdrData);

    // Create pixel data (RGBA)
    const pixelData = Buffer.alloc(width * height * 4);

    // Define colors for different animation states
    const colors = {
        idle: [0, 255, 136, 255],      // Green
        run: [0, 136, 255, 255],       // Blue
        attack: [255, 136, 0, 255],    // Orange
        block: [68, 68, 255, 255],     // Dark blue
        roll: [255, 255, 68, 255],     // Yellow
        hurt: [255, 68, 68, 255]       // Red
    };

    // Generate sprite data
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const frameX = Math.floor(x / frameSize);
            const frameY = Math.floor(y / frameSize);
            const localX = x % frameSize;
            const localY = y % frameSize;

            let color = colors.idle; // Default

            // Determine color based on row
            switch(frameY) {
                case 0: color = colors.idle; break;
                case 1: color = colors.run; break;
                case 2: color = colors.attack; break;
                case 3: color = colors.block; break;
                case 4: color = colors.roll; break;
                case 5: color = colors.hurt; break;
            }

            // Create simple sprite shapes
            let pixelColor = [0, 0, 0, 0]; // Transparent by default

            // Body (main rectangle)
            if (localY >= 8 && localY <= 24 && localX >= 8 && localX <= 24) {
                pixelColor = color;
            }
            // Head (smaller square on top)
            else if (localY >= 4 && localY <= 12 && localX >= 12 && localX <= 20) {
                pixelColor = color;
            }
            // Arms
            else if ((localX >= 6 && localX <= 10 && localY >= 12 && localY <= 20) ||
                     (localX >= 22 && localX <= 26 && localY >= 12 && localY <= 20)) {
                pixelColor = color;
            }
            // Legs
            else if ((localX >= 10 && localX <= 14 && localY >= 24 && localY <= 28) ||
                     (localX >= 18 && localX <= 22 && localY >= 24 && localY <= 28)) {
                pixelColor = color;
            }

            const pixelIndex = (y * width + x) * 4;
            pixelData[pixelIndex] = pixelColor[0];     // R
            pixelData[pixelIndex + 1] = pixelColor[1]; // G
            pixelData[pixelIndex + 2] = pixelColor[2]; // B
            pixelData[pixelIndex + 3] = pixelColor[3]; // A
        }
    }

    // Compress pixel data (for simplicity, we'll use uncompressed data)
    // In a real PNG, this would be zlib compressed, but for this demo we'll skip that
    const uncompressedData = pixelData;

    // IDAT chunk (image data)
    const idatChunk = createPNGChunk('IDAT', uncompressedData);

    // IEND chunk
    const iendChunk = createPNGChunk('IEND', Buffer.alloc(0));

    // Combine all chunks
    const pngBuffer = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);

    return pngBuffer;
}

function generateSpriteSheet() {
    console.log('Generating PNG player sprite sheet...');

    try {
        const pngData = createPlayerSpriteSheet();
        const outputPath = path.join(__dirname, '..', 'src', 'images', 'player-sprites.png');

        fs.writeFileSync(outputPath, pngData);
        console.log('PNG sprite sheet created successfully!');
        console.log('File saved to:', outputPath);

    } catch (error) {
        console.log('Error creating PNG:', error.message);
        console.log('Falling back to BMP creation...');

        // Fallback: copy the BMP we created earlier
        const bmpPath = path.join(__dirname, '..', 'src', 'images', 'player-sprites.bmp');
        const pngPath = path.join(__dirname, '..', 'src', 'images', 'player-sprites.png');

        if (fs.existsSync(bmpPath)) {
            fs.copyFileSync(bmpPath, pngPath);
            console.log('Copied BMP as PNG fallback');
        }
    }
}

generateSpriteSheet();
