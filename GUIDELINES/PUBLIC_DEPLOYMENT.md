# Ã°Å¸Å¡â‚¬ Public Folder GitHub Pages Deployment Guide

<div align="center">
  <h3>Ã°Å¸Å’Â Robust Deployment for DozedEnt P2P Survival Game</h3>
  <p>Automated deployment with GitHub Actions â€¢ Public folder deployment (no dist) â€¢ Public folder structure</p>
</div>

---

## Ã°Å¸â€œÅ’ Overview

This guide provides comprehensive instructions for deploying the DozedEnt game to GitHub Pages using a robust `/public` folder structure. The deployment system copies the required runtime artifacts (core, wasm, assets) into `public/` to create a complete, self-contained deployment package.

### Ã¢Å“Â¨ Key Features
- **Complete Asset Deployment** - Core copied to public/ (no public/dist)
- **Robust Structure** - Organized public folder with all game components
- **WASM Support** - Proper MIME types and multiple WASM file locations
- **Validation Pipeline** - Comprehensive pre-deployment checks
- **Jekyll Integration** - Optimized GitHub Pages processing
- **Multiplayer Ready** - P2P networking with Trystero infrastructure
- **Performance Optimized** - Deterministic WASM execution

## Ã°Å¸Ââ€”Ã¯Â¸Â Deployment Architecture

### Build Process Flow
```
Source Code Ã¢â€ â€™ Build Ã¢â€ â€™ Dist Ã¢â€ â€™ Copy to Public Ã¢â€ â€™ Validate Ã¢â€ â€™ Deploy
     Ã¢â€ â€œ           Ã¢â€ â€œ       Ã¢â€ â€œ         Ã¢â€ â€œ           Ã¢â€ â€œ         Ã¢â€ â€œ
   src/      npm run   dist/    public/    Validation  GitHub
            build      folder   folder      Checks     Pages
```

### Public Folder Structure After Deployment
### Public Folder Structure After Deployment
```
public/
+-- index.html              # Main game page
+-- favicon.ico             # Site icon
+-- site.js                 # Game initialization script
+-- game.wasm               # Main game WASM module
+-- game-host.wasm          # Host authority WASM module
+-- _config.yml             # Jekyll configuration
+-- .nojekyll               # Disable Jekyll processing
+-- core/                   # Core modules\n+-- wasm/                   # WASM modules
+-- assets/                 # Game assets (optional)
+-- images/                 # Game images (optional)
+-- src/                    # Source files (for debugging)
+-- data/                   # Game data files
```

## Ã°Å¸â€Â§ Setup Instructions

### Step 1Ã¯Â¸ÂÃ¢Æ’Â£ Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** (in the repository navigation)
3. Scroll down to the **Pages** section in the left sidebar
4. Under **Source**, select **GitHub Actions** (not "Deploy from a branch")
5. Click **Save**

### Step 2Ã¯Â¸ÂÃ¢Æ’Â£ Configure GitHub Actions Permissions

1. Go to **Settings** Ã¢â€ â€™ **Actions** Ã¢â€ â€™ **General**
2. Scroll down to **Workflow permissions**
3. Ensure **Read and write permissions** is selected
4. Check **Allow GitHub Actions to create and approve pull requests** (optional but recommended)
5. Click **Save**

### Step 3Ã¯Â¸ÂÃ¢Æ’Â£ Deploy Your Site

The site will automatically deploy when you:
- Push to the `main` or `master` branch
- Manually trigger the workflow from the Actions tab

To manually trigger:
1. Go to the **Actions** tab in your repository
2. Select **Deploy DozedEnt to GitHub Pages (Public Folder)** workflow
3. Click **Run workflow**
4. Select the branch and click **Run workflow**

### Step 4Ã¯Â¸ÂÃ¢Æ’Â£ Access Your Published Site

After successful deployment, your site will be available at:
- **With custom domain**: `https://your-domain.com`
- **Without custom domain**: `https://[username].github.io/[repository-name]`

You can find the exact URL in:
- **Settings** Ã¢â€ â€™ **Pages** Ã¢â€ â€™ Your site is published at...
- The GitHub Actions workflow run summary

## Ã°Å¸ÂÂ­ Build Process

### Ã°Å¸â€â€ž Workflow Steps

