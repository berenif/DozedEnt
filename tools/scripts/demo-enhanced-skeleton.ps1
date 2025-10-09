# Enhanced Skeleton Physics Demo Script
# This script builds the enhanced WASM skeleton physics and serves the demo

param(
    [string]$Port = "8080"
)

Write-Host "🚀 Enhanced WASM Skeleton Physics Demo" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Build the enhanced WASM module
Write-Host "📦 Building enhanced WASM skeleton physics..." -ForegroundColor Yellow
npm run wasm:build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ WASM build completed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ WASM build failed" -ForegroundColor Red
    exit 1
}

# Check if the enhanced demo exists
if (-not (Test-Path "public/demos/enhanced-skeleton-physics.html")) {
    Write-Host "❌ Error: Enhanced demo not found at public/demos/enhanced-skeleton-physics.html" -ForegroundColor Red
    exit 1
}

# Start the demo server
Write-Host "🌐 Starting demo server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "🎮 Enhanced Skeleton Physics Demo" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Features:" -ForegroundColor White
Write-Host "  • Balance Strategies (Ankle, Hip, Stepping, Adaptive)" -ForegroundColor Gray
Write-Host "  • Foot Contact Detection (Heel, Midfoot, Toe)" -ForegroundColor Gray
Write-Host "  • Collision Detection (Ground collision, Penetration resolution)" -ForegroundColor Gray
Write-Host "  • Deterministic Fixed-Point Math (Multiplayer ready)" -ForegroundColor Gray
Write-Host "  • Real-time Physics Simulation (60 FPS)" -ForegroundColor Gray
Write-Host "  • Interactive 3D Visualization" -ForegroundColor Gray
Write-Host ""
Write-Host "🔗 Open in browser:" -ForegroundColor White
Write-Host "  http://localhost:$Port/demos/standalone-skeleton-physics.html" -ForegroundColor Green
Write-Host "  http://localhost:$Port/demos/enhanced-skeleton-physics.html" -ForegroundColor Gray
Write-Host ""
Write-Host "🎯 Controls:" -ForegroundColor White
Write-Host "  • Reset Pose - Reset skeleton to default pose" -ForegroundColor Gray
Write-Host "  • Apply Disturbance - Apply random forces to test balance" -ForegroundColor Gray
Write-Host "  • Toggle Physics - Enable/disable physics simulation" -ForegroundColor Gray
Write-Host "  • Balance Strategy - Select balance strategy mode" -ForegroundColor Gray
Write-Host "  • Physics Settings - Adjust gravity, collision, foot contact" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 Monitor:" -ForegroundColor White
Write-Host "  • Performance stats (FPS, physics time, render time)" -ForegroundColor Gray
Write-Host "  • Balance state (strategy, quality, COM offset)" -ForegroundColor Gray
Write-Host "  • Foot contact status (left/right foot grounded)" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start HTTP server
Set-Location public

# Try different methods to start HTTP server
try {
    # Try Python 3 first
    python -m http.server $Port
} catch {
    try {
        # Try Python 2
        python -m SimpleHTTPServer $Port
    } catch {
        try {
            # Try Node.js
            node -e "
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
            
            server.listen($Port, () => {
              console.log('Server running at http://localhost:$Port/');
            });
            "
        } catch {
            Write-Host "❌ Error: Could not start HTTP server. Please install Python or Node.js" -ForegroundColor Red
            exit 1
        }
    }
}
