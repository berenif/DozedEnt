// MVPLoop.js (REFACTORED)
// Entry point for MVP demo with error handling and validation
// Single responsibility: initialize game with proper error handling

import { createWasmApi } from '../../demo/wasm-api.js'
import { GameLoopCoordinator } from './GameLoopCoordinator.js'

/**
 * Initialize and start MVP demo with comprehensive error handling.
 * 
 * Implements:
 * - WASM validation (ADR-001)
 * - Seed initialization for determinism (ADR-002)
 * - Error handling and user feedback
 * - Canvas validation
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.canvasId - Canvas element ID
 * @param {Object} options.ui - UI element IDs
 * @param {boolean} options.recordingEnabled - Enable replay recording
 * @returns {Promise<GameLoopCoordinator>} Game loop coordinator instance
 */
export async function startMVPDemo(options) {
  try {
    // Validate options
    if (!options || !options.canvasId) {
      throw new Error('Missing required option: canvasId')
    }

    // Validate canvas element exists
    const canvas = document.getElementById(options.canvasId)
    if (!canvas) {
      throw new Error(`Canvas element "${options.canvasId}" not found in DOM`)
    }

    // Validate canvas is actually a canvas
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error(`Element "${options.canvasId}" is not a canvas element`)
    }

    // Load WASM with validation
    console.log('[MVPLoop] Loading WASM module...')
    const wasmApi = await createWasmApi()

    // Validate WASM module loaded successfully
    if (!wasmApi) {
      throw new Error('WASM module failed to load: createWasmApi returned null')
    }

    // Validate WASM exports exist
    if (!wasmApi.exports) {
      throw new Error('WASM module exports are missing')
    }

    // Validate required WASM functions exist
    const requiredFunctions = [
      'update',
      'set_player_input',
      'get_x',
      'get_y',
      'get_hp',
      'get_stamina'
    ]

    const missingFunctions = requiredFunctions.filter(
      fn => typeof wasmApi.exports[fn] !== 'function' && typeof wasmApi[fn] !== 'function'
    )

    if (missingFunctions.length > 0) {
      throw new Error(
        `WASM module missing required functions: ${missingFunctions.join(', ')}`
      )
    }

    // Set deterministic seed for replay/multiplayer
    const seed = Date.now()
    console.log('[MVPLoop] Initializing with seed:', seed)

    if (typeof wasmApi.exports.init_run === 'function') {
      try {
        wasmApi.exports.init_run(BigInt(seed), 0)
      } catch (error) {
        console.warn('[MVPLoop] Seed initialization failed:', error.message)
      }
    }

    // Validate WASM is source of physics (ADR-001)
    const initialX = typeof wasmApi.exports.get_x === 'function' 
      ? wasmApi.exports.get_x() 
      : wasmApi.getPlayerState?.().x

    if (!Number.isFinite(initialX)) {
      throw new Error('WASM physics validation failed: position is not finite')
    }

    console.log('[MVPLoop] ✅ WASM validation passed')
    console.log('[MVPLoop] Initial position:', initialX)

    // Create game loop coordinator
    const gameLoop = new GameLoopCoordinator(canvas, options, wasmApi)

    // Start game loop
    gameLoop.start()

    console.log('[MVPLoop] ✅ Game loop started successfully')

    // Expose to window for debugging
    if (typeof window !== 'undefined') {
      window.gameLoop = gameLoop
      console.log('[MVPLoop] Game loop available at window.gameLoop')
    }

    return gameLoop

  } catch (error) {
    console.error('[MVPLoop] 🔴 Initialization failed:', error)
    
    // Show error to user
    showErrorUI(error.message)

    // Re-throw for caller to handle
    throw error
  }
}

/**
 * Display error UI to user
 */
function showErrorUI(message) {
  try {
    // Try to find or create error display
    let errorDiv = document.getElementById('error-display')
    
    if (!errorDiv) {
      errorDiv = document.createElement('div')
      errorDiv.id = 'error-display'
      errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(10, 16, 24, 0.95);
        border: 2px solid #d32f2f;
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        color: #e6f2ff;
        font-family: system-ui, -apple-system, sans-serif;
        z-index: 10000;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      `
      document.body.appendChild(errorDiv)
    }

    errorDiv.innerHTML = `
      <h2 style="margin: 0 0 16px 0; color: #ff6b6b; font-size: 20px;">
        ⚠️ Game Initialization Failed
      </h2>
      <p style="margin: 0 0 16px 0; line-height: 1.6;">
        ${escapeHtml(message)}
      </p>
      <p style="margin: 0; font-size: 14px; opacity: 0.8;">
        Please check the console for more details.
      </p>
      <button onclick="location.reload()" style="
        margin-top: 16px;
        background: #13324d;
        color: #e6f2ff;
        border: 1px solid #265a86;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
      ">
        Reload Page
      </button>
    `
  } catch (uiError) {
    console.error('[MVPLoop] Failed to show error UI:', uiError)
    // Fallback to alert
    alert(`Game initialization failed: ${message}`)
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
