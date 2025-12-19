/**
 * Multiplayer Phase UI Component
 * Displays current phase, transitions, and synchronization status for multiplayer games
 */

import { GAME_PHASES, PHASE_CONFIG } from '../netcode/multiplayer-phase-manager.js'

export class MultiplayerPhaseUI {
  constructor(config = {}) {
    this.config = {
      containerId: config.containerId || 'phase-ui-container',
      showTimer: config.showTimer !== false,
      showPlayerStates: config.showPlayerStates !== false,
      showTransitions: config.showTransitions !== false,
      showSyncStatus: config.showSyncStatus !== false,
      animationDuration: config.animationDuration || 300,
      theme: config.theme || 'default',
      position: config.position || 'top-right',
      ...config
    }
    
    // UI elements
    this.container = null
    this.elements = {
      phaseDisplay: null,
      timerDisplay: null,
      playerList: null,
      transitionOverlay: null,
      syncIndicator: null,
      votePanel: null
    }
    
    // State
    this.state = {
      currentPhase: GAME_PHASES.EXPLORE,
      phaseStartTime: 0,
      phaseEndTime: 0,
      transitionInProgress: false,
      playerStates: new Map(),
      syncHealth: 1.0,
      voteActive: false,
      voteOptions: [],
      voteEndTime: 0
    }
    
    // Animation timers
    this.updateTimer = null
    this.transitionTimer = null
    
    // Phase manager reference
    this.phaseManager = null
    
    // Styles
    this.styles = this.generateStyles()
  }
  
  /**
   * Initialize the UI component
   */
  initialize(phaseManager) {
    this.phaseManager = phaseManager
    
    // Create UI elements
    this.createContainer()
    this.createPhaseDisplay()
    
    if (this.config.showTimer) {
      this.createTimerDisplay()
    }
    
    if (this.config.showPlayerStates) {
      this.createPlayerList()
    }
    
    if (this.config.showTransitions) {
      this.createTransitionOverlay()
    }
    
    if (this.config.showSyncStatus) {
      this.createSyncIndicator()
    }
    
    this.createVotePanel()
    
    // Apply styles
    this.applyStyles()
    
    // Register phase manager event handlers
    this.registerEventHandlers()
    
    // Start update loop
    this.startUpdateLoop()
    
    // Initial update
    this.updateDisplay()
  }
  
