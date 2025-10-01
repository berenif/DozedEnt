# Human-Like Motion Improvements

This document outlines comprehensive enhancements to the procedural animation system to achieve more realistic, human-like character motion.

## Overview

The goal is to transform the current simple procedural animation into a sophisticated system that exhibits natural human biomechanics through:
- Multi-segment anatomical structures
- Inverse kinematics (IK) for limbs
- Counter-rotation and weight shifting
- Environmental coupling
- Secondary motion and inertia
- Natural variation and noise

## Current State (Audit)

### Existing Rig Structure
- **Root → Pelvis → Torso → Head**: Single spine chain
- **Arms**: Shoulder → Elbow → Hand (simple midpoint, no IK)
- **Legs**: Hip → Knee → Foot (simple midpoint, no IK)
- **Missing**: Spine segments (lower/upper), clavicles, ankles, wrists

### Existing Modules
1. **Core Posture**: Lean, pelvis bob, breathing (chest expansion needs work)
2. **Locomotion**: Sine-based foot lift, basic stride (needs IK, foot roll, Bezier paths)
3. **Combat**: Hand targets, attack phases (needs arm IK, wrist orientation)
4. **Secondary Motion**: Cloth, hair, equipment inertia (needs better coupling)
5. **Environment**: Wind, shiver (needs ground adaptation, slope handling)

## Detailed Improvements

### 1. Head and Gaze

**Current**: Simple head position with minimal stabilization
**Needed**:
- Head yaw/pitch stabilization with smooth limits
- Look-at targeting for enemies/objectives
- Slight counter-rotation during turns
- Micro "nod/bob" coupled to footstep impacts

**Implementation**:
- New module: `head-gaze-module.js`
- Add `headYaw`, `headPitch` to rig
- Track gaze target with damped rotation
- Counter-rotate head against torso rotation

### 2. Spine and Torso

**Current**: Single torso joint with basic lean
**Needed**:
- Multi-segment spine: `pelvis → lowerSpine → chest → neck`
- S-curve bending during lateral motion
- Counter-rotation: pelvis rotates with legs, chest opposes it
- Breathing expands chest and lifts clavicles (not just scale)

**Implementation**:
- New module: `spine-module.js`
- Expand rig with `lowerSpine`, `chest`, `neck` joints
- Apply S-curve based on velocity and acceleration
- Breathing affects chest position and clavicle lift

### 3. Shoulders, Arms, Hands

**Current**: Simple shoulder-elbow-hand with midpoint elbow
**Needed**:
- 2-bone IK for each arm with soft elbow constraints
- Preferred bend planes (elbows point outward/downward)
- Arm swing driven by gait phase with speed-based amplitude
- Reduced swing when blocking/aiming
- Hand/wrist pronation-supination during attacks
- Guard pose shapes for blocking

**Implementation**:
- New module: `arm-ik-module.js`
- Add `clavicleL`, `clavicleR`, `wristL`, `wristR` to rig
- Implement 2-bone IK solver with angle constraints
- Add wrist orientation parameters
- Combat module provides IK targets, arm-ik resolves them

### 4. Hips, Legs, Feet

**Current**: Simple knee midpoint, sine wave foot lift
**Needed**:
- Proper 2-bone IK for legs (hip-knee-ankle)
- Foot planting with zero-slip during stance phase
- Heel-to-toe roll and toe-off on lift
- Parametric foot path (Bezier/Hermite) for natural clearance
- Foot placement respects ground normal

**Implementation**:
- New module: `foot-ik-module.js`
- Add `ankleL`, `ankleR`, `toeL`, `toeR` to rig
- Replace sine lift with Bezier curve for foot trajectory
- Track stance/swing phase per foot
- Ground contact detection and zero-slip enforcement

### 5. Gait and Balance

**Current**: Fixed stance width, simple phase-based stride
**Needed**:
- Stance width varies with speed (wider when running)
- Cadence derived from speed and natural step length
- Lean from acceleration/deceleration
- Weight shift over stance foot (COM tracking)
- Shorter ground contact at higher speeds
- Explicit left/right contact timers

**Implementation**:
- Enhance `locomotion-module.js`
- Dynamic stance width based on speed
- Natural cadence calculation (Froude number)
- Acceleration-based lean in `core-posture-module.js`
- Per-foot contact timers and weight distribution

### 6. Environment Coupling

**Current**: Basic wind and shiver
**Needed**:
- Foot placement on ground normal (slopes/steps)
- Pelvis height adapts to uneven ground
- Wind affects hair/cloth without breaking pose
- Temperature induces subtle shiver at extremities

**Implementation**:
- Enhance `environment-module.js`
- Add ground normal sampling interface
- Foot IK module queries ground height/normal
- Pelvis height adjusts to average foot height
- Targeted shiver for hands/feet

### 7. Secondary Motion and Inertia

**Current**: Cloth, hair, equipment with basic spring physics
**Needed**:
- Weapon and cloak inertia anchored to actual hand/torso paths
- Soft tissue jiggle on landing/hurt with overdamped springs
- Equipment follows hand orientation (not just position)

**Implementation**:
- Enhance `secondary-motion-module.js`
- Bind equipment to wrist transform (position + rotation)
- Add impact impulse response for landing/damage events
- Increase coupling between equipment and limb velocity

### 8. Variation and Noise

**Current**: Deterministic, no variation
**Needed**:
- Per-character anthropometrics (limb lengths, stride length)
- Tiny phase/asymmetry noise for natural variance
- Subtle tremor/micro-adjustments in idle

**Implementation**:
- Add character seed to animator constructor
- Use seeded random for limb length variance
- Add small noise to phase offsets for asymmetry
- Idle state includes micro-adjustments

### 9. State-Specific Polish

