import {joinRoom, selfId} from './dist/trystero-mqtt.min.js'  // MQTT strategy - using local bundle
import { setGlobalSeed } from './src/utils/rng.js'
import GameRenderer from './src/utils/game-renderer.js'
import CameraEffects from './src/utils/camera-effects.js'
import { WolfCharacter } from './src/gameentity/wolf-character.js'
import { EnhancedWolfAISystem } from './src/ai/wolf-ai-enhanced.js'
import AnimatedPlayer from './src/animation/player-animator.js'

// BiomeType mapping for JavaScript
const BiomeType = {
  Forest: 0,
  Swamp: 1,
  Mountains: 2,
  Plains: 3
}

// World and viewport constants
const VIRTUAL_WIDTH = 1280
const VIRTUAL_HEIGHT = 720
// World size is larger than viewport for exploration
const WORLD_WIDTH = 3840  // 3x viewport width
const WORLD_HEIGHT = 2160  // 3x viewport height

// Timing constants (will be loaded from WASM if available)
let ROLL_DURATION = 0.18 // seconds
let ROLL_COOLDOWN = 0.8 // seconds
let ATTACK_COOLDOWN = 0.35 // seconds between attacks

// WASM helpers (browser bundle)
let wasmExports = null
let runSeed = 0n
try {
  // Prefer local bundle if served from repo root; otherwise fallback to CDN
  let wasmHelperModule
  try {
    wasmHelperModule = await import('./dist/trystero-wasm.min.js')
  } catch (_) {
    wasmHelperModule = await import('https://esm.run/trystero/wasm')
  }
  const {loadWasm} = wasmHelperModule
  const {exports} = await loadWasm('./game.wasm')
  wasmExports = exports
  window.wasmExports = wasmExports // Make globally accessible for debugging
  if (typeof wasmExports.start === 'function') wasmExports.start()
  
  // Enable start game button now that WASM is loaded
  const startGameBtn = document.getElementById('start-game-btn')
  if (startGameBtn) {
    startGameBtn.disabled = false
    startGameBtn.textContent = 'Start Game'
    startGameBtn.style.background = '#4a90e2'
    startGameBtn.style.cursor = 'pointer'
    console.log('WASM loaded - Start Game button enabled')
  }
  // Seed and initialize a run inside WASM (logic stays in WASM)
  try {
    if (typeof wasmExports.init_run === 'function') {
      const usp = new URLSearchParams(location.search)
      const urlSeed = usp.get('seed')
      if (urlSeed !== null && /^\d+$/.test(urlSeed)) {
        runSeed = BigInt(urlSeed)
      } else {
        runSeed = BigInt(Date.now())
      }
      // Initialize JS-side deterministic RNG for visuals using the same seed
      setGlobalSeed(runSeed)
      // Optional: expose seed for non-module consumers that want to derive visuals
      globalThis.runSeedForVisuals = runSeed
      wasmExports.init_run(runSeed, 0)
      
      // Get initial biome from WASM
      if (typeof wasmExports.get_current_biome === 'function') {
        currentBiome = wasmExports.get_current_biome()
      }
    }
    // Load timing constants from WASM after init
    try {
      if (typeof wasmExports.get_attack_cooldown === 'function') ATTACK_COOLDOWN = wasmExports.get_attack_cooldown()
      if (typeof wasmExports.get_roll_duration === 'function') ROLL_DURATION = wasmExports.get_roll_duration()
      if (typeof wasmExports.get_roll_cooldown === 'function') ROLL_COOLDOWN = wasmExports.get_roll_cooldown()
    } catch {}
    // Optional: forward wind from URL params (?windx=..&windy=..)
    try {
      const usp2 = new URLSearchParams(location.search)
      const wx = parseFloat(usp2.get('windx') || '0')
      const wy = parseFloat(usp2.get('windy') || '0')
      if (!Number.isNaN(wx) && !Number.isNaN(wy) && typeof wasmExports.set_wind === 'function') {
        wasmExports.set_wind(wx, wy)
      }
    } catch {}
  } catch {}
} catch (e) {
  console.warn('WASM unavailable; core simulation requires WASM:', e)
}

const byId = document.getElementById.bind(document)
const canvas = byId('canvas')
const gameCanvas = byId('gameCanvas')

// Initialize game renderer and camera effects
let gameRenderer = null
let cameraEffects = null
let wolfAISystem = null
let roomManager = null
let animatedPlayer = null
const wolfCharacters = []

// Current biome, retrieved from WASM
let currentBiome = BiomeType.Forest; 

// (moved) Initialize audio context after its declarations to avoid TDZ

// Setup game canvas and renderers
if (gameCanvas) {
  const ctx = gameCanvas.getContext('2d')
  gameCanvas.width = 1280
  gameCanvas.height = 720
  
  gameRenderer = new GameRenderer(ctx, gameCanvas, currentBiome) // Pass currentBiome
  cameraEffects = new CameraEffects(gameCanvas)
  // Use external animated player for player rendering; skip renderer's built-in player sprite
  if (gameRenderer) { gameRenderer.useExternalPlayer = true }
  
  // Initialize wolf AI system
  wolfAISystem = new EnhancedWolfAISystem(null) // No sound system for now

  // Initialize animated player
  const worldCenterX = WORLD_WIDTH / 2
  const worldCenterY = WORLD_HEIGHT / 2
  animatedPlayer = new AnimatedPlayer(worldCenterX, worldCenterY, {
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    speed: 250,
    rollSpeed: 500,
    attackDamage: 20,
    attackRange: 60,
    particleSystem: null, // Will be added if available
    soundSystem: null     // Will be added if available
  })

  // Placeholder: EnhancedRoomManager module not present in repo; lobby features are UI-only for now
  roomManager = null
  
  // Make globally accessible for debugging
  window.gameRenderer = gameRenderer
  window.cameraEffects = cameraEffects
  window.wolfAISystem = wolfAISystem
  window.roomManager = roomManager
  window.animatedPlayer = animatedPlayer
}

// Lobby UI Functions
window.toggleLobby = function() {
  const lobbyPanel = document.getElementById('lobbyPanel')
  if (lobbyPanel) {
    lobbyPanel.style.display = lobbyPanel.style.display === 'none' ? 'block' : 'none'
    if (lobbyPanel.style.display === 'block') {
      if (typeof updateRoomsList === 'function') updateRoomsList()
    }
  }
}

window.showLobbyTab = function(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none'
  })
  
  // Show selected tab
  const tab = document.getElementById(tabName + 'Tab')
  if (tab) {
    tab.style.display = 'block'
  }
  
  // Update button styles
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.style.background = '#333'
    btn.classList.remove('active')
  })
  event.target.style.background = '#4a90e2'
  event.target.classList.add('active')
}

window.createRoom = async function() {
  if (!roomManager) return
  
  const roomName = document.getElementById('roomName').value || 'New Room'
  const gameMode = document.getElementById('gameMode').value
  
  try {
    const room = await roomManager.createRoom({
      name: roomName,
      type: 'public',
      gameMode: gameMode,
      maxPlayers: 4,
      allowSpectators: true
    })
    
    console.log('Room created:', room)
    if (typeof updateRoomsList === 'function') updateRoomsList()
    if (typeof showRoomInfo === 'function') showRoomInfo(room)
  } catch (error) {
    console.error('Failed to create room:', error)
    alert('Failed to create room: ' + error.message)
  }
}

window.quickPlay = async function() {
  if (!roomManager) return
  
  try {
    const room = await roomManager.quickPlay({
      gameMode: 'default',
      maxPlayers: 4
    })
    
    console.log('Joined room:', room)
    if (typeof showRoomInfo === 'function') showRoomInfo(room)
  } catch (error) {
    console.error('Quick play failed:', error)
    alert('Quick play failed: ' + error.message)
  }
}

window.sendChat = function() {
  if (!roomManager || !roomManager.currentRoom) return
  
  const input = document.getElementById('chatInput')
  const message = input.value.trim()
  
  if (message) {
    roomManager.sendChatMessage(message)
    input.value = ''
  }
}

function updateRoomsList() {
  if (!roomManager) return
  
  const roomsList = document.getElementById('roomsList')
  const rooms = roomManager.getRoomList({ hasSpace: true })
  
  if (rooms.length === 0) {
    roomsList.innerHTML = '<p style="color: #888;">No rooms available. Create one!</p>'
  } else {
    roomsList.innerHTML = rooms.map(room => `
      <div style="border: 1px solid #333; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
        <h4 style="margin: 0; color: #4a90e2;">${room.name}</h4>
        <p style="margin: 5px 0; color: #888;">
          ${room.players.length}/${room.maxPlayers} players | 
          Mode: ${room.gameMode} | 
          Code: ${room.code}
        </p>
        <button onclick="joinRoom('${room.id}')" style="padding: 5px 10px; background: #4a90e2; border: none; color: white; border-radius: 3px; cursor: pointer;">Join</button>
      </div>
    `).join('')
  }
}

window.joinRoom = async function(roomId) {
  if (!roomManager) return
  
  try {
    const room = await roomManager.joinRoom(roomId)
    console.log('Joined room:', room)
    if (typeof showRoomInfo === 'function') showRoomInfo(room)
  } catch (error) {
    console.error('Failed to join room:', error)
    alert('Failed to join room: ' + error.message)
  }
}

function showRoomInfo(room) {
  const roomsList = document.getElementById('roomsList')
  roomsList.innerHTML = `
    <div style="border: 2px solid #4a90e2; padding: 15px; border-radius: 5px;">
      <h3 style="margin: 0; color: #4a90e2;">Current Room: ${room.name}</h3>
      <p style="color: #888;">Code: ${room.code}</p>
      <div style="margin: 10px 0;">
        <h4 style="color: #fff;">Players:</h4>
        ${room.players.map(p => `
          <div style="color: #888;">
            ${p.name} ${p.role === 'host' ? '👑' : ''} ${p.isReady ? '✅' : '⏳'}
          </div>
        `).join('')}
      </div>
      <button onclick="leaveRoom()" style="padding: 5px 10px; background: #e74c3c; border: none; color: white; border-radius: 3px; cursor: pointer;">Leave Room</button>
      ${room.host === roomManager.localPlayer.id ? 
        '<button onclick="startGame()" style="margin-left: 10px; padding: 5px 10px; background: #27ae60; border: none; color: white; border-radius: 3px; cursor: pointer;">Start Game</button>' : 
        '<button onclick="toggleReady()" style="margin-left: 10px; padding: 5px 10px; background: #f39c12; border: none; color: white; border-radius: 3px; cursor: pointer;">Ready</button>'
      }
    </div>
  `
}

window.leaveRoom = function() {
  if (!roomManager) return
  roomManager.leaveRoom()
  updateRoomsList()
}

window.startGame = function() {
  if (!roomManager) return
  try {
    roomManager.startGame()
  } catch (error) {
    alert(error.message)
  }
}

window.toggleReady = function() {
  if (!roomManager) return
  roomManager.toggleReady()
  if (roomManager.currentRoom) {
    showRoomInfo(roomManager.currentRoom)
  }
}

// Set up room manager event listeners
if (roomManager) {
  roomManager.on('onChatMessage', (message) => {
    const chatMessages = document.getElementById('chatMessages')
    if (chatMessages) {
      const messageEl = document.createElement('div')
      messageEl.style.marginBottom = '5px'
      messageEl.innerHTML = `<strong style="color: #4a90e2;">${message.playerName}:</strong> ${message.text}`
      chatMessages.appendChild(messageEl)
      chatMessages.scrollTop = chatMessages.scrollHeight
    }
  })
  
  roomManager.on('onRoomStateChange', (state) => {
    if (state === 'in_progress') {
      // Hide lobby and start game
      window.toggleLobby()
      console.log('Game starting!')
    }
  })
  
  roomManager.on('onPlayerJoin', (player) => {
    if (roomManager.currentRoom) {
      showRoomInfo(roomManager.currentRoom)
    }
  })
  
  roomManager.on('onPlayerLeave', (player) => {
    if (roomManager.currentRoom) {
      showRoomInfo(roomManager.currentRoom)
    }
  })
}

// Wolf Vocalization Audio System
const VocalizationType = {
  None: 0,
  Howl: 1,
  Growl: 2,
  Bark: 3,
  Whine: 4,
  Snarl: 5
}

// Audio context for web audio API
let audioContext = null
const wolfSounds = {}
let audioInitialized = false
let userInteracted = false