  /**
   * Generate CSS styles
   */
  generateStyles() {
    return `
      .phase-ui-container {
        position: fixed;
        ${this.getPositionStyles()}
        z-index: 1000;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        user-select: none;
        pointer-events: none;
      }
      
      .phase-ui-container > * {
        pointer-events: auto;
      }
      
      .phase-display {
        background: linear-gradient(135deg, rgba(30, 30, 40, 0.95), rgba(40, 40, 50, 0.95));
        border: 2px solid rgba(100, 200, 255, 0.3);
        border-radius: 12px;
        padding: 12px 20px;
        margin-bottom: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
      }
      
      .phase-display:hover {
        border-color: rgba(100, 200, 255, 0.5);
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4);
      }
      
      .phase-name {
        font-size: 18px;
        font-weight: bold;
        color: #fff;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 4px;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
      }
      
      .phase-description {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        margin-top: 4px;
      }
      
      .phase-timer {
        background: rgba(20, 20, 30, 0.9);
        border: 1px solid rgba(100, 200, 255, 0.2);
        border-radius: 8px;
        padding: 8px 12px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .timer-icon {
        width: 16px;
        height: 16px;
        fill: rgba(100, 200, 255, 0.8);
      }
      
      .timer-text {
        font-size: 14px;
        color: #fff;
        font-variant-numeric: tabular-nums;
      }
      
      .timer-bar {
        height: 3px;
        background: rgba(100, 200, 255, 0.2);
        border-radius: 2px;
        margin-top: 4px;
        overflow: hidden;
      }
      
      .timer-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #4CAF50, #8BC34A);
        transition: width 0.1s linear;
      }
      
      .timer-bar-fill.warning {
        background: linear-gradient(90deg, #FFC107, #FF9800);
      }
      
      .timer-bar-fill.danger {
        background: linear-gradient(90deg, #f44336, #FF5722);
      }
      
      .player-list {
        background: rgba(20, 20, 30, 0.9);
        border: 1px solid rgba(100, 200, 255, 0.2);
        border-radius: 8px;
        padding: 8px;
        margin-bottom: 10px;
        max-height: 200px;
        overflow-y: auto;
      }
      
      .player-list-title {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
        text-transform: uppercase;
        margin-bottom: 8px;
      }
      
      .player-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 8px;
        margin-bottom: 4px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        transition: background 0.2s;
      }
      
      .player-item:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      
      .player-name {
        font-size: 12px;
        color: #fff;
        flex: 1;
      }
      
      .player-phase {
        font-size: 10px;
        padding: 2px 6px;
        background: rgba(100, 200, 255, 0.2);
        border-radius: 3px;
        color: rgba(100, 200, 255, 0.9);
      }
      
      .player-phase.synced {
        background: rgba(76, 175, 80, 0.2);
        color: rgba(76, 175, 80, 0.9);
      }
      
      .player-phase.desynced {
        background: rgba(244, 67, 54, 0.2);
        color: rgba(244, 67, 54, 0.9);
      }
      
      .sync-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        background: rgba(20, 20, 30, 0.9);
        border: 1px solid rgba(100, 200, 255, 0.2);
        border-radius: 6px;
        margin-bottom: 10px;
      }
      
      .sync-status {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #4CAF50;
        animation: pulse 2s infinite;
      }
      
      .sync-status.warning {
        background: #FFC107;
      }
      
      .sync-status.error {
        background: #f44336;
        animation: pulse 1s infinite;
      }
      
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
      
      .sync-text {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.7);
      }
      
      .transition-overlay {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, rgba(30, 30, 40, 0.98), rgba(40, 40, 50, 0.98));
        border: 2px solid rgba(100, 200, 255, 0.5);
        border-radius: 16px;
        padding: 24px 32px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(20px);
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 2000;
      }
      
      .transition-overlay.active {
        opacity: 1;
        visibility: visible;
      }
      
      .transition-title {
        font-size: 24px;
        font-weight: bold;
        color: #fff;
        text-align: center;
        margin-bottom: 8px;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      }
      
      .transition-subtitle {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.7);
        text-align: center;
      }
      
      .transition-arrow {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        margin: 16px 0;
        font-size: 18px;
        color: #fff;
      }
      
      .transition-phase {
        padding: 8px 16px;
        background: rgba(100, 200, 255, 0.1);
        border: 1px solid rgba(100, 200, 255, 0.3);
        border-radius: 8px;
      }
      
      .vote-panel {
        background: rgba(20, 20, 30, 0.95);
        border: 2px solid rgba(255, 200, 100, 0.3);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 10px;
        display: none;
      }
      
      .vote-panel.active {
        display: block;
      }
      
      .vote-title {
        font-size: 14px;
        font-weight: bold;
        color: #fff;
        margin-bottom: 12px;
      }
      
      .vote-timer {
        font-size: 12px;
        color: rgba(255, 200, 100, 0.8);
        margin-bottom: 8px;
      }
      
      .vote-options {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .vote-option {
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 200, 100, 0.2);
        border-radius: 6px;
        color: #fff;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .vote-option:hover {
        background: rgba(255, 200, 100, 0.1);
        border-color: rgba(255, 200, 100, 0.4);
      }
      
      .vote-option.selected {
        background: rgba(255, 200, 100, 0.2);
        border-color: rgba(255, 200, 100, 0.6);
      }
      
      .vote-count {
        float: right;
        color: rgba(255, 200, 100, 0.6);
      }
      
      /* Phase-specific colors */
      .phase-explore { border-color: rgba(76, 175, 80, 0.5) !important; }
      .phase-fight { border-color: rgba(244, 67, 54, 0.5) !important; }
      .phase-choose { border-color: rgba(100, 200, 255, 0.5) !important; }
      .phase-shop { border-color: rgba(255, 193, 7, 0.5) !important; }
      .phase-risk { border-color: rgba(255, 87, 34, 0.5) !important; }
      .phase-escalate { border-color: rgba(233, 30, 99, 0.5) !important; }
      .phase-cash-out { border-color: rgba(76, 175, 80, 0.5) !important; }
      .phase-reset { border-color: rgba(158, 158, 158, 0.5) !important; }
      .phase-game-over { border-color: rgba(96, 96, 96, 0.5) !important; }
    `
  }
  
