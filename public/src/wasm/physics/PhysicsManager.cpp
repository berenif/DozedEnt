#include "PhysicsManager.h"
#include <algorithm>
#include "CollisionLayers.h"
#include "PhysicsEvents.h"
#include "SpatialHash.h"
#include "ForceField.h"

PhysicsManager::PhysicsManager() 
    : next_body_id_(1)
    , tick_accumulator_(0)
    , last_step_time_ms_(0.0f)
    , spatial_hash_(nullptr)
    , force_field_mgr_(nullptr)
    , use_broadphase_(false)
    , pairs_checked_(0)
    , collisions_resolved_(0)
{
}

PhysicsManager::~PhysicsManager() {
    delete spatial_hash_;
    delete force_field_mgr_;
}

void PhysicsManager::initialize(const PhysicsConfig& config) {
    config_ = config;
    bodies_.clear();
    bodies_.reserve(config.max_bodies);
    tick_accumulator_ = 0;
    next_body_id_ = 1;
    
    // Create player body (ID 0) at spawn position
    RigidBody player_body;
    player_body.id = 0;
    player_body.type = BodyType::Kinematic;  // Kinematic: not affected by gravity, but can receive knockback
    player_body.position = FixedVector3::from_floats(0.5f, 0.5f, 0.0f);
    player_body.mass = Fixed::from_int(70);
    player_body.inverse_mass = Fixed::from_float(1.0f / 70.0f);  // Non-zero to allow knockback
    player_body.drag = Fixed::from_float(0.88f);  // Faster deceleration for responsive knockback
    player_body.radius = Fixed::from_float(0.05f);
    player_body.collision_layer = CollisionLayers::Player;
    player_body.collision_mask = CollisionLayers::Enemy | CollisionLayers::Environment;
    bodies_.push_back(player_body);
}

void PhysicsManager::reset() {
    bodies_.clear();
    tick_accumulator_ = 0;
    next_body_id_ = 1;
    
    // Recreate player body
    RigidBody player_body;
    player_body.id = 0;
    player_body.type = BodyType::Kinematic;  // Kinematic: not affected by gravity, but can receive knockback
    player_body.position = FixedVector3::from_floats(0.5f, 0.5f, 0.0f);
    player_body.mass = Fixed::from_int(70);
    player_body.inverse_mass = Fixed::from_float(1.0f / 70.0f);  // Non-zero to allow knockback
    player_body.drag = Fixed::from_float(0.88f);  // Faster deceleration for responsive knockback
    player_body.radius = Fixed::from_float(0.05f);
    player_body.collision_layer = CollisionLayers::Player;
    player_body.collision_mask = CollisionLayers::Enemy | CollisionLayers::Environment;
    bodies_.push_back(player_body);
}

void PhysicsManager::update(float delta_time) {
    if (delta_time <= 0.0f) {
        return;
    }
    
    // Convert delta time to microseconds (integer for determinism)
    const int32_t dt_micros = static_cast<int32_t>(delta_time * 1000000.0f);
    tick_accumulator_ += dt_micros;
    
    const int32_t fixed_step_micros = config_.timestep_micros;
    
    // Fixed timestep loop
    int steps_taken = 0;
    while (tick_accumulator_ >= fixed_step_micros && steps_taken < config_.max_iterations) {
        Fixed dt_fixed = config_.get_timestep_fixed();
        step(dt_fixed);
        tick_accumulator_ -= fixed_step_micros;
        steps_taken++;
    }
    
    // Track performance (non-deterministic, for monitoring only)
    last_step_time_ms_ = steps_taken * (fixed_step_micros / 1000.0f);
}

void PhysicsManager::step(Fixed dt) {
    // Integrate forces for all dynamic bodies
    if (force_field_mgr_) {
        // Force fields modify accelerations before integration
        force_field_mgr_->apply(bodies_, dt);
    }
    integrate_forces(dt);
    
    // Detect and resolve collisions
    detect_and_resolve_collisions();
    
    // Update sleeping state for all bodies
    update_sleeping_bodies(config_.timestep_micros);
}

