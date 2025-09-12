# 🛡️ Error Handling & Edge Cases (WASM-First Architecture)

## 📋 Table of Contents
- [Overview](#overview)
- [Architecture Principles](#architecture-principles)
- [Error Handling Systems](#error-handling-systems)
- [WASM Error Recovery](#wasm-error-recovery)
- [Browser API Fallbacks](#browser-api-fallbacks)
- [Input Validation](#input-validation)
- [Network Error Recovery](#network-error-recovery)
- [Error Reporting](#error-reporting)
- [Debug Tools](#debug-tools)
- [Testing Framework](#testing-framework)
- [Best Practices](#best-practices)
- [Troubleshooting Guide](#troubleshooting-guide)

## Overview

This document defines the comprehensive error handling and edge case management system for our WASM-first multiplayer game. All error handling follows the principle of graceful degradation while maintaining deterministic gameplay and providing clear user feedback.

### 🏗️ Architecture Alignment
- **WASM-First**: Error handling preserves WASM-first architecture principles
- **Graceful Degradation**: Systems continue functioning with reduced capability when errors occur
- **User Experience**: Clear error communication without technical jargon
- **Deterministic Recovery**: Error recovery maintains game state consistency

## Architecture Principles

### 🔑 Golden Rules
1. **Never crash the game** - All errors should be caught and handled gracefully
2. **Preserve game state** - Error recovery should maintain deterministic state when possible
3. **Clear user feedback** - Users should understand what went wrong and what they can do
4. **Automatic recovery** - Systems should attempt self-recovery before requiring user intervention
5. **Comprehensive logging** - All errors should be logged with sufficient context for debugging

### ⚡ Error Handling Hierarchy
```
1. Prevention (Input validation, bounds checking)
2. Detection (Error monitoring, pattern recognition)
3. Recovery (Automatic recovery strategies)
4. Degradation (Fallback modes, reduced functionality)
5. Reporting (User notification, debug logging)
```

## Error Handling Systems

### 🎯 Core Components

#### 1. WASM Error Handler (`src/utils/game-error-handler.js`)
Handles all WASM-related errors with intelligent recovery strategies.

**Features:**
- WASM function call error recovery
- Combat interaction error handling
- Phase transition validation
- Performance monitoring
- State corruption detection

**Usage:**
```javascript
import { gameErrorHandler } from '../utils/game-error-handler.js';

// Handle WASM function error
const result = gameErrorHandler.handleWasmError('update', error, context);
if (result.action === 'reset_wasm') {
  await resetWasmModule();
}
```

#### 2. Browser API Fallbacks (`src/utils/browser-api-fallbacks.js`)
Provides graceful degradation for unsupported browser APIs.

**Supported APIs:**
- Web Audio API → Silent mode fallback
- Canvas API → DOM-based rendering fallback
- WebRTC API → Local-only mode
- Gamepad API → Keyboard-only input
- Fullscreen API → Normal window mode
- Pointer Lock API → Standard mouse handling
- WebGL API → Canvas 2D fallback

**Usage:**
```javascript
import { browserAPIFallbacks } from '../utils/browser-api-fallbacks.js';

// Check API support
const capabilities = await browserAPIFallbacks.initialize();
if (!capabilities.webAudio) {
  audioManager = browserAPIFallbacks.createFallbackAudioManager();
}
```

#### 3. Input Validator (`src/utils/input-validator.js`)
Validates and sanitizes all user input to prevent exploits and handle edge cases.

**Validation Types:**
- Movement input (bounds checking, NaN handling)
- Button states (boolean validation)
- Network messages (size limits, pattern detection)
- Combat interactions (timing validation, parameter checking)
- Phase transitions (state consistency)

**Usage:**
```javascript
import { inputValidator } from '../utils/input-validator.js';

// Validate movement input
const movement = inputValidator.validateMovement(inputX, inputY);
if (movement.blocked) {
  console.warn('Suspicious input blocked');
  return;
}
```

#### 4. Network Error Recovery (`src/utils/network-error-recovery.js`)
Handles network failures with multiple recovery strategies.

**Recovery Strategies:**
- Immediate: Ping test, current reconnect, relay switch
- Delayed: Full reconnect, peer discovery, fallback server
- Fallback: Offline mode, local simulation, error notification

**Usage:**
```javascript
import { networkErrorRecovery } from '../utils/network-error-recovery.js';

// Handle connection drop
const result = await networkErrorRecovery.handleConnectionDrop(error, context);
if (result.success) {
  console.log('Connection recovered');
}
```

#### 5. Error Reporter (`src/utils/error-reporter.js`)
Comprehensive error collection, analysis, and reporting system.

**Features:**
- Global error handling
- Error pattern analysis
- Performance monitoring
- System diagnostics
- Debug tools and UI

**Usage:**
```javascript
import { errorReporter } from '../utils/error-reporter.js';

// Report an error
errorReporter.reportError('wasm', error, { function: 'update', context });

// Access debug tools
globalThis.gameDebug.showErrorUI();
```

## WASM Error Recovery

### 🔧 Recovery Strategies

#### 1. Function-Level Recovery
```javascript
// Example: WASM update function error
if (error.function === 'update') {
  // Check delta time validity
  if (context.deltaTime > 0.1) {
    return { action: 'sanitize_input', sanitizedDeltaTime: 0.016 };
  }
  
  // Check for memory corruption
  if (error.message.includes('memory')) {
    return { action: 'reset_wasm' };
  }
  
  return { action: 'skip_frame' };
}
```

#### 2. State Validation
```javascript
// Validate WASM state after operations
const phase = wasmManager.getPhase();
if (phase > 7 || phase < 0) {
  console.error('WASM phase corrupted:', phase);
  await wasmManager.reset();
}
```

#### 3. Fallback Mode
```javascript
// When WASM fails completely, use JavaScript fallback
if (!wasmManager.isLoaded) {
  const fallbackExports = wasmManager.createFallbackExports();
  // Limited functionality but game continues
}
```

## Browser API Fallbacks

### 🎵 Web Audio API Fallback
```javascript
// Silent audio manager when Web Audio is unavailable
const fallbackAudio = {
  playSound: (id) => console.log(`Would play sound: ${id}`),
  setVolume: (volume) => console.log(`Would set volume: ${volume}`),
  isSupported: () => false
};
```

### 🎨 Canvas API Fallback
```javascript
// DOM-based rendering when Canvas is unavailable
function renderWithDOM(gameState) {
  const renderer = document.getElementById('dom-renderer');
  renderer.innerHTML = `
    <div>Player: ${gameState.playerX.toFixed(2)}, ${gameState.playerY.toFixed(2)}</div>
    <div>Stamina: ${gameState.stamina.toFixed(2)}</div>
  `;
}
```

## Input Validation

### 🛡️ Validation Layers

#### 1. Type Validation
```javascript
// Ensure inputs are correct types
const sanitizedInput = {
  x: inputValidator.sanitizeNumber(input.x, -1, 1),
  y: inputValidator.sanitizeNumber(input.y, -1, 1),
  attack: inputValidator.validateBoolean(input.attack)
};
```

#### 2. Bounds Checking
```javascript
// Clamp values to valid ranges
function clampPosition(x, y) {
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y))
  };
}
```

#### 3. Pattern Detection
```javascript
// Detect suspicious input patterns
const suspiciousPatterns = [/script/i, /eval\(/i, /<.*>/];
if (suspiciousPatterns.some(pattern => pattern.test(input))) {
  console.error('Suspicious input blocked:', input);
  return null;
}
```

## Network Error Recovery

### 🌐 Connection Resilience

#### 1. Connection Monitoring
```javascript
// Monitor connection quality
function assessConnectionQuality(pingTime) {
  if (pingTime < 100) return 'excellent';
  if (pingTime < 300) return 'good';
  if (pingTime < 1000) return 'poor';
  return 'critical';
}
```

#### 2. Automatic Reconnection
```javascript
// Exponential backoff for reconnection
function calculateBackoffDelay(attempts) {
  return Math.min(1000 * Math.pow(1.5, attempts), 30000);
}
```

#### 3. Message Queue
```javascript
// Queue messages during connection issues
const messageQueue = {
  failed: [],
  retry: async (message) => {
    try {
      await sendMessage(message);
      return true;
    } catch (error) {
      if (message.attempts < 3) {
        message.attempts++;
        setTimeout(() => this.retry(message), 1000);
      }
      return false;
    }
  }
};
```

## Error Reporting

### 📊 Error Analysis

#### 1. Error Classification
```javascript
const errorSeverity = {
  critical: ['wasm_corruption', 'memory_overflow', 'security_violation'],
  high: ['network_failure', 'api_unavailable', 'state_desync'],
  medium: ['performance_warning', 'input_validation', 'recoverable_error'],
  low: ['cosmetic_issue', 'minor_glitch', 'user_notification']
};
```

#### 2. Pattern Recognition
```javascript
// Detect recurring error patterns
function analyzeErrorPatterns(errors) {
  const patterns = new Map();
  errors.forEach(error => {
    const key = `${error.category}:${error.message}`;
    patterns.set(key, (patterns.get(key) || 0) + 1);
  });
  
  // Alert on patterns with >5 occurrences
  for (const [pattern, count] of patterns) {
    if (count > 5) {
      console.warn(`Recurring pattern: ${pattern} (${count} times)`);
    }
  }
}
```

## Debug Tools

### 🔧 Console Commands

Access debug tools via `globalThis.gameDebug`:

```javascript
// Show error report UI
gameDebug.showErrorUI();

// Get error statistics
gameDebug.errorStats();

// Export error log
gameDebug.exportErrors();

// Clear all errors
gameDebug.clearErrors();

// Enable debug mode
gameDebug.debugMode(true);

// Get system diagnostics
gameDebug.systemDiag();
```

### 🎯 Debug UI Features

- **Error Summary**: Total errors, categories, severity breakdown
- **Recent Errors**: Last 20 errors with full context
- **System Diagnostics**: Browser info, performance metrics, memory usage
- **Component Status**: Status of all error handling components
- **Export Tools**: Download error logs as JSON files

## Testing Framework

### 🧪 Error Simulation Tests

#### 1. WASM Error Tests
```javascript
describe('WASM Error Handling', () => {
  it('should handle WASM update function failure', async () => {
    // Simulate WASM update error
    mockWasm.update.throws(new Error('WASM memory error'));
    
    const result = gameErrorHandler.handleWasmError('update', error);
    expect(result.action).to.equal('reset_wasm');
  });
  
  it('should recover from corrupted WASM state', async () => {
    // Simulate corrupted phase
    mockWasm.get_phase.returns(999);
    
    const result = gameErrorHandler.validatePhaseTransition();
    expect(result.correctedPhase).to.equal(0);
  });
});
```

#### 2. Network Error Tests
```javascript
describe('Network Error Recovery', () => {
  it('should handle connection drops gracefully', async () => {
    const result = await networkErrorRecovery.handleConnectionDrop(
      new Error('Connection lost'),
      { room: mockRoom }
    );
    
    expect(result.success).to.be.true;
  });
  
  it('should queue messages during network failures', () => {
    networkErrorRecovery.queueFailedMessage(testMessage, testError);
    
    const status = networkErrorRecovery.getNetworkStatus();
    expect(status.messageQueue.failedCount).to.equal(1);
  });
});
```

#### 3. Input Validation Tests
```javascript
describe('Input Validation', () => {
  it('should sanitize malicious input', () => {
    const maliciousInput = '<script>alert("hack")</script>';
    const result = inputValidator.validateMovement(maliciousInput, 0);
    
    expect(result.blocked).to.be.true;
  });
  
  it('should handle NaN and Infinity values', () => {
    const result = inputValidator.validateMovement(NaN, Infinity);
    
    expect(result.x).to.equal(0);
    expect(result.y).to.equal(0);
  });
});
```

#### 4. Browser API Fallback Tests
```javascript
describe('Browser API Fallbacks', () => {
  it('should detect unsupported APIs', async () => {
    // Mock unsupported Web Audio
    global.AudioContext = undefined;
    
    const capabilities = await browserAPIFallbacks.initialize();
    expect(capabilities.webAudio).to.be.false;
  });
  
  it('should provide fallback audio manager', () => {
    const fallbackAudio = browserAPIFallbacks.createFallbackAudioManager();
    
    expect(fallbackAudio.isSupported()).to.be.false;
    expect(() => fallbackAudio.playSound('test')).to.not.throw();
  });
});
```

## Best Practices

### ✅ Error Handling Guidelines

#### 1. **Always Catch and Handle**
```javascript
// ❌ Bad: Uncaught error can crash game
wasmManager.update(deltaTime);

// ✅ Good: Caught and handled gracefully
try {
  wasmManager.update(deltaTime);
} catch (error) {
  gameErrorHandler.handleWasmError('update', error, { deltaTime });
}
```

#### 2. **Validate All Inputs**
```javascript
// ❌ Bad: Direct use of user input
player.x = input.x;

// ✅ Good: Validated and sanitized input
const movement = inputValidator.validateMovement(input.x, input.y);
if (!movement.blocked) {
  player.x = movement.x;
  player.y = movement.y;
}
```

#### 3. **Provide User Feedback**
```javascript
// ❌ Bad: Silent failure
if (!networkConnection) return;

// ✅ Good: Clear user notification
if (!networkConnection) {
  showNotification('Connection lost - playing offline', 'warning');
  enterOfflineMode();
}
```

#### 4. **Log with Context**
```javascript
// ❌ Bad: Minimal error logging
console.error('Error:', error.message);

// ✅ Good: Comprehensive error context
errorReporter.reportError('wasm', error, {
  function: 'update',
  deltaTime,
  playerState: gameState.player,
  timestamp: performance.now()
});
```

#### 5. **Test Error Scenarios**
```javascript
// Always include error scenario tests
it('should handle WASM loading failure', async () => {
  mockWasm.load.rejects(new Error('Load failed'));
  
  const result = await wasmManager.initialize();
  expect(result).to.be.false;
  expect(wasmManager.isFallback()).to.be.true;
});
```

### 🚨 Common Pitfalls to Avoid

#### 1. **Don't Ignore Errors**
```javascript
// ❌ Bad: Ignoring errors
try {
  riskyOperation();
} catch (error) {
  // Silent failure
}

// ✅ Good: Handle or report
try {
  riskyOperation();
} catch (error) {
  errorReporter.reportError('operation', error);
  useFailsafeApproach();
}
```

#### 2. **Don't Trust User Input**
```javascript
// ❌ Bad: Trusting user input
const damage = userInput.damage;

// ✅ Good: Validate everything
const damage = inputValidator.sanitizeNumber(userInput.damage, 0, 100);
```

#### 3. **Don't Block the Game Loop**
```javascript
// ❌ Bad: Synchronous error handling that blocks
function handleError(error) {
  // Long synchronous operation
  generateDetailedReport(error);
}

// ✅ Good: Asynchronous error handling
function handleError(error) {
  // Quick logging, detailed processing later
  errorReporter.reportError('category', error);
  setTimeout(() => generateDetailedReport(error), 0);
}
```

## Troubleshooting Guide

### 🔍 Common Issues and Solutions

#### 1. **WASM Won't Load**
**Symptoms:** Game shows fallback mode notification
**Causes:** Missing WASM file, CORS issues, browser compatibility
**Solutions:**
- Check browser console for specific error
- Verify `game.wasm` file exists and is accessible
- Check CORS headers for WASM files
- Use `gameDebug.systemDiag()` to check browser capabilities

#### 2. **Frequent Network Disconnections**
**Symptoms:** Repeated "Connection Lost" notifications
**Causes:** Poor network, server issues, firewall blocking
**Solutions:**
- Check `networkErrorRecovery.getNetworkStatus()`
- Try different network connection
- Check firewall/proxy settings
- Use `gameDebug.errorStats()` to see network error patterns

#### 3. **Performance Issues**
**Symptoms:** Slow frame rates, lag, memory warnings
**Causes:** Memory leaks, inefficient error handling, too many errors
**Solutions:**
- Use `gameDebug.systemDiag()` to check memory usage
- Check for error loops in console
- Clear errors with `gameDebug.clearErrors()`
- Monitor performance with browser dev tools

#### 4. **Input Not Working**
**Symptoms:** Player doesn't respond to input, controls blocked
**Causes:** Input validation blocking legitimate input, browser focus issues
**Solutions:**
- Check validation stats with `inputValidator.getValidationStats()`
- Ensure browser tab has focus
- Check for blocked inputs in console warnings
- Try refreshing the page

#### 5. **Audio Not Playing**
**Symptoms:** No sound, silent gameplay
**Causes:** Web Audio API not supported, audio context blocked
**Solutions:**
- Check `browserAPIFallbacks.getAPIReport()`
- User interaction may be required to start audio
- Check browser audio permissions
- Verify audio files are accessible

### 🛠️ Debug Commands

Use these commands in the browser console:

```javascript
// Check overall system health
gameDebug.systemDiag();

// View recent errors
gameDebug.errorStats();

// Export detailed error log
gameDebug.exportErrors();

// Show interactive debug UI
gameDebug.showErrorUI();

// Clear all errors and start fresh
gameDebug.clearErrors();

// Enable verbose debug logging
gameDebug.debugMode(true);
```

---

## 📚 Additional Resources

- [WASM Manager Documentation](../UTILS/BUILD_INSTRUCTIONS.md)
- [Network Architecture Guide](../MULTIPLAYER/ROOM_SYSTEM.md)
- [Input System Documentation](../SYSTEMS/INPUT_SYSTEM.md)
- [Testing Guidelines](../UTILS/TEST_COVERAGE_IMPROVEMENTS.md)
- [Performance Optimization](../UTILS/QUICK_REFERENCE.md)

*Last updated: January 2025*
