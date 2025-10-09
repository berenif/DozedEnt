#pragma once
#include "FixedPoint.h"
#include <cmath>

/**
 * SkeletonPhysics - Human-like balance system for player character
 * 
 * Implements three balance strategies found in human biomechanics:
 * 1. ANKLE STRATEGY: Small corrections via ankle torque
 * 2. HIP STRATEGY: Larger corrections via hip/torso movement
 * 3. STEPPING STRATEGY: Recovery via foot repositioning
 */

namespace SkeletonPhysics {

// Joint represents a point mass in the skeleton
struct Joint {
    Fixed x, y;           // Current position
    Fixed prev_x, prev_y; // Previous position (for Verlet integration)
    Fixed mass;           // Mass of joint
    bool fixed;           // True if joint position is locked
    
    Joint() 
        : x(Fixed::from_int(0))
        , y(Fixed::from_int(0))
        , prev_x(Fixed::from_int(0))
        , prev_y(Fixed::from_int(0))
        , mass(Fixed::from_int(1))
        , fixed(false)
    {}
    
    Joint(Fixed x_, Fixed y_, Fixed mass_ = Fixed::from_int(1)) 
        : x(x_), y(y_)
        , prev_x(x_), prev_y(y_)
        , mass(mass_)
        , fixed(false)
    {}
    
    // Apply force using Verlet integration
    void apply_force(Fixed fx, Fixed fy, Fixed dt) {
        if (fixed) return;
        Fixed ax = fx / mass;
        Fixed ay = fy / mass;
        x += ax * dt * dt;
        y += ay * dt * dt;
    }
    
    // Update position using Verlet integration
    void update(Fixed damping) {
        if (fixed) return;
        Fixed temp_x = x;
        Fixed temp_y = y;
        x += (x - prev_x) * damping;
        y += (y - prev_y) * damping;
        prev_x = temp_x;
        prev_y = temp_y;
    }
};

// Constraint maintains fixed distance between two joints
struct Constraint {
    Joint* joint1;
    Joint* joint2;
    Fixed length;
    Fixed stiffness;
    
    Constraint() : joint1(nullptr), joint2(nullptr), length(Fixed::from_int(0)), stiffness(Fixed::from_int(1)) {}
    
    Constraint(Joint* j1, Joint* j2, Fixed len, Fixed stiff = Fixed::from_float(1.0f))
        : joint1(j1), joint2(j2), length(len), stiffness(stiff) {}
    
    // Solve constraint by moving joints toward correct distance
    void solve() {
        if (!joint1 || !joint2) return;
        
        Fixed dx = joint2->x - joint1->x;
        Fixed dy = joint2->y - joint1->y;
        Fixed dist_sq = dx * dx + dy * dy;
        
        if (dist_sq < Fixed::from_float(0.0001f)) return;
        
        // Approximate sqrt for distance
        Fixed dist = fixed_sqrt(dist_sq);
        Fixed diff = (length - dist) / dist;
        Fixed half_stiff = stiffness * Fixed::from_float(0.5f);
        Fixed offset_x = dx * diff * half_stiff;
        Fixed offset_y = dy * diff * half_stiff;
        
        if (!joint1->fixed) {
            joint1->x -= offset_x;
            joint1->y -= offset_y;
        }
        if (!joint2->fixed) {
            joint2->x += offset_x;
            joint2->y += offset_y;
        }
    }
};

// Player skeleton with balance control
struct PlayerSkeleton {
    // Core joints
    Joint head, neck, chest, mid_spine, lower_spine, pelvis;
    
    // Arms
    Joint shoulder_l, shoulder_r;
    Joint elbow_l, elbow_r;
    Joint wrist_l, wrist_r;
    Joint hand_l, hand_r;
    
    // Legs
    Joint hip_l, hip_r;
    Joint knee_l, knee_r;
    Joint ankle_l, ankle_r;
    
    // Feet (detailed for balance)
    Joint heel_l, heel_r;
    Joint foot_l, foot_r;
    Joint toe_l, toe_r;
    
    // Constraints (bones)
    static constexpr int MAX_CONSTRAINTS = 30;
    Constraint constraints[MAX_CONSTRAINTS];
    int constraint_count;
    
