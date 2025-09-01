# GitHub Pages Deployment Guide

This guide explains how to deploy your Trystero documentation site to GitHub Pages.

## Overview

The project is configured to automatically deploy the `docs/` folder to GitHub Pages whenever you push to the main/master branch. The deployment uses GitHub Actions for continuous deployment.

## Files Created

1. **`.github/workflows/deploy-gh-pages.yml`** - GitHub Actions workflow for automatic deployment
2. **`docs/_config.yml`** - Jekyll configuration for GitHub Pages
3. **`package.json`** - Updated with `build:docs` script

## Setup Instructions

### 1. Enable GitHub Pages in Your Repository

1. Go to your repository on GitHub
2. Click on **Settings** (in the repository navigation)
3. Scroll down to the **Pages** section in the left sidebar
4. Under **Source**, select **GitHub Actions** (not "Deploy from a branch")
5. Click **Save**

### 2. Verify GitHub Actions Permissions

1. Go to **Settings** → **Actions** → **General**
2. Scroll down to **Workflow permissions**
3. Ensure **Read and write permissions** is selected
4. Check **Allow GitHub Actions to create and approve pull requests** (optional but recommended)
5. Click **Save**

### 3. Deploy Your Site

The site will automatically deploy when you:
- Push to the `main` or `master` branch
- Manually trigger the workflow from the Actions tab

To manually trigger:
1. Go to the **Actions** tab in your repository
2. Select **Deploy to GitHub Pages** workflow
3. Click **Run workflow**
4. Select the branch and click **Run workflow**

### 4. Access Your Site

After successful deployment, your site will be available at:
- **With custom domain**: `https://your-domain.com`
- **Without custom domain**: `https://[username].github.io/[repository-name]`

You can find the exact URL in:
- **Settings** → **Pages** → Your site is published at...
- The GitHub Actions workflow run summary

## Build Process

The deployment workflow performs these steps:

1. **Checkout** - Gets the latest code from your repository
2. **Setup Node.js** - Installs Node.js version 20
3. **Install dependencies** - Runs `npm ci` to install packages
4. **Build project** - Runs `npm run build:docs` which:
   - Builds the project with Rollup
   - Copies built files to the docs folder
5. **Upload artifact** - Packages the docs folder for deployment
6. **Deploy** - Publishes the site to GitHub Pages

## Local Development

To test the site locally before deploying:

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

## Custom Domain (Optional)

To use a custom domain:

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

## Troubleshooting

### Build Fails

- Check the Actions tab for error logs
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Page Not Loading

- Verify GitHub Pages is enabled in Settings
- Check that the workflow completed successfully
- Wait 5-10 minutes for initial deployment
- Clear browser cache

### 404 Errors

- If using a subdomain path, update `baseurl` in `docs/_config.yml`:
  ```yaml
  baseurl: "/repository-name"
  ```
- Ensure all asset paths in HTML are relative

### WASM Files Not Loading

The Jekyll configuration is set to properly serve WASM files. If issues persist:
- Check browser console for CORS errors
- Verify WASM file exists in `docs/` folder
- Ensure proper MIME type is set (handled by Jekyll config)

## Updating the Site

Simply push your changes to the main/master branch:

```bash
git add .
git commit -m "Update documentation"
git push origin main
```

The GitHub Actions workflow will automatically build and deploy your changes.

## Manual Deployment

If you prefer manual deployment:

1. Build locally: `npm run build:docs`
2. Commit the docs folder: `git add docs && git commit -m "Update docs"`
3. Push to GitHub: `git push origin main`

## Notes

- The first deployment may take 10-15 minutes to become available
- Subsequent deployments typically take 2-5 minutes
- The workflow preserves the WASM file and all assets in the docs folder
- GitHub Pages has a soft limit of 1GB for sites
- The site uses Jekyll for processing, but no Jekyll theme (custom HTML/CSS)

## Support

For issues specific to:
- **GitHub Pages**: Check [GitHub Pages documentation](https://docs.github.com/en/pages)
- **GitHub Actions**: See [GitHub Actions documentation](https://docs.github.com/en/actions)
- **This project**: Open an issue in the repository