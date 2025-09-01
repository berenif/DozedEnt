// Choice scaffolding for run loop
#pragma once

struct Choice { unsigned int id; unsigned char type; unsigned char rarity; unsigned int tags; };

static Choice g_choices[3];
static unsigned char g_choice_count = 0;
static int g_non_rare_choice_streak = 0;

static inline Choice roll_choice(unsigned int index) {
  Choice c; c.id = rng_u32(); c.type = (unsigned char)index; c.rarity = (unsigned char)(rng_u32() % 3); c.tags = (1u << (rng_u32() % 8)); return c;
}

static inline void apply_pity_timer_to_choices() {
  bool anyRare = false; for (int i = 0; i < (int)g_choice_count; ++i) { if (g_choices[i].rarity >= 2) { anyRare = true; break; } }
  if (!anyRare) { g_non_rare_choice_streak += 1; if (g_non_rare_choice_streak >= 2) { int idx = (int)(rng_u32() % (g_choice_count ? g_choice_count : 1)); g_choices[idx].rarity = 2; g_non_rare_choice_streak = 0; } }
  else { g_non_rare_choice_streak = 0; }
}

static void generate_choices() {
  g_choice_count = 3; for (int i = 0; i < 3; ++i) { g_choices[i] = roll_choice((unsigned int)i); } apply_pity_timer_to_choices();
}


