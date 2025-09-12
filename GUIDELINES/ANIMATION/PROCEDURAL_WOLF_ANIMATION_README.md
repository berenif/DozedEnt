# 🐺 Realistic Procedural Wolf Animation System

A comprehensive, biomechanically accurate procedural animation system for wolves with advanced AI behavior, realistic physics, and seamless WASM integration.

## ✨ Features

### 🎯 Core Systems

- **Enhanced Procedural Animation** - Realistic wolf locomotion with 6 gait types (walk, trot, gallop, prowl, bound, pace)
- **Realistic Physics** - Multi-body physics simulation with anatomically accurate constraints
- **Advanced AI Behavior** - 14 behavioral states with pack dynamics and environmental awareness
- **WASM Integration** - Seamless integration with existing WASM animation data system
- **Performance Optimization** - Adaptive quality settings and performance monitoring

### 🦴 Biomechanical Accuracy

- **Anatomical Proportions** - Based on real wolf anatomy (Canis lupus)
- **Weight Distribution** - Realistic 40/60 front/hind weight distribution
- **Joint Constraints** - Anatomically accurate movement limitations
- **Muscle Simulation** - Per-muscle-group tension and activation
- **Center of Mass** - Dynamic COM calculation based on posture and movement

### 🧠 Intelligent Behavior

- **Pack Dynamics** - Alpha/beta/omega hierarchy with coordinated movement
- **Environmental Awareness** - Wind, weather, terrain, and scent tracking
- **Personality System** - Individual traits affecting behavior (confidence, playfulness, aggression, curiosity)
- **Social Interactions** - Territory marking, pack coordination, and social behaviors
- **Adaptive AI** - Context-sensitive behavior transitions with hysteresis

### 🎨 Visual Fidelity

- **Advanced Fur Dynamics** - Physics-based fur movement with wind and wetness effects
- **Muscle Definition** - Visible muscle tension based on activity level
- **Breathing Animation** - Realistic respiratory patterns with panting
- **Procedural Variations** - Unique individual characteristics and markings
- **Environmental Effects** - Surface adaptation and weather responses

## 📁 File Structure

```
src/animation/
├── enhanced-wolf-procedural.js     # Enhanced procedural animation system
├── realistic-wolf-physics.js       # Biomechanical physics simulation
├── procedural-wolf-integration.js  # Unified integration system
├── wolf-animation.js              # Original animation system (enhanced)
├── enhanced-wolf-body.js          # Advanced body rendering
└── wolf-procedural.js             # Base procedural system

procedural-wolf-demo.html           # Interactive demonstration
PROCEDURAL_WOLF_ANIMATION_README.md # This documentation
```

## 🚀 Quick Start

### Basic Usage

```javascript
import ProceduralWolfSystem from './src/animation/procedural-wolf-integration.js'

// Initialize the system
const wolfSystem = new ProceduralWolfSystem({
    enablePhysics: true,
    enableRealisticBehavior: true,
    enablePackDynamics: true,
    maxWolves: 20
})

// Create a wolf
const wolf = wolfSystem.createWolf('alpha1', {
    type: 'alpha',
    position: { x: 100, y: 100 },
    packRank: 0.9,
    personality: {
        confidence: 0.9,
        aggression: 0.7,
        playfulness: 0.3,
        curiosity: 0.6
    }
})

// Game loop
function gameLoop(deltaTime) {
    // Update with environmental data
    wolfSystem.update(deltaTime, {
        wind: { x: 0.1, y: 0, strength: 0.3 },
        weather: { temperature: 0.6, rain: 0 },
        scents: [
            { position: { x: 200, y: 150 }, type: 'prey', strength: 0.8 }
        ]
    })
    
    // Render
    wolfSystem.render(ctx, camera)
}
```

### Advanced Configuration

```javascript
// Create wolf with specific traits
const scout = wolfSystem.createWolf('scout1', {
    type: 'scout',
    size: 0.9,
    mass: 45, // kg
    position: { x: 150, y: 120 },
    packRank: 0.6,
    behavior: EnhancedWolfBehavior.Patrolling,
    personality: {
        confidence: 0.6,
        aggression: 0.4,
        playfulness: 0.5,
        curiosity: 0.9
    },
    animationOverrides: {
        strideLength: 1.1,
        breathingRate: 1.2
    }
})

// Set WASM integration
wolfSystem.setWasmModule(wasmModule)
```

## 🎮 Wolf Types

