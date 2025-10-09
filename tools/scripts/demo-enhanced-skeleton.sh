#!/bin/bash

# Enhanced Skeleton Physics Demo Script
# This script builds the enhanced WASM skeleton physics and serves the demo

set -e

echo "🚀 Enhanced WASM Skeleton Physics Demo"
echo "======================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Build the enhanced WASM module
echo "📦 Building enhanced WASM skeleton physics..."
npm run wasm:build

if [ $? -eq 0 ]; then
    echo "✅ WASM build completed successfully"
else
    echo "❌ WASM build failed"
    exit 1
fi

# Check if the enhanced demo exists
if [ ! -f "public/demos/enhanced-skeleton-physics.html" ]; then
    echo "❌ Error: Enhanced demo not found at public/demos/enhanced-skeleton-physics.html"
    exit 1
fi

# Start the demo server
echo "🌐 Starting demo server..."
echo ""
echo "🎮 Enhanced Skeleton Physics Demo"
echo "================================"
echo ""
echo "📋 Features:"
echo "  • Balance Strategies (Ankle, Hip, Stepping, Adaptive)"
echo "  • Foot Contact Detection (Heel, Midfoot, Toe)"
echo "  • Collision Detection (Ground collision, Penetration resolution)"
echo "  • Deterministic Fixed-Point Math (Multiplayer ready)"
echo "  • Real-time Physics Simulation (60 FPS)"
echo "  • Interactive 3D Visualization"
echo ""
echo "🔗 Open in browser:"
echo "  http://localhost:8080/demos/standalone-skeleton-physics.html"
echo "  http://localhost:8080/demos/enhanced-skeleton-physics.html"
echo ""
echo "🎯 Controls:"
echo "  • Reset Pose - Reset skeleton to default pose"
echo "  • Apply Disturbance - Apply random forces to test balance"
echo "  • Toggle Physics - Enable/disable physics simulation"
echo "  • Balance Strategy - Select balance strategy mode"
echo "  • Physics Settings - Adjust gravity, collision, foot contact"
echo ""
echo "📊 Monitor:"
echo "  • Performance stats (FPS, physics time, render time)"
echo "  • Balance state (strategy, quality, COM offset)"
echo "  • Foot contact status (left/right foot grounded)"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start HTTP server
cd public
python3 -m http.server 8080 2>/dev/null || python -m http.server 8080 2>/dev/null || node -e "
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  let filePath = '.' + req.url;
  if (filePath === './') filePath = './index.html';
  
  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.wasm': 'application/wasm',
    '.json': 'application/json'
  };
  
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(8080, () => {
  console.log('Server running at http://localhost:8080/');
});
"
