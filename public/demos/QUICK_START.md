# 🦴 Skeleton Physics Demo - Quick Start

## ⚡ 30-Second Start

```bash
cd public
python -m http.server 8080
```

Open: **http://localhost:8080/demos/interactive-skeleton-physics.html**

**That's it!** No build required. JavaScript fallback works automatically.

---

## 🚀 5-Minute Start (With WASM for 5x Performance)

### 1. Install Emscripten (One-Time Setup)
```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

### 2. Build & Run
```bash
cd <project-root>
npm run wasm:build:skeleton    # Build WASM module
npm run demo:skeleton           # Serve and open
```

Open: **http://localhost:8080/demos/interactive-skeleton-physics.html**

Console should show: `✓ Using WebAssembly physics engine`

---

## 🎮 Controls

### Camera
- **Left-click + drag**: Rotate around skeleton
- **Right-click + drag**: Pan camera
- **Scroll wheel**: Zoom in/out

### Quick Actions
- **A-Pose**: Default rest pose
- **T-Pose**: Arms straight out
- **Deep Squat**: Test leg range
- **Wave**: Fun animation

### Physics Tuning
- **Stiffness slider**: 10-500 (lower = softer)
- **Damping slider**: 5-100 (higher = more damped)
- **Gravity checkbox**: Toggle on/off

---

## 📊 Performance Check

Look at bottom-right info panel:
- **FPS: 60** ✅ Good
- **FPS: 30-50** ⚠️ Reduce stiffness or complexity
- **Physics: <2ms** ✅ Great (WASM)
- **Physics: <5ms** ✅ Good (JavaScript)

---

## 🐛 Troubleshooting

### "Bones not moving"
✅ **Check "Enable Physics" is checked**
✅ **Try clicking a pose button**
✅ **Refresh the page**

### "WASM module not found"
✅ **Build it:** `npm run wasm:build:skeleton`
✅ **Or ignore:** JavaScript fallback works fine

### "Physics exploding"
✅ **Lower stiffness** to 50-100
✅ **Raise damping** to 30-50
✅ **Click "Reset Pose"**

---

## 📂 Files

```
public/
├── demos/
│   └── interactive-skeleton-physics.html  ← Open this!
└── wasm/
    ├── skeleton-physics.cpp               ← C++ source
    ├── build-skeleton-physics.sh          ← Build script
    └── README-SKELETON-PHYSICS.md         ← Full docs
```

---

## 🎯 What's Working

✅ **29 anatomically correct bones**
✅ **35+ realistic joint constraints**
✅ **Real-time physics at 60 FPS**
✅ **WebAssembly acceleration (optional)**
✅ **6 preset poses**
✅ **Interactive camera**
✅ **Physics parameter tuning**
✅ **Performance monitoring**

---

## 📖 Learn More

- **User Guide**: `public/demos/README-SKELETON-PHYSICS.md`
- **Technical Docs**: `public/wasm/README-SKELETON-PHYSICS.md`
- **Implementation**: `SKELETON_PHYSICS_WASM_IMPLEMENTATION.md`

---

## 🎉 Enjoy!

**Pro tip:** Try the "Deep Squat" pose and watch the realistic joint limits!
