/**
 * TypeScript definitions for Deterministic Game module
 */

export interface DeterministicGameConfig {
  fixedTimestep?: number
  maxEntities?: number
  seed?: number
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'none'
}

export interface GameEntity {
  id: number
  type: string
  alive: boolean
  [key: string]: any
}

export interface GamePlayer {
  id: string
  entityId: number
  score: number
  lives: number
  input: {
    left: boolean
    right: boolean
    up: boolean
    down: boolean
    action: boolean
  }
}

export interface RenderState {
  frame: number
  entities: Array<GameEntity & { x: number; y: number }>
  players: Array<{ id: string; score: number; lives: number }>
}

export class DeterministicRandom {
  constructor(seed?: number)
  next(): number
  nextFloat(): number
  nextInt(min: number, max: number): number
  reset(seed?: number): void
  save(): { seed: number; current: number }
  load(state: { seed: number; current: number }): void
}

export class DeterministicGame {
  constructor(config?: DeterministicGameConfig)
  
  // Properties
  frame: number
  entities: Map<number, GameEntity>
  players: Map<string, GamePlayer>
  random: DeterministicRandom
  
  // Methods
  initialize(players: string[]): void
  createPlayer(playerId: string): void
  createEntity(id: number | null, type: string, data?: any): GameEntity
  destroyEntity(entityId: number): void
  advanceFrame(inputs: Map<string, any>): void
  saveState(): any
  loadState(state: any): void
  getChecksum(): number
  getRenderState(): RenderState
  
  // Override these in implementation
  onInitialize(): void
  onPlayerAction(playerId: string, player: GamePlayer): void
  onCollision(entity1: GameEntity, entity2: GameEntity): void
  updateGameLogic(): void
  onSaveState(): any
  onLoadState(state: any): void
  onGetChecksum(): number
}

// Fixed-point math utilities
export function toFixed(n: number): number
export function fromFixed(n: number): number
export function fixedAdd(a: number, b: number): number
export function fixedSub(a: number, b: number): number
export function fixedMul(a: number, b: number): number
export function fixedDiv(a: number, b: number): number
export function fixedSqrt(n: number): number
export function fixedSin(angle: number): number
export function fixedCos(angle: number): number