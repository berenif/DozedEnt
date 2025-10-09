#pragma once
#include <cstdint>

// Collision layers and mask helper utilities
namespace CollisionLayers {
    enum : uint32_t {
        None        = 0,
        Default     = 1u << 0,
        Player      = 1u << 1,
        Enemy       = 1u << 2,
        Environment = 1u << 3,
        Projectile  = 1u << 4,
        All         = 0xFFFFFFFFu
    };
}

inline bool shouldCollide(uint32_t aLayer, uint32_t aMask, uint32_t bLayer, uint32_t bMask) {
    return ((aMask & bLayer) != 0u) && ((bMask & aLayer) != 0u);
}


