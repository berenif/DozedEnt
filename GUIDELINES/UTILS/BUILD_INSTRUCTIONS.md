# 🛠️ WASM-First Game Build Instructions

## Overview

This document provides comprehensive instructions for building the **DozedEnt WASM-first game framework**, including C++ game logic compilation to WebAssembly, balance data generation, and deployment to GitHub Pages.

> **Architecture**: All game logic lives in WASM (C++). JavaScript handles only rendering, input, and networking.

## Prerequisites

- **Node.js 20+** and npm installed
- **Emscripten SDK** (vendored in `emsdk/` directory)
- **Git** for version control
- **Modern web browser** with WebAssembly support

## 🚀 Primary Build Commands

### Install Dependencies
```bash
npm install
```

### WASM Production Build
```bash
npm run wasm:build        # Builds optimized game.wasm
```
**Output**: `./game.wasm` (~43KB optimized)

### WASM Development Build
```bash
npm run wasm:build:dev    # Builds with debug info and assertions
```
**Output**: `./game.wasm` (larger, with debugging)

### Host-Authoritative WASM
```bash
npm run wasm:build:host   # Builds multiplayer host module
```
**Output**: `./game-host.wasm`

### Build All WASM Modules
```bash
npm run wasm:build:all    # Builds both game.wasm and game-host.wasm
```

## 🔧 Build Process Details

### What Happens During Build

1. **Environment Setup**: Initializes Emscripten SDK from `emsdk/`
2. **Balance Generation**: Runs `generate-balance.cjs` to create `src/wasm/generated/balance_data.h`
3. **C++ Compilation**: Compiles `src/wasm/game.cpp` with all dependencies
4. **Optimization**: Applies `-O3` optimization and WASM-specific flags
5. **Output**: Generates standalone `.wasm` files in project root

### Build Flags Used

```bash
# Production build flags
em++ src/wasm/game.cpp \
    -O3 \                           # Maximum optimization
    -s STANDALONE_WASM=1 \          # Standalone WASM without JS glue
    -s WASM_BIGINT=1 \             # BigInt support for 64-bit integers
    -s EXPORT_ALL=0 \              # Export only marked functions
    -s ALLOW_MEMORY_GROWTH=1 \     # Dynamic memory allocation
    -o ./game.wasm
```

## Project Structure

```
DozedEnt/
  _config.yml
  dist/
    player-animator.js
    player-animator.min.js
    player-animator.umd.js
    wolf-animation.js
    wolf-animation.min.js
    wolf-animation.umd.js
    trystero-*.min.js
  emsdk/
    ... (Emscripten SDK and toolchain files)
  GUIDELINES/
    ... (project docs and guides)
  index.html
  LICENSE
  node_modules/
  package.json
  package-lock.json
  playwright.config.js
  README.md
  rollup.config.js
  rollup.config.animations.js
  rollup.config.wolf.js
  scripts/
    build-wasm-host.sh
    find-proxy.js
    get-bundle-sizes.js
    pre-build-check.js
    test-ice.js
    test-relays.js
    validate-github-pages.js
  site.js
  src/
    ai/
      wolf-ai-enhanced.js
    animation/
      animation-system.js
      environmental-animations.js
      player-animator.js
      wolf-animation.js
    css/            (2 *.css)
    effects/        (3 *.png)
    gameentity/     (2 *.js)
    images/         (2 *.png)
    netcode/        (16 *.js, 13 *.ts)
    utils/          (16 *.js, 2 *.ts)
    wasm/           (10 *.h, 2 *.cpp, 1 *.wasm)
  test/
    bug-fixes.spec.js
    ... (other *.spec.js and test assets)
```

## Testing Locally

### Using Python HTTP Server
```bash
cd docs
python3 -m http.server 8080
```
Then open: http://localhost:8080/animations-showcase.html

### Using Node.js serve
```bash
npx serve docs
```

### Using npm package serve
```bash
npm install -g serve
serve docs
```

## Integration in HTML

