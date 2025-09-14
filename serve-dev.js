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

const PORT = 8081;
const DOCS_DIR = path.join(__dirname, 'docs');

// MIME type mapping
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.wasm': 'application/wasm',
    '.css': 'text/css',
    '.json': 'application/json',
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
    
    const filePath = path.join(DOCS_DIR, pathname);
    
    // Security check - ensure file is within docs directory
    if (!filePath.startsWith(DOCS_DIR)) {
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
    console.log(`📁 Serving files from: ${DOCS_DIR}`);
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