| Type | Size | Characteristics | Pack Role |
|------|------|-----------------|-----------|
| **Alpha** | 1.2x | Commanding presence, mane, scars | Pack leader |
| **Scout** | 0.9x | Sleek build, alert ears, high curiosity | Reconnaissance |
| **Hunter** | 1.1x | Powerful legs, high aggression | Primary predator |
| **Normal** | 1.0x | Balanced traits | Pack member |
| **Omega** | 0.85x | Submissive posture, low confidence | Subordinate |

## 🧠 Behavioral States

### Primary Behaviors
- **Resting** - Lying down, slow breathing, minimal movement
- **Patrolling** - Casual movement, moderate alertness
- **Hunting** - Focused tracking, head lowered, intense concentration
- **Stalking** - Crouched posture, careful movement, high tension
- **Chasing** - Full gallop, extended body, maximum effort
- **Attacking** - Aggressive posture, bared teeth, high muscle tension

### Social Behaviors  
- **Defending** - Raised hackles, threatening display
- **Socializing** - Pack interaction, play behaviors
- **Howling** - Head tilted back, pack communication
- **Playing** - Playful movements, relaxed tension
- **Marking** - Territory marking behavior
- **Grooming** - Self-care activities

### Reactive Behaviors
- **Investigating** - Curious exploration, head movements
- **Fleeing** - Escape behavior, tucked tail

## ⚙️ Physics System

### Multi-Body Dynamics
```javascript
// Body segments with realistic mass distribution
segments: {
    head: 8% of body mass,
    neck: 5% of body mass, 
    torso: 45% of body mass,
    pelvis: 15% of body mass,
    legs: [6.7%, 6.7%, 8.3%, 8.3%] of body mass
}

// Joint constraints with anatomical limits
joints: {
    spine: ±0.5 rad maximum curvature,
    neck: ±1.2 rad pitch, ±1.0 rad yaw,
    legs: anatomically constrained IK
}
```

### Force Application
- **Muscle Forces** - PD controllers for target pose achievement
- **Ground Contact** - Spring-damper ground interaction
- **External Forces** - Gravity, air resistance, environmental effects
- **Constraint Forces** - Joint limits and stability

## 🌍 Environmental Integration

### Wind Effects
```javascript
environment: {
    wind: {
        x: 0.2,        // Wind direction X
        y: 0.1,        // Wind direction Y  
        strength: 0.4  // Wind intensity (0-1)
    }
}
```

### Weather Systems
```javascript
weather: {
    rain: 0.3,         // Wetness effect on fur
    snow: 0.0,         // Snow depth affecting movement
    temperature: 0.6   // Temperature affecting behavior
}
```

### Scent Tracking
```javascript
scents: [
    {
        position: { x: 200, y: 100 },
        type: 'prey',      // 'prey', 'territory', 'intruder'
        strength: 0.8,     // Scent intensity (0-1)
        age: 2.5          // Time since creation
    }
]
```

## 🎨 Rendering Features

### Enhanced Body Rendering
- **Anatomical Accuracy** - Realistic proportions and structure  
- **Muscle Definition** - Visible tension based on activity
- **Fur Dynamics** - Physics-based fur movement
- **Procedural Markings** - Unique individual patterns
- **Environmental Adaptation** - Surface and weather responses

### Animation Blending
- **State Transitions** - Smooth blending between behaviors
- **Procedural Overlays** - Breathing, muscle tension, secondary motion
- **Individual Variation** - Personality-based animation differences
- **Pack Synchronization** - Coordinated pack movement

## 📊 Performance

### Optimization Features
- **Adaptive Quality** - Automatic performance adjustment
- **LOD System** - Distance-based detail reduction
- **Efficient Physics** - Fixed timestep integration
- **Memory Management** - Pooled objects and minimal allocations

### Performance Targets
- **60 FPS** - Target frame rate
- **<16ms** - Frame time budget
- **20+ Wolves** - Concurrent animation capacity
- **<32MB** - Memory usage limit

### Monitoring
```javascript
const status = wolfSystem.getStatus()
console.log(`Performance: ${status.performance.frameTime}ms frame time`)
console.log(`Active wolves: ${status.wolves}`)
console.log(`Physics: ${status.performance.physicsTime}ms`)
```

## 🎮 Interactive Demo

Open `procedural-wolf-demo.html` in a web browser for a full interactive demonstration.

### Demo Features
- **Wolf Creation** - Add individual wolves or entire packs
- **Behavior Control** - Manual behavior override or AI control
- **Environment Simulation** - Wind, weather, and terrain effects
- **Performance Monitoring** - Real-time performance metrics
- **Visual Debug** - Physics visualization and state information

