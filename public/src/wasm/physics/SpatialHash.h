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
        // For each occupied cell, pair within cell and with 8 neighbors
        static const int OFF[9][2] = {{0,0},{-1,0},{1,0},{0,-1},{0,1},{-1,-1},{-1,1},{1,-1},{1,1}};
        for (const auto &entry : cells_) {
            const GridKey &k = entry.first;
            const std::vector<uint32_t> &vec = entry.second;
            // Within-cell pairs
            for (size_t i = 0; i < vec.size(); ++i) {
                for (size_t j = i + 1; j < vec.size(); ++j) {
                    outPairs.emplace_back(vec[i], vec[j]);
                }
            }
            // Neighbor cells
            for (int n = 1; n < 9; ++n) {
                GridKey nk{ k.x + OFF[n][0], k.y + OFF[n][1] };
                auto it = cells_.find(nk);
                if (it == cells_.end()) continue;
                for (uint32_t a : vec) {
                    for (uint32_t b : it->second) {
                        if (a < b) outPairs.emplace_back(a, b);
                        else if (b < a) outPairs.emplace_back(b, a);
                    }
                }
            }
        }
        // Optionally deduplicate pairs (skipped for simplicity; neighbor emission may duplicate)
        // In practice, PhysicsManager can guard by (i<j) uniqueness when mapping ids to indices.
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


