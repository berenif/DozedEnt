# 🚀 GitHub Pages Deployment Guide

<div align="center">
  <h3>🌐 Deploy Your Trystero Documentation to GitHub Pages</h3>
  <p>Automated deployment with GitHub Actions • Zero configuration • Instant updates</p>
</div>

---

## 📌 Overview

This guide provides step-by-step instructions for deploying your enhanced Trystero game framework to GitHub Pages with automatic continuous deployment via GitHub Actions.

### ✨ Key Features
- **Automatic Deployment** - Push to main branch triggers deployment
- **GitHub Actions CI/CD** - Fully automated build and deploy pipeline
- **Custom Domain Support** - Use your own domain name
- **WASM Support** - Proper MIME types for WebAssembly files
- **Jekyll Integration** - GitHub Pages processing with custom configuration
- **Multiplayer Ready** - P2P networking with Trystero infrastructure
- **Enhanced UI** - Modern lobby system with analytics dashboard
- **Performance Optimized** - Deterministic WASM execution

## 📁 Files & Configuration

### Required Files

| File | Purpose | Location |
|------|---------|----------|
| `deploy-gh-pages.yml` | GitHub Actions workflow | `.github/workflows/` |
| `_config.yml` | Jekyll configuration | `docs/` |
| `package.json` | Build scripts | Root directory |
| `index.html` | Main documentation page | `docs/` |
| `game.wasm` | WebAssembly module | `docs/` |

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
2. Select **Deploy to GitHub Pages** workflow
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
2. **Setup Node.js** - Installs Node.js version 20
3. **Install dependencies** - Runs `npm ci` to install packages
4. **Build project** - Runs `npm run build:docs` which:
   - Builds the project with Rollup
   - Copies built files to the docs folder
5. **Upload artifact** - Packages the docs folder for deployment
6. **Deploy** - Publishes the site to GitHub Pages

## 💻 Local Development

### 🧪 Testing Locally

Before deploying to production, test your site locally:

```bash
# Install dependencies
npm install

# Build the project
npm run build:docs

# Serve the docs folder locally
npx serve docs
# Or use any static server:
# python -m http.server 8000 -d docs
```

## 🌐 Custom Domain Configuration

### 🔗 Setting Up Your Domain

1. Add a `CNAME` file to the `docs/` folder with your domain:
   ```
   example.com
   ```

2. Configure your domain's DNS:
   - For apex domain (example.com):
     - Add A records pointing to GitHub's IPs:
       - 185.199.108.153
       - 185.199.109.153
       - 185.199.110.153
       - 185.199.111.153
   - For subdomain (www.example.com):
     - Add CNAME record pointing to `[username].github.io`

3. Enable HTTPS in repository settings after DNS propagation

## 🔧 Troubleshooting Guide

### ⚠️ Common Issues & Solutions

#### 🔴 Build Failures

- Check the Actions tab for error logs
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

#### 🔵 Page Not Loading

- Verify GitHub Pages is enabled in Settings
- Check that the workflow completed successfully
- Wait 5-10 minutes for initial deployment
- Clear browser cache

#### 🟡 404 Errors

- If using a subdomain path, update `baseurl` in `docs/_config.yml`:
  ```yaml
  baseurl: "/repository-name"
  ```
- Ensure all asset paths in HTML are relative

#### 🟠 WASM Files Not Loading

The Jekyll configuration is set to properly serve WASM files. If issues persist:
- Check browser console for CORS errors
- Verify WASM file exists in `docs/` folder
- Ensure proper MIME type is set (handled by Jekyll config)

## 🔄 Updating Your Site

### 🚀 Automatic Updates

Deployment is triggered automatically when you push changes:

```bash
git add .
git commit -m "Update documentation"
git push origin main
```

The GitHub Actions workflow will automatically build and deploy your changes.

## 🔨 Manual Deployment

### 🛠️ Alternative Deployment Method

For manual control over deployment:

1. Build locally: `npm run build:docs`
2. Commit the docs folder: `git add docs && git commit -m "Update docs"`
3. Push to GitHub: `git push origin main`

## 📝 Important Notes

### ⏱️ Deployment Timing
- **First deployment**: 10-15 minutes for DNS propagation
- **Updates**: 2-5 minutes to go live
- **Cache refresh**: May take up to 10 minutes

### 📈 Limitations
- **Size limit**: 1GB soft limit for GitHub Pages sites
- **Bandwidth**: 100GB/month soft limit
- **Build time**: 10 minute maximum for Actions

### ⚙️ Technical Details
- WASM files preserved with correct MIME types
- Jekyll processes Markdown but uses custom HTML/CSS
- All assets in `docs/` folder are deployed
- Supports modern browsers with WebAssembly

## 👥 Support & Resources

### 📚 Documentation
- 📖 [GitHub Pages Documentation](https://docs.github.com/en/pages)
- 🤖 [GitHub Actions Documentation](https://docs.github.com/en/actions)
- 🌐 [Custom Domains Guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- 🔒 [HTTPS Configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)

### 🐛 Reporting Issues
- **Bug Reports**: Open an issue with `[Deploy]` tag
- **Feature Requests**: Use `[Enhancement]` tag
- **Questions**: Start a discussion in the repository

### 💬 Community
- Join our [Discord Server](#)
- Follow updates on [Twitter](#)
- Check [Stack Overflow](https://stackoverflow.com/questions/tagged/github-pages)

---

*Last updated: January 2025*