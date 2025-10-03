# 🦴 Skeleton Physics Demo - Quick Reference

## 🚀 Launch Demo (Pick One)

```bash
# Method 1: One-click launcher
./launch-skeleton-demo.sh

# Method 2: npm script
npm run demo:skeleton

# Method 3: Python server
cd public && python3 -m http.server 8080
```

**Then open**: http://localhost:8080/demos/interactive-skeleton-physics.html

---

## 🎮 Controls Cheat Sheet

### Poses (Click Buttons)
- **A-Pose** - Rest position
- **T-Pose** - Arms out
- **Sit** - 90° hip/knee
- **Squat** - Low squat
- **Reach** - Arms forward
- **Wave** - Right arm up

### Camera (Mouse)
- **Left-drag** - Rotate
- **Right-drag** - Pan
- **Scroll** - Zoom

### Physics Settings
- **Physics On/Off** - Toggle simulation
- **Gravity On/Off** - Toggle gravity
- **Stiffness** - Joint resistance (10-500)
- **Damping** - Velocity damping (5-100)

### Visualization
- **Bones** - Blue capsules
- **Joints** - Red spheres
- **Limits** - Debug visualization
- **COM** - Yellow sphere (center of mass)
- **IK Targets** - Green markers

---

## 📊 Status at a Glance

| Item | Status |
|------|--------|
| Demo | ✅ Ready (50KB) |
| Physics | ✅ JS Fallback Active |
| WASM | ⚠️ Not Built (optional) |
| Bones | ✅ 29 bones |
| Joints | ✅ 35+ joints |
| FPS | ✅ 45-60 (JS) or 60 (WASM) |

---

## 🔧 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Blank page | Serve via HTTP, not file:// |
| No skeleton | Enable "Show Bones" checkbox |
| Unstable | Reduce stiffness to 50-100 |
| Slow | Build WASM module (optional) |

---

## 📚 Documentation Files

- **GETTING_STARTED.md** - Complete setup guide
- **README-SKELETON-PHYSICS.md** - User guide
- **DEMO_STATUS.md** - Current status
- **SKELETON_DEMO_COMPLETE.md** - Full summary
- **test-skeleton-demo.html** - Automated tests

---

## ⚡ Build WASM (Optional)

For 2-5x better performance:

```bash
# 1. Install Emscripten (once)
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk && ./emsdk install latest && ./emsdk activate latest
source ./emsdk_env.sh

# 2. Build
npm run wasm:build:skeleton
```

---

## 🎯 Key Features

✅ 29 anatomically correct bones  
✅ 35+ realistic joints  
✅ Real-time 60 FPS physics  
✅ 6 preset poses  
✅ Interactive controls  
✅ Performance monitoring  
✅ Works without build  
✅ WebAssembly ready  

---

**Quick Start**: `./launch-skeleton-demo.sh` then open http://localhost:8080/demos/interactive-skeleton-physics.html

**Questions?** See GETTING_STARTED.md or README-SKELETON-PHYSICS.md
