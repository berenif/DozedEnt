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

    // Resolve the actual file path, handling relative paths like ../src/
    let filePath = null;
    let baseDir = null;

    // Handle relative paths by resolving them relative to the public directory
    // since that's where the HTML file is served from
    let resolvedPath = pathname;

    // If the path starts with ../, resolve it relative to the public directory
    if (pathname.startsWith('../')) {
        // Remove the ../ and resolve relative to public directory
        const relativePath = pathname.substring(3); // Remove '../'
        resolvedPath = relativePath;
        filePath = path.join(PUBLIC_DIR, '..', relativePath);
    } else {
        filePath = path.join(PUBLIC_DIR, pathname);
    }

    // Check if the file exists at the resolved path
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        // Determine which base directory this file belongs to
        if (filePath.includes(SRC_DIR)) {
            baseDir = SRC_DIR;
        } else if (filePath.includes(DIST_DIR)) {
            baseDir = DIST_DIR;
        } else {
            baseDir = PUBLIC_DIR;
        }
    } else {
        // Fallback to original logic for direct paths
        const normalizedPath = path.normalize(pathname);

        // Check public directory first (main game files)
        const publicPath = path.join(PUBLIC_DIR, normalizedPath);
        if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
            filePath = publicPath;
            baseDir = PUBLIC_DIR;
        }
        // Check dist directory (for trystero-wasm.min.js and other dist files)
        else if (normalizedPath.startsWith('dist/') || normalizedPath.includes('/dist/')) {
            const distPath = path.join(DIST_DIR, normalizedPath.replace(/^.*\/dist\//, ''));
            if (fs.existsSync(distPath) && fs.statSync(distPath).isFile()) {
                filePath = distPath;
                baseDir = DIST_DIR;
            }
        }
        // Check src directory (for CSS, JS, and other source files)
        else if (normalizedPath.includes('/src/') || normalizedPath.startsWith('src/')) {
            const srcPath = path.join(SRC_DIR, normalizedPath.replace(/^.*\/src\//, ''));
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
