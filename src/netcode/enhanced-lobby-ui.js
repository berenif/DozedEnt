/**
 * Enhanced Lobby UI - Modern, responsive multiplayer lobby interface
 * Features: Dark theme, smooth animations, real-time updates, comprehensive room management
 */

import EnhancedRoomManager from './enhanced-room-manager.js'
import { MatchmakingSystem } from './matchmaking-system.js'
import { ChatSystem } from './chat-system.js'

export class EnhancedLobbyUI {
  constructor(containerId, appId, config = {}) {
    this.containerId = containerId
    this.container = null
    this.config = {
      enableChat: true,
      enableSpectators: true,
      enableMatchmaking: true,
      enableAnalytics: true,
      theme: 'dark',
      animations: true,
      ...config
    }
    
    // Core systems
    this.roomManager = new EnhancedRoomManager(appId, config)
    this.matchmaking = new MatchmakingSystem(config)
    this.chatSystem = new ChatSystem(config)
    
    // UI state
    this.currentView = 'main' // main, rooms, create, room, matchmaking, analytics
    this.selectedRoomId = null
    this.isVisible = false
    
    // UI elements cache
    this.elements = {}
    
    // Initialize
    this.initialize()
  }
  
  /**
   * Initialize the lobby UI
   */
  initialize() {
    // Get or create container
    this.container = document.getElementById(this.containerId)
    if (!this.container) {
      this.container = document.createElement('div')
      this.container.id = this.containerId
      document.body.appendChild(this.container)
    }
    
    // Apply styles
    this.injectStyles()
    
    // Create UI structure
    this.createUI()
    
    // Set up event listeners
    this.setupEventListeners()
    
    // Set up room manager events
    this.setupRoomManagerEvents()
    
    // Set up chat events
    this.setupChatEvents()
    
    // Start updates
    this.startUpdates()
  }
  