  /**
   * Get position styles based on config
   */
  getPositionStyles() {
    const positions = {
      'top-left': 'top: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'bottom-right': 'bottom: 20px; right: 20px;',
      'top-center': 'top: 20px; left: 50%; transform: translateX(-50%);',
      'bottom-center': 'bottom: 20px; left: 50%; transform: translateX(-50%);'
    }
    
    return positions[this.config.position] || positions['top-right']
  }
  
  /**
   * Create container element
   */
  createContainer() {
    // Remove existing container if present
    const existing = document.getElementById(this.config.containerId)
    if (existing) {
      existing.remove()
    }
    
    this.container = document.createElement('div')
    this.container.id = this.config.containerId
    this.container.className = 'phase-ui-container'
    
    document.body.appendChild(this.container)
  }
  
  /**
   * Create phase display element
   */
  createPhaseDisplay() {
    this.elements.phaseDisplay = document.createElement('div')
    this.elements.phaseDisplay.className = 'phase-display'
    
    const phaseName = document.createElement('div')
    phaseName.className = 'phase-name'
    phaseName.textContent = 'EXPLORE'
    
    const phaseDescription = document.createElement('div')
    phaseDescription.className = 'phase-description'
    phaseDescription.textContent = 'Explore the world'
    
    this.elements.phaseDisplay.appendChild(phaseName)
    this.elements.phaseDisplay.appendChild(phaseDescription)
    
    this.container.appendChild(this.elements.phaseDisplay)
  }
  
  /**
   * Create timer display element
   */
  createTimerDisplay() {
    this.elements.timerDisplay = document.createElement('div')
    this.elements.timerDisplay.className = 'phase-timer'
    
    const timerIcon = document.createElement('div')
    timerIcon.className = 'timer-icon'
    timerIcon.innerHTML = '⏱'
    
    const timerText = document.createElement('div')
    timerText.className = 'timer-text'
    timerText.textContent = '--:--'
    
    const timerBarContainer = document.createElement('div')
    timerBarContainer.style.flex = '1'
    
    const timerBar = document.createElement('div')
    timerBar.className = 'timer-bar'
    
    const timerBarFill = document.createElement('div')
    timerBarFill.className = 'timer-bar-fill'
    
    timerBar.appendChild(timerBarFill)
    timerBarContainer.appendChild(timerBar)
    
    this.elements.timerDisplay.appendChild(timerIcon)
    this.elements.timerDisplay.appendChild(timerText)
    this.elements.timerDisplay.appendChild(timerBarContainer)
    
    this.container.appendChild(this.elements.timerDisplay)
  }
  
  /**
   * Create player list element
   */
  createPlayerList() {
    this.elements.playerList = document.createElement('div')
    this.elements.playerList.className = 'player-list'
    
    const title = document.createElement('div')
    title.className = 'player-list-title'
    title.textContent = 'Players'
    
    this.elements.playerList.appendChild(title)
    
    this.container.appendChild(this.elements.playerList)
  }
  
  /**
   * Create transition overlay
   */
  createTransitionOverlay() {
    this.elements.transitionOverlay = document.createElement('div')
    this.elements.transitionOverlay.className = 'transition-overlay'
    
    const title = document.createElement('div')
    title.className = 'transition-title'
    title.textContent = 'Phase Transition'
    
    const arrow = document.createElement('div')
    arrow.className = 'transition-arrow'
    
    const fromPhase = document.createElement('div')
    fromPhase.className = 'transition-phase'
    fromPhase.textContent = 'EXPLORE'
    
    const arrowSymbol = document.createElement('div')
    arrowSymbol.textContent = '→'
    
    const toPhase = document.createElement('div')
    toPhase.className = 'transition-phase'
    toPhase.textContent = 'FIGHT'
    
    arrow.appendChild(fromPhase)
    arrow.appendChild(arrowSymbol)
    arrow.appendChild(toPhase)
    
    const subtitle = document.createElement('div')
    subtitle.className = 'transition-subtitle'
    subtitle.textContent = 'Synchronizing with all players...'
    
    this.elements.transitionOverlay.appendChild(title)
    this.elements.transitionOverlay.appendChild(arrow)
    this.elements.transitionOverlay.appendChild(subtitle)
    
    document.body.appendChild(this.elements.transitionOverlay)
  }
  