    // Balance state
    Fixed center_of_mass_x, center_of_mass_y;
    Fixed com_offset;
    bool foot_contact_l, foot_contact_r;
    
    // Settings
    Fixed ground_y;
    Fixed balance_strength;
    Fixed ankle_flexibility;
    Fixed damping;
    Fixed gravity;
    bool auto_balance_enabled;
    
    PlayerSkeleton() 
        : constraint_count(0)
        , center_of_mass_x(Fixed::from_int(0))
        , center_of_mass_y(Fixed::from_int(0))
        , com_offset(Fixed::from_int(0))
        , foot_contact_l(false)
        , foot_contact_r(false)
        , ground_y(Fixed::from_float(0.1f))
        , balance_strength(Fixed::from_float(0.5f))
        , ankle_flexibility(Fixed::from_float(0.4f))
        , damping(Fixed::from_float(0.95f))
        , gravity(Fixed::from_float(9.8f))
        , auto_balance_enabled(true)
    {}
    
    // Initialize skeleton at position
    void initialize(Fixed center_x, Fixed center_y, Fixed scale = Fixed::from_int(1)) {
        // Positions relative to center
        Fixed s = scale * Fixed::from_float(0.01f); // Scale factor
        
        // Head and neck
        head = Joint(center_x, center_y - s * Fixed::from_int(200), Fixed::from_float(0.8f));
        neck = Joint(center_x, center_y - s * Fixed::from_int(170), Fixed::from_float(0.5f));
        
        // Torso
        shoulder_l = Joint(center_x - s * Fixed::from_int(35), center_y - s * Fixed::from_int(150), Fixed::from_int(1));
        shoulder_r = Joint(center_x + s * Fixed::from_int(35), center_y - s * Fixed::from_int(150), Fixed::from_int(1));
        chest = Joint(center_x, center_y - s * Fixed::from_int(140), Fixed::from_int(2));
        mid_spine = Joint(center_x, center_y - s * Fixed::from_int(100), Fixed::from_float(2.5f));
        lower_spine = Joint(center_x, center_y - s * Fixed::from_int(60), Fixed::from_float(2.5f));
        pelvis = Joint(center_x, center_y - s * Fixed::from_int(20), Fixed::from_int(3));
        
        // Arms
        elbow_l = Joint(center_x - s * Fixed::from_int(60), center_y - s * Fixed::from_int(100), Fixed::from_float(0.7f));
        elbow_r = Joint(center_x + s * Fixed::from_int(60), center_y - s * Fixed::from_int(100), Fixed::from_float(0.7f));
        wrist_l = Joint(center_x - s * Fixed::from_int(70), center_y - s * Fixed::from_int(50), Fixed::from_float(0.5f));
        wrist_r = Joint(center_x + s * Fixed::from_int(70), center_y - s * Fixed::from_int(50), Fixed::from_float(0.5f));
        hand_l = Joint(center_x - s * Fixed::from_int(75), center_y - s * Fixed::from_int(30), Fixed::from_float(0.4f));
        hand_r = Joint(center_x + s * Fixed::from_int(75), center_y - s * Fixed::from_int(30), Fixed::from_float(0.4f));
        
        // Legs
        hip_l = Joint(center_x - s * Fixed::from_int(20), center_y - s * Fixed::from_int(10), Fixed::from_float(1.5f));
        hip_r = Joint(center_x + s * Fixed::from_int(20), center_y - s * Fixed::from_int(10), Fixed::from_float(1.5f));
        knee_l = Joint(center_x - s * Fixed::from_int(25), center_y + s * Fixed::from_int(80), Fixed::from_float(1.2f));
        knee_r = Joint(center_x + s * Fixed::from_int(25), center_y + s * Fixed::from_int(80), Fixed::from_float(1.2f));
        ankle_l = Joint(center_x - s * Fixed::from_int(25), center_y + s * Fixed::from_int(160), Fixed::from_float(0.8f));
        ankle_r = Joint(center_x + s * Fixed::from_int(25), center_y + s * Fixed::from_int(160), Fixed::from_float(0.8f));
        
        // Feet (heel, midfoot, toe for realistic ground contact)
        heel_l = Joint(center_x - s * Fixed::from_int(25), center_y + s * Fixed::from_int(180), Fixed::from_float(0.6f));
        heel_r = Joint(center_x + s * Fixed::from_int(25), center_y + s * Fixed::from_int(180), Fixed::from_float(0.6f));
        foot_l = Joint(center_x - s * Fixed::from_int(15), center_y + s * Fixed::from_int(180), Fixed::from_float(0.5f));
        foot_r = Joint(center_x + s * Fixed::from_int(15), center_y + s * Fixed::from_int(180), Fixed::from_float(0.5f));
        toe_l = Joint(center_x - s * Fixed::from_int(5), center_y + s * Fixed::from_int(180), Fixed::from_float(0.4f));
        toe_r = Joint(center_x + s * Fixed::from_int(5), center_y + s * Fixed::from_int(180), Fixed::from_float(0.4f));
        
        // Create constraints
        constraint_count = 0;
        add_constraint(&head, &neck, Fixed::from_float(0.95f));
        add_constraint(&neck, &chest, Fixed::from_float(0.9f));
        add_constraint(&chest, &mid_spine, Fixed::from_float(0.85f));
        add_constraint(&mid_spine, &lower_spine, Fixed::from_float(0.85f));
        add_constraint(&lower_spine, &pelvis, Fixed::from_float(0.9f));
        
        // Shoulders
        add_constraint(&chest, &shoulder_l, Fixed::from_float(0.95f));
        add_constraint(&chest, &shoulder_r, Fixed::from_float(0.95f));
        add_constraint(&shoulder_l, &shoulder_r, Fixed::from_float(0.8f));
        
        // Arms
        add_constraint(&shoulder_l, &elbow_l, Fixed::from_float(0.9f));
        add_constraint(&elbow_l, &wrist_l, Fixed::from_float(0.9f));
        add_constraint(&wrist_l, &hand_l, Fixed::from_float(0.95f));
        add_constraint(&shoulder_r, &elbow_r, Fixed::from_float(0.9f));
        add_constraint(&elbow_r, &wrist_r, Fixed::from_float(0.9f));
        add_constraint(&wrist_r, &hand_r, Fixed::from_float(0.95f));
        
        // Pelvis and hips
        add_constraint(&pelvis, &hip_l, Fixed::from_float(0.95f));
        add_constraint(&pelvis, &hip_r, Fixed::from_float(0.95f));
        add_constraint(&hip_l, &hip_r, Fixed::from_float(0.8f));
        
        // Legs
        add_constraint(&hip_l, &knee_l, Fixed::from_float(0.9f));
        add_constraint(&knee_l, &ankle_l, Fixed::from_float(0.9f));
        add_constraint(&ankle_l, &heel_l, Fixed::from_float(0.95f));
        add_constraint(&heel_l, &foot_l, Fixed::from_float(0.95f));
        add_constraint(&foot_l, &toe_l, Fixed::from_float(0.95f));
        
        add_constraint(&hip_r, &knee_r, Fixed::from_float(0.9f));
        add_constraint(&knee_r, &ankle_r, Fixed::from_float(0.9f));
        add_constraint(&ankle_r, &heel_r, Fixed::from_float(0.95f));
        add_constraint(&heel_r, &foot_r, Fixed::from_float(0.95f));
        add_constraint(&foot_r, &toe_r, Fixed::from_float(0.95f));
    }
    
