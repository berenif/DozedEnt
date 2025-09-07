# pragma once

#include <cmath>
#include <vector>

// ============================================================================
// Physics Backbone System - WASM Implementation
// Implements rigid body dynamics, gravity, collision detection, buoyancy, etc.
// Based on CORE_WORLD_SIMULATION.MD specifications
// ============================================================================

// Forward declarations
struct Vector2;
struct Vector3;
struct Matrix3;
struct RigidBody;
struct CollisionPair;
struct SurfaceMaterial;

// ============================================================================
// Core Data Structures
// ============================================================================

struct Vector3 {
    float x, y, z;
    
    Vector3() : x(0), y(0), z(0) {}
    Vector3(float x_, float y_, float z_) : x(x_), y(y_), z(z_) {}
    
    Vector3 operator+(const Vector3& other) const {
        return Vector3(x + other.x, y + other.y, z + other.z);
    }
    
    Vector3 operator-(const Vector3& other) const {
        return Vector3(x - other.x, y - other.y, z - other.z);
    }
    
    Vector3 operator-() const {
        return Vector3(-x, -y, -z);
    }
    
    Vector3 operator*(float scalar) const {
        return Vector3(x * scalar, y * scalar, z * scalar);
    }
    
    Vector3& operator+=(const Vector3& other) {
        x += other.x; y += other.y; z += other.z;
        return *this;
    }
    
    Vector3& operator-=(const Vector3& other) {
        x -= other.x; y -= other.y; z -= other.z;
        return *this;
    }
    
    Vector3& operator*=(float scalar) {
        x *= scalar; y *= scalar; z *= scalar;
        return *this;
    }
    
    float length() const {
        return __builtin_sqrtf(x * x + y * y + z * z);
    }
    
    float length_squared() const {
        return x * x + y * y + z * z;
    }
    
    Vector3 normalized() const {
        float len = length();
        if (len > 0.0f) {
            return Vector3(x / len, y / len, z / len);
        }
        return Vector3(0, 0, 0);
    }
    
    float dot(const Vector3& other) const {
        return x * other.x + y * other.y + z * other.z;
    }
    
    Vector3 cross(const Vector3& other) const {
        return Vector3(
            y * other.z - z * other.y,
            z * other.x - x * other.z,
            x * other.y - y * other.x
        );
    }
};

struct Vector2 {
    float x, y;
    
    Vector2() : x(0), y(0) {}
    Vector2(float x_, float y_) : x(x_), y(y_) {}
    
    Vector2 operator+(const Vector2& other) const {
        return Vector2(x + other.x, y + other.y);
    }
    
    Vector2 operator-(const Vector2& other) const {
        return Vector2(x - other.x, y - other.y);
    }
    
    Vector2 operator*(float scalar) const {
        return Vector2(x * scalar, y * scalar);
    }
    
    float length() const {
        return __builtin_sqrtf(x * x + y * y);
    }
    
    Vector2 normalized() const {
        float len = length();
        if (len > 0.0f) {
            return Vector2(x / len, y / len);
        }
        return Vector2(0, 0);
    }
};

struct Matrix3 {
    float m[9]; // Row-major order
    
    Matrix3() {
        // Initialize to identity
        for (int i = 0; i < 9; i++) m[i] = 0.0f;
        m[0] = m[4] = m[8] = 1.0f;
    }
    
    Vector3 operator*(const Vector3& v) const {
        return Vector3(
            m[0] * v.x + m[1] * v.y + m[2] * v.z,
            m[3] * v.x + m[4] * v.y + m[5] * v.z,
            m[6] * v.x + m[7] * v.y + m[8] * v.z
        );
    }
};

// Material properties for physics interactions
struct SurfaceMaterial {
    float static_friction;    // 0.0 (ice) to 1.5 (rubber)
    float kinetic_friction;   // Always < static_friction
    float restitution;        // Bounciness factor (0.0 to 1.0)
    float roughness;          // Surface texture
    float density;            // kg/m³ for buoyancy calculations
    
    SurfaceMaterial() : 
        static_friction(0.7f), kinetic_friction(0.5f), 
        restitution(0.3f), roughness(0.5f), density(1.0f) {}
        
    SurfaceMaterial(float sf, float kf, float rest, float rough, float dens) :
        static_friction(sf), kinetic_friction(kf), restitution(rest), 
        roughness(rough), density(dens) {}
};

// Collision detection shapes
enum CollisionType {
    SPHERE_SPHERE,
    SPHERE_PLANE,
    CONVEX_HULL,
    TERRAIN_MESH
};

