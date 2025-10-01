# 🔧 MIME Type Fix for JavaScript Modules

## Problem
The error "Le chargement du module à l'adresse « http://localhost:8080/js/site.js » a été bloqué en raison d'un type MIME interdit (« text/html »)" occurs when your local development server serves JavaScript modules with the wrong MIME type.

## Solutions

### ✅ Solution 1: Use the Custom Development Server (Recommended)
```bash
# Run the custom development server
npm run serve:public
# or
node serve-dev.js
```

This server properly serves JavaScript modules with `application/javascript` MIME type.

### ✅ Solution 2: Use Python HTTP Server
```bash
# Navigate to public directory and serve
npm run serve:simple:public
# or
cd public && python -m http.server 8080
```

### ✅ Solution 3: Use http-server Package
```bash
# Install and run http-server
npm run serve:http
# or
npx http-server public -p 8080 -c-1 --cors
```

### ✅ Solution 4: Use Live Server (VS Code Extension)
If you're using VS Code:
1. Install the "Live Server" extension
2. Right-click on `public/index.html`
3. Select "Open with Live Server"

## Why This Happens

The issue occurs because:
1. **ES Modules require proper MIME types**: JavaScript modules must be served with `application/javascript` or `text/javascript` MIME type
2. **Some servers default to `text/html`**: Basic HTTP servers may serve `.js` files as HTML
3. **Browser security**: Modern browsers block modules with incorrect MIME types

## File Structure
```
public/
├── index.html          # Main game page
├── js/
│   ├── site.js         # Main game script (ES module)
│   └── src/            # Game source files
├── .htaccess          # Apache configuration (if using Apache)
└── serve-dev.js       # Custom development server
```

## Testing the Fix

1. **Start the server**:
   ```bash
   npm run serve:public
   ```

2. **Open your browser** to `http://localhost:8080`

3. **Check the console** - you should see:
   ```
   🚀 DozedEnt development server running at http://localhost:8080
   📁 Serving files from: C:\Users\flori\Desktop\DozedEnt\public
   🎮 Open http://localhost:8080 to play the game
   ⚡ JavaScript modules will be served with proper MIME types
   ```

4. **Verify the game loads** without MIME type errors

## Additional Notes

- The custom server (`serve-dev.js`) includes CORS headers for development
- All JavaScript files are served with `application/javascript` MIME type
- WASM files are served with `application/wasm` MIME type
- The server automatically handles file extensions and proper content types

## Troubleshooting

If you still see MIME type errors:

1. **Clear browser cache**: Hard refresh (Ctrl+F5)
2. **Check browser console**: Look for specific error messages
3. **Verify file paths**: Ensure `js/site.js` exists in the public directory
4. **Try different port**: Change port if 8080 is occupied

## Production Deployment

For production (GitHub Pages), the `_config.yml` file already includes proper MIME type configuration:

```yaml
defaults:
  - scope:
      path: "*.js"
    values:
      layout: null
      sitemap: false
```

This ensures JavaScript files are served correctly on GitHub Pages.