  /**
   * Inject CSS styles
   */
  injectStyles() {
    if (document.getElementById('enhanced-lobby-styles')) return
    
    const style = document.createElement('style')
    style.id = 'enhanced-lobby-styles'
    style.textContent = `
      /* Enhanced Lobby Styles */
      .enhanced-lobby-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        display: none;
        z-index: 10000;
        font-family: 'Courier New', monospace;
        color: #00ff00;
        animation: fadeIn 0.3s ease-in-out;
      }
      
      .enhanced-lobby-overlay.visible {
        display: flex;
        justify-content: center;
        align-items: center;
      }
      
      .lobby-container {
        width: 90%;
        max-width: 1200px;
        height: 85%;
        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
        border: 2px solid #00ff00;
        border-radius: 10px;
        box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: slideUp 0.3s ease-out;
      }
      
      .lobby-header {
        padding: 20px;
        background: rgba(0, 255, 0, 0.1);
        border-bottom: 1px solid #00ff00;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .lobby-title {
        font-size: 24px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 2px;
        text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
      }
      
      .lobby-close {
        width: 30px;
        height: 30px;
        background: transparent;
        border: 1px solid #00ff00;
        color: #00ff00;
        cursor: pointer;
        font-size: 20px;
        border-radius: 50%;
        transition: all 0.3s ease;
      }
      
      .lobby-close:hover {
        background: rgba(0, 255, 0, 0.2);
        transform: rotate(90deg);
      }
      
      .lobby-nav {
        display: flex;
        gap: 10px;
        padding: 10px 20px;
        background: rgba(0, 0, 0, 0.5);
        border-bottom: 1px solid rgba(0, 255, 0, 0.3);
      }
      
      .nav-button {
        padding: 8px 16px;
        background: transparent;
        border: 1px solid rgba(0, 255, 0, 0.5);
        color: #00ff00;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
        font-size: 12px;
      }
      
      .nav-button:hover {
        background: rgba(0, 255, 0, 0.1);
        border-color: #00ff00;
      }
      
      .nav-button.active {
        background: rgba(0, 255, 0, 0.2);
        border-color: #00ff00;
        box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
      }
      
      .lobby-content {
        flex: 1;
        display: flex;
        overflow: hidden;
      }
      
      .lobby-main {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
      }
      
      .lobby-sidebar {
        width: 300px;
        background: rgba(0, 0, 0, 0.3);
        border-left: 1px solid rgba(0, 255, 0, 0.3);
        display: flex;
        flex-direction: column;
      }
      
      /* Room List */
      .room-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 15px;
        padding: 10px 0;
      }
      
      .room-card {
        background: rgba(0, 255, 0, 0.05);
        border: 1px solid rgba(0, 255, 0, 0.3);
        border-radius: 8px;
        padding: 15px;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      
      .room-card:hover {
        background: rgba(0, 255, 0, 0.1);
        border-color: #00ff00;
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 255, 0, 0.2);
      }
      
      .room-card.selected {
        border-color: #00ff00;
        background: rgba(0, 255, 0, 0.15);
      }
      
      .room-status {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        animation: pulse 2s infinite;
      }
      
      .room-status.waiting {
        background: #00ff00;
      }
      
      .room-status.in-progress {
        background: #ffaa00;
      }
      
      .room-status.full {
        background: #ff0000;
      }
      
      .room-name {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 8px;
      }
      
      .room-info {
        font-size: 12px;
        opacity: 0.8;
        line-height: 1.5;
      }
      
      .room-players {
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 10px;
      }
      
      .player-count {
        font-size: 14px;
        color: #00ff00;
      }
      
      .player-bar {
        flex: 1;
        height: 4px;
        background: rgba(0, 255, 0, 0.2);
        border-radius: 2px;
        overflow: hidden;
      }
      
      .player-fill {
        height: 100%;
        background: #00ff00;
        transition: width 0.3s ease;
      }
      
      /* Chat */
      .chat-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 10px;
      }
      
      .chat-header {
        padding: 10px;
        border-bottom: 1px solid rgba(0, 255, 0, 0.3);
        font-size: 14px;
        text-transform: uppercase;
      }
      
      .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
        font-size: 12px;
      }
      
      .chat-message {
        margin-bottom: 8px;
        word-wrap: break-word;
        animation: messageSlide 0.3s ease-out;
      }
      
      .chat-message.system {
        color: #ffaa00;
        font-style: italic;
      }
      
      .chat-message .username {
        color: #00ffff;
        font-weight: bold;
      }
      
      .chat-message .timestamp {
        color: rgba(255, 255, 255, 0.4);
        font-size: 10px;
        margin-left: 5px;
      }
      
      .chat-input-container {
        display: flex;
        gap: 5px;
        padding: 10px;
        border-top: 1px solid rgba(0, 255, 0, 0.3);
      }
      
      .chat-input {
        flex: 1;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(0, 255, 0, 0.3);
        color: #00ff00;
        padding: 8px;
        font-family: inherit;
        font-size: 12px;
      }
      
      .chat-input:focus {
        outline: none;
        border-color: #00ff00;
        box-shadow: 0 0 5px rgba(0, 255, 0, 0.3);
      }
      
      .chat-send {
        padding: 8px 16px;
        background: rgba(0, 255, 0, 0.1);
        border: 1px solid #00ff00;
        color: #00ff00;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .chat-send:hover {
        background: rgba(0, 255, 0, 0.2);
      }
      
      /* Quick Actions */
      .quick-actions {
        display: flex;
        gap: 10px;
        padding: 20px;
        justify-content: center;
      }
      
      .action-button {
        padding: 15px 30px;
        background: linear-gradient(135deg, rgba(0, 255, 0, 0.1), rgba(0, 255, 0, 0.2));
        border: 2px solid #00ff00;
        color: #00ff00;
        cursor: pointer;
        font-size: 16px;
        text-transform: uppercase;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      
      .action-button:before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        background: rgba(0, 255, 0, 0.3);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        transition: width 0.3s, height 0.3s;
      }
      
      .action-button:hover:before {
        width: 100%;
        height: 100%;
      }
      
      .action-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 20px rgba(0, 255, 0, 0.4);
      }
      
      /* Forms */
      .form-container {
        max-width: 500px;
        margin: 0 auto;
        padding: 20px;
      }
      
      .form-group {
        margin-bottom: 20px;
      }
      
      .form-label {
        display: block;
        margin-bottom: 8px;
        font-size: 12px;
        text-transform: uppercase;
        opacity: 0.8;
      }
      
      .form-input {
        width: 100%;
        padding: 10px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(0, 255, 0, 0.3);
        color: #00ff00;
        font-family: inherit;
        font-size: 14px;
      }
      
      .form-input:focus {
        outline: none;
        border-color: #00ff00;
        box-shadow: 0 0 5px rgba(0, 255, 0, 0.3);
      }
      
      .form-select {
        width: 100%;
        padding: 10px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(0, 255, 0, 0.3);
        color: #00ff00;
        font-family: inherit;
        font-size: 14px;
        cursor: pointer;
      }
      
      /* Loading */
      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(0, 255, 0, 0.3);
        border-top: 3px solid #00ff00;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 20px auto;
      }
      
      /* Animations */
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      @keyframes messageSlide {
        from { transform: translateX(-10px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .lobby-container {
          width: 100%;
          height: 100%;
          border-radius: 0;
        }
        
        .lobby-sidebar {
          display: none;
        }
        
        .room-grid {
          grid-template-columns: 1fr;
        }
      }
    `
    
    document.head.appendChild(style)
  }
  