struct CollisionPair {
    uint32_t body_a;
    uint32_t body_b;
    Vector3 contact_point;
    Vector3 normal;
    float penetration;
    CollisionType type;
};

// Rigid body dynamics
struct RigidBody {
    Vector3 position;
    Vector3 velocity;
    Vector3 acceleration;
    Vector3 angular_velocity;
    
    float mass;
    float inv_mass;              // 1/mass (0 for static objects)
    float drag;                  // Air/fluid resistance
    float radius;                // For sphere collision
    
    Matrix3 inertia_tensor;
    Matrix3 inv_inertia_tensor;
    
    SurfaceMaterial material;
    
    bool is_static;              // Immovable objects
    bool is_kinematic;           // Controlled by script, not physics
    bool in_fluid;               // Currently submerged
    float submerged_volume;      // For buoyancy calculations
    
    uint32_t collision_mask;     // What can this collide with
    uint32_t collision_layer;    // What layer is this on
    
    RigidBody() : 
        position(0, 0, 0), velocity(0, 0, 0), acceleration(0, 0, 0),
        angular_velocity(0, 0, 0), mass(1.0f), inv_mass(1.0f), drag(0.1f),
        radius(0.05f), is_static(false), is_kinematic(false), 
        in_fluid(false), submerged_volume(0.0f),
        collision_mask(0xFFFFFFFF), collision_layer(1) {}
    
    void set_mass(float new_mass) {
        mass = new_mass;
        inv_mass = (new_mass > 0.0f) ? (1.0f / new_mass) : 0.0f;
        is_static = (new_mass <= 0.0f);
    }
    
    void apply_force(const Vector3& force) {
        if (!is_static && !is_kinematic) {
            acceleration += force * inv_mass;
        }
    }
    
    void apply_impulse(const Vector3& impulse) {
        if (!is_static && !is_kinematic) {
            velocity += impulse * inv_mass;
        }
    }
    
    void update(float dt) {
        if (is_static || is_kinematic) return;
        
        // Apply gravity
        const Vector3 gravity(0, 0, 9.81f); // Positive Z is down
        acceleration += gravity;
        
        // Apply buoyancy if in fluid
        if (in_fluid && submerged_volume > 0.0f) {
            // Archimedes principle: buoyant force = displaced fluid weight
            float fluid_density = 1000.0f; // Water density kg/m³
            Vector3 buoyant_force(0, 0, -fluid_density * submerged_volume * 9.81f);
            apply_force(buoyant_force);
        }
        
        // Verlet integration for stability
        velocity += acceleration * dt;
        position += velocity * dt;
        
        // Apply drag
        velocity *= (1.0f - drag * dt);
        angular_velocity *= (1.0f - drag * dt);
        
        // Reset acceleration for next frame
        acceleration = Vector3(0, 0, 0);
    }
};

// ============================================================================
// Physics System Constants
// ============================================================================

const float GRAVITY_ACCELERATION = 9.81f;  // m/s²
const float WATER_DENSITY = 1000.0f;       // kg/m³
const float AIR_DENSITY = 1.225f;          // kg/m³
const float COLLISION_EPSILON = 0.001f;    // Minimum separation distance
const int MAX_RIGID_BODIES = 256;
const int MAX_COLLISION_PAIRS = 512;

// Material presets
const SurfaceMaterial MATERIAL_WOOD(0.6f, 0.4f, 0.3f, 0.8f, 600.0f);
const SurfaceMaterial MATERIAL_METAL(0.8f, 0.6f, 0.1f, 0.2f, 7800.0f);
const SurfaceMaterial MATERIAL_STONE(0.9f, 0.7f, 0.2f, 0.9f, 2500.0f);
const SurfaceMaterial MATERIAL_ICE(0.1f, 0.05f, 0.8f, 0.1f, 900.0f);
const SurfaceMaterial MATERIAL_RUBBER(1.5f, 1.2f, 0.9f, 0.7f, 1200.0f);
const SurfaceMaterial MATERIAL_ORGANIC(0.5f, 0.3f, 0.2f, 0.9f, 400.0f);
const SurfaceMaterial MATERIAL_PLANT(0.4f, 0.2f, 0.1f, 0.8f, 300.0f);

// ============================================================================
// Physics System State
// ============================================================================

// Global physics state
struct PhysicsWorld {
    RigidBody bodies[MAX_RIGID_BODIES];
    CollisionPair collision_pairs[MAX_COLLISION_PAIRS];
    
