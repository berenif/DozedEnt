#include "ArmManager.h"
#include "../physics/PhysicsManager.h"
#include "PlayerManager.h"

ArmManager::ArmManager() {}

void ArmManager::initialize(PhysicsManager* physics, PlayerManager* player) {
    physics_ = physics;
    player_ = player;
    ensure_created();
}

void ArmManager::ensure_created() {
    if (!physics_ || !player_) return;
    if (left_.hand != 0 && right_.hand != 0) return; // already
    // Create left and right arms
    create_arm(left_, -1.0f);
    create_arm(right_, 1.0f);
}

void ArmManager::create_arm(ArmChainIds& arm, float side_sign) {
    // Anchor near player chest
    const float px = player_->get_x();
    const float py = player_->get_y();
    const float shoulder_offset_x = 0.03f * side_sign;
    const float shoulder_offset_y = 0.05f;

    RigidBody anchor;
    anchor.id = 0;
    anchor.type = BodyType::Kinematic;
    anchor.position = FixedVector3::from_floats(px + shoulder_offset_x, py + shoulder_offset_y, 0.0f);
    anchor.radius = Fixed::from_float(0.015f);
    anchor.collision_layer = CollisionLayers::Player;
    anchor.collision_mask = 0; // kinematic anchor non-colliding
    arm.anchor = physics_->create_body(anchor);

    auto mk_dynamic = [&](float x, float y, float radius, float mass) {
        RigidBody b;
        b.type = BodyType::Dynamic;
        b.position = FixedVector3::from_floats(x, y, 0.0f);
        b.mass = Fixed::from_float(mass);
        b.inverse_mass = Fixed::from_float(1.0f / mass);
        b.drag = Fixed::from_float(0.96f);
        b.restitution = Fixed::from_float(0.1f);
        b.friction = Fixed::from_float(0.9f);
        b.radius = Fixed::from_float(radius);
        b.collision_layer = CollisionLayers::PlayerArm;
        b.collision_mask = CollisionLayers::Enemy | CollisionLayers::Environment | CollisionLayers::Projectile;
        return physics_->create_body(b);
    };

    // Initial straight arm pose
    const float sx = px + shoulder_offset_x;
    const float sy = py + shoulder_offset_y;
    const float ex = sx + side_sign * upper_len_;
    const float ey = sy;
    const float hx = ex + side_sign * forearm_len_;
    const float hy = ey;

    arm.upper = mk_dynamic(ex, ey, 0.02f, 2.0f);
    arm.forearm = mk_dynamic((ex + hx) * 0.5f, (ey + hy) * 0.5f, 0.018f, 1.6f);
    arm.hand = mk_dynamic(hx, hy, hand_radius_, 0.8f);

    // Constraints: anchor-upper (short), upper-forearm (bone), forearm-hand (bone)
    DistanceConstraint c1; c1.bodyA = arm.anchor; c1.bodyB = arm.upper; c1.restLength = Fixed::from_float(0.01f); c1.stiffness = Fixed::from_float(0.9f);
    DistanceConstraint c2; c2.bodyA = arm.upper; c2.bodyB = arm.forearm; c2.restLength = Fixed::from_float(upper_len_ * 0.5f); c2.stiffness = Fixed::from_float(0.9f);
    DistanceConstraint c3; c3.bodyA = arm.forearm; c3.bodyB = arm.hand; c3.restLength = Fixed::from_float(forearm_len_ * 0.5f); c3.stiffness = Fixed::from_float(0.9f);
    // Soft reach constraint (optional) shoulder-hand max
    DistanceConstraint c4; c4.bodyA = arm.anchor; c4.bodyB = arm.hand; c4.restLength = Fixed::from_float(upper_len_ + forearm_len_); c4.stiffness = Fixed::from_float(0.4f);

    physics_->add_distance_constraint(c1);
    physics_->add_distance_constraint(c2);
    physics_->add_distance_constraint(c3);
    physics_->add_distance_constraint(c4);

    // Angle limits via distance range constraints
    // Shoulder: allow elbow within a ring around anchor to limit extreme curling/extension
    DistanceRangeConstraint srange; srange.bodyA = arm.anchor; srange.bodyB = arm.forearm;
    srange.minLength = Fixed::from_float(upper_len_ * 0.55f);
    srange.maxLength = Fixed::from_float(upper_len_ + forearm_len_ * 0.9f);
    srange.stiffness = Fixed::from_float(0.6f);
    physics_->add_range_constraint(srange);

    // Elbow: keep hand at reasonable distance from upper to avoid hyperextension
    DistanceRangeConstraint erange; erange.bodyA = arm.upper; erange.bodyB = arm.hand;
    erange.minLength = Fixed::from_float(forearm_len_ * 0.6f);
    erange.maxLength = Fixed::from_float(upper_len_ + forearm_len_);
    erange.stiffness = Fixed::from_float(0.6f);
    physics_->add_range_constraint(erange);
}

