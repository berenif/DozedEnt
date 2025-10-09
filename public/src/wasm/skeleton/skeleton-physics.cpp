#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>
#include <string>
#include <cmath>
#include <algorithm>
#include <memory>
#include <cstdint>

using namespace emscripten;

const float DEG2RAD = 3.14159265359f / 180.0f;
const float RAD2DEG = 180.0f / 3.14159265359f;
const float PI = 3.14159265359f;

// Fixed-point math constants for deterministic multiplayer
const int32_t FIXED_POINT_SCALE = 16;  // 16-bit fractional part
const int32_t FIXED_ONE = 1 << FIXED_POINT_SCALE;
const int32_t FIXED_HALF = FIXED_ONE >> 1;

// ============================================================================
// FIXED-POINT MATH FOR DETERMINISTIC MULTIPLAYER
// ============================================================================

struct FixedPoint {
    int32_t value;
    
    FixedPoint() : value(0) {}
    FixedPoint(int32_t v) : value(v) {}
    FixedPoint(float f) : value(static_cast<int32_t>(f * FIXED_ONE)) {}
    
    float toFloat() const { return static_cast<float>(value) / FIXED_ONE; }
    
    FixedPoint operator+(const FixedPoint& other) const { return FixedPoint(value + other.value); }
    FixedPoint operator-(const FixedPoint& other) const { return FixedPoint(value - other.value); }
    FixedPoint operator*(const FixedPoint& other) const { 
        return FixedPoint((static_cast<int64_t>(value) * other.value) >> FIXED_POINT_SCALE);
    }
    FixedPoint operator/(const FixedPoint& other) const {
        if (other.value == 0) return FixedPoint(0);
        return FixedPoint((static_cast<int64_t>(value) << FIXED_POINT_SCALE) / other.value);
    }
    
    bool operator>(const FixedPoint& other) const { return value > other.value; }
    bool operator<(const FixedPoint& other) const { return value < other.value; }
    bool operator>=(const FixedPoint& other) const { return value >= other.value; }
    bool operator<=(const FixedPoint& other) const { return value <= other.value; }
    bool operator==(const FixedPoint& other) const { return value == other.value; }
    
    FixedPoint abs() const { return FixedPoint(value < 0 ? -value : value); }
    FixedPoint clamp(const FixedPoint& min, const FixedPoint& max) const {
        if (value < min.value) return min;
        if (value > max.value) return max;
        return *this;
    }
};

// ============================================================================
// BALANCE STRATEGIES
// ============================================================================

enum class BalanceStrategy {
    ANKLE_ONLY,      // Small corrections via ankle torque
    HIP_ANKLE,       // Hip strategy + ankle strategy
    STEPPING,        // Recovery via foot repositioning
    ADAPTIVE         // Automatically switches based on disturbance magnitude
};

struct BalanceState {
    BalanceStrategy strategy;
    FixedPoint com_offset_x;
    FixedPoint com_offset_y;
    FixedPoint support_base_width;
    FixedPoint ankle_threshold;
    FixedPoint hip_threshold;
    FixedPoint step_threshold;
    bool left_foot_grounded;
    bool right_foot_grounded;
    FixedPoint balance_quality;  // 0-1, how well balanced
    
    BalanceState() 
        : strategy(BalanceStrategy::ADAPTIVE)
        , com_offset_x(0), com_offset_y(0)
        , support_base_width(FixedPoint(0.2f))  // 20cm typical stance width
        , ankle_threshold(FixedPoint(0.015f))  // 1.5cm
        , hip_threshold(FixedPoint(0.05f))     // 5cm
        , step_threshold(FixedPoint(0.1f))     // 10cm
        , left_foot_grounded(false)
        , right_foot_grounded(false)
        , balance_quality(FixedPoint(1.0f))
    {}
};

// ============================================================================
// FOOT CONTACT DETECTION
// ============================================================================

struct FootContact {
    bool heel_contact;
    bool midfoot_contact;
    bool toe_contact;
    FixedPoint contact_force;
    FixedPoint contact_normal_x;
    FixedPoint contact_normal_y;
    FixedPoint friction_coefficient;
    
    FootContact() 
        : heel_contact(false), midfoot_contact(false), toe_contact(false)
        , contact_force(0), contact_normal_x(0), contact_normal_y(0)
        , friction_coefficient(FixedPoint(0.7f))  // Typical shoe-ground friction
    {}
    
    bool isGrounded() const { return heel_contact || midfoot_contact || toe_contact; }
    FixedPoint getTotalContactArea() const {
        FixedPoint area(0);
        if (heel_contact) area = area + FixedPoint(0.01f);  // 10cm² heel
        if (midfoot_contact) area = area + FixedPoint(0.02f); // 20cm² midfoot
        if (toe_contact) area = area + FixedPoint(0.015f);   // 15cm² toe
        return area;
    }
};

// ============================================================================
// COLLISION DETECTION
// ============================================================================

struct CollisionInfo {
    bool has_collision;
    FixedPoint penetration_depth;
    Vector3 contact_point;
    Vector3 contact_normal;
    FixedPoint restitution;
    FixedPoint friction;
    
