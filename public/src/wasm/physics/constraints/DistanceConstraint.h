#pragma once
#include "../PhysicsTypes.h"

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
        if (constraints.empty() || iterations <= 0) return;
        for (int it = 0; it < iterations; ++it) {
            for (const auto& c : constraints) {
                RigidBody* a = find_body(bodies, c.bodyA);
                RigidBody* b = find_body(bodies, c.bodyB);
                if (!a || !b) continue;

                // World points (spheres → use centers for v1)
                FixedVector3 pa = a->position; // + c.localA (not used for spheres)
                FixedVector3 pb = b->position; // + c.localB
                FixedVector3 delta = pb - pa;
                Fixed distSq = delta.length_squared();
                if (distSq <= Fixed::from_int(0)) continue;
                Fixed dist = fixed_sqrt(distSq);
                Fixed target = c.restLength;
                // If rest length zero, use small epsilon to avoid div by zero
                Fixed diff = dist - target;
                if (diff == Fixed::from_int(0)) continue;

                FixedVector3 n = delta / dist; // normalized

                // Kinematic bodies get zero inverse mass contribution
                Fixed invMassA = (a->type == BodyType::Dynamic) ? a->inverse_mass : Fixed::from_int(0);
                Fixed invMassB = (b->type == BodyType::Dynamic) ? b->inverse_mass : Fixed::from_int(0);
                Fixed invMassSum = invMassA + invMassB;
                if (invMassSum <= Fixed::from_int(0)) continue;

                // Positional correction along n scaled by stiffness
                Fixed correctionMag = (diff * c.stiffness);
                Fixed ratioA = invMassA / invMassSum;
                Fixed ratioB = invMassB / invMassSum;

                // Move opposite directions to reduce error
                a->position += n * (correctionMag * ratioA * Fixed::from_int(-1));
                b->position += n * (correctionMag * ratioB);

                // Wake if moved
                if (ratioA > Fixed::from_int(0)) a->wake();
                if (ratioB > Fixed::from_int(0)) b->wake();
            }
        }
    }

private:
    static RigidBody* find_body(std::vector<RigidBody>& bodies, uint32_t id) {
        for (auto& body : bodies) {
            if (body.id == id) return &body;
        }
        return nullptr;
    }
};



