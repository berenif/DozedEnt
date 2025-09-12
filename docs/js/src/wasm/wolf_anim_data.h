#pragma once

#define MAX_WOLF_ANIM_DATA MAX_ENEMIES

// Structure to hold procedural animation data for a single wolf
struct WolfAnimData {
    unsigned char active; // 1 if this entry is active, 0 otherwise
    float leg_x[4], leg_y[4]; // Target positions for each of the 4 legs (relative to wolf's center)
    float spine_bend; // Body/spine bend factor (e.g., for turning, pouncing)
    float tail_angle; // Overall tail angle
    float head_pitch; // Head up/down
    float head_yaw;   // Head left/right
    float ear_rotation[2]; // Rotation for left and right ears (e.g., for alertness)
    float body_stretch; // Squash and stretch effect for body
    float body_offset_y; // Vertical offset for body bobbing
    float fur_ruffle; // Intensity of fur ruffling
};

// Function to reset all wolf animation data
static inline void reset_wolf_anim_data() {
    // Wolf animation data is stored in the enemy structs, so nothing to reset here
    // The function exists for compatibility but is effectively a no-op
}