### ES Module Import
```html
<script type="module">
import AnimatedPlayer from './dist/player-animator.js'

const player = new AnimatedPlayer(x, y, options)
</script>
```

### UMD Script Tag
```html
<script src="./dist/player-animator.umd.js"></script>
<script>
const player = new AnimatedPlayer(x, y, options)
</script>
```

## Animation Features

The built system includes:

### Player States
- **Idle**: Default resting animation
- **Running**: Movement animation
- **Attack**: Combat animation with damage
- **Block**: Defensive stance
- **Roll**: Dodge with invulnerability
- **Hurt**: Damage reaction
- **Death**: Game over state

### Visual Effects
- Particle systems for each action
- Color feedback for states
- Health and stamina bars
- Smooth animation transitions

### Input System
- Keyboard controls (WASD, Space, Shift, Ctrl)
- Alternative key bindings
- Gamepad support (future)

## Configuration Options

### Rollup Configuration
The animation build uses `rollup.config.animations.js`:
```javascript
{
  input: 'src/animation/player-animator.js',
  output: [
    { file: 'dist/player-animator.js', format: 'es' },
    { file: 'dist/player-animator.min.js', format: 'es', minified },
    { file: 'dist/player-animator.umd.js', format: 'umd' }
  ]
}
```

### Build Optimization
- Tree shaking enabled
- ES2019 target
- Console logs removed in production
- Source maps for debugging

## Deployment

### GitHub Pages
1. Build the docs:
   ```bash
   npm run build:docs
   ```

2. Commit and push:
   ```bash
   git add docs/
   git commit -m "Update animation build"
   git push origin main
   ```

3. Enable GitHub Pages in repository settings
4. Select `/docs` as the source directory

### Custom Server
1. Build files:
   ```bash
   npm run build:docs
   ```

2. Upload `docs/` directory to your server

3. Configure web server to serve static files

## Available Demos

### Production Demo
`docs/animations-showcase.html`
- Full-featured animation showcase
- Interactive controls
- Enemy AI for testing
- Status panel
- Documentation links

### Development Demo
`demo/player-animations-demo.html`
- Debug information
- Test buttons
- Performance metrics
- Raw animation testing

## Troubleshooting

### Build Errors

**Issue**: `rollup: not found`
**Solution**: Run `npm install` first

**Issue**: External module warnings
**Solution**: These are expected for modular design

**Issue**: Missing animations
**Solution**: Ensure `animation-system.js` is in `src/animation/`

### Runtime Errors

**Issue**: Module not found
**Solution**: Use correct import path `./dist/player-animator.js`

**Issue**: Animations not playing
**Solution**: Check browser console for errors, ensure deltaTime is passed

**Issue**: Input not working
**Solution**: Verify event listeners are attached

## Performance Tips

1. **Use minified version in production**
   ```html
   <script src="./dist/player-animator.min.js"></script>
   ```

2. **Enable hardware acceleration**
   ```css
   canvas {
     will-change: transform;
   }
   ```

3. **Optimize render loop**
   ```javascript
   // Use requestAnimationFrame
   requestAnimationFrame(gameLoop)
   ```

## API Quick Reference

```javascript
// Create player
const player = new AnimatedPlayer(x, y, {
    health: 100,
    stamina: 100,
    speed: 250,
    particleSystem: particles
})

// Update in game loop
player.update(deltaTime, input)

// Render
player.render(ctx, camera)

// Combat
player.takeDamage(damage, knockbackX, knockbackY)
player.startAttack()
player.startBlock()
player.startRoll(input)

// State management
player.setState('idle')
player.respawn(x, y)
```

## Contributing

To add new animations:

1. Define frames in `AnimationPresets`
2. Add state to `AnimatedPlayer`
3. Implement transition logic
4. Update documentation
5. Run build: `npm run build:docs`
6. Test in demo page

## Support

- Documentation: `docs/PLAYER_ANIMATIONS.md`
- Demo: `docs/animations-showcase.html`
- Source: `src/animation/player-animator.js`

## License

Part of the Trystero project - MIT License