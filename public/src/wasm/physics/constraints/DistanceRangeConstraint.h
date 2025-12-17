#pragma once
#include "../PhysicsTypes.h"
#include <unordered_map>

/**
 * DistanceRangeConstraint - maintains a distance between two bodies within [minLength, maxLength].
 * If a bound is zero/negative, it is ignored.
 */
struct DistanceRangeConstraint {
    uint32_t bodyA = 0;
    uint32_t bodyB = 0;
    Fixed minLength = Fixed::from_int(0); // 0 => no minimum
    Fixed maxLength = Fixed::from_int(0); // 0 => no maximum
    Fixed stiffness = Fixed::from_float(0.8f);
};

class RangeConstraintSolver {
public:
    static void solve(
        std::vector<RigidBody>& bodies,
        const std::vector<DistanceRangeConstraint>& constraints,
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
                    continue;
                }
                
                Fixed dist = fixed_sqrt(distSq);

                bool apply = false;
                Fixed target = dist;
                if (c.maxLength > Fixed::from_int(0) && dist > c.maxLength) {
                    target = c.maxLength;
                    apply = true;
                } else if (c.minLength > Fixed::from_int(0) && dist < c.minLength) {
                    target = c.minLength;
                    apply = true;
                }
                
                if (!apply) {
                    continue;
                }

                FixedVector3 n = delta / dist;

                Fixed invMassA = (a->type == BodyType::Dynamic) ? a->inverse_mass : Fixed::from_int(0);
                Fixed invMassB = (b->type == BodyType::Dynamic) ? b->inverse_mass : Fixed::from_int(0);
                Fixed invMassSum = invMassA + invMassB;
                
                if (invMassSum <= Fixed::from_int(0)) {
                    continue;
                }

                Fixed diff = dist - target;
                Fixed correctionMag = diff * c.stiffness;
                Fixed ratioA = invMassA / invMassSum;
                Fixed ratioB = invMassB / invMassSum;

                a->position -= n * (correctionMag * ratioA);
                b->position += n * (correctionMag * ratioB);

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





