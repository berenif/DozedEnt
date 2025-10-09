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

    void apply(std::vector<RigidBody> &bodies, Fixed dt) const {
        for (auto &b : bodies) {
            if (!b.should_simulate()) continue;
            for (const auto &f : fields_) {
                switch (f.type) {
                    case ForceFieldType::RadialAttract: {
                        FixedVector3 d = f.position - b.position;
                        Fixed distSq = d.length_squared();
                        if (distSq > Fixed::from_int(0)) {
                            FixedVector3 n = d.normalized();
                            Fixed invFalloff = Fixed::from_float(1.0f); // simple constant falloff
                            b.acceleration += n * (f.strength * invFalloff) * b.inverse_mass;
                        }
                        break;
                    }
                    case ForceFieldType::RadialRepel: {
                        FixedVector3 d = b.position - f.position;
                        Fixed distSq = d.length_squared();
                        if (distSq > Fixed::from_int(0)) {
                            FixedVector3 n = d.normalized();
                            Fixed invFalloff = Fixed::from_float(1.0f);
                            b.acceleration += n * (f.strength * invFalloff) * b.inverse_mass;
                        }
                        break;
                    }
                    case ForceFieldType::DirectionalWind: {
                        FixedVector3 n = f.direction.normalized();
                        b.acceleration += n * (f.strength) * b.inverse_mass;
                        break;
                    }
                }
            }
        }
    }

private:
    std::vector<ForceField> fields_;
};


