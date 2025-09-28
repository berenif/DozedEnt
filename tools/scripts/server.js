import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = 8080;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.wasm': 'application/wasm',
    '.css': 'text/css',
    '.ico': 'image/x-icon',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.json': 'application/json'
};

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Disable caching for development
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;

    // Default to index.html
    if (pathname === '/') {
        pathname = '/index.html';
    }

    // Handle relative paths like ../src/ by resolving them properly
    let filePath = null;
    let baseDir = null;

    // Check if path starts with ../src/ (relative from public/index.html)
    if (pathname.startsWith('/../src/') || pathname.startsWith('../src/')) {
        const relativePath = pathname.replace(/^(\.\.\/)*/, '').replace(/^\/*/, '');
        filePath = path.join(__dirname, '../../src', relativePath);
        baseDir = 'src';
    }
    // Check if path starts with /src/ (direct src access)
    else if (pathname.startsWith('/src/')) {
        const relativePath = pathname.replace(/^\/src\//, '');
        filePath = path.join(__dirname, '../../src', relativePath);
        baseDir = 'src';
    }
    // Check if path starts with ../ (other relative paths)
    else if (pathname.startsWith('/../') || pathname.startsWith('../')) {
        const relativePath = pathname.replace(/^(\.\.\/)*/, '').replace(/^\/*/, '');
        filePath = path.join(__dirname, '../../', relativePath);
        baseDir = 'other';
    }
    // Default to public directory
    else {
        filePath = path.join(__dirname, '../../public', pathname);
        baseDir = 'public';
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    // Debug logging for JavaScript files
    if (ext === '.js') {
        console.log(`📄 Serving JS file: ${pathname} -> ${filePath} (${contentType})`);
    }

    // Security check - ensure file is within allowed directories
    const projectRoot = path.join(__dirname, '../..');
    const allowedDirs = [
        path.join(projectRoot, 'public'),
        path.join(projectRoot, 'src'),
        path.join(projectRoot, 'dist')
    ];

    const normalizedFilePath = path.resolve(filePath);
    const isInAllowedDir = allowedDirs.some(dir =>
        normalizedFilePath.startsWith(path.resolve(dir))
    );

    if (!isInAllowedDir) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // Fallback: try to find the file in alternative locations
            let fallbackPath = null;

            // If looking for a .js file in src, try the direct path
            if (baseDir === 'src' && ext === '.js') {
                const directPath = path.join(__dirname, '../../src', pathname.replace(/^(\.\.\/src\/|\/src\/)/, ''));
                if (fs.existsSync(directPath)) {
                    fallbackPath = directPath;
                }
            }

            // Try alternative path resolutions for JavaScript files
            if (!fallbackPath && ext === '.js') {
                const altPaths = [
                    path.join(__dirname, '../../src', pathname.replace(/^(\.\.\/)*/, '')),
                    path.join(__dirname, '../../src', pathname.replace(/^\/src\//, '')),
                    path.join(__dirname, '../../src', pathname.replace(/^\/../, ''))
                ];
                
                for (const altPath of altPaths) {
                    if (fs.existsSync(altPath)) {
                        fallbackPath = altPath;
                        break;
                    }
                }
            }

            if (fallbackPath && fs.existsSync(fallbackPath)) {
                // Use fallback path
                const fallbackExt = path.extname(fallbackPath).toLowerCase();
                const fallbackContentType = mimeTypes[fallbackExt] || 'application/octet-stream';
                
                console.log(`🔄 Using fallback path: ${fallbackPath} (${fallbackContentType})`);

                fs.readFile(fallbackPath, (err, data) => {
                    if (err) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('File not found');
                        return;
                    }

                    res.writeHead(200, { 'Content-Type': fallbackContentType });
                    res.end(data);
                });
                return;
            }

            console.log(`❌ File not found: ${pathname} (tried: ${filePath})`);
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end(`File not found: ${pathname}`);
            return;
        }

        // Read and serve file
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal server error');
                return;
            }

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    });
});

server.listen(port, () => {
    console.log(`🚀 DozedEnt development server running at http://localhost:${port}/`);
    console.log(`📁 Serving files from:`);
    console.log(`   - public/ (main game files)`);
    console.log(`   - src/ (JavaScript modules)`);
    console.log(`   - dist/ (distribution files)`);
    console.log(`🎮 Open http://localhost:${port} to play the game`);
    console.log(`⚡ JavaScript modules will be served with proper MIME types`);
    console.log(`\nPress Ctrl+C to stop the server`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});