    uint32_t body_count;
    uint32_t collision_count;
    
    Vector3 world_gravity;
    float time_step;
    float accumulator;
    
    // Spatial partitioning for collision detection
    struct SpatialCell {
        uint32_t body_indices[32];
        uint32_t count;
    };
    
    static const int GRID_SIZE = 32;
    SpatialCell spatial_grid[GRID_SIZE][GRID_SIZE];
    
    PhysicsWorld() : 
        body_count(0), collision_count(0), 
        world_gravity(0, 0, GRAVITY_ACCELERATION),
        time_step(1.0f / 60.0f), accumulator(0.0f) {
        
        // Clear spatial grid
        for (int x = 0; x < GRID_SIZE; x++) {
            for (int y = 0; y < GRID_SIZE; y++) {
                spatial_grid[x][y].count = 0;
            }
        }
    }
};

static PhysicsWorld g_physics_world;

// ============================================================================
// Physics System Functions
// ============================================================================

// Body management
uint32_t physics_create_body(const Vector3& position, float mass, float radius, const SurfaceMaterial& material) {
    if (g_physics_world.body_count >= MAX_RIGID_BODIES) {
        return 0xFFFFFFFF; // Invalid ID
    }
    
    uint32_t id = g_physics_world.body_count++;
    RigidBody& body = g_physics_world.bodies[id];
    
    body.position = position;
    body.set_mass(mass);
    body.radius = radius;
    body.material = material;
    
    return id;
}

void physics_destroy_body(uint32_t body_id) {
    if (body_id >= g_physics_world.body_count) return;
    
    // Mark as inactive by setting mass to 0 and is_static to true
    g_physics_world.bodies[body_id].set_mass(0.0f);
    g_physics_world.bodies[body_id].is_static = true;
}

// Spatial partitioning for efficient collision detection
void physics_update_spatial_grid() {
    // Clear grid
    for (int x = 0; x < PhysicsWorld::GRID_SIZE; x++) {
        for (int y = 0; y < PhysicsWorld::GRID_SIZE; y++) {
            g_physics_world.spatial_grid[x][y].count = 0;
        }
    }
    
    // Insert bodies into grid
    for (uint32_t i = 0; i < g_physics_world.body_count; i++) {
        const RigidBody& body = g_physics_world.bodies[i];
        if (body.is_static && body.mass <= 0.0f) continue; // Skip destroyed bodies
        
        // Convert world position to grid coordinates
        int grid_x = (int)((body.position.x + 1.0f) * 0.5f * PhysicsWorld::GRID_SIZE);
        int grid_y = (int)((body.position.y + 1.0f) * 0.5f * PhysicsWorld::GRID_SIZE);
        
        // Clamp to grid bounds
        grid_x = grid_x < 0 ? 0 : (grid_x >= PhysicsWorld::GRID_SIZE ? PhysicsWorld::GRID_SIZE - 1 : grid_x);
        grid_y = grid_y < 0 ? 0 : (grid_y >= PhysicsWorld::GRID_SIZE ? PhysicsWorld::GRID_SIZE - 1 : grid_y);
        
        // Add to cell if there's space
        PhysicsWorld::SpatialCell& cell = g_physics_world.spatial_grid[grid_x][grid_y];
        if (cell.count < 32) {
            cell.body_indices[cell.count++] = i;
        }
    }
}

// Collision detection
bool physics_detect_sphere_sphere_collision(const RigidBody& a, const RigidBody& b, CollisionPair& pair) {
    Vector3 delta = b.position - a.position;
    float distance_sq = delta.length_squared();
    float combined_radius = a.radius + b.radius;
    
    if (distance_sq < combined_radius * combined_radius) {
        float distance = __builtin_sqrtf(distance_sq);
        
        pair.penetration = combined_radius - distance;
        pair.normal = (distance > 0.0f) ? delta.normalized() : Vector3(1, 0, 0);
        pair.contact_point = a.position + pair.normal * a.radius;
        
        return true;
    }
    
    return false;
}

