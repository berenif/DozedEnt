# GitHub Pages MIME Type Fix

## Problem
JavaScript modules were being served with incorrect MIME type (`text/html` instead of `application/javascript`) on GitHub Pages, causing module loading failures.

## Root Cause
GitHub Pages uses Jekyll by default, which processes all files and can interfere with JavaScript module serving. The `.js` files were being treated as HTML files.

## Solution Applied

### 1. Created `.nojekyll` file
- Added `.nojekyll` file to bypass Jekyll processing entirely
- This ensures GitHub Pages serves files as-is without Jekyll interference

### 2. Updated `_config.yml`
- Added JavaScript file patterns to the `defaults` section with `layout: null`
- This disables Jekyll processing for all `.js` files
- Added `src/` and `dist/` folders to the `include` section

### 3. Created `.htaccess` file
- Added explicit MIME type declarations (for non-GitHub Pages hosting)
- Includes CORS headers for module loading

### 4. Built the project
- Ran `npm run build:all` to create the `dist/` folder with bundled modules
- Generated `trystero-mqtt.min.js` and other required modules

## Files Modified/Created

1. **`.nojekyll`** - New file to bypass Jekyll
2. **`_config.yml`** - Updated to handle JavaScript files properly
3. **`.htaccess`** - New file with MIME type configuration
4. **`test-mime.html`** - Test file to verify module loading
5. **`dist/`** - Built folder with bundled modules

## Testing

Use `test-mime.html` to verify that modules load correctly:
- Opens the file in a browser
- Attempts to load `trystero-mqtt.min.js` and other modules
- Shows success/failure messages in console and on page

## Deployment Steps

1. Commit all changes to your repository
2. Push to the main branch
3. GitHub Pages will automatically deploy
4. Test the live site to ensure modules load correctly

## Expected Results

After deployment:
- JavaScript modules should load with correct MIME types
- No more "MIME type interdit" errors
- ES modules should work properly in browsers
- The game should load and function correctly

## Troubleshooting

If issues persist:
1. Check browser developer tools for any remaining MIME type errors
2. Verify `.nojekyll` file is present in the repository root
3. Ensure `dist/` folder is committed and contains the built files
4. Check GitHub Pages settings to ensure it's serving from the correct branch