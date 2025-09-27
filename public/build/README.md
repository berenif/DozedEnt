# DozedEnt Distribution

This directory contains the built and optimized files for the DozedEnt project.

## Structure

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
└── index.js               # Main distribution index
```

## Usage

### Core Modules
```javascript
import { firebase, ipfs, mqtt } from './dist/core/index.js';
// or
import { FirebaseStrategy, IpfsStrategy } from './dist/core/index.js';
```

### Animation Modules
```javascript
import { PlayerAnimator, WolfAnimation } from './dist/animations/index.js';
```

### All Modules
```javascript
import * from './dist/index.js';
```

## File Types

- **`.min.js`**: Minified production files
- **`.js`**: Development files with source maps
- **`.umd.js`**: Universal Module Definition files
- **`.map`**: Source map files for debugging

## Reports

- **BUILD_REPORT.md**: Human-readable build summary
- **VALIDATION_REPORT.md**: Build validation results
- ***.json**: Machine-readable reports for CI/CD

## Backward Compatibility

Legacy file paths are maintained in the `legacy/` directory for any existing references.

## Building

To rebuild with the new structure:

```bash
npm run build
```

The build process will automatically organize files into this structure.
