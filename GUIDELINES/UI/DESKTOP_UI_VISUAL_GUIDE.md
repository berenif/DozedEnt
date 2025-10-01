# Desktop UI Visual Guide

## Desktop Interface Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  [⏸️] [⛶] [⚙️]                                      FPS: 60  🟢 Online (0)  │
│   Quick Actions                                      Status Bar     │
│                                                                     │
│                                                                     │
│                                                                     │
│                      ╔════════════════╗                            │
│                      ║                ║                            │
│                      ║   Game Canvas   ║                            │
│                      ║   (Full Screen) ║                            │
│                      ║                ║                            │
│                      ║                ║                            │
│                      ╚════════════════╝                            │
│                                                                     │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Move: [W][A][S][D]  Combat: [J]=Left  [K]=Special  [L]=Right   📋 │
│  └──────────────────────────────────────────────────────────────┘  │
│                         Control Hints                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Mobile Interface Layout (For Comparison)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                        🎮 DozedEnt                                  │
│                                                                     │
│                                                                     │
│                      ╔════════════════╗                            │
│                      ║                ║                            │
│                      ║   Game Canvas   ║                            │
│                      ║   (Full Screen) ║                            │
│                      ║                ║                            │
│                      ╚════════════════╝                            │
│                                                                     │
│                                                                     │
│  ┌─────┐                                       ┌────────────┐      │
│  │  ●  │  Virtual                              │ [⚡] [💥]   │      │
│  │ ⊙   │  Joystick                             │ [🛡️] [🔄]   │      │
│  └─────┘                                       │    [✨]    │      │
│                                                └────────────┘      │
│                                               Action Buttons       │
└─────────────────────────────────────────────────────────────────────┘
```

## Desktop UI Components

### 1. Quick Actions Bar (Top Left)
```
┌──────────────────┐
│ [⏸️] [⛶] [⚙️]    │  <- Hover for tooltips
│                  │
│ Pause  Fullscreen│
│        Settings  │
└──────────────────┘
```

**Features:**
- Glass-morphism background
- Cyan border glow
- Smooth hover animations
- Keyboard shortcuts:
  - `ESC` - Pause
  - `F11` - Fullscreen

### 2. Status Bar (Top Right)
```
┌──────────────────────────┐
│ FPS: 60   🟢 Online (4)  │
│           Connection     │
└──────────────────────────┘
```

**Features:**
- Real-time FPS counter
- Connection status indicator
- Player count when online
- Color-coded status:
  - 🟢 Green = Online
  - 🔴 Red = Offline

### 3. Control Hints (Bottom Center)
```
┌──────────────────────────────────────────────────────────────┐
│  Move          Combat              Defense              [📋]  │
│  ────          ──────              ───────                   │
│  [W][A]        [J] Light Attack    [Shift] Block            │
│  [S][D]        [K] Heavy Attack    [Space] Roll             │
│                [L] Special                                   │
└──────────────────────────────────────────────────────────────┘
```

**Features:**
- Three sections: Move, Combat (Left/Right/Special), Notes
- Keyboard key visualization (`<kbd>` styling)
- Toggle button to minimize (`H` key or click 📋)
- Glass-morphism design
- Slide-up animation on appear

**Minimized State:**
```
┌─────┐
│ 📋  │  <- Click to expand
└─────┘
```

### 4. Keyboard Key Styling

Each key is rendered with:
```
┌────┐
│ W  │  <- 3D effect with shadows
└────┘
```

**Style Details:**
- Gradient background (white with transparency)
- Border with glow
- Inset shadow for depth
- Hover effect (lift up)
- Size: 28px × 28px minimum
- Padding: 8px horizontal

## Color Scheme

### Primary Colors
```
┌──────────────────────────────────┐
│ Cyan:    #00d4ff  ████████████   │
│ Blue:    #0575e6  ████████████   │
│ Dark:    #0a1428  ████████████   │
│ Darker:  #121e34  ████████████   │
└──────────────────────────────────┘
```

### Status Colors
```
┌──────────────────────────────────┐
│ Online:  #44ff44  ████████████   │
│ Offline: #ff4444  ████████████   │
│ FPS:     #00d4ff  ████████████   │
└──────────────────────────────────┘
```

## Animations

### 1. Control Hints - Slide Up
```
Frame 1:  ░░░░░░░░░░  (opacity: 0, y: +20px)
Frame 2:  ▒▒▒▒▒▒▒▒▒▒  (opacity: 0.5, y: +10px)
Frame 3:  ██████████  (opacity: 1, y: 0px)
```
**Duration:** 0.4s  
**Easing:** cubic-bezier(0.34, 1.56, 0.64, 1) - Bouncy

### 2. Status Bar - Fade In
```
Frame 1:  ░░░░░░░░░░  (opacity: 0, y: -10px)
Frame 2:  ▒▒▒▒▒▒▒▒▒▒  (opacity: 0.5, y: -5px)
Frame 3:  ██████████  (opacity: 1, y: 0px)
```
**Duration:** 0.3s  
**Easing:** ease

### 3. Button Hover
```
State 1:  [Button]      (scale: 1.0, y: 0px)
Hover:    [Button]      (scale: 1.0, y: -2px)
          └─ Glow ─┘
