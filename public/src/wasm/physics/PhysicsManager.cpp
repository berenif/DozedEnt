#include "PhysicsManager.h"
#include <algorithm>
#include "CollisionLayers.h"
#include "CollisionResolver.h"
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
    body_id_to_index_.clear();
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
    body_id_to_index_[player_body.id] = bodies_.size();
    bodies_.push_back(player_body);
}

void PhysicsManager::reset() {
    bodies_.clear();
    body_id_to_index_.clear();
    distance_constraints_.clear();
    range_constraints_.clear();
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
    body_id_to_index_[player_body.id] = bodies_.size();
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
    // Solve constraints after collision resolution
    solve_constraints(4);
    
    // Update sleeping state for all bodies
    update_sleeping_bodies(config_.timestep_micros);
}

void PhysicsManager::integrate_forces(Fixed dt) {
    for (auto& body : bodies_) {
        if (!body.should_simulate()) {
            continue;
        }
        
        // For Kinematic bodies, skip gravity but still apply drag and integrate
        FixedVector3 total_accel = body.acceleration;
        if (body.type == BodyType::Dynamic) {
            total_accel += config_.gravity;
        }
        body.velocity += total_accel * dt;
        
        // Clear acceleration (forces are applied for one frame only)
        body.acceleration = FixedVector3::zero();
        
        // Apply drag (per-step damping)
        body.velocity *= body.drag;
        
        // Clamp velocity to prevent extreme speeds
        Fixed speed_sq = body.velocity.length_squared();
        Fixed max_speed_sq = config_.max_velocity * config_.max_velocity;
        
        if (speed_sq > max_speed_sq) {
            body.velocity = body.velocity.normalized() * config_.max_velocity;
        }
        
        // Stop very small velocities to allow sleeping
        Fixed min_velocity_threshold = Fixed::from_float(0.001f);
        if (speed_sq < min_velocity_threshold * min_velocity_threshold) {
            body.velocity = FixedVector3::zero();
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
    body_id_to_index_[new_body.id] = bodies_.size();
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
    wolf_body.drag = Fixed::from_float(0.80f);  // Higher drag to prevent sticking (was 0.85)
    wolf_body.radius = Fixed::from_float(radius);
    wolf_body.collision_layer = CollisionLayers::Enemy;
    wolf_body.collision_mask = CollisionLayers::Player | CollisionLayers::Enemy | CollisionLayers::Environment;
    wolf_body.velocity = FixedVector3::zero();
    wolf_body.acceleration = FixedVector3::zero();
    
    body_id_to_index_[wolf_body.id] = bodies_.size();
    bodies_.push_back(wolf_body);
    return wolf_body.id;
}

void PhysicsManager::destroy_body(uint32_t id) {
    // Remove any constraints referencing this body
    distance_constraints_.erase(
        std::remove_if(distance_constraints_.begin(), distance_constraints_.end(),
            [id](const DistanceConstraint& c) {
                return c.bodyA == id || c.bodyB == id;
            }),
        distance_constraints_.end()
    );
    
    range_constraints_.erase(
        std::remove_if(range_constraints_.begin(), range_constraints_.end(),
            [id](const DistanceRangeConstraint& c) {
                return c.bodyA == id || c.bodyB == id;
            }),
        range_constraints_.end()
    );
    
    // Find the body's index
    auto map_it = body_id_to_index_.find(id);
    if (map_it == body_id_to_index_.end()) {
        return;
    }
    
    size_t index = map_it->second;
    
    // If not the last element, swap with last and update index
    if (index < bodies_.size() - 1) {
        uint32_t last_id = bodies_.back().id;
        std::swap(bodies_[index], bodies_.back());
        body_id_to_index_[last_id] = index;
    }
    
    // Remove from map and vector
    body_id_to_index_.erase(id);
    bodies_.pop_back();
}

RigidBody* PhysicsManager::get_body(uint32_t id) {
    return find_body(id);
}

const RigidBody* PhysicsManager::get_body(uint32_t id) const {
    return find_body(id);
}

RigidBody* PhysicsManager::find_body(uint32_t id) {
    auto it = body_id_to_index_.find(id);
    if (it == body_id_to_index_.end()) {
        return nullptr;
    }
    return &bodies_[it->second];
}

const RigidBody* PhysicsManager::find_body(uint32_t id) const {
    auto it = body_id_to_index_.find(id);
    if (it == body_id_to_index_.end()) {
        return nullptr;
    }
    return &bodies_[it->second];
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

void PhysicsManager::resolve_sphere_collision(RigidBody& bodyA, RigidBody& bodyB) {
    if (CollisionResolver::resolve_sphere_collision(bodyA, bodyB)) {
        collisions_resolved_++;
    }
}

void PhysicsManager::detect_and_resolve_collisions() {
    pairs_checked_ = 0;
    collisions_resolved_ = 0;
    
    // Ground collision detection
    const Fixed GROUND_Y = Fixed::from_int(0);
    const Fixed GROUND_RESTITUTION = Fixed::from_float(0.3f);
    const Fixed GROUND_FRICTION = Fixed::from_float(0.7f);
    
    for (auto& body : bodies_) {
        CollisionResolver::resolve_ground_collision(
            body, GROUND_Y, GROUND_RESTITUTION, GROUND_FRICTION);
    }
    
    // Sphere-sphere collision detection
    if (use_broadphase_) {
        detect_collisions_broadphase();
    } else {
        detect_collisions_naive();
    }
}

void PhysicsManager::detect_collisions_broadphase() {
    if (!spatial_hash_) {
        spatial_hash_ = new SpatialHash();
    }
    spatial_hash_->update(bodies_);
    
    std::vector<std::pair<uint32_t, uint32_t>> potentialPairs;
    spatial_hash_->getPotentialPairs(bodies_, potentialPairs);
    
    for (const auto& pair : potentialPairs) {
        RigidBody* bodyA = find_body(pair.first);
        RigidBody* bodyB = find_body(pair.second);
        
        if (!bodyA || !bodyB) {
            continue;
        }
        if (!bodyA->should_collide() || !bodyB->should_collide()) {
            continue;
        }
        
        pairs_checked_++;
        
        if (!shouldCollide(bodyA->collision_layer, bodyA->collision_mask,
                          bodyB->collision_layer, bodyB->collision_mask)) {
            continue;
        }
        
        resolve_sphere_collision(*bodyA, *bodyB);
    }
}

void PhysicsManager::detect_collisions_naive() {
    for (size_t i = 0; i < bodies_.size(); ++i) {
        if (!bodies_[i].should_collide()) {
            continue;
        }
        
        for (size_t j = i + 1; j < bodies_.size(); ++j) {
            if (!bodies_[j].should_collide()) {
                continue;
            }
            
            pairs_checked_++;
            
            if (!shouldCollide(bodies_[i].collision_layer, bodies_[i].collision_mask,
                              bodies_[j].collision_layer, bodies_[j].collision_mask)) {
                continue;
            }
            
            resolve_sphere_collision(bodies_[i], bodies_[j]);
        }
    }
}

void PhysicsManager::solve_constraints(int iterations) {
    if (iterations <= 0) return;
    if (!distance_constraints_.empty()) {
        ConstraintSolver::solve_distance_constraints(bodies_, distance_constraints_, iterations);
    }
    if (!range_constraints_.empty()) {
        RangeConstraintSolver::solve(bodies_, range_constraints_, iterations);
    }
}