    void add_constraint(Joint* j1, Joint* j2, Fixed stiffness) {
        if (constraint_count >= MAX_CONSTRAINTS) return;
        
        // Calculate initial length
        Fixed dx = j2->x - j1->x;
        Fixed dy = j2->y - j1->y;
        Fixed length = fixed_sqrt(dx * dx + dy * dy);
        
        constraints[constraint_count++] = Constraint(j1, j2, length, stiffness);
    }
    
    // Apply gravity to all joints
    void apply_gravity(Fixed dt) {
        Fixed g_force = gravity * dt * dt;
        Joint* joints[] = {
            &head, &neck, &chest, &mid_spine, &lower_spine, &pelvis,
            &shoulder_l, &shoulder_r, &elbow_l, &elbow_r, &wrist_l, &wrist_r,
            &hand_l, &hand_r, &hip_l, &hip_r, &knee_l, &knee_r,
            &ankle_l, &ankle_r, &heel_l, &heel_r, &foot_l, &foot_r, &toe_l, &toe_r
        };
        
        for (int i = 0; i < 26; i++) {
            if (!joints[i]->fixed) {
                joints[i]->y += g_force;
            }
        }
    }
    
    // Apply ground constraints with friction
    void apply_ground_constraints() {
        Fixed friction = Fixed::from_float(0.85f);
        Joint* ground_joints[] = {&heel_l, &heel_r, &foot_l, &foot_r, &toe_l, &toe_r};
        
        for (int i = 0; i < 6; i++) {
            Joint* joint = ground_joints[i];
            if (joint->y > ground_y) {
                joint->y = ground_y;
                // Apply friction to horizontal movement
                Fixed vel_x = joint->x - joint->prev_x;
                joint->prev_x = joint->x - vel_x * friction;
                // Strong vertical damping
                Fixed vel_y = joint->y - joint->prev_y;
                joint->prev_y = ground_y + vel_y * Fixed::from_float(0.2f);
            }
        }
        
        // Track foot contact
        Fixed threshold = Fixed::from_float(0.001f);
        foot_contact_l = (heel_l.y >= ground_y - threshold) || 
                        (foot_l.y >= ground_y - threshold) || 
                        (toe_l.y >= ground_y - threshold);
        foot_contact_r = (heel_r.y >= ground_y - threshold) || 
                        (foot_r.y >= ground_y - threshold) || 
                        (toe_r.y >= ground_y - threshold);
    }
    
