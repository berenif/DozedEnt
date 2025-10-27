# Interactive Skeleton Physics Demo - Debugging Guide

## ✅ File Structure Verification

All required files are present and properly linked:

### Core Files
- ✅ `public/demos/skeleton/interactive-skeleton-physics.html` - Main demo page
- ✅ `public/src/skeleton/SkeletonUIInitializer.js` - UI initialization entry point
- ✅ `public/src/skeleton/demo-ui-init.js` - Demo UI setup
- ✅ `public/src/skeleton/demo-init.js` - Main demo initialization
- ✅ `public/wasm/skeleton-physics.js` - WASM glue code
- ✅ `public/wasm/skeleton-physics.wasm` - WASM binary

### Dependencies
- ✅ `public/src/skeleton/SkeletonManager.js` - Skeleton creation manager
- ✅ `public/src/skeleton/SkeletonCoordinator.js` - Renderer/UI coordinator
- ✅ `public/src/skeleton/WasmLoaderService.js` - WASM module loader
- ✅ `public/src/controllers/skeleton/SkeletonUIController.js` - UI event handling
- ✅ `public/src/controllers/skeleton/SkeletonInteractionController.js` - Mouse/touch interaction
- ✅ `public/src/controllers/skeleton/idle-animation.js` - Idle animation system
- ✅ `public/src/controllers/skeleton/pose-presets.js` - Pose presets
- ✅ `public/src/controllers/skeleton/test-animations.js` - Test animations
- ✅ `public/src/renderer/skeleton/SkeletonCanvasRenderer.js` - Canvas renderer
- ✅ `public/src/adapters/SkeletonFactory.js` - Factory adapter

## 🚀 How to Access

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open in browser:**
   ```
   http://localhost:8080/demos/skeleton/interactive-skeleton-physics.html
   ```

## 🔍 Import Path Resolution

From `public/demos/skeleton/interactive-skeleton-physics.html`:
- Import: `../../src/skeleton/SkeletonUIInitializer.js`
- Resolves to: `public/src/skeleton/SkeletonUIInitializer.js` ✅

From `public/src/skeleton/WasmLoaderService.js`:
- Import: `/wasm/skeleton-physics.js`
- Resolves to: `public/wasm/skeleton-physics.js` ✅

## 📋 Expected Behavior

1. **Loading Screen**
   - Shows "Loading Skeleton Physics" with spinner
   - Updates status: "Initializing WebAssembly module..."
   - Updates status: "Loading WebAssembly module..."
   - Updates status: "Creating WASM skeleton..."
   - Updates status: "Initializing renderer..."
   - Updates status: "Ready!"
   - Loading screen fades after 500ms

2. **Initial Display**
   - Skeleton appears in A-Pose
   - 29 bones visible (green lines)
   - 31 joints visible (red/blue/orange dots)
   - Controls panel on left
   - Info panel on bottom right
   - Breathing idle animation starts

3. **Controls**
   - **Pose Buttons**: A-Pose, T-Pose, Sitting, Deep Squat, Reach Forward, Wave
   - **Physics Settings**: Enable/disable physics and gravity
   - **Sliders**: Joint stiffness (10-500), Joint damping (5-100)
   - **Visualization**: Toggle bones, joints, limits, COM, IK targets
   - **Tests**: Shoulder, Elbow, Knee range tests
   - **Reset**: Reset to neutral pose

4. **Interaction**
   - **Left Click + Drag**: Rotate view
   - **Right Click + Drag**: Pan view
   - **Scroll**: Zoom in/out
   - **Click Joint**: Drag to move (IK applied)

## 🐛 Common Issues & Solutions

### Issue 1: Loading Screen Stuck
**Symptom**: Loading screen shows but never disappears

**Possible Causes**:
1. WASM module not loading (check browser console for 404 or MIME type errors)
2. JavaScript module import errors
3. Missing or incorrect file paths

**Solution**:
- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for failed requests
- Verify all files exist in correct locations

### Issue 2: Blank Screen After Loading
**Symptom**: Loading screen disappears but canvas is black

**Possible Causes**:
1. Skeleton not rendering (renderer issue)
2. Camera positioned incorrectly
3. Canvas not created properly

**Solution**:
- Check console for renderer errors
- Try adjusting camera zoom/position in controls
- Verify SkeletonCanvasRenderer is instantiated

### Issue 3: Controls Not Working
**Symptom**: Buttons don't respond or sliders don't update

