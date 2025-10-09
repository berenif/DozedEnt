# 🛠️ WASM Build Workflow Guide

**Last Updated**: January 2025  
**Status**: ✅ **PRODUCTION READY**

## Overview

This document provides a comprehensive guide to the WASM build workflow for DozedEnt, including troubleshooting, optimization, and best practices.

## 🚀 Quick Start

### Primary Build Commands

```bash
# Production build (recommended)
npm run wasm:build

# Development build (with debug info)
npm run wasm:build:dev

# Host-authoritative build (multiplayer)
npm run wasm:build:host

# Build all modules
npm run wasm:build:all
```

### Output Locations

- **Main WASM**: `public/wasm/game.wasm` (~195KB)
- **Host WASM**: `game-host.wasm` (~16KB)
- **Export Manifest**: `WASM_EXPORTS.json`

## 🔧 Build Process

### 1. Environment Setup

The build scripts automatically:
- Initialize Emscripten SDK from `emsdk/`
- Set up environment variables
- Verify `em++` compiler availability

### 2. Balance Data Generation

```bash
node ./tools/scripts/generate-balance.cjs
```

**Output**: `public/src/wasm/generated/balance_data.h`

**Source**: `data/balance/player.json` + `data/balance/enemies.json`

### 3. C++ Compilation

**Main Source Files**:
- `public/src/wasm/game_refactored.cpp` (main entry point)
- `public/src/wasm/GameGlobals.cpp`
- `public/src/wasm/managers/*.cpp` (6 manager files)
- `public/src/wasm/coordinators/GameCoordinator.cpp`
- `public/src/wasm/physics/PhysicsManager.cpp`
- `public/src/wasm/progression/*.cpp` (2 progression files)
- `public/src/entities/PhysicsBarrel.cpp`

**Build Flags**:
```bash
-O3                                    # Maximum optimization
-s STANDALONE_WASM=1                   # Standalone WASM without JS glue
-s WASM_BIGINT=1                       # BigInt support for 64-bit integers
-s ALLOW_MEMORY_GROWTH=1               # Dynamic memory allocation
-Ipublic/src/wasm                      # Include paths
-Ipublic/src/wasm/managers
-Ipublic/src/wasm/coordinators
-Ipublic/src/wasm/physics
-Ipublic/src/wasm/progression
-Ipublic/src/entities
```

### 4. Export Manifest Generation

```bash
node ./tools/scripts/generate-wasm-exports.js --out ./WASM_EXPORTS.json
```

**Purpose**: Audit and document all exported functions for CI/CD and debugging.

## 📊 Current Build Statistics

### Performance Metrics

| Metric | Value | Target |
|--------|-------|--------|
| **Binary Size** | ~195KB | < 200KB ✅ |
| **Export Count** | 139 functions | > 100 ✅ |
| **Build Time** | ~5-10 seconds | < 30s ✅ |
| **Memory Usage** | < 32MB | < 32MB ✅ |

### Export Breakdown

- **Memory**: 1 export
- **Functions**: 137 exports
- **Tables**: 1 export
- **Total**: 139 exports

## 🐛 Troubleshooting

### Common Issues

#### 1. WASM Build Fails

**Symptoms**: Build script exits with error code

**Solutions**:
```bash
# Check Emscripten installation
em++ --version

# Verify source files exist
ls public/src/wasm/*.cpp

# Try development build for more info
npm run wasm:build:dev

# Check balance data generation
node ./tools/scripts/generate-balance.cjs
```

#### 2. Missing Exports

**Symptoms**: `exports.function_name is not a function`

**Solutions**:
```bash
# Check export manifest
cat WASM_EXPORTS.json

# List available exports
node -e "console.log(Object.keys(require('./WASM_EXPORTS.json').modules[0].exports))"

# Rebuild with correct exports
npm run wasm:build
```

#### 3. Performance Issues

**Symptoms**: Slow build times, large binary size

**Solutions**:
```bash
# Use production build (smaller)
npm run wasm:build

# Check for unused exports
node ./tools/scripts/generate-wasm-exports.js --verbose

# Profile build process
time npm run wasm:build
```

#### 4. Cross-Platform Issues

**Symptoms**: Build works on one OS but not another

**Solutions**:
```bash
# Use platform-specific scripts
npm run wasm:build:win    # Windows PowerShell
npm run wasm:build        # Cross-platform (Bash + PowerShell fallback)

# Check file permissions
chmod +x tools/scripts/build-wasm.sh

# Verify Emscripten installation
./emsdk/emsdk_env.sh      # Linux/macOS
./emsdk/emsdk_env.ps1      # Windows
```

## 🔍 Build Scripts Comparison

### PowerShell Script (`tools/scripts/build-wasm.ps1`)

**Features**:
- Windows-native execution
- Detailed error handling
- Color-coded output
- Automatic environment setup

**Usage**:
```powershell
.\tools\scripts\build-wasm.ps1 prod
.\tools\scripts\build-wasm.ps1 dev
.\tools\scripts\build-wasm.ps1 all
```

### Bash Script (`tools/scripts/build-wasm.sh`)

**Features**:
- Cross-platform compatibility
- Simple error handling
- Fast execution
- Unix-style output