void PhysicsManager::integrate_forces(Fixed dt) {
    for (auto& body : bodies_) {
        if (!body.should_simulate()) {
            continue;
        }
        
        // Apply accumulated acceleration and gravity to velocity
        FixedVector3 total_accel = body.acceleration + config_.gravity;
        body.velocity += total_accel * dt;
        
        // Clear acceleration (forces are applied for one frame only)
        body.acceleration = FixedVector3::zero();
        
        // Apply drag (per-step damping)
        body.velocity *= body.drag;
        
        // Clamp velocity to prevent extreme speeds
        Fixed speed_sq = body.velocity.length_squared();
        Fixed max_speed_sq = config_.max_velocity * config_.max_velocity;
        
        if (speed_sq > max_speed_sq) {
            Fixed speed = fixed_sqrt(speed_sq);
            body.velocity = body.velocity.normalized() * config_.max_velocity;
        }
        
        // Integrate velocity to position
        body.position += body.velocity * dt;
        
        // Apply world bounds
        apply_world_bounds(body);
    }
}

void PhysicsManager::apply_world_bounds(RigidBody& body) {
    bool collision_occurred = false;
    
    // X bounds
    if (body.position.x < config_.world_min_x) {
        body.position.x = config_.world_min_x;
        body.velocity.x = Fixed::from_int(0);
        collision_occurred = true;
    } else if (body.position.x > config_.world_max_x) {
        body.position.x = config_.world_max_x;
        body.velocity.x = Fixed::from_int(0);
        collision_occurred = true;
    }
    
    // Y bounds
    if (body.position.y < config_.world_min_y) {
        body.position.y = config_.world_min_y;
        body.velocity.y = Fixed::from_int(0);
        collision_occurred = true;
    } else if (body.position.y > config_.world_max_y) {
        body.position.y = config_.world_max_y;
        body.velocity.y = Fixed::from_int(0);
        collision_occurred = true;
    }
    
    // Wake body if it hit a wall
    if (collision_occurred) {
        body.wake();
    }
}

void PhysicsManager::update_sleeping_bodies(int32_t timestep_micros) {
    for (auto& body : bodies_) {
        body.update_sleep_state(timestep_micros);
    }
}

uint32_t PhysicsManager::create_body(const RigidBody& body) {
    RigidBody new_body = body;
    new_body.id = generate_body_id();
    bodies_.push_back(new_body);
    return new_body.id;
}

uint32_t PhysicsManager::create_wolf_body(float x, float y, float radius) {
    RigidBody wolf_body;
    wolf_body.id = generate_body_id();
    wolf_body.type = BodyType::Dynamic;
    wolf_body.position = FixedVector3::from_floats(x, y, 0.0f);
    wolf_body.mass = Fixed::from_int(50);  // Wolves are lighter than player
    wolf_body.inverse_mass = Fixed::from_float(1.0f / 50.0f);
    wolf_body.drag = Fixed::from_float(0.85f);  // Slightly more friction than player
    wolf_body.radius = Fixed::from_float(radius);
    wolf_body.collision_layer = CollisionLayers::Enemy;
    wolf_body.collision_mask = CollisionLayers::Player | CollisionLayers::Environment;
    wolf_body.velocity = FixedVector3::zero();
    wolf_body.acceleration = FixedVector3::zero();
    
    bodies_.push_back(wolf_body);
    return wolf_body.id;
}

void PhysicsManager::destroy_body(uint32_t id) {
    bodies_.erase(
        std::remove_if(bodies_.begin(), bodies_.end(),
            [id](const RigidBody& b) { return b.id == id; }),
        bodies_.end()
    );
}

RigidBody* PhysicsManager::get_body(uint32_t id) {
    return find_body(id);
}

const RigidBody* PhysicsManager::get_body(uint32_t id) const {
    return find_body(id);
}

