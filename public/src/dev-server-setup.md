# Development Server Setup Guide

## ⚠️ Important: Do NOT Use VS Code Live Server

VS Code's Live Server extension does NOT serve WebAssembly files with the correct MIME type, which causes loading failures.

## ✅ Use the Project's Dev Server Instead

The project includes a proper development server that correctly handles WASM files.

### Quick Start

1. **Stop VS Code Live Server** (if running)
   - Click the "Port: 5501" button in VS Code's status bar to stop it
   - Or close the browser and VS Code will auto-stop it

2. **Start the Proper Dev Server**
   ```bash
   npm run dev
   ```
   This starts the server on **http://localhost:8080**

3. **Clear Browser Cache** (to fix lockdown-install.js error)
   - Press `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
   - Select "Cached images and files"
   - Click "Clear data"
   - Or use Hard Refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R`)

4. **Open the Game**
   ```
   http://localhost:8080
   ```

### Alternative Servers

The project provides multiple dev servers:

```bash
# Primary dev server (recommended)
npm run dev              # Port 8080

# Alternative servers
npm run serve:public     # Port 8080 with http-server

# Simple Python server (if you have Python)
npm run serve:simple:public  # Port 8080
```

### What the Proper Server Does

The project's dev server (`tools/scripts/server.js`) correctly:
- ✅ Serves `.wasm` files with `application/wasm` MIME type
- ✅ Serves `.js` files with `application/javascript` MIME type
- ✅ Enables CORS for all resources
- ✅ Serves files from correct directories (public/, src/, dist/)
- ✅ No caching during development

### Troubleshooting

**If WASM still fails to load:**
1. Make sure you're accessing **http://localhost:8080** (NOT 5501)
2. Hard refresh the browser: `Ctrl+Shift+R` (or `Cmd+Shift+R`)
3. Check browser console - WASM files should show as `application/wasm`
4. Verify the game.wasm file exists in the project root or public/ folder

**If you see "lockdown-install.js" error:**
- This is from browser cache or an extension
- Clear browser cache and do a hard refresh
- Check if you have any security/sandbox extensions enabled

### VS Code Settings (Optional)

To prevent accidentally using Live Server, you can disable it in VS Code settings:

1. Open Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "Live Server"
3. Uncheck "Live Server: Auto Open Browser"

Or add to `.vscode/settings.json`:
```json
{
  "liveServer.settings.autoOpenBrowser": false
}
```