    // Calculate center of mass
    void calculate_center_of_mass() {
        Fixed total_mass = Fixed::from_int(0);
        Fixed com_x = Fixed::from_int(0);
        Fixed com_y = Fixed::from_int(0);
        
        Joint* joints[] = {
            &head, &neck, &chest, &mid_spine, &lower_spine, &pelvis,
            &shoulder_l, &shoulder_r, &elbow_l, &elbow_r, &wrist_l, &wrist_r,
            &hand_l, &hand_r, &hip_l, &hip_r, &knee_l, &knee_r,
            &ankle_l, &ankle_r, &heel_l, &heel_r, &foot_l, &foot_r, &toe_l, &toe_r
        };
        
        for (int i = 0; i < 26; i++) {
            com_x += joints[i]->x * joints[i]->mass;
            com_y += joints[i]->y * joints[i]->mass;
            total_mass += joints[i]->mass;
        }
        
        center_of_mass_x = com_x / total_mass;
        center_of_mass_y = com_y / total_mass;
    }
    
    // Apply human-like balance strategies
    void apply_balance_forces() {
        if (!auto_balance_enabled) return;
        
        calculate_center_of_mass();
        
        // Calculate support polygon (between feet)
        Fixed foot_center_x;
        int contact_count = 0;
        Fixed support_left = Fixed::from_int(0);
        Fixed support_right = Fixed::from_int(0);
        
        if (foot_contact_l) {
            support_left = (heel_l.x + foot_l.x + toe_l.x) / Fixed::from_int(3);
            contact_count++;
        }
        if (foot_contact_r) {
            support_right = (heel_r.x + foot_r.x + toe_r.x) / Fixed::from_int(3);
            contact_count++;
        }
        
        if (contact_count == 0) return; // Not grounded
        
        foot_center_x = (contact_count == 2) ? 
            (support_left + support_right) / Fixed::from_int(2) :
            (foot_contact_l ? support_left : support_right);
        
        com_offset = center_of_mass_x - foot_center_x;
        
        // ANKLE STRATEGY: Small disturbances
        Fixed ankle_threshold = Fixed::from_float(0.015f);
        if (com_offset.abs() < ankle_threshold) {
            Fixed ankle_force = -com_offset * ankle_flexibility * Fixed::from_float(0.8f);
            if (foot_contact_l) {
                ankle_l.x += ankle_force;
                heel_l.x -= ankle_force * Fixed::from_float(0.3f);
                toe_l.x += ankle_force * Fixed::from_float(0.3f);
            }
            if (foot_contact_r) {
                ankle_r.x += ankle_force;
                heel_r.x -= ankle_force * Fixed::from_float(0.3f);
                toe_r.x += ankle_force * Fixed::from_float(0.3f);
            }
        }
        
        // HIP STRATEGY: Larger disturbances
        Fixed hip_correction = -com_offset * balance_strength;
        pelvis.x += hip_correction;
        lower_spine.x += hip_correction * Fixed::from_float(0.8f);
        mid_spine.x += hip_correction * Fixed::from_float(0.6f);
        chest.x += hip_correction * Fixed::from_float(0.4f);
        neck.x += hip_correction * Fixed::from_float(0.2f);
        head.x += hip_correction * Fixed::from_float(0.1f);
        
        // Weight distribution
        if (contact_count == 2) {
            Fixed weight_shift = com_offset * Fixed::from_float(0.05f);
            Fixed shift_amount = weight_shift.abs();
            
            if (foot_contact_l) {
                Fixed factor = (com_offset < Fixed::from_int(0)) ? Fixed::from_float(1.5f) : Fixed::from_float(0.5f);
                heel_l.y -= shift_amount * factor;
                foot_l.y -= shift_amount * factor;
                toe_l.y -= shift_amount * factor;
            }
            if (foot_contact_r) {
                Fixed factor = (com_offset > Fixed::from_int(0)) ? Fixed::from_float(1.5f) : Fixed::from_float(0.5f);
                heel_r.y -= shift_amount * factor;
                foot_r.y -= shift_amount * factor;
                toe_r.y -= shift_amount * factor;
            }
        }
        
        // STEPPING STRATEGY: Very large disturbances
        Fixed step_threshold = Fixed::from_float(0.05f);
        if (com_offset.abs() > step_threshold && contact_count == 2) {
            Fixed step_adjust = com_offset * Fixed::from_float(0.1f);
            if (com_offset > Fixed::from_int(0) && foot_contact_r) {
                heel_r.x += step_adjust;
                foot_r.x += step_adjust;
                toe_r.x += step_adjust;
            } else if (com_offset < Fixed::from_int(0) && foot_contact_l) {
                heel_l.x += step_adjust;
                foot_l.x += step_adjust;
                toe_l.x += step_adjust;
            }
        }
        
        // Knee locking for stability
        Fixed knee_strength = Fixed::from_float(0.15f);
        if (foot_contact_l) {
            Fixed target_knee_x = ankle_l.x;
            knee_l.x += (target_knee_x - knee_l.x) * knee_strength;
        }
        if (foot_contact_r) {
            Fixed target_knee_x = ankle_r.x;
            knee_r.x += (target_knee_x - knee_r.x) * knee_strength;
        }
    }
    