RigidBody* PhysicsManager::find_body(uint32_t id) {
    for (auto& body : bodies_) {
        if (body.id == id) {
            return &body;
        }
    }
    return nullptr;
}

const RigidBody* PhysicsManager::find_body(uint32_t id) const {
    for (const auto& body : bodies_) {
        if (body.id == id) {
            return &body;
        }
    }
    return nullptr;
}

void PhysicsManager::apply_impulse(uint32_t body_id, const FixedVector3& impulse) {
    RigidBody* body = find_body(body_id);
    if (!body) {
        return;
    }
    
    // Wake body if sleeping
    body->wake();
    
    // Apply impulse: Δv = impulse / mass
    body->velocity += impulse * body->inverse_mass;
}

void PhysicsManager::apply_force(uint32_t body_id, const FixedVector3& force) {
    RigidBody* body = find_body(body_id);
    if (!body) {
        return;
    }
    
    // Wake body if sleeping
    body->wake();
    
    // Accumulate force into acceleration: a = F / m
    body->acceleration += force * body->inverse_mass;
}

void PhysicsManager::set_velocity(uint32_t body_id, const FixedVector3& velocity) {
    RigidBody* body = find_body(body_id);
    if (!body) {
        return;
    }
    
    // Wake body if setting non-zero velocity
    if (!velocity.is_zero()) {
        body->wake();
    }
    
    body->velocity = velocity;
}

void PhysicsManager::set_position(uint32_t body_id, const FixedVector3& position) {
    RigidBody* body = find_body(body_id);
    if (!body) {
        return;
    }
    
    body->position = position;
}

