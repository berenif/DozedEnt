#pragma once
#include <vector>
#include "PhysicsTypes.h"

enum class ForceFieldType {
    RadialAttract = 0,
    RadialRepel = 1,
    DirectionalWind = 2
};

struct ForceField {
    ForceFieldType type;
    FixedVector3 position;
    FixedVector3 direction; // for wind
    Fixed radius;
    Fixed strength;
};

class ForceFieldManager {
public:
    void clear() { fields_.clear(); }
    void add(const ForceField &f) { fields_.push_back(f); }

    void apply(std::vector<RigidBody> &bodies, Fixed /* dt */) const {
        for (auto &b : bodies) {
            // Force fields only affect dynamic bodies with non-zero inverse mass
            if (b.type != BodyType::Dynamic || b.is_sleeping) {
                continue;
            }
            if (b.inverse_mass <= Fixed::from_int(0)) {
                continue;
            }
            
            for (const auto &f : fields_) {
                switch (f.type) {
                    case ForceFieldType::RadialAttract: {
                        FixedVector3 d = f.position - b.position;
                        Fixed distSq = d.length_squared();
                        // Apply inverse square falloff for realistic behavior
                        if (distSq > Fixed::from_float(0.01f)) {
                            FixedVector3 n = d.normalized();
                            Fixed falloff = Fixed::from_int(1) / distSq;
                            // Clamp falloff to prevent extreme forces at close range
                            falloff = Fixed::min(falloff, Fixed::from_float(100.0f));
                            b.acceleration += n * (f.strength * falloff) * b.inverse_mass;
                        }
                        break;
                    }
                    case ForceFieldType::RadialRepel: {
                        FixedVector3 d = b.position - f.position;
                        Fixed distSq = d.length_squared();
                        // Apply inverse square falloff for realistic behavior
                        if (distSq > Fixed::from_float(0.01f)) {
                            FixedVector3 n = d.normalized();
                            Fixed falloff = Fixed::from_int(1) / distSq;
                            // Clamp falloff to prevent extreme forces at close range
                            falloff = Fixed::min(falloff, Fixed::from_float(100.0f));
                            b.acceleration += n * (f.strength * falloff) * b.inverse_mass;
                        }
                        break;
                    }
                    case ForceFieldType::DirectionalWind: {
                        FixedVector3 n = f.direction.normalized();
                        if (!n.is_zero()) {
                            b.acceleration += n * f.strength * b.inverse_mass;
                        }
                        break;
                    }
                }
            }
        }
    }

private:
    std::vector<ForceField> fields_;
};