// Initialize audio context on first user interaction
async function initAudioContext() {
  try {
    // If we already have an audio context, check its state
    if (audioContext) {
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }
      return
    }

    // Create new AudioContext
    audioContext = new (window.AudioContext || window.webkitAudioContext)()

    // If context is suspended (common in modern browsers), wait for user gesture
    if (audioContext.state === 'suspended') {
      // Add listeners for user gestures to resume context
      const resumeContext = async () => {
        try {
          await audioContext.resume()
          if (audioContext.state === 'running') {
            // Remove listeners once resumed
            document.removeEventListener('click', resumeContext)
            document.removeEventListener('touchstart', resumeContext)
            document.removeEventListener('keydown', resumeContext)
            console.log('AudioContext resumed successfully')
          }
        } catch (e) {
          console.warn('Failed to resume AudioContext:', e)
        }
      }

      document.addEventListener('click', resumeContext, { once: false })
      document.addEventListener('touchstart', resumeContext, { once: false })
      document.addEventListener('keydown', resumeContext, { once: false })

      // Try to resume immediately (might work on some browsers)
      await audioContext.resume()
    }

    // Create synthesized wolf sounds using Web Audio API
    if (typeof createWolfSounds === 'function') {
      createWolfSounds()
    }

    audioInitialized = true
    console.log('AudioContext initialized successfully')

  } catch (e) {
    console.warn('Failed to initialize AudioContext:', e)
  }
}

// Function to ensure audio is ready before playing sounds
async function ensureAudioReady() {
  if (!audioContext || audioContext.state !== 'running') {
    if (userInteracted) {
      await initAudioContext()
      // Wait a bit for context to stabilize
      await new Promise(resolve => setTimeout(resolve, 100))
    } else {
      return
    }
  }
}

// Initialize audio only after first user interaction
const onFirstUserInteraction = () => {
  userInteracted = true
  initAudioContext().catch(console.warn)
  document.removeEventListener('click', onFirstUserInteraction)
  document.removeEventListener('touchstart', onFirstUserInteraction)
  document.removeEventListener('keydown', onFirstUserInteraction)
}
document.addEventListener('click', onFirstUserInteraction, { once: false })
document.addEventListener('touchstart', onFirstUserInteraction, { once: false })
document.addEventListener('keydown', onFirstUserInteraction, { once: false })

// Create synthesized wolf vocalizations
function createWolfSounds() {
  // Helper to create a basic wolf sound
  function createSound(frequencies, durations, gains) {
    return () => {
      const now = audioContext.currentTime
      const gainNode = audioContext.createGain()
      gainNode.connect(audioContext.destination)
      
      let totalDuration = 0
      frequencies.forEach((freq, i) => {
        const osc = audioContext.createOscillator()
        const oscGain = audioContext.createGain()
        
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(freq, now + totalDuration)
        
        // Add some vibrato for realism
        const vibrato = audioContext.createOscillator()
        vibrato.frequency.value = 5 + Math.random() * 3
        const vibratoGain = audioContext.createGain()
        vibratoGain.gain.value = freq * 0.02
        vibrato.connect(vibratoGain)
        vibratoGain.connect(osc.frequency)
        
        oscGain.gain.setValueAtTime(0, now + totalDuration)
        oscGain.gain.linearRampToValueAtTime(gains[i], now + totalDuration + 0.05)
        oscGain.gain.linearRampToValueAtTime(0, now + totalDuration + durations[i])
        
        osc.connect(oscGain)
        oscGain.connect(gainNode)
        
        osc.start(now + totalDuration)
        osc.stop(now + totalDuration + durations[i])
        vibrato.start(now + totalDuration)
        vibrato.stop(now + totalDuration + durations[i])
        
        totalDuration += durations[i] * 0.8 // Slight overlap
      })
      
      // Master envelope
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1)
      gainNode.gain.linearRampToValueAtTime(0.3, now + totalDuration - 0.2)
      gainNode.gain.linearRampToValueAtTime(0, now + totalDuration)
    }
  }
  
  // Define sound parameters for each vocalization type
  wolfSounds[VocalizationType.Howl] = createSound(
    [150, 200, 250, 300, 280, 250, 200, 150], // Rising and falling pitch
    [0.3, 0.3, 0.4, 0.5, 0.4, 0.3, 0.3, 0.3],
    [0.2, 0.3, 0.4, 0.5, 0.5, 0.4, 0.3, 0.2]
  )
  
  wolfSounds[VocalizationType.Growl] = createSound(
    [80, 75, 70, 75, 80], // Low rumbling
    [0.2, 0.2, 0.3, 0.2, 0.2],
    [0.4, 0.5, 0.6, 0.5, 0.4]
  )
  
  wolfSounds[VocalizationType.Bark] = createSound(
    [200, 300, 250], // Sharp burst
    [0.1, 0.05, 0.1],
    [0.6, 0.8, 0.4]
  )
  
  wolfSounds[VocalizationType.Whine] = createSound(
    [300, 350, 400, 350, 300], // High pitched, plaintive
    [0.2, 0.2, 0.3, 0.2, 0.2],
    [0.3, 0.4, 0.5, 0.4, 0.3]
  )
  
  wolfSounds[VocalizationType.Snarl] = createSound(
    [100, 120, 150, 120, 100], // Aggressive, rising
    [0.15, 0.1, 0.2, 0.1, 0.15],
    [0.5, 0.6, 0.7, 0.6, 0.5]
  )
}

// Play a wolf vocalization
async function playWolfSound(type, x, y) {
  await ensureAudioReady()
  if (!audioContext || !wolfSounds[type]) return
  
  // Calculate volume based on distance from player
  const dx = x - (selfX || 0.5)
  const dy = y - (selfY || 0.5)
  const distance = Math.sqrt(dx * dx + dy * dy)
  const maxDistance = 0.5 // Maximum hearing distance
  
  if (distance > maxDistance) return
  
  // Volume falls off with distance
  const volume = Math.max(0, 1 - (distance / maxDistance))
  
  // Play the sound
  try {
    wolfSounds[type]()
    
    // Create panning effect based on position
    if (audioContext.listener && audioContext.listener.positionX) {
      const panning = dx * 2 // -1 to 1 range
      audioContext.listener.positionX.value = -panning
    }
  } catch (e) {
    console.warn('Failed to play wolf sound:', e)
  }
}

// Track active vocalizations to avoid duplicate sounds
const activeVocalizations = new Map()

// Visual indicators for vocalizations
function addVocalizationVisual(el, type) {
  // Feature flag: disable visual rings to avoid red circles spawning
  const ENABLE_VOCALIZATION_VISUALS = false
  if (!ENABLE_VOCALIZATION_VISUALS) return
  // Remove any existing vocalization visual
  const existing = el.querySelector('.vocalization')
  if (existing) existing.remove()
  
  // Create new visual indicator
  const visual = document.createElement('div')
  visual.className = 'vocalization'
  visual.style.cssText = `
    position: absolute;
    width: 60px;
    height: 60px;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 100;
  `
  
  // Create animated rings based on vocalization type
  const ringCount = type === VocalizationType.Howl ? 3 : 2
  const colors = {
    [VocalizationType.Howl]: '#00ffff',
    [VocalizationType.Growl]: '#ff6600',
    [VocalizationType.Bark]: '#ffff00',
    [VocalizationType.Whine]: '#9999ff',
    [VocalizationType.Snarl]: '#ff0000'
  }
  const color = colors[type] || '#ffffff'
  
  for (let i = 0; i < ringCount; i++) {
    const ring = document.createElement('div')
    ring.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
      border: 2px solid ${color};
      border-radius: 50%;
      opacity: 0;
      animation: vocalizationRing ${0.8 + i * 0.2}s ease-out ${i * 0.1}s;
    `
    visual.appendChild(ring)
  }
  
  // Add icon based on type
  const icon = document.createElement('div')
  icon.style.cssText = `
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: ${color};
    text-shadow: 0 0 10px ${color};
    animation: vocalizationPulse 0.5s ease-in-out infinite;
  `
  
  const icons = {
    [VocalizationType.Howl]: '🌙',
    [VocalizationType.Growl]: '⚡',
    [VocalizationType.Bark]: '!',
    [VocalizationType.Whine]: '💔',
    [VocalizationType.Snarl]: '⚔️'
  }
  icon.textContent = icons[type] || '🔊'
  visual.appendChild(icon)
  
  el.appendChild(visual)
}

function updateVocalizationVisual(el, progress) {
  const visual = el.querySelector('.vocalization')
  if (!visual) return
  
  // Fade out as vocalization ends
  if (progress > 0.8) {
    visual.style.opacity = 1 - ((progress - 0.8) / 0.2)
  }
  
  // Remove when complete
  if (progress >= 1) {
    visual.remove()
  }
}

// Add CSS animations for vocalizations
const vocalizationStyles = document.createElement('style')
vocalizationStyles.textContent = `
  @keyframes vocalizationRing {
    0% {
      transform: scale(0.3);
      opacity: 1;
    }
    100% {
      transform: scale(1.5);
      opacity: 0;
    }
  }
  
  @keyframes vocalizationPulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2);
    }
  }