    CollisionInfo() 
        : has_collision(false), penetration_depth(0)
        , contact_point(0, 0, 0), contact_normal(0, 1, 0)
        , restitution(FixedPoint(0.3f)), friction(FixedPoint(0.7f))
    {}
};

// ============================================================================
// VECTOR3 - 3D Vector Math
// ============================================================================

struct Vector3 {
    float x, y, z;
    
    Vector3() : x(0), y(0), z(0) {}
    Vector3(float x, float y, float z) : x(x), y(y), z(z) {}
    
    Vector3 operator+(const Vector3& v) const {
        return Vector3(x + v.x, y + v.y, z + v.z);
    }
    
    Vector3 operator-(const Vector3& v) const {
        return Vector3(x - v.x, y - v.y, z - v.z);
    }
    
    Vector3 operator*(float s) const {
        return Vector3(x * s, y * s, z * s);
    }
    
    Vector3 operator/(float s) const {
        return Vector3(x / s, y / s, z / s);
    }
    
    void operator+=(const Vector3& v) {
        x += v.x; y += v.y; z += v.z;
    }
    
    void operator-=(const Vector3& v) {
        x -= v.x; y -= v.y; z -= v.z;
    }
    
    void operator*=(float s) {
        x *= s; y *= s; z *= s;
    }
    
    float dot(const Vector3& v) const {
        return x * v.x + y * v.y + z * v.z;
    }
    
    Vector3 cross(const Vector3& v) const {
        return Vector3(
            y * v.z - z * v.y,
            z * v.x - x * v.z,
            x * v.y - y * v.x
        );
    }
    
    float length() const {
        return std::sqrt(x * x + y * y + z * z);
    }
    
    float lengthSquared() const {
        return x * x + y * y + z * z;
    }
    
    Vector3 normalized() const {
        float len = length();
        if (len > 0.0001f) {
            return Vector3(x / len, y / len, z / len);
        }
        return Vector3(0, 1, 0);
    }
    
    void normalize() {
        float len = length();
        if (len > 0.0001f) {
            x /= len; y /= len; z /= len;
        }
    }
};

// ============================================================================
// QUATERNION - Rotation representation
// ============================================================================

struct Quaternion {
    float x, y, z, w;
    
    Quaternion() : x(0), y(0), z(0), w(1) {}
    Quaternion(float x, float y, float z, float w) : x(x), y(y), z(z), w(w) {}
    
    static Quaternion fromAxisAngle(const Vector3& axis, float angle) {
        float halfAngle = angle * 0.5f;
        float s = std::sin(halfAngle);
        Vector3 normAxis = axis.normalized();
        return Quaternion(
            normAxis.x * s,
            normAxis.y * s,
            normAxis.z * s,
            std::cos(halfAngle)
        );
    }
    
    static Quaternion fromEuler(float pitch, float yaw, float roll) {
        float cy = std::cos(yaw * 0.5f);
        float sy = std::sin(yaw * 0.5f);
        float cp = std::cos(pitch * 0.5f);
        float sp = std::sin(pitch * 0.5f);
        float cr = std::cos(roll * 0.5f);
        float sr = std::sin(roll * 0.5f);
        
        return Quaternion(
            sr * cp * cy - cr * sp * sy,
            cr * sp * cy + sr * cp * sy,
            cr * cp * sy - sr * sp * cy,
            cr * cp * cy + sr * sp * sy
        );
    }
    
    Quaternion operator*(const Quaternion& q) const {
        return Quaternion(
            w * q.x + x * q.w + y * q.z - z * q.y,
            w * q.y - x * q.z + y * q.w + z * q.x,
            w * q.z + x * q.y - y * q.x + z * q.w,
            w * q.w - x * q.x - y * q.y - z * q.z
        );
    }
    
    Vector3 rotate(const Vector3& v) const {
        Quaternion p(v.x, v.y, v.z, 0);
        Quaternion qConj(-x, -y, -z, w);
        Quaternion result = (*this) * p * qConj;
        return Vector3(result.x, result.y, result.z);
    }
    
    void normalize() {
        float len = std::sqrt(x*x + y*y + z*z + w*w);
        if (len > 0.0001f) {
            x /= len; y /= len; z /= len; w /= len;
        } else {
            x = 0; y = 0; z = 0; w = 1;
        }
    }
    
    Quaternion normalized() const {
        Quaternion result = *this;
        result.normalize();
        return result;
    }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

inline float clamp(float value, float minVal, float maxVal) {
    return std::max(minVal, std::min(value, maxVal));
}

inline float shortestAngle(float angle) {
    while (angle > PI) angle -= 2 * PI;
    while (angle < -PI) angle += 2 * PI;
    return angle;
}

inline float lerp(float a, float b, float t) {
    return a + (b - a) * t;
}

inline Vector3 quaternionToEuler(const Quaternion& q) {
    // Convert quaternion to Euler angles (XYZ order)
    float x = q.x, y = q.y, z = q.z, w = q.w;
    
    // Roll (x-axis rotation)
    float sinr_cosp = 2 * (w * x + y * z);
    float cosr_cosp = 1 - 2 * (x * x + y * y);
    float roll = std::atan2(sinr_cosp, cosr_cosp);
    
    // Pitch (y-axis rotation)
    float sinp = 2 * (w * y - z * x);
    float pitch;
    if (std::abs(sinp) >= 1) {
        pitch = std::copysign(PI / 2, sinp); // Use 90 degrees if out of range
    } else {
        pitch = std::asin(sinp);
    }
    
    // Yaw (z-axis rotation)
    float siny_cosp = 2 * (w * z + x * y);
    float cosy_cosp = 1 - 2 * (y * y + z * z);
    float yaw = std::atan2(siny_cosp, cosy_cosp);
    
    return Vector3(roll, pitch, yaw);
}

// ============================================================================
// BONE
// ============================================================================

class Bone {
public:
    std::string name;
    int parentIndex;
    std::vector<int> childIndices;
    
