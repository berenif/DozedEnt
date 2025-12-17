#pragma once
#include "PhysicsTypes.h"
#include "PhysicsEvents.h"
#include "CollisionLayers.h"

/**
 * CollisionResolver - Handles sphere-sphere collision resolution
 * 
 * Extracted from PhysicsManager to maintain single responsibility
 * and keep file sizes under 500 lines.
 */
class CollisionResolver {
public:
    struct CollisionResult {
        bool collided;
        uint32_t collisions_resolved;
    };
    
    /**
     * Resolve collision between two sphere bodies
     * Modifies body positions and velocities in-place
     * Returns true if collision occurred and was resolved
     */
    static bool resolve_sphere_collision(RigidBody& bodyA, RigidBody& bodyB) {
        FixedVector3 delta = bodyB.position - bodyA.position;
        Fixed dist_sq = delta.length_squared();
        Fixed combined_radius = bodyA.radius + bodyB.radius;
        Fixed combined_radius_sq = combined_radius * combined_radius;
        
        // Bounds checking for extreme values
        const Fixed MAX_DISTANCE_SQ = Fixed::from_int(1000000);
        const Fixed MIN_RADIUS = Fixed::from_float(0.001f);
        
        if (dist_sq > MAX_DISTANCE_SQ || 
            bodyA.radius < MIN_RADIUS || 
            bodyB.radius < MIN_RADIUS) {
            return false;
        }
        
        // Check for collision
        if (dist_sq >= combined_radius_sq || dist_sq <= Fixed::from_int(0)) {
            return false;
        }
        
        // Wake both bodies
        bodyA.wake();
        bodyB.wake();
        
        // Calculate collision normal
        Fixed dist = fixed_sqrt(dist_sq);
        FixedVector3 normal = delta.normalized();
        
        // Calculate overlap amount
        Fixed overlap = combined_radius - dist;
        
        // Add separation buffer to prevent bodies getting stuck
        Fixed mass_ratio = bodyA.mass / bodyB.mass;
        Fixed separation_buffer = Fixed::from_float(0.004f);
        // Increase buffer for similar mass objects (prevents wolf-wolf sticking)
        if (mass_ratio > Fixed::from_float(0.8f) && mass_ratio < Fixed::from_float(1.25f)) {
            separation_buffer = Fixed::from_float(0.008f);
        }
        Fixed total_separation = overlap + separation_buffer;
        
        // Separate bodies (proportional to inverse mass)
        Fixed total_inv_mass = bodyA.inverse_mass + bodyB.inverse_mass;
        if (total_inv_mass <= Fixed::from_int(0)) {
            return false;
        }
        
        Fixed ratio_a = bodyA.inverse_mass / total_inv_mass;
        Fixed ratio_b = bodyB.inverse_mass / total_inv_mass;
        
        bodyA.position -= normal * total_separation * ratio_a;
        bodyB.position += normal * total_separation * ratio_b;
        
        // Apply collision impulse
        FixedVector3 relative_velocity = bodyB.velocity - bodyA.velocity;
        Fixed velocity_along_normal = relative_velocity.dot(normal);
        
        // Only resolve if bodies are moving towards each other
        if (velocity_along_normal >= Fixed::from_int(0)) {
            return true; // Separated but no impulse needed
        }
        
        // Restitution coefficient - lower for similar mass collisions
        Fixed restitution = Fixed::from_float(0.15f);
        if (mass_ratio > Fixed::from_float(0.8f) && mass_ratio < Fixed::from_float(1.25f)) {
            restitution = Fixed::from_float(0.05f);
        }
        
        Fixed impulse_magnitude = -(Fixed::from_int(1) + restitution) * velocity_along_normal / total_inv_mass;
        FixedVector3 impulse = normal * impulse_magnitude;
        
        bodyA.velocity -= impulse * bodyA.inverse_mass;
        bodyB.velocity += impulse * bodyB.inverse_mass;
        
        // Emit collision event
        CollisionEvent ev{};
        ev.bodyA = bodyA.id;
        ev.bodyB = bodyB.id;
        ev.nx = normal.x.to_float();
        ev.ny = normal.y.to_float();
        ev.nz = normal.z.to_float();
        FixedVector3 contact = bodyA.position + (normal * bodyA.radius);
        ev.px = contact.x.to_float();
        ev.py = contact.y.to_float();
        ev.pz = contact.z.to_float();
        ev.impulse = impulse_magnitude.to_float();
        GetPhysicsEventQueue().push(ev);
        
        return true;
    }
    
    /**
     * Resolve ground collision for a single body
     * Returns true if ground collision occurred
     */
    static bool resolve_ground_collision(
        RigidBody& body,
        Fixed ground_y,
        Fixed restitution,
        Fixed friction
    ) {
        if (!body.should_collide()) {
            return false;
        }
        
        Fixed body_bottom = body.position.y - body.radius;
        
        // Check if body is below ground level
        if (body_bottom >= ground_y) {
            return false;
        }
        
        body.wake();
        
        // Move body above ground
        body.position.y = ground_y + body.radius;
        
        // Apply ground collision response only if moving downward
        if (body.velocity.y < Fixed::from_int(0)) {
            // Emit ground collision event
            const uint32_t GROUND_ID = 0xFFFFFFFFu;
            CollisionEvent ev{};
            ev.bodyA = body.id;
            ev.bodyB = GROUND_ID;
            ev.nx = 0.0f;
            ev.ny = 1.0f;
            ev.nz = 0.0f;
            ev.px = body.position.x.to_float();
            ev.py = (ground_y + body.radius).to_float();
            ev.pz = body.position.z.to_float();
            ev.impulse = (-body.velocity.y * body.mass).to_float();
            GetPhysicsEventQueue().push(ev);
            
            // Apply restitution (bounce)
            body.velocity.y *= -restitution;
            
            // Apply friction to horizontal velocity
            body.velocity.x *= friction;
            body.velocity.z *= friction;
            
            return true;
        }
        
        return false;
    }
};
