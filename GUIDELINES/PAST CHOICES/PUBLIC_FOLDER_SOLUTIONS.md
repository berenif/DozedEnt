# Public Folder Solutions for DozedEnt

This document explains different approaches to make the `public/` folder use the `dist/` folder directly and avoid file duplication.

## Current Implementation

The project currently uses a **direct deployment approach** where essential files are copied to the `public/` folder for GitHub Pages deployment:

- `dist/` contains the complete built game files and modules
- `public/` contains only the essential files needed for deployment
- Key files like `game.wasm`, `site.js`, and `index.html` are copied to `public/`
- Asset folders (`animations/`, `core/`, `src/`, etc.) are symlinked or copied as needed

## Solution Options

### Option 1: Symlinks Approach (Recommended)

**Script**: `tools/scripts/build-public-symlinks.js`
**Command**: `npm run build:public:symlinks`

**How it works**:
- Creates symlinks from `public/` to `dist/` and other source folders
- No file duplication - all files reference original sources
- Works on Unix-like systems (Linux, macOS)
- May not work on Windows without admin privileges

**Current Structure**:
```
public/
â”œâ”€â”€ index.html (feature demo page)
â”œâ”€â”€ site.js (copied)
â”œâ”€â”€ favicon.ico (copied)
â”œâ”€â”€ game.wasm (copied from dist/wasm/)
â”œâ”€â”€ game-host.wasm (copied from dist/wasm/)
â”œâ”€â”€ _config.yml (GitHub Pages config)
â”œâ”€â”€ animations/ â†’ ../dist/animations/ (symlinked/copied)
â”œâ”€â”€ core/ â†’ ../dist/core/ (symlinked/copied)
â”œâ”€â”€ src/ â†’ ../src/ (symlinked/copied)
â”œâ”€â”€ wasm/ â†’ ../dist/wasm/ (symlinked/copied)
â”œâ”€â”€ assets/ â†’ ../assets/ (symlinked/copied)
â”œâ”€â”€ data/ â†’ ../data/ (symlinked/copied)
â””â”€â”€ feature-demo.js (demo page script)
```

**Pros**:
- No file duplication
- Always up-to-date with source files
- Minimal disk usage
- Easy to maintain

**Cons**:
- May not work on Windows without admin privileges
- Symlinks might not work in some deployment environments
- Requires fallback to copying if symlinks fail

### Option 2: Minimal Approach

**Script**: `tools/scripts/build-public-minimal.js`
**Command**: `npm run build:public:minimal`

**How it works**:
- Creates only essential files in `public/`
- Modifies HTML paths to reference `../dist/`, `../src/`, etc.
- Creates a redirect index.html that points to `./public/index.html`

**Structure created**:
```
public/
â”œâ”€â”€ index.html (redirects to ./public/index.html)
â”œâ”€â”€ site.js (copied with modified paths)
â”œâ”€â”€ favicon.ico (copied)
â”œâ”€â”€ _config.yml (created)
â””â”€â”€ .nojekyll (created)
```

**Pros**:
- Minimal file duplication
- Works on all platforms
- Simple and reliable
- Easy to understand

**Cons**:
- Requires path modifications in HTML/JS files
- May have issues with relative path resolution in some environments
- Less flexible than symlinks

### Option 3: Current Approach (Selective Copying)

**Script**: `tools/scripts/build-public.js`
**Command**: `npm run build:public`

**How it works**:
- Copies essential files (`game.wasm`, `site.js`, `index.html`) from `dist/` to `public/`
- Creates symlinks or copies for asset folders as needed
- Maintains a clean, deployment-ready `public/` folder

**Pros**:
- Works on all platforms
- No dependency on external path modifications
- Self-contained deployment folder
- Selective copying reduces duplication

**Cons**:
- Some file duplication for essential files
- Requires build step when core files change
- Still needs maintenance for the copied files

## Recommended Usage

### Current Implementation:
```bash
npm run build:public
```

This command uses selective copying to prepare the `public/` folder for GitHub Pages deployment. It copies essential files and creates appropriate symlinks/copies for asset folders.

### Alternative Approaches:
- **Symlinks** (`npm run build:public:symlinks`) - For Unix-like development environments
- **Minimal** (`npm run build:public:minimal`) - For maximum compatibility across platforms

## Implementation Details

### Symlinks Script Features:
- Automatic fallback to copying if symlinks fail
- Validation of created structure
- Build information injection into HTML
- Jekyll configuration for GitHub Pages

### Minimal Script Features:
- Path modification in HTML files
- Redirect functionality
- Minimal file footprint
- Cross-platform compatibility

## Testing the Solutions

1. **Test symlinks approach**:
   ```bash
   npm run build:public:symlinks
   cd public
   ls -la  # Check for symlinks (should show -> indicators)
   ```

2. **Test minimal approach**:
   ```bash
   npm run build:public:minimal
   cd public
   cat index.html  # Check for modified paths
   ```

3. **Test current approach**:
   ```bash
   npm run build:public
   cd public
   ls -la  # Check for copied files
   ```

## Deployment Considerations

- **GitHub Pages**: All approaches should work, but symlinks may not be preserved in git
- **Local Development**: Symlinks work best for development
- **CI/CD**: Minimal approach is most reliable for automated deployments
- **Cross-platform**: Minimal approach works everywhere

## Migration Guide

To switch from the current approach to symlinks:

1. Run `npm run build:public:symlinks`
2. Test the public folder locally
3. Deploy and verify everything works
4. Update your build scripts to use the new command

To switch to minimal approach:

1. Run `npm run build:public:minimal`
2. Test the redirect functionality
3. Verify all assets load correctly
4. Update your build scripts to use the new command

## Troubleshooting

### Symlinks not working:
- Check if your system supports symlinks
- Try running with admin privileges on Windows
- The script will automatically fallback to copying

### Path issues with minimal approach:
- Check that relative paths are correct
- Verify that `../dist/` and other paths resolve correctly
- Test in your deployment environment

### File not found errors:
- Ensure `dist/` folder exists and is built
- Check that all referenced files exist
- Verify the build process completed successfully