    // Rest pose (local to parent)
    Vector3 restPosition;
    float length;
    float radius;
    float mass;
    
    // Current state (world space)
    Vector3 position;
    Quaternion rotation;
    Vector3 velocity;
    Vector3 angularVelocity;
    
    // Local to parent
    Quaternion localRotation;
    
    // Computed inertia
    Vector3 inertia;
    
    // Enhanced features
    bool isFootBone;           // True for foot/ankle bones
    FootContact footContact;   // Foot contact information
    CollisionInfo collisionInfo; // Collision detection data
    FixedPoint fixedPositionX, fixedPositionY, fixedPositionZ; // Fixed-point position for determinism
    
    Bone(const std::string& name, int parentIndex, const Vector3& pos, 
         float length, float radius, float mass)
        : name(name), parentIndex(parentIndex), restPosition(pos),
          length(length), radius(radius), mass(mass),
          position(0, 0, 0), rotation(), velocity(0, 0, 0),
          angularVelocity(0, 0, 0), localRotation(),
          isFootBone(false), fixedPositionX(0), fixedPositionY(0), fixedPositionZ(0)
    {
        computeInertia();
        updateFixedPointPosition();
    }
    
    void computeInertia() {
        // Capsule inertia approximation
        float r = radius;
        float h = length;
        float m = mass;
        
        float Ixx = (1.0f/12.0f) * m * (3*r*r + h*h);
        float Iyy = Ixx;
        float Izz = (1.0f/2.0f) * m * r * r;
        
        inertia = Vector3(Ixx, Iyy, Izz);
    }
    
    void updateFixedPointPosition() {
        fixedPositionX = FixedPoint(position.x);
        fixedPositionY = FixedPoint(position.y);
        fixedPositionZ = FixedPoint(position.z);
    }
    
    void updateFromFixedPoint() {
        position.x = fixedPositionX.toFloat();
        position.y = fixedPositionY.toFloat();
        position.z = fixedPositionZ.toFloat();
    }
    
    bool checkGroundCollision(float groundY = 0.0f) {
        collisionInfo.has_collision = false;
        
        // Check if bone is below ground level
        if (position.y - radius < groundY) {
            collisionInfo.has_collision = true;
            collisionInfo.penetration_depth = FixedPoint(groundY - (position.y - radius));
            collisionInfo.contact_point = Vector3(position.x, groundY, position.z);
            collisionInfo.contact_normal = Vector3(0, 1, 0);
            return true;
        }
        return false;
    }
    
    void resolveGroundCollision(float groundY = 0.0f) {
        if (checkGroundCollision(groundY)) {
            // Move bone above ground
            position.y = groundY + radius;
            updateFixedPointPosition();
            
            // Apply collision response
            if (velocity.y < 0) {
                velocity.y *= -collisionInfo.restitution.toFloat();
                velocity.x *= collisionInfo.friction.toFloat();
                velocity.z *= collisionInfo.friction.toFloat();
            }
        }
    }
    
    void updateFootContact(float groundY = 0.0f) {
        if (!isFootBone) return;
        
        const float contactThreshold = 0.001f; // 1mm threshold
        
        // Check heel contact
        Vector3 heelPos = position + rotation.rotate(Vector3(-length * 0.3f, 0, 0));
        footContact.heel_contact = (heelPos.y <= groundY + contactThreshold);
        
        // Check midfoot contact
        Vector3 midfootPos = position + rotation.rotate(Vector3(0, 0, 0));
        footContact.midfoot_contact = (midfootPos.y <= groundY + contactThreshold);
        
        // Check toe contact
        Vector3 toePos = position + rotation.rotate(Vector3(length * 0.3f, 0, 0));
        footContact.toe_contact = (toePos.y <= groundY + contactThreshold);
        
        // Calculate contact force based on penetration
        if (footContact.isGrounded()) {
            float avgY = (heelPos.y + midfootPos.y + toePos.y) / 3.0f;
            float penetration = groundY - avgY;
            footContact.contact_force = FixedPoint(std::max(0.0f, penetration * mass * 9.81f));
        } else {
            footContact.contact_force = FixedPoint(0);
        }
    }
};

// ============================================================================
// JOINT
// ============================================================================

struct JointLimits {
    Vector3 min;
    Vector3 max;
    
    JointLimits() : min(-PI, -PI, -PI), max(PI, PI, PI) {}
    JointLimits(const Vector3& min, const Vector3& max) : min(min), max(max) {}
};

struct JointDrive {
    float stiffness;
    float damping;
    
