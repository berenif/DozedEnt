# Public Folder Solutions for DozedEnt

This document explains different approaches to make the `public/` folder use the `dist/` folder directly and avoid file duplication.

## Current Problem

The current setup duplicates files between `dist/` and `public/` folders:
- `dist/` contains the built game files
- `public/` copies files from `dist/` for GitHub Pages deployment
- This creates unnecessary duplication and maintenance overhead

## Solution Options

### Option 1: Symlinks Approach (Recommended)

**Script**: `tools/scripts/build-public-symlinks.js`
**Command**: `npm run build:public:symlinks`

**How it works**:
- Creates symlinks from `public/` to `dist/` and other source folders
- No file duplication - all files reference original sources
- Works on Unix-like systems (Linux, macOS)
- May not work on Windows without admin privileges

**Structure created**:
```
public/
├── index.html (copied)
├── site.js (copied)
├── favicon.ico (copied)
├── dist/ → ../dist/ (symlink)
├── core/ → ../dist/core/ (symlink)
├── animations/ → ../dist/animations/ (symlink)
├── wasm/ → ../dist/wasm/ (symlink)
├── src/ → ../src/ (symlink)
├── assets/ → ../assets/ (symlink)
├── data/ → ../data/ (symlink)
├── images/ → ../images/ (symlink)
├── game.wasm → ../dist/wasm/game.wasm (symlink)
├── game-host.wasm → ../dist/wasm/game-host.wasm (symlink)
├── _config.yml (created)
└── .nojekyll (created)
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
├── index.html (redirects to ./public/index.html)
├── site.js (copied with modified paths)
├── favicon.ico (copied)
├── _config.yml (created)
└── .nojekyll (created)
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

### Option 3: Current Approach (File Copying)

**Script**: `tools/scripts/build-public.js`
**Command**: `npm run build:public`

**How it works**:
- Copies all necessary files from `dist/` and other folders to `public/`
- Creates complete duplication of all assets

**Pros**:
- Works on all platforms
- No dependency on symlinks or path modifications
- Self-contained deployment folder

**Cons**:
- File duplication
- Larger disk usage
- Need to rebuild when source files change
- Maintenance overhead

## Recommended Usage

### For Development (Unix-like systems):
```bash
npm run build:public:symlinks
```

### For Cross-platform compatibility:
```bash
npm run build:public:minimal
```

### For maximum compatibility:
```bash
npm run build:public
```

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
