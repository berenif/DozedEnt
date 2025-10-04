# Quick Start Guide - Interactive Skeleton Physics

## 🚀 Get Started in 30 Seconds

```bash
# 1. Navigate to public directory
cd public

# 2. Start a local server
python -m http.server 8080

# 3. Open in browser
# Visit: http://localhost:8080/demos/skeleton/interactive-skeleton-physics.html
```

## 🎮 Try These First

1. **Click "T-Pose"** - See the skeleton spread its arms
2. **Click "Sit"** - Watch it sit down smoothly
3. **Drag a Hand** - Click and drag any joint sphere
4. **Test Shoulder** - Automated shoulder rotation demo
5. **Adjust Stiffness** - Move the slider and see how it affects motion

## 🏗️ Code Structure (For Developers)

```
Entry Point: interactive-skeleton-physics.html
    ↓
Initializer: src/skeleton/demo-init.js
    ↓
    ├─→ Skeleton Model: src/skeleton/human-model.js
    ├─→ Renderer: src/renderer/skeleton/canvas-renderer.js
    ├─→ UI Controller: src/controllers/skeleton/ui-controller.js
    └─→ Interaction: src/controllers/skeleton/interaction-controller.js
```

## 📝 Adding a New Pose

1. Open `src/controllers/skeleton/pose-presets.js`
2. Add to `PosePresets` object:

```javascript
export const PosePresets = {
    // ... existing poses ...
    
    myNewPose: {
        shoulder_R: { y: 45 * Math.PI/180 },  // degrees → radians
        shoulder_L: { y: -45 * Math.PI/180 },
        elbow_R: { x: 90 * Math.PI/180 },
        elbow_L: { x: 90 * Math.PI/180 }
    }
};
```

3. Add button in HTML:

```html
<button id="btn-mynewpose">My New Pose</button>
```

4. Wire it up in `ui-controller.js`:

```javascript
_setupPoseButtons() {
    const poses = ['apose', 'tpose', 'sit', 'squat', 'reach', 'wave', 'mynewpose'];
    // ... rest stays the same
}
```

## 🎨 Customizing Appearance

### Change Bone Color
**File**: `src/renderer/skeleton/canvas-renderer.js`

```javascript
this.colors = {
    bone: '#3be26f',    // ← Change this (currently green)
    joint: '#ff5252',   // ← Red joints
    left: '#4da6ff',    // ← Blue left side
    right: '#ffaf40'    // ← Orange right side
}
```

### Change Background
**File**: `interactive-skeleton-physics.html`

```css
body {
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    /* ↑ Change these gradient colors */
}
```

## 🔧 Common Tasks

### Adjust Camera View
**File**: `src/skeleton/demo-init.js`

```javascript
// Around line 56-59
renderer.camera.zoom = 0.9;   // Zoom level (higher = closer)
renderer.camera.z = 2.0;      // Distance from skeleton
renderer.camera.y = 1.2;      // Height offset
```

### Change Skeleton Height
**File**: `src/skeleton/demo-init.js`

```javascript
// When fallback creates skeleton (around line 42)
skeleton = createHumanSkeleton(1.7);  // ← Height in meters
```

### Modify Physics Settings
**File**: `src/skeleton/human-model.js`

```javascript
// In JointState constructor
this.kp = 40;  // ← Stiffness (10-100)
this.kd = 8;   // ← Damping (2-20)
```

## 🐛 Troubleshooting

### Issue: "Skeleton doesn't appear"
**Solution**: Check browser console for errors. Ensure server is running.

### Issue: "Dragging doesn't work"
**Solution**: Make sure you're clicking on the joint spheres (not bones).

### Issue: "Pose buttons don't respond"
**Solution**: Check that UI controller is initialized properly. Open console.

### Issue: "Performance is slow"
**Solution**: 
- Close other browser tabs
- Check performance stats (bottom right)
- Disable "Show Joint Limits" if enabled

## 📖 API Reference (Quick)

### Skeleton Model

```javascript
skeleton.getBoneCount()                    // → 26
skeleton.getJointCount()                   // → 26
skeleton.getBoneName(index)                // → "shoulder_L"
skeleton.getBonePosition(index)            // → {x, y, z}
skeleton.setJointTargetAngles(idx, x, y, z) // Set target rotation
skeleton.setGlobalStiffness(0.5)           // 0-1 normalized
skeleton.setGlobalDamping(0.5)             // 0-1 normalized
skeleton.update(deltaTime)                 // Update physics
```

### Renderer

```javascript
renderer.showBones = true/false            // Toggle bone rendering
renderer.showJoints = true/false           // Toggle joint rendering
renderer.showCOM = true/false              // Toggle center of mass
renderer.camera.zoom = 1.0                 // Adjust zoom
renderer.camera.rotX = -0.2                // Rotate around X
renderer.camera.rotY = 0.0                 // Rotate around Y
renderer.render(skeleton)                  // Render frame
```

### Applying Poses

```javascript
import { applyPoseByName } from './pose-presets.js';

applyPoseByName(skeleton, 'tpose');        // Apply T-Pose
applyPoseByName(skeleton, 'sit');          // Apply sitting pose
```

## 🎯 Next Steps

1. **Read Full Documentation**: `README.md`
2. **Understand Architecture**: `IMPLEMENTATION_SUMMARY.md`
3. **Learn Integration**: `SKELETON_BALANCE_INTEGRATION.md`
4. **Check Guidelines**: `/GUIDELINES/AGENTS.md`

## 💡 Pro Tips

- **Smooth Transitions**: Poses use PD controllers, so transitions are automatic
- **Joint Limits**: Each joint has realistic constraints (e.g., knees don't bend backward)
- **Performance**: System runs at 300+ FPS, only rendering limits to 60
- **Extensibility**: All modules are independent and can be reused
- **WASM Ready**: System automatically uses WASM if available, falls back to JS

## 🤝 Contributing

When adding features:

1. Keep files under 500 lines
2. One responsibility per file
3. Use descriptive variable names
4. Add JSDoc comments
5. Follow ESLint rules (curly braces, semicolons, etc.)
6. Test in multiple browsers

## 📧 Need Help?

- **Documentation**: Check `README.md` for detailed info
- **Architecture**: See `IMPLEMENTATION_SUMMARY.md`
- **Guidelines**: Read `/GUIDELINES/` directory

---

**Have fun exploring the skeleton physics system!** 🦴✨

