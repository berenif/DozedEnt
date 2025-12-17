#pragma once
#include "FixedPoint.h"

/**
 * Body type determines how physics affects the body
 */
enum class BodyType {
    Dynamic = 0,    // Affected by forces and gravity
    Kinematic = 1,  // Moved manually, not affected by forces
    Static = 2      // Never moves
};

/**
 * Rigid body representation for physics simulation
 * All properties use fixed-point math for determinism
 */
struct RigidBody {
    // Identity
    uint32_t id;
    BodyType type;
    
    // Transform
    FixedVector3 position;
    FixedVector3 velocity;
    FixedVector3 acceleration;
    
    // Physical properties
    Fixed mass;
    Fixed inverse_mass;
    Fixed friction;
    Fixed restitution;  // Bounciness
    Fixed drag;         // Air resistance (applied per step)
    Fixed radius;       // Simple sphere collision radius
    
    // Collision filtering
    uint32_t collision_layer;
    uint32_t collision_mask;
    
    // Optimization: sleeping bodies skip physics
    bool is_sleeping;
    Fixed sleep_threshold;
    int32_t sleep_timer_ticks;  // Fixed-point time tracking
    
    // Default constructor with sensible defaults
    RigidBody() 
        : id(0)
        , type(BodyType::Dynamic)
        , position(FixedVector3::zero())
        , velocity(FixedVector3::zero())
        , acceleration(FixedVector3::zero())
        , mass(Fixed::from_int(70))
        , inverse_mass(Fixed::from_float(1.0f / 70.0f))
        , friction(Fixed::from_float(0.9f))
        , restitution(Fixed::from_float(0.3f))
        , drag(Fixed::from_float(0.98f))
        , radius(Fixed::from_float(0.05f))
        , collision_layer(1)
        , collision_mask(0xFFFFFFFF)
        , is_sleeping(false)
        , sleep_threshold(Fixed::from_float(0.01f))
        , sleep_timer_ticks(0)
    {}
    
    // Helper: Check if body should be simulated
    // Dynamic bodies are always simulated when not sleeping
    // Kinematic bodies are simulated only when they have non-zero velocity (e.g., knockback)
    bool should_simulate() const {
        if (type == BodyType::Static) {
            return false;
        }
        if (is_sleeping) {
            return false;
        }
        if (type == BodyType::Dynamic) {
            return true;
        }
        // Kinematic: simulate only if moving (for knockback decay)
        return !velocity.is_zero();
    }
    
    // Helper: Check if body participates in collision detection
    bool should_collide() const {
        if (type == BodyType::Static) {
            return false;
        }
        if (type == BodyType::Dynamic && is_sleeping) {
            return false;
        }
        return true;
    }
    
    // Helper: Update sleep state based on velocity
    void update_sleep_state(int32_t timestep_micros) {
        if (type != BodyType::Dynamic) {
            return;
        }
        
        Fixed speed_sq = velocity.length_squared();
        Fixed threshold_sq = sleep_threshold * sleep_threshold;
        
        if (speed_sq < threshold_sq) {
            sleep_timer_ticks += timestep_micros;
            
            // Sleep after 1 second of low velocity (1,000,000 microseconds)
            if (sleep_timer_ticks > 1000000) {
                is_sleeping = true;
                velocity = FixedVector3::zero();
                acceleration = FixedVector3::zero();
            }
        } else {
            sleep_timer_ticks = 0;
            is_sleeping = false;
        }
    }
    
    // Helper: Wake up the body
    void wake() {
        is_sleeping = false;
        sleep_timer_ticks = 0;
    }
};

/**
 * Global physics configuration
 * All timing uses fixed-point or integer microseconds for determinism
 */
struct PhysicsConfig {
    // World properties
    FixedVector3 gravity;
    
    // Timing (stored as microseconds for determinism)
    int32_t timestep_micros;    // Fixed timestep in microseconds (e.g., 16666 = 1/60s)
    
    // Solver settings
    int max_bodies;
    int max_iterations;
    
    // Velocity limits (prevent extreme values)
    Fixed max_velocity;
    
    // World bounds (normalized 0..1 space)
    Fixed world_min_x;
    Fixed world_max_x;
    Fixed world_min_y;
    Fixed world_max_y;
    
    // Default constructor
    PhysicsConfig()
        : gravity(FixedVector3::from_floats(0.0f, -9.81f, 0.0f))
        , timestep_micros(16666)  // 60 FPS = 16.666ms
        , max_bodies(50)
        , max_iterations(4)
        , max_velocity(Fixed::from_float(50.0f))
        , world_min_x(Fixed::from_int(-10))
        , world_max_x(Fixed::from_int(10))
        , world_min_y(Fixed::from_int(-10))
        , world_max_y(Fixed::from_int(10))
    {}
    
    // Helper: Get timestep as fixed-point seconds
    Fixed get_timestep_fixed() const {
        // Convert microseconds to seconds using fixed-point
        // 1,000,000 microseconds = 1 second
        return Fixed::from_float(timestep_micros / 1000000.0f);
    }
};