    JointDrive() : stiffness(100.0f), damping(20.0f) {}
    JointDrive(float k, float d) : stiffness(k), damping(d) {}
};

enum class JointType {
    FREE6DOF,
    BALL,
    HINGE,
    TWIST,
    SWING_TWIST
};

class Joint {
public:
    std::string name;
    int parentBoneIndex;
    int childBoneIndex;
    JointType type;
    JointLimits limits;
    JointDrive drive;
    
    Vector3 currentAngles;
    Vector3 targetAngles;
    
    Joint(const std::string& name, int parentIdx, int childIdx, JointType type,
          const JointLimits& limits, const JointDrive& drive)
        : name(name), parentBoneIndex(parentIdx), childBoneIndex(childIdx),
          type(type), limits(limits), drive(drive),
          currentAngles(0, 0, 0), targetAngles(0, 0, 0)
    {}
    
    Vector3 computeTorque(Bone& bone, float globalStiffness, float globalDamping) {
        float k = drive.stiffness * globalStiffness;
        float d = drive.damping * globalDamping;
        
        // Update current angles from bone rotation
        // Convert quaternion to Euler angles (simplified)
        Vector3 boneEuler = quaternionToEuler(bone.localRotation);
        currentAngles = boneEuler;
        
        Vector3 error(
            shortestAngle(targetAngles.x - currentAngles.x),
            shortestAngle(targetAngles.y - currentAngles.y),
            shortestAngle(targetAngles.z - currentAngles.z)
        );
        
        // Apply limits
        currentAngles.x = clamp(currentAngles.x, limits.min.x, limits.max.x);
        currentAngles.y = clamp(currentAngles.y, limits.min.y, limits.max.y);
        currentAngles.z = clamp(currentAngles.z, limits.min.z, limits.max.z);
        
        // PD control
        Vector3 torque(
            k * error.x - d * bone.angularVelocity.x,
            k * error.y - d * bone.angularVelocity.y,
            k * error.z - d * bone.angularVelocity.z
        );
        
        return torque;
    }
};

// ============================================================================
// SKELETON
// ============================================================================

class Skeleton {
private:
    std::vector<std::shared_ptr<Bone>> bones;
    std::vector<std::shared_ptr<Joint>> joints;
    int rootBoneIndex;
    
    Vector3 gravity;
    bool physicsEnabled;
    bool gravityEnabled;
    float globalStiffness;
    float globalDamping;
    
    // Enhanced features
    BalanceState balanceState;
    float groundY;
    bool collisionDetectionEnabled;
    bool footContactDetectionEnabled;
    FixedPoint fixedGroundY;
    
public:
    Skeleton() 
        : rootBoneIndex(-1), gravity(0, -9.81f, 0),
          physicsEnabled(true), gravityEnabled(true),
          globalStiffness(1.0f), globalDamping(1.0f),
          groundY(0.0f), collisionDetectionEnabled(true),
          footContactDetectionEnabled(true), fixedGroundY(0)
    {}
    
    int addBone(const std::string& name, int parentIndex, 
                float px, float py, float pz,
                float length, float radius, float mass) {
        auto bone = std::make_shared<Bone>(
            name, parentIndex, Vector3(px, py, pz), length, radius, mass
        );
        
        // Mark foot bones for contact detection
        if (name.find("foot") != std::string::npos || 
            name.find("ankle") != std::string::npos ||
            name.find("toe") != std::string::npos) {
            bone->isFootBone = true;
        }
        
        int index = bones.size();
        bones.push_back(bone);
        
        if (parentIndex == -1) {
            rootBoneIndex = index;
        } else if (parentIndex >= 0 && parentIndex < bones.size()) {
            bones[parentIndex]->childIndices.push_back(index);
        }
        
        return index;
    }
    
    int addJoint(const std::string& name, int parentIdx, int childIdx,
                 int typeInt, 
                 float minX, float minY, float minZ,
                 float maxX, float maxY, float maxZ,
                 float stiffness, float damping) {
        JointType type = static_cast<JointType>(typeInt);
        JointLimits limits(Vector3(minX, minY, minZ), Vector3(maxX, maxY, maxZ));
        JointDrive drive(stiffness, damping);
        
        auto joint = std::make_shared<Joint>(name, parentIdx, childIdx, type, limits, drive);
        joints.push_back(joint);
        
        return joints.size() - 1;
    }
    
    void updateWorldTransform(int boneIndex) {
        if (boneIndex < 0 || boneIndex >= bones.size()) return;
        
        auto& bone = bones[boneIndex];
        
        if (bone->parentIndex >= 0) {
            auto& parent = bones[bone->parentIndex];
            
            // Transform position
            bone->position = parent->rotation.rotate(bone->restPosition);
            bone->position += parent->position;
            
            // Transform rotation
            bone->rotation = parent->rotation * bone->localRotation;
        } else {
            bone->position = bone->restPosition;
            bone->rotation = bone->localRotation;
        }
        
        bone->rotation.normalize();
        
        // Update children
        for (int childIdx : bone->childIndices) {
            updateWorldTransform(childIdx);
        }
    }
    
