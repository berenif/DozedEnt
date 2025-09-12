# 📁 DozedEnt Project Structure

## 🎯 GitHub Pages Optimized Structure

This document outlines the improved project structure following GitHub Pages best practices and modern web development standards.

---

## 🏗️ Directory Structure

```
DozedEnt/
├── 📄 README.md                    # Main project documentation
├── 📄 LICENSE                      # MIT License
├── 📄 package.json                 # Node.js dependencies and scripts
├── 📄 package-lock.json            # Dependency lock file
├── 📄 PERSISTENCE_SYSTEM.md        # Persistence system documentation
├── 📄 PROJECT_STRUCTURE.md         # This file
├── 📄 _config.yml                  # Jekyll configuration (root)
├── 📄 game.wasm                    # Main WebAssembly module
├── 📄 site.js                      # Main game controller
├── 📄 favicon.ico                  # Site favicon
├── 📄 mocha.opts                   # Mocha test configuration
│
├── 📂 docs/                        # 🌐 GitHub Pages deployment directory
│   ├── 📄 index.html               # Main game page
│   ├── 📄 favicon.ico              # Site favicon
│   ├── 📄 README.md                # Live demo documentation
│   ├── 📄 _config.yml              # Jekyll configuration for GitHub Pages
│   ├── 📂 js/                      # JavaScript modules
│   │   ├── 📄 site.js              # Main game controller
│   │   └── 📂 src/                 # Source modules (copied from src/)
│   ├── 📂 wasm/                    # WebAssembly modules
│   │   └── 📄 game.wasm            # Main game engine
│   ├── 📂 assets/                  # Game assets (copied from assets/)
│   │   └── 📂 audio/               # Audio files
│   ├── 📂 css/                     # Stylesheets
│   └── 📂 images/                  # Images and visual assets
│
├── 📂 src/                         # 💻 Source code
│   ├── 📂 ai/                      # Enemy AI systems
│   ├── 📂 animation/               # Animation systems
│   ├── 📂 audio/                   # Audio management
│   ├── 📂 css/                     # Stylesheets
│   ├── 📂 effects/                 # Visual effects
│   ├── 📂 game/                    # Core game logic
│   ├── 📂 gameentity/              # Game entities
│   ├── 📂 gameplay/                # Gameplay systems
│   ├── 📂 images/                  # Image assets
│   ├── 📂 input/                   # Input handling
│   ├── 📂 lobby/                   # Lobby system
│   ├── 📂 multiplayer/             # Multiplayer features
│   ├── 📂 netcode/                 # Networking code
│   ├── 📂 ui/                      # User interface
│   ├── 📂 utils/                   # Utility functions
│   ├── 📂 wasm/                    # WebAssembly integration
│   ├── 📄 host-authority.js        # Host authority system
│   ├── 📄 lobby-analytics.js       # Lobby analytics
│   └── 📄 sound-system.js          # Sound system
│
├── 📂 assets/                      # 🎵 Game assets
│   └── 📂 audio/                   # Audio files
│       ├── 📂 ambient/             # Ambient sounds
│       ├── 📂 music/               # Background music
│       ├── 📂 sfx/                 # Sound effects
│       ├── 📂 ui/                  # UI sounds
│       └── 📂 wolf/                # Wolf sounds
│
├── 📂 data/                        # 📊 Game data
│   └── 📂 balance/                 # Balance configuration
│       ├── 📄 enemies.json         # Enemy stats
│       └── 📄 player.json          # Player stats
│
├── 📂 GUIDELINES/                  # 📚 Development documentation
│   ├── 📄 README.md                # Documentation index
│   ├── 📄 AGENTS.md                # Main architecture guide
│   ├── 📂 AI/                      # AI documentation
│   ├── 📂 ANIMATION/               # Animation documentation
│   ├── 📂 BUILD/                   # Build documentation
│   ├── 📂 FIGHT/                   # Combat documentation
│   ├── 📂 GAME/                    # Game loop documentation
│   ├── 📂 MULTIPLAYER/             # Multiplayer documentation
│   ├── 📂 SYSTEMS/                 # Systems documentation
│   └── 📂 UTILS/                   # Utilities documentation
│
├── 📂 tools/                       # 🛠️ Development tools
│   ├── 📂 config/                  # Configuration files
│   │   ├── 📄 eslint.config.js     # ESLint configuration
│   │   ├── 📄 playwright.config.js # Playwright configuration
│   │   ├── 📄 rollup.config.js     # Main Rollup config
│   │   ├── 📄 rollup.config.animations.js # Animations build
│   │   └── 📄 rollup.config.wolf.js # Wolf build config
│   ├── 📂 scripts/                 # Build and utility scripts
│   │   ├── 📄 server.js            # Development server
│   │   ├── 📄 deploy.sh            # Deployment script
│   │   └── 📂 scripts/             # Original scripts directory
│   └── 📂 build/                   # Build artifacts (temporary)
│
├── 📂 test/                        # 🧪 Test files
│   ├── 📂 unit/                    # Unit tests
│   ├── 📂 integration/             # Integration tests
│   ├── 📂 performance/             # Performance tests
│   └── 📂 certs/                   # Test certificates
│
├── 📂 demos/                       # 🎮 Demo files
│   ├── 📄 procedural-wolf-demo.html
│   └── 📄 simple-player-demo.html
│
├── 📂 coverage/                    # 📊 Test coverage reports
├── 📂 dist/                        # 📦 Distribution files
├── 📂 emsdk/                       # 🔧 Emscripten SDK
├── 📂 node_modules/                # 📦 Node.js dependencies
├── 📂 .github/                     # ⚙️ GitHub configuration
│   └── 📂 workflows/               # GitHub Actions workflows
│       └── 📄 deploy-github-pages.yml
└── 📄 .gitignore                   # Git ignore rules
```

