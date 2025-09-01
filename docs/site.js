import {joinRoom, selfId} from 'https://esm.run/trystero/mqtt'  // MQTT strategy - try this if Nostr fails
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
  if (typeof wasmExports.start === 'function') wasmExports.start()
  // Seed and initialize a run inside WASM (logic stays in WASM)
  try {
    if (typeof wasmExports.init_run === 'function') {
      const usp = new URLSearchParams(location.search)
      const urlSeed = usp.get('seed')
      if (urlSeed != null && /^\d+$/.test(urlSeed)) {
        runSeed = BigInt(urlSeed)
      } else {
        runSeed = BigInt(Date.now())
      }
      wasmExports.init_run(runSeed, 0)
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
  if (nowMs >= shakeEndTimeMs) {
    canvas.style.setProperty('--shake-x', '0px')
    canvas.style.setProperty('--shake-y', '0px')
    return
  }
  const t = (shakeEndTimeMs - nowMs) / 200 // decay factor
  const amp = Math.max(0, shakeStrengthPx) * t * t
  const x = (Math.random() * 2 - 1) * amp
  const y = (Math.random() * 2 - 1) * amp
  canvas.style.setProperty('--shake-x', x.toFixed(2) + 'px')
  canvas.style.setProperty('--shake-y', y.toFixed(2) + 'px')
}
function initAmbientParticles(count = 22) {
  const w = VIRTUAL_WIDTH
  const h = VIRTUAL_HEIGHT
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
const peerCountEl = byId('peer-count')
const connectionStatusEl = byId('connection-status')
const orientationOverlay = byId('orientation-overlay')
const overlayStartBtn = byId('overlay-start')
const controlsTip = byId('controls-tip')
const joystick = byId('joystick')
const joystickBase = byId('joystick-base')
const joystickKnob = byId('joystick-knob')
const actions = byId('actions')
const rollButton = byId('roll-button')
const attackButton = byId('attack-button')
const blockButton = byId('block-button')
const choiceOverlay = byId('choice-overlay')
const choiceBtn0 = byId('choice-0')
const choiceBtn1 = byId('choice-1')
const choiceBtn2 = byId('choice-2')
const restartButton = byId('restart-button')
// Game over overlay elements
const gameOverOverlay = byId('gameover-overlay')
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

const VIRTUAL_WIDTH = 1280
const VIRTUAL_HEIGHT = 720
// normalized margin from edges to keep the player fully visible when spawning
const SPAWN_MARGIN = 0.06

let touchStartTime = 0
let room
let sendMove
let sendAct
let lastFrameTs = 0
let hasSpawned = false
let choiceVisible = false
// movement-driven sound helpers
let prevPosX = 0.5
let prevPosY = 0.5
let footstepAccum = 0

// device/platform detection
const isMobile = (matchMedia && matchMedia('(pointer: coarse)').matches) || /Mobi|Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent)

// movement state
let posX = 0.5
let posY = 0.5
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
let ROLL_DURATION = 0.18 // seconds (will be loaded from WASM)
let ROLL_COOLDOWN = 0.8 // seconds (will be loaded from WASM)
const ROLL_SPEED_MULTIPLIER = 2.6
let ATTACK_COOLDOWN = 0.35 // seconds between attacks (will be loaded from WASM)
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
  el.style.left = (x * VIRTUAL_WIDTH) + 'px'
  el.style.top = (y * VIRTUAL_HEIGHT) + 'px'
}
function renderEnemies() {
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
    if (typeof wasmExports.get_enemy_role === 'function') {
      const role = (wasmExports.get_enemy_role(i) | 0)
      const tag = ensureRoleTag(el)
      tag.textContent = enemyRoleLabel(role)
    }
  }
  // remove excess DOM nodes
  for (let i = count; i < enemyEls.length; i++) {
    const el = enemyEls[i]
    if (el && el.parentNode === canvas) canvas.removeChild(el)
    enemyEls[i] = null
  }
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
    const x = clamp01(leftPx / VIRTUAL_WIDTH || 0.5)
    const y = clamp01(topPx / VIRTUAL_HEIGHT || 0.5)
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
  el.style.left = x * VIRTUAL_WIDTH + 'px'
  el.style.top = y * VIRTUAL_HEIGHT + 'px'
}

