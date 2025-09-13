// Enhanced Animation overlay state and computation (WASM-side, UI reads via getters)
#pragma once

#include "world_simulation.h"

// Primary overlay values computed deterministically each update()
static float g_anim_scale_x = 1.0f;
static float g_anim_scale_y = 1.0f;
static float g_anim_rotation = 0.0f;   // radians
static float g_anim_offset_x = 0.0f;   // pixels (UI space)
static float g_anim_offset_y = 0.0f;   // pixels (UI space)
static float g_anim_pelvis_y = 0.0f;   // pixels (UI space)

// Enhanced procedural animation state
static float g_anim_spine_curve = 0.0f;     // Spine curvature for realistic posture
static float g_anim_shoulder_rotation = 0.0f; // Shoulder counter-rotation
static float g_anim_head_bob_x = 0.0f;      // Head bob horizontal
static float g_anim_head_bob_y = 0.0f;      // Head bob vertical
static float g_anim_arm_swing_left = 0.0f;  // Left arm swing angle
static float g_anim_arm_swing_right = 0.0f; // Right arm swing angle
static float g_anim_leg_lift_left = 0.0f;   // Left leg lift amount
static float g_anim_leg_lift_right = 0.0f;  // Right leg lift amount
static float g_anim_torso_twist = 0.0f;     // Torso twist for natural movement
static float g_anim_breathing_intensity = 1.0f; // Breathing animation intensity
static float g_anim_fatigue_factor = 0.0f;  // Fatigue affects animation timing
static float g_anim_momentum_x = 0.0f;      // Momentum-based offset X
static float g_anim_momentum_y = 0.0f;      // Momentum-based offset Y

// Physics-based secondary motion
static float g_anim_cloth_sway = 0.0f;      // Cloth/cape physics simulation
static float g_anim_hair_bounce = 0.0f;     // Hair/loose elements bounce
static float g_anim_equipment_jiggle = 0.0f; // Equipment physics response

// Environmental response
static float g_anim_wind_response = 0.0f;   // Response to environmental wind
static float g_anim_ground_adapt = 0.0f;    // Ground adaptation (slope/terrain)
static float g_anim_temperature_shiver = 0.0f; // Cold environment response

static inline float tri01(float t) {
  if (t < 0.0f) t = 0.0f; else if (t > 1.0f) t = 1.0f;
  return (t < 0.5f) ? (t * 2.0f) : (1.0f - (t - 0.5f) * 2.0f);
}

// Helper functions for realistic animation
static inline float smooth_step(float edge0, float edge1, float x) {
  float t = (x - edge0) / (edge1 - edge0);
  if (t < 0.0f) t = 0.0f; else if (t > 1.0f) t = 1.0f;
  return t * t * (3.0f - 2.0f * t);
}

static inline float ease_in_out_cubic(float t) {
  return t < 0.5f ? 4.0f * t * t * t : 1.0f - __builtin_powf(-2.0f * t + 2.0f, 3.0f) / 2.0f;
}

