/**
 * TypeScript type definitions for WASM subsystems
 */

// ========== Common Types ==========

export interface Position2D {
  x: number;
  y: number;
}

export interface Position3D extends Position2D {
  z: number;
}

export interface WasmExports {
  memory?: WebAssembly.Memory;
  start?: () => void;
  init_run?: (seed: bigint, weapon: number) => void;
  reset_run?: (seed: bigint) => void;
  update?: (dirX: number, dirY: number, isRolling: number, deltaTime: number) => void;
  set_player_input?: (inputX: number, inputY: number, isRolling: number, isJumping: number, 
                      lightAttack: number, heavyAttack: number, isBlocking: number, special: number) => void;
  get_x?: () => number;
  get_y?: () => number;
  get_stamina?: () => number;
  get_hp?: () => number;
  get_phase?: () => number;
  // ... many more exports
  [key: string]: any;
}

// ========== Initializer Types ==========

export interface InitializationResult {
  success: boolean;
  fallbackMode: boolean;
  loadTime: number;
  wasmPath?: string;
  error?: string;
}

export interface LoadAttempt {
  url: string;
  success: boolean;
  loadTime: number | null;
  error: {
    message: string;
    name: string;
    stack?: string;
  } | null;
}

export declare class WasmInitializer {
  exports: WasmExports | null;
  isLoaded: boolean;
  isFallbackMode: boolean;
  runSeed: bigint;
  errorCount: number;

  constructor();
  
  initialize(): Promise<boolean>;
}

// ========== Core State Types ==========

export interface PlayerState {
  x: number;
  y: number;
  stamina: number;
  phase: number;
  health: number;
  gold: number;
  essence: number;
  velX?: number;
  velY?: number;
  isRolling?: number;
  isBlocking?: number;
  animState?: number;
}

export interface PerformanceMetrics {
  wasmCallCount: number;
  totalWasmTime: number;
  avgFrameTime: number;
  lastFrameTime: number;
  _lastMetricsUpdate: number;
  _metricsUpdateInterval: number;
}

export interface StatusEffect {
  icon: string;
  name: string;
  description: string;
  duration: number;
  type: string;
}

export interface Hazard {
  type: number;
  x: number;
  y: number;
  radius: number;
  intensity: number;
}

export declare class WasmCoreState {
  exports: WasmExports | null;
  isLoaded: boolean;

  constructor(exports: WasmExports | null);
  
  setExports(exports: WasmExports): void;
  update(dirX: number, dirY: number, isRolling: boolean, deltaTime: number): void;
  getPlayerPosition(): Position2D;
  getPlayerState(): PlayerState;
  getX(): number;
  getY(): number;
  getStamina(): number;
  getHP(): number;
  getMaxHP(): number;
  getPhase(): number;
  getRoomCount(): number;
  getCurrentBiome(): number;
  isRolling(): boolean;
  getEnemyPositions(): Position2D[];
  getExitPositions(): Position2D[];
  getStatusEffects(): StatusEffect[];
  getHazards(): Hazard[];
  getWolfCount(): number;
  getMemoryBuffer(): ArrayBuffer;
  getMemorySize(): number;
  getPerformanceMetrics(): PerformanceMetrics;
  resetPerformanceMetrics(): void;
}

// ========== Combat System Types ==========

export interface TimingConstants {
  rollDuration: number;
  rollCooldown: number;
  attackCooldown: number;
}

export interface CombatTelemetry {
  comboCount: number;
  comboWindowRemaining: number;
  parryWindow: number;
  counterWindowRemaining: number;
  canCounter: boolean;
  hyperarmorActive: boolean;
  armorValue: number;
  isBlocking: boolean;
  isRolling: boolean;
  rollState: number;
  rollTime: number;
  isInvulnerable: boolean;
  isStunned: boolean;
  stunRemaining: number;
  statusEffectCount: number;
  statusMovementModifier: number;
  statusDamageModifier: number;
  statusDefenseModifier: number;
  nearWall: boolean;
  wallDistance: number;
  nearLedge: boolean;
  ledgeDistance: number;
  speed: number;
  weaponHasHyperarmor: boolean;
  weaponHasFlowCombo: boolean;
  weaponHasBashSynergy: boolean;
  timestamp: number;
}

export interface WeaponInfo {
  type: number;
  character: number;
  weaponName: string;
  characterName: string;
}

export interface WeaponStats {
  damage: number;
  speed: number;
  reach: number;
  hasHyperarmor: boolean;
  hasFlowCombo: boolean;
  hasBashSynergy: boolean;
}

export declare class WasmCombatSystem {
  exports: WasmExports | null;
  isLoaded: boolean;
  timingConstants: TimingConstants;

  constructor(exports: WasmExports | null);
  