    void update(float dt) {
        if (!physicsEnabled) return;
        
        // Apply physics to each bone (except root)
        for (size_t i = 0; i < bones.size(); i++) {
            if (i == rootBoneIndex) continue;
            
            auto& bone = bones[i];
            
            // Apply gravity (with safety check for zero mass)
            if (gravityEnabled && bone->mass > 0.0001f) {
                Vector3 force = gravity * bone->mass;
                Vector3 accel = force / bone->mass;
                bone->velocity += accel * dt;
            }
            
            // Apply damping
            bone->velocity *= 0.98f;
            bone->angularVelocity *= 0.95f;
        }
        
        // Apply joint constraints
        for (auto& joint : joints) {
            if (joint->childBoneIndex < 0 || joint->childBoneIndex >= bones.size()) {
                continue;
            }
            
            auto& bone = bones[joint->childBoneIndex];
            Vector3 torque = joint->computeTorque(*bone, globalStiffness, globalDamping);
            
            // Apply torque (with safety check for zero inertia)
            Vector3 angAccel(
                bone->inertia.x > 0.0001f ? torque.x / bone->inertia.x : 0.0f,
                bone->inertia.y > 0.0001f ? torque.y / bone->inertia.y : 0.0f,
                bone->inertia.z > 0.0001f ? torque.z / bone->inertia.z : 0.0f
            );
            
            bone->angularVelocity += angAccel * dt;
            
            // Integrate angular velocity
            Vector3 deltaAngles = bone->angularVelocity * dt;
            
            Quaternion deltaRot = Quaternion::fromEuler(
                deltaAngles.x, deltaAngles.y, deltaAngles.z
            );
            
            bone->localRotation = bone->localRotation * deltaRot;
            bone->localRotation.normalize();
        }
        
        // Update all transforms
        if (rootBoneIndex >= 0) {
            updateWorldTransform(rootBoneIndex);
        }
        
        // Enhanced features
        if (collisionDetectionEnabled) {
            detectAndResolveCollisions();
        }
        
        if (footContactDetectionEnabled) {
            updateFootContacts();
        }
        
        // Apply balance strategies
        applyBalanceStrategies();
        
        // Update fixed-point positions for determinism
        updateFixedPointPositions();
    }
    
    Vector3 computeCenterOfMass() const {
        float totalMass = 0.0f;
        Vector3 com(0, 0, 0);
        
        for (const auto& bone : bones) {
            com += bone->position * bone->mass;
            totalMass += bone->mass;
        }
        
        if (totalMass > 0.0001f) {
            com = com / totalMass;
        }
        
        return com;
    }
    
    // Getters
    int getBoneCount() const { return bones.size(); }
    int getJointCount() const { return joints.size(); }
    
    // Bone access
    val getBonePosition(int index) const {
        if (index < 0 || index >= bones.size()) {
            return val::object();
        }
        auto& pos = bones[index]->position;
        
        val obj = val::object();
        obj.set("x", pos.x);
        obj.set("y", pos.y);
        obj.set("z", pos.z);
        return obj;
    }
    
    val getBoneRotation(int index) const {
        if (index < 0 || index >= bones.size()) {
            return val::object();
        }
        auto& rot = bones[index]->rotation;
        
        val obj = val::object();
        obj.set("x", rot.x);
        obj.set("y", rot.y);
        obj.set("z", rot.z);
        obj.set("w", rot.w);
        return obj;
    }
    
    std::string getBoneName(int index) const {
        if (index < 0 || index >= bones.size()) return "";
        return bones[index]->name;
    }
    
    float getBoneLength(int index) const {
        if (index < 0 || index >= bones.size()) return 0.0f;
        return bones[index]->length;
    }
    
    float getBoneRadius(int index) const {
        if (index < 0 || index >= bones.size()) return 0.0f;
        return bones[index]->radius;
    }
    
    // Joint access
    void setJointTargetAngles(int index, float x, float y, float z) {
        if (index >= 0 && index < joints.size()) {
            joints[index]->targetAngles = Vector3(x, y, z);
        }
    }
    
    // Bone rotation control
    void setBoneLocalRotation(int index, float x, float y, float z, float w) {
        if (index >= 0 && index < bones.size()) {
            bones[index]->localRotation = Quaternion(x, y, z, w);
            bones[index]->localRotation.normalize();
        }
    }
    
    val getJointTargetAngles(int index) const {
        val obj = val::object();
        if (index >= 0 && index < joints.size()) {
            auto& angles = joints[index]->targetAngles;
            obj.set("x", angles.x);
            obj.set("y", angles.y);
            obj.set("z", angles.z);
        }
        return obj;
    }
    
    std::string getJointName(int index) const {
        if (index < 0 || index >= joints.size()) return "";
        return joints[index]->name;
    }
    
    int getJointChildBoneIndex(int index) const {
        if (index < 0 || index >= joints.size()) return -1;
        return joints[index]->childBoneIndex;
    }
    
    // Physics settings
    void setPhysicsEnabled(bool enabled) { physicsEnabled = enabled; }
    void setGravityEnabled(bool enabled) { gravityEnabled = enabled; }
    void setGlobalStiffness(float value) { globalStiffness = value; }
    void setGlobalDamping(float value) { globalDamping = value; }
    
    bool getPhysicsEnabled() const { return physicsEnabled; }
    bool getGravityEnabled() const { return gravityEnabled; }
    float getGlobalStiffness() const { return globalStiffness; }
    float getGlobalDamping() const { return globalDamping; }
    
