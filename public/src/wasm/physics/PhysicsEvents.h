#pragma once
#include <cstdint>

// Forward declare for data layout stability: use plain floats here for JS interop
struct CollisionEvent {
    uint32_t bodyA;    // 0xFFFFFFFF for ground
    uint32_t bodyB;    // 0xFFFFFFFF for ground
    float nx, ny, nz;  // collision normal
    float px, py, pz;  // contact point (approx)
    float impulse;     // scalar impulse magnitude
};

class PhysicsEventQueue {
public:
    static constexpr int CAPACITY = 256;

    PhysicsEventQueue() : count_(0) {}

    void clear() { count_ = 0; }

    void push(const CollisionEvent &e) {
        // Overwrite oldest when full to avoid unbounded growth
        if (count_ < CAPACITY) {
            buffer_[count_] = e;
            count_++;
        } else {
            // Shift down by one; O(n) but small CAPACITY and only on overflow
            for (int i = 1; i < CAPACITY; i++) {
                buffer_[i - 1] = buffer_[i];
            }
            buffer_[CAPACITY - 1] = e;
        }
    }

    const CollisionEvent *data() const { return buffer_; }
    int count() const { return count_; }

private:
    CollisionEvent buffer_[CAPACITY];
    int count_;
};

// Provide a single instance accessible across the physics system
inline PhysicsEventQueue &GetPhysicsEventQueue() {
    static PhysicsEventQueue queue;
    return queue;
}