  setExports(exports: WasmExports): void;
  getTimingConstants(): TimingConstants;
  attack(): boolean;
  onAttack(): number;
  lightAttack(): boolean;
  heavyAttack(): boolean;
  specialAttack(): boolean;
  startRoll(): boolean;
  onRollStart(): number;
  setBlocking(isBlocking: boolean, faceX: number, faceY: number): boolean;
  isBlocking(): boolean;
  handleIncomingAttack(ax: number, ay: number, dirX: number, dirY: number): number;
  getParryWindow(): number;
  getCombatTelemetry(): CombatTelemetry;
  getCurrentWeapon(): WeaponInfo;
  setCharacterAndWeapon(character: number, weapon: number): void;
  getWeaponStats(): WeaponStats;
}

// ========== Phase Managers Types ==========

export interface Choice {
  id: number;
  type: number;
  rarity: number;
  tags: number;
}

export declare class WasmPhaseManagers {
  exports: WasmExports | null;
  isLoaded: boolean;

  constructor(exports: WasmExports | null);
  
  setExports(exports: WasmExports): void;
  
  // Choice system
  getChoiceCount(): number;
  getChoiceId(index: number): number;
  getChoiceType(index: number): number;
  getChoiceRarity(index: number): number;
  getChoiceTags(index: number): number;
  getChoice(index: number): Choice | null;
  commitChoice(choiceId: number): void;
  generateChoices(): void;
  
  // Risk phase
  getCurseCount(): number;
  getCurseType(index: number): number;
  getCurseIntensity(index: number): number;
  getRiskMultiplier(): number;
  getEliteActive(): boolean;
  escapeRisk(): void;
  
  // Escalate phase
  getEscalationLevel(): number;
  getSpawnRateModifier(): number;
  getMinibossActive(): boolean;
  getMinibossX(): number;
  getMinibossY(): number;
  damageMiniboss(amount: number): void;
  
  // CashOut phase
  getGold(): number;
  getEssence(): number;
  getShopItemCount(): number;
  buyShopItem(index: number): void;
  buyHeal(): void;
  rerollShopItems(): void;
  exitCashout(): void;
}

// ========== World Simulation Types ==========

export interface Weather {
  rain: number;
  windSpeed: number;
  temperature: number;
  lightning: boolean;
}

export interface TimeInfo {
  timeOfDay: number;
  dayCount: number;
  isBloodMoon: boolean;
  lightLevel: number;
  isNight: boolean;
}

export interface ChemistryState {
  states: number;
  temperature: number;
  fuel: number;
  fireIntensity?: number;
  waterIntensity?: number;
  electricIntensity?: number;
}

export interface TerrainInfo {
  elevation: number;
  moisture: number;
  climateZone: number;
}

export interface Explosion {
  id: number;
  x: number;
  y: number;
  z: number;
  radius: number;
}

export interface SoundEvent {
  x: number;
  y: number;
  volume: number;
}

export declare class WasmWorldSimulation {
  exports: WasmExports | null;
  isLoaded: boolean;

  constructor(exports: WasmExports | null);
  
  setExports(exports: WasmExports): void;
  
  // Weather
  getWeather(): Weather;
  setWeather(weather: Partial<Weather>): void;
  
  // Time
  getTimeInfo(): TimeInfo;
  setTimeScale(scale: number): void;
  
  // Chemistry
  getChemistryState(x: number, y: number): ChemistryState;
  applyChemistryEffect(effect: string, x: number, y: number, radius: number, intensity: number): void;
  
  // Terrain
  getTerrainInfo(x: number, y: number): TerrainInfo;
  
  // Physics
  createPhysicsBody(x: number, y: number, z: number, mass: number, radius: number): number;
  getPhysicsBodyPosition(bodyId: number): Position3D;
  applyForce(bodyId: number, fx: number, fy: number, fz: number): void;
  
  // Explosions
  createExplosion(x: number, y: number, z: number, radius: number, force: number, speed?: number): number;
  getExplosions(): Explosion[];
  
  // Heat
  createHeatSource(x: number, y: number, z: number, temperature: number, radius: number): number;
  
  // Sound
  emitSound(x: number, y: number, z: number, volume: number, frequency?: number): void;
  getSoundEvents(): SoundEvent[];
}

// ========== Main WASM Manager Type ==========

export declare class WasmManager {
  initializer: WasmInitializer;
  coreState: WasmCoreState;
  combat: WasmCombatSystem;
  phases: WasmPhaseManagers;
  world: WasmWorldSimulation;
  runSeed: bigint;

  constructor();
  
  get exports(): WasmExports | null;
  get isLoaded(): boolean;
  get isFallbackMode(): boolean;
  
  initialize(): Promise<boolean>;
  initRun(seed: bigint | number | string, weapon?: number): void;
  resetRun(newSeed: bigint): void;
  getRunSeed(): bigint;
  load(): Promise<boolean>;
  isFallback(): boolean;
  getDiagnostics(): object;
  
  // Delegated methods from subsystems
  // (All methods from coreState, combat, phases, world are available)
  update(dirX: number, dirY: number, isRolling: boolean, deltaTime: number): void;
  getPlayerPosition(): Position2D;
  getPlayerState(): PlayerState;
  attack(): boolean;
  getCombatTelemetry(): CombatTelemetry;
  getChoiceCount(): number;
  getWeather(): Weather;
  // ... all other delegated methods
}

export declare const globalWasmManager: WasmManager;
