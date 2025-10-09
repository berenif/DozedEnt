# 🚀 DozedEnt - Quick Start Guide

## ⚠️ CRITICAL: Use the Correct Dev Server!

**DO NOT use VS Code Live Server!** It will NOT work correctly with WebAssembly files.

## 🎯 Quick Start (3 Steps)

### Step 1: Stop VS Code Live Server
If you have it running (port 5501), **stop it now**:
- Click the "Port: 5501" button in VS Code's status bar
- Or just close the browser tab

### Step 2: Start the Proper Dev Server
```bash
npm run dev
```

This starts the server on **http://localhost:8080** with proper WASM support.

### Step 3: Clear Browser Cache & Open
1. **Clear your browser cache** (to fix any `lockdown-install.js` errors):
   - Press `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
   - Select "Cached images and files"
   - Click "Clear data"

2. **Open the game**:
   ```
   http://localhost:8080
   ```

3. **Hard refresh** the page:
   - Windows/Linux: `Ctrl+Shift+R`
   - Mac: `Cmd+Shift+R`

## ✅ Success Indicators

When everything is working correctly, you'll see in the browser console:

```
🧠 Memory optimizer initialized
Preloading critical WASM modules...
Successfully loaded WASM from: http://localhost:8080/game.wasm
WASM module loaded successfully
```

**You should NOT see:**
- ❌ `SES_UNCAUGHT_EXCEPTION: SyntaxError: octal escape sequences...`
- ❌ `WebAssembly: Response has unsupported MIME type 'text/html'`
- ❌ `wasm validation error: failed to match magic number`

## 🔧 Available Dev Commands

```bash
# Primary development server (RECOMMENDED)
npm run dev                  # Port 8080, proper WASM support

# Alternative servers
npm run serve:public         # Port 8080, uses http-server
npm run serve:simple:public  # Port 8080, Python http.server

# Build commands
npm run build                # Build distribution files
npm run build:public         # Build public deployment

# WASM compilation (if you modify C++ code)
npm run wasm:build           # Compile game.wasm
npm run wasm:build:dev       # Dev build with assertions

# Testing
npm test                     # Run all tests
npm run test:unit            # Run unit tests
npm run lint                 # Check code quality
```

## 📁 Project Structure

```
DozedEnt/
├── public/               # Main game files (served by dev server)
│   ├── index.html       # Main entry point
│   ├── game.wasm        # Compiled game logic (from root)
│   └── src/             # JavaScript source code
│       ├── demo/        # Demo/game loop code
│       ├── wasm/        # WASM initialization
│       ├── utils/       # Utilities
│       └── ...
├── src/                 # C++ source (WASM game logic)
├── tools/               # Build scripts and tools
│   └── scripts/
│       └── server.js    # The proper dev server
├── GUIDELINES/          # Development documentation
└── game.wasm            # Compiled WASM module (root level)
```

## 🐛 Troubleshooting

### Issue: WASM Files Won't Load

**Symptoms:**
- Console shows `MIME type 'text/html' expected 'application/wasm'`
- WASM validation errors

**Solution:**
1. Make sure you're on **http://localhost:8080** (NOT 5501)
2. Check that `game.wasm` exists in the project root
3. Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R`)

### Issue: `lockdown-install.js` Error

**Symptoms:**
- `SES_UNCAUGHT_EXCEPTION: SyntaxError: octal escape sequences...`

**Solution:**
1. Clear browser cache (see Step 3 above)
2. Hard refresh the page
3. Disable any security/sandbox browser extensions
4. Use an incognito/private window to test

### Issue: Port 8080 Already in Use

**Symptoms:**
- `Error: listen EADDRINUSE: address already in use :::8080`

**Solution:**
```bash
# Find and kill the process using port 8080
# Windows:
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:8080 | xargs kill -9

# Or use a different port (edit tools/scripts/server.js)
```

### Issue: "Module Not Found" Errors

**Symptoms:**
- Console shows `Failed to load module script`
- 404 errors for `.js` files

**Solution:**
1. Make sure you're using `npm run dev` (not Live Server)
2. Check that files exist in `public/src/` directory
3. Hard refresh: `Ctrl+Shift+R`

## 📚 Next Steps

Once the game loads successfully:

1. **Read the Guidelines**: Check `GUIDELINES/AGENTS.md` for architecture overview
2. **Explore the Demo**: The game demonstrates all features
3. **Check Features**: See `GUIDELINES/Feature-overview.md` for what's implemented
4. **Build WASM**: If you modify C++ code, run `npm run wasm:build`

## 💡 Tips

- **Always use `npm run dev`** for development
- **Hard refresh** (`Ctrl+Shift+R`) after major changes
- **Check console** for errors and warnings
- **Follow ESLint rules** - run `npm run lint` before committing
- **Keep files under 500 lines** per project guidelines

## 🆘 Still Having Issues?

1. Check if `game.wasm` exists in the project root
2. Verify Node.js version: `node --version` (should be 20+)
3. Try deleting `node_modules` and running `npm install`
4. Use browser DevTools Network tab to see what's failing
5. Check the GUIDELINES folder for specific subsystem docs

---

**Remember:** The proper dev server is essential for WebAssembly to work correctly!

