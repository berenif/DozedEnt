#include "PhysicsManager.h"
#include <algorithm>

PhysicsManager::PhysicsManager() 
    : next_body_id_(1)
    , tick_accumulator_(0)
    , last_step_time_ms_(0.0f)
{
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
    player_body.position = FixedVector3::from_floats(0.5f, 0.5f, 0.0f);
    player_body.mass = Fixed::from_int(70);
    player_body.inverse_mass = Fixed::from_float(1.0f / 70.0f);
    player_body.drag = Fixed::from_float(0.88f);  // Faster deceleration for responsive knockback
    player_body.radius = Fixed::from_float(0.5f);
    bodies_.push_back(player_body);
}

void PhysicsManager::reset() {
    bodies_.clear();
    tick_accumulator_ = 0;
    next_body_id_ = 1;
    
    // Recreate player body
    RigidBody player_body;
    player_body.id = 0;
    player_body.position = FixedVector3::from_floats(0.5f, 0.5f, 0.0f);
    player_body.mass = Fixed::from_int(70);
    player_body.inverse_mass = Fixed::from_float(1.0f / 70.0f);
    player_body.drag = Fixed::from_float(0.88f);  // Faster deceleration for responsive knockback
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
    // Simple sphere-sphere collision detection and response
    for (size_t i = 0; i < bodies_.size(); ++i) {
        if (!bodies_[i].should_simulate()) continue;
        
        for (size_t j = i + 1; j < bodies_.size(); ++j) {
            if (!bodies_[j].should_simulate()) continue;
            
            // Calculate distance between bodies
            FixedVector3 delta = bodies_[j].position - bodies_[i].position;
            Fixed dist_sq = delta.length_squared();
            Fixed combined_radius = bodies_[i].radius + bodies_[j].radius;
            Fixed combined_radius_sq = combined_radius * combined_radius;
            
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
                    }
                }
            }
        }
    }
}


