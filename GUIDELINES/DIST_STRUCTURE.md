# Improved Dist Folder Structure

## Overview

The dist/ folder has been reorganized into a logical, maintainable structure that separates concerns and provides better organization for different types of built files.

## New Structure

```
dist/
├── core/                    # Core networking modules
│   ├── trystero-firebase.min.js
│   ├── trystero-ipfs.min.js
│   ├── trystero-mqtt.min.js
│   ├── trystero-nostr.min.js
│   ├── trystero-supabase.min.js
│   ├── trystero-torrent.min.js
│   ├── trystero-wasm.min.js
│   └── index.js            # Core modules index
├── wasm/                    # WASM modules
│   ├── game.wasm
│   └── game-host.wasm
├── animations/              # Animation modules
│   ├── player-animator.js
│   ├── player-animator.min.js
│   ├── player-animator.umd.js
│   ├── wolf-animation.js
│   ├── wolf-animation.min.js
│   ├── wolf-animation.umd.js
│   └── index.js            # Animations index
├── sourcemaps/             # Source map files
│   ├── player-animator.js.map
│   ├── player-animator.min.js.map
│   ├── player-animator.umd.js.map
│   ├── wolf-animation.js.map
│   ├── wolf-animation.min.js.map
│   └── wolf-animation.umd.js.map
├── reports/                # Build and validation reports
│   ├── BUILD_REPORT.json
│   ├── BUILD_REPORT.md
│   ├── VALIDATION_REPORT.json
│   └── VALIDATION_REPORT.md
├── legacy/                 # Legacy files (backward compatibility)
├── index.js               # Main distribution index
└── README.md              # Distribution documentation
```

## Benefits

### 1. **Logical Organization**
- **Core modules**: All networking/communication modules in one place
- **Animations**: All animation-related modules grouped together
- **Source maps**: Separated for cleaner debugging
- **Reports**: Build artifacts and validation results organized

### 2. **Better Maintainability**
- Clear separation of concerns
- Easy to find specific file types
- Consistent naming conventions
- Index files for easy imports

### 3. **Improved Developer Experience**
- Auto-generated index files for easy imports
- Comprehensive documentation
- Clear file type organization
- Backward compatibility maintained

### 4. **CI/CD Friendly**
- Organized reports for automated analysis
- Clear structure for deployment scripts
- Easy to exclude/include specific directories

## Usage Examples

### Core Modules
```javascript
// Import specific core modules
import { firebase, ipfs, mqtt } from './dist/core/index.js';

// Or import individual modules
import FirebaseStrategy from './dist/core/trystero-firebase.min.js';
import IpfsStrategy from './dist/core/trystero-ipfs.min.js';
```

### Animation Modules
```javascript
// Import animation modules
import { PlayerAnimator, WolfAnimation } from './dist/animations/index.js';

// Or import individual modules
import PlayerAnimator from './dist/animations/player-animator.min.js';
import WolfAnimation from './dist/animations/wolf-animation.min.js';
```

### WASM Modules
```javascript
// Load WASM modules
import { WasmManager } from './src/wasm/wasm-manager.js';

const wasmManager = new WasmManager();
await wasmManager.loadGameModule('./dist/wasm/game.wasm');
await wasmManager.loadHostModule('./dist/wasm/game-host.wasm');
```

### All Modules
```javascript
// Import everything
import * from './dist/index.js';

// This gives you access to all core and animation modules
```

### UMD Modules (for browsers)
```html
<!-- Include UMD modules directly in HTML -->
<script src="./dist/animations/player-animator.umd.js"></script>
<script src="./dist/animations/wolf-animation.umd.js"></script>

<script>
  // Use the global variables
  const playerAnimator = new AnimatedPlayer();
  const wolfAnimation = new WolfAnimationSystem();
</script>
```

## File Types Explained

### Core Modules (`core/`)
- **Purpose**: Networking and communication strategies
- **Format**: ES modules, minified for production
- **Size**: Optimized for minimal bundle impact
- **Usage**: Imported by other modules or applications

### WASM Modules (`wasm/`)
- **Purpose**: Game logic and host authority
- **Format**: WebAssembly binary files
- **Files**: 
  - `game.wasm` - Main game logic
  - `game-host.wasm` - Host authority logic
- **Usage**: Loaded by JavaScript WASM manager

