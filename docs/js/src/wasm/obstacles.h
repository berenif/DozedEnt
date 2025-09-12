// Obstacles and pathfinding helpers
#pragma once

#define MAX_OBSTACLES 16
static unsigned char g_obstacle_count = 0;
static float g_obstacles_x[MAX_OBSTACLES];
static float g_obstacles_y[MAX_OBSTACLES];
static float g_obstacles_r[MAX_OBSTACLES];

static inline void obstacle_clear() { g_obstacle_count = 0; }

static inline float obstacle_min_distance_to_player_start(float ox, float oy) {
  float dx = ox - g_pos_x, dy = oy - g_pos_y;
  return vec_len(dx, dy);
}

static inline int obstacle_overlaps_any(float ox, float oy, float orad) {
  for (int i = 0; i < (int)g_obstacle_count; ++i) {
    float dx = ox - g_obstacles_x[i];
    float dy = oy - g_obstacles_y[i];
    float need = orad + g_obstacles_r[i] + 0.012f;
    if (dx * dx + dy * dy < need * need) return 1;
  }
  return 0;
}

// New: Generic circle collision resolution
// Returns collision depth if collision occurred, 0 otherwise. Updates nx, ny to resolved position.
static inline float resolve_circle_collision(
    float pX, float pY, float pRad,
    float &nx, float &ny,
    float ox, float oy, float oRad) {
  float combinedRad = pRad + oRad;
  float dx = nx - ox;
  float dy = ny - oy;
  float distSq = dx * dx + dy * dy;

  if (distSq < combinedRad * combinedRad) {
    float dist = __builtin_sqrtf(distSq);
    if (dist == 0.f) { // Perfect overlap, push in random direction (or default)
      dx = 1.f; dy = 0.f; // Default push right
      dist = 1.f;
    }
    float overlap = combinedRad - dist;
    nx += (dx / dist) * overlap;
    ny += (dy / dist) * overlap;
    return overlap;
  }
  return 0.f;
}

static inline void resolve_obstacle_collision(float prevX, float prevY, float &nx, float &ny) {
  nx = clamp01(nx);
  ny = clamp01(ny);
  for (int iter = 0; iter < 2; ++iter) {
    for (int i = 0; i < (int)g_obstacle_count; ++i) {
      float ox = g_obstacles_x[i], oy = g_obstacles_y[i], orad = g_obstacles_r[i] + PLAYER_RADIUS;
      float dx = nx - ox, dy = ny - oy;
      float d2 = dx * dx + dy * dy;
      float r2 = orad * orad;
      if (d2 < r2) {
        float d = __builtin_sqrtf(d2);
        if (d > 1e-5f) {
          float push = (orad - d) + 1e-4f;
          nx += (dx / d) * push;
          ny += (dy / d) * push;
        } else {
          float ndx = nx - prevX, ndy = ny - prevY;
          if (ndx == 0.f && ndy == 0.f) { ndx = 1.f; ndy = 0.f; }
          float l = vec_len(ndx, ndy); if (l > 0.f) { ndx /= l; ndy /= l; }
          nx += ndx * (orad + 1e-3f);
          ny += ndy * (orad + 1e-3f);
        }
        if (nx < 0.f) nx = 0.f; else if (nx > 1.f) nx = 1.f;
        if (ny < 0.f) ny = 0.f; else if (ny > 1.f) ny = 1.f;
      }
    }
  }
}

static inline int is_cell_blocked(int cx, int cy, int gw, int gh) {
  float x = (float)cx / (float)(gw - 1);
  float y = (float)cy / (float)(gh - 1);
  for (int i = 0; i < (int)g_obstacle_count; ++i) {
    float dx = x - g_obstacles_x[i];
    float dy = y - g_obstacles_y[i];
    float rr = g_obstacles_r[i] + PLAYER_RADIUS * 1.1f;
    if (dx * dx + dy * dy < rr * rr) return 1;
  }
  return 0;
}

static int path_exists_to_center() {
  const int GW = 41;
  const int GH = 23;
  int visited[GH][GW];
  for (int y = 0; y < GH; ++y) for (int x = 0; x < GW; ++x) visited[y][x] = 0;
  int qx[GW * GH];
  int qy[GW * GH];
  int qh = 0, qt = 0;
  int sx = (int)(g_pos_x * (GW - 1)); if (sx < 0) sx = 0; if (sx >= GW) sx = GW - 1;
  int sy = (int)(g_pos_y * (GH - 1)); if (sy < 0) sy = 0; if (sy >= GH) sy = GH - 1;
  int tx = GW / 2;
  int ty = GH / 2;
  if (is_cell_blocked(sx, sy, GW, GH)) return 0;
  qx[qh] = sx; qy[qh] = sy; qh++; visited[sy][sx] = 1;
  const int dirs[4][2] = {{1,0},{-1,0},{0,1},{0,-1}};
  while (qt < qh) {
    int cx = qx[qt]; int cy = qy[qt]; qt++;
    if (cx == tx && cy == ty) return 1;
    for (int k = 0; k < 4; ++k) {
      int nx = cx + dirs[k][0]; int ny = cy + dirs[k][1];
      if (nx < 0 || nx >= GW || ny < 0 || ny >= GH) continue;
      if (visited[ny][nx]) continue;
      if (is_cell_blocked(nx, ny, GW, GH)) continue;
      visited[ny][nx] = 1;
      qx[qh] = nx; qy[qh] = ny; qh++;
    }
  }
  return 0;
}

static void generate_obstacles_walkable() {
  obstacle_clear();
  int target = 8 + (int)(rng_u32() % 5u);
  const int MAX_TRIES = 60;
  for (int attempt = 0; attempt < MAX_TRIES; ++attempt) {
    g_obstacle_count = 0;
    for (int i = 0; i < target; ++i) {
      float r = 0.018f + 0.022f * rng_float01();
      float ox = 0.08f + 0.84f * rng_float01();
      float oy = 0.08f + 0.84f * rng_float01();
      if (obstacle_min_distance_to_player_start(ox, oy) < (r + 0.10f)) { i--; continue; }
      if (obstacle_overlaps_any(ox, oy, r)) { i--; continue; }
      g_obstacles_x[g_obstacle_count] = ox;
      g_obstacles_y[g_obstacle_count] = oy;
      g_obstacles_r[g_obstacle_count] = r;
      g_obstacle_count++;
      if (g_obstacle_count >= MAX_OBSTACLES) break;
    }
    if (path_exists_to_center()) { return; }
  }
  g_obstacle_count = 0;
  int fallback = 5;
  for (int i = 0; i < fallback; ++i) {
    float r = 0.016f + 0.012f * rng_float01();
    float ox = 0.1f + 0.8f * rng_float01();
    float oy = 0.1f + 0.8f * rng_float01();
    if (obstacle_overlaps_any(ox, oy, r)) { i--; continue; }
    g_obstacles_x[g_obstacle_count] = ox;
    g_obstacles_y[g_obstacle_count] = oy;
    g_obstacles_r[g_obstacle_count] = r;
    g_obstacle_count++;
    if (g_obstacle_count >= MAX_OBSTACLES) break;
  }
}