`
document.head.appendChild(vocalizationStyles)

// Add vocalization test controls to settings panel
function addVocalizationTestToSettings() {
  const settingsContent = document.querySelector('.settings-content')
  if (!settingsContent) return
  
  // Create vocalization test section
  const vocalTestSection = document.createElement('div')
  vocalTestSection.className = 'setting-item vocalization-test-section'
  vocalTestSection.style.cssText = `
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin-top: 10px;
    padding-top: 10px;
  `
  vocalTestSection.innerHTML = `
    <label style="display: block; margin-bottom: 10px; font-size: 14px; color: #00ffff;">🎵 Vocalization Test</label>
    <div class="vocalization-buttons" style="display: flex; flex-wrap: wrap; gap: 5px;">
      <button onclick="window.testVocalization(1)" class="vocal-test-btn" style="flex: 1; min-width: 80px; padding: 8px 5px; background: rgba(0, 255, 255, 0.1); color: #0ff; border: 1px solid #0ff; border-radius: 4px; cursor: pointer; font-size: 12px;">🌙 Howl</button>
      <button onclick="window.testVocalization(2)" class="vocal-test-btn" style="flex: 1; min-width: 80px; padding: 8px 5px; background: rgba(255, 102, 0, 0.1); color: #f60; border: 1px solid #f60; border-radius: 4px; cursor: pointer; font-size: 12px;">⚡ Growl</button>
      <button onclick="window.testVocalization(3)" class="vocal-test-btn" style="flex: 1; min-width: 80px; padding: 8px 5px; background: rgba(255, 255, 0, 0.1); color: #ff0; border: 1px solid #ff0; border-radius: 4px; cursor: pointer; font-size: 12px;">! Bark</button>
      <button onclick="window.testVocalization(4)" class="vocal-test-btn" style="flex: 1; min-width: 80px; padding: 8px 5px; background: rgba(153, 153, 255, 0.1); color: #99f; border: 1px solid #99f; border-radius: 4px; cursor: pointer; font-size: 12px;">💔 Whine</button>
      <button onclick="window.testVocalization(5)" class="vocal-test-btn" style="flex: 1; min-width: 80px; padding: 8px 5px; background: rgba(255, 0, 0, 0.1); color: #f00; border: 1px solid #f00; border-radius: 4px; cursor: pointer; font-size: 12px;">⚔️ Snarl</button>
    </div>
  `
  settingsContent.appendChild(vocalTestSection)
  
  // Add hover effects for vocalization buttons
  const style = document.createElement('style')
  style.textContent = `
    .vocal-test-btn:hover {
      opacity: 0.8;
      transform: scale(1.05);
    }
    .vocal-test-btn:active {
      transform: scale(0.95);
    }
  `
  document.head.appendChild(style)
}

// Test vocalization function
window.testVocalization = async function(type) {
  await initAudioContext()
  // Play at random position near player
  const x = (selfX || 0.5) + (Math.random() - 0.5) * 0.3
  const y = (selfY || 0.5) + (Math.random() - 0.5) * 0.3
  await playWolfSound(type, x, y)
  
  // Add visual indicator to a random enemy if any exist
  if (enemyEls && enemyEls.length > 0) {
    const validEnemies = enemyEls.filter(el => el && el.parentNode)
    if (validEnemies.length > 0) {
      const enemy = validEnemies[Math.floor(Math.random() * validEnemies.length)]
      addVocalizationVisual(enemy, type)
      setTimeout(() => {
        const visual = enemy.querySelector('.vocalization')
        if (visual) visual.remove()
      }, 1000)
    }
  }
}

// Add vocalization test to settings panel after page loads
setTimeout(() => {
  addVocalizationTestToSettings()
}, 1000)

// Central wall (UI-only)
const wallEl = document.createElement('div')
wallEl.className = 'wall'
canvas.appendChild(wallEl)
// Visual polish helpers (UI-only)
let shakeEndTimeMs = 0
let shakeStrengthPx = 0
function screenShake(strengthPx = 4, durationMs = 140) {
  shakeStrengthPx = Math.max(shakeStrengthPx, strengthPx)
  const now = performance.now()
  shakeEndTimeMs = Math.max(shakeEndTimeMs, now + durationMs)
}
function applyScreenShake(nowMs) {
  const viewport = document.getElementById('viewport')
  if (!viewport) return
  
  if (nowMs >= shakeEndTimeMs) {
    viewport.style.setProperty('--shake-x', '0px')
    viewport.style.setProperty('--shake-y', '0px')
    return
  }
  const t = (shakeEndTimeMs - nowMs) / 200 // decay factor
  const amp = Math.max(0, shakeStrengthPx) * t * t
  const x = (Math.random() * 2 - 1) * amp
  const y = (Math.random() * 2 - 1) * amp
  viewport.style.setProperty('--shake-x', x.toFixed(2) + 'px')
  viewport.style.setProperty('--shake-y', y.toFixed(2) + 'px')
}
function initAmbientParticles(count = 22) {
  const w = WORLD_WIDTH
  const h = WORLD_HEIGHT
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div')
    p.className = 'ambient-particle'
    const x = Math.random() * (w - 8)
    const y = Math.random() * (h - 8)
    const dx = (Math.random() * 2 - 1) * 80
    const dy = (Math.random() * 2 - 1) * 80
    const s = 0.8 + Math.random() * 0.8
    const op = 0.25 + Math.random() * 0.35
    const dur = 14 + Math.random() * 10
    p.style.setProperty('--x', x.toFixed(1) + 'px')
    p.style.setProperty('--y', y.toFixed(1) + 'px')
    p.style.setProperty('--dx', dx.toFixed(1) + 'px')
    p.style.setProperty('--dy', dy.toFixed(1) + 'px')
    p.style.setProperty('--s', s.toFixed(2))
    p.style.setProperty('--op', op.toFixed(2))
    p.style.setProperty('--dur', dur.toFixed(1) + 's')
    canvas.appendChild(p)
  }
}
function ensureShadow(el) {
  let shadow = el.querySelector('.shadow')
  if (!shadow) {
    shadow = document.createElement('div')
    shadow.className = 'shadow'
    el.appendChild(shadow)
  }
  return shadow
}
function updateSelfShadow(moving, rolling) {
  if (!selfEl) return
  const shadow = ensureShadow(selfEl)
  const scale = rolling ? 0.7 : (moving ? 0.85 : 1)
  const opacity = rolling ? 0.5 : (moving ? 0.6 : 0.65)
  shadow.style.setProperty('--shadow-scale', String(scale))
  shadow.style.setProperty('--shadow-opacity', String(opacity))
}
// Debug HUD: shows pack plan (if exported by WASM)
const debugHud = document.createElement('div')
debugHud.id = 'debug-hud'
debugHud.style.cssText = 'position:absolute;left:8px;top:8px;color:#fff;background:rgba(0,0,0,0.45);padding:4px 6px;border-radius:4px;font:12px/1.2 system-ui, sans-serif;pointer-events:none;'
canvas.appendChild(debugHud)
const peerCountEl = byId('playerCount')
const connectionStatusEl = byId('connectionStatus')
const orientationOverlay = byId('orientation-overlay')
const overlayStartBtn = byId('overlay-start')
const controlsTip = byId('controls-tip')
const joystick = byId('joystick')
const joystickBase = byId('joystick-base')
const joystickKnob = byId('joystick-knob')
const actions = byId('actions')
const rollButton = byId('rollBtn')
const attackButton = byId('attackBtn')
const blockButton = byId('blockBtn')
const choiceOverlay = byId('choice-overlay')
const choiceBtn0 = byId('choice-0')
const choiceBtn1 = byId('choice-1')
const choiceBtn2 = byId('choice-2')
const restartButton = byId('restart-button')
// Game over overlay elements
const gameOverOverlay = byId('gameOverOverlay')
const rematchButton = byId('rematch-button')
const config = {
  appId: 'dozed-ent-game-v1',
  // Force known-stable MQTT WSS relays and avoid unreliable defaults on some CDN builds
  relayUrls: [
    'wss://test.mosquitto.org:8081/mqtt',
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker.hivemq.com:8884/mqtt'
  ],
  relayRedundancy: 2 // fewer concurrent relays reduces noisy reconnect errors
}

// Feature flag: enable multiplayer only when WebCrypto is available (secure context)
const MULTIPLAYER_ENABLED = !!(globalThis.crypto && globalThis.crypto.subtle)

// Camera system
let cameraX = 0
let cameraY = 0
const CAMERA_SMOOTHING = 0.1  // Smooth camera following
// normalized margin from edges to keep the player fully visible when spawning
const SPAWN_MARGIN = 0.06

let touchStartTime = 0
let room
let sendMove
let sendAct
let lastFrameTs = 0
let hasSpawned = false
let choiceVisible = false

// Update Risk Phase UI
function updateRiskPhaseUI() {
  if (!wasmExports) return
  
  // Update risk multiplier
  const riskMult = wasmExports.get_risk_multiplier?.() || 1.0
  const riskMultEl = document.getElementById('risk-mult')
  if (riskMultEl) riskMultEl.textContent = riskMult.toFixed(1) + 'x'
  
  // Update curse list
  const curseList = document.getElementById('curse-list')
  if (curseList) {
    curseList.innerHTML = ''
    const curseCount = wasmExports.get_active_curse_count?.() || 0
    const curseTypes = ['Weakness', 'Fragility', 'Exhaustion', 'Slowness', 'Blindness']
    
    for (let i = 0; i < curseCount; i++) {
      const type = wasmExports.get_curse_type?.(i) || 0
      const intensity = wasmExports.get_curse_intensity?.(i) || 0
      const li = document.createElement('li')
      li.textContent = `${curseTypes[type]} (${(intensity * 100).toFixed(0)}%)`
      curseList.appendChild(li)
    }
  }
  
  // Update timed challenge if active
  const challengeProgress = wasmExports.get_timed_challenge_progress?.() || 0
  const challengeTarget = wasmExports.get_timed_challenge_target?.() || 0
  const challengeRemaining = wasmExports.get_timed_challenge_remaining?.() || 0
  
  const timedChallenge = document.getElementById('timed-challenge')
  if (timedChallenge) {
    timedChallenge.hidden = challengeTarget === 0
    document.getElementById('challenge-progress').textContent = challengeProgress
    document.getElementById('challenge-target').textContent = challengeTarget
    document.getElementById('challenge-time').textContent = challengeRemaining.toFixed(1)
  }
}

// Update Escalate Phase UI
function updateEscalatePhaseUI() {
  if (!wasmExports) return
  
  // Update escalation level
  const level = wasmExports.get_escalation_level?.() || 0
  const levelEl = document.getElementById('escalation-lvl')
  if (levelEl) levelEl.textContent = (level * 100).toFixed(0) + '%'
  
  // Update modifiers
  const speedMod = wasmExports.get_enemy_speed_modifier?.() || 1.0
  const damageMod = wasmExports.get_enemy_damage_modifier?.() || 1.0
  const spawnMod = wasmExports.get_spawn_rate_modifier?.() || 1.0
  
  document.getElementById('enemy-speed').textContent = speedMod.toFixed(1) + 'x'
  document.getElementById('enemy-damage').textContent = damageMod.toFixed(1) + 'x'
  document.getElementById('spawn-rate').textContent = spawnMod.toFixed(1) + 'x'
  
  // Update miniboss alert
  const minibossActive = wasmExports.get_miniboss_active?.() === 1
  const minibossAlert = document.getElementById('miniboss-alert')
  if (minibossAlert) {
    minibossAlert.hidden = !minibossActive
    if (minibossActive) {
      const health = wasmExports.get_miniboss_health?.() || 0
      const healthFill = minibossAlert.querySelector('.miniboss-health-fill')
      if (healthFill) {
        healthFill.style.width = (health * 100) + '%'
      }
    }
  }
}

// Update CashOut Phase UI
function updateCashOutPhaseUI() {
  if (!wasmExports) return
  
  // Update currency
  const gold = wasmExports.get_gold?.() || 0
  const essence = wasmExports.get_essence?.() || 0
  document.getElementById('gold-amount').textContent = Math.floor(gold)
  document.getElementById('essence-amount').textContent = Math.floor(essence)
  
  // Populate shop items
  const shopItems = document.getElementById('shop-items')
  if (shopItems) {
    shopItems.innerHTML = ''
    const itemCount = wasmExports.get_shop_item_count?.() || 0
    const itemTypes = ['Weapon', 'Armor', 'Consumable', 'Blessing', 'Mystery']
    
    for (let i = 0; i < itemCount; i++) {
      const type = wasmExports.get_shop_item_type?.(i) || 0
      const goldCost = wasmExports.get_shop_item_cost_gold?.(i) || 0
      const essenceCost = wasmExports.get_shop_item_cost_essence?.(i) || 0
      
      const itemDiv = document.createElement('div')
      itemDiv.className = 'shop-item'
      itemDiv.innerHTML = `
        <div>${itemTypes[type]}</div>
        <div>🔶${Math.floor(goldCost)} ${essenceCost > 0 ? `🔷${Math.floor(essenceCost)}` : ''}</div>
      `
      itemDiv.onclick = () => {
        if (wasmExports.buy_shop_item?.(i) === 1) {
          itemDiv.classList.add('purchased')
          updateCashOutPhaseUI() // Refresh UI
        }
      }
      shopItems.appendChild(itemDiv)
    }
  }
}
// movement-driven sound helpers
let prevPosX = 0.5
let prevPosY = 0.5
let footstepAccum = 0

// device/platform detection
const isMobile = (matchMedia && matchMedia('(pointer: coarse)').matches) || /Mobi|Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent)

// movement state - start at center of world
// WASM uses normalized 0-1 coords, but we scale to 0-3 for the larger world
let posX = 0.5  // This will be scaled when rendering
let posY = 0.5  // This will be scaled when rendering
// Initialize camera to center on starting position
let selfX = posX
let selfY = posY
let inputX = 0
let inputY = 0
let keyboardInputX = 0
let keyboardInputY = 0
// roll state
let isRolling = false
let rollDirX = 0
let rollDirY = 0
let rollTimeLeft = 0
let rollCooldownLeft = 0
const ROLL_SPEED_MULTIPLIER = 2.6
// no networked movement messages; only clicks are shared
// facing + visuals state
let faceDirX = 1
let faceDirY = 0
let selfShieldEl = null
let trailAccumulator = 0
let attackCooldownLeft = 0
let blocking = false

function nowSeconds() {
  return performance.now() / 1000
}

// player rendering state
const otherColorPool = ['#ff4d4f', '#52c41a', '#fadb14', '#9e9e9e'] // red, green, yellow, grey
const peerToColor = new Map()
const peerToEl = new Map()
let selfEl = null
let selfStaminaEl = null
let lastMoveSendTs = 0
let lastSentX = posX
let lastSentY = posY
const peerToHealth = new Map()
let selfHealth = 1
// peer combat visuals state
const peerToShieldEl = new Map()

// Enemy rendering state (UI-only; positions and states read from WASM)
const enemyEls = [] // index-aligned DOM nodes
function enemyStateLabel(s) {
  switch (s | 0) {
    case 1: return 'seek'
    case 2: return 'circle'
    case 3: return 'harass'
    case 4: return 'recover'
    default: return 'idle'
  }
}
function packPlanLabel(p) {
  switch (p | 0) {
    case 0: return 'stalk'
    case 1: return 'encircle'
    case 2: return 'harass'
    case 3: return 'commit'
    default: return ''
  }
}
function enemyRoleLabel(r) {
  switch (r | 0) {
    case 0: return 'lead'
    case 1: return 'flankL'
    case 2: return 'flankR'
    case 3: return 'harass'
    case 4: return 'pupGuard'
    default: return ''
  }
}
function ensureRoleTag(el) {
  let tag = el.querySelector('.role-tag')
  if (!tag) {
    tag = document.createElement('div')
    tag.className = 'role-tag'
    tag.style.cssText = 'position:absolute;left:50%;top:-14px;transform:translateX(-50%);color:#fff;background:rgba(0,0,0,0.5);padding:1px 3px;border-radius:3px;font:10px/1.1 system-ui,sans-serif;pointer-events:none;'
    el.appendChild(tag)
  }
  return tag
}
function ensureEnemyEl(idx, type) {
  let el = enemyEls[idx]
  if (!el) {
    el = document.createElement('div')
    el.className = 'enemy'
    // type 0=Wolf, 1=Dummy
    el.dataset.type = String(type | 0)
    if ((type | 0) === 0) el.classList.add('wolf')
    canvas.appendChild(el)
    enemyEls[idx] = el
  }
  return el
}
function setEnemyPos(el, x, y) {
  // Convert normalized world coordinates to screen coordinates
  // Scale from WASM's 0-1 range to full world
  const scaledX = 3.0 * x  // Maps 0-1 to 0-3 (full world)
  const scaledY = 3.0 * y  // Maps 0-1 to 0-3 (full world)
  const worldX = scaledX * (WORLD_WIDTH / 3)
  const worldY = scaledY * (WORLD_HEIGHT / 3)
  // Apply camera offset
  const screenX = worldX - cameraX
  const screenY = worldY - cameraY
  el.style.left = screenX + 'px'
  el.style.top = screenY + 'px'
}
async function renderEnemies() {
  if (!wasmExports || typeof wasmExports.get_enemy_count !== 'function') return
  const count = wasmExports.get_enemy_count() | 0
  // create/update
  for (let i = 0; i < count; i++) {
    const type = (typeof wasmExports.get_enemy_type === 'function') ? (wasmExports.get_enemy_type(i) | 0) : 0
    const x = (typeof wasmExports.get_enemy_x === 'function') ? wasmExports.get_enemy_x(i) : 0
    const y = (typeof wasmExports.get_enemy_y === 'function') ? wasmExports.get_enemy_y(i) : 0
    const state = (typeof wasmExports.get_enemy_state === 'function') ? (wasmExports.get_enemy_state(i) | 0) : 0
    const el = ensureEnemyEl(i, type)
    setEnemyPos(el, clamp01(x), clamp01(y))
    el.dataset.state = String(state)
    // state class for quick styling
    el.classList.remove('idle', 'seek', 'circle', 'harass', 'recover')
    el.classList.add(enemyStateLabel(state))
    // ensure shadow exists and scale slightly if moving states
    ensureShadow(el)
    const moving = state === 1 || state === 2 || state === 3
    const shadow = el.querySelector('.shadow')
    if (shadow) {
      shadow.style.setProperty('--shadow-scale', moving ? '0.9' : '1')
      shadow.style.setProperty('--shadow-opacity', moving ? '0.55' : '0.65')
    }
    // optional enemy role label
    let role = 255 // Default to no role
    if (typeof wasmExports.get_enemy_role === 'function') {
      role = (wasmExports.get_enemy_role(i) | 0)
      const tag = ensureRoleTag(el)
      tag.textContent = enemyRoleLabel(role)
    }
    
    // Process vocalizations - simulated triggers since WASM integration pending
    const enemyKey = `enemy_${i}`
    const lastState = el.dataset.lastVocalState || ''
    const currentState = String(state)
    
    // Trigger vocalizations on state changes
    if (currentState !== lastState) {
      el.dataset.lastVocalState = currentState
      
      // Random chance to vocalize based on state
      const rand = Math.random()
      
      if (state === 1 && rand < 0.15) { // Seek state - bark to alert pack
        await playWolfSound(VocalizationType.Bark, x, y)
        addVocalizationVisual(el, VocalizationType.Bark)
        setTimeout(() => {
          const visual = el.querySelector('.vocalization')
          if (visual) visual.remove()
        }, 500)
      } else if (state === 2 && rand < 0.1) { // Circle state - growl to intimidate
        await playWolfSound(VocalizationType.Growl, x, y)
        addVocalizationVisual(el, VocalizationType.Growl)
        setTimeout(() => {
          const visual = el.querySelector('.vocalization')
          if (visual) visual.remove()
        }, 1000)
      } else if (state === 3 && rand < 0.2) { // Harass state - snarl before attack
        await playWolfSound(VocalizationType.Snarl, x, y)
        addVocalizationVisual(el, VocalizationType.Snarl)
        setTimeout(() => {
          const visual = el.querySelector('.vocalization')
          if (visual) visual.remove()
        }, 300)
      }
    }
    
    // Occasional howl from lead wolf
    if (role === 0 && Math.random() < 0.0005) { // Lead role, very rare howl
      await playWolfSound(VocalizationType.Howl, x, y)
      addVocalizationVisual(el, VocalizationType.Howl)
      setTimeout(() => {
        const visual = el.querySelector('.vocalization')
        if (visual) visual.remove()
      }, 2000)
    }
  }
  // remove excess DOM nodes
  for (let i = count; i < enemyEls.length; i++) {
    const el = enemyEls[i]
    if (el && el.parentNode === canvas) canvas.removeChild(el)
    enemyEls[i] = null
  }
}

// Enhanced wolf rendering using WolfCharacter class
function renderWolvesEnhanced() {
  if (!gameCanvas || !wasmExports || typeof wasmExports.get_enemy_count !== 'function') return
  
  const ctx = gameCanvas.getContext('2d')
  const count = wasmExports.get_enemy_count() | 0
  
  // Ensure we have enough wolf characters
  while (wolfCharacters.length < count) {
    let s = Number((globalThis.runSeedForVisuals ?? 1n) % 0x7fffffff)
    s = (s * 1103515245 + 12345) % 0x80000000
    const r1 = s / 0x80000000
    s = (s * 1103515245 + 12345) % 0x80000000
    const r2 = s / 0x80000000
    s = (s * 1103515245 + 12345) % 0x80000000
    const r3 = s / 0x80000000
    const wolfType = r1 < 0.1 ? 'alpha' : 
                     r2 < 0.3 ? 'scout' : 
                     r3 < 0.5 ? 'hunter' : 'normal'
    wolfCharacters.push(new WolfCharacter(0, 0, wolfType, wasmExports, i))
  }
  
  // Update and render wolves
  for (let i = 0; i < count; i++) {
    const type = (typeof wasmExports.get_enemy_type === 'function') ? (wasmExports.get_enemy_type(i) | 0) : 0
    
    // Only use WolfCharacter for wolf enemies (type 0)
    if (type === 0 && wolfCharacters[i]) {
      const wolf = wolfCharacters[i]
      const x = (typeof wasmExports.get_enemy_x === 'function') ? wasmExports.get_enemy_x(i) : 0
      const y = (typeof wasmExports.get_enemy_y === 'function') ? wasmExports.get_enemy_y(i) : 0
      const state = (typeof wasmExports.get_enemy_state === 'function') ? (wasmExports.get_enemy_state(i) | 0) : 0
      
      // Convert normalized coordinates to world coordinates
      const worldX = (3.0 * x) * (WORLD_WIDTH / 3)
      const worldY = (3.0 * y) * (WORLD_HEIGHT / 3)
      
      // Update wolf position
      wolf.position.x = worldX
      wolf.position.y = worldY
      
      // Map WASM state to wolf state
      switch(state) {
        case 1: wolf.setState('running'); break // seek
        case 2: wolf.setState('prowling'); break // circle
        case 3: wolf.setState('attacking'); break // harass
        case 4: wolf.setState('hurt'); break // recover
        default: wolf.setState('idle'); break
      }
      
      // Update wolf (deltaTime is approximated)
      const deltaTime = 0.016 // 60 FPS
      const player = {
        position: {
          x: (selfX || 0.5) * WORLD_WIDTH,
          y: (selfY || 0.5) * WORLD_HEIGHT
        }
      }
      wolf.update(deltaTime, player)
      
      // Render wolf with camera offset
      const camera = {
        x: cameraX || 0,
        y: cameraY || 0
      }
      wolf.render(ctx, camera)
    }
  }
  
  // Remove excess wolves
  if (wolfCharacters.length > count) {
    wolfCharacters.splice(count)
  }

  // Update and render animated player
  if (animatedPlayer) {
    // Get player input from keyboard or joystick
    const keys = {}
    // Convert joystick input to player input
    if (window.joystickInput) {
      const input = AnimatedPlayer.createInputFromKeys({
        a: window.joystickInput.left,
        d: window.joystickInput.right,
        w: window.joystickInput.up,
        s: window.joystickInput.down,
        ' ': false, // Space for attack
        shift: false, // Shift for block
        control: false // Ctrl for roll
      })
      animatedPlayer.update(deltaTime, input)
    } else {
      // Use keyboard input
      const pressedKeys = getPressedKeysForPlayer()
      const input = AnimatedPlayer.createInputFromKeys(pressedKeys)
      animatedPlayer.update(deltaTime, input)
    }

    // Render player with camera offset
    const camera = {
      x: cameraX || 0,
      y: cameraY || 0
    }
    animatedPlayer.render(ctx, camera)
  }
}



// Get currently pressed keys for animated player
function getPressedKeysForPlayer() {
  const keys = {}
  // Map existing keyDown set to player input format
  keys.a = keyDown.has('a')
  keys.d = keyDown.has('d')
  keys.w = keyDown.has('w')
  keys.s = keyDown.has('s')
  keys[' '] = keyDown.has(' ') || keyDown.has('z') // Space or Z for attack
  keys.shift = keyDown.has('shift') || keyDown.has('k') // Shift or K for block
  keys.control = keyDown.has('control') || keyDown.has('l') // Ctrl or L for roll
  keys.j = keyDown.has('j') // Alternative attack
  keys.arrowleft = keyDown.has('arrowleft') || keyDown.has('q') // Left arrow or Q
  keys.arrowright = keyDown.has('arrowright') || keyDown.has('d') // Right arrow or D
  keys.arrowup = keyDown.has('arrowup') || keyDown.has('w') // Up arrow or W
  keys.arrowdown = keyDown.has('arrowdown') || keyDown.has('s') // Down arrow or S
  keys.h = keyDown.has('h') // Heavy attack

  return keys
}

function updateDebugHud() {
  if (!wasmExports) { debugHud.textContent = ''; return }
  try {
    if (typeof wasmExports.get_pack_plan === 'function') {
      const plan = (wasmExports.get_pack_plan() | 0)
      const enemyCount = (typeof wasmExports.get_enemy_count === 'function') ? (wasmExports.get_enemy_count() | 0) : 0
      debugHud.textContent = `pack: ${packPlanLabel(plan)} · enemies: ${enemyCount}`
    } else {
      debugHud.textContent = ''
    }
  } catch { debugHud.textContent = '' }
}

// Environment sound forwarding (UI-only)
function postSoundAt(x, y, intensity) {
  try {
    if (!wasmExports || typeof wasmExports.post_sound !== 'function') return
    wasmExports.post_sound(clamp01(x), clamp01(y), Math.max(0, Math.min(1, intensity)))
  } catch {}
}
function postLocalSound(intensity) { postSoundAt(posX, posY, intensity) }

function ensureSelfEl() {
  if (selfEl) return selfEl
  const el = document.createElement('div')
  el.className = 'player self'
  el.style.background = '#2196f3' // blue
  el.title = 'You (controlled by joystick)' // Add tooltip to identify local player
  canvas.appendChild(el)
  // soft shadow
  ensureShadow(el)
  // add health bar
  const hb = document.createElement('div')
  hb.className = 'health'
  const fill = document.createElement('div')
  fill.className = 'fill'
  hb.appendChild(fill)
  el.appendChild(hb)
  // add stamina bar below health
  const sb = document.createElement('div')
  sb.className = 'stamina'
  const sfill = document.createElement('div')
  sfill.className = 'fill'
  sb.appendChild(sfill)
  el.appendChild(sb)
  selfStaminaEl = sb
  selfEl = el
  selfHealth = 1
  updateHealthFill(el, selfHealth)
  setElPos(selfEl, posX, posY)
  return el
}

// Determine a spawn corner farthest from current peers
function chooseSpawnCorner() {
  const margin = SPAWN_MARGIN
  const corners = [
    [margin, margin],               // top-left
    [1 - margin, margin],           // top-right
    [margin, 1 - margin],           // bottom-left
    [1 - margin, 1 - margin]        // bottom-right
  ]
  const peerPositions = []
  for (const [, el] of peerToEl) {
    const leftPx = parseFloat(el.style.left || '0')
    const topPx = parseFloat(el.style.top || '0')
    // Convert screen coordinates back to world coordinates
    const worldX = leftPx + cameraX
    const worldY = topPx + cameraY
    // Unscale from world to WASM's 0-1 range
    const unscaledX = worldX / (WORLD_WIDTH / 3) / 3.0  // Maps from full world back to 0-1
    const unscaledY = worldY / (WORLD_HEIGHT / 3) / 3.0  // Maps from full world back to 0-1
    const x = clamp01(unscaledX)
    const y = clamp01(unscaledY)
    peerPositions.push([x, y])
  }
  if (peerPositions.length === 0) {
    // default when no peers: bottom-right (arbitrary but consistent)
    return [1 - margin, 1 - margin]
  }
  let bestCorner = corners[0]
  let bestScore = -1
  for (const [cx, cy] of corners) {
    let minDistSq = Infinity
    for (const [px, py] of peerPositions) {
      const dx = cx - px
      const dy = cy - py
      const d2 = dx * dx + dy * dy
      if (d2 < minDistSq) minDistSq = d2
    }
    if (minDistSq > bestScore) {
      bestScore = minDistSq
      bestCorner = [cx, cy]
    }
  }
  return bestCorner
}

function setSpawnPointIfNeeded(force = false) {
  // Spawn resolved by WASM; just ensure our element exists
  if (hasSpawned && !force) return
  hasSpawned = true
  ensureSelfEl()
}

function setElPos(el, x, y) {
  // Convert normalized world coordinates to screen coordinates
  // Scale from WASM's 0-1 range to full world
  const scaledX = 3.0 * x  // Maps 0-1 to 0-3 (full world)
  const scaledY = 3.0 * y  // Maps 0-1 to 0-3 (full world)
  const worldX = scaledX * (WORLD_WIDTH / 3)
  const worldY = scaledY * (WORLD_HEIGHT / 3)
  // Apply camera offset
  const screenX = worldX - cameraX
  const screenY = worldY - cameraY
  el.style.left = screenX + 'px'
  el.style.top = screenY + 'px'
}

// Update camera to follow player smoothly
function updateCamera() {
  if (!selfEl) return
  
  // Get player's world position - scale from normalized 0-1 to full world size
  // Map 0-1 range to full 0-3 world coordinates
  const scaledX = 3.0 * posX  // Maps 0-1 to 0-3 (full world)
  const scaledY = 3.0 * posY  // Maps 0-1 to 0-3 (full world)
  const playerWorldX = scaledX * (WORLD_WIDTH / 3)
  const playerWorldY = scaledY * (WORLD_HEIGHT / 3)
  
  // Calculate desired camera position (center on player)
  const targetCameraX = playerWorldX - VIRTUAL_WIDTH / 2
  const targetCameraY = playerWorldY - VIRTUAL_HEIGHT / 2
  
  // Clamp camera to world boundaries
  const clampedCameraX = Math.max(0, Math.min(targetCameraX, WORLD_WIDTH - VIRTUAL_WIDTH))
  const clampedCameraY = Math.max(0, Math.min(targetCameraY, WORLD_HEIGHT - VIRTUAL_HEIGHT))
  
  // Smooth camera movement
  cameraX += (clampedCameraX - cameraX) * CAMERA_SMOOTHING
  cameraY += (clampedCameraY - cameraY) * CAMERA_SMOOTHING
  
  // Apply camera transform to canvas
  canvas.style.transform = `translate(-${cameraX}px, -${cameraY}px)`
}



function getOrCreatePeerEl(peerId) {
  let el = peerToEl.get(peerId)
  if (el) return el
  // assign color
  if (!peerToColor.has(peerId)) {
    // Use a more deterministic color assignment based on peerId to avoid race conditions
    let colorIndex = 0
    for (let i = 0; i < peerId.length; i++) {
      colorIndex += peerId.charCodeAt(i)
    }
    const color = otherColorPool[colorIndex % otherColorPool.length]
    peerToColor.set(peerId, color)
  }
  el = document.createElement('div')
  el.className = 'player'
  el.style.background = peerToColor.get(peerId)
  canvas.appendChild(el)
  // soft shadow
  ensureShadow(el)
  // add health bar
  const hb = document.createElement('div')
  hb.className = 'health'
  const fill = document.createElement('div')
  fill.className = 'fill'
  hb.appendChild(fill)
  el.appendChild(hb)
  peerToEl.set(peerId, el)
  peerToHealth.set(peerId, 1)
  updateHealthFill(el, 1)
  // start at center until we receive a move
  setElPos(el, 0.5, 0.5)
  return el
}

function removePeerEl(peerId) {
  const el = peerToEl.get(peerId)
  if (el && el.parentNode === canvas) canvas.removeChild(el)
  peerToEl.delete(peerId)
  peerToColor.delete(peerId)
  peerToHealth.delete(peerId)
  // cleanup peer shield element if any
  const shield = peerToShieldEl.get(el)
  if (shield && shield.parentNode) shield.parentNode.removeChild(shield)
  peerToShieldEl.delete(el)
}

function updateHealthFill(playerEl, value) {
  const clamped = clamp01(value)
  const fill = playerEl.querySelector('.health > .fill')
  if (fill) {
    fill.style.width = (clamped * 100) + '%'
    // color shift: green -> yellow -> red
    const hue = Math.round(clamped * 120) // 0..120
    fill.style.background = `hsl(${hue}, 80%, 45%)`
  }
}

function updateStaminaFill(value) {
  const clamped = clamp01(value)
  if (!selfStaminaEl) return
  const fill = selfStaminaEl.querySelector('.fill')
  if (fill) {
    fill.style.width = (clamped * 100) + '%'
  }
}

function updateSelfHealthFromWasm() {
  try {
    if (typeof wasmExports?.get_hp === 'function') {
      const v = wasmExports.get_hp()
      selfHealth = typeof v === 'number' ? clamp01(v) : selfHealth
      if (selfEl) updateHealthFill(selfEl, selfHealth)
    }
  } catch {}
}

// keyboard state (desktop)
const keyDown = new Set()

addEventListener('keydown', e => {
  const k = (e.key || '').toLowerCase()
  if (['w', 'a', 's', 'd', 'z', 'q', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright', 'shift', 'k', 'l', 'm'].includes(k)) {
    keyDown.add(k)
    // Initialize audio context on first user interaction
    initAudioContext()
    if (k === 'shift' || k === 'k') {
      // Try to start a roll in current movement direction
      tryStartRoll()
    } else if (k === 'l') {
      performAttack()
    } else if (k === 'm') {
      if (!blocking) {
        ensureSelfEl()
        let accepted = true
        if (typeof wasmExports?.set_blocking === 'function') {
          accepted = wasmExports.set_blocking(1, faceDirX, faceDirY) !== 0
        }
        if (accepted) {
          blocking = true
          selfEl.classList.add('blocking')
          updateShieldVisual()
          // block press effect aligned with facing
          createSparkAt(posX, posY, 'block', faceDirX, faceDirY)
          if (sendAct) sendAct({t: 'block', s: true, d: [faceDirX, faceDirY]})
        }
      }
    }
  }
})

addEventListener('keyup', e => {
  const k = (e.key || '').toLowerCase()
  keyDown.delete(k)
  if (k === 'm') {
    if (blocking) {
      blocking = false
      ensureSelfEl()
      selfEl.classList.remove('blocking')
      updateShieldVisual()
      if (typeof wasmExports?.set_blocking === 'function') {
        wasmExports.set_blocking(0, faceDirX, faceDirY)
      }
      if (sendAct) sendAct({t: 'block', s: false})
    }
  }
})

document.documentElement.className = 'ready'
if (MULTIPLAYER_ENABLED) {
  init(1)  // Use room 1 for easier testing
} else {
  console.warn('Multiplayer disabled: secure WebCrypto (crypto.subtle) not available. Serve over HTTPS or localhost to enable.')
  connectionStatusEl.innerText = 'Offline (no secure context)'
  connectionStatusEl.className = 'status-offline'
}
renderWorldMarkers()

// Orientation + fullscreen flow (mobile)
async function requestFullscreenSafe(el) {
  try {
    if (document.fullscreenElement) return
    if (el.requestFullscreen) await el.requestFullscreen()
  } catch {}
}

function isLandscape() {
  const { width, height } = getViewportSize()
  return width > height
}

function updateOverlayVisibility() {
  const urlParams = new URLSearchParams(window.location.search);
  const forceJoystick = urlParams.get('joystick') === '1';
  
  if (!isMobile && !forceJoystick) {
    orientationOverlay.hidden = true
    if (actions) actions.hidden = true
    if (controlsTip) controlsTip.hidden = false
    joystick.hidden = true
    return
  }
  
  if (forceJoystick && !isMobile) {
    // Testing mode on desktop
    orientationOverlay.hidden = true
    joystick.hidden = false
    if (actions) actions.hidden = true
    if (controlsTip) controlsTip.hidden = true
    return
  }
  
  const inLandscape = isLandscape()
  orientationOverlay.hidden = inLandscape
  joystick.hidden = !inLandscape
  if (actions) actions.hidden = !inLandscape
  if (controlsTip) controlsTip.hidden = true
  // If on mobile in landscape, attempt to enter fullscreen automatically
  if (inLandscape) {
    requestFullscreenSafe(document.documentElement)
  }
}

overlayStartBtn?.addEventListener('click', async () => {
  await requestFullscreenSafe(document.documentElement)
  updateOverlayVisibility()
})

addEventListener('orientationchange', updateOverlayVisibility)
addEventListener('resize', updateOverlayVisibility)

// Initial visibility update - call immediately and after a short delay to ensure proper initialization
updateOverlayVisibility()
setTimeout(updateOverlayVisibility, 100)

// ambient visuals init
initAmbientParticles(26)

// Add visual boundary for the playable area
const gameBoundary = document.createElement('div')
gameBoundary.className = 'game-boundary'
canvas.appendChild(gameBoundary)

function getViewportSize() {
  if (window.visualViewport) {
    return { width: visualViewport.width, height: visualViewport.height }
  }
  return { width: innerWidth, height: innerHeight }
}

function updateScale() {
  const { width, height } = getViewportSize()
  const scaleX = width / VIRTUAL_WIDTH
  const scaleY = height / VIRTUAL_HEIGHT
  const scale = Math.min(scaleX, scaleY)
  document.documentElement.style.setProperty('--scale', scale)
}

updateScale()
addEventListener('resize', updateScale)
if (window.visualViewport) {
  visualViewport.addEventListener('resize', updateScale)
  visualViewport.addEventListener('scroll', updateScale)
}

function toVirtualCoords(clientX, clientY) {
  const rect = canvas.getBoundingClientRect()
  const x = (clientX - rect.left) / rect.width
  const y = (clientY - rect.top) / rect.height
  return [x, y]
}

// Mouse movement disabled (keyboard controls only)

// Touch movement disabled; keep tap-to-drop only
addEventListener('touchstart', e => {
  e.preventDefault()
  touchStartTime = Date.now()
}, {passive: false})

addEventListener('touchend', e => {
  e.preventDefault()
  setTimeout(() => {
    connectionStatusEl.innerText = 'Connected'
    connectionStatusEl.className = 'connected'
  }, 100)
}, {passive: false})

function init(n) {
  connectionStatusEl.innerText = 'Connecting...'
  connectionStatusEl.className = 'connecting'
  
  // Initialize camera position to center on player spawn
  // Scale from WASM's 0-1 range to center third of world
  const scaledX = 3.0 * posX  // Maps 0-1 to 0-3 (full world)
  const scaledY = 3.0 * posY  // Maps 0-1 to 0-3 (full world)
  const initialWorldX = scaledX * (WORLD_WIDTH / 3)
  const initialWorldY = scaledY * (WORLD_HEIGHT / 3)
  cameraX = Math.max(0, Math.min(initialWorldX - VIRTUAL_WIDTH / 2, WORLD_WIDTH - VIRTUAL_WIDTH))
  cameraY = Math.max(0, Math.min(initialWorldY - VIRTUAL_HEIGHT / 2, WORLD_HEIGHT - VIRTUAL_HEIGHT))
  canvas.style.transform = `translate(-${cameraX}px, -${cameraY}px)`

  room = joinRoom(config, 'room' + n)
  const [sendMoveLocal, getMove] = room.makeAction('move')
  sendMove = sendMoveLocal
  const [sendActLocal, onAct] = room.makeAction('act')
  sendAct = sendActLocal

  // Better connection feedback
  setTimeout(() => {
    connectionStatusEl.innerText = 'Ready for peers'
    connectionStatusEl.className = 'connected'
  }, 2000)
  
  room.onPeerJoin(peerId => {
    // Skip if it's our own ID (shouldn't happen but be safe)
    if (peerId === selfId) return
    console.log(`Peer joined: ${peerId}`)
    connectionStatusEl.innerText = 'Peer Connected!'
    // ensure element and color assigned
    getOrCreatePeerEl(peerId)
    updatePeerInfo()
  })
  
  room.onPeerLeave(peerId => {
    // Skip if it's our own ID
    if (peerId === selfId) return
    console.log(`Peer left: ${peerId}`)
    connectionStatusEl.innerText = 'Peer Disconnected'
    removePeerEl(peerId)
    updatePeerInfo()
  })
  
  // receive peer movement
  getMove(([x, y], peerId) => {
    // Ignore our own movement messages to prevent duplicate player
    if (peerId === selfId) return
    if (typeof x !== 'number' || typeof y !== 'number') return
    const el = getOrCreatePeerEl(peerId)
    setElPos(el, clamp01(x), clamp01(y))
    // If we haven't spawned yet, try again now that we know a peer position
    setSpawnPointIfNeeded(false)
  })

  // receive peer actions (attack / block / roll)
  onAct((msg, peerId) => {
    // Ignore our own action messages
    if (peerId === selfId) return
    if (!msg || typeof msg !== 'object') return
    const el = getOrCreatePeerEl(peerId)
    const t = msg.t
    if (t === 'attack') {
      const dir = Array.isArray(msg.d) ? msg.d : [1, 0]
      flashClass(el, 'attacking', 200)
      const sword = document.createElement('div')
      sword.className = 'sword'
      const angle = Math.atan2(dir[1], dir[0]) * 180 / Math.PI
      sword.style.setProperty('--angle', angle + 'deg')
      sword.style.setProperty('--dirX', String(dir[0]))
      sword.style.setProperty('--dirY', String(dir[1]))
      el.appendChild(sword)
      setTimeout(() => { if (sword.parentNode) sword.parentNode.removeChild(sword) }, 220)

      // Evaluate against our WASM defensive state (range, block/parry timing)
      try {
        if (wasmExports && typeof wasmExports.handle_incoming_attack === 'function') {
          const leftPx = parseFloat(el.style.left || '0')
          const topPx = parseFloat(el.style.top || '0')
          // Convert screen coordinates back to world coordinates
          const worldX = leftPx + cameraX
          const worldY = topPx + cameraY
          // Unscale from world to WASM's 0-1 range
          const unscaledX = (worldX / (WORLD_WIDTH / 3)) / 3.0  // Maps from full world back to 0-1
          const unscaledY = (worldY / (WORLD_HEIGHT / 3)) / 3.0  // Maps from full world back to 0-1
          const ax = clamp01(unscaledX)
          const ay = clamp01(unscaledY)
          // Post an attack sound at peer position
          postSoundAt(ax, ay, 0.8)
          const res = wasmExports.handle_incoming_attack(ax, ay, dir[0] || 1, dir[1] || 0)
          // -1 = ignore, 0 = hit, 1 = block, 2 = perfect parry
          if (res === 1) {
            // normal block: small spark at shield
            createSparkAt(posX, posY, 'block', faceDirX, faceDirY)
            screenShake(3, 120)
          } else if (res === 2) {
            // perfect parry: stronger spark + broadcast for others to render
            createSparkAt(posX, posY, 'parry', faceDirX, faceDirY)
            if (sendAct) sendAct({t: 'parryFx', p: [posX, posY], d: [faceDirX, faceDirY]})
            screenShake(6, 160)
          }
        }
      } catch (e) {
        // ignore evaluation errors
      }
    } else if (t === 'block') {
      const on = !!msg.s
      el.classList.toggle('blocking', on)
      const dir = Array.isArray(msg.d) ? msg.d : [1, 0]
      updatePeerShieldVisual(el, on, dir[0], dir[1])
      if (on) {
        const leftPx = parseFloat(el.style.left || '0')
        const topPx = parseFloat(el.style.top || '0')
        // Convert screen coordinates back to world coordinates
        const worldX = leftPx + cameraX
        const worldY = topPx + cameraY
        // Unscale from world to WASM's 0-1 range
        const unscaledX = (worldX / (WORLD_WIDTH / 3)) / 3.0  // Maps from full world back to 0-1
        const unscaledY = (worldY / (WORLD_HEIGHT / 3)) / 3.0  // Maps from full world back to 0-1
        const nx = clamp01(unscaledX)
        const ny = clamp01(unscaledY)
        // peer's block spark aligned to their reported direction if provided
        createSparkAt(nx, ny, 'block', dir[0], dir[1])
      }
    } else if (t === 'roll') {
      const dir = Array.isArray(msg.d) ? msg.d : [1, 0]
      el.classList.add('rolling')
      // brief visual; rely on same duration as local roll
      setTimeout(() => el.classList.remove('rolling'), ROLL_DURATION * 1000)
      // optional: nudge shield direction if blocking
      if (el.classList.contains('blocking')) updatePeerShieldVisual(el, true, dir[0], dir[1])
      // roll whoosh sound at peer position
      const leftPx = parseFloat(el.style.left || '0')
      const topPx = parseFloat(el.style.top || '0')
      // Convert screen coordinates back to world coordinates
      const worldX = leftPx + cameraX
      const worldY = topPx + cameraY
      // Unscale from world to WASM's 0-1 range
      const unscaledX = (worldX / (WORLD_WIDTH / 3)) / 3.0  // Maps from full world back to 0-1
      const unscaledY = (worldY / (WORLD_HEIGHT / 3)) / 3.0  // Maps from full world back to 0-1
      const nx = clamp01(unscaledX)
      const ny = clamp01(unscaledY)
      postSoundAt(nx, ny, 0.45)
      screenShake(2, 100)
    } else if (t === 'posreq') {
      // Respond to position requests from new peers
      if (sendMove) sendMove([posX, posY])
    } else if (t === 'parryFx') {
      const p = Array.isArray(msg.p) ? msg.p : null
      const d = Array.isArray(msg.d) ? msg.d : null
      if (p) {
        if (d) createSparkAt(clamp01(p[0]), clamp01(p[1]), 'parry', d[0], d[1])
        else createSparkAt(clamp01(p[0]), clamp01(p[1]), 'parry')
      }
    }
  })

  // Ask existing peers to share their current positions, then pick a spawn
  if (sendAct) sendAct({t: 'posreq'})
  // Pick an initial spawn immediately with whatever info we have
  setSpawnPointIfNeeded(true)
  // Re-evaluate shortly after to incorporate any freshly received positions
  setTimeout(() => setSpawnPointIfNeeded(false), 600)
}

function clamp01(v) {
  return v < 0 ? 0 : (v > 1 ? 1 : v)
}

function updateFromKeyboard() {
  // Supports WASD, ZQSD, Arrows
  const up = keyDown.has('w') || keyDown.has('z') || keyDown.has('arrowup')
  const left = keyDown.has('a') || keyDown.has('q') || keyDown.has('arrowleft')
  const down = keyDown.has('s') || keyDown.has('arrowdown')
  const right = keyDown.has('d') || keyDown.has('arrowright')
  keyboardInputX = (right ? 1 : 0) - (left ? 1 : 0)
  keyboardInputY = (down ? 1 : 0) - (up ? 1 : 0)
}

function canStartRoll() {
  if (isRolling) return false
  if (rollCooldownLeft > 0) return false
  // determine current desired movement
  const moveX = (inputX !== 0 ? inputX : keyboardInputX)
  const moveY = (inputY !== 0 ? inputY : keyboardInputY)
  return (moveX !== 0 || moveY !== 0)
}

function tryStartRoll() {
  // ensure keyboard state up to date
  updateFromKeyboard()
  if (!canStartRoll()) return
  // Ask WASM to apply roll start stamina cost; cancel if rejected
  if (typeof wasmExports?.on_roll_start === 'function') {
    const ok = wasmExports.on_roll_start()
    if (ok === 0) return
  }
  const moveX = (inputX !== 0 ? inputX : keyboardInputX)
  const moveY = (inputY !== 0 ? inputY : keyboardInputY)
  const len = Math.hypot(moveX, moveY) || 1
  rollDirX = moveX / len
  rollDirY = moveY / len
  faceDirX = rollDirX
  faceDirY = rollDirY
  
  // Use GameRenderer roll if available
  if (gameRenderer) {
    const rollAngle = Math.atan2(rollDirY, rollDirX)
    if (gameRenderer.performRoll(rollAngle)) {
      // Trigger camera effects
      if (cameraEffects) {
        cameraEffects.rollDodge()
      }
    }
  }
  
  isRolling = true
  rollTimeLeft = ROLL_DURATION
  rollCooldownLeft = ROLL_COOLDOWN
  ensureSelfEl()
  selfEl.classList.add('rolling')
  if (rollButton) rollButton.disabled = true
  // broadcast roll start with normalized direction
  if (sendAct) sendAct({t: 'roll', d: [rollDirX, rollDirY]})
  // emit a roll sound locally
  postLocalSound(0.45)
}

function stopRoll() {
  if (!isRolling) return
  isRolling = false
  rollTimeLeft = 0
  ensureSelfEl()
  selfEl.classList.remove('rolling')
}

async function gameLoop(ts) {
  const dt = lastFrameTs ? (ts - lastFrameTs) / 1000 : 0
  lastFrameTs = ts

  // Only run game loop if game is started
  if (!gameStarted) {
    requestAnimationFrame(gameLoop)
    return
  }

  // Require WASM for simulation; no JS fallback
  if (!wasmExports || typeof wasmExports.update !== 'function') {
    requestAnimationFrame(gameLoop)
    return
  }

  // Update current biome from WASM
  if (typeof wasmExports.get_current_biome === 'function') {
    const newBiome = wasmExports.get_current_biome()
    if (newBiome !== currentBiome) {
      currentBiome = newBiome;
      if (gameRenderer) {
        gameRenderer.currentBiome = currentBiome;
      }
    }
  }

  updateFromKeyboard()
  
  // If GameRenderer is available, use it for enhanced rendering
  if (gameRenderer && cameraEffects) {
    // Update camera effects
    cameraEffects.update(dt)
    
    // Prepare input for GameRenderer
    const gameInput = {
      left: keyboardInputX < 0 || inputX < 0,
      right: keyboardInputX > 0 || inputX > 0,
      up: keyboardInputY < 0 || inputY < 0,
      down: keyboardInputY > 0 || inputY > 0,
      sprint: false, // Can be mapped to a key later
      jump: false
    }
    
    // Update GameRenderer's player
    gameRenderer.updatePlayer(dt, gameInput)
    
    // Sync position from WASM to GameRenderer
    if (typeof wasmExports.get_x === 'function' && typeof wasmExports.get_y === 'function') {
      const wasmX = wasmExports.get_x()
      const wasmY = wasmExports.get_y()
      gameRenderer.setPlayerPositionFromWasm(wasmX, wasmY)
      
      // Disabled enemy spawning - canvas cleaned for player-only view
      // Also sync enemies from WASM if available
      // if (typeof wasmExports.get_enemy_count === 'function') {
      //   const enemyCount = wasmExports.get_enemy_count()
      //   gameRenderer.enemies = [] // Clear existing enemies
      //
      //   for (let i = 0; i < enemyCount && i < 50; i++) {
      //     if (typeof wasmExports.get_enemy_x === 'function' &&
      //         typeof wasmExports.get_enemy_y === 'function') {
      //       const enemyWasmX = wasmExports.get_enemy_x(i)
      //       const enemyWasmY = wasmExports.get_enemy_y(i)
      //       const worldPos = gameRenderer.wasmToWorld(enemyWasmX, enemyWasmY)
      //
      //       // Add enemy to GameRenderer
      //       gameRenderer.enemies.push({
      //         x: worldPos.x,
      //         y: worldPos.y,
      //         width: 40,
      //         height: 56,
      //         velocityX: 0,
      //         velocityY: 0,
      //         health: 50,
      //         maxHealth: 50,
      //         state: 'idle',
      //         type: 'wolf',
      //         color: '#8b4513',
      //         ai: {
      //           patrolStart: worldPos.x - 100,
      //           patrolEnd: worldPos.x + 100,
      //           patrolDirection: 1
      //         }
      //       })
      //     }
      //   }
      // }

      // Clear any existing enemies for clean canvas
      gameRenderer.enemies = []
    }

    // Update and render AnimatedPlayer using same dt and camera
    if (animatedPlayer) {
      const pressedKeys = getPressedKeysForPlayer()
      const apInput = AnimatedPlayer.createInputFromKeys(pressedKeys)
      animatedPlayer.update(dt, apInput)
      const ctx = gameCanvas.getContext('2d')
      animatedPlayer.render(ctx, gameRenderer.camera)
    }
  }

  // joystick input already updates inputX/inputY
  // Debug: Log joystick input occasionally
  if (inputX !== 0 || inputY !== 0) {
    if (Math.random() < 0.01) { // Log 1% of the time to avoid spam
      console.log('Joystick controlling local player:', { inputX, inputY, posX, posY });
    }
  }
  
  // update roll timers
  if (rollCooldownLeft > 0) rollCooldownLeft = Math.max(0, rollCooldownLeft - dt)
  if (attackCooldownLeft > 0) attackCooldownLeft = Math.max(0, attackCooldownLeft - dt)
  if (isRolling) {
    rollTimeLeft -= dt
    // Forward inputs to WASM (rolling)
    try {
      if (typeof wasmExports.set_player_input === 'function') {
        wasmExports.set_player_input(rollDirX, rollDirY, 1, 0, 0, blocking ? 1 : 0)
      }
    } catch {}
    // Advance simulation with delta time only
    if (typeof wasmExports.update === 'function') {
      wasmExports.update(dt)
    }
    // Don't clamp to 0-1, WASM already handles boundaries
    posX = (typeof wasmExports.get_x === 'function') ? wasmExports.get_x() : posX
    posY = (typeof wasmExports.get_y === 'function') ? wasmExports.get_y() : posY
    // keep facing along roll direction and spawn trail
    faceDirX = rollDirX
    faceDirY = rollDirY
    trailAccumulator += dt
    const TRAIL_INTERVAL = 0.04
    while (trailAccumulator >= TRAIL_INTERVAL) {
      createTrailAt(posX, posY)
      trailAccumulator -= TRAIL_INTERVAL
    }
    if (rollTimeLeft <= 0) stopRoll()
  } else {
    const moveX = (inputX !== 0 ? inputX : keyboardInputX)
    const moveY = (inputY !== 0 ? inputY : keyboardInputY)
    // Clamp diagonal magnitude so movement speed is uniform in all directions
    let dirX = moveX
    let dirY = moveY
    const mag = Math.hypot(moveX, moveY)
    if (mag > 1) {
      dirX = moveX / mag
      dirY = moveY / mag
    }
    // Check for jump input
    const jumpPressed = keyDown.has('space') || keyDown.has(' ')
    
    // Forward inputs to WASM (normal movement)
    try {
      if (typeof wasmExports.set_player_input === 'function') {
        wasmExports.set_player_input(dirX, dirY, 0, jumpPressed ? 1 : 0, 0, blocking ? 1 : 0)
      }
    } catch {}
    // Advance simulation with delta time only
    if (typeof wasmExports.update === 'function') {
      wasmExports.update(dt)
    }
    // Don't clamp to 0-1, WASM already handles boundaries
    posX = (typeof wasmExports.get_x === 'function') ? wasmExports.get_x() : posX
    posY = (typeof wasmExports.get_y === 'function') ? wasmExports.get_y() : posY
    // update facing when moving and reset trail accumulator
    if (dirX !== 0 || dirY !== 0) {
      const len2 = Math.hypot(dirX, dirY) || 1
      faceDirX = dirX / len2
      faceDirY = dirY / len2
    }
    if (trailAccumulator > 0) trailAccumulator = 0
  }

  // update self shadow based on motion state
  const movedDist = Math.hypot(posX - prevPosX, posY - prevPosY)
  const moving = movedDist > 0.001
  updateSelfShadow(moving, isRolling)

  // Keep WASM-side block facing updated while holding block
  if (blocking && typeof wasmExports?.set_blocking === 'function') {
    // Keep block active if WASM accepts; if it rejects (0), reflect in UI
    const res = wasmExports.set_blocking(1, faceDirX, faceDirY)
    if (res === 0) {
      blocking = false
      selfEl?.classList.remove('blocking')
      updateShieldVisual()
    }
  }

  // update mobile roll button disabled state based on cooldown
  if (rollButton) {
    const canUse = !isRolling && rollCooldownLeft <= 0 && (inputX !== 0 || inputY !== 0 || keyboardInputX !== 0 || keyboardInputY !== 0)
    // keep disabled during cooldown or when no direction
    rollButton.disabled = !canUse
  }
  if (attackButton) {
    attackButton.disabled = attackCooldownLeft > 0
  }

  // stamina UI from WASM
  if (typeof wasmExports?.get_stamina === 'function') {
    const s = wasmExports.get_stamina()
    updateStaminaFill(typeof s === 'number' ? s : 1)
  }
  // health UI from WASM
  updateSelfHealthFromWasm()

  // Footstep sounds while moving (UI emits periodic pings; logic remains in WASM)
  prevPosX = posX
  prevPosY = posY
  if (moving) {
    footstepAccum += dt
    const STEP_INTERVAL = 0.33
    if (footstepAccum >= STEP_INTERVAL) {
      footstepAccum = 0
      postLocalSound(0.25)
    }
  } else if (footstepAccum > 0) {
    footstepAccum = 0
  }

  // Phase overlay management
  try {
    if (typeof wasmExports?.get_phase === 'function') {
      const phase = wasmExports.get_phase()
      
      // Hide all phase overlays first
      const phaseOverlays = {
        2: 'choice-overlay',
        4: 'risk-overlay',
        5: 'escalate-overlay',
        6: 'cashout-overlay',
        7: 'gameover-overlay'
      }
      
      // Hide all overlays
      Object.values(phaseOverlays).forEach(id => {
        const overlay = document.getElementById(id)
        if (overlay && !phaseOverlays[phase] || phaseOverlays[phase] !== id) {
          overlay.hidden = true
        }
      })
      
      // Show appropriate overlay for current phase
      switch (phase) {
        case 2: // Choose
          if (!choiceVisible) {
            populateAndShowChoices()
          }
          break
          
        case 4: // Risk
          updateRiskPhaseUI()
          document.getElementById('risk-overlay').hidden = false
          break
          
        case 5: // Escalate
          updateEscalatePhaseUI()
          document.getElementById('escalate-overlay').hidden = false
          break
          
        case 6: // CashOut
          updateCashOutPhaseUI()
          document.getElementById('cashout-overlay').hidden = false
          break
          
        case 7: // Reset
          gameOverOverlay.hidden = false
          break
          
        default:
          // Explore/Fight/PowerUp - no overlay
          break
      }
    }
  } catch {}

  // render self and send throttled movement updates
  ensureSelfEl()
  setElPos(selfEl, posX, posY)
  
  // Use GameRenderer for enhanced rendering if available
  if (gameRenderer && cameraEffects) {
    // Clear and render with GameRenderer
    const ctx = gameCanvas.getContext('2d')
    
    // Pre-render camera effects
    cameraEffects.preRender(ctx)
    
    // Render game world with GameRenderer
    gameRenderer.render(true) // true = follow player
    
    // Render enemies and obstacles from GameRenderer
    gameRenderer.updateEnemies(dt)
    gameRenderer.updateProjectiles(dt)
    gameRenderer.checkCollisions()
    
    // Post-render camera effects
    cameraEffects.postRender(ctx)
    
    // Camera effects are handled by the CameraEffects class internally
  } else {
    // Fallback to original rendering
    updateCamera()
    
    // Disabled enemy rendering - canvas cleaned for player-only view
    // Use enhanced wolf rendering if game canvas is available
    // if (gameCanvas && wolfCharacters) {
    //   renderWolvesEnhanced()
    // } else {
    //   await renderEnemies()
    // }
    

    applyScreenShake(performance.now())
  }
  

  // keep shield oriented and offset in front
  updateShieldVisual()
  // update debug HUD (optional exports)
  updateDebugHud()
  const timeSinceSend = (performance.now() - lastMoveSendTs)
  const movedEnough = Math.hypot(posX - lastSentX, posY - lastSentY) > 0.002
  if (room && sendMove && (timeSinceSend > 50) && movedEnough) {
    sendMove([posX, posY])
    lastMoveSendTs = performance.now()
    lastSentX = posX
    lastSentY = posY
    }

  requestAnimationFrame((ts) => gameLoop(ts).catch(console.error))
}

// Game initialization state
let gameInitialized = false
let gameStarted = false

// Hide loading screen when game initializes
const loadingScreen = document.getElementById('loadingScreen')
if (loadingScreen) {
  // Don't hide loading screen immediately - wait for proper initialization
  console.log('Loading screen ready - waiting for game initialization')
}

// Function to properly start the game
function startGame() {
  if (gameStarted) return
  
  // Check if WASM is loaded
  if (!wasmExports || typeof wasmExports.update !== 'function') {
    console.warn('Cannot start game: WASM not loaded yet')
    return
  }
  
  console.log('Starting game...')
  gameStarted = true
  
  // Hide loading screen
  if (loadingScreen) {
    loadingScreen.style.display = 'none'
    console.log('Loading screen hidden - game starting')
  }
  
  // Hide orientation overlay if visible
  if (orientationOverlay) {
    orientationOverlay.hidden = true
  }
  
  // Show controls tip
  if (controlsTip) {
    controlsTip.hidden = false
  }
  
  // Initialize game if not already done
  if (!gameInitialized) {
    gameInitialized = true
    console.log('Game initialized and started')
  }
}

// Make startGame globally available
window.startGame = startGame

// Add event listener for the start game button
const startGameBtn = document.getElementById('start-game-btn')
if (startGameBtn) {
  startGameBtn.addEventListener('click', () => {
    startGame()
  })
}

// Add error handling for WASM loading
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
  if (loadingScreen) {
    loadingScreen.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text">Error loading game: ${event.error?.message || 'Unknown error'}</div>
      <div class="loading-text" style="font-size: 14px; margin-top: 10px;">Check console for details</div>
    `
  }
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  if (loadingScreen) {
    loadingScreen.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text">Error loading game: ${event.reason?.message || 'Unknown error'}</div>
      <div class="loading-text" style="font-size: 14px; margin-top: 10px;">Check console for details</div>
    `
  }
})

requestAnimationFrame((ts) => gameLoop(ts).catch(console.error))
setInterval(renderWorldMarkers, 1000)

function updatePeerInfo() {
  const count = Object.keys(room.getPeers()).length
  peerCountEl.innerText = `Players: ${count + 1}`
}

// Render landmarks/exits from WASM snapshot (UI-only)
function renderWorldMarkers() {
  if (!wasmExports) return
  try {
    const lmCount = (typeof wasmExports.get_landmark_count === 'function') ? wasmExports.get_landmark_count() : 0
    const exCount = (typeof wasmExports.get_exit_count === 'function') ? wasmExports.get_exit_count() : 0
    // Clear old markers
    for (const el of Array.from(canvas.querySelectorAll('.marker'))) { canvas.removeChild(el) }
    // Add landmarks
    for (let i = 0; i < lmCount; i++) {
      const x = wasmExports.get_landmark_x(i)
      const y = wasmExports.get_landmark_y(i)
      const m = document.createElement('div')
      m.className = 'marker landmark'
      // Scale from WASM's 0-1 range to center third of world
      const scaledX = 1.0 + clamp01(x)  // Maps 0-1 to 1-2 (center third of 0-3)
      const scaledY = 1.0 + clamp01(y)  // Maps 0-1 to 1-2 (center third of 0-3)
      m.style.left = (scaledX * (WORLD_WIDTH / 3)) + 'px'
      m.style.top = (scaledY * (WORLD_HEIGHT / 3)) + 'px'
      canvas.appendChild(m)
    }
    // Add exits
    for (let i = 0; i < exCount; i++) {
      const x = wasmExports.get_exit_x(i)
      const y = wasmExports.get_exit_y(i)
      const m = document.createElement('div')
      m.className = 'marker exit'
      // Scale from WASM's 0-1 range to center third of world
      const scaledX = 1.0 + clamp01(x)  // Maps 0-1 to 1-2 (center third of 0-3)
      const scaledY = 1.0 + clamp01(y)  // Maps 0-1 to 1-2 (center third of 0-3)
      m.style.left = (scaledX * (WORLD_WIDTH / 3)) + 'px'
      m.style.top = (scaledY * (WORLD_HEIGHT / 3)) + 'px'
      canvas.appendChild(m)
    }
  } catch {}
}

// Mobile joystick logic
let joystickActive = false
let joystickCenterX = 0
let joystickCenterY = 0
let joystickTouchId = null
const knobMaxRadius = 40 // px within base

function setKnob(dx, dy) {
  const len = Math.hypot(dx, dy)
  const clampedLen = Math.min(len, knobMaxRadius)
  const nx = len ? (dx / len) : 0
  const ny = len ? (dy / len) : 0
  const offsetX = nx * clampedLen
  const offsetY = ny * clampedLen
  joystickKnob.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`
  // normalize to [-1,1]
  inputX = clampedLen ? (dx / knobMaxRadius) : 0
  inputY = clampedLen ? (dy / knobMaxRadius) : 0
}