**Current**: Basic attack/block/roll states
**Needed**:
- **Attacks**: Clearer anticipation-action-recovery posing
  - Torso rotation toward strike side
  - Weight transfer into the strike
  - Recovery returns to balanced stance
- **Blocking**: COM shifts backward, raises guard, narrows arm swing
- **Rolling**: Tucks limbs closer, rounded body shape

**Implementation**:
- Enhance `combat-module.js`
- Add torso rotation targets for attacks
- Weight shift parameters (forward for attack, back for block)
- State-specific limb tuck/extension parameters

## Module and File Mapping

### New Modules to Create

1. **`head-gaze-module.js`**
   - Head stabilization and target tracking
   - Counter-rotation against torso
   - Micro-nod on footsteps

2. **`spine-module.js`**
   - Multi-segment spine with S-curve bending
   - Chest counter-rotation against pelvis
   - Breathing affects chest/clavicles

3. **`foot-ik-module.js`**
   - 2-bone leg IK solver
   - Foot planting and roll (heel-to-toe)
   - Bezier foot path for natural clearance
   - Ground adaptation (slope/step handling)

4. **`arm-ik-module.js`**
   - 2-bone arm IK solver
   - Elbow bend constraints and preferred planes
   - Wrist orientation (pronation/supination)
   - Guard poses and attack shaping

### Existing Modules to Enhance

1. **`locomotion-module.js`**
   - Replace sine foot lift with Bezier path generator
   - Dynamic stance width based on speed
   - Cadence/contact timing (Froude-based)
   - Per-foot contact state tracking

2. **`core-posture-module.js`**
   - Add COM shift over stance foot
   - Acceleration/braking lean
   - Integrate with spine module for counter-rotation
   - Enhanced breathing (chest lift, not scale)

3. **`combat-module.js`**
   - Output IK targets (not direct hand positions)
   - Add wrist orientation for strikes
   - Torso rotation targets
   - Attack phasing (anticipation/action/recovery)

4. **`secondary-motion-module.js`**
   - Bind equipment to wrist transforms (pos + rot)
   - Add landing/hurt impulse response
   - Increase velocity coupling

5. **`environment-module.js`**
   - Ground normal sampling
   - Pelvis height adaptation
   - Targeted extremity shiver

### Rig Updates

**`player-procedural-rig.js`**

Add these joints to `createDefaultPose()`:

```javascript
// Spine segments
lowerSpine: { x: 0, y: -7 },     // Between pelvis and chest
chest: { x: 0, y: -14 },          // Replaces torso
neck: { x: 0, y: -20 },           // Between chest and head

// Shoulder girdle
clavicleL: { x: -5, y: -16 },
clavicleR: { x: 5, y: -16 },

// Wrists and ankles
leftArm: {
    shoulder: { x: -7, y: -17 },
    elbow: { x: -11, y: -9 },
    wrist: { x: -13, y: -1 },
    hand: { x: -14, y: 0 }
},
rightArm: {
    shoulder: { x: 7, y: -17 },
    elbow: { x: 11, y: -9 },
    wrist: { x: 13, y: -1 },
    hand: { x: 14, y: 0 }
},
leftLeg: {
    hip: { x: -4, y: 0 },
    knee: { x: -5, y: 10 },
    ankle: { x: -6, y: 19 },
    foot: { x: -6, y: 21 },
    toe: { x: -6, y: 23 }
},
rightLeg: {
    hip: { x: 4, y: 0 },
    knee: { x: 5, y: 10 },
    ankle: { x: 6, y: 19 },
    foot: { x: 6, y: 21 },
    toe: { x: 6, y: 23 }
}
```

### Orchestrator Updates

**`player-procedural-animator.js`**

New module execution order:

1. Core Posture (COM, breathing baseline)
2. Locomotion (stride phase, foot targets)
3. **Foot IK** (resolve foot targets to knee/ankle positions)
4. **Spine** (multi-segment bend, counter-rotation)
5. Combat (hand/wrist targets)
6. **Arm IK** (resolve hand targets to elbow/wrist positions)
7. **Head Gaze** (stabilization, look-at)
8. Secondary Motion (cloth, hair, equipment)
9. Environment (wind, ground coupling)

### Renderer Updates

**`PlayerRenderer.js`**

- Draw spine segments with thickness variation
- Render limbs with proper segment orientation
- Show feet with heel/toe markers
- Display head with facing direction indicator
- Add optional debug overlays for IK targets, contact points

## Implementation Priority

### Phase 1: Foundation (High Impact)
1. ✅ Expand rig with new joints
2. Create foot-ik-module.js (leg IK + foot planting)
3. Create spine-module.js (multi-segment spine)
4. Update locomotion-module.js (Bezier foot paths)

### Phase 2: Arms and Combat (High Polish)
5. Create arm-ik-module.js
6. Enhance combat-module.js (IK targets, wrist orientation)
7. Update renderer to show oriented limbs

### Phase 3: Details and Polish
8. Create head-gaze-module.js
9. Enhance secondary-motion-module.js (better coupling)
10. Enhance environment-module.js (ground adaptation)
11. Add variation and noise system

## Testing Strategy

Each module should be testable in isolation:
- Unit tests provide mock context data
- Visual tests render single module effects
- Integration tests verify module composition
- Performance tests ensure real-time frame rates

## References

- **Gait Parameters**: Froude number for cadence, Raibert hopping for balance
- **IK Solvers**: Two-bone analytic IK, CCD for chains
- **Foot Placement**: Hermite/Bezier curves for natural trajectories
- **Spine Kinematics**: S-curve approximation, counter-rotation ratios
- **Breathing Mechanics**: Chest expansion, clavicle elevation, diaphragm motion

---

**Last Updated**: 2025-10-01
**Status**: Implementation in progress