static inline void update_anim_overlay_internal() {
  // Reset all animation values
  g_anim_scale_x = 1.0f;
  g_anim_scale_y = 1.0f;
  g_anim_rotation = 0.0f;
  g_anim_offset_x = 0.0f;
  g_anim_offset_y = 0.0f;
  g_anim_pelvis_y = 0.0f;
  
  // Reset enhanced animation values
  g_anim_spine_curve = 0.0f;
  g_anim_shoulder_rotation = 0.0f;
  g_anim_head_bob_x = 0.0f;
  g_anim_head_bob_y = 0.0f;
  g_anim_arm_swing_left = 0.0f;
  g_anim_arm_swing_right = 0.0f;
  g_anim_leg_lift_left = 0.0f;
  g_anim_leg_lift_right = 0.0f;
  g_anim_torso_twist = 0.0f;
  g_anim_momentum_x = 0.0f;
  g_anim_momentum_y = 0.0f;
  g_anim_cloth_sway = 0.0f;
  g_anim_hair_bounce = 0.0f;
  g_anim_equipment_jiggle = 0.0f;
  g_anim_wind_response = 0.0f;
  g_anim_ground_adapt = 0.0f;
  g_anim_temperature_shiver = 0.0f;

  // Calculate movement parameters
  float speed = vec_len(g_vel_x, g_vel_y);
  float speedN = (BASE_SPEED > 0.0f) ? (speed / BASE_SPEED) : 0.0f;
  if (speedN > 1.0f) speedN = 1.0f; if (speedN < 0.0f) speedN = 0.0f;
  
  // Calculate fatigue factor based on stamina
  g_anim_fatigue_factor = 1.0f - g_stamina;
  float fatigueInfluence = g_anim_fatigue_factor * 0.3f;
  
  // Enhanced breathing animation
  float breathingPhase = g_time_seconds * (1.2f - fatigueInfluence * 0.4f); // Slower when tired
  g_anim_breathing_intensity = 1.0f + g_anim_fatigue_factor * 0.5f; // Heavier breathing when tired
  float breathingOffset = __builtin_sinf(breathingPhase) * 0.8f * g_anim_breathing_intensity;
  g_anim_scale_y *= 1.0f + breathingOffset * 0.015f;
  g_anim_offset_y += breathingOffset * 0.3f;

  // Realistic movement dynamics
  if (!g_is_rolling && !g_blocking && speed > 1e-6f) {
    float nx = g_vel_x / speed;
    float ny = g_vel_y / speed;
    
    // Enhanced leaning with realistic physics
    float lean = nx * 0.18f * (1.0f + fatigueInfluence * 0.5f); // More lean when tired
    if (lean < -0.2f) lean = -0.2f; else if (lean > 0.2f) lean = 0.2f;
    g_anim_rotation += lean;
    
    // Spine curvature based on movement direction and speed
    g_anim_spine_curve = nx * speedN * 0.12f;
    
    // Shoulder counter-rotation for natural movement
    g_anim_shoulder_rotation = -lean * 0.6f;
    
    // Torso twist for realistic human locomotion
    float walkPhase = g_time_seconds * (1.8f + speedN * 0.8f);
    g_anim_torso_twist = __builtin_sinf(walkPhase) * speedN * 0.08f;
    
    // Momentum-based offset for realistic inertia
    static float momentum_x = 0.0f, momentum_y = 0.0f;
    float momentum_damping = 0.85f;
    momentum_x = momentum_x * momentum_damping + g_vel_x * 0.15f;
    momentum_y = momentum_y * momentum_damping + g_vel_y * 0.15f;
    g_anim_momentum_x = momentum_x * 3.0f;
    g_anim_momentum_y = momentum_y * 2.0f;
  }

  // Enhanced gait system with realistic foot placement
  if (!g_is_rolling) {
    float gaitRate = 1.6f * (1.0f - fatigueInfluence * 0.3f); // Slower gait when tired
    float cadence = gaitRate * (0.3f + 0.7f * speedN);
    float phase = g_time_seconds * cadence;
    const float TWO_PI = 6.28318530718f;
    
    // Realistic pelvis motion with figure-8 pattern
    float pelvisPhaseX = phase * TWO_PI;
    float pelvisPhaseY = phase * TWO_PI * 2.0f; // Double frequency for Y
    float pelvisBobX = __builtin_sinf(pelvisPhaseX) * 1.2f * speedN;
    float pelvisBobY = __builtin_sinf(pelvisPhaseY) * 2.2f * speedN;
    
    g_anim_pelvis_y = pelvisBobY;
    g_anim_offset_y += pelvisBobY;
    g_anim_offset_x += pelvisBobX * 0.3f;
    
    // Realistic arm swing with opposite phase
    float armPhase = phase * TWO_PI;
    g_anim_arm_swing_left = __builtin_sinf(armPhase) * speedN * 0.4f;
    g_anim_arm_swing_right = __builtin_sinf(armPhase + 3.14159f) * speedN * 0.4f;
    
    // Leg lift animation with realistic timing
    float legPhase = phase * TWO_PI;
    g_anim_leg_lift_left = __builtin_fmaxf(0.0f, __builtin_sinf(legPhase)) * speedN * 0.6f;
    g_anim_leg_lift_right = __builtin_fmaxf(0.0f, __builtin_sinf(legPhase + 3.14159f)) * speedN * 0.6f;
    
    // Head bob with natural damping
    float headBobPhase = phase * TWO_PI * 0.8f; // Slightly slower than body
    g_anim_head_bob_x = __builtin_sinf(headBobPhase) * speedN * 0.5f;
    g_anim_head_bob_y = __builtin_sinf(headBobPhase * 2.0f) * speedN * 0.3f;
    
    // Secondary motion for cloth and equipment
    float clothPhase = g_time_seconds * 2.5f;
    g_anim_cloth_sway = __builtin_sinf(clothPhase + speedN) * (0.8f + speedN * 0.5f);
    g_anim_equipment_jiggle = pelvisBobY * 0.4f + speedN * 0.2f;
    g_anim_hair_bounce = pelvisBobY * 0.6f * (1.0f + speedN * 0.3f);
  }

  // Enhanced blocking animation with defensive posture
  if (g_blocking) {
    g_anim_scale_y *= 0.96f; // More pronounced crouch
    g_anim_offset_y += 1.5f;
    
    // Defensive shoulder positioning
    g_anim_shoulder_rotation += 0.1f * g_face_x;
    
    // Slight lean into the block direction
    g_anim_rotation += g_block_face_x * 0.05f;
    
    // Tense posture - reduced breathing
    g_anim_breathing_intensity *= 0.7f;
    
    // Shield/weapon positioning
    g_anim_arm_swing_left = g_face_x > 0 ? 0.3f : -0.1f;
    g_anim_arm_swing_right = g_face_x > 0 ? -0.1f : 0.3f;
  }

  // Enhanced roll animation with realistic physics
  {
    float rollT = (g_time_seconds - g_roll_start_time);
    if (rollT >= 0.0f && rollT <= ROLL_IFRAME_DURATION) {
      float norm = (ROLL_IFRAME_DURATION > 0.0f) ? (rollT / ROLL_IFRAME_DURATION) : 0.0f;
      float w = ease_in_out_cubic(norm);
      
      // Dynamic squash and stretch based on roll phase
      if (norm < 0.3f) {
        // Compression phase
        float compress = norm / 0.3f;
        g_anim_scale_y *= (1.0f - 0.15f * compress);
        g_anim_scale_x *= (1.0f + 0.08f * compress);
      } else if (norm > 0.7f) {
        // Extension phase
        float extend = (norm - 0.7f) / 0.3f;
        g_anim_scale_y *= (0.85f + 0.15f * extend);
        g_anim_scale_x *= (1.08f - 0.08f * extend);
      } else {
        // Mid-roll - maximum compression
        g_anim_scale_y *= 0.85f;
        g_anim_scale_x *= 1.08f;
      }
      
      // Enhanced rotation with momentum
      float faceSign = (g_roll_direction_x >= 0.0f ? 1.0f : -1.0f);
      g_anim_rotation += faceSign * 0.25f * w;
      
      // Roll-specific spine curve
      g_anim_spine_curve = faceSign * 0.3f * w;
      
      // Momentum trail effect
      g_anim_momentum_x += g_roll_direction_x * 8.0f * w;
      g_anim_momentum_y += g_roll_direction_y * 6.0f * w;
    }
  }

  // Enhanced attack animations with realistic combat dynamics
  if (g_attack_state != AttackState::Idle) {
    float total = 0.0f;
    float windup = 0.0f, active = 0.0f, recovery = 0.0f;
    
    // Get timing based on attack type
    if (g_current_attack_type == AttackType::Light) {
      windup = LIGHT_WINDUP_SEC;
      active = LIGHT_ACTIVE_SEC;
      recovery = LIGHT_RECOVERY_SEC;
    } else if (g_current_attack_type == AttackType::Heavy) {
      windup = HEAVY_WINDUP_SEC;
      active = HEAVY_ACTIVE_SEC;
      recovery = HEAVY_RECOVERY_SEC;
    } else { // Special
      windup = SPECIAL_WINDUP_SEC;
      active = SPECIAL_ACTIVE_SEC;
      recovery = SPECIAL_RECOVERY_SEC;
    }
    
    total = windup + active + recovery;
    float t0 = g_attack_state_time;
    float prog = 0.0f;
    float localProgress = 0.0f;
    
    if (g_attack_state == AttackState::Windup) {
      localProgress = (windup > 0.0f) ? ((g_time_seconds - t0) / windup) : 0.0f;
      prog = localProgress * (windup / total);
      
      // Anticipation animation - drawing back
      float anticipation = ease_in_out_cubic(localProgress);
      g_anim_offset_x -= g_attack_dir_x * 3.0f * anticipation;
      g_anim_offset_y -= 0.5f * anticipation;
      
      // Shoulder wind-up
      g_anim_shoulder_rotation = -g_attack_dir_x * 0.15f * anticipation;
      
      // Spine coiling
      g_anim_spine_curve = -g_attack_dir_x * 0.08f * anticipation;
      
      // Weight shift
      g_anim_scale_x *= 1.0f + 0.02f * anticipation;
      
    } else if (g_attack_state == AttackState::Active) {
      float p1 = windup / total;
      localProgress = (active > 0.0f) ? ((g_time_seconds - t0) / active) : 0.0f;
      prog = p1 + localProgress * (active / total);
      
      // Strike animation - explosive forward motion
      float strike = ease_in_out_cubic(localProgress);
      g_anim_offset_x += g_attack_dir_x * 4.5f * strike;
      g_anim_offset_y += 1.0f * strike;
      
      // Full body commitment
      g_anim_shoulder_rotation = g_attack_dir_x * 0.2f * strike;
      g_anim_spine_curve = g_attack_dir_x * 0.12f * strike;
      g_anim_torso_twist = g_attack_dir_x * 0.1f * strike;
      
      // Impact scaling
      if (g_current_attack_type == AttackType::Heavy) {
        g_anim_scale_x *= 1.0f + 0.05f * strike;
        g_anim_scale_y *= 1.0f - 0.02f * strike;
      }
      
    } else if (g_attack_state == AttackState::Recovery) {
      float p2 = (windup + active) / total;
      localProgress = (recovery > 0.0f) ? ((g_time_seconds - t0) / recovery) : 0.0f;
      prog = p2 + localProgress * (recovery / total);
      
      // Recovery animation - returning to stance
      float recover = 1.0f - ease_in_out_cubic(localProgress);
      g_anim_offset_x += g_attack_dir_x * 2.0f * recover;
      g_anim_shoulder_rotation = g_attack_dir_x * 0.1f * recover;
      g_anim_spine_curve = g_attack_dir_x * 0.06f * recover;
      
      // Fatigue effect for heavy attacks
      if (g_current_attack_type == AttackType::Heavy) {
        g_anim_breathing_intensity *= 1.0f + 0.3f * recover;
        g_anim_scale_y *= 1.0f - 0.01f * recover; // Slight slouch
      }
    }
  }
  
  // Environmental responses
  // Wind effect driven by world simulation
  float windStrength = get_weather_wind_speed() * 0.1f; // Normalize 0..10 m/s
  if (windStrength > 1.0f) windStrength = 1.0f;
  g_anim_wind_response = __builtin_sinf(g_time_seconds * 0.8f) * windStrength * 0.5f;
  g_anim_cloth_sway += g_anim_wind_response;
  g_anim_hair_bounce += g_anim_wind_response * 0.3f;

  // Temperature response (shivering in cold)
  float temperatureC = get_weather_temperature();
  float temperature = temperatureC / 40.0f; // Normalize 0..40C to 0..1
  if (temperature < 0.0f) temperature = 0.0f;
  if (temperature > 1.0f) temperature = 1.0f;
  if (temperature < 0.3f) {
    float shiverIntensity = (0.3f - temperature) / 0.3f;
    g_anim_temperature_shiver = __builtin_sinf(g_time_seconds * 12.0f) * shiverIntensity * 0.02f;
    g_anim_scale_x *= 1.0f + g_anim_temperature_shiver;
    g_anim_scale_y *= 1.0f - g_anim_temperature_shiver * 0.5f;
  }

  // Ground adaptation (slope detection and foot placement)
  float sampleOffset = 0.02f;
  float baseHeight = get_terrain_elevation(g_pos_x, g_pos_y);
  float forwardHeight = get_terrain_elevation(
      g_pos_x + g_face_x * sampleOffset,
      g_pos_y + g_face_y * sampleOffset);
  float slope = (forwardHeight - baseHeight) / sampleOffset;
  g_anim_ground_adapt = slope * 50.0f; // Scale to animation units
}


