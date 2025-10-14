// MVPLoop.js
// Simplified MVP loop using GameLoopCoordinator

import { createWasmApi } from '../../demo/wasm-api.js'
import { GameLoopCoordinator } from './GameLoopCoordinator.js'

export async function startMVPDemo(options) {
  const canvas = document.getElementById(options.canvasId)
  
  // Initialize WASM API
  const wasmApi = await createWasmApi()

  // Create and start game loop coordinator
  const gameLoop = new GameLoopCoordinator(canvas, options, wasmApi)
  gameLoop.start()

  // Return coordinator for external control if needed
  return gameLoop
}


