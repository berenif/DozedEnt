/**
 * Enhanced Lobby UI - Modern, feature-rich lobby interface
 * with chat, spectator mode, matchmaking, and statistics
 */

import { EnhancedRoomManager, RoomState, RoomType, PlayerRole } from './enhanced-room-manager.js'

export class EnhancedLobbyUI {
  constructor(containerId = 'enhanced-lobby', appId = 'game', config = {}) {
    this.container = document.getElementById(containerId) || this.createContainer(containerId)
    this.roomManager = new EnhancedRoomManager(appId, config)
    this.currentView = 'main-menu'
    this.selectedRoomId = null
    this.isMatchmaking = false
    this.chatEnabled = config.enableChat !== false
    this.voiceEnabled = config.enableVoice === true
    
    this.initializeStyles()
    this.initializeUI()
    this.setupEventListeners()
    this.bindRoomManagerEvents()
  }
  
  createContainer(id) {
    const container = document.createElement('div')
    container.id = id
    document.body.appendChild(container)
    return container
  }
  
  initializeStyles() {
    if (document.getElementById('enhanced-lobby-styles')) return
    
    const styles = document.createElement('style')
    styles.id = 'enhanced-lobby-styles'
    styles.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Orbitron:wght@400;700;900&display=swap');
      
      .enhanced-lobby {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(20px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Space Mono', monospace;
        color: #fff;
        animation: fadeIn 0.3s ease;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .lobby-container {
        width: 90%;
        max-width: 1400px;
        height: 85%;
        background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
        border: 2px solid #00ffcc;
        border-radius: 20px;
        box-shadow: 
          0 0 50px rgba(0, 255, 204, 0.3),
          inset 0 0 30px rgba(0, 255, 204, 0.1);
        display: flex;
        overflow: hidden;
        position: relative;
      }
      
      .lobby-sidebar {
        width: 280px;
        background: rgba(0, 0, 0, 0.5);
        border-right: 1px solid rgba(0, 255, 204, 0.3);
        padding: 20px;
        display: flex;
        flex-direction: column;
      }
      
      .lobby-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .lobby-header {
        padding: 25px 30px;
        background: rgba(0, 255, 204, 0.1);
        border-bottom: 1px solid rgba(0, 255, 204, 0.3);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .lobby-title {
        font-family: 'Orbitron', sans-serif;
        font-size: 2rem;
        font-weight: 900;
        color: #00ffcc;
        text-transform: uppercase;
        letter-spacing: 3px;
        text-shadow: 0 0 20px rgba(0, 255, 204, 0.5);
      }
      
      .lobby-content {
        flex: 1;
        padding: 30px;
        overflow-y: auto;
      }
      
      .nav-menu {
        list-style: none;
        padding: 0;
        margin: 20px 0;
      }
      
      .nav-item {
        margin: 10px 0;
      }
      
      .nav-btn {
        width: 100%;
        padding: 12px 16px;
        background: transparent;
        border: 1px solid rgba(0, 255, 204, 0.3);
        color: #fff;
        font-family: inherit;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        cursor: pointer;
        transition: all 0.3s ease;
        border-radius: 8px;
      }
      
      .nav-btn:hover {
        background: rgba(0, 255, 204, 0.1);
        border-color: #00ffcc;
        transform: translateX(5px);
      }
      
      .nav-btn.active {
        background: rgba(0, 255, 204, 0.2);
        border-color: #00ffcc;
        color: #00ffcc;
      }
      
      .room-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
        margin-top: 20px;
      }
      
      .room-card {
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(0, 255, 204, 0.3);
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      
      .room-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(45deg, transparent, rgba(0, 255, 204, 0.1), transparent);
        transform: translateX(-100%);
        transition: transform 0.6s;
      }
      
      .room-card:hover {
        transform: translateY(-5px);
        border-color: #00ffcc;
        box-shadow: 0 10px 30px rgba(0, 255, 204, 0.3);
      }
      
      .room-card:hover::before {
        transform: translateX(100%);
      }
      
      .room-card.selected {
        border-color: #00ffcc;
        background: rgba(0, 255, 204, 0.1);
      }
      
      .room-name {
        font-size: 1.2rem;
        font-weight: bold;
        margin-bottom: 10px;
        color: #00ffcc;
      }
      
      .room-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 8px 0;
        font-size: 0.9rem;
        color: #aaa;
      }
      
      .room-badge {
        display: inline-block;
        padding: 2px 8px;
        background: rgba(0, 255, 204, 0.2);
        border: 1px solid #00ffcc;
        border-radius: 4px;
        font-size: 0.75rem;
        color: #00ffcc;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .player-count {
        font-weight: bold;
        color: #fff;
      }
      
      .btn-primary {
        padding: 12px 24px;
        background: linear-gradient(135deg, #00ffcc 0%, #00ccaa 100%);
        border: none;
        color: #000;
        font-family: 'Orbitron', sans-serif;
        font-size: 1rem;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 2px;
        cursor: pointer;
        border-radius: 8px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(0, 255, 204, 0.3);
      }
      
      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(0, 255, 204, 0.5);
      }
      
      .btn-secondary {
        padding: 12px 24px;
        background: transparent;
        border: 2px solid rgba(255, 255, 255, 0.3);
        color: #fff;
        font-family: inherit;
        font-size: 1rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        cursor: pointer;
        border-radius: 8px;
        transition: all 0.3s ease;
      }
      
      .btn-secondary:hover {
        border-color: #fff;
        background: rgba(255, 255, 255, 0.1);
      }
      
      .form-group {
        margin: 20px 0;
      }
      
      .form-label {
        display: block;
        margin-bottom: 8px;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #00ffcc;
      }
      
      .form-input {
        width: 100%;
        padding: 12px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(0, 255, 204, 0.3);
        color: #fff;
        font-family: inherit;
        font-size: 1rem;
        border-radius: 8px;
        transition: all 0.3s ease;
      }
      
      .form-input:focus {
        outline: none;
        border-color: #00ffcc;
        box-shadow: 0 0 10px rgba(0, 255, 204, 0.3);
      }
      
      .form-select {
        width: 100%;
        padding: 12px;
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid rgba(0, 255, 204, 0.3);
        color: #fff;
        font-family: inherit;
        font-size: 1rem;
        border-radius: 8px;
        cursor: pointer;
      }
      
      .chat-container {
        position: absolute;
        right: 0;
        top: 0;
        width: 350px;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        border-left: 1px solid rgba(0, 255, 204, 0.3);
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.3s ease;
      }
      
      .chat-container.open {
        transform: translateX(0);
      }
      
      .chat-header {
        padding: 15px;
        background: rgba(0, 255, 204, 0.1);
        border-bottom: 1px solid rgba(0, 255, 204, 0.3);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .chat-messages {
        flex: 1;
        padding: 15px;
        overflow-y: auto;
      }
      
      .chat-message {
        margin: 10px 0;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
      }
      
      .chat-author {
        font-weight: bold;
        color: #00ffcc;
        margin-bottom: 4px;
      }
      
      .chat-text {
        color: #fff;
        font-size: 0.9rem;
      }
      
      .chat-input-container {
        padding: 15px;
        border-top: 1px solid rgba(0, 255, 204, 0.3);
        display: flex;
        gap: 10px;
      }
      
      .chat-input {
        flex: 1;
        padding: 10px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(0, 255, 204, 0.3);
        color: #fff;
        font-family: inherit;
        border-radius: 6px;
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-top: 20px;
      }
      
      .stat-card {
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(0, 255, 204, 0.3);
        border-radius: 12px;
        padding: 20px;
        text-align: center;
      }
      
      .stat-value {
        font-size: 2rem;
        font-weight: bold;
        color: #00ffcc;
        margin-bottom: 8px;
      }
      
      .stat-label {
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #aaa;
      }
      
      .player-list {
        list-style: none;
        padding: 0;
        margin: 20px 0;
      }
      
      .player-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        margin: 8px 0;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(0, 255, 204, 0.2);
        border-radius: 8px;
      }
      
      .player-name {
        font-weight: bold;
        color: #fff;
      }
      
      .player-status {
        padding: 4px 8px;
        background: rgba(0, 255, 0, 0.2);
        border: 1px solid rgba(0, 255, 0, 0.5);
        border-radius: 4px;
        font-size: 0.8rem;
        color: #0f0;
      }
      
      .player-status.not-ready {
        background: rgba(255, 255, 0, 0.2);
        border-color: rgba(255, 255, 0, 0.5);
        color: #ff0;
      }
      
      .loading-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid rgba(0, 255, 204, 0.3);
        border-top-color: #00ffcc;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .close-btn {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        color: #fff;
        font-size: 1.5rem;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .close-btn:hover {
        background: rgba(255, 0, 0, 0.2);
        border-color: #ff0000;
        transform: rotate(90deg);
      }
      
      .spectator-badge {
        display: inline-block;
        padding: 2px 6px;
        background: rgba(128, 128, 128, 0.3);
        border: 1px solid #888;
        border-radius: 4px;
        font-size: 0.75rem;
        color: #888;
        text-transform: uppercase;
        margin-left: 8px;
      }
      
      .matchmaking-container {
        text-align: center;
        padding: 60px 20px;
      }
      
      .matchmaking-icon {
        font-size: 4rem;
        margin-bottom: 20px;
        animation: pulse 2s ease infinite;
      }
      
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
      }
      
      .matchmaking-text {
        font-size: 1.5rem;
        color: #00ffcc;
        margin-bottom: 10px;
      }
      
      .matchmaking-status {
        color: #aaa;
        font-size: 0.9rem;
      }
    `
    document.head.appendChild(styles)
  }
  
  initializeUI() {
    this.container.innerHTML = `
      <div class="enhanced-lobby">
        <div class="lobby-container">
          <div class="lobby-sidebar">
            <div class="user-info">
              <div style="padding: 20px 0; border-bottom: 1px solid rgba(0, 255, 204, 0.3);">
                <div style="font-weight: bold; color: #00ffcc; margin-bottom: 8px;">PLAYER</div>
                <div id="player-name" style="color: #fff;">Guest</div>
                <div id="player-stats" style="font-size: 0.8rem; color: #aaa; margin-top: 8px;">
                  Rating: 1000 | W: 0 L: 0
                </div>
              </div>
            </div>
            
            <nav class="nav-menu">
              <li class="nav-item">
                <button class="nav-btn active" data-view="main-menu">Main Menu</button>
              </li>
              <li class="nav-item">
                <button class="nav-btn" data-view="room-browser">Browse Rooms</button>
              </li>
              <li class="nav-item">
                <button class="nav-btn" data-view="create-room">Create Room</button>
              </li>
              <li class="nav-item">
                <button class="nav-btn" data-view="quick-play">Quick Play</button>
              </li>
              <li class="nav-item">
                <button class="nav-btn" data-view="matchmaking">Matchmaking</button>
              </li>
              <li class="nav-item">
                <button class="nav-btn" data-view="statistics">Statistics</button>
              </li>
              <li class="nav-item">
                <button class="nav-btn" data-view="settings">Settings</button>
              </li>
            </nav>
            
            <div style="margin-top: auto; padding-top: 20px; border-top: 1px solid rgba(0, 255, 204, 0.3);">
              <button id="toggle-chat-btn" class="btn-secondary" style="width: 100%; margin-bottom: 10px;">
                💬 Toggle Chat
              </button>
              <div style="text-align: center; font-size: 0.8rem; color: #666; margin-top: 10px;">
                <span id="online-count">0</span> Players Online
              </div>
            </div>
          </div>
          
          <div class="lobby-main">
            <div class="lobby-header">
              <h1 class="lobby-title">Game Lobby</h1>
              <div id="header-actions"></div>
            </div>
            
            <div class="lobby-content" id="lobby-content">
              <!-- Dynamic content will be loaded here -->
            </div>
          </div>
          
          <div class="chat-container" id="chat-container">
            <div class="chat-header">
              <span style="font-weight: bold; color: #00ffcc;">LOBBY CHAT</span>
              <button id="close-chat-btn" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 1.2rem;">×</button>
            </div>
            <div class="chat-messages" id="chat-messages"></div>
            <div class="chat-input-container">
              <input type="text" class="chat-input" id="chat-input" placeholder="Type a message..." />
              <button class="btn-primary" id="send-chat-btn" style="padding: 10px 20px;">Send</button>
            </div>
          </div>
          
          <button class="close-btn" id="close-lobby-btn">×</button>
        </div>
      </div>
    `
    
    this.showView('main-menu')
  }
  
  showView(view) {
    this.currentView = view
    const content = document.getElementById('lobby-content')
    const headerActions = document.getElementById('header-actions')
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view)
    })
    
    switch (view) {
      case 'main-menu':
        this.showMainMenu(content, headerActions)
        break
      case 'room-browser':
        this.showRoomBrowser(content, headerActions)
        break
      case 'create-room':
        this.showCreateRoom(content, headerActions)
        break
      case 'quick-play':
        this.showQuickPlay(content, headerActions)
        break
      case 'matchmaking':
        this.showMatchmaking(content, headerActions)
        break
      case 'in-room':
        this.showInRoom(content, headerActions)
        break
      case 'statistics':
        this.showStatistics(content, headerActions)
        break
      case 'settings':
        this.showSettings(content, headerActions)
        break
    }
  }
  
  showMainMenu(content, headerActions) {
    headerActions.innerHTML = ''
    content.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <h2 style="font-family: 'Orbitron', sans-serif; font-size: 3rem; color: #00ffcc; margin-bottom: 20px;">
          WELCOME TO THE LOBBY
        </h2>
        <p style="color: #aaa; margin-bottom: 40px; font-size: 1.1rem;">
          Join or create multiplayer rooms to play with others
        </p>
        
        <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
          <div class="room-card" style="width: 250px; cursor: pointer;" data-action="quick-play">
            <div style="font-size: 3rem; margin-bottom: 15px;">⚡</div>
            <div class="room-name">Quick Play</div>
            <div style="color: #aaa; font-size: 0.9rem;">Jump into a game instantly</div>
          </div>
          
          <div class="room-card" style="width: 250px; cursor: pointer;" data-action="create-room">
            <div style="font-size: 3rem; margin-bottom: 15px;">➕</div>
            <div class="room-name">Create Room</div>
            <div style="color: #aaa; font-size: 0.9rem;">Host your own game room</div>
          </div>
          
          <div class="room-card" style="width: 250px; cursor: pointer;" data-action="browse-rooms">
            <div style="font-size: 3rem; margin-bottom: 15px;">🔍</div>
            <div class="room-name">Browse Rooms</div>
            <div style="color: #aaa; font-size: 0.9rem;">Find and join existing rooms</div>
          </div>
          
          <div class="room-card" style="width: 250px; cursor: pointer;" data-action="matchmaking">
            <div style="font-size: 3rem; margin-bottom: 15px;">🎯</div>
            <div class="room-name">Matchmaking</div>
            <div style="color: #aaa; font-size: 0.9rem;">Find players at your skill level</div>
          </div>
        </div>
        
        <div style="margin-top: 60px; padding-top: 40px; border-top: 1px solid rgba(0, 255, 204, 0.2);">
          <h3 style="color: #00ffcc; margin-bottom: 20px;">RECENT ACTIVITY</h3>
          <div id="recent-activity" style="color: #aaa; font-size: 0.9rem;">
            No recent activity
          </div>
        </div>
      </div>
    `
    
    // Add click handlers for menu cards
    content.querySelectorAll('[data-action]').forEach(card => {
      card.addEventListener('click', () => {
        const action = card.dataset.action
        if (action === 'quick-play') {
          this.handleQuickPlay()
        } else if (action === 'create-room') {
          this.showView('create-room')
        } else if (action === 'browse-rooms') {
          this.showView('room-browser')
        } else if (action === 'matchmaking') {
          this.showView('matchmaking')
        }
      })
    })
  }
  