**Usage**:
```bash
./tools/scripts/build-wasm.sh prod
./tools/scripts/build-wasm.sh dev
./tools/scripts/build-wasm.sh all
```

## 📁 File Structure

```
DozedEnt/
├── emsdk/                           # Emscripten SDK (vendored)
├── public/
│   ├── wasm/
│   │   └── game.wasm                # Main WASM output
│   └── src/wasm/
│       ├── generated/
│       │   └── balance_data.h       # Generated balance constants
│       ├── game_refactored.cpp      # Main entry point
│       ├── GameGlobals.cpp
│       ├── managers/                 # 6 manager files
│       ├── coordinators/             # Game coordinator
│       ├── physics/                  # Physics manager
│       ├── progression/              # 2 progression files
│       └── entities/                # Entity files
├── data/balance/                     # Balance data sources
│   ├── player.json
│   └── enemies.json
├── tools/scripts/
│   ├── build-wasm.ps1               # PowerShell build script
│   ├── build-wasm.sh                # Bash build script
│   ├── generate-balance.cjs         # Balance data generator
│   └── generate-wasm-exports.js     # Export manifest generator
├── WASM_EXPORTS.json                # Export manifest
└── package.json                     # Build commands
```

## 🚀 Optimization Tips

### 1. Build Performance

```bash
# Use production build for smaller size
npm run wasm:build

# Use development build for debugging
npm run wasm:build:dev

# Build only what you need
npm run wasm:build:host  # Only host module
```

### 2. Binary Size Optimization

**Current**: ~195KB (within target)

**Optimization flags**:
- `-O3`: Maximum optimization
- `-s STANDALONE_WASM=1`: No JS glue code
- `-s EXPORT_ALL=0`: Export only marked functions

### 3. Build Time Optimization

**Current**: ~5-10 seconds

**Tips**:
- Use SSD storage
- Ensure sufficient RAM (8GB+)
- Close unnecessary applications
- Use production build for faster iteration

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
- name: Build WASM
  run: npm run wasm:build

- name: Validate WASM
  run: |
    node ./tools/scripts/generate-wasm-exports.js
    test -f public/wasm/game.wasm
    test -f WASM_EXPORTS.json
```

### Pre-commit Hooks

```bash
# Add to .git/hooks/pre-commit
#!/bin/bash
npm run wasm:build
if [ $? -ne 0 ]; then
    echo "WASM build failed"
    exit 1
fi
```

## 📈 Monitoring

### Build Metrics

Track these metrics over time:
- Build time
- Binary size
- Export count
- Memory usage
- Error rate

### Export Manifest Analysis

```bash
# Count exports by type
node -e "
const manifest = require('./WASM_EXPORTS.json');
manifest.modules.forEach(m => {
  console.log(\`\${m.file}: \${m.exportCount} exports\`);
  Object.entries(m.byType).forEach(([type, count]) => {
    console.log(\`  \${type}: \${count}\`);
  });
});
"
```

## 🎯 Best Practices

### 1. Development Workflow

```bash
# 1. Make changes to C++ source
# 2. Test with development build
npm run wasm:build:dev

# 3. Test functionality
# 4. Build production version
npm run wasm:build

# 5. Commit changes
git add public/wasm/game.wasm WASM_EXPORTS.json
git commit -m "Update WASM build"
```

### 2. Error Handling

- Always check build output for warnings
- Use development build for debugging
- Verify exports in manifest
- Test on multiple platforms

### 3. Performance Monitoring

- Track binary size over time
- Monitor build time
- Check export count changes
- Validate memory usage

## 🔮 Future Improvements

### Planned Enhancements

1. **Incremental Builds**: Only rebuild changed files
2. **Parallel Compilation**: Compile multiple files simultaneously
3. **Cache Optimization**: Cache compiled objects
4. **Size Analysis**: Detailed binary size breakdown
5. **Automated Testing**: Build validation tests

### Experimental Features

1. **Web Workers**: Offload compilation to workers
2. **SIMD Support**: Enable SIMD instructions
3. **Threading**: Multi-threaded compilation
4. **LTO**: Link-time optimization

## 📚 Related Documentation

- **[BUILD_INSTRUCTIONS.md](../UTILS/BUILD_INSTRUCTIONS.md)** - Basic build instructions
- **[DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)** - Development workflow
- **[API.md](./API.md)** - WASM API reference
- **[TESTING.md](./TESTING.md)** - Testing framework

## 🆘 Support

### Getting Help

1. **Check this guide first** - Most issues are covered here
2. **Run diagnostics** - Use development build for more info
3. **Check export manifest** - Verify expected exports
4. **Test on multiple platforms** - Ensure cross-platform compatibility

### Common Commands

```bash
# Quick diagnostics
npm run wasm:build:dev
node ./tools/scripts/generate-wasm-exports.js --verbose

# Full rebuild
rm -rf public/wasm/game.wasm
npm run wasm:build

# Export analysis
node -e "console.log(require('./WASM_EXPORTS.json'))"
```

---

**Status**: ✅ Production Ready  
**Last Updated**: January 2025  
**Maintainer**: DozedEnt Team
