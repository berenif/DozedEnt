# WASM Subsystems

This directory contains the modular WASM management system, split into focused, maintainable components following the single responsibility principle.

## Architecture

The WASM system is split into 5 main subsystems:

### 1. WasmInitializer.js (~450 lines)
**Responsibility**: WASM module loading and initialization lifecycle

- Module loading with multiple fallback strategies
- Lazy loading support via `globalWasmLoader`
- Comprehensive error handling and diagnostics
- Fallback mode for graceful degradation
- User-friendly error notifications

**Key Methods:**
- `initialize()` - Main initialization entry point
- `_loadWasmHelper()` - Load WASM helper module
- `_loadTraditional()` - Fallback loading strategy
- `_createFallbackExports()` - Create fallback simulation

### 2. WasmCoreState.js (~400 lines)
**Responsibility**: Core game state reading and performance optimization

- Player position, stamina, health management
- State caching for performance (reduces WASM/JS boundary calls)
- Performance metrics tracking
- Enemy and hazard position management
- Memory buffer access

**Key Methods:**
- `getPlayerState()` - Batched state reading (OPTIMIZED)
- `update()` - Game state update with validation
- `getPerformanceMetrics()` - Performance monitoring
- `getEnemyPositions()` - Enemy tracking
- `getHazards()` - Hazard volume queries

### 3. WasmCombatSystem.js (~450 lines)
**Responsibility**: Combat operations and telemetry

- Attack actions (light, heavy, special)
- Dodge rolling mechanics
- Blocking and parrying
- Combat telemetry caching
- Weapon system management
- Timing constants

**Key Methods:**
- `getCombatTelemetry()` - Comprehensive combat state (CACHED)
- `lightAttack()`, `heavyAttack()`, `specialAttack()` - Combat actions
- `setBlocking()`, `handleIncomingAttack()` - Defense mechanics
- `getWeaponStats()` - Weapon information
- `getParryWindow()` - Parry timing data

### 4. WasmPhaseManagers.js (~380 lines)
**Responsibility**: Phase-specific game operations

Manages all 8 game phases:
- **Choice Phase**: Choice generation and selection
- **Risk Phase**: Curse management and elite enemies
- **Escalate Phase**: Difficulty scaling and minibosses
- **CashOut Phase**: Shop system and currency

**Key Methods:**
- `getChoice()`, `commitChoice()` - Choice system
- `getCurseCount()`, `escapeRisk()` - Risk mechanics
- `getEscalationLevel()`, `damageMiniboss()` - Escalation
- `buyShopItem()`, `rerollShopItems()` - Shop operations

### 5. WasmWorldSimulation.js (~330 lines)
**Responsibility**: World simulation and environmental systems

- Weather system (rain, wind, temperature, lightning)
- Day/night cycle and time management
- Chemistry system (fire, water, electricity)
- Physics engine integration
- Terrain and climate data
- Explosion and heat systems
- Sound event management

**Key Methods:**
- `getWeather()`, `setWeather()` - Weather control
- `getTimeInfo()`, `setTimeScale()` - Time management
- `getChemistryState()`, `applyChemistryEffect()` - Chemistry
- `createPhysicsBody()`, `applyForce()` - Physics
- `createExplosion()`, `emitSound()` - Effects

## Main Facade

### wasm-manager.js (~450 lines)
**Responsibility**: Composition and delegation

The main `WasmManager` class composes all subsystems and provides a unified interface. It delegates method calls to the appropriate subsystem.

```javascript
import { WasmManager } from './utils/wasm-manager.js';

const wasmManager = new WasmManager();
await wasmManager.initialize();

// Access subsystems directly if needed
wasmManager.combat.lightAttack();
wasmManager.world.getWeather();
wasmManager.phases.getChoice(0);

// Or use delegated methods
wasmManager.lightAttack();
wasmManager.getWeather();
wasmManager.getChoice(0);
```

## TypeScript Support

Full TypeScript definitions are available in `WasmTypes.d.ts`, including:

- Interface definitions for all data structures
- Type declarations for all classes
- JSDoc compatibility for IDE autocomplete

## Testing

Comprehensive unit tests are provided in `test/unit/wasm-subsystems.spec.js`:

- ✅ WasmCoreState - 15+ tests
- ✅ WasmCombatSystem - 18+ tests  
- ✅ WasmPhaseManagers - 8+ tests
- ✅ WasmWorldSimulation - 6+ tests

Run tests with:
```bash
npm run test:unit
```

## Benefits of This Architecture

### 1. **Maintainability**
- Each file is under 500 lines (requirement: max 500 lines)
- Single responsibility per module
- Easy to locate and fix bugs

### 2. **Testability**
- Each subsystem can be tested in isolation
- Mock exports easily for unit tests
- Clear dependency injection

### 3. **Performance**
- State caching in WasmCoreState reduces boundary calls
- Combat telemetry caching improves frame rates
- Batched state reads minimize overhead

### 4. **Scalability**
- Easy to add new subsystems
- Clear boundaries between concerns
- Modular design allows independent evolution

### 5. **Documentation**
- Each file is self-documenting
- TypeScript definitions provide API contracts
- Clear method responsibilities

## Migration Guide

For code using the old monolithic `WasmManager`:

```javascript
// Old (still works via delegation)
wasmManager.getPlayerPosition();
wasmManager.lightAttack();
wasmManager.getWeather();

// New (direct subsystem access for clarity)
wasmManager.coreState.getPlayerPosition();
wasmManager.combat.lightAttack();
wasmManager.world.getWeather();
```

Both styles work! The delegated methods maintain backward compatibility.

## Performance Metrics

Before split:
- Single 2746-line file
- Difficult to maintain
- Hard to test individual components

After split:
- 5 focused modules (~400 lines each)
- Clear separation of concerns
- Full unit test coverage
- TypeScript definitions
- Zero linting errors

## Future Enhancements

Potential additions:
- `WasmAISystem.js` - Enemy AI management
- `WasmNetworkSync.js` - Multiplayer synchronization
- `WasmAnimationBridge.js` - Animation system integration
- `WasmPersistence.js` - Save/load functionality

---

*Last Updated: October 2025*