The automated deployment pipeline executes the following stages:

1. **Checkout** - Gets the latest code from your repository
2. **Setup Node.js** - Installs Node.js version 20 with npm caching
3. **Install dependencies** - Runs `npm ci` to install packages
4. **Install PowerShell Core** - For WASM building on Ubuntu
5. **Setup Emscripten SDK** - Clones and configures Emscripten
6. **Generate balance data** - Runs `npm run balance:gen`
7. **Build WASM modules** - Runs `npm run wasm:build:all`
8. **Build project** - Runs `npm run build:all`
9. **Build public folder** - Runs `node tools/scripts/build-public.js`
10. **Validate structure** - Comprehensive deployment validation
11. **Upload artifact** - Packages the public folder for deployment
12. **Deploy** - Publishes the site to GitHub Pages

### Ã°Å¸â€œÂ¦ Asset Copying Process

The deployment process copies assets in multiple locations for optimal access:

```bash
# Copy WASM files to public root for easy access
cp *.wasm public/

# Copy core modules to public root
cp -r dist/core public/

# Copy animations to public root
# Copy all assets and data
cp -r assets public/
cp -r data public/
cp -r images public/
cp -r src public/
```

## Ã°Å¸â€™Â» Local Development

### Ã°Å¸Â§Âª Testing Locally

Before deploying to production, test your public folder locally:

```bash
# Install dependencies
npm install

# Build the project
npm run build:all

# Build WASM modules
npm run wasm:build:all

# Build public folder
npm run build:public

# Validate deployment
npm run validate:public-deployment

# Serve the public folder locally
npm run serve:public
# Or use simple server:
npm run serve:simple:public
# Or use Python:
cd public && python -m http.server 8080
```

### Ã°Å¸â€Â Validation Commands

```bash
# Validate public folder deployment
npm run validate:public-deployment

# Validate build structure
npm run build:validate

# Check deployment readiness
npm run deploy:validate:public
```

## Ã°Å¸Å’Â Custom Domain Configuration

### Ã°Å¸â€â€” Setting Up Your Domain

1. Add a `CNAME` file to the `public/` folder with your domain:
   ```
   example.com
   ```

2. Configure your domain's DNS:
   - **A Record**: Point to GitHub Pages IP addresses
   - **CNAME Record**: Point www to your GitHub Pages URL

3. Update `public/_config.yml`:
   ```yaml
   url: "https://example.com"
   baseurl: ""
   ```

## Ã°Å¸â€Â§ Configuration Files

### Jekyll Configuration (`public/_config.yml`)

The Jekyll configuration ensures proper serving of all file types:

```yaml
# Include specific files/folders for GitHub Pages
include:
  - index.html
  - js/
  - css/
  - wasm/
  - assets/
  - images/
  - favicon.ico
  - dist/
  - core/
  - animations/
  - src/
  - data/
  - *.wasm
  - site.js

# Disable Jekyll processing for certain files
defaults:
  - scope:
      path: "*.wasm"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "dist/**/*.js"
    values:
      layout: null
      sitemap: false
  # ... additional configurations
```

### GitHub Actions Workflow (`.github/workflows/deploy-public.yml`)

The workflow includes comprehensive build and validation steps:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
      - name: Setup Node.js
      - name: Install dependencies
      - name: Install PowerShell Core
      - name: Setup Emscripten SDK
      - name: Generate balance data
      - name: Build WASM modules
      - name: Build project
      - name: Build public folder for deployment
      - name: Validate public folder structure
      - name: Run deployment validation
      - name: Setup Pages
      - name: Upload artifact