    // Enhanced feature methods
    void detectAndResolveCollisions() {
        for (auto& bone : bones) {
            bone->resolveGroundCollision(groundY);
        }
    }
    
    void updateFootContacts() {
        balanceState.left_foot_grounded = false;
        balanceState.right_foot_grounded = false;
        
        for (auto& bone : bones) {
            if (bone->isFootBone) {
                bone->updateFootContact(groundY);
                
                // Determine left/right foot based on position
                if (bone->position.x < 0) {
                    balanceState.left_foot_grounded = balanceState.left_foot_grounded || bone->footContact.isGrounded();
                } else {
                    balanceState.right_foot_grounded = balanceState.right_foot_grounded || bone->footContact.isGrounded();
                }
            }
        }
    }
    
    void applyBalanceStrategies() {
        if (!balanceState.left_foot_grounded && !balanceState.right_foot_grounded) {
            return; // Not grounded
        }
        
        // Calculate center of mass offset
        Vector3 com = computeCenterOfMass();
        FixedPoint comX = FixedPoint(com.x);
        FixedPoint comY = FixedPoint(com.y);
        
        // Calculate support base center
        FixedPoint supportCenterX = FixedPoint(0);
        int contactCount = 0;
        
        for (auto& bone : bones) {
            if (bone->isFootBone && bone->footContact.isGrounded()) {
                supportCenterX = supportCenterX + FixedPoint(bone->position.x);
                contactCount++;
            }
        }
        
        if (contactCount > 0) {
            supportCenterX = supportCenterX / FixedPoint(contactCount);
        }
        
        balanceState.com_offset_x = comX - supportCenterX;
        balanceState.com_offset_y = comY - FixedPoint(groundY);
        
        // Determine balance strategy based on disturbance magnitude
        FixedPoint disturbanceMagnitude = balanceState.com_offset_x.abs();
        
        if (disturbanceMagnitude < balanceState.ankle_threshold) {
            balanceState.strategy = BalanceStrategy::ANKLE_ONLY;
        } else if (disturbanceMagnitude < balanceState.hip_threshold) {
            balanceState.strategy = BalanceStrategy::HIP_ANKLE;
        } else if (disturbanceMagnitude < balanceState.step_threshold) {
            balanceState.strategy = BalanceStrategy::STEPPING;
        } else {
            balanceState.strategy = BalanceStrategy::STEPPING; // Emergency stepping
        }
        
        // Apply selected strategy
        switch (balanceState.strategy) {
            case BalanceStrategy::ANKLE_ONLY:
                applyAnkleStrategy();
                break;
            case BalanceStrategy::HIP_ANKLE:
                applyAnkleStrategy();
                applyHipStrategy();
                break;
            case BalanceStrategy::STEPPING:
                applyAnkleStrategy();
                applyHipStrategy();
                applySteppingStrategy();
                break;
            case BalanceStrategy::ADAPTIVE:
                // Already determined above
                break;
        }
        
        // Calculate balance quality
        FixedPoint maxAcceptableOffset = balanceState.support_base_width * FixedPoint(0.5f);
        FixedPoint quality = FixedPoint(1.0f) - (disturbanceMagnitude / maxAcceptableOffset);
        balanceState.balance_quality = quality.clamp(FixedPoint(0), FixedPoint(1.0f));
    }
    
    void applyAnkleStrategy() {
        // Apply ankle corrections to foot bones
        for (auto& bone : bones) {
            if (bone->isFootBone && bone->footContact.isGrounded()) {
                FixedPoint ankleCorrection = -balanceState.com_offset_x * FixedPoint(0.3f);
                
                // Apply correction as rotation
                Vector3 correctionVector(ankleCorrection.toFloat(), 0, 0);
                Quaternion correctionRot = Quaternion::fromAxisAngle(Vector3(0, 0, 1), ankleCorrection.toFloat() * 0.1f);
                bone->localRotation = bone->localRotation * correctionRot;
                bone->localRotation.normalize();
            }
        }
    }
    
    void applyHipStrategy() {
        // Apply hip strategy to pelvis and spine
        FixedPoint hipCorrection = -balanceState.com_offset_x * FixedPoint(0.5f);
        
        for (auto& bone : bones) {
            if (bone->name.find("pelvis") != std::string::npos ||
                bone->name.find("spine") != std::string::npos) {
                
                // Apply correction as rotation
                Vector3 correctionVector(hipCorrection.toFloat(), 0, 0);
                Quaternion correctionRot = Quaternion::fromAxisAngle(Vector3(0, 0, 1), hipCorrection.toFloat() * 0.05f);
                bone->localRotation = bone->localRotation * correctionRot;
                bone->localRotation.normalize();
            }
        }
    }
    
    void applySteppingStrategy() {
        // Apply stepping corrections
        FixedPoint stepCorrection = -balanceState.com_offset_x * FixedPoint(0.2f);
        
        for (auto& bone : bones) {
            if (bone->isFootBone && bone->footContact.isGrounded()) {
                // Move foot in direction of correction
                bone->position.x += stepCorrection.toFloat() * 0.1f;
                bone->updateFixedPointPosition();
            }
        }
    }
    
    void updateFixedPointPositions() {
        for (auto& bone : bones) {
            bone->updateFixedPointPosition();
        }
    }
    