```
**Duration:** 0.2s  
**Easing:** cubic-bezier(0.34, 1.56, 0.64, 1)

### 4. Keyboard Key Hover
```
Normal:   [W]  (y: 0, shadow: 2px)
Hover:    [W]  (y: -1px, shadow: 4px, glow)
```

### 5. Status Indicator Pulse
```
0%:   ● (opacity: 1.0)
50%:  ◐ (opacity: 0.6)
100%: ● (opacity: 1.0)
```
**Duration:** 2s  
**Repeat:** Infinite

## Glass-Morphism Effect

All UI elements use consistent glass-morphism:

```css
background: linear-gradient(135deg, 
    rgba(10, 20, 40, 0.95) 0%, 
    rgba(18, 30, 52, 0.92) 100%
);
backdrop-filter: blur(20px);
border: 2px solid rgba(0, 212, 255, 0.3);
box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 60px rgba(0, 212, 255, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
```

**Visual Result:**
```
┌────────────────────────────────┐
│ ░▒▓████ Content ████▓▒░        │  <- Frosted glass
│ ────────────────────────────── │  <- Subtle inner highlight
└────────────────────────────────┘
     └── Cyan glow ──┘
```

## Responsive Breakpoints

### Desktop Mode
```
@media (pointer: fine) and (min-width: 769px)
├─ Show: Desktop UI
├─ Hide: Mobile controls
├─ Hide: Orientation overlay
└─ Enable: Keyboard shortcuts
```

### Mobile/Tablet Mode
```
@media (pointer: coarse) OR (max-width: 768px)
├─ Show: Mobile controls
├─ Show: Orientation overlay (portrait)
├─ Hide: Desktop UI
└─ Enable: Touch input
```

## Interaction States

### Quick Action Buttons
```
Normal:   [⏸️]  rgba(10, 20, 40, 0.95)
Hover:    [⏸️]  rgba(0, 212, 255, 0.3) + glow
Active:   [⏸️]  Pressed down
```

### Control Hints Toggle
```
Expanded:  [────────── Controls ──────────] [📋]
                                              └─ Click
Minimized: [📋]
            └─ Click to expand
```

### Keyboard Keys
```
Idle:     [W]  White gradient, subtle shadow
Hover:    [W]  Brighter, lifted, glowing
Pressed:  [W]  (Game handles this)
```

## Z-Index Layers

```
┌─ Layer 1000: Modals/Overlays
├─ Layer 900:  Desktop UI Elements
│  ├─ Quick Actions
│  ├─ Status Bar
│  └─ Control Hints
├─ Layer 300:  Mobile Controls (when visible)
├─ Layer 100:  Game HUD
├─ Layer 1:    Game Canvas
└─ Layer 0:    Background
```

## Accessibility Features

### High Contrast Mode
```css
@media (prefers-contrast: high) {
    .desktop-ui {
        border-width: 3px;  /* Thicker borders */
        /* Higher contrast colors */
    }
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
    * {
        animation: none;
        transition: none;
    }
}
```

### Keyboard Navigation
- All buttons focusable
- Visible focus outlines
- Tab order logical
- Keyboard shortcuts available

## Desktop vs Mobile Comparison

| Feature | Desktop | Mobile |
|---------|---------|--------|
| **Primary Input** | Keyboard + Mouse | Touch |
| **Controls Display** | Keyboard hints | Virtual joystick |
| **Action Buttons** | Quick actions bar | Touch buttons |
| **Status** | Top-right bar | Minimal HUD |
| **Fullscreen** | Optional (F11) | Forced landscape |
| **Orientation** | N/A | Locked landscape |
| **Layout** | Corner elements | Bottom controls |
| **Hints** | Always visible | Context-aware |

## Implementation Example

```javascript
// Detect device
import { deviceDetector } from '../src/utils/device-detector.js';
import { DesktopUIManager } from '../src/ui/desktop-ui-manager.js';

// On game start
if (deviceDetector.shouldShowDesktopControls()) {
    // Desktop user
    const desktopUI = new DesktopUIManager();
    desktopUI.init();
    desktopUI.show();
    
    // Update FPS every frame
    requestAnimationFrame(() => {
        desktopUI.updateFPS(60);
    });
    
    // Update connection
    desktopUI.updateConnectionStatus(true, 4);
} else {
    // Mobile user
    document.getElementById('mobile-controls').style.display = 'flex';
}
```

## Visual Examples

### Desktop UI Active State
```
┌─────────────────────────────────────────────┐
│ [⏸️] [⛶] [⚙️]           FPS: 60  🟢 Online  │
│  └─ Glowing                                 │
│                                             │
│           ╔═══════════════╗                 │
│           ║  GAME RUNNING ║                 │
│           ╚═══════════════╝                 │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ [W][A][S][D] [J][K][L] [Shift]   📋│    │
│ └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Mobile UI Active State
```
┌─────────────────────────────────────────────┐
│                                             │
│           ╔═══════════════╗                 │
│           ║  GAME RUNNING ║                 │
│           ╚═══════════════╝                 │
│                                             │
│                                             │
│ ╭───╮                      ┌─────────┐     │
│ │ ⊙ │ ← Active            │[⚡][💥] │     │
│ ╰───╯                      │[🛡️][🔄] │     │
│                            │   [✨]  │     │
│                            └─────────┘     │
└─────────────────────────────────────────────┘
```

## Performance Impact

```
┌────────────────────────────────────┐
│ Metric          │ Desktop │ Mobile │
├────────────────┼─────────┼────────┤
│ Init Time       │  ~20ms  │  ~10ms │
│ Memory Usage    │  <1MB   │  <500KB│
│ Frame Time Add  │  <0.1ms │  <0.1ms│
│ Detection Time  │  <5ms   │  <5ms  │
└────────────────────────────────────┘
```

---

**Visual Design Inspiration:**
- Modern game launchers (Steam, Epic)
- Premium web applications
- Glass-morphism UI trend
- Gaming peripheral software
- Minimal Halo/Destiny HUD elements

**Maintained Consistency With:**
- Existing mobile UI gradient colors
- Game's cyan/blue theme
- Dark, immersive aesthetic
- Smooth, bouncy animations

