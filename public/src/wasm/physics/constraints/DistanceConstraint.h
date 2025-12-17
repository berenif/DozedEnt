#pragma once
#include "../PhysicsTypes.h"
#include <unordered_map>

/**
 * DistanceConstraint - simple PBD-style distance constraint between two bodies
 * Corrects positions along the line connecting the two attachment points.
 */
struct DistanceConstraint {
    uint32_t bodyA = 0;
    uint32_t bodyB = 0;
    FixedVector3 localA = FixedVector3::zero();
    FixedVector3 localB = FixedVector3::zero();
    Fixed restLength = Fixed::from_int(0);
    Fixed stiffness = Fixed::from_float(0.8f); // 0..1

    DistanceConstraint() = default;
};

/**
 * ConstraintSolver - solves distance constraints in-place on PhysicsManager bodies
 */
class ConstraintSolver {
public:
    static void solve_distance_constraints(
        std::vector<RigidBody>& bodies,
        const std::vector<DistanceConstraint>& constraints,
        int iterations
    ) {
        if (constraints.empty() || iterations <= 0) {
            return;
        }
        
        // Build ID map for O(1) lookups during constraint solving
        std::unordered_map<uint32_t, size_t> id_to_index;
        for (size_t i = 0; i < bodies.size(); ++i) {
            id_to_index[bodies[i].id] = i;
        }
        
        for (int it = 0; it < iterations; ++it) {
            for (const auto& c : constraints) {
                auto itA = id_to_index.find(c.bodyA);
                auto itB = id_to_index.find(c.bodyB);
                if (itA == id_to_index.end() || itB == id_to_index.end()) {
                    continue;
                }
                
                RigidBody* a = &bodies[itA->second];
                RigidBody* b = &bodies[itB->second];

                FixedVector3 delta = b->position - a->position;
                Fixed distSq = delta.length_squared();
                
                // Handle near-zero distance
                if (distSq < Fixed::from_float(0.0001f)) {
                    // Push apart in arbitrary direction
                    a->position.x -= Fixed::from_float(0.005f);
                    b->position.x += Fixed::from_float(0.005f);
                    continue;
                }
                
                Fixed dist = fixed_sqrt(distSq);
                Fixed diff = dist - c.restLength;
                
                // Skip if already at rest length
                if (diff.abs() < Fixed::from_float(0.0001f)) {
                    continue;
                }

                FixedVector3 n = delta / dist;

                // Kinematic bodies get zero inverse mass contribution
                Fixed invMassA = (a->type == BodyType::Dynamic) ? a->inverse_mass : Fixed::from_int(0);
                Fixed invMassB = (b->type == BodyType::Dynamic) ? b->inverse_mass : Fixed::from_int(0);
                Fixed invMassSum = invMassA + invMassB;
                
                if (invMassSum <= Fixed::from_int(0)) {
                    continue;
                }

                // Positional correction along n scaled by stiffness
                Fixed correctionMag = diff * c.stiffness;
                Fixed ratioA = invMassA / invMassSum;
                Fixed ratioB = invMassB / invMassSum;

                // Move opposite directions to reduce error
                a->position -= n * (correctionMag * ratioA);
                b->position += n * (correctionMag * ratioB);

                // Wake if moved
                if (ratioA > Fixed::from_int(0)) {
                    a->wake();
                }
                if (ratioB > Fixed::from_int(0)) {
                    b->wake();
                }
            }
        }
    }
};