```

## Ã°Å¸Å¡Â¨ Troubleshooting

### Common Issues

#### Ã¢ÂÅ’ WASM Files Not Loading
- **Cause**: Incorrect MIME types or missing files
- **Solution**: Check `_config.yml` includes WASM MIME type configuration
- **Verify**: Run `npm run validate:public-deployment`

#### Ã¢ÂÅ’ Assets Not Found (404 errors)
- **Cause**: Files not copied to public folder
- **Solution**: Ensure `build:public` script runs successfully
#### Ã¢ÂÅ’ Build Fails in GitHub Actions
- **Cause**: Missing dependencies or build errors
- **Solution**: Check build logs in Actions tab
- **Verify**: Run `npm run build:all` locally

#### Ã¢ÂÅ’ Jekyll Processing Issues
- **Cause**: Files being processed by Jekyll when they shouldn't be
- **Solution**: Update `_config.yml` defaults section
- **Verify**: Check file extensions in defaults

### Debug Commands

```bash
# Check public folder structure
ls -la public/
ls -la public/*.wasm

# Validate deployment
npm run validate:public-deployment

# Test locally
npm run serve:public

# Check file sizes
du -h public/*.wasm
```

### Validation Checklist

Before deploying, ensure:

- [ ] `public/index.html` exists and is valid
- [ ] `public/game.wasm` and `public/game-host.wasm` exist and are not empty
- [ ] `public/_config.yml` is properly configured
- [ ] All required directories exist (`core/`, `animations/`, `assets/`, `images/`)
- [ ] GitHub Pages is enabled in repository settings
- [ ] GitHub Actions permissions are configured
- [ ] Workflow file exists (`.github/workflows/deploy-public.yml`)

## Ã°Å¸â€œÅ  Performance Optimization

### Bundle Size Monitoring

The deployment includes bundle size validation:

```bash
# Check bundle sizes
npm run get-bundle-sizes

# Optimize performance
npm run optimize:performance

# Check memory usage
npm run optimize:memory
```

### Caching Strategy

- **Static Assets**: Cached by GitHub Pages CDN
- **WASM Files**: Served with proper MIME types from multiple locations
- **JavaScript Modules**: Minified and optimized
- **CSS Files**: Minified and compressed

## Ã°Å¸â€â€ž Continuous Integration

### Automated Testing

The deployment pipeline includes:

1. **Pre-build validation** - Checks dependencies and configuration
2. **Build validation** - Ensures all modules build correctly
3. **Public folder validation** - Verifies all required files are present
4. **Post-deployment checks** - Validates deployed site functionality

### Quality Gates

- Ã¢Å“â€¦ All required files present in public folder
- Ã¢Å“â€¦ WASM files have correct MIME types
- Ã¢Å“â€¦ Bundle sizes within limits
- Ã¢Å“â€¦ No build errors or warnings
- Ã¢Å“â€¦ Jekyll configuration valid
- Ã¢Å“â€¦ Core copied

## Ã°Å¸â€œË† Monitoring

### Deployment Status

Monitor deployment status through:

- **GitHub Actions**: Check workflow runs
- **GitHub Pages**: View deployment status
- **Validation Scripts**: Run `npm run validate:public-deployment`

### Performance Metrics

- **Load Time**: Monitor initial page load
- **WASM Loading**: Check WebAssembly module loading
- **Asset Loading**: Verify all assets load correctly
- **Network Performance**: Monitor P2P connection establishment

## Ã°Å¸â€ Ëœ Support

### Getting Help

1. **Check this documentation** - Most issues are covered here
2. **Run validation scripts** - `npm run validate:public-deployment`
3. **Check GitHub Actions logs** - Look for specific error messages
4. **Test locally first** - Ensure everything works locally before deploying
5. **Review the project's issue tracker** - Check for known issues

### Common Commands Reference

```bash
# Build and deploy
npm run build:all
npm run wasm:build:all
npm run build:public
npm run validate:public-deployment

# Local testing
npm run serve:public
npm run serve:simple:public
cd public && python -m http.server 8080

# Validation
npm run validate:public-deployment
npm run build:validate
npm run deploy:validate:public
```

---

## Ã°Å¸Å½â€° Success!

Once deployed successfully, your DozedEnt game will be available at your GitHub Pages URL with:

- Ã¢Å“â€¦ Complete game functionality
- Ã¢Å“â€¦ WASM modules properly loaded from multiple locations
- Ã¢Å“â€¦ P2P multiplayer networking
- Ã¢Å“â€¦ All assets and animations
- Ã¢Å“â€¦ Responsive mobile controls
- Ã¢Å“â€¦ Modern UI system
- Ã¢Å“â€¦ Public folder deployment (no dist)
- Ã¢Å“â€¦ Robust public folder structure

The deployment system is designed to be robust and maintainable, ensuring your game is always available and up-to-date with the latest changes. The public folder contains everything needed for the game to work, making it a complete, self-contained deployment package.



