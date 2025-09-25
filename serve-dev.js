#!/usr/bin/env node

/**
 * Simple development server for DozedEnt
 * Properly serves JavaScript modules with correct MIME types
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5501;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DIST_DIR = path.join(__dirname, 'dist');
const SRC_DIR = path.join(__dirname, 'src');

// MIME type mapping
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.wasm': 'application/wasm',
    '.css': 'text/css',
    '.json': 'application/json',
    '.map': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.ogg': 'audio/ogg',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm'
};

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

function serveFile(req, res, filePath) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
        }

        const mimeType = getMimeType(filePath);
        
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        // Set proper MIME type
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
    });
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;
    
    // Remove leading slash
    if (pathname.startsWith('/')) {
        pathname = pathname.substring(1);
    }
    
    // Default to index.html
    if (pathname === '' || pathname === '/') {
        pathname = 'index.html';
    }
    
    // Try to find the file in multiple directories
    let filePath = null;
    let baseDir = null;
    
    // Check public directory first (main game files)
    const publicPath = path.join(PUBLIC_DIR, pathname);
    if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
        filePath = publicPath;
        baseDir = PUBLIC_DIR;
    }
    // Check dist directory (for trystero-wasm.min.js and other dist files)
    else if (pathname.startsWith('dist/')) {
        const distPath = path.join(DIST_DIR, pathname.substring(5)); // Remove 'dist/' prefix
        if (fs.existsSync(distPath) && fs.statSync(distPath).isFile()) {
            filePath = distPath;
            baseDir = DIST_DIR;
        }
    }
    // Check src directory (for wasm.js and other source files)
    else if (pathname.startsWith('src/')) {
        const srcPath = path.join(SRC_DIR, pathname.substring(4)); // Remove 'src/' prefix
        if (fs.existsSync(srcPath) && fs.statSync(srcPath).isFile()) {
            filePath = srcPath;
            baseDir = SRC_DIR;
        }
    }
    // Fallback to public directory
    else {
        filePath = publicPath;
        baseDir = PUBLIC_DIR;
    }
    
    // Security check - ensure file is within allowed directories
    const allowedDirs = [PUBLIC_DIR, DIST_DIR, SRC_DIR];
    if (!allowedDirs.some(dir => filePath.startsWith(dir))) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }
    
    // Check if file exists
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
        }
        
        serveFile(req, res, filePath);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 DozedEnt development server running at http://localhost:${PORT}`);
    console.log(`📁 Serving files from:`);
    console.log(`   - ${PUBLIC_DIR} (main game files)`);
    console.log(`   - ${DIST_DIR} (distribution files)`);
    console.log(`   - ${SRC_DIR} (source files)`);
    console.log(`🎮 Open http://localhost:${PORT} to play the game`);
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