function resetKnob() {
  joystickKnob.style.transform = 'translate(-50%, -50%)'
  if (!keyDown.size) {
    inputX = 0
    inputY = 0
  }
}

function attachJoystick() {
  // Allow joystick on mobile OR if explicitly testing with ?joystick=1 in URL
  const urlParams = new URLSearchParams(window.location.search);
  const forceJoystick = urlParams.get('joystick') === '1';
  
  if (!isMobile && !forceJoystick) return
  
  console.log('Joystick initialized for', isMobile ? 'mobile device' : 'testing mode');
  if (MULTIPLAYER_ENABLED) console.log('Local player ID:', selfId);
  
  const onStart = e => {
    const t = (e.touches ? e.touches[0] : e)
    joystickTouchId = t.identifier ?? 'mouse'
    joystickActive = true
    const rect = joystickBase.getBoundingClientRect()
    joystickCenterX = rect.left + rect.width / 2
    joystickCenterY = rect.top + rect.height / 2
    setKnob(t.clientX - joystickCenterX, t.clientY - joystickCenterY)
    e.preventDefault()
  }
  const onMove = e => {
    if (!joystickActive) return
    let t
    if (e.touches) {
      for (const touch of e.touches) {
        if ((touch.identifier ?? 'mouse') === joystickTouchId) { t = touch; break }
      }
    } else {
      t = e
    }
    if (!t) return
    setKnob(t.clientX - joystickCenterX, t.clientY - joystickCenterY)
    e.preventDefault()
  }
  const onEnd = e => {
    joystickActive = false
    joystickTouchId = null
    resetKnob()
    e.preventDefault()
  }
  joystickBase.addEventListener('touchstart', onStart, {passive: false})
  joystickBase.addEventListener('touchmove', onMove, {passive: false})
  joystickBase.addEventListener('touchend', onEnd, {passive: false})
  joystickBase.addEventListener('mousedown', onStart)
  addEventListener('mousemove', onMove)
  addEventListener('mouseup', onEnd)
}

