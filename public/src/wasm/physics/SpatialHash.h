#pragma once
#include <cstdint>
#include <unordered_map>
#include <vector>
#include "PhysicsTypes.h"

// Lightweight uniform grid spatial hash for broadphase pairing
class SpatialHash {
public:
    struct GridKey {
        int32_t x;
        int32_t y;
        bool operator==(const GridKey &o) const { return x == o.x && y == o.y; }
    };

    struct KeyHasher {
        size_t operator()(const GridKey &k) const noexcept {
            // Simple mix
            return (static_cast<uint32_t>(k.x) * 73856093u) ^ (static_cast<uint32_t>(k.y) * 19349663u);
        }
    };

    SpatialHash() : cellSize_(Fixed::from_float(0.2f)) {}

    void clear() { cells_.clear(); }

    void update(const std::vector<RigidBody> &bodies) {
        cells_.clear();
        // Insert dynamic and kinematic bodies; skip static
        for (const auto &b : bodies) {
            if (b.type == BodyType::Static) continue;
            GridKey key = toKey(b.position.x, b.position.y);
            auto &vec = cells_[key];
            vec.push_back(b.id);
        }
    }

    void getPotentialPairs(const std::vector<RigidBody> &bodies, std::vector<std::pair<uint32_t, uint32_t>> &outPairs) const {
        outPairs.clear();
        
        // Only check 4 neighbors (right, down, down-right, down-left) to avoid duplicates
        // Each pair is only generated once when the cell with the smaller key processes it
        static const int NEIGHBOR_OFF[4][2] = {{1,0}, {0,1}, {1,1}, {-1,1}};
        
        for (const auto &entry : cells_) {
            const GridKey &k = entry.first;
            const std::vector<uint32_t> &vec = entry.second;
            
            // Within-cell pairs (always checked)
            for (size_t i = 0; i < vec.size(); ++i) {
                for (size_t j = i + 1; j < vec.size(); ++j) {
                    uint32_t a = vec[i];
                    uint32_t b = vec[j];
                    if (a > b) {
                        std::swap(a, b);
                    }
                    outPairs.emplace_back(a, b);
                }
            }
            
            // Check only forward neighbors to avoid duplicate pairs
            for (int n = 0; n < 4; ++n) {
                GridKey nk{ k.x + NEIGHBOR_OFF[n][0], k.y + NEIGHBOR_OFF[n][1] };
                auto it = cells_.find(nk);
                if (it == cells_.end()) {
                    continue;
                }
                for (uint32_t a : vec) {
                    for (uint32_t b : it->second) {
                        // Canonical ordering to ensure consistent pair representation
                        if (a > b) {
                            outPairs.emplace_back(b, a);
                        } else {
                            outPairs.emplace_back(a, b);
                        }
                    }
                }
            }
        }
    }

private:
    GridKey toKey(Fixed fx, Fixed fy) const {
        const float cs = cellSize_.to_float();
        int32_t gx = static_cast<int32_t>(std::floor(fx.to_float() / cs));
        int32_t gy = static_cast<int32_t>(std::floor(fy.to_float() / cs));
        return {gx, gy};
    }

    Fixed cellSize_;
    std::unordered_map<GridKey, std::vector<uint32_t>, KeyHasher> cells_;
};


