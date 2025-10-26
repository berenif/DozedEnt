#!/usr/bin/env node
/**
 * Verifies required wolf-related WASM exports exist (phased).
 * Usage:
 *   node tools/scripts/verify-wolf-exports.js <wasmPath> --phase core|advanced|complete
 * Defaults:
 *   wasmPath: public/wasm/game.wasm
 *   phase: core
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
let wasmPath = args.find(a => !a.startsWith('--')) || 'public/wasm/game.wasm';
const phaseArg = (args.find(a => a.startsWith('--phase=')) || '--phase=core').split('=')[1];

if (!fs.existsSync(wasmPath)) {
  console.error(`WASM not found at ${wasmPath}`);
  process.exit(1);
}

const mustHaveCore = [
  // Phase 1A: core wolf state (5)
  '_get_wolf_health',
  '_get_wolf_state',
  '_get_wolf_emotion',
  '_get_wolf_x',
  '_get_wolf_y',
  // Phase 1B: pack basics (3)
  '_get_pack_count',
  '_get_pack_plan',
  '_get_pack_morale',
];

const mustHaveAdvanced = [
  // Phase 2A: terrain (4)
  '_get_terrain_feature_count',
  '_get_terrain_feature_x',
  '_get_terrain_feature_y',
  '_get_terrain_feature_type',
  // Phase 2B: advanced wolf state (10)
  '_get_wolf_aggression',
  '_get_wolf_morale',
  '_get_wolf_stamina',
  '_get_wolf_pack_id',
  '_get_wolf_pack_role',
  '_get_wolf_limp_severity',
  '_get_wolf_facing_x',
  '_get_wolf_facing_y',
  '_get_pack_wolf_count',
  '_get_pack_leader_index',
];

const mustHaveComplete = [
  // Phase 3: performance metrics (8)
  '_get_wolf_body_stretch',
  '_get_wolf_head_yaw',
  '_get_wolf_tail_wag',
  '_get_wolf_attack_success_rate',
  '_get_pack_coordination_bonus',
  '_get_player_skill_estimate',
  '_get_wolf_message_count',
  '_get_wolf_last_message_type',
];

const phases = {
  core: mustHaveCore,
  advanced: [...mustHaveCore, ...mustHaveAdvanced],
  complete: [...mustHaveCore, ...mustHaveAdvanced, ...mustHaveComplete],
};

const required = phases[phaseArg] || phases.core;
const buf = fs.readFileSync(wasmPath);
const haystack = buf.toString('binary');

function hasExport(sym) {
  const noUnderscore = sym.replace(/^_/, '');
  return haystack.includes(sym) || haystack.includes(noUnderscore);
}

const missing = required.filter(sym => !hasExport(sym));
if (missing.length) {
  console.error(`Missing ${missing.length} required exports (${phaseArg}):`);
  missing.forEach(m => console.error(` - ${m}`));
  process.exit(2);
}

console.log(`✅ All ${required.length} required wolf exports present for phase '${phaseArg}'.`);
process.exit(0);


