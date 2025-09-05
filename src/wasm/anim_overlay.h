// Animation overlay state and computation (WASM-side, UI reads via getters)
#pragma once

#include "internal_core.h"

// Overlay values computed deterministically each update()
static float g_anim_scale_x = 1.0f;
static float g_anim_scale_y = 1.0f;
static float g_anim_rotation = 0.0f;   // radians
static float g_anim_offset_x = 0.0f;   // pixels (UI space)
static float g_anim_offset_y = 0.0f;   // pixels (UI space)
static float g_anim_pelvis_y = 0.0f;   // pixels (UI space)

static inline float tri01(float t) {
  if (t < 0.0f) t = 0.0f; else if (t > 1.0f) t = 1.0f;
  return (t < 0.5f) ? (t * 2.0f) : (1.0f - (t - 0.5f) * 2.0f);
}

static inline void update_anim_overlay_internal() {
  g_anim_scale_x = 1.0f;
  g_anim_scale_y = 1.0f;
  g_anim_rotation = 0.0f;
  g_anim_offset_x = 0.0f;
  g_anim_offset_y = 0.0f;
  g_anim_pelvis_y = 0.0f;

  float speed = vec_len(g_vel_x, g_vel_y);
  float speedN = (BASE_SPEED > 0.0f) ? (speed / BASE_SPEED) : 0.0f;
  if (speedN > 1.0f) speedN = 1.0f; if (speedN < 0.0f) speedN = 0.0f;

  if (!g_is_rolling && !g_blocking && speed > 1e-6f) {
    float nx = g_vel_x / speed;
    float lean = nx * 0.15f;
    if (lean < -0.15f) lean = -0.15f; else if (lean > 0.15f) lean = 0.15f;
    g_anim_rotation += lean;
  }

  if (!g_is_rolling) {
    float gaitRate = 1.4f;
    float cadence = gaitRate * (0.4f + 0.6f * speedN);
    float phase = g_time_seconds * cadence;
    const float TWO_PI = 6.28318530718f;
    float bob = __builtin_sinf(phase * TWO_PI) * 2.0f * speedN;
    g_anim_pelvis_y = bob;
    g_anim_offset_y += bob;
  }

  if (g_blocking) {
    g_anim_scale_y *= 0.98f;
    g_anim_offset_y += 1.0f;
  }

  {
    float rollT = (g_time_seconds - g_last_roll_time);
    if (rollT >= 0.0f && rollT <= ROLL_DURATION_SEC) {
      float norm = (ROLL_DURATION_SEC > 0.0f) ? (rollT / ROLL_DURATION_SEC) : 0.0f;
      float w = tri01(norm);
      g_anim_scale_y *= (1.0f - 0.06f * w);
      g_anim_scale_x *= (1.0f + 0.04f * w);
      float faceSign = (g_face_x >= 0.0f ? 1.0f : -1.0f);
      g_anim_rotation += faceSign * 0.12f * w;
    }
  }

  if (g_attack_state != AttackState::Idle) {
    float total = ATTACK_WINDUP_SEC + ATTACK_ACTIVE_SEC + ATTACK_RECOVERY_SEC;
    float t0 = g_attack_state_time;
    float prog = 0.0f;
    if (g_attack_state == AttackState::Windup) {
      prog = (ATTACK_WINDUP_SEC > 0.0f) ? ((g_time_seconds - t0) / ATTACK_WINDUP_SEC) : 0.0f;
      prog *= (ATTACK_WINDUP_SEC / total);
    } else if (g_attack_state == AttackState::Active) {
      float p1 = ATTACK_WINDUP_SEC / total;
      float local = (ATTACK_ACTIVE_SEC > 0.0f) ? ((g_time_seconds - t0) / ATTACK_ACTIVE_SEC) : 0.0f;
      prog = p1 + local * (ATTACK_ACTIVE_SEC / total);
    } else if (g_attack_state == AttackState::Recovery) {
      float p2 = (ATTACK_WINDUP_SEC + ATTACK_ACTIVE_SEC) / total;
      float local = (ATTACK_RECOVERY_SEC > 0.0f) ? ((g_time_seconds - t0) / ATTACK_RECOVERY_SEC) : 0.0f;
      prog = p2 + local * (ATTACK_RECOVERY_SEC / total);
    }
    if (prog < 0.3f) {
      float k = (prog / 0.3f);
      g_anim_offset_x += g_face_x * 2.0f * k;
    } else if (prog > 0.6f) {
      float k = (prog - 0.6f) / 0.4f; if (k < 0.0f) k = 0.0f; if (k > 1.0f) k = 1.0f;
      g_anim_offset_x -= g_face_x * 2.0f * k;
    }
  }
}


