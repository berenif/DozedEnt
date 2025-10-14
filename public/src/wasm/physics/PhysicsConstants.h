#pragma once

#include <cstdint>
#include "PhysicsTypes.h"

namespace PhysicsConstants {
    constexpr std::uint32_t kPlayerBodyId = 0;
}

namespace CoordinateSpace {
    inline float clamp01(float value) {
        if (value < 0.0f) {
            return 0.0f;
        }
        if (value > 1.0f) {
            return 1.0f;
        }
        return value;
    }

    inline float convertToNormalized(float value, float minValue, float maxValue) {
        const float span = maxValue - minValue;
        if (span <= 0.0f) {
            return 0.0f;
        }
        return (value - minValue) / span;
    }

    inline float convertToPhysics(float normalized, float minValue, float maxValue) {
        const float span = maxValue - minValue;
        return minValue + clamp01(normalized) * span;
    }

    inline float physicsToNormalizedX(const PhysicsConfig& config, float physicsX) {
        return convertToNormalized(
            physicsX,
            config.world_min_x.to_float(),
            config.world_max_x.to_float()
        );
    }

    inline float physicsToNormalizedY(const PhysicsConfig& config, float physicsY) {
        return convertToNormalized(
            physicsY,
            config.world_min_y.to_float(),
            config.world_max_y.to_float()
        );
    }

    inline FixedVector3 normalizedToPhysics(
        const PhysicsConfig& config,
        float normalizedX,
        float normalizedY,
        float normalizedZ = 0.0f
    ) {
        const float physicsX = convertToPhysics(
            normalizedX,
            config.world_min_x.to_float(),
            config.world_max_x.to_float()
        );
        const float physicsY = convertToPhysics(
            normalizedY,
            config.world_min_y.to_float(),
            config.world_max_y.to_float()
        );
        return FixedVector3::from_floats(physicsX, physicsY, normalizedZ);
    }
}