### Animation Modules (`animations/`)
- **Purpose**: Player and wolf animation systems
- **Formats**: 
  - `.js`: Development version with source maps
  - `.min.js`: Production minified version
  - `.umd.js`: Universal Module Definition for browsers
- **Usage**: Game animation and character movement

### Source Maps (`sourcemaps/`)
- **Purpose**: Debug information for development
- **Format**: `.map` files
- **Usage**: Browser dev tools debugging
- **Note**: Only generated in development builds

### Reports (`reports/`)
- **Purpose**: Build analysis and validation results
- **Formats**: JSON (machine-readable) and Markdown (human-readable)
- **Usage**: CI/CD analysis, performance monitoring

## Build Integration

### Automatic Organization
The enhanced build system automatically organizes files:

```bash
npm run build  # Automatically organizes dist/ structure
```

### Manual Organization
You can also organize manually:

```bash
npm run build:organize  # Organize existing dist/ files
```

### Validation
Validate the organized structure:

```bash
npm run build:validate  # Validates organized structure
```

## Backward Compatibility

### Legacy Support
- Original file paths maintained in `legacy/` directory
- Symlinks created for common file references
- Gradual migration path for existing code

### Migration Guide

#### Old Import Style
```javascript
// Old way
import FirebaseStrategy from './dist/trystero-firebase.min.js';
import PlayerAnimator from './dist/player-animator.min.js';
```

#### New Import Style
```javascript
// New way (recommended)
import { firebase } from './dist/core/index.js';
import { PlayerAnimator } from './dist/animations/index.js';

// Or direct imports
import FirebaseStrategy from './dist/core/trystero-firebase.min.js';
import PlayerAnimator from './dist/animations/player-animator.min.js';
```

## Configuration

### Rollup Output Paths
The Rollup configurations have been updated to output to the new structure:

```javascript
// tools/config/rollup.config.js
output: {
  file: `dist/core/trystero-${name}.min.js`
}

// tools/config/rollup.config.animations.js
output: [
  {
    file: 'dist/animations/player-animator.min.js',
    sourcemapFile: 'dist/sourcemaps/player-animator.min.js.map'
  }
]
```

### Bundle Size Thresholds
Updated thresholds for the new structure:

```javascript
const bundleSizeThresholds = {
  'core/trystero-firebase.min.js': 200,
  'core/trystero-ipfs.min.js': 150,
  'animations/player-animator.min.js': 300,
  'animations/wolf-animation.min.js': 250
};
```

## Best Practices

### Development
1. **Use development builds** for debugging with source maps
2. **Import from index files** for cleaner code
3. **Check reports** for bundle size and optimization insights

### Production
1. **Use minified versions** for smaller bundles
2. **Import only what you need** to reduce bundle size
3. **Monitor bundle sizes** using validation reports

### CI/CD
1. **Validate structure** after builds
2. **Check reports** for quality gates
3. **Use organized structure** for deployment scripts

## Troubleshooting

### Common Issues

#### Import Errors
```javascript
// ❌ Wrong path
import FirebaseStrategy from './dist/trystero-firebase.min.js';

// ✅ Correct path
import FirebaseStrategy from './dist/core/trystero-firebase.min.js';
```

#### Missing Files
- Ensure build completed successfully
- Check if files exist in correct directories
- Run `npm run build:validate` to check structure

#### Source Map Issues
- Source maps only generated in development builds
- Check `dist/sourcemaps/` directory
- Ensure browser dev tools are configured correctly

### Debug Commands
```bash
# Check dist structure
ls -la dist/

# Validate organization
npm run build:validate

# Reorganize if needed
npm run build:organize

# Check specific directory
ls -la dist/core/
ls -la dist/animations/
```

## Future Enhancements

### Planned Improvements
1. **Tree shaking optimization** for index files
2. **Automatic dependency analysis** and optimization
3. **Bundle splitting** for better caching
4. **Compression analysis** and optimization
5. **Performance budgets** and monitoring

### Extension Points
- Custom organization rules
- Additional file type categories
- Integration with CDN deployment
- Automated optimization suggestions

## Support

For issues with the new structure:

1. Check this documentation
2. Run `npm run build:validate` to check structure
3. Use `npm run build:organize` to reorganize existing files
4. Check build reports for specific errors
5. Review the project's issue tracker

The improved dist/ structure provides better organization, maintainability, and developer experience while maintaining backward compatibility.
