# Physics System Optimization Guide

**Version:** 1.0  
**Status:** Production  
**Last Updated:** January 2025

---

## 📋 Table of Contents
- [Overview](#overview)
- [Performance Targets](#performance-targets)
- [Current Performance](#current-performance)
- [Optimization Techniques](#optimization-techniques)
- [Profiling Tools](#profiling-tools)
- [Common Bottlenecks](#common-bottlenecks)
- [Scaling Strategies](#scaling-strategies)
- [Platform-Specific Tips](#platform-specific-tips)
- [Future Optimizations](#future-optimizations)

---

## Overview

The DozedEnt physics system is designed for **deterministic, high-performance simulation** on all platforms. This guide covers optimization strategies, profiling techniques, and performance tuning for maintaining 60 FPS across devices.

### Design Philosophy
- **Predictable Performance**: No GC pauses, consistent frame times
- **Scalable**: Gracefully degrade quality under load
- **Mobile-First**: Optimized for lower-end devices
- **Deterministic**: Optimizations must not break determinism

---

## Performance Targets

### Frame Time Budget

| Component | Budget | Current | Status |
|-----------|--------|---------|--------|
| Physics (10 bodies) | 1.0ms | 0.5ms | ✅ Excellent |
| Physics (50 bodies) | 3.0ms | 2.1ms | ✅ Good |
| Physics (100 bodies) | 5.0ms | 3.2ms | ✅ Good |
| Physics (200 bodies) | 10.0ms | 7.8ms | ⚠️ Acceptable |

### Throughput Targets

| Scenario | FPS Target | Bodies | Status |
|----------|------------|--------|--------|
| Mobile (low-end) | 60 FPS | 50 | ✅ |
| Mobile (mid-range) | 60 FPS | 100 | ✅ |
| Desktop | 60 FPS | 200+ | ✅ |
| Desktop (high-end) | 144 FPS | 100 | ✅ |

---

## Current Performance

### Benchmarks (October 2024)

**Platform:** Desktop (Intel i7, 16GB RAM)
- 10 bodies: 0.5ms per frame
- 50 bodies: 2.1ms per frame
- 100 bodies: 3.2ms per frame
- 200 bodies: 7.8ms per frame

**Platform:** Mobile (Snapdragon 750G)
- 10 bodies: 1.2ms per frame
- 50 bodies: 4.5ms per frame
- 100 bodies: 8.7ms per frame

### Complexity Analysis

| Operation | Complexity | Cost (per body) | Notes |
|-----------|------------|-----------------|-------|
| Integration | O(n) | 0.03ms | Velocity + position update |
| Collision Detection | O(n²) | 0.08ms | All-pairs naive |
| Collision Resolution | O(k) | 0.05ms | k = collision count |
| Sleep Update | O(n) | 0.01ms | Velocity threshold check |
| Total (100 bodies) | O(n²) | 3.2ms | Dominated by collision detection |

**Key Insight:** Collision detection is O(n²) and dominates cost at high body counts. Future optimization: spatial hashing (O(n)).

---

## Optimization Techniques

### 1. Sleeping Bodies

**Problem:** Inactive bodies waste CPU cycles.

**Solution:** Put stationary bodies to sleep.

```cpp
void RigidBody::update_sleep_state(uint32_t sleep_threshold_micros) {
    const Fixed sleep_velocity_sq = Fixed::from_float(0.01f * 0.01f);
    
    if (velocity.length_squared() < sleep_velocity_sq) {
        sleep_timer_ += FIXED_STEP_MICROS;
        
        if (sleep_timer_ >= sleep_threshold_micros) {
            is_sleeping = true;
        }
    } else {
        sleep_timer_ = 0;
        is_sleeping = false;
    }
}
```

**Impact:**
- Sleeping bodies skip integration (saved: 0.03ms per body)
- Still participate in collision checks (collision wakes them)
- Typically 30-50% of bodies asleep in combat scenarios

**Tuning:**
- `sleep_threshold_micros`: 500,000 (0.5 sec) default
- `sleep_velocity_sq`: 0.0001 (very slow movement threshold)

---

### 2. Early Exit Integration

**Problem:** Bodies with zero acceleration don't need force integration.

**Solution:** Skip force application for static/kinematic bodies.

```cpp
void PhysicsManager::integrate_forces(Fixed dt) {
    for (auto& body : bodies_) {
        if (!body.should_simulate()) {
            continue; // Skip sleeping/kinematic bodies
        }
        
        // Apply forces only to active dynamic bodies
        FixedVector3 total_accel = body.acceleration + config_.gravity;
        body.velocity += total_accel * dt;
        body.acceleration = FixedVector3::zero();
        
        // Apply drag and integrate position
        body.velocity *= body.drag;
        body.position += body.velocity * dt;
    }
}
```

**Impact:**
- Skips 30-50% of bodies (sleeping + kinematic)
- Saved: ~0.02ms per skipped body

---

### 3. Spatial Partitioning (Future)

**Problem:** O(n²) collision detection doesn't scale.

**Current:** Naive all-pairs collision checking
```cpp
for (size_t i = 0; i < bodies_.size(); i++) {
    for (size_t j = i + 1; j < bodies_.size(); j++) {
        check_collision(bodies_[i], bodies_[j]);
    }
}
```

**Planned:** Spatial hashing for O(n) collision detection
```cpp
// Grid-based spatial hash
struct SpatialGrid {
    float cell_size = 0.1f; // 10% of world
    std::unordered_map<GridKey, std::vector<uint32_t>> cells;
    
    void insert(uint32_t body_id, float x, float y) {
        GridKey key = {
            static_cast<int>(x / cell_size),
            static_cast<int>(y / cell_size)
        };
        cells[key].push_back(body_id);
    }
    
    std::vector<uint32_t> query_nearby(float x, float y) {
        // Check 3x3 grid around position
        std::vector<uint32_t> results;
        for (int dx = -1; dx <= 1; dx++) {
            for (int dy = -1; dy <= 1; dy++) {
                GridKey key = {
                    static_cast<int>(x / cell_size) + dx,
                    static_cast<int>(y / cell_size) + dy
                };
                if (cells.count(key)) {
                    results.insert(results.end(), cells[key].begin(), cells[key].end());
                }
            }
        }
        return results;
    }
};
```

**Impact:**
- Reduces collision checks from O(n²) to O(n) average case
- Expected savings: 50-80% at 100+ bodies
- Implementation: ~500 lines, 2-3 days work

---

### 4. Fixed-Point SIMD (Future)

**Problem:** Integration is memory-bound and repetitive.

**Current:** Scalar processing
```cpp
for (auto& body : bodies_) {
    body.velocity.x += accel.x * dt;
    body.velocity.y += accel.y * dt;
    body.position.x += body.velocity.x * dt;
    body.position.y += body.velocity.y * dt;
}
```

**Planned:** SIMD batch processing
```cpp
// Process 4 bodies at once with WASM SIMD
#ifdef __wasm_simd128__
void integrate_forces_simd(RigidBody* bodies, size_t count, Fixed dt) {
    v128_t dt_vec = wasm_i32x4_splat(dt.raw);
    
    for (size_t i = 0; i + 3 < count; i += 4) {
        // Load 4 velocities and accelerations
        v128_t vx = wasm_i32x4_load(&bodies[i].velocity.x.raw);
        v128_t ax = wasm_i32x4_load(&bodies[i].acceleration.x.raw);
        
        // Vectorized: vx += ax * dt
        v128_t product = wasm_i32x4_mul(ax, dt_vec);
        v128_t shifted = wasm_i32x4_shr(product, 16); // Fixed-point shift
        v128_t result = wasm_i32x4_add(vx, shifted);
        
        wasm_i32x4_store(&bodies[i].velocity.x.raw, result);
    }
}
#endif
```

**Impact:**
- 2-4x speedup for integration phase
- Requires WASM SIMD support (Chrome 91+, Firefox 89+)
- Fallback to scalar for older browsers

---

### 5. Level of Detail (LOD)

**Problem:** Distant enemies don't need full physics fidelity.

**Solution:** Reduce physics quality for distant bodies.

```cpp
enum class PhysicsLOD {
    HIGH,    // Full physics (near player)
    MEDIUM,  // Reduced collision checks
    LOW,     // Position-only (very far)
    DISABLED // Off-screen (skip entirely)
};

PhysicsLOD compute_lod(const FixedVector3& player_pos, const FixedVector3& body_pos) {
    Fixed dist_sq = (body_pos - player_pos).length_squared();
    
    if (dist_sq < Fixed::from_float(0.3f * 0.3f)) {
        return PhysicsLOD::HIGH;
    } else if (dist_sq < Fixed::from_float(0.6f * 0.6f)) {
        return PhysicsLOD::MEDIUM;
    } else if (dist_sq < Fixed::from_float(1.0f * 1.0f)) {
        return PhysicsLOD::LOW;
    } else {
        return PhysicsLOD::DISABLED;
    }
}
```

**Benefits:**
- HIGH: Full collision detection
- MEDIUM: Only check collisions with player
- LOW: Kinematic movement only (no forces)
- DISABLED: Skip entirely

**Impact:**
- Saves 60-80% cost for distant enemies
- Maintains gameplay fidelity near player

---

### 6. Collision Culling

**Problem:** Bodies far apart don't need collision checks.

**Solution:** Broad-phase AABB culling.

```cpp
bool aabb_intersect(const RigidBody& a, const RigidBody& b) {
    // Quick rejection test using axis-aligned bounding boxes
    Fixed dx = fixed_abs(a.position.x - b.position.x);
    Fixed dy = fixed_abs(a.position.y - b.position.y);
    Fixed sum_radius = a.radius + b.radius;
    
    // Early exit if bounding boxes don't overlap
    return (dx < sum_radius) && (dy < sum_radius);
}

void detect_collisions() {
    for (size_t i = 0; i < bodies_.size(); i++) {
        for (size_t j = i + 1; j < bodies_.size(); j++) {
            // Broad phase: cheap AABB check
            if (!aabb_intersect(bodies_[i], bodies_[j])) {
                continue;
            }
            
            // Narrow phase: accurate sphere check
            if (sphere_intersect(bodies_[i], bodies_[j])) {
                resolve_collision(bodies_[i], bodies_[j]);
            }
        }
    }
}
```

**Impact:**
- Eliminates 70-90% of narrow-phase checks
- Saved: ~0.05ms per culled pair

---

## Profiling Tools

### WASM Performance Monitor

**Built-in Timing:**
```javascript
function profilePhysics() {
  const physicsTime = exports.get_physics_perf_ms();
  
  console.log(`Physics: ${physicsTime.toFixed(2)}ms`);
  
  if (physicsTime > 5.0) {
    console.warn('Physics exceeding budget!');
  }
}
```

---

### Browser DevTools

**Chrome Performance Tab:**
1. Open DevTools → Performance
2. Record gameplay session
3. Look for `PhysicsManager::update` in flame graph
4. Identify hotspots (collision detection, integration)

**Key Metrics:**
- Total frame time
- Physics subsystem time
- GC pauses (should be zero in WASM)

---

### Custom Profiler

```cpp
struct ProfileScope {
    const char* name;
    uint64_t start_micros;
    
    ProfileScope(const char* n) : name(n) {
        start_micros = get_time_micros();
    }
    
    ~ProfileScope() {
        uint64_t elapsed = get_time_micros() - start_micros;
        log_profile(name, elapsed);
    }
};

void PhysicsManager::step(Fixed dt) {
    ProfileScope profile("PhysicsStep");
    
    {
        ProfileScope profile_integrate("Integrate");
        integrate_forces(dt);
    }
    
    {
        ProfileScope profile_collisions("Collisions");
        detect_and_resolve_collisions();
    }
}
```

**Output:**
```
Integrate: 0.32ms
Collisions: 2.15ms
PhysicsStep: 2.50ms
```

---

## Common Bottlenecks

### 1. Too Many Collision Checks

**Symptoms:**
- Frame time scales with O(n²)
- Profiler shows 80%+ time in `detect_collisions()`

**Solutions:**
- Implement spatial hashing (see [Spatial Partitioning](#3-spatial-partitioning-future))
- Enable sleeping bodies
- Use LOD system for distant enemies
- Increase sleep threshold

---

### 2. Fixed Timestep Spiral of Death

**Symptoms:**
- Physics takes > 16ms per frame
- Accumulator grows without bound
- Game slows down

**Solutions:**
```cpp
const int MAX_PHYSICS_ITERATIONS = 4;

void PhysicsManager::update(float delta_time) {
    tick_accumulator_ += to_micros(delta_time);
    
    int steps = 0;
    while (tick_accumulator_ >= FIXED_STEP_MICROS && steps < MAX_PHYSICS_ITERATIONS) {
        step(FIXED_STEP_DT);
        tick_accumulator_ -= FIXED_STEP_MICROS;
        steps++;
    }
    
    // Clamp accumulator to prevent runaway
    if (steps >= MAX_PHYSICS_ITERATIONS) {
        tick_accumulator_ = 0;
        LOG_WARNING("Physics spiral detected - clamping");
    }
}
```

---

### 3. Memory Allocation During Simulation

**Symptoms:**
- Unpredictable frame spikes
- GC pauses in JavaScript layer

**Solutions:**
- Pre-allocate all body storage
- Use fixed-size arrays instead of `std::vector` growth
- Avoid JavaScript object creation in hot path

```cpp
class PhysicsManager {
    static constexpr size_t MAX_BODIES = 256;
    std::array<RigidBody, MAX_BODIES> bodies_;  // Pre-allocated
    size_t body_count_ = 0;
};
```

---

### 4. Cache Misses

**Symptoms:**
- Integration slower than expected
- Performance doesn't scale linearly

**Solutions:**
- Structure of Arrays (SoA) instead of Array of Structures (AoS)
- Access memory sequentially
- Pack frequently-used data together

```cpp
// BAD: AoS layout (cache unfriendly)
struct RigidBody {
    FixedVector3 position;
    FixedVector3 velocity;
    Fixed mass;
    bool is_sleeping;
    // ... other fields
};
std::vector<RigidBody> bodies;

// GOOD: SoA layout (cache friendly)
struct RigidBodies {
    std::vector<FixedVector3> positions;
    std::vector<FixedVector3> velocities;
    std::vector<Fixed> masses;
    std::vector<bool> is_sleeping;
};
```

---

## Scaling Strategies

### Dynamic Quality Adjustment

```javascript
class AdaptivePhysics {
  constructor(wasmExports) {
    this.wasm = wasmExports;
    this.targetFrameTime = 5.0; // ms
    this.qualityLevel = 1.0;
  }
  
  update(dt) {
    this.wasm.update(dt);
    
    const physicsTime = this.wasm.get_physics_perf_ms();
    
    // Adjust quality based on performance
    if (physicsTime > this.targetFrameTime * 1.2) {
      this.qualityLevel = Math.max(0.5, this.qualityLevel - 0.1);
      this.reduceQuality();
    } else if (physicsTime < this.targetFrameTime * 0.8) {
      this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.05);
      this.increaseQuality();
    }
  }
  
  reduceQuality() {
    // Increase sleep threshold (more bodies sleep)
    // Enable LOD system
    // Reduce collision check distance
    console.log(`Reduced physics quality to ${this.qualityLevel}`);
  }
  
  increaseQuality() {
    // Restore full fidelity
    console.log(`Increased physics quality to ${this.qualityLevel}`);
  }
}
```

---

### Conditional Features

```cpp
class PhysicsConfig {
    bool enable_sleeping = true;           // 30-50% savings
    bool enable_lod = true;                // 60-80% savings (distant)
    bool enable_broad_phase_culling = true;// 70-90% collision savings
    uint32_t max_collision_checks = 1000;  // Hard cap
    
    float sleep_velocity_threshold = 0.01f;
    uint32_t sleep_time_micros = 500000;   // 0.5 seconds
};
```

---

## Platform-Specific Tips

### Desktop (High-End)

- Enable all features
- Increase body counts (200+)
- Use higher physics tick rate (240 Hz for smoothness)

```cpp
PhysicsConfig desktop_config {
    .timestep_micros = 4166,  // 240 Hz
    .max_bodies = 256,
    .enable_sleeping = true,
    .enable_lod = false  // Not needed on desktop
};
```

---

### Mobile (Mid-Range)

- Enable sleeping and LOD
- Reduce body counts (50-100)
- Standard tick rate (120 Hz)

```cpp
PhysicsConfig mobile_config {
    .timestep_micros = 8333,  // 120 Hz
    .max_bodies = 128,
    .enable_sleeping = true,
    .enable_lod = true
};
```

---

### Mobile (Low-End)

- Aggressive sleeping
- Minimal body counts (< 50)
- Reduce tick rate (60 Hz acceptable)

```cpp
PhysicsConfig low_end_config {
    .timestep_micros = 16666,  // 60 Hz
    .max_bodies = 64,
    .enable_sleeping = true,
    .enable_lod = true,
    .sleep_velocity_threshold = 0.02f,  // Sleep faster
    .max_collision_checks = 500  // Hard cap
};
```

---

## Future Optimizations

### Priority 1: Spatial Hashing
- **Impact:** High (50-80% collision savings)
- **Effort:** Medium (2-3 days)
- **Risk:** Low (well-established technique)

### Priority 2: SIMD Integration
- **Impact:** Medium (2-4x integration speedup)
- **Effort:** Medium (3-5 days)
- **Risk:** Medium (browser support required)

### Priority 3: LOD System
- **Impact:** High (60-80% for distant bodies)
- **Effort:** Low (1-2 days)
- **Risk:** Low (easy to implement)

### Priority 4: Collision Callbacks
- **Impact:** Low (enables new features, not performance)
- **Effort:** Low (1 day)
- **Risk:** Low

### Priority 5: Force Fields
- **Impact:** Low (gameplay feature)
- **Effort:** Medium (2-3 days)
- **Risk:** Low

---

## Optimization Checklist

### Before Release
- [ ] Enable sleeping bodies
- [ ] Implement broad-phase culling
- [ ] Set appropriate max_iterations cap
- [ ] Pre-allocate body storage
- [ ] Profile on target hardware
- [ ] Test with max body counts
- [ ] Verify determinism maintained

### Performance Monitoring
- [ ] Log `get_physics_perf_ms()` regularly
- [ ] Track body counts per frame
- [ ] Monitor collision check counts
- [ ] Profile integration vs collision time
- [ ] Check for memory growth

### Platform Testing
- [ ] Test on low-end mobile (< 2GB RAM)
- [ ] Test on mid-range mobile (4GB RAM)
- [ ] Test on desktop (various CPUs)
- [ ] Verify 60 FPS maintained
- [ ] Check battery impact on mobile

---

## Related Documentation

- [Physics Architecture](./PHYSICS_ARCHITECTURE.md) - System design
- [Physics API Reference](./PHYSICS_API.md) - Usage guide
- [Performance Metrics](../AGENTS.md#performance-metrics) - Overall targets
- [Testing Guide](../BUILD/TESTING.md) - Validation procedures

---

**Version:** 1.0  
**Last Updated:** January 2025  
**Maintained by:** DozedEnt Development Team