  showRoomBrowser(content, headerActions) {
    headerActions.innerHTML = `
      <button id="refresh-rooms-btn" class="btn-secondary">⟳ Refresh</button>
    `
    
    content.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="color: #00ffcc;">Available Rooms</h2>
          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="text" id="room-search" class="form-input" placeholder="Search rooms..." style="width: 250px;" />
            <select id="room-filter" class="form-select" style="width: 150px;">
              <option value="all">All Rooms</option>
              <option value="waiting">Waiting</option>
              <option value="in-progress">In Progress</option>
              <option value="spectate">Spectate Only</option>
            </select>
          </div>
        </div>
        
        <div id="room-list" class="room-grid">
          <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #aaa;">
            <div class="loading-spinner" style="margin: 0 auto 20px;"></div>
            <div>Loading rooms...</div>
          </div>
        </div>
        
        <div style="margin-top: 30px; display: flex; gap: 20px; justify-content: center;">
          <button id="join-room-btn" class="btn-primary" disabled>Join Selected Room</button>
          <button id="join-with-code-btn" class="btn-secondary">Join with Code</button>
        </div>
      </div>
    `
    
    // Load rooms
    this.refreshRoomList()
    
    // Setup refresh button
    document.getElementById('refresh-rooms-btn')?.addEventListener('click', () => {
      this.refreshRoomList()
    })
  }
  
  showCreateRoom(content, headerActions) {
    headerActions.innerHTML = ''
    
    content.innerHTML = `
      <div style="max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00ffcc; margin-bottom: 30px;">Create New Room</h2>
        
        <form id="create-room-form">
          <div class="form-group">
            <label class="form-label">Room Name</label>
            <input type="text" id="room-name" class="form-input" placeholder="Enter room name..." maxlength="32" required />
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="form-group">
              <label class="form-label">Room Type</label>
              <select id="room-type" class="form-select">
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="ranked">Ranked</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Max Players</label>
              <select id="max-players" class="form-select">
                <option value="2">2 Players</option>
                <option value="4" selected>4 Players</option>
                <option value="8">8 Players</option>
                <option value="16">16 Players</option>
              </select>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="form-group">
              <label class="form-label">Game Mode</label>
              <select id="game-mode" class="form-select">
                <option value="default">Default</option>
                <option value="deathmatch">Deathmatch</option>
                <option value="team">Team Battle</option>
                <option value="capture">Capture the Flag</option>
                <option value="survival">Survival</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Time Limit</label>
              <select id="time-limit" class="form-select">
                <option value="0">No Limit</option>
                <option value="300">5 Minutes</option>
                <option value="600">10 Minutes</option>
                <option value="900">15 Minutes</option>
                <option value="1800">30 Minutes</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">
              <input type="checkbox" id="allow-spectators" checked /> Allow Spectators
            </label>
          </div>
          
          <div class="form-group">
            <label class="form-label">
              <input type="checkbox" id="allow-late-join" checked /> Allow Late Join
            </label>
          </div>
          
          <div class="form-group">
            <label class="form-label">
              <input type="checkbox" id="password-protected" /> Password Protected
            </label>
            <input type="password" id="room-password" class="form-input" placeholder="Enter password..." style="margin-top: 10px; display: none;" />
          </div>
          
          <div style="display: flex; gap: 20px; justify-content: center; margin-top: 30px;">
            <button type="submit" class="btn-primary">Create Room</button>
            <button type="button" class="btn-secondary" id="cancel-create">Cancel</button>
          </div>
        </form>
      </div>
    `
    
    // Handle password toggle
    document.getElementById('password-protected').addEventListener('change', (e) => {
      document.getElementById('room-password').style.display = e.target.checked ? 'block' : 'none'
    })
    
    // Handle form submission
    document.getElementById('create-room-form').addEventListener('submit', (e) => {
      e.preventDefault()
      this.handleCreateRoom()
    })
    
    // Handle cancel
    document.getElementById('cancel-create').addEventListener('click', () => {
      this.showView('main-menu')
    })
  }
  
  showQuickPlay(content, headerActions) {
    headerActions.innerHTML = ''
    
    content.innerHTML = `
      <div class="matchmaking-container">
        <div class="matchmaking-icon">⚡</div>
        <div class="matchmaking-text">Finding a Game...</div>
        <div class="matchmaking-status">Searching for available rooms</div>
        <div style="margin-top: 30px;">
          <button id="cancel-quick-play" class="btn-secondary">Cancel</button>
        </div>
      </div>
    `
    
    this.handleQuickPlay()
    
    document.getElementById('cancel-quick-play').addEventListener('click', () => {
      this.showView('main-menu')
    })
  }
  
  showMatchmaking(content, headerActions) {
    headerActions.innerHTML = ''
    
    if (this.isMatchmaking) {
      content.innerHTML = `
        <div class="matchmaking-container">
          <div class="matchmaking-icon">🎯</div>
          <div class="matchmaking-text">Matchmaking in Progress</div>
          <div class="matchmaking-status" id="matchmaking-status">Finding players at your skill level...</div>
          <div style="margin-top: 30px;">
            <button id="cancel-matchmaking" class="btn-secondary">Cancel</button>
          </div>
        </div>
      `
      
      document.getElementById('cancel-matchmaking').addEventListener('click', () => {
        this.isMatchmaking = false
        this.showView('matchmaking')
      })
    } else {
      content.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto;">
          <h2 style="color: #00ffcc; margin-bottom: 30px;">Skill-Based Matchmaking</h2>
          
          <div class="stat-card" style="margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-around;">
              <div>
                <div class="stat-value">1000</div>
                <div class="stat-label">Your Rating</div>
              </div>
              <div>
                <div class="stat-value">0</div>
                <div class="stat-label">Games Played</div>
              </div>
              <div>
                <div class="stat-value">0%</div>
                <div class="stat-label">Win Rate</div>
              </div>
            </div>
          </div>
          
          <form id="matchmaking-form">
            <div class="form-group">
              <label class="form-label">Game Mode</label>
              <select id="mm-game-mode" class="form-select">
                <option value="any">Any Mode</option>
                <option value="default">Default</option>
                <option value="deathmatch">Deathmatch</option>
                <option value="team">Team Battle</option>
                <option value="ranked">Ranked Only</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Skill Range</label>
              <select id="mm-skill-range" class="form-select">
                <option value="100">±100 Rating</option>
                <option value="200" selected>±200 Rating</option>
                <option value="300">±300 Rating</option>
                <option value="500">±500 Rating</option>
                <option value="1000">Any Skill Level</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Region</label>
              <select id="mm-region" class="form-select">
                <option value="auto">Auto-detect</option>
                <option value="na">North America</option>
                <option value="eu">Europe</option>
                <option value="asia">Asia</option>
                <option value="oceania">Oceania</option>
              </select>
            </div>
            
            <div style="display: flex; gap: 20px; justify-content: center; margin-top: 30px;">
              <button type="submit" class="btn-primary">Start Matchmaking</button>
              <button type="button" class="btn-secondary" id="back-to-menu">Back</button>
            </div>
          </form>
        </div>
      `
      
      document.getElementById('matchmaking-form').addEventListener('submit', (e) => {
        e.preventDefault()
        this.handleStartMatchmaking()
      })
      
      document.getElementById('back-to-menu').addEventListener('click', () => {
        this.showView('main-menu')
      })
    }
  }
  
  showInRoom(content, headerActions) {
    const room = this.roomManager.currentRoom
    if (!room) return
    
    const isHost = this.roomManager.playerInfo.role === 'host'
    const isSpectator = this.roomManager.playerInfo.role === 'spectator'
    
    headerActions.innerHTML = isHost ? `
      <button id="room-settings-btn" class="btn-secondary">⚙️ Settings</button>
    ` : ''
    
    content.innerHTML = `
      <div>
        <div style="background: rgba(0, 0, 0, 0.6); border: 1px solid rgba(0, 255, 204, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h2 style="color: #00ffcc; margin-bottom: 10px;">${room.name}</h2>
              <div style="color: #aaa;">
                Room Code: <span style="color: #fff; font-weight: bold; font-size: 1.2rem;">${room.code}</span>
                <button id="copy-code-btn" style="margin-left: 10px; padding: 4px 8px; background: rgba(0, 255, 204, 0.2); border: 1px solid #00ffcc; color: #00ffcc; border-radius: 4px; cursor: pointer;">Copy</button>
              </div>
            </div>
            <div style="text-align: right;">
              <div class="room-badge">${room.type.toUpperCase()}</div>
              <div style="margin-top: 8px; color: #aaa;">
                ${room.settings.gameMode} | ${room.maxPlayers} Players Max
              </div>
            </div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
          <div>
            <h3 style="color: #00ffcc; margin-bottom: 15px;">
              Players (${room.players.length}/${room.maxPlayers})
            </h3>
            <ul class="player-list" id="player-list">
              ${room.players.map(player => `
                <li class="player-item">
                  <div>
                    <span class="player-name">${player.name}</span>
                    ${player.role === 'host' ? '<span class="room-badge" style="margin-left: 10px;">HOST</span>' : ''}
                  </div>
                  <div>
                    ${player.ready ? 
                      '<span class="player-status">READY</span>' : 
                      '<span class="player-status not-ready">NOT READY</span>'
                    }
                  </div>
                </li>
              `).join('')}
            </ul>
            
            ${room.spectators.length > 0 ? `
              <h3 style="color: #00ffcc; margin: 20px 0 15px;">
                Spectators (${room.spectators.length}/${room.maxSpectators})
              </h3>
              <ul class="player-list">
                ${room.spectators.map(spectator => `
                  <li class="player-item">
                    <div>
                      <span class="player-name">${spectator.name}</span>
                      <span class="spectator-badge">SPECTATOR</span>
                    </div>
                  </li>
                `).join('')}
              </ul>
            ` : ''}
          </div>
          
          <div>
            <h3 style="color: #00ffcc; margin-bottom: 15px;">Room Settings</h3>
            <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(0, 255, 204, 0.2); border-radius: 8px; padding: 15px;">
              <div style="margin-bottom: 10px;">
                <div style="color: #aaa; font-size: 0.9rem;">Game Mode</div>
                <div style="color: #fff;">${room.settings.gameMode}</div>
              </div>
              ${room.settings.timeLimit > 0 ? `
                <div style="margin-bottom: 10px;">
                  <div style="color: #aaa; font-size: 0.9rem;">Time Limit</div>
                  <div style="color: #fff;">${room.settings.timeLimit / 60} minutes</div>
                </div>
              ` : ''}
              <div style="margin-bottom: 10px;">
                <div style="color: #aaa; font-size: 0.9rem;">Spectators</div>
                <div style="color: #fff;">${room.settings.allowSpectators ? 'Allowed' : 'Not Allowed'}</div>
              </div>
              <div>
                <div style="color: #aaa; font-size: 0.9rem;">Late Join</div>
                <div style="color: #fff;">${room.settings.allowLateJoin ? 'Allowed' : 'Not Allowed'}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 30px; display: flex; gap: 20px; justify-content: center;">
          ${!isSpectator ? `
            <button id="toggle-ready-btn" class="btn-primary">
              ${room.players.find(p => p.id === this.roomManager.playerInfo.id)?.ready ? 'Not Ready' : 'Ready'}
            </button>
          ` : ''}
          ${isHost ? `
            <button id="start-game-btn" class="btn-primary" ${room.players.length < 2 ? 'disabled' : ''}>
              Start Game
            </button>
          ` : ''}
          <button id="leave-room-btn" class="btn-secondary">Leave Room</button>
        </div>
      </div>
    `
    
    // Setup event handlers
    document.getElementById('copy-code-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(room.code)
      alert('Room code copied to clipboard!')
    })
    
    document.getElementById('toggle-ready-btn')?.addEventListener('click', () => {
      this.roomManager.toggleReady()
    })
    
    document.getElementById('start-game-btn')?.addEventListener('click', () => {
      this.handleStartGame()
    })
    
    document.getElementById('leave-room-btn')?.addEventListener('click', () => {
      this.handleLeaveRoom()
    })
  }
  
  showStatistics(content, headerActions) {
    headerActions.innerHTML = ''
    const stats = this.roomManager.getStatistics()
    
    content.innerHTML = `
      <div>
        <h2 style="color: #00ffcc; margin-bottom: 30px;">Lobby Statistics</h2>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${stats.currentRooms}</div>
            <div class="stat-label">Active Rooms</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.currentPlayers}</div>
            <div class="stat-label">Players Online</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.totalRoomsCreated}</div>
            <div class="stat-label">Total Rooms Created</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.totalPlayersJoined}</div>
            <div class="stat-label">Total Players Joined</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.peakConcurrentRooms}</div>
            <div class="stat-label">Peak Concurrent Rooms</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${Math.round(stats.averageRoomDuration / 60000) || 0}m</div>
            <div class="stat-label">Avg Room Duration</div>
          </div>
        </div>
        
        <h3 style="color: #00ffcc; margin: 30px 0 20px;">Popular Game Modes</h3>
        <div style="background: rgba(0, 0, 0, 0.6); border: 1px solid rgba(0, 255, 204, 0.3); border-radius: 12px; padding: 20px;">
          ${Array.from(stats.popularGameModes.entries()).map(([mode, count]) => `
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(0, 255, 204, 0.1);">
              <span style="color: #fff;">${mode}</span>
              <span style="color: #00ffcc;">${count} rooms</span>
            </div>
          `).join('') || '<div style="color: #aaa; text-align: center;">No data available</div>'}
        </div>
        
        <h3 style="color: #00ffcc; margin: 30px 0 20px;">Recent Rooms</h3>
        <div class="room-grid">
          ${stats.roomHistory.slice(-6).map(room => `
            <div class="room-card" style="cursor: default; opacity: 0.7;">
              <div class="room-name">${room.name}</div>
              <div class="room-info">
                <span>Ended ${new Date(room.archivedAt).toLocaleTimeString()}</span>
              </div>
              <div class="room-info">
                <span>${room.playerCount} players</span>
                <span>${room.settings.gameMode}</span>
              </div>
            </div>
          `).join('') || '<div style="grid-column: 1 / -1; text-align: center; color: #aaa;">No recent rooms</div>'}
        </div>
      </div>
    `
  }
  
  showSettings(content, headerActions) {
    headerActions.innerHTML = ''
    
    content.innerHTML = `
      <div style="max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00ffcc; margin-bottom: 30px;">Settings</h2>
        
        <div class="form-group">
          <label class="form-label">Player Name</label>
          <input type="text" id="player-name-input" class="form-input" value="${this.roomManager.playerInfo.name}" />
        </div>
        
        <div class="form-group">
          <label class="form-label">
            <input type="checkbox" id="enable-chat" ${this.chatEnabled ? 'checked' : ''} /> Enable Chat
          </label>
        </div>
        
        <div class="form-group">
          <label class="form-label">
            <input type="checkbox" id="enable-voice" ${this.voiceEnabled ? 'checked' : ''} /> Enable Voice Chat (Experimental)
          </label>
        </div>
        
        <div class="form-group">
          <label class="form-label">Preferred Region</label>
          <select id="preferred-region" class="form-select">
            <option value="auto">Auto-detect</option>
            <option value="na">North America</option>
            <option value="eu">Europe</option>
            <option value="asia">Asia</option>
            <option value="oceania">Oceania</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Preferred Room Size</label>
          <select id="preferred-room-size" class="form-select">
            <option value="2">2 Players</option>
            <option value="4" selected>4 Players</option>
            <option value="8">8 Players</option>
            <option value="16">16 Players</option>
          </select>
        </div>
        
        <div style="display: flex; gap: 20px; justify-content: center; margin-top: 30px;">
          <button id="save-settings-btn" class="btn-primary">Save Settings</button>
          <button id="reset-settings-btn" class="btn-secondary">Reset to Default</button>
        </div>
      </div>
    `
    
    document.getElementById('save-settings-btn').addEventListener('click', () => {
      this.saveSettings()
    })
    
    document.getElementById('reset-settings-btn').addEventListener('click', () => {
      this.resetSettings()
    })
  }
  
  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showView(btn.dataset.view)
      })
    })
    
    // Chat
    document.getElementById('toggle-chat-btn')?.addEventListener('click', () => {
      document.getElementById('chat-container').classList.toggle('open')
    })
    
    document.getElementById('close-chat-btn')?.addEventListener('click', () => {
      document.getElementById('chat-container').classList.remove('open')
    })
    
    document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendChatMessage()
      }
    })
    
    document.getElementById('send-chat-btn')?.addEventListener('click', () => {
      this.sendChatMessage()
    })
    
    // Close lobby
    document.getElementById('close-lobby-btn')?.addEventListener('click', () => {
      this.close()
    })
  }
  
  bindRoomManagerEvents() {
    this.roomManager.on('onRoomListUpdate', (rooms) => {
      this.updateRoomList(rooms)
      document.getElementById('online-count').textContent = this.roomManager.players.size
    })
    
    this.roomManager.on('onPlayerJoin', (player) => {
      this.addChatMessage({
        type: 'system',
        message: `${player.name} joined the room`
      })
      if (this.currentView === 'in-room') {
        this.showView('in-room')
      }
    })
    
    this.roomManager.on('onPlayerLeave', (player) => {
      this.addChatMessage({
        type: 'system',
        message: `${player.name} left the room`
      })
      if (this.currentView === 'in-room') {
        this.showView('in-room')
      }
    })
    
    this.roomManager.on('onChatMessage', (message) => {
      this.addChatMessage(message)
    })
    
    this.roomManager.on('onRoomStateChange', (state) => {
      if (state === 'in_progress') {
        this.addChatMessage({
          type: 'system',
          message: 'Game is starting!'
        })
        // Close lobby when game starts
        setTimeout(() => this.close(), 2000)
      }
    })
    
    this.roomManager.on('onMatchmakingComplete', (room) => {
      this.isMatchmaking = false
      this.showView('in-room')
    })
  }
  
  refreshRoomList() {
    // Trigger a room list update
    const rooms = Array.from(this.roomManager.rooms.values())
    this.updateRoomList(rooms)
  }
  
  updateRoomList(rooms) {
    const roomList = document.getElementById('room-list')
    if (!roomList) return
    
    if (rooms.length === 0) {
      roomList.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #aaa;">
          No rooms available. Create one to get started!
        </div>
      `
      return
    }
    
    roomList.innerHTML = rooms.map(room => `
      <div class="room-card ${room.id === this.selectedRoomId ? 'selected' : ''}" data-room-id="${room.id}">
        <div class="room-name">${room.name}</div>
        <div class="room-info">
          <span class="player-count">${room.playerCount}/${room.maxPlayers} Players</span>
          <span class="room-badge">${room.state.replace('_', ' ').toUpperCase()}</span>
        </div>
        <div class="room-info">
          <span>${room.settings.gameMode}</span>
          ${room.settings.isPasswordProtected ? '<span>🔒 Password</span>' : ''}
        </div>
        ${room.spectatorCount > 0 ? `
          <div class="room-info">
            <span>${room.spectatorCount} Spectators</span>
          </div>
        ` : ''}
      </div>
    `).join('')
    
    // Add click handlers
    roomList.querySelectorAll('.room-card').forEach(card => {
      card.addEventListener('click', () => {
        this.selectedRoomId = card.dataset.roomId
        roomList.querySelectorAll('.room-card').forEach(c => c.classList.remove('selected'))
        card.classList.add('selected')
        document.getElementById('join-room-btn').disabled = false
      })
    })
  }
  
  async handleCreateRoom() {
    const formData = {
      name: document.getElementById('room-name').value,
      type: document.getElementById('room-type').value,
      maxPlayers: parseInt(document.getElementById('max-players').value),
      gameMode: document.getElementById('game-mode').value,
      timeLimit: parseInt(document.getElementById('time-limit').value),
      allowSpectators: document.getElementById('allow-spectators').checked,
      allowLateJoin: document.getElementById('allow-late-join').checked,
      password: document.getElementById('password-protected').checked ? 
        document.getElementById('room-password').value : null
    }
    
    try {
      await this.roomManager.createRoom(formData)
      this.showView('in-room')
    } catch (error) {
      alert('Failed to create room: ' + error.message)
    }
  }
  
  async handleQuickPlay() {
    try {
      await this.roomManager.quickPlay()
      this.showView('in-room')
    } catch (error) {
      alert('Failed to find a game: ' + error.message)
      this.showView('main-menu')
    }
  }
  
  async handleStartMatchmaking() {
    const criteria = {
      gameMode: document.getElementById('mm-game-mode').value,
      skillRange: parseInt(document.getElementById('mm-skill-range').value),
      region: document.getElementById('mm-region').value
    }
    
    this.isMatchmaking = true
    this.showView('matchmaking')
    
    try {
      await this.roomManager.startMatchmaking(criteria)
    } catch (error) {
      this.isMatchmaking = false
      alert('Matchmaking failed: ' + error.message)
      this.showView('matchmaking')
    }
  }
  
  handleStartGame() {
    try {
      this.roomManager.startGame()
    } catch (error) {
      alert('Cannot start game: ' + error.message)
    }
  }
  
  async handleLeaveRoom() {
    await this.roomManager.leaveRoom()
    this.showView('main-menu')
  }
  
  sendChatMessage() {
    const input = document.getElementById('chat-input')
    const message = input.value.trim()
    
    if (message) {
      this.roomManager.sendChatMessage(message)
      input.value = ''
    }
  }
  
  addChatMessage(message) {
    const chatMessages = document.getElementById('chat-messages')
    if (!chatMessages) return
    
    const messageEl = document.createElement('div')
    messageEl.className = 'chat-message'
    
    if (message.type === 'system') {
      messageEl.innerHTML = `
        <div style="color: #00ffcc; text-align: center; font-style: italic;">
          ${message.message}
        </div>
      `
    } else {
      messageEl.innerHTML = `
        <div class="chat-author">${message.playerName}</div>
        <div class="chat-text">${message.message}</div>
      `
    }
    
    chatMessages.appendChild(messageEl)
    chatMessages.scrollTop = chatMessages.scrollHeight
  }
  
  saveSettings() {
    const name = document.getElementById('player-name-input').value
    this.roomManager.playerInfo.name = name
    this.chatEnabled = document.getElementById('enable-chat').checked
    this.voiceEnabled = document.getElementById('enable-voice').checked
    
    // Update display
    document.getElementById('player-name').textContent = name
    
    alert('Settings saved!')
  }
  
  resetSettings() {
    document.getElementById('player-name-input').value = `Player_${this.roomManager.playerInfo.id.slice(0, 6)}`
    document.getElementById('enable-chat').checked = true
    document.getElementById('enable-voice').checked = false
    document.getElementById('preferred-region').value = 'auto'
    document.getElementById('preferred-room-size').value = '4'
  }
  
  close() {
    if (this.roomManager.currentRoom) {
      this.roomManager.leaveRoom()
    }
    this.container.innerHTML = ''
    this.roomManager.destroy()
  }
  
  show() {
    this.container.style.display = 'block'
  }
  
  hide() {
    this.container.style.display = 'none'
  }
}

export default EnhancedLobbyUI