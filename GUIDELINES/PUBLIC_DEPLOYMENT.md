# 🚀 Public Folder GitHub Pages Deployment Guide

<div align="center">
  <h3>🌐 Robust Deployment for DozedEnt P2P Survival Game</h3>
  <p>Automated deployment with GitHub Actions • Complete /dist folder deployment • Public folder structure</p>
</div>

---

## 📌 Overview

This guide provides comprehensive instructions for deploying the DozedEnt game to GitHub Pages using a robust `/public` folder structure. The deployment system automatically copies everything from the `/dist` folder and all necessary assets to create a complete, self-contained deployment package.

### ✨ Key Features
- **Complete Asset Deployment** - All `/dist` folder contents deployed to `/public/dist/`
- **Robust Structure** - Organized public folder with all game components
- **WASM Support** - Proper MIME types and multiple WASM file locations
- **Validation Pipeline** - Comprehensive pre-deployment checks
- **Jekyll Integration** - Optimized GitHub Pages processing
- **Multiplayer Ready** - P2P networking with Trystero infrastructure
- **Performance Optimized** - Deterministic WASM execution

## 🏗️ Deployment Architecture

### Build Process Flow
```
Source Code → Build → Dist → Copy to Public → Validate → Deploy
     ↓           ↓       ↓         ↓           ↓         ↓
   src/      npm run   dist/    public/    Validation  GitHub
            build      folder   folder      Checks     Pages
```

### Public Folder Structure After Deployment
```
public/
├── index.html              # Main game page
├── favicon.ico             # Site icon
├── site.js                 # Game initialization script
├── game.wasm               # Main game WASM module
├── game-host.wasm          # Host authority WASM module
├── _config.yml             # Jekyll configuration
├── .nojekyll               # Disable Jekyll processing
├── deployment-info.json    # Deployment metadata
├── dist/                   # Complete dist folder
│   ├── core/              # Networking modules
│   ├── animations/         # Animation modules
│   ├── wasm/              # WASM modules
│   ├── sourcemaps/        # Source maps
│   └── reports/           # Build reports
├── core/                   # Core modules (copied for easy access)
├── animations/             # Animation modules (copied for easy access)
├── wasm/                   # WASM modules (copied for easy access)
├── assets/                 # Game assets
│   ├── audio/             # Audio files
│   └── images/            # Game images
├── images/                 # Additional images
├── src/                    # Source files (for debugging)
└── data/                   # Game data files
```

## 🔧 Setup Instructions

### Step 1️⃣ Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** (in the repository navigation)
3. Scroll down to the **Pages** section in the left sidebar
4. Under **Source**, select **GitHub Actions** (not "Deploy from a branch")
5. Click **Save**

### Step 2️⃣ Configure GitHub Actions Permissions

1. Go to **Settings** → **Actions** → **General**
2. Scroll down to **Workflow permissions**
3. Ensure **Read and write permissions** is selected
4. Check **Allow GitHub Actions to create and approve pull requests** (optional but recommended)
5. Click **Save**

### Step 3️⃣ Deploy Your Site

The site will automatically deploy when you:
- Push to the `main` or `master` branch
- Manually trigger the workflow from the Actions tab

To manually trigger:
1. Go to the **Actions** tab in your repository
2. Select **Deploy DozedEnt to GitHub Pages (Public Folder)** workflow
3. Click **Run workflow**
4. Select the branch and click **Run workflow**

### Step 4️⃣ Access Your Published Site

After successful deployment, your site will be available at:
- **With custom domain**: `https://your-domain.com`
- **Without custom domain**: `https://[username].github.io/[repository-name]`

You can find the exact URL in:
- **Settings** → **Pages** → Your site is published at...
- The GitHub Actions workflow run summary

## 🏭 Build Process

### 🔄 Workflow Steps

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

### 📦 Asset Copying Process

The deployment process copies assets in multiple locations for optimal access:

```bash
# Copy dist folder contents to public/dist
cp -r dist/* public/dist/

# Copy WASM files to public root for easy access
cp *.wasm public/

# Copy core modules to public root
cp -r dist/core public/

# Copy animations to public root
cp -r dist/animations public/

# Copy all assets and data
cp -r assets public/
cp -r data public/
cp -r images public/
cp -r src public/
```

## 💻 Local Development

### 🧪 Testing Locally

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

### 🔍 Validation Commands

```bash
# Validate public folder deployment
npm run validate:public-deployment

# Validate build structure
npm run build:validate

# Check deployment readiness
npm run deploy:validate:public
```

## 🌐 Custom Domain Configuration

### 🔗 Setting Up Your Domain

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

## 🔧 Configuration Files

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

## 🚨 Troubleshooting

### Common Issues

#### ❌ WASM Files Not Loading
- **Cause**: Incorrect MIME types or missing files
- **Solution**: Check `_config.yml` includes WASM MIME type configuration
- **Verify**: Run `npm run validate:public-deployment`

#### ❌ Assets Not Found (404 errors)
- **Cause**: Files not copied to public folder
- **Solution**: Ensure `build:public` script runs successfully
- **Verify**: Check `public/dist/` folder exists

#### ❌ Build Fails in GitHub Actions
- **Cause**: Missing dependencies or build errors
- **Solution**: Check build logs in Actions tab
- **Verify**: Run `npm run build:all` locally

#### ❌ Jekyll Processing Issues
- **Cause**: Files being processed by Jekyll when they shouldn't be
- **Solution**: Update `_config.yml` defaults section
- **Verify**: Check file extensions in defaults

### Debug Commands

```bash
# Check public folder structure
ls -la public/
ls -la public/dist/
ls -la public/*.wasm

# Validate deployment
npm run validate:public-deployment

# Test locally
npm run serve:public

# Check file sizes
du -h public/*.wasm
du -h public/dist/
```

### Validation Checklist

Before deploying, ensure:

- [ ] `public/index.html` exists and is valid
- [ ] `public/game.wasm` and `public/game-host.wasm` exist and are not empty
- [ ] `public/dist/` folder contains all built assets
- [ ] `public/_config.yml` is properly configured
- [ ] All required directories exist (`core/`, `animations/`, `assets/`, `images/`)
- [ ] GitHub Pages is enabled in repository settings
- [ ] GitHub Actions permissions are configured
- [ ] Workflow file exists (`.github/workflows/deploy-public.yml`)

## 📊 Performance Optimization

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

## 🔄 Continuous Integration

### Automated Testing

The deployment pipeline includes:

1. **Pre-build validation** - Checks dependencies and configuration
2. **Build validation** - Ensures all modules build correctly
3. **Public folder validation** - Verifies all required files are present
4. **Post-deployment checks** - Validates deployed site functionality

### Quality Gates

- ✅ All required files present in public folder
- ✅ WASM files have correct MIME types
- ✅ Bundle sizes within limits
- ✅ No build errors or warnings
- ✅ Jekyll configuration valid
- ✅ Complete dist folder deployed

## 📈 Monitoring

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

## 🆘 Support

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

## 🎉 Success!

Once deployed successfully, your DozedEnt game will be available at your GitHub Pages URL with:

- ✅ Complete game functionality
- ✅ WASM modules properly loaded from multiple locations
- ✅ P2P multiplayer networking
- ✅ All assets and animations
- ✅ Responsive mobile controls
- ✅ Modern UI system
- ✅ Complete /dist folder deployment
- ✅ Robust public folder structure

The deployment system is designed to be robust and maintainable, ensuring your game is always available and up-to-date with the latest changes. The public folder contains everything needed for the game to work, making it a complete, self-contained deployment package.
