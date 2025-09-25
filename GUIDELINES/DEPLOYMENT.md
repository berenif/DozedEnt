# DozedEnt Deployment Guide

This document describes the new deployment system that publishes only the `/build` directory to GitHub Pages with environment injection and protocol version validation.

## 🚀 New Deployment System

### Key Features

- **Build-Only Publishing**: Only the `/build` directory is published to GitHub Pages
- **Environment Injection**: `__PLACEHOLDER__` tokens are replaced with actual values at deployment time
- **Protocol Validation**: Build fails if client and server protocol versions don't match
- **Clean Structure**: No source files or development artifacts in production

### Workflow: `deploy-build-only.yml`

The new deployment workflow (`deploy-build-only.yml`) provides:

1. **Protocol Version Validation**
   - Validates that `CLIENT_PROTOCOL_VERSION` and `SERVER_PROTOCOL_VERSION` match
   - Fails the build if versions are incompatible
   - Uses environment variables for override capability

2. **Environment Injection**
   - Replaces `__PLACEHOLDER__` tokens in HTML and JS files
   - Injects build metadata as `window.__BUILD__`
   - Creates `build-info.json` with deployment information

3. **Build Directory Publishing**
   - Publishes only the `/build` directory to GitHub Pages root
   - Maintains clean separation between source and production files

## 🔧 Environment Variables

The following environment variables are injected during deployment:

| Variable | Description | Example |
|----------|-------------|---------|
| `__CLIENT_PROTOCOL_VERSION__` | Client protocol version | `1.0.0` |
| `__SERVER_PROTOCOL_VERSION__` | Server protocol version | `1.0.0` |
| `__BUILD_ENVIRONMENT__` | Build environment | `production` |
| `__DEPLOYMENT_TIMESTAMP__` | Deployment timestamp | `123` |
| `__BUILD_TIME__` | Build timestamp | `2025-01-21T18:30:00Z` |

## 📁 File Structure

### Source Structure
```
├── src/
│   ├── config/
│   │   └── protocol-versions.js    # Protocol version definitions
│   └── templates/
│       └── environment-injection-template.js  # Example usage
├── tools/scripts/
│   └── validate-protocol-versions.js  # Validation script
└── .github/workflows/
    └── deploy-build-only.yml       # New deployment workflow
```

### Build Structure (Published)
```
build/                              # Published to GitHub Pages root
├── index.html                      # Main game page
├── favicon.ico                     # Site icon
├── site.js                         # Main game script
├── game.wasm                       # Game WASM module
├── game-host.wasm                  # Host WASM module
├── build-info.json                 # Build metadata
├── _config.yml                     # Jekyll configuration
├── core/                           # Core modules
├── animations/                     # Animation modules
├── wasm/                           # WASM files
└── assets/                         # Game assets
```

## 🛠️ Usage

### 1. Using Environment Injection

In your source files, use placeholder tokens:

```javascript
// src/templates/environment-injection-template.js
export const ENVIRONMENT_CONFIG = {
  clientProtocolVersion: '__CLIENT_PROTOCOL_VERSION__',
  serverProtocolVersion: '__SERVER_PROTOCOL_VERSION__',
  buildEnvironment: '__BUILD_ENVIRONMENT__',
  deploymentTimestamp: '__DEPLOYMENT_TIMESTAMP__',
  buildTime: '__BUILD_TIME__'
}
```

These tokens will be automatically replaced during deployment.

### 2. Protocol Version Management

Define protocol versions in `src/config/protocol-versions.js`:

```javascript
export const PROTOCOL_VERSIONS = {
  CLIENT: '1.0.0',
  SERVER: '1.0.0',
  MQTT: 4,
  WEBRTC: '1.0.0',
  GAME: '1.0.0'
}
```

### 3. Validation

Run protocol validation locally:

```bash
npm run validate:protocol-versions
```

Or validate all deployment aspects:

```bash
npm run deploy:validate:protocols
```

## 🔄 Migration from Old System

### Deprecated Workflows

The following workflows are now deprecated:
- `deploy-github-pages.yml` (publishes `/public`)
- `deploy-public.yml` (publishes `/public`)

### Migration Steps

1. **Update GitHub Pages Settings**
   - Go to repository Settings → Pages
   - Change source from "Deploy from a branch" to "GitHub Actions"
   - The new workflow will automatically deploy from `/build`

2. **Update Environment Variables**
   - Replace any hardcoded values with `__PLACEHOLDER__` tokens
   - Update protocol version references to use the config file

3. **Test Deployment**
   - Push to main branch to trigger the new workflow
   - Verify that only `/build` contents are published
   - Check that environment variables are properly injected

## 🚨 Troubleshooting

### Protocol Version Mismatch

If the build fails with protocol version mismatch:

1. Check `src/config/protocol-versions.js`
2. Ensure `CLIENT` and `SERVER` versions match
3. Or set environment variables:
   ```bash
   export CLIENT_PROTOCOL_VERSION=1.0.0
   export SERVER_PROTOCOL_VERSION=1.0.0
   ```

### Environment Injection Issues

If `__PLACEHOLDER__` tokens remain in production:

1. Check that the workflow is using the correct file paths
2. Verify that files are being processed during the "Inject Environment Variables" step
3. Check the workflow logs for sed command errors

### Build Directory Issues

If the build directory is empty or missing files:

1. Ensure `npm run build:all` completes successfully
2. Check that the `dist/` directory contains the expected files
3. Verify the "Prepare Build Directory" step copies files correctly

## 📊 Monitoring

### Build Metadata

The deployment creates `build-info.json` with:
- Build timestamp
- Protocol versions
- Git commit information
- Workflow run number

### Runtime Validation

The injected `window.__BUILD__` object provides:
- Build-time information
- Environment configuration
- Protocol version validation

### Logs

Check GitHub Actions logs for:
- Protocol validation results
- Environment injection status
- File copy operations
- Final validation checks

## 🔐 Security

- Environment variables are injected at build time, not runtime
- No sensitive information should be placed in `__PLACEHOLDER__` tokens
- Protocol versions are validated before deployment
- Build artifacts are isolated from source code

## 📈 Performance

- Only production files are published (no source files)
- WASM files are served with correct MIME types
- Jekyll processing is disabled for binary files
- Build directory structure is optimized for GitHub Pages