function getOrCreatePeerEl(peerId) {
  let el = peerToEl.get(peerId)
  if (el) return el
  // assign color
  if (!peerToColor.has(peerId)) {
    const color = otherColorPool[peerToColor.size % otherColorPool.length]
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
init(1)  // Use room 1 for easier testing
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
          const ax = clamp01(leftPx / VIRTUAL_WIDTH || 0.5)
          const ay = clamp01(topPx / VIRTUAL_HEIGHT || 0.5)
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
        const nx = clamp01(leftPx / VIRTUAL_WIDTH || 0.5)
        const ny = clamp01(topPx / VIRTUAL_HEIGHT || 0.5)
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
      const nx = clamp01(leftPx / VIRTUAL_WIDTH || 0.5)
      const ny = clamp01(topPx / VIRTUAL_HEIGHT || 0.5)
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

function gameLoop(ts) {
  const dt = lastFrameTs ? (ts - lastFrameTs) / 1000 : 0
  lastFrameTs = ts

  // Require WASM for simulation; no JS fallback
  if (!wasmExports || typeof wasmExports.update !== 'function') {
    requestAnimationFrame(gameLoop)
    return
  }

  updateFromKeyboard()

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
    wasmExports.update(rollDirX, rollDirY, 1, dt)
    posX = clamp01(wasmExports.get_x?.() ?? posX)
    posY = clamp01(wasmExports.get_y?.() ?? posY)
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
    wasmExports.update(dirX, dirY, 0, dt)
    posX = clamp01(wasmExports.get_x?.() ?? posX)
    posY = clamp01(wasmExports.get_y?.() ?? posY)
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

  // Choice overlay: show when WASM phase reports Choose (2)
  try {
    if (typeof wasmExports?.get_phase === 'function') {
      const phase = wasmExports.get_phase()
      if (phase === 2 && !choiceVisible) {
        populateAndShowChoices()
      } else if (phase !== 2 && choiceVisible) {
        hideChoices()
      }
      // Show Game Over overlay when phase is Reset (7)
      if (phase === 7) {
        gameOverOverlay.hidden = false
      }
    }
  } catch {}

  // render self and send throttled movement updates
  ensureSelfEl()
  setElPos(selfEl, posX, posY)
  // keep shield oriented and offset in front
  updateShieldVisual()
  // render enemies from WASM snapshot
  renderEnemies()
  // update debug HUD (optional exports)
  updateDebugHud()
  // apply screen shake late in frame for current transform
  applyScreenShake(performance.now())
  const timeSinceSend = (performance.now() - lastMoveSendTs)
  const movedEnough = Math.hypot(posX - lastSentX, posY - lastSentY) > 0.002
  if (room && sendMove && (timeSinceSend > 50) && movedEnough) {
    sendMove([posX, posY])
    lastMoveSendTs = performance.now()
    lastSentX = posX
    lastSentY = posY
  }

  requestAnimationFrame(gameLoop)
}

requestAnimationFrame(gameLoop)
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
      m.style.left = (clamp01(x) * VIRTUAL_WIDTH) + 'px'
      m.style.top = (clamp01(y) * VIRTUAL_HEIGHT) + 'px'
      canvas.appendChild(m)
    }
    // Add exits
    for (let i = 0; i < exCount; i++) {
      const x = wasmExports.get_exit_x(i)
      const y = wasmExports.get_exit_y(i)
      const m = document.createElement('div')
      m.className = 'marker exit'
      m.style.left = (clamp01(x) * VIRTUAL_WIDTH) + 'px'
      m.style.top = (clamp01(y) * VIRTUAL_HEIGHT) + 'px'
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
  console.log('Local player ID:', selfId);
  
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
  const baseLeft = xNorm * VIRTUAL_WIDTH
  const baseTop = yNorm * VIRTUAL_HEIGHT
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
  t.style.left = (xNorm * VIRTUAL_WIDTH) + 'px'
  t.style.top = (yNorm * VIRTUAL_HEIGHT) + 'px'
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
