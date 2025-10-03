# Getting Started with Skeleton Physics Demo

## 🚀 Quick Start (< 1 minute)

### Method 1: Using npm (Recommended)

```bash
npm run demo:skeleton
```

Then open your browser to: **http://localhost:8080/demos/interactive-skeleton-physics.html**

### Method 2: Using Python

```bash
cd public
python3 -m http.server 8080
```

Then open your browser to: **http://localhost:8080/demos/interactive-skeleton-physics.html**

---

## 🎮 What You'll See

### The Demo Interface

When you open the demo, you'll see:

1. **3D Viewport** - Interactive skeleton rendered with Three.js
2. **Control Panel** (right side) - All interactive controls
3. **Loading Screen** - Briefly shows while initializing

### Using the Demo

#### **Pose Presets** 
Click any button to change the skeleton's pose:
- **A-Pose** - Rest position, arms slightly down
- **T-Pose** - Arms straight out
- **Sitting** - 90° hip and knee bend
- **Deep Squat** - Low squatting position
- **Reach Forward** - Arms extended forward
- **Wave** - Right arm raised and bent

#### **Physics Controls**
- **Enable Physics** - Toggle real-time simulation on/off
- **Enable Gravity** - Toggle gravity force
- **Joint Stiffness** - How strong joints resist movement (10-500)
- **Joint Damping** - How much joints resist velocity (5-100)

#### **Visualization Options**
Toggle visibility of different elements:
- **Show Bones** - Blue capsules representing skeleton
- **Show Joints** - Red spheres at joint locations
- **Show Joint Limits** - Debug visualization of constraints
- **Show Center of Mass** - Yellow sphere showing COM
- **Show IK Targets** - Green markers for IK goals

#### **Camera Controls**
- **Left-click + drag** - Rotate camera around skeleton
- **Right-click + drag** - Pan camera
- **Scroll wheel** - Zoom in/out

#### **Test Suite**
Run automated tests to verify joint ranges:
- **Shoulder Range Test** - 0-180° abduction
- **Elbow Test** - 0-150° flexion
- **Knee Test** - 0-150° flexion
- **Reset** - Return to neutral pose

---

## 📊 Performance

The demo displays real-time performance stats:
- **FPS** - Frame rate (target: 60)
- **Physics Time** - Physics simulation per frame
- **Render Time** - Three.js rendering per frame

### Expected Performance

| Mode | Physics Time | FPS | Notes |
|------|-------------|-----|-------|
| JavaScript | 2-5ms | 45-60 | Default, works immediately |
| WebAssembly | 0.5-1.5ms | 60 | 2-5x faster, requires build |

**Currently**: Demo runs in JavaScript mode (fully functional!)

---

## 🔧 Advanced: Building WebAssembly

For best performance, compile the C++ physics engine to WebAssembly:

### Prerequisites

Install Emscripten (one-time setup):

```bash
# Clone and install emsdk
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

### Build WASM Module

```bash
# From project root
npm run wasm:build:skeleton
```

This creates:
- `public/wasm/skeleton-physics.js` (~15-20KB gzipped)
- `public/wasm/skeleton-physics.wasm` (~50-80KB gzipped)

### Verify WASM is Used

After building, serve the demo again:

```bash
npm run demo:skeleton
```

Open browser console - you should see:
```
✓ Using WebAssembly physics engine
```

Instead of:
```
⚠ Using JavaScript fallback physics engine
```

---

## 🧪 Testing the Demo

### Automated Test Page

Open the test page to verify all components:

```bash
npm run demo:skeleton
# Navigate to: http://localhost:8080/demos/test-skeleton-demo.html
```

The test page will check:
- ✅ Demo HTML file exists
- ✅ C++ source code exists
- ✅ Build script exists
- ✅ Documentation exists
- ℹ️ WASM module status (built or fallback)

### Manual Verification

1. **Load Demo** - No errors in console
2. **See Skeleton** - Blue capsules visible in viewport
3. **Click Poses** - Skeleton changes position
4. **Toggle Physics** - Skeleton moves/stops
5. **Adjust Sliders** - Values update in real-time
6. **Camera Works** - Can rotate, pan, zoom

---

## 📚 Learn More

### Documentation Files

- **`README-SKELETON-PHYSICS.md`** - User guide (this directory)
- **`public/wasm/README-SKELETON-PHYSICS.md`** - Technical docs
- **`SKELETON_PHYSICS_WASM_IMPLEMENTATION.md`** - Complete overview

### Key Features

- **29 Bones** - Anatomically correct skeleton
- **35+ Joints** - Realistic constraints
- **PD Controllers** - Proportional-Derivative physics
- **Soft Limits** - Spring-damper constraints
- **Real-time Simulation** - 60 FPS target
- **Interactive Controls** - Full parameter tuning

### Technical Stack

- **C++17** - Physics engine core
- **WebAssembly** - High-performance execution (optional)
- **Three.js** - 3D rendering
- **Embind** - C++/JavaScript interop
- **Pure JavaScript** - Fallback implementation

---

## 🐛 Troubleshooting

### Demo Won't Load

**Problem**: Blank page or errors
**Solution**: 
- Check browser console for errors
- Ensure you're serving via HTTP (not file://)
- Verify port 8080 is not in use

### Skeleton Not Visible

**Problem**: Empty viewport
**Solution**:
- Check "Show Bones" is enabled
- Try clicking "A-Pose" button
- Refresh the page

### Physics Seems Broken

**Problem**: Skeleton exploding or unstable
**Solution**:
- Reduce stiffness slider (try 50-100)
- Increase damping slider (try 30-50)
- Disable/re-enable physics
- Click "Reset" in Test Suite

### Poor Performance

**Problem**: Low FPS or laggy
**Solution**:
- Build WASM module for better performance
- Disable unused visualizations (limits, COM, IK)
- Close other browser tabs
- Check performance stats in UI

### WASM Build Fails

**Problem**: Build errors
**Solution**:
- Verify Emscripten installed: `emcc --version`
- Source environment: `source emsdk_env.sh`
- Check C++ file exists: `ls public/wasm/skeleton-physics.cpp`
- Try manual build: `bash public/wasm/build-skeleton-physics.sh`

---

## ✅ Verification Checklist

After starting the demo, verify:

- [ ] Page loads without errors
- [ ] Skeleton visible in center of screen
- [ ] Control panel visible on right
- [ ] All 6 pose buttons work
- [ ] Physics toggles work
- [ ] Sliders update values
- [ ] Camera controls work (rotate/pan/zoom)
- [ ] Performance stats show reasonable values
- [ ] Console shows engine mode (WASM or JS)

If all items checked, **the demo is working correctly!** 🎉

---

## 🤝 Need Help?

- Check the **console** (F12 in browser) for errors
- Review **DEMO_STATUS.md** for current status
- Read **README-SKELETON-PHYSICS.md** for detailed docs
- Test with **test-skeleton-demo.html** page

---

**Enjoy exploring realistic skeleton physics!** 🦴✨
