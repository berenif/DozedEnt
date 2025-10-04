#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>
#include <string>
#include <cmath>
#include <algorithm>
#include <memory>

using namespace emscripten;

const float DEG2RAD = 3.14159265359f / 180.0f;
const float RAD2DEG = 180.0f / 3.14159265359f;
const float PI = 3.14159265359f;

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
    
    Bone(const std::string& name, int parentIndex, const Vector3& pos, 
         float length, float radius, float mass)
        : name(name), parentIndex(parentIndex), restPosition(pos),
          length(length), radius(radius), mass(mass),
          position(0, 0, 0), rotation(), velocity(0, 0, 0),
          angularVelocity(0, 0, 0), localRotation()
    {
        computeInertia();
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
    
public:
    Skeleton() 
        : rootBoneIndex(-1), gravity(0, -9.81f, 0),
          physicsEnabled(true), gravityEnabled(true),
          globalStiffness(1.0f), globalDamping(1.0f)
    {}
    
    int addBone(const std::string& name, int parentIndex, 
                float px, float py, float pz,
                float length, float radius, float mass) {
        auto bone = std::make_shared<Bone>(
            name, parentIndex, Vector3(px, py, pz), length, radius, mass
        );
        
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
            
            // Apply gravity
            if (gravityEnabled) {
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
            
            // Apply torque
            Vector3 angAccel(
                torque.x / bone->inertia.x,
                torque.y / bone->inertia.y,
                torque.z / bone->inertia.z
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
        // Two-bone IK implementation
        // This is a placeholder - full implementation would require more complex math
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
    
    // JointType enum
    enum_<JointType>("JointType")
        .value("FREE6DOF", JointType::FREE6DOF)
        .value("BALL", JointType::BALL)
        .value("HINGE", JointType::HINGE)
        .value("TWIST", JointType::TWIST)
        .value("SWING_TWIST", JointType::SWING_TWIST);
    
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
        .function("setPhysicsEnabled", &Skeleton::setPhysicsEnabled)
        .function("setGravityEnabled", &Skeleton::setGravityEnabled)
        .function("setGlobalStiffness", &Skeleton::setGlobalStiffness)
        .function("setGlobalDamping", &Skeleton::setGlobalDamping)
        .function("getPhysicsEnabled", &Skeleton::getPhysicsEnabled)
        .function("getGravityEnabled", &Skeleton::getGravityEnabled)
        .function("getGlobalStiffness", &Skeleton::getGlobalStiffness)
        .function("getGlobalDamping", &Skeleton::getGlobalDamping);
    
    // IKSolver class
    class_<IKSolver>("IKSolver")
        .class_function("solveTwoBone", &IKSolver::solveTwoBone);
}