// Collision response with momentum conservation
void physics_resolve_collision(RigidBody& a, RigidBody& b, const CollisionPair& pair) {
    // Separate overlapping objects
    Vector3 separation = pair.normal * (pair.penetration * 0.5f);
    
    if (!a.is_static && !a.is_kinematic) {
        a.position -= separation;
    }
    if (!b.is_static && !b.is_kinematic) {
        b.position += separation;
    }
    
    // Calculate relative velocity
    Vector3 relative_velocity = b.velocity - a.velocity;
    float velocity_along_normal = relative_velocity.dot(pair.normal);
    
    // Don't resolve if velocities are separating
    if (velocity_along_normal > 0) return;
    
    // Calculate restitution (bounciness)
    float restitution = (a.material.restitution + b.material.restitution) * 0.5f;
    
    // Calculate impulse scalar
    float impulse_scalar = -(1.0f + restitution) * velocity_along_normal;
    impulse_scalar /= (a.inv_mass + b.inv_mass);
    
    // Apply impulse
    Vector3 impulse = pair.normal * impulse_scalar;
    
    if (!a.is_static && !a.is_kinematic) {
        a.velocity -= impulse * a.inv_mass;
    }
    if (!b.is_static && !b.is_kinematic) {
        b.velocity += impulse * b.inv_mass;
    }
    
    // Apply friction
    Vector3 tangent = relative_velocity - pair.normal * velocity_along_normal;
    if (tangent.length() > COLLISION_EPSILON) {
        tangent = tangent.normalized();
        
        float friction_coefficient = (a.material.kinetic_friction + b.material.kinetic_friction) * 0.5f;
        float friction_impulse = -relative_velocity.dot(tangent) * friction_coefficient;
        friction_impulse /= (a.inv_mass + b.inv_mass);
        
        Vector3 friction_force = tangent * friction_impulse;
        
        if (!a.is_static && !a.is_kinematic) {
            a.velocity -= friction_force * a.inv_mass;
        }
        if (!b.is_static && !b.is_kinematic) {
            b.velocity += friction_force * b.inv_mass;
        }
    }
}

// Buoyancy calculations
void physics_update_buoyancy(RigidBody& body, float fluid_level) {
    if (body.position.z > fluid_level) {
        body.in_fluid = false;
        body.submerged_volume = 0.0f;
        return;
    }
    
    body.in_fluid = true;
    
    // Calculate submerged volume for sphere
    float depth = fluid_level - body.position.z;
    if (depth >= body.radius) {
        // Fully submerged
        body.submerged_volume = (4.0f / 3.0f) * 3.14159f * body.radius * body.radius * body.radius;
    } else {
        // Partially submerged - spherical cap volume
        float h = depth + body.radius; // Height of submerged cap
        body.submerged_volume = 3.14159f * h * h * (3.0f * body.radius - h) / 3.0f;
    }
}

// Main physics update
void physics_update(float dt) {
    g_physics_world.accumulator += dt;
    
    while (g_physics_world.accumulator >= g_physics_world.time_step) {
        g_physics_world.accumulator -= g_physics_world.time_step;
        
        // Update spatial partitioning
        physics_update_spatial_grid();
        
        // Update buoyancy for all bodies
        float water_level = 0.0f; // World Z coordinate of water surface
        for (uint32_t i = 0; i < g_physics_world.body_count; i++) {
            RigidBody& body = g_physics_world.bodies[i];
            if (body.is_static && body.mass <= 0.0f) continue;
            
            physics_update_buoyancy(body, water_level);
        }
        
        // Collision detection and response
        g_physics_world.collision_count = 0;
        
        for (int x = 0; x < PhysicsWorld::GRID_SIZE; x++) {
            for (int y = 0; y < PhysicsWorld::GRID_SIZE; y++) {
                const PhysicsWorld::SpatialCell& cell = g_physics_world.spatial_grid[x][y];
                
                // Check collisions within this cell
                for (uint32_t i = 0; i < cell.count; i++) {
                    for (uint32_t j = i + 1; j < cell.count; j++) {
                        uint32_t body_a_idx = cell.body_indices[i];
                        uint32_t body_b_idx = cell.body_indices[j];
                        
                        RigidBody& body_a = g_physics_world.bodies[body_a_idx];
                        RigidBody& body_b = g_physics_world.bodies[body_b_idx];
                        
                        // Skip if both are static
                        if ((body_a.is_static || body_a.is_kinematic) && 
                            (body_b.is_static || body_b.is_kinematic)) continue;
                        
                        // Check collision masks
                        if (!(body_a.collision_mask & body_b.collision_layer) ||
                            !(body_b.collision_mask & body_a.collision_layer)) continue;
                        
                        CollisionPair pair;
                        pair.body_a = body_a_idx;
                        pair.body_b = body_b_idx;
                        pair.type = SPHERE_SPHERE;
                        
                        if (physics_detect_sphere_sphere_collision(body_a, body_b, pair)) {
                            if (g_physics_world.collision_count < MAX_COLLISION_PAIRS) {
                                g_physics_world.collision_pairs[g_physics_world.collision_count++] = pair;
                                physics_resolve_collision(body_a, body_b, pair);
                            }
                        }
                    }
                }
            }
        }
        
        // Update all rigid bodies
        for (uint32_t i = 0; i < g_physics_world.body_count; i++) {
            RigidBody& body = g_physics_world.bodies[i];
            if (body.is_static && body.mass <= 0.0f) continue;
            
            body.update(g_physics_world.time_step);
        }
    }
}