    // Balance state getters
    val getBalanceState() const {
        val obj = val::object();
        obj.set("strategy", static_cast<int>(balanceState.strategy));
        obj.set("com_offset_x", balanceState.com_offset_x.toFloat());
        obj.set("com_offset_y", balanceState.com_offset_y.toFloat());
        obj.set("left_foot_grounded", balanceState.left_foot_grounded);
        obj.set("right_foot_grounded", balanceState.right_foot_grounded);
        obj.set("balance_quality", balanceState.balance_quality.toFloat());
        return obj;
    }
    
    // Collision detection controls
    void setCollisionDetectionEnabled(bool enabled) { collisionDetectionEnabled = enabled; }
    void setFootContactDetectionEnabled(bool enabled) { footContactDetectionEnabled = enabled; }
    void setGroundY(float y) { groundY = y; fixedGroundY = FixedPoint(y); }
    
    bool getCollisionDetectionEnabled() const { return collisionDetectionEnabled; }
    bool getFootContactDetectionEnabled() const { return footContactDetectionEnabled; }
    float getGroundY() const { return groundY; }
};

// ============================================================================
// IK SOLVER
// ============================================================================

class IKSolver {
public:
    static void solveTwoBone(Skeleton& skeleton, 
                            int rootBoneIdx, int midBoneIdx, int endBoneIdx,
                            float targetX, float targetY, float targetZ,
                            float poleX, float poleY, float poleZ) {
        // Two-bone IK implementation using CCD (Cyclic Coordinate Descent)
        if (rootBoneIdx < 0 || midBoneIdx < 0 || endBoneIdx < 0) return;
        if (rootBoneIdx >= skeleton.getBoneCount() || 
            midBoneIdx >= skeleton.getBoneCount() || 
            endBoneIdx >= skeleton.getBoneCount()) return;
        
        Vector3 target(targetX, targetY, targetZ);
        Vector3 pole(poleX, poleY, poleZ);
        
        // Get current bone positions
        Vector3 rootPos = skeleton.getBonePosition(rootBoneIdx);
        Vector3 midPos = skeleton.getBonePosition(midBoneIdx);
        Vector3 endPos = skeleton.getBonePosition(endBoneIdx);
        
        // Calculate bone lengths
        float rootToMidLength = (midPos - rootPos).length();
        float midToEndLength = (endPos - midPos).length();
        
        // Check if target is reachable
        float maxReach = rootToMidLength + midToEndLength;
        float targetDistance = (target - rootPos).length();
        
        if (targetDistance > maxReach) {
            // Target is too far, extend toward target
            Vector3 direction = (target - rootPos).normalized();
            Vector3 newMidPos = rootPos + direction * rootToMidLength;
            Vector3 newEndPos = newMidPos + direction * midToEndLength;
            
            // Apply rotations to achieve these positions
            applyRotationToBone(skeleton, rootBoneIdx, rootPos, newMidPos);
            applyRotationToBone(skeleton, midBoneIdx, newMidPos, newEndPos);
        } else if (targetDistance < std::abs(rootToMidLength - midToEndLength)) {
            // Target is too close, collapse bones
            Vector3 direction = (target - rootPos).normalized();
            Vector3 newMidPos = rootPos + direction * rootToMidLength;
            Vector3 newEndPos = target;
            
            applyRotationToBone(skeleton, rootBoneIdx, rootPos, newMidPos);
            applyRotationToBone(skeleton, midBoneIdx, newMidPos, newEndPos);
        } else {
            // Target is reachable, use law of cosines (with safety checks)
            float denominator1 = 2.0f * rootToMidLength * targetDistance;
            float denominator2 = 2.0f * rootToMidLength * midToEndLength;
            
            if (denominator1 < 0.0001f || denominator2 < 0.0001f) return;
            
            float cosAngle1 = (rootToMidLength * rootToMidLength + targetDistance * targetDistance - 
                              midToEndLength * midToEndLength) / denominator1;
            float cosAngle2 = (rootToMidLength * rootToMidLength + midToEndLength * midToEndLength - 
                              targetDistance * targetDistance) / denominator2;
            
            // Clamp to valid range
            cosAngle1 = clamp(cosAngle1, -1.0f, 1.0f);
            cosAngle2 = clamp(cosAngle2, -1.0f, 1.0f);
            
            float angle1 = std::acos(cosAngle1);
            float angle2 = std::acos(cosAngle2);
            
            // Calculate new positions
            Vector3 direction = (target - rootPos).normalized();
            Vector3 newMidPos = rootPos + direction * rootToMidLength;
            
            // Apply pole vector constraint for elbow/knee direction
            Vector3 poleDirection = (pole - rootPos).normalized();
            Vector3 elbowDirection = poleDirection.cross(direction).normalized();
            if (elbowDirection.length() < 0.1f) {
                elbowDirection = Vector3(0, 1, 0); // Fallback
            }
            
            Vector3 newEndPos = newMidPos + elbowDirection * midToEndLength;
            
            // Ensure end effector reaches target
            Vector3 finalDirection = (target - newMidPos).normalized();
            newEndPos = newMidPos + finalDirection * midToEndLength;
            
            // Apply rotations
            applyRotationToBone(skeleton, rootBoneIdx, rootPos, newMidPos);
            applyRotationToBone(skeleton, midBoneIdx, newMidPos, newEndPos);
        }
    }
    
private:
    static void applyRotationToBone(Skeleton& skeleton, int boneIdx, 
                                   const Vector3& fromPos, const Vector3& toPos) {
        // Calculate rotation needed to point bone from fromPos to toPos
        Vector3 currentDirection = skeleton.getBoneRotation(boneIdx).rotate(Vector3(0, 1, 0));
        Vector3 targetDirection = (toPos - fromPos).normalized();
        
        if (currentDirection.length() < 0.1f || targetDirection.length() < 0.1f) return;
        
        // Calculate rotation axis and angle
        Vector3 rotationAxis = currentDirection.cross(targetDirection).normalized();
        float cosAngle = currentDirection.dot(targetDirection);
        cosAngle = clamp(cosAngle, -1.0f, 1.0f);
        float angle = std::acos(cosAngle);
        
        if (rotationAxis.length() < 0.1f) return; // Already aligned
        
        // Apply rotation
        Quaternion rotation = Quaternion::fromAxisAngle(rotationAxis, angle);
        skeleton.setBoneLocalRotation(boneIdx, rotation.x, rotation.y, rotation.z, rotation.w);
    }
};

// ============================================================================
// EMSCRIPTEN BINDINGS
// ============================================================================

EMSCRIPTEN_BINDINGS(skeleton_physics) {
    // Vector3
    value_object<Vector3>("Vector3")
        .field("x", &Vector3::x)
        .field("y", &Vector3::y)
        .field("z", &Vector3::z);
    
    // Quaternion
    value_object<Quaternion>("Quaternion")
        .field("x", &Quaternion::x)
        .field("y", &Quaternion::y)
        .field("z", &Quaternion::z)
        .field("w", &Quaternion::w);
    
    // FixedPoint
    value_object<FixedPoint>("FixedPoint")
        .field("value", &FixedPoint::value);
    
    // JointType enum
    enum_<JointType>("JointType")
        .value("FREE6DOF", JointType::FREE6DOF)
        .value("BALL", JointType::BALL)
        .value("HINGE", JointType::HINGE)
        .value("TWIST", JointType::TWIST)
        .value("SWING_TWIST", JointType::SWING_TWIST);
    
    // BalanceStrategy enum
    enum_<BalanceStrategy>("BalanceStrategy")
        .value("ANKLE_ONLY", BalanceStrategy::ANKLE_ONLY)
        .value("HIP_ANKLE", BalanceStrategy::HIP_ANKLE)
        .value("STEPPING", BalanceStrategy::STEPPING)
        .value("ADAPTIVE", BalanceStrategy::ADAPTIVE);
    
    // Skeleton class
    class_<Skeleton>("Skeleton")
        .constructor<>()
        .function("addBone", &Skeleton::addBone)
        .function("addJoint", &Skeleton::addJoint)
        .function("update", &Skeleton::update)
        .function("computeCenterOfMass", &Skeleton::computeCenterOfMass)
        .function("getBoneCount", &Skeleton::getBoneCount)
        .function("getJointCount", &Skeleton::getJointCount)
        .function("getBonePosition", &Skeleton::getBonePosition)
        .function("getBoneRotation", &Skeleton::getBoneRotation)
        .function("getBoneName", &Skeleton::getBoneName)
        .function("getBoneLength", &Skeleton::getBoneLength)
        .function("getBoneRadius", &Skeleton::getBoneRadius)
        .function("setJointTargetAngles", &Skeleton::setJointTargetAngles)
        .function("getJointTargetAngles", &Skeleton::getJointTargetAngles)
        .function("getJointName", &Skeleton::getJointName)
        .function("getJointChildBoneIndex", &Skeleton::getJointChildBoneIndex)
        .function("setBoneLocalRotation", &Skeleton::setBoneLocalRotation)
        .function("setPhysicsEnabled", &Skeleton::setPhysicsEnabled)
        .function("setGravityEnabled", &Skeleton::setGravityEnabled)
        .function("setGlobalStiffness", &Skeleton::setGlobalStiffness)
        .function("setGlobalDamping", &Skeleton::setGlobalDamping)
        .function("getPhysicsEnabled", &Skeleton::getPhysicsEnabled)
        .function("getGravityEnabled", &Skeleton::getGravityEnabled)
        .function("getGlobalStiffness", &Skeleton::getGlobalStiffness)
        .function("getGlobalDamping", &Skeleton::getGlobalDamping)
        // Enhanced features
        .function("getBalanceState", &Skeleton::getBalanceState)
        .function("setCollisionDetectionEnabled", &Skeleton::setCollisionDetectionEnabled)
        .function("setFootContactDetectionEnabled", &Skeleton::setFootContactDetectionEnabled)
        .function("setGroundY", &Skeleton::setGroundY)
        .function("getCollisionDetectionEnabled", &Skeleton::getCollisionDetectionEnabled)
        .function("getFootContactDetectionEnabled", &Skeleton::getFootContactDetectionEnabled)
        .function("getGroundY", &Skeleton::getGroundY);
    
    // IKSolver class
    class_<IKSolver>("IKSolver")
        .class_function("solveTwoBone", &IKSolver::solveTwoBone);
}