attachJoystick()

// Mobile roll button events
// Helper function to add both touch and click handlers
function addButtonHandler(button, handler) {
  if (!button) return
  
  // Prevent double-firing on devices that emit both touch and click
  let touchHandled = false
  
  button.addEventListener('touchstart', (e) => {
    e.preventDefault()
    touchHandled = true
    handler()
    setTimeout(() => { touchHandled = false }, 300)
  }, {passive: false})
  
  button.addEventListener('click', (e) => {
    if (!touchHandled) {
      handler()
    }
  })
}

if (rollButton) {
  addButtonHandler(rollButton, () => {
    tryStartRoll()
  })
}

// Mobile action buttons: attack and block
function flashClass(el, className, ms) {
  if (!el) return
  el.classList.add(className)
  setTimeout(() => el.classList.remove(className), ms)
}

if (attackButton) {
  addButtonHandler(attackButton, () => {
    performAttack()
  })
}

if (blockButton) {
  addButtonHandler(blockButton, () => {
    ensureSelfEl()
    const wantOn = !blocking
    if (typeof wasmExports?.set_blocking === 'function') {
      const res = wasmExports.set_blocking(wantOn ? 1 : 0, faceDirX, faceDirY)
      blocking = wantOn ? (res !== 0) : false
    } else {
      blocking = wantOn
    }
    selfEl.classList.toggle('blocking', blocking)
    updateShieldVisual()
    if (sendAct) sendAct({t: 'block', s: blocking, d: [faceDirX, faceDirY]})
  })
}