// ============================================================================
// WASM Export Functions
// ============================================================================

extern "C" {
    // Physics world management
    void physics_init() {
        g_physics_world = PhysicsWorld();
    }
    
    void physics_step(float dt) {
        physics_update(dt);
    }
    
    // Body management
    uint32_t create_rigid_body(float x, float y, float z, float mass, float radius) {
        return physics_create_body(Vector3(x, y, z), mass, radius, MATERIAL_WOOD);
    }
    
    uint32_t create_rigid_body_with_material(float x, float y, float z, float mass, float radius, 
                                           float friction, float restitution, float density) {
        SurfaceMaterial material(friction, friction * 0.8f, restitution, 0.5f, density);
        return physics_create_body(Vector3(x, y, z), mass, radius, material);
    }
    
    void destroy_rigid_body(uint32_t body_id) {
        physics_destroy_body(body_id);
    }
    
    // Body property getters
    float get_body_x(uint32_t body_id) {
        if (body_id >= g_physics_world.body_count) return 0.0f;
        return g_physics_world.bodies[body_id].position.x;
    }
    
    float get_body_y(uint32_t body_id) {
        if (body_id >= g_physics_world.body_count) return 0.0f;
        return g_physics_world.bodies[body_id].position.y;
    }
    
    float get_body_z(uint32_t body_id) {
        if (body_id >= g_physics_world.body_count) return 0.0f;
        return g_physics_world.bodies[body_id].position.z;
    }
    
    float get_body_vel_x(uint32_t body_id) {
        if (body_id >= g_physics_world.body_count) return 0.0f;
        return g_physics_world.bodies[body_id].velocity.x;
    }
    
    float get_body_vel_y(uint32_t body_id) {
        if (body_id >= g_physics_world.body_count) return 0.0f;
        return g_physics_world.bodies[body_id].velocity.y;
    }
    
    float get_body_vel_z(uint32_t body_id) {
        if (body_id >= g_physics_world.body_count) return 0.0f;
        return g_physics_world.bodies[body_id].velocity.z;
    }
    
    // Body property setters
    void set_body_position(uint32_t body_id, float x, float y, float z) {
        if (body_id >= g_physics_world.body_count) return;
        g_physics_world.bodies[body_id].position = Vector3(x, y, z);
    }
    
    void set_body_velocity(uint32_t body_id, float x, float y, float z) {
        if (body_id >= g_physics_world.body_count) return;
        g_physics_world.bodies[body_id].velocity = Vector3(x, y, z);
    }
    
    void apply_force_to_body(uint32_t body_id, float fx, float fy, float fz) {
        if (body_id >= g_physics_world.body_count) return;
        g_physics_world.bodies[body_id].apply_force(Vector3(fx, fy, fz));
    }
    
    void apply_impulse_to_body(uint32_t body_id, float ix, float iy, float iz) {
        if (body_id >= g_physics_world.body_count) return;
        g_physics_world.bodies[body_id].apply_impulse(Vector3(ix, iy, iz));
    }
    
    // Collision queries
    uint32_t get_collision_count() {
        return g_physics_world.collision_count;
    }
    
    uint32_t get_collision_body_a(uint32_t collision_idx) {
        if (collision_idx >= g_physics_world.collision_count) return 0xFFFFFFFF;
        return g_physics_world.collision_pairs[collision_idx].body_a;
    }
    
    uint32_t get_collision_body_b(uint32_t collision_idx) {
        if (collision_idx >= g_physics_world.collision_count) return 0xFFFFFFFF;
        return g_physics_world.collision_pairs[collision_idx].body_b;
    }
    
    // Buoyancy queries
    int is_body_in_fluid(uint32_t body_id) {
        if (body_id >= g_physics_world.body_count) return 0;
        return g_physics_world.bodies[body_id].in_fluid ? 1 : 0;
    }
    
    float get_body_submerged_volume(uint32_t body_id) {
        if (body_id >= g_physics_world.body_count) return 0.0f;
        return g_physics_world.bodies[body_id].submerged_volume;
    }
}