  /**
   * Create UI structure
   */
  createUI() {
    this.container.innerHTML = `
      <div class="enhanced-lobby-overlay">
        <div class="lobby-container">
          <div class="lobby-header">
            <div class="lobby-title">MULTIPLAYER LOBBY</div>
            <button class="lobby-close" id="lobby-close">×</button>
          </div>
          
          <div class="lobby-nav">
            <button class="nav-button active" data-view="main">HOME</button>
            <button class="nav-button" data-view="rooms">ROOMS</button>
            <button class="nav-button" data-view="create">CREATE</button>
            <button class="nav-button" data-view="matchmaking">MATCHMAKING</button>
            ${this.config.enableAnalytics ? '<button class="nav-button" data-view="analytics">ANALYTICS</button>' : ''}
          </div>
          
          <div class="lobby-content">
            <div class="lobby-main">
              <!-- Main View -->
              <div class="view-content" data-view="main">
                <div class="quick-actions">
                  <button class="action-button" id="quick-play">QUICK PLAY</button>
                  <button class="action-button" id="create-room">CREATE ROOM</button>
                  <button class="action-button" id="find-match">FIND MATCH</button>
                </div>
                
                <div class="stats-summary">
                  <h3>LOBBY STATUS</h3>
                  <div class="stats-grid">
                    <div class="stat-item">
                      <span class="stat-label">Active Rooms:</span>
                      <span class="stat-value" id="active-rooms">0</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">Players Online:</span>
                      <span class="stat-value" id="players-online">0</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">In Queue:</span>
                      <span class="stat-value" id="in-queue">0</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Rooms View -->
              <div class="view-content" data-view="rooms" style="display: none;">
                <div class="rooms-header">
                  <h3>AVAILABLE ROOMS</h3>
                  <button class="refresh-button" id="refresh-rooms">⟳ REFRESH</button>
                </div>
                <div class="room-grid" id="room-grid">
                  <!-- Room cards will be inserted here -->
                </div>
              </div>
              
              <!-- Create Room View -->
              <div class="view-content" data-view="create" style="display: none;">
                <div class="form-container">
                  <h3>CREATE NEW ROOM</h3>
                  <form id="create-room-form">
                    <div class="form-group">
                      <label class="form-label">Room Name</label>
                      <input type="text" class="form-input" id="room-name" placeholder="Enter room name..." maxlength="32" required>
                    </div>
                    
                    <div class="form-group">
                      <label class="form-label">Game Mode</label>
                      <select class="form-select" id="game-mode">
                        <option value="default">Default</option>
                        <option value="deathmatch">Deathmatch</option>
                        <option value="team">Team Battle</option>
                        <option value="ctf">Capture the Flag</option>
                        <option value="survival">Survival</option>
                      </select>
                    </div>
                    
                    <div class="form-group">
                      <label class="form-label">Max Players</label>
                      <select class="form-select" id="max-players">
                        <option value="2">2 Players</option>
                        <option value="4" selected>4 Players</option>
                        <option value="8">8 Players</option>
                        <option value="16">16 Players</option>
                      </select>
                    </div>
                    
                    <div class="form-group">
                      <label class="form-label">Room Type</label>
                      <select class="form-select" id="room-type">
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                        <option value="ranked">Ranked</option>
                      </select>
                    </div>
                    
                    <div class="form-group">
                      <label class="form-label">
                        <input type="checkbox" id="allow-spectators" checked>
                        Allow Spectators
                      </label>
                    </div>
                    
                    <div class="form-group">
                      <label class="form-label">
                        <input type="checkbox" id="allow-late-join" checked>
                        Allow Late Join
                      </label>
                    </div>
                    
                    <div class="form-group">
                      <label class="form-label">Password (Optional)</label>
                      <input type="password" class="form-input" id="room-password" placeholder="Leave empty for no password">
                    </div>
                    
                    <button type="submit" class="action-button">CREATE ROOM</button>
                  </form>
                </div>
              </div>
              
              <!-- Matchmaking View -->
              <div class="view-content" data-view="matchmaking" style="display: none;">
                <div class="matchmaking-container">
                  <h3>MATCHMAKING</h3>
                  <div class="matchmaking-status" id="matchmaking-status">
                    <p>Ready to find a match</p>
                  </div>
                  <div class="matchmaking-options">
                    <div class="form-group">
                      <label class="form-label">Game Mode</label>
                      <select class="form-select" id="mm-game-mode">
                        <option value="ranked">Ranked</option>
                        <option value="competitive">Competitive</option>
                        <option value="tournament">Tournament</option>
                      </select>
                    </div>
                    
                    <div class="form-group">
                      <label class="form-label">Region</label>
                      <select class="form-select" id="mm-region">
                        <option value="auto">Auto</option>
                        <option value="na">North America</option>
                        <option value="eu">Europe</option>
                        <option value="asia">Asia</option>
                        <option value="sa">South America</option>
                        <option value="oce">Oceania</option>
                      </select>
                    </div>
                    
                    <button class="action-button" id="start-matchmaking">START MATCHMAKING</button>
                    <button class="action-button" id="cancel-matchmaking" style="display: none;">CANCEL</button>
                  </div>
                  
                  <div class="matchmaking-progress" style="display: none;">
                    <div class="loading-spinner"></div>
                    <p>Searching for players...</p>
                    <p class="search-time">Time: <span id="search-time">0:00</span></p>
                  </div>
                </div>
              </div>
              
              <!-- Analytics View -->
              ${this.config.enableAnalytics ? `
              <div class="view-content" data-view="analytics" style="display: none;">
                <div class="analytics-container">
                  <h3>ANALYTICS DASHBOARD</h3>
                  <div id="analytics-content">
                    <!-- Analytics will be inserted here -->
                  </div>
                </div>
              </div>
              ` : ''}
            </div>
            
            <!-- Sidebar (Chat) -->
            ${this.config.enableChat ? `
            <div class="lobby-sidebar">
              <div class="chat-container">
                <div class="chat-header">LOBBY CHAT</div>
                <div class="chat-messages" id="chat-messages">
                  <!-- Chat messages will be inserted here -->
                </div>
                <div class="chat-input-container">
                  <input type="text" class="chat-input" id="chat-input" placeholder="Type a message..." maxlength="500">
                  <button class="chat-send" id="chat-send">SEND</button>
                </div>
              </div>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
    `
    
    // Cache elements
    this.elements = {
      overlay: this.container.querySelector('.enhanced-lobby-overlay'),
      closeBtn: this.container.querySelector('#lobby-close'),
      navButtons: this.container.querySelectorAll('.nav-button'),
      viewContents: this.container.querySelectorAll('.view-content'),
      
      // Quick actions
      quickPlayBtn: this.container.querySelector('#quick-play'),
      createRoomBtn: this.container.querySelector('#create-room'),
      findMatchBtn: this.container.querySelector('#find-match'),
      
      // Stats
      activeRooms: this.container.querySelector('#active-rooms'),
      playersOnline: this.container.querySelector('#players-online'),
      inQueue: this.container.querySelector('#in-queue'),
      
      // Rooms
      roomGrid: this.container.querySelector('#room-grid'),
      refreshRoomsBtn: this.container.querySelector('#refresh-rooms'),
      
      // Create room form
      createRoomForm: this.container.querySelector('#create-room-form'),
      
      // Matchmaking
      startMatchmakingBtn: this.container.querySelector('#start-matchmaking'),
      cancelMatchmakingBtn: this.container.querySelector('#cancel-matchmaking'),
      matchmakingStatus: this.container.querySelector('#matchmaking-status'),
      matchmakingProgress: this.container.querySelector('.matchmaking-progress'),
      searchTime: this.container.querySelector('#search-time'),
      
      // Chat
      chatMessages: this.container.querySelector('#chat-messages'),
      chatInput: this.container.querySelector('#chat-input'),
      chatSend: this.container.querySelector('#chat-send'),
      
      // Analytics
      analyticsContent: this.container.querySelector('#analytics-content')
    }
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Close button
    this.elements.closeBtn?.addEventListener('click', () => this.hide())
    
    // Navigation
    this.elements.navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view
        this.switchView(view)
      })
    })
    
    // Quick actions
    this.elements.quickPlayBtn?.addEventListener('click', () => this.quickPlay())
    this.elements.createRoomBtn?.addEventListener('click', () => this.switchView('create'))
    this.elements.findMatchBtn?.addEventListener('click', () => this.switchView('matchmaking'))
    
    // Rooms
    this.elements.refreshRoomsBtn?.addEventListener('click', () => this.refreshRooms())
    
    // Create room form
    this.elements.createRoomForm?.addEventListener('submit', (e) => {
      e.preventDefault()
      this.createRoom()
    })
    
    // Matchmaking
    this.elements.startMatchmakingBtn?.addEventListener('click', () => this.startMatchmaking())
    this.elements.cancelMatchmakingBtn?.addEventListener('click', () => this.cancelMatchmaking())
    
    // Chat
    this.elements.chatSend?.addEventListener('click', () => this.sendChatMessage())
    this.elements.chatInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendChatMessage()
      }
    })
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide()
      }
    })
  }
  
  /**
   * Set up room manager events
   */
  setupRoomManagerEvents() {
    this.roomManager.on('onRoomCreated', (room) => {
      this.refreshRooms()
      this.addSystemMessage(`Room "${room.name}" created`)
    })
    
    this.roomManager.on('onRoomJoined', (room) => {
      this.addSystemMessage(`Joined room "${room.name}"`)
      // Switch to room view
      this.showRoomDetails(room)
    })
    
    this.roomManager.on('onPlayerJoin', (player) => {
      this.addSystemMessage(`${player.name} joined the room`)
      this.updateRoomDetails()
    })
    
    this.roomManager.on('onPlayerLeave', (player) => {
      this.addSystemMessage(`${player.name} left the room`)
      this.updateRoomDetails()
    })
    
    this.roomManager.on('onRoomStateChange', (state) => {
      if (state === 'in_progress') {
        this.addSystemMessage('Game started!')
        // Hide lobby when game starts
        setTimeout(() => this.hide(), 1000)
      }
    })
    
    this.roomManager.on('onMatchmakingComplete', (room) => {
      this.cancelMatchmaking()
      this.addSystemMessage('Match found!')
      this.showRoomDetails(room)
    })
  }
  
  /**
   * Set up chat events
   */
  setupChatEvents() {
    this.chatSystem.on('onMessage', (message) => {
      this.displayChatMessage(message)
    })
    
    this.chatSystem.on('onSystemMessage', (message) => {
      this.displayChatMessage(message)
    })
  }
  
  /**
   * Start periodic updates
   */
  startUpdates() {
    setInterval(() => {
      if (this.isVisible) {
        this.updateStats()
        if (this.currentView === 'rooms') {
          this.refreshRooms()
        }
      }
    }, 5000) // Update every 5 seconds
  }
  
  /**
   * Show the lobby
   */
  show() {
    this.isVisible = true
    this.elements.overlay.classList.add('visible')
    this.refreshRooms()
    this.updateStats()
  }
  
  /**
   * Hide the lobby
   */
  hide() {
    this.isVisible = false
    this.elements.overlay.classList.remove('visible')
  }
  
  /**
   * Switch view
   */
  switchView(view) {
    this.currentView = view
    
    // Update nav buttons
    this.elements.navButtons.forEach(btn => {
      if (btn.dataset.view === view) {
        btn.classList.add('active')
      } else {
        btn.classList.remove('active')
      }
    })
    
    // Update view content
    this.elements.viewContents.forEach(content => {
      if (content.dataset.view === view) {
        content.style.display = 'block'
      } else {
        content.style.display = 'none'
      }
    })
    
    // Refresh content if needed
    if (view === 'rooms') {
      this.refreshRooms()
    } else if (view === 'analytics' && this.config.enableAnalytics) {
      this.updateAnalytics()
    }
  }
  
  /**
   * Quick play
   */
  async quickPlay() {
    try {
      const room = await this.roomManager.quickPlay({
        playerName: this.getPlayerName()
      })
      this.showRoomDetails(room)
    } catch (error) {
      this.addSystemMessage(`Quick play failed: ${error.message}`)
    }
  }
  
  /**
   * Create room
   */
  async createRoom() {
    const formData = new FormData(this.elements.createRoomForm)
    
    try {
      const room = await this.roomManager.createRoom({
        name: formData.get('room-name') || 'New Room',
        gameMode: document.getElementById('game-mode').value,
        maxPlayers: parseInt(document.getElementById('max-players').value),
        type: document.getElementById('room-type').value,
        allowSpectators: document.getElementById('allow-spectators').checked,
        allowLateJoin: document.getElementById('allow-late-join').checked,
        password: document.getElementById('room-password').value || null
      })
      
      // Join the created room
      await this.roomManager.joinRoom(room.id, {
        playerName: this.getPlayerName()
      })
      
      this.showRoomDetails(room)
    } catch (error) {
      this.addSystemMessage(`Failed to create room: ${error.message}`)
    }
  }
  
  /**
   * Refresh rooms list
   */
  refreshRooms() {
    const rooms = this.roomManager.getRoomList()
    const grid = this.elements.roomGrid
    
    if (!grid) return
    
    grid.innerHTML = ''
    
    if (rooms.length === 0) {
      grid.innerHTML = '<p style="text-align: center; opacity: 0.5;">No rooms available. Create one!</p>'
      return
    }
    
    rooms.forEach(room => {
      const card = document.createElement('div')
      card.className = 'room-card'
      if (room.id === this.selectedRoomId) {
        card.classList.add('selected')
      }
      
      const playerCount = room.players?.size || 0
      const maxPlayers = room.maxPlayers || 4
      const fillPercent = (playerCount / maxPlayers) * 100
      
      let statusClass = 'waiting'
      if (room.state === 'in_progress') {
        statusClass = 'in-progress'
      } else if (playerCount >= maxPlayers) {
        statusClass = 'full'
      }
      
      card.innerHTML = `
        <div class="room-status ${statusClass}"></div>
        <div class="room-name">${room.name}</div>
        <div class="room-info">
          <div>Mode: ${room.gameMode}</div>
          <div>Type: ${room.type}</div>
          ${room.password ? '<div>🔒 Password Protected</div>' : ''}
        </div>
        <div class="room-players">
          <span class="player-count">${playerCount}/${maxPlayers}</span>
          <div class="player-bar">
            <div class="player-fill" style="width: ${fillPercent}%"></div>
          </div>
        </div>
      `
      
      card.addEventListener('click', () => {
        this.selectedRoomId = room.id
        this.joinRoom(room.id)
      })
      
      grid.appendChild(card)
    })
  }
  
  /**
   * Join room
   */
  async joinRoom(roomId) {
    try {
      const room = await this.roomManager.joinRoom(roomId, {
        playerName: this.getPlayerName()
      })
      this.showRoomDetails(room)
    } catch (error) {
      // Check if room needs password
      if (error.message.includes('password')) {
        const password = prompt('This room requires a password:')
        if (password) {
          try {
            const room = await this.roomManager.joinRoom(roomId, {
              playerName: this.getPlayerName(),
              password
            })
            this.showRoomDetails(room)
          } catch (error) {
            this.addSystemMessage(`Failed to join room: ${error.message}`)
          }
        }
      } else {
        this.addSystemMessage(`Failed to join room: ${error.message}`)
      }
    }
  }
  
  /**
   * Show room details
   */
  showRoomDetails(room) {
    // TODO: Implement room details view
    this.addSystemMessage(`Joined room: ${room.name}`)
  }
  
  /**
   * Update room details
   */
  updateRoomDetails() {
    // TODO: Update room details view
  }
  
  /**
   * Start matchmaking
   */
  async startMatchmaking() {
    const gameMode = document.getElementById('mm-game-mode').value
    const region = document.getElementById('mm-region').value
    
    this.elements.startMatchmakingBtn.style.display = 'none'
    this.elements.cancelMatchmakingBtn.style.display = 'block'
    this.elements.matchmakingProgress.style.display = 'block'
    
    const startTime = Date.now()
    this.matchmakingInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const minutes = Math.floor(elapsed / 60000)
      const seconds = Math.floor((elapsed % 60000) / 1000)
      this.elements.searchTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`
    }, 1000)
    
    try {
      const match = await this.matchmaking.addToQueue(
        { id: this.getPlayerId(), name: this.getPlayerName() },
        { gameMode, region }
      )
      
      this.cancelMatchmaking()
      this.addSystemMessage('Match found!')
      
      // Create room for the match
      const room = await this.roomManager.createRoom({
        name: `${gameMode} Match`,
        type: 'ranked',
        gameMode,
        maxPlayers: match.players.length,
        autoStart: true
      })
      
      this.showRoomDetails(room)
    } catch (error) {
      this.cancelMatchmaking()
      this.addSystemMessage(`Matchmaking failed: ${error.message}`)
    }
  }
  
  /**
   * Cancel matchmaking
   */
  cancelMatchmaking() {
    if (this.matchmakingInterval) {
      clearInterval(this.matchmakingInterval)
      this.matchmakingInterval = null
    }
    
    this.matchmaking.removeFromQueue(this.getPlayerId())
    
    this.elements.startMatchmakingBtn.style.display = 'block'
    this.elements.cancelMatchmakingBtn.style.display = 'none'
    this.elements.matchmakingProgress.style.display = 'none'
    this.elements.searchTime.textContent = '0:00'
  }
  
  /**
   * Update stats
   */
  updateStats() {
    const summary = this.roomManager.getAnalyticsSummary()
    
    if (this.elements.activeRooms) {
      this.elements.activeRooms.textContent = summary.activeRooms
    }
    if (this.elements.playersOnline) {
      this.elements.playersOnline.textContent = summary.totalPlayers
    }
    if (this.elements.inQueue) {
      this.elements.inQueue.textContent = summary.matchmakingQueue
    }
  }
  
  /**
   * Update analytics
   */
  updateAnalytics() {
    if (!this.config.enableAnalytics || !this.elements.analyticsContent) return
    
    const analytics = this.roomManager.getAnalytics()
    const report = analytics.getDetailedReport()
    
    this.elements.analyticsContent.innerHTML = `
      <div class="analytics-section">
        <h4>Summary</h4>
        <div class="stats-grid">
          <div>Total Events: ${report.summary.totalEvents}</div>
          <div>Unique Users: ${report.summary.uniqueUsers}</div>
          <div>Sessions: ${report.summary.sessions}</div>
        </div>
      </div>
      
      <div class="analytics-section">
        <h4>Room Statistics</h4>
        <div class="stats-grid">
          <div>Rooms Created: ${report.roomMetrics.roomsCreated}</div>
          <div>Rooms Completed: ${report.roomMetrics.roomsCompleted}</div>
          <div>Avg Players: ${report.roomMetrics.avgPlayersPerRoom.toFixed(1)}</div>
        </div>
      </div>
      
      <div class="analytics-section">
        <h4>Insights</h4>
        <ul>
          ${report.insights.map(insight => `<li>${insight}</li>`).join('')}
        </ul>
      </div>
      
      <div class="analytics-section">
        <h4>Recommendations</h4>
        <ul>
          ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
    `
  }
  
  /**
   * Send chat message
   */
  sendChatMessage() {
    const input = this.elements.chatInput
    if (!input || !input.value.trim()) return
    
    const message = input.value.trim()
    
    try {
      this.chatSystem.sendMessage('lobby', this.getPlayerId(), message, {
        userName: this.getPlayerName()
      })
      input.value = ''
    } catch (error) {
      this.addSystemMessage(`Chat error: ${error.message}`)
    }
  }
  
  /**
   * Display chat message
   */
  displayChatMessage(message) {
    if (!this.elements.chatMessages) return
    
    const messageEl = document.createElement('div')
    messageEl.className = 'chat-message'
    
    if (message.type === 'system') {
      messageEl.classList.add('system')
      messageEl.textContent = message.content
    } else {
      const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      messageEl.innerHTML = `
        <span class="username">${message.userName}:</span>
        <span>${message.content}</span>
        <span class="timestamp">${time}</span>
      `
    }
    
    this.elements.chatMessages.appendChild(messageEl)
    this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight
  }
  
  /**
   * Add system message
   */
  addSystemMessage(content) {
    this.displayChatMessage({
      type: 'system',
      content,
      timestamp: Date.now()
    })
  }
  
  /**
   * Helper: Get player ID
   */
  getPlayerId() {
    // Get or generate player ID
    let playerId = localStorage.getItem('playerId')
    if (!playerId) {
      playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('playerId', playerId)
    }
    return playerId
  }
  
  /**
   * Helper: Get player name
   */
  getPlayerName() {
    // Get or generate player name
    let playerName = localStorage.getItem('playerName')
    if (!playerName) {
      playerName = `Player${Math.floor(Math.random() * 9999)}`
      localStorage.setItem('playerName', playerName)
    }
    return playerName
  }
}

export default EnhancedLobbyUI