// Combat + visuals helpers
function getFacingAngleDegrees() {
  const len = Math.hypot(faceDirX, faceDirY) || 1
  const nx = faceDirX / len
  const ny = faceDirY / len
  return Math.atan2(ny, nx) * 180 / Math.PI
}

function performAttack() {
  if (attackCooldownLeft > 0) return
  // Apply stamina cost in WASM; if function exists and returns 0, cancel attack
  if (typeof wasmExports?.on_attack === 'function') {
    const ok = wasmExports.on_attack()
    if (ok === 0) return
  }
  
  // Use GameRenderer attack if available
  if (gameRenderer) {
    if (gameRenderer.performAttack()) {
      // Trigger camera effects for attack
      if (cameraEffects) {
        cameraEffects.smallImpact()
      }
    }
  }
  
  ensureSelfEl()
  flashClass(selfEl, 'attacking', 200)
  const sword = document.createElement('div')
  sword.className = 'sword'
  const angle = getFacingAngleDegrees()
  sword.style.setProperty('--angle', angle + 'deg')
  sword.style.setProperty('--dirX', String(faceDirX))
  sword.style.setProperty('--dirY', String(faceDirY))
  selfEl.appendChild(sword)
  setTimeout(() => {
    if (sword.parentNode) sword.parentNode.removeChild(sword)
  }, 220)
  // broadcast attack with current facing direction
  if (sendAct) sendAct({t: 'attack', d: [faceDirX, faceDirY]})
  // emit an attack sound locally
  postLocalSound(0.8)
  attackCooldownLeft = ATTACK_COOLDOWN
  screenShake(4, 140)
  if (attackButton) {
    attackButton.disabled = true
    setTimeout(() => { attackButton.disabled = false }, ATTACK_COOLDOWN * 1000)
  }
}