  /**
   * Create sync status indicator
   */
  createSyncIndicator() {
    this.elements.syncIndicator = document.createElement('div')
    this.elements.syncIndicator.className = 'sync-indicator'
    
    const status = document.createElement('div')
    status.className = 'sync-status'
    
    const text = document.createElement('div')
    text.className = 'sync-text'
    text.textContent = 'Synced'
    
    this.elements.syncIndicator.appendChild(status)
    this.elements.syncIndicator.appendChild(text)
    
    this.container.appendChild(this.elements.syncIndicator)
  }
  
  /**
   * Create vote panel
   */
  createVotePanel() {
    this.elements.votePanel = document.createElement('div')
    this.elements.votePanel.className = 'vote-panel'
    
    const title = document.createElement('div')
    title.className = 'vote-title'
    title.textContent = 'Vote for Next Phase'
    
    const timer = document.createElement('div')
    timer.className = 'vote-timer'
    timer.textContent = 'Time remaining: 10s'
    
    const options = document.createElement('div')
    options.className = 'vote-options'
    
    this.elements.votePanel.appendChild(title)
    this.elements.votePanel.appendChild(timer)
    this.elements.votePanel.appendChild(options)
    
    this.container.appendChild(this.elements.votePanel)
  }
  
  /**
   * Apply styles to document
   */
  applyStyles() {
    // Remove existing styles if present
    const existingStyle = document.getElementById('phase-ui-styles')
    if (existingStyle) {
      existingStyle.remove()
    }
    
    const styleElement = document.createElement('style')
    styleElement.id = 'phase-ui-styles'
    styleElement.textContent = this.styles
    
    document.head.appendChild(styleElement)
  }
  
  /**
   * Register event handlers with phase manager
   */
  registerEventHandlers() {
    if (!this.phaseManager) {return}
    
    // Phase change handler
    this.phaseManager.eventHandlers.onPhaseChanged = (data) => {
      this.handlePhaseChange(data)
    }
    
    // Phase transition handlers
    this.phaseManager.eventHandlers.onPhaseTransitionStart = (data) => {
      this.handleTransitionStart(data)
    }
    
    this.phaseManager.eventHandlers.onPhaseTransitionEnd = (data) => {
      this.handleTransitionEnd(data)
    }
    
    // Sync error handler
    this.phaseManager.eventHandlers.onPhaseSyncError = (data) => {
      this.handleSyncError(data)
    }
    
    // Vote handlers
    this.phaseManager.eventHandlers.onPhaseVoteStart = (data) => {
      this.handleVoteStart(data)
    }
    
    this.phaseManager.eventHandlers.onPhaseVoteEnd = (data) => {
      this.handleVoteEnd(data)
    }
    
    // Timeout handler
    this.phaseManager.eventHandlers.onPhaseTimeout = (data) => {
      this.handlePhaseTimeout(data)
    }
  }
  
  /**
   * Start update loop
   */
  startUpdateLoop() {
    this.updateTimer = setInterval(() => {
      this.updateDisplay()
    }, 100)
  }
  
