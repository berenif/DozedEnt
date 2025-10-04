// Test setup file for Mocha
import { describe, it, before, after, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { setupBrowserMocks } from './setup-browser-mocks.js';

// Global test utilities
global.describe = describe;
global.it = it;
global.before = before;
global.after = after;
global.beforeEach = beforeEach;
global.afterEach = afterEach;
global.expect = expect;
global.sinon = sinon;

// Setup comprehensive browser API mocks
setupBrowserMocks();

// Test helpers
global.createMockContext = () => ({
  save: sinon.stub(),
  restore: sinon.stub(),
  translate: sinon.stub(),
  rotate: sinon.stub(),
  scale: sinon.stub(),
  beginPath: sinon.stub(),
  arc: sinon.stub(),
  fill: sinon.stub(),
  stroke: sinon.stub(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  globalAlpha: 1
});

global.createMockWasmModule = () => ({
  // Core simulation functions
  init_run: sinon.stub(),
  reset_run: sinon.stub(),
  update: sinon.stub(),
  get_x: sinon.stub().returns(0.5),
  get_y: sinon.stub().returns(0.5),
  get_stamina: sinon.stub().returns(100),
  get_phase: sinon.stub().returns(0),
  get_room_count: sinon.stub().returns(1),
  on_attack: sinon.stub().returns(1),
  on_roll_start: sinon.stub().returns(1),
  set_blocking: sinon.stub().returns(1),
  get_block_state: sinon.stub().returns(0),
  handle_incoming_attack: sinon.stub().returns(0),

  // Game loop & state management
  get_choice_count: sinon.stub().returns(3),
  get_choice_id: sinon.stub().returns(1),
  get_choice_type: sinon.stub().returns(0),
  get_choice_rarity: sinon.stub().returns(1),
  get_choice_tags: sinon.stub().returns(0),
  commit_choice: sinon.stub(),
  generate_choices: sinon.stub(),

  // Risk phase functions
  get_curse_count: sinon.stub().returns(0),
  get_curse_type: sinon.stub().returns(0),
  get_curse_intensity: sinon.stub().returns(0),
  get_risk_multiplier: sinon.stub().returns(1.0),
  get_elite_active: sinon.stub().returns(0),
  escape_risk: sinon.stub(),

  // Escalate phase functions
  get_escalation_level: sinon.stub().returns(0),
  get_spawn_rate_modifier: sinon.stub().returns(1.0),
  get_miniboss_active: sinon.stub().returns(0),
  get_miniboss_x: sinon.stub().returns(0.5),
  get_miniboss_y: sinon.stub().returns(0.5),
  damage_miniboss: sinon.stub(),

  // CashOut phase functions
  get_gold: sinon.stub().returns(0),
  get_essence: sinon.stub().returns(0),
  get_shop_item_count: sinon.stub().returns(0),
  buy_shop_item: sinon.stub(),
  buy_heal: sinon.stub(),
  reroll_shop_items: sinon.stub(),

  // Wolf-specific functions
  get_wolf_count: sinon.stub().returns(0),
  get_wolf_x: sinon.stub().returns(0.5),
  get_wolf_y: sinon.stub().returns(0.5),
  get_wolf_state: sinon.stub().returns(0),
  get_wolf_health: sinon.stub().returns(100),
  get_wolf_stamina: sinon.stub().returns(100),
  get_wolf_velocity_x: sinon.stub().returns(0),
  get_wolf_velocity_y: sinon.stub().returns(0),
  get_wolf_facing: sinon.stub().returns(1),
  get_wolf_animation_frame: sinon.stub().returns(0),
  get_wolf_animation_time: sinon.stub().returns(0),
  get_wolf_lunge_state: sinon.stub().returns(0),
  get_wolf_pack_formation_x: sinon.stub().returns(0),
  get_wolf_pack_formation_y: sinon.stub().returns(0),
  get_wolf_pack_formation_angle: sinon.stub().returns(0),
  get_wolf_detection_range: sinon.stub().returns(300),
  get_wolf_attack_range: sinon.stub().returns(50),
  get_wolf_damage: sinon.stub().returns(15),
  get_wolf_type: sinon.stub().returns(0),
  get_wolf_size: sinon.stub().returns(1.0),
  get_wolf_fur_pattern: sinon.stub().returns(0.5),
  get_wolf_colors: sinon.stub().returns(0),
  get_wolf_howl_cooldown: sinon.stub().returns(0),
  get_wolf_last_howl_time: sinon.stub().returns(0),
  get_wolf_ai_state: sinon.stub().returns(0),
  get_wolf_target_x: sinon.stub().returns(0),
  get_wolf_target_y: sinon.stub().returns(0),
  get_wolf_memory_count: sinon.stub().returns(0),
  get_wolf_emotion_state: sinon.stub().returns(0),
  get_wolf_pack_role: sinon.stub().returns(0),
  get_wolf_terrain_awareness: sinon.stub().returns(0),
  get_wolf_communication_state: sinon.stub().returns(0),
  get_wolf_adaptive_difficulty: sinon.stub().returns(1.0),
  get_wolf_performance_metrics: sinon.stub().returns(0),

  // Memory management
  memory: {
    buffer: new ArrayBuffer(1024),
    grow: sinon.stub().returns(1024)
  },

  // Instance methods
  _malloc: sinon.stub().returns(0),
  _free: sinon.stub(),
  _get_string: sinon.stub().returns('test'),
  _set_string: sinon.stub()
});

console.log('Test setup loaded successfully');
