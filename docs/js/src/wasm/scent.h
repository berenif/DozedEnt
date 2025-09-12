// Scent field grid, advection, decay, gradient
#pragma once

static const int SCENT_W = 48;
static const int SCENT_H = 27;
static float g_scent[SCENT_H][SCENT_W];
static float g_scent_tmp[SCENT_H][SCENT_W];
static const float SCENT_DECAY_PER_SEC = 0.35f;
static const float SCENT_EMIT_PER_SEC = 2.2f;
static const float SCENT_ADVECT_CELLS_PER_SEC = 6.0f;

static inline void scent_clear() {
  for (int y = 0; y < SCENT_H; ++y) for (int x = 0; x < SCENT_W; ++x) g_scent[y][x] = 0.f;
}

static inline void scent_deposit_at(float xNorm, float yNorm, float dt) {
  int ix = (int)(xNorm * (SCENT_W - 1)); if (ix < 0) ix = 0; if (ix >= SCENT_W) ix = SCENT_W - 1;
  int iy = (int)(yNorm * (SCENT_H - 1)); if (iy < 0) iy = 0; if (iy >= SCENT_H) iy = SCENT_H - 1;
  g_scent[iy][ix] += SCENT_EMIT_PER_SEC * dt;
  if (g_scent[iy][ix] > 1.f) g_scent[iy][ix] = 1.f;
}

static inline void scent_step(float dt) {
  if (dt <= 0.f) return;
  const float shiftX = -g_wind_x * SCENT_ADVECT_CELLS_PER_SEC * dt;
  const float shiftY = -g_wind_y * SCENT_ADVECT_CELLS_PER_SEC * dt;
  for (int y = 0; y < SCENT_H; ++y) {
    for (int x = 0; x < SCENT_W; ++x) {
      float srcX = (float)x + shiftX;
      float srcY = (float)y + shiftY;
      int x0 = (int)srcX; int y0 = (int)srcY;
      float fx = srcX - (float)x0; float fy = srcY - (float)y0;
      if (x0 < 0) { x0 = 0; fx = 0.f; } if (x0 >= SCENT_W - 1) { x0 = SCENT_W - 2; fx = 1.f; }
      if (y0 < 0) { y0 = 0; fy = 0.f; } if (y0 >= SCENT_H - 1) { y0 = SCENT_H - 2; fy = 1.f; }
      float v00 = g_scent[y0][x0];
      float v10 = g_scent[y0][x0 + 1];
      float v01 = g_scent[y0 + 1][x0];
      float v11 = g_scent[y0 + 1][x0 + 1];
      float vx0 = v00 + (v10 - v00) * fx;
      float vx1 = v01 + (v11 - v01) * fx;
      float v = vx0 + (vx1 - vx0) * fy;
      g_scent_tmp[y][x] = v;
    }
  }
  const float decay = 1.f - (SCENT_DECAY_PER_SEC * dt);
  for (int y = 0; y < SCENT_H; ++y) {
    for (int x = 0; x < SCENT_W; ++x) {
      float v = g_scent_tmp[y][x] * decay;
      g_scent[y][x] = (v < 0.f ? 0.f : (v > 1.f ? 1.f : v));
    }
  }
  scent_deposit_at(g_pos_x, g_pos_y, dt);
}

static inline void scent_gradient_at(float xNorm, float yNorm, float &gx, float &gy) {
  int ix = (int)(xNorm * (SCENT_W - 1)); if (ix < 1) ix = 1; if (ix > SCENT_W - 2) ix = SCENT_W - 2;
  int iy = (int)(yNorm * (SCENT_H - 1)); if (iy < 1) iy = 1; if (iy > SCENT_H - 2) iy = SCENT_H - 2;
  float left = g_scent[iy][ix - 1];
  float right = g_scent[iy][ix + 1];
  float down = g_scent[iy + 1][ix];
  float up = g_scent[iy - 1][ix];
  gx = right - left;
  gy = down - up;
  normalize(gx, gy);
}