**Possible Causes**:
1. Event listeners not attached
2. DOM elements not found (ID mismatch)
3. Skeleton API methods missing

**Solution**:
- Check if SkeletonUIController.setupUI() was called
- Verify element IDs in HTML match controller code
- Check if skeleton has required methods

### Issue 4: WASM Fallback Active
**Symptom**: Console shows "Creating JavaScript fallback skeleton..."

**Possible Causes**:
1. WASM file not found or wrong MIME type
2. Server not serving WASM with `application/wasm` content type
3. Browser doesn't support WebAssembly

**Solution**:
- Check server MIME type configuration
- Verify `public/wasm/skeleton-physics.wasm` exists
- Try different browser (modern browsers should work)

### Issue 5: Performance Issues
**Symptom**: Low FPS, stuttering animation

**Possible Causes**:
1. Too many draw calls
2. Physics simulation too slow
3. Browser throttling

**Solution**:
- Reduce visualization options (disable bones/joints)
- Lower physics stiffness
- Check if browser tab is throttled (inactive)

## 📊 Expected Performance Metrics

- **FPS**: 60 (or monitor refresh rate)
- **Physics Time**: < 1ms per frame
- **Render Time**: < 5ms per frame
- **Total Frame Time**: < 16ms (60 FPS)
- **Bone Count**: 29
- **Joint Count**: 31

## 🧪 Testing Checklist

- [ ] Page loads without errors
- [ ] Loading screen shows and disappears
- [ ] Skeleton visible in A-Pose
- [ ] Idle breathing animation working
- [ ] All pose buttons work
- [ ] Physics toggle works
- [ ] Gravity toggle works
- [ ] Stiffness slider updates values
- [ ] Damping slider updates values
- [ ] Visualization toggles work
- [ ] Test buttons trigger animations
- [ ] Reset button works
- [ ] Camera rotation works (left click drag)
- [ ] Camera pan works (right click drag)
- [ ] Camera zoom works (scroll)
- [ ] Joint dragging works (click + drag joint)
- [ ] Performance stats update
- [ ] FPS counter updates
- [ ] No console errors

## 📝 Debug Logs

Key console messages to look for:

### Success Path:
```
Status: Loading WebAssembly module...
✓ WebAssembly physics engine loaded
WASM Module exports: Object
Creating WASM skeleton...
WASM skeleton created. Bones: 29 Joints: 31
Status: Initializing renderer...
Status: Ready!
```

### Fallback Path:
```
Status: Loading WebAssembly module...
WASM module not available, using JavaScript fallback: [error message]
Creating JavaScript fallback skeleton...
Status: Ready!
```

## 🔧 Manual Debugging Steps

1. **Check Dev Server Status**
   ```bash
   # Should see:
   🚀 DozedEnt development server running at http://localhost:8080/
   📁 Serving files from:
      - public/ (main game files)
      - public/src/ (JavaScript modules)
   ```

2. **Test Module Loading**
   - Open: `http://localhost:8080/wasm/skeleton-physics.js`
   - Should download or display JavaScript code
   - Open: `http://localhost:8080/wasm/skeleton-physics.wasm`
   - Should download WASM binary

3. **Check File Serving**
   - Open: `http://localhost:8080/demos/skeleton/interactive-skeleton-physics.html`
   - Should display HTML page
   - Check Network tab for all resource loads

4. **Verify JavaScript Modules**
   - All `.js` files should load with `Content-Type: application/javascript`
   - WASM should load with `Content-Type: application/wasm`

## 💡 Tips

1. **Use Browser DevTools** - Essential for debugging web applications
2. **Check Console First** - Most issues will show error messages
3. **Network Tab** - Shows all file requests and their status
4. **Sources Tab** - Allows breakpoint debugging
5. **Performance Tab** - Shows detailed timing information

## 🎯 Quick Test Command

Run this in browser console after page loads:
```javascript
// Check if demo initialized
console.log('Skeleton:', window.demo?.skeleton);
console.log('Renderer:', window.demo?.renderer);
console.log('Bone Count:', window.demo?.skeleton?.getBoneCount());
console.log('Joint Count:', window.demo?.skeleton?.getJointCount());
```

## 📚 Related Documentation

- Main Project: `GUIDELINES/PROJECT_STRUCTURE.md`
- Skeleton System: `GUIDELINES/SKELETON/README.md`
- WASM Guide: `GUIDELINES/WASM/README.md`
- Development Workflow: `GUIDELINES/BUILD/DEVELOPMENT_WORKFLOW.md`