void PhysicsManager::detect_and_resolve_collisions() {
    pairs_checked_ = 0;
    collisions_resolved_ = 0;
    // Ground collision detection (check all bodies against ground at y=0)
    const Fixed GROUND_Y = Fixed::from_int(0);
    const Fixed GROUND_RESTITUTION = Fixed::from_float(0.3f);
    const Fixed GROUND_FRICTION = Fixed::from_float(0.7f);
    
    for (auto& body : bodies_) {
        // Skip static bodies, but check both Dynamic and Kinematic
        if (body.type == BodyType::Static) continue;
        if (body.type == BodyType::Dynamic && body.is_sleeping) continue;
        
        // Check if body is below ground level
        if (body.position.y - body.radius < GROUND_Y) {
            // Wake the body
            body.wake();
            
            // Calculate overlap with ground
            Fixed overlap = GROUND_Y - (body.position.y - body.radius);
            
            // Move body above ground
            body.position.y = GROUND_Y + body.radius;
            
            // Apply ground collision response
            if (body.velocity.y < Fixed::from_int(0)) {
                // Apply restitution (bounce)
                body.velocity.y *= -GROUND_RESTITUTION;
                
                // Apply friction to horizontal velocity
                body.velocity.x *= GROUND_FRICTION;
                body.velocity.z *= GROUND_FRICTION;
            }
        }
    }
    
    // Simple sphere-sphere collision detection and response
    // Optionally use broadphase to reduce candidate pairs
    std::vector<std::pair<uint32_t, uint32_t>> potentialPairs;
    if (use_broadphase_) {
        if (!spatial_hash_) spatial_hash_ = new SpatialHash();
        spatial_hash_->update(bodies_);
        spatial_hash_->getPotentialPairs(bodies_, potentialPairs);
    }

    if (use_broadphase_ && !potentialPairs.empty()) {
        // Build an index for body id -> index lookup
        // Note: ids are not guaranteed to be contiguous
        for (const auto &p : potentialPairs) {
            // Find indices for both ids
            RigidBody *bi = find_body(p.first);
            RigidBody *bj = find_body(p.second);
            if (!bi || !bj) continue;
            if (bi->type == BodyType::Static) continue;
            if (bj->type == BodyType::Static) continue;
            if (bi->type == BodyType::Dynamic && bi->is_sleeping) continue;
            if (bj->type == BodyType::Dynamic && bj->is_sleeping) continue;
            pairs_checked_++;
            // Layer/mask filtering
            if (!shouldCollide(bi->collision_layer, bi->collision_mask, bj->collision_layer, bj->collision_mask)) continue;
            // Narrow phase
            FixedVector3 delta = bj->position - bi->position;
            Fixed dist_sq = delta.length_squared();
            Fixed combined_radius = bi->radius + bj->radius;
            Fixed combined_radius_sq = combined_radius * combined_radius;
            const Fixed MAX_DISTANCE_SQ = Fixed::from_int(1000000);
            const Fixed MIN_RADIUS = Fixed::from_float(0.001f);
            if (dist_sq > MAX_DISTANCE_SQ || bi->radius < MIN_RADIUS || bj->radius < MIN_RADIUS) continue;
            if (dist_sq < combined_radius_sq && dist_sq > Fixed::from_int(0)) {
                bi->wake();
                bj->wake();
                Fixed dist = fixed_sqrt(dist_sq);
                FixedVector3 normal = delta.normalized();
                Fixed overlap = combined_radius - dist;
                Fixed total_inv_mass = bi->inverse_mass + bj->inverse_mass;
                if (total_inv_mass > Fixed::from_int(0)) {
                    Fixed ratio_i = bi->inverse_mass / total_inv_mass;
                    Fixed ratio_j = bj->inverse_mass / total_inv_mass;
                    *bi = *bi; *bj = *bj; // no-op to keep formatting blocks similar
                    bi->position -= normal * overlap * ratio_i;
                    bj->position += normal * overlap * ratio_j;
                    FixedVector3 relative_velocity = bj->velocity - bi->velocity;
                    Fixed velocity_along_normal = relative_velocity.dot(normal);
                    if (velocity_along_normal < Fixed::from_int(0)) {
                        Fixed restitution = Fixed::from_float(0.5f);
                        Fixed impulse_magnitude = -(Fixed::from_int(1) + restitution) * velocity_along_normal / total_inv_mass;
                        FixedVector3 impulse = normal * impulse_magnitude;
                        bi->velocity -= impulse * bi->inverse_mass;
                        bj->velocity += impulse * bj->inverse_mass;
                        collisions_resolved_++;
                        CollisionEvent ev{};
                        ev.bodyA = bi->id; ev.bodyB = bj->id;
                        ev.nx = normal.x.to_float(); ev.ny = normal.y.to_float(); ev.nz = normal.z.to_float();
                        FixedVector3 contact = bi->position + (normal * bi->radius);
                        ev.px = contact.x.to_float(); ev.py = contact.y.to_float(); ev.pz = contact.z.to_float();
                        ev.impulse = impulse_magnitude.to_float();
                        GetPhysicsEventQueue().push(ev);
                    }
                }
            }
        }
    } else {
        for (size_t i = 0; i < bodies_.size(); ++i) {
        // Skip static bodies, but include both Dynamic and Kinematic
        if (bodies_[i].type == BodyType::Static) continue;
        if (bodies_[i].type == BodyType::Dynamic && bodies_[i].is_sleeping) continue;
        
        for (size_t j = i + 1; j < bodies_.size(); ++j) {
            // Skip static bodies, but include both Dynamic and Kinematic
            if (bodies_[j].type == BodyType::Static) continue;
            if (bodies_[j].type == BodyType::Dynamic && bodies_[j].is_sleeping) continue;
            pairs_checked_++;
            // Collision layer/mask filtering (cheap bitmask test before math)
            if (!shouldCollide(
                bodies_[i].collision_layer, bodies_[i].collision_mask,
                bodies_[j].collision_layer, bodies_[j].collision_mask)) {
                continue;
            }
            
            // Calculate distance between bodies
            FixedVector3 delta = bodies_[j].position - bodies_[i].position;
            Fixed dist_sq = delta.length_squared();
            Fixed combined_radius = bodies_[i].radius + bodies_[j].radius;
            Fixed combined_radius_sq = combined_radius * combined_radius;
            
            // Bounds checking for extreme values
            const Fixed MAX_DISTANCE_SQ = Fixed::from_int(1000000); // 1000 units max distance
            const Fixed MIN_RADIUS = Fixed::from_float(0.001f); // Minimum reasonable radius
            
            if (dist_sq > MAX_DISTANCE_SQ || 
                bodies_[i].radius < MIN_RADIUS || 
                bodies_[j].radius < MIN_RADIUS) {
                continue; // Skip this collision pair
            }
            
            // Check for collision
            if (dist_sq < combined_radius_sq && dist_sq > Fixed::from_int(0)) {
                // Wake both bodies
                bodies_[i].wake();
                bodies_[j].wake();
                
                // Calculate collision normal
                Fixed dist = fixed_sqrt(dist_sq);
                FixedVector3 normal = delta.normalized();
                
                // Calculate overlap amount
                Fixed overlap = combined_radius - dist;
                
                // Separate bodies (proportional to inverse mass)
                Fixed total_inv_mass = bodies_[i].inverse_mass + bodies_[j].inverse_mass;
                if (total_inv_mass > Fixed::from_int(0)) {
                    Fixed ratio_i = bodies_[i].inverse_mass / total_inv_mass;
                    Fixed ratio_j = bodies_[j].inverse_mass / total_inv_mass;
                    
                    bodies_[i].position -= normal * overlap * ratio_i;
                    bodies_[j].position += normal * overlap * ratio_j;
                    
                    // Apply collision impulse (elastic collision)
                    FixedVector3 relative_velocity = bodies_[j].velocity - bodies_[i].velocity;
                    Fixed velocity_along_normal = relative_velocity.dot(normal);
                    
                    // Only resolve if bodies are moving towards each other
                    if (velocity_along_normal < Fixed::from_int(0)) {
                        // Restitution coefficient (0.5 = somewhat bouncy)
                        Fixed restitution = Fixed::from_float(0.5f);
                        Fixed impulse_magnitude = -(Fixed::from_int(1) + restitution) * velocity_along_normal / total_inv_mass;
                        
                        FixedVector3 impulse = normal * impulse_magnitude;
                        bodies_[i].velocity -= impulse * bodies_[i].inverse_mass;
                        bodies_[j].velocity += impulse * bodies_[j].inverse_mass;
                        collisions_resolved_++;

                        // Emit collision event for callbacks/telemetry
                        CollisionEvent ev{};
                        ev.bodyA = bodies_[i].id;
                        ev.bodyB = bodies_[j].id;
                        ev.nx = normal.x.to_float();
                        ev.ny = normal.y.to_float();
                        ev.nz = normal.z.to_float();
                        // Approximate contact point on surface of A along normal
                        FixedVector3 contact = bodies_[i].position + (normal * bodies_[i].radius);
                        ev.px = contact.x.to_float();
                        ev.py = contact.y.to_float();
                        ev.pz = contact.z.to_float();
                        ev.impulse = impulse_magnitude.to_float();
                        GetPhysicsEventQueue().push(ev);
                    }
                }
            }
        }
    }
    
    // Ground collisions generate events as well (optional)
    // Using sentinel 0xFFFFFFFF for ground id
    const uint32_t GROUND_ID = 0xFFFFFFFFu;
    for (auto &body : bodies_) {
        if (body.type == BodyType::Static) continue;
        if (body.type == BodyType::Dynamic && body.is_sleeping) continue;
        const Fixed GROUND_Y = Fixed::from_int(0);
        if (body.position.y - body.radius == GROUND_Y) {
            CollisionEvent ev{};
            ev.bodyA = body.id;
            ev.bodyB = GROUND_ID;
            ev.nx = 0.0f; ev.ny = 1.0f; ev.nz = 0.0f;
            ev.px = body.position.x.to_float();
            ev.py = (GROUND_Y + body.radius).to_float();
            ev.pz = body.position.z.to_float();
            ev.impulse = 0.0f; // Not computed here; can be extended later
            GetPhysicsEventQueue().push(ev);
        }
    }
}
}