    // Solve all constraints
    void solve_constraints(int iterations = 3) {
        for (int iter = 0; iter < iterations; iter++) {
            for (int i = 0; i < constraint_count; i++) {
                constraints[i].solve();
            }
        }
    }
    
    // Update skeleton physics
    void update(Fixed dt) {
        // Apply gravity
        apply_gravity(dt);
        
        // Update all joints
        Joint* joints[] = {
            &head, &neck, &chest, &mid_spine, &lower_spine, &pelvis,
            &shoulder_l, &shoulder_r, &elbow_l, &elbow_r, &wrist_l, &wrist_r,
            &hand_l, &hand_r, &hip_l, &hip_r, &knee_l, &knee_r,
            &ankle_l, &ankle_r, &heel_l, &heel_r, &foot_l, &foot_r, &toe_l, &toe_r
        };
        
        for (int i = 0; i < 26; i++) {
            joints[i]->update(damping);
        }
        
        // Solve constraints for stability
        solve_constraints(5);
        
        // Apply ground and balance
        apply_ground_constraints();
        apply_balance_forces();
        
        // Final constraint pass
        solve_constraints(2);
    }
    
    // Synchronize skeleton pelvis with player position
    void sync_to_player_position(Fixed player_x, Fixed player_y) {
        pelvis.x = player_x;
        pelvis.y = player_y;
    }
    
    // Get foot positions for gameplay logic
    void get_foot_positions(Fixed& left_x, Fixed& left_y, Fixed& right_x, Fixed& right_y) const {
        left_x = (heel_l.x + foot_l.x + toe_l.x) / Fixed::from_int(3);
        left_y = (heel_l.y + foot_l.y + toe_l.y) / Fixed::from_int(3);
        right_x = (heel_r.x + foot_r.x + toe_r.x) / Fixed::from_int(3);
        right_y = (heel_r.y + foot_r.y + toe_r.y) / Fixed::from_int(3);
    }
};

} // namespace SkeletonPhysics