### Demo Controls
- **Click** - Add prey scent at cursor location
- **Space** - Pause/resume simulation
- **1-5 Keys** - Trigger pack behaviors (hunt, defend, howl, play, rest)
- **Arrow Keys** - Pan camera
- **Mouse Wheel** - Zoom in/out
- **R Key** - Reset camera

## 🔧 Integration Guide

### WASM Integration
```javascript
// Set WASM module for data synchronization
wolfSystem.setWasmModule(wasmModule)

// WASM functions used (if available):
// - get_wolf_anim_active(wolfIndex)
// - get_wolf_anim_leg_x/y(wolfIndex, legIndex) 
// - get_wolf_anim_spine_bend(wolfIndex)
// - get_wolf_anim_head_pitch/yaw(wolfIndex)
// - get_wolf_anim_ear_rotation(wolfIndex, earIndex)
// - get_wolf_anim_body_stretch(wolfIndex)
// - get_wolf_anim_fur_ruffle(wolfIndex)
```

### Existing Animation System
The procedural system enhances the existing `wolf-animation.js` system:
- **Backward Compatibility** - Works with existing wolf objects
- **Enhanced Rendering** - Improved visual fidelity
- **Physics Integration** - Optional realistic physics
- **Behavioral AI** - Advanced behavior management

## 🧪 Testing

### Automated Tests
```javascript
// Performance testing
const metrics = wolfSystem.getPerformanceMetrics()
assert(metrics.frameTime < 16.67, 'Frame time within budget')

// Behavior testing  
const wolf = wolfSystem.createWolf('test1')
wolf.behavior = EnhancedWolfBehavior.Hunting
assert(wolf.animComponent.behavior === EnhancedWolfBehavior.Hunting)
```

### Manual Testing
1. **Load Demo** - Open `procedural-wolf-demo.html`
2. **Add Wolves** - Test different wolf types and configurations
3. **Behavior Testing** - Trigger various behaviors and observe animations
4. **Performance Testing** - Monitor FPS with multiple wolves
5. **Environmental Testing** - Test wind, weather, and scent effects

## 🔮 Future Enhancements

### Planned Features
- **GPU Acceleration** - Compute shader physics and rendering
- **Advanced AI** - Machine learning behavior adaptation  
- **Seasonal Adaptation** - Coat changes and migration patterns
- **Injury System** - Limping and recovery animations
- **Age Progression** - Puppy to elder animation differences
- **Sound Integration** - Procedural audio generation
- **VR Support** - Immersive wolf pack experience

### Extensibility
The system is designed for easy extension:
- **Custom Behaviors** - Add new behavioral states
- **New Wolf Types** - Define custom wolf archetypes  
- **Environmental Effects** - Add weather and terrain systems
- **Animation Layers** - Overlay additional animation systems
- **Physics Modules** - Extend physics simulation

## 🤝 Contributing

### Development Guidelines
1. **Follow Architecture** - Maintain WASM-first design principles
2. **Performance Focus** - Profile changes and maintain 60 FPS target
3. **Biological Accuracy** - Research real wolf behavior and anatomy
4. **Code Quality** - Use ESLint and maintain documentation
5. **Testing** - Add tests for new features and behaviors

### Code Style
- **ES6 Modules** - Use modern JavaScript module system
- **Functional Programming** - Prefer pure functions where possible
- **Performance** - Minimize allocations in update loops
- **Documentation** - Document all public APIs and complex algorithms

## 📚 References

### Wolf Biology and Behavior
- *Wolves: Behavior, Ecology, and Conservation* - L. David Mech
- *The Wolf: Ecology and Behavior of an Endangered Species* - L. David Mech  
- *Wolf Pack Dynamics* - International Wolf Center
- *Canis lupus Anatomy* - Veterinary anatomy references

### Animation and Physics
- *Real-Time Rendering* - Tomas Akenine-Möller
- *Game Physics Engine Development* - Ian Millington
- *Character Animation with Direct3D* - Carl Granberg
- *Procedural Animation Techniques* - Various GDC talks

### Implementation Details
- **IK Algorithms** - Two-bone IK for leg positioning
- **Gait Patterns** - Hildebrand gait analysis
- **Muscle Models** - Hill muscle model adaptation
- **Pack Behavior** - Boids algorithm extensions

## 📄 License

This procedural wolf animation system is part of the DozedEnt game project and follows the same licensing terms.

---

**Created with ❤️ for realistic wolf behavior simulation**

*"In every walk with nature, one receives far more than they seek."* - John Muir