// Visual spark for block/parry
function createSparkAt(xNorm, yNorm, kind, dirX = faceDirX, dirY = faceDirY) {
  // Offset the spark in front of the position, aligned to facing
  const len = Math.hypot(dirX, dirY) || 1
  const nx = dirX / len
  const ny = dirY / len
  const pxOffset = 22 // match shield offset in CSS
  // Convert normalized world coordinates to screen coordinates
  // Scale from WASM's 0-1 range to center third of world
  const scaledX = 1.0 + xNorm  // Maps 0-1 to 1-2 (center third of 0-3)
  const scaledY = 1.0 + yNorm  // Maps 0-1 to 1-2 (center third of 0-3)
  const worldX = scaledX * (WORLD_WIDTH / 3)
  const worldY = scaledY * (WORLD_HEIGHT / 3)
  const baseLeft = worldX - cameraX
  const baseTop = worldY - cameraY
  const leftPx = baseLeft + nx * pxOffset
  const topPx = baseTop + ny * pxOffset
  const s = document.createElement('div')
  s.className = kind === 'parry' ? 'spark parry' : 'spark block'
  const angle = Math.atan2(ny, nx) * 180 / Math.PI
  s.style.setProperty('--angle', angle + 'deg')
  s.style.setProperty('--mirror', nx < 0 ? '-1' : '1')
  s.style.left = leftPx + 'px'
  s.style.top = topPx + 'px'
  canvas.appendChild(s)
  setTimeout(() => { if (s.parentNode === canvas) canvas.removeChild(s) }, 420)
}