void ArmManager::update(float dt) {
    if (!physics_ || !player_) return;
    ensure_created();
    update_anchor_positions();
    apply_servo_to_hand(left_.hand, left_tx_, left_ty_, left_tz_, dt);
    apply_servo_to_hand(right_.hand, right_tx_, right_ty_, right_tz_, dt);

    // Soft separation between left and right hands to avoid self-intersection
    if (left_.hand && right_.hand) {
        RigidBody* lh = physics_->get_body(left_.hand);
        RigidBody* rh = physics_->get_body(right_.hand);
        if (lh && rh) {
            FixedVector3 d = rh->position - lh->position;
            Fixed distSq = d.length_squared();
            Fixed minD = Fixed::from_float(arm_separation_min_);
            Fixed minDSq = minD * minD;
            if (distSq < minDSq && distSq > Fixed::from_int(0)) {
                Fixed dist = fixed_sqrt(distSq);
                FixedVector3 n = d / dist;
                Fixed push = (minD - dist) * Fixed::from_float(0.5f);
                // Apply small positional push (PBD-style)
                if (lh->type == BodyType::Dynamic) lh->position -= n * push;
                if (rh->type == BodyType::Dynamic) rh->position += n * push;
                lh->wake(); rh->wake();
            }
        }
    }
}

void ArmManager::update_anchor_positions() {
    const float px = player_->get_x();
    const float py = player_->get_y();
    const float shoulder_offset_y = 0.05f;

    if (auto* a = physics_->get_body(left_.anchor)) {
        a->position = FixedVector3::from_floats(px - 0.03f, py + shoulder_offset_y, 0.0f);
    }
    if (auto* a = physics_->get_body(right_.anchor)) {
        a->position = FixedVector3::from_floats(px + 0.03f, py + shoulder_offset_y, 0.0f);
    }
}

void ArmManager::apply_servo_to_hand(uint32_t hand_id, float tx, float ty, float tz, float dt) {
    RigidBody* hand = physics_->get_body(hand_id);
    if (!hand) return;
    // PD target in normalized world 0..1; z unused
    FixedVector3 target = FixedVector3::from_floats(tx, ty, 0.0f);
    FixedVector3 pos = hand->position;
    FixedVector3 vel = hand->velocity;
    FixedVector3 error = target - pos;
    // Convert kp,kd to Fixed and compute force, clamp to avoid instability
    Fixed kpf = Fixed::from_float(kp_);
    Fixed kdf = Fixed::from_float(kd_);
    FixedVector3 force = (error * kpf) - (vel * kdf);

    // Clamp force magnitude
    Fixed maxF = Fixed::from_float(500.0f);
    Fixed len2 = force.length_squared();
    if (len2 > maxF * maxF) {
        Fixed len = fixed_sqrt(len2);
        if (len > Fixed::from_int(0)) {
            force = force * (maxF / len);
        }
    }
    physics_->apply_force(hand_id, force);
}

void ArmManager::set_left_target(float x, float y, float z) {
    left_tx_ = x; left_ty_ = y; left_tz_ = z;
}

void ArmManager::set_right_target(float x, float y, float z) {
    right_tx_ = x; right_ty_ = y; right_tz_ = z;
}

void ArmManager::read_body_pos(uint32_t id, float& x, float& y, float& z) const {
    const RigidBody* b = physics_->get_body(id);
    if (!b) { x = y = z = 0.0f; return; }
    x = b->position.x.to_float();
    y = b->position.y.to_float();
    z = b->position.z.to_float();
}

void ArmManager::get_left_shoulder(float& x, float& y, float& z) const { read_body_pos(left_.anchor, x, y, z); }
void ArmManager::get_left_elbow(float& x, float& y, float& z) const { read_body_pos(left_.forearm, x, y, z); }
void ArmManager::get_left_hand(float& x, float& y, float& z) const { read_body_pos(left_.hand, x, y, z); }
void ArmManager::get_right_shoulder(float& x, float& y, float& z) const { read_body_pos(right_.anchor, x, y, z); }
void ArmManager::get_right_elbow(float& x, float& y, float& z) const { read_body_pos(right_.forearm, x, y, z); }
void ArmManager::get_right_hand(float& x, float& y, float& z) const { read_body_pos(right_.hand, x, y, z); }