  /**
   * Stop update loop
   */
  stopUpdateLoop() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = null
    }
  }
  
  /**
   * Update display elements
   */
  updateDisplay() {
    if (!this.phaseManager) {return}
    
    const phaseInfo = this.phaseManager.getCurrentPhaseInfo()
    
    // Update phase display
    this.updatePhaseDisplay(phaseInfo)
    
    // Update timer
    if (this.config.showTimer) {
      this.updateTimerDisplay(phaseInfo)
    }
    
    // Update player list
    if (this.config.showPlayerStates) {
      this.updatePlayerList()
    }
    
    // Update sync indicator
    if (this.config.showSyncStatus) {
      this.updateSyncIndicator()
    }
    
    // Update vote panel
    this.updateVotePanel()
  }
  
  /**
   * Update phase display
   */
  updatePhaseDisplay(phaseInfo) {
    const phaseName = this.elements.phaseDisplay.querySelector('.phase-name')
    const phaseDescription = this.elements.phaseDisplay.querySelector('.phase-description')
    
    phaseName.textContent = phaseInfo.phaseName.toUpperCase()
    phaseDescription.textContent = phaseInfo.description
    
    // Update phase-specific styling
    this.elements.phaseDisplay.className = `phase-display phase-${phaseInfo.phaseName.toLowerCase().replace(' ', '-')}`
  }
  
  /**
   * Update timer display
   */
  updateTimerDisplay(phaseInfo) {
    const timerText = this.elements.timerDisplay.querySelector('.timer-text')
    const timerBarFill = this.elements.timerDisplay.querySelector('.timer-bar-fill')
    
    if (phaseInfo.remaining !== null && phaseInfo.remaining > 0) {
      // Format time
      const seconds = Math.ceil(phaseInfo.remaining / 1000)
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      timerText.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
      
      // Update progress bar
      const config = PHASE_CONFIG[phaseInfo.phase]
      if (config && config.maxDuration > 0) {
        const progress = (config.maxDuration - phaseInfo.remaining) / config.maxDuration
        timerBarFill.style.width = `${progress * 100}%`
        
        // Update color based on time remaining
        timerBarFill.classList.remove('warning', 'danger')
        if (phaseInfo.remaining < 10000) {
          timerBarFill.classList.add('danger')
        } else if (phaseInfo.remaining < 30000) {
          timerBarFill.classList.add('warning')
        }
      }
    } else {
      timerText.textContent = '--:--'
      timerBarFill.style.width = '0%'
    }
  }
  
  /**
   * Update player list
   */
  updatePlayerList() {
    // Clear existing players (except title)
    const title = this.elements.playerList.querySelector('.player-list-title')
    this.elements.playerList.innerHTML = ''
    this.elements.playerList.appendChild(title)
    
    // Add local player
    const localItem = this.createPlayerItem(
      'You',
      this.phaseManager.state.currentPhase,
      true
    )
    this.elements.playerList.appendChild(localItem)
    
    // Add other players
    for (const [playerId, state] of this.phaseManager.playerStates.entries()) {
      const playerItem = this.createPlayerItem(
        `Player ${playerId.substring(0, 8)}`,
        state.phase,
        state.phase === this.phaseManager.state.currentPhase
      )
      this.elements.playerList.appendChild(playerItem)
    }
  }
  
  /**
   * Create player item element
   */
  createPlayerItem(name, phase, synced) {
    const item = document.createElement('div')
    item.className = 'player-item'
    
    const nameElement = document.createElement('div')
    nameElement.className = 'player-name'
    nameElement.textContent = name
    
    const phaseElement = document.createElement('div')
    phaseElement.className = `player-phase ${synced ? 'synced' : 'desynced'}`
    const config = PHASE_CONFIG[phase]
    phaseElement.textContent = config ? config.name : 'Unknown'
    
    item.appendChild(nameElement)
    item.appendChild(phaseElement)
    
    return item
  }
  
  /**
   * Update sync indicator
   */
  updateSyncIndicator() {
    const status = this.elements.syncIndicator.querySelector('.sync-status')
    const text = this.elements.syncIndicator.querySelector('.sync-text')
    
    const syncHealth = this.phaseManager.calculateSyncHealth()
    
    status.classList.remove('warning', 'error')
    
    if (syncHealth >= 0.9) {
      text.textContent = 'Synced'
    } else if (syncHealth >= 0.5) {
      status.classList.add('warning')
      text.textContent = 'Partial Sync'
    } else {
      status.classList.add('error')
      text.textContent = 'Desync'
    }
  }
  
  /**
   * Update vote panel
   */
  updateVotePanel() {
    if (!this.state.voteActive) {
      this.elements.votePanel.classList.remove('active')
      return
    }
    
    this.elements.votePanel.classList.add('active')
    
    // Update timer
    const timer = this.elements.votePanel.querySelector('.vote-timer')
    const remaining = Math.max(0, this.state.voteEndTime - Date.now())
    const seconds = Math.ceil(remaining / 1000)
    timer.textContent = `Time remaining: ${seconds}s`
  }
  
  /**
   * Handle phase change
   */
  handlePhaseChange(data) {
    this.state.currentPhase = data.to
    this.state.phaseStartTime = data.timestamp
    
    // Flash animation
    this.elements.phaseDisplay.style.transform = 'scale(1.1)'
    setTimeout(() => {
      this.elements.phaseDisplay.style.transform = 'scale(1)'
    }, 300)
  }
  
  /**
   * Handle transition start
   */
  handleTransitionStart(data) {
    if (!this.config.showTransitions) {return}
    
    this.state.transitionInProgress = true
    
    // Update overlay content
    const fromPhase = this.elements.transitionOverlay.querySelector('.transition-phase:first-child')
    const toPhase = this.elements.transitionOverlay.querySelector('.transition-phase:last-child')
    
    const fromConfig = PHASE_CONFIG[data.from]
    const toConfig = PHASE_CONFIG[data.to]
    
    fromPhase.textContent = fromConfig ? fromConfig.name.toUpperCase() : 'UNKNOWN'
    toPhase.textContent = toConfig ? toConfig.name.toUpperCase() : 'UNKNOWN'
    
    // Show overlay
    this.elements.transitionOverlay.classList.add('active')
  }
  
  /**
   * Handle transition end
   */
  handleTransitionEnd(_data) {
    this.state.transitionInProgress = false
    
    // Hide overlay after delay
    setTimeout(() => {
      this.elements.transitionOverlay.classList.remove('active')
    }, 500)
  }
  
  /**
   * Handle sync error
   */
  handleSyncError(_data) {
    // Flash sync indicator
    const indicator = this.elements.syncIndicator
    indicator.style.background = 'rgba(244, 67, 54, 0.2)'
    
    setTimeout(() => {
      indicator.style.background = ''
    }, 1000)
  }
  
  /**
   * Handle vote start
   */
  handleVoteStart(data) {
    this.state.voteActive = true
    this.state.voteEndTime = Date.now() + data.duration
    
    // Clear vote options
    const options = this.elements.votePanel.querySelector('.vote-options')
    options.innerHTML = ''
    
    // Add vote options
    const config = PHASE_CONFIG[this.phaseManager.state.currentPhase]
    if (config && config.transitions) {
      for (const transition of config.transitions) {
        const optionConfig = PHASE_CONFIG[transition]
        if (!optionConfig) {continue}
        
        const option = document.createElement('div')
        option.className = 'vote-option'
        option.textContent = optionConfig.name
        option.dataset.phase = transition
        
        option.addEventListener('click', () => {
          this.handleVoteClick(transition)
        })
        
        options.appendChild(option)
      }
    }
  }
  
  /**
   * Handle vote end
   */
  handleVoteEnd(data) {
    this.state.voteActive = false
    
    // Show result briefly
    const options = this.elements.votePanel.querySelector('.vote-options')
    options.innerHTML = `<div style="text-align: center; color: #fff;">
      ${data.consensusReached ? '✓ Consensus reached!' : '✗ No consensus'}
    </div>`
    
    setTimeout(() => {
      this.elements.votePanel.classList.remove('active')
    }, 2000)
  }
  
  /**
   * Handle vote click
   */
  handleVoteClick(phase) {
    if (!this.phaseManager) {return}
    
    // Cast vote
    this.phaseManager.castPhaseVote(phase)
    
    // Update UI
    const options = this.elements.votePanel.querySelectorAll('.vote-option')
    options.forEach(option => {
      option.classList.remove('selected')
      if (parseInt(option.dataset.phase) === phase) {
        option.classList.add('selected')
      }
    })
  }
  
  /**
   * Handle phase timeout
   */
  handlePhaseTimeout(_data) {
    // Flash timer display
    if (this.elements.timerDisplay) {
      this.elements.timerDisplay.style.background = 'rgba(244, 67, 54, 0.2)'
      
      setTimeout(() => {
        this.elements.timerDisplay.style.background = ''
      }, 1000)
    }
  }
  
  /**
   * Destroy the UI component
   */
  destroy() {
    // Stop update loop
    this.stopUpdateLoop()
    
    // Remove elements
    if (this.container) {
      this.container.remove()
    }
    
    if (this.elements.transitionOverlay) {
      this.elements.transitionOverlay.remove()
    }
    
    // Remove styles
    const styleElement = document.getElementById('phase-ui-styles')
    if (styleElement) {
      styleElement.remove()
    }
    
    // Clear references
    this.phaseManager = null
    this.elements = {}
  }
}

export default MultiplayerPhaseUI