function ensureShieldEl() {
  if (!selfShieldEl) {
    selfShieldEl = document.createElement('div')
    selfShieldEl.className = 'shield'
    selfEl.appendChild(selfShieldEl)
  }
  return selfShieldEl
}

function updateShieldVisual() {
  if (!selfEl) return
  if (blocking) {
    const el = ensureShieldEl()
    el.style.setProperty('--dirX', String(faceDirX))
    el.style.setProperty('--dirY', String(faceDirY))
    const angle = Math.atan2(faceDirY, faceDirX) * 180 / Math.PI
    el.style.setProperty('--angle', angle + 'deg')
    el.style.setProperty('--mirror', faceDirX < 0 ? '-1' : '1')
  } else if (selfShieldEl && selfShieldEl.parentNode) {
    selfShieldEl.parentNode.removeChild(selfShieldEl)
    selfShieldEl = null
  }
}

// Peer shield helpers
function ensurePeerShieldEl(peerEl) {
  let el = peerToShieldEl.get(peerEl)
  if (!el) {
    el = document.createElement('div')
    el.className = 'shield'
    peerEl.appendChild(el)
    peerToShieldEl.set(peerEl, el)
  }
  return el
}

function updatePeerShieldVisual(peerEl, on, dirX, dirY) {
  if (on) {
    const el = ensurePeerShieldEl(peerEl)
    el.style.setProperty('--dirX', String(dirX))
    el.style.setProperty('--dirY', String(dirY))
    const angle = Math.atan2(dirY, dirX) * 180 / Math.PI
    el.style.setProperty('--angle', angle + 'deg')
    el.style.setProperty('--mirror', dirX < 0 ? '-1' : '1')
  } else {
    const el = peerToShieldEl.get(peerEl)
    if (el && el.parentNode) el.parentNode.removeChild(el)
    peerToShieldEl.delete(peerEl)
  }
}

function createTrailAt(xNorm, yNorm) {
  const t = document.createElement('div')
  t.className = 'trail'
  // Convert normalized world coordinates to screen coordinates
  // Scale from WASM's 0-1 range to center third of world
  const scaledX = 1.0 + xNorm  // Maps 0-1 to 1-2 (center third of 0-3)
  const scaledY = 1.0 + yNorm  // Maps 0-1 to 1-2 (center third of 0-3)
  const worldX = scaledX * (WORLD_WIDTH / 3)
  const worldY = scaledY * (WORLD_HEIGHT / 3)
  const screenX = worldX - cameraX
  const screenY = worldY - cameraY
  t.style.left = screenX + 'px'
  t.style.top = screenY + 'px'
  canvas.appendChild(t)
  setTimeout(() => {
    if (t.parentNode === canvas) canvas.removeChild(t)
  }, 450)
}

// -----------------------------
// Choice overlay + restart hooks
// -----------------------------
function rarityLabel(r) {
  return r === 2 ? 'Rare' : (r === 1 ? 'Uncommon' : 'Common')
}

function typeLabel(t) {
  return t === 0 ? 'Safe' : (t === 1 ? 'Spicy' : 'Weird')
}

function populateAndShowChoices() {
  if (!choiceOverlay || !wasmExports) return
  const count = (typeof wasmExports.get_choice_count === 'function') ? wasmExports.get_choice_count() : 0
  const buttons = [choiceBtn0, choiceBtn1, choiceBtn2]
  for (let i = 0; i < 3; i++) {
    const btn = buttons[i]
    if (!btn) continue
    if (i < count) {
      const id = wasmExports.get_choice_id(i)
      const t = wasmExports.get_choice_type(i)
      const r = wasmExports.get_choice_rarity(i)
      btn.disabled = false
      btn.dataset.choiceId = String(id)
      btn.textContent = `${typeLabel(t)} · ${rarityLabel(r)}`
      btn.hidden = false
    } else {
      btn.disabled = true
      btn.textContent = ''
      btn.hidden = true
    }
  }
  choiceOverlay.hidden = false
  choiceVisible = true
}

function hideChoices() {
  if (!choiceOverlay) return
  choiceOverlay.hidden = true
  choiceVisible = false
}

function tryCommitChoice(id) {
  if (!wasmExports || typeof wasmExports.commit_choice !== 'function') return
  const ok = wasmExports.commit_choice(id)
  if (ok) hideChoices()
}

choiceBtn0?.addEventListener('click', () => {
  const id = Number(choiceBtn0.dataset.choiceId || '0')
  tryCommitChoice(id)
})
choiceBtn1?.addEventListener('click', () => {
  const id = Number(choiceBtn1.dataset.choiceId || '0')
  tryCommitChoice(id)
})
choiceBtn2?.addEventListener('click', () => {
  const id = Number(choiceBtn2.dataset.choiceId || '0')
  tryCommitChoice(id)
})

function restartRun() {
  if (!wasmExports) return
  try {
    if (typeof wasmExports.reset_run === 'function') wasmExports.reset_run(runSeed)
    // reset local state
    isRolling = false
    rollTimeLeft = 0
    rollCooldownLeft = 0
    attackCooldownLeft = 0
    blocking = false
    selfEl?.classList.remove('blocking')
    updateShieldVisual()
    // reset overlays and health cache
    gameOverOverlay.hidden = true
    selfHealth = 1
    // choose a fresh spawn
    hasSpawned = false
    setSpawnPointIfNeeded(true)
  } catch {}
}

restartButton?.addEventListener('click', restartRun)
rematchButton?.addEventListener('click', restartRun)

// Keyboard quick-restart (R)
addEventListener('keydown', e => {
  const k = (e.key || '').toLowerCase()
  if (k === 'r') restartRun()
})