---

## 🎯 Key Improvements

### 1. 🌐 GitHub Pages Structure
- **`docs/` directory** - Standard GitHub Pages deployment folder
- **Proper Jekyll configuration** - Optimized for WebAssembly and modern JS
- **Asset organization** - Clean separation of deployment assets
- **Automated deployment** - GitHub Actions workflow for CI/CD

### 2. 🛠️ Development Organization
- **`tools/` directory** - Centralized development tools
- **Configuration separation** - All configs in `tools/config/`
- **Script organization** - Build and utility scripts in `tools/scripts/`
- **Demo separation** - Example files in dedicated `demos/` folder

### 3. 📚 Documentation Structure
- **Comprehensive README** - Clear project overview and quick start
- **Live demo documentation** - Dedicated docs/README.md for GitHub Pages
- **Maintained guidelines** - Existing GUIDELINES/ structure preserved
- **Project structure guide** - This document for navigation

### 4. ⚡ Performance Optimization
- **Asset optimization** - Proper MIME types for WASM files
- **Build optimization** - Efficient bundling and minification
- **Caching strategy** - Proper cache headers for static assets
- **Load time optimization** - Lazy loading and code splitting

---

## 🚀 Deployment Process

### GitHub Pages Deployment
1. **Automatic Triggers** - Push to main/master branch
2. **Build Process** - GitHub Actions builds WASM and bundles JS
3. **Asset Processing** - Copies optimized assets to docs/
4. **Jekyll Processing** - GitHub Pages serves with proper MIME types
5. **Live Update** - Site updates automatically within minutes

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build:all

# Test the build
npm test
```

---

## 📋 File Purpose Guide

### Core Game Files
- **`game.wasm`** - Main WebAssembly game engine
- **`site.js`** - JavaScript game controller and UI
- **`index.html`** - Main game page with UI elements

### Configuration Files
- **`package.json`** - Node.js project configuration
- **`_config.yml`** - Jekyll configuration for GitHub Pages
- **`tools/config/*.js`** - Build tool configurations

### Documentation
- **`README.md`** - Main project documentation
- **`docs/README.md`** - Live demo documentation
- **`GUIDELINES/`** - Comprehensive development guides
- **`PROJECT_STRUCTURE.md`** - This structure guide

### Development Tools
- **`tools/scripts/`** - Build and utility scripts
- **`tools/config/`** - Configuration files
- **`.github/workflows/`** - GitHub Actions CI/CD

---

## 🔄 Migration Benefits

### Before (Issues)
- ❌ Mixed deployment and development files
- ❌ Cluttered root directory
- ❌ Manual deployment process
- ❌ Inconsistent asset organization
- ❌ Difficult navigation for new developers

### After (Improvements)
- ✅ Clean separation of concerns
- ✅ GitHub Pages best practices
- ✅ Automated CI/CD deployment
- ✅ Organized development tools
- ✅ Clear documentation structure
- ✅ Improved developer experience
- ✅ Better project maintainability

---

## 📝 Next Steps

1. **Update repository settings** - Enable GitHub Pages from docs/ folder
2. **Configure custom domain** (optional) - Add CNAME file to docs/
3. **Test deployment** - Verify automated build and deploy process
4. **Update documentation links** - Ensure all internal links work
5. **Monitor performance** - Check load times and optimization

---

*This structure follows GitHub Pages best practices while maintaining the existing WASM-first architecture and comprehensive documentation system.*
