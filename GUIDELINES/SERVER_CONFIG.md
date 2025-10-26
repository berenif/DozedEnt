# Server Configuration Guide

## MIME Type Configuration for WASM Modules

This guide explains how to configure your server to properly serve WebAssembly modules and JavaScript ES modules.

## Problem

The error you're seeing:
```
Le chargement du module à l'adresse « http://192.168.1.180:8080/demos/src/utils/wasm.js » a été bloqué en raison d'un type MIME interdit («  »).
```

This occurs when the server doesn't serve JavaScript modules with the correct MIME type.

## Solution

### For Python HTTP Server

If you're using Python's built-in HTTP server, you need to configure it properly:

```python
#!/usr/bin/env python3
import http.server
import socketserver
import mimetypes

# Add correct MIME types
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/wasm', '.wasm')

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

PORT = 8080
with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"Server running at http://localhost:{PORT}/")
    httpd.serve_forever()
```

### For Node.js HTTP Server

```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',  // Important: use application/javascript
    '.css': 'text/css',
    '.wasm': 'application/wasm',
    '.json': 'application/json'
};

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';
    
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
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
```

### For Apache (.htaccess)

```apache
# MIME types for WebAssembly and ES modules
AddType application/javascript .js
AddType application/wasm .wasm

# CORS headers
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type"
```

### For Nginx

```nginx
server {
    listen 8080;
    server_name localhost;
    
    location / {
        root /path/to/your/public;
        index index.html;
        
        # MIME types
        location ~* \.js$ {
            add_header Content-Type application/javascript;
        }
        
        location ~* \.wasm$ {
            add_header Content-Type application/wasm;
        }
        
        # CORS headers
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type" always;
    }
}
```

## Key Points

1. **JavaScript modules** must be served with `application/javascript` MIME type
2. **WASM files** must be served with `application/wasm` MIME type
3. **CORS headers** are required for cross-origin requests
4. **Cache headers** can help with performance

## Testing

After configuring your server, test with:

```bash
curl -I http://192.168.1.180:8080/src/utils/wasm.js
```

You should see:
```
Content-Type: application/javascript
```

## Quick Fix

If you're using the demo scripts, they have been updated to use the correct MIME types. Simply restart your server:

```bash
# Stop the current server (Ctrl+C)
# Then restart with the updated script
./tools/scripts/demo-enhanced-skeleton.sh
```

## Fallback

If you can't change the server configuration, the system will automatically fall back to a simplified WASM loader that works even with incorrect MIME types.
