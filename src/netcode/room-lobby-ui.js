/**
 * Room Lobby UI - UI component for room management
 * Aligned with the current game's dark, monospace aesthetic
 */

export class RoomLobbyUI {
  constructor(containerId = 'room-lobby') {
    this.container = document.getElementById(containerId) || this.createContainer(containerId)
    this.roomManager = null
    this.selectedRoomId = null
    this.isInRoom = false
    
    this.initializeUI()
  }
  
  createContainer(id) {
    const container = document.createElement('div')
    container.id = id
    document.body.appendChild(container)
    return container
  }
  
  initializeUI() {
    // Create the lobby overlay HTML structure
    this.container.innerHTML = `
      <!-- Room Lobby Overlay -->
      <div id="room-lobby-overlay" class="room-overlay">
        <div class="overlay-box">
          <p class="overlay-title">MULTIPLAYER LOBBY</p>
          
          <!-- Main Menu (shown when not in a room) -->
          <div id="lobby-menu" class="lobby-section">
            <div class="button-group">
              <button id="create-room-btn" type="button" class="primary-btn">CREATE ROOM</button>
              <button id="join-room-btn" type="button" class="primary-btn">JOIN ROOM</button>
              <button id="quick-play-btn" type="button" class="secondary-btn">QUICK PLAY</button>
            </div>
          </div>
          
          <!-- Create Room Form -->
          <div id="create-room-form" class="lobby-section" hidden>
            <div class="form-group">
              <label for="room-name">Room Name:</label>
              <input type="text" id="room-name" placeholder="Enter room name..." maxlength="32" />
            </div>
            <div class="form-group">
              <label for="max-players">Max Players:</label>
              <select id="max-players">
                <option value="2">2 Players</option>
                <option value="4" selected>4 Players</option>
                <option value="8">8 Players</option>
                <option value="16">16 Players</option>
              </select>
            </div>
            <div class="button-group">
              <button id="confirm-create-btn" type="button" class="primary-btn">CREATE</button>
              <button id="cancel-create-btn" type="button" class="secondary-btn">BACK</button>
            </div>
          </div>
          
          <!-- Room List -->
          <div id="room-list-section" class="lobby-section" hidden>
            <div class="room-list-header">
              <span class="room-count">0 ROOMS AVAILABLE</span>
              <button id="refresh-rooms-btn" type="button" class="icon-btn">⟳</button>
            </div>
            <div id="room-list" class="room-list">
              <!-- Room items will be dynamically inserted here -->
            </div>
            <div class="button-group">
              <button id="join-selected-btn" type="button" class="primary-btn" disabled>JOIN SELECTED</button>
              <button id="back-to-menu-btn" type="button" class="secondary-btn">BACK</button>
            </div>
          </div>
          
          <!-- In Room View -->
          <div id="in-room-view" class="lobby-section" hidden>
            <div class="room-info">
              <h3 id="current-room-name">Room Name</h3>
              <div class="room-code">Room ID: <span id="room-code-display">-</span></div>
            </div>
            
            <div class="players-section">
              <div class="players-header">
                <span>PLAYERS (<span id="player-count">1</span>/<span id="max-player-count">4</span>)</span>
              </div>
              <div id="player-list" class="player-list">
                <!-- Player items will be dynamically inserted here -->
              </div>
            </div>
            
            <div class="button-group">
              <button id="start-game-btn" type="button" class="primary-btn" hidden>START GAME</button>
              <button id="leave-room-btn" type="button" class="danger-btn">LEAVE ROOM</button>
            </div>
          </div>
          
          <!-- Close button (for when game starts) -->
          <button id="close-lobby-btn" type="button" class="close-btn" hidden>×</button>
        </div>
      </div>
    `
    
    this.addStyles()
    this.attachEventListeners()
  }
  
  addStyles() {
    if (document.getElementById('room-lobby-styles')) {return}
    
    const style = document.createElement('style')
    style.id = 'room-lobby-styles'
    style.textContent = `
      /* Room Lobby Overlay */
      .room-overlay {
        position: fixed;
        inset: 0;
        background: linear-gradient(135deg, rgba(15, 10, 30, 0.95) 0%, rgba(5, 5, 20, 0.98) 100%);
        backdrop-filter: blur(12px) saturate(150%);
        display: grid;
        place-items: center;
        z-index: 1000;
        font-family: 'Inter', 'Space Mono', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: overlayFadeIn 0.3s ease-out;
      }
      
      @keyframes overlayFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .room-overlay[hidden] {
        display: none;
      }
      
      .room-overlay .overlay-box {
        width: min(90vw, 580px);
        max-height: 85vh;
        padding: 36px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 24px;
        background: linear-gradient(135deg, rgba(20, 20, 40, 0.95) 0%, rgba(10, 10, 25, 0.98) 100%);
        box-shadow: 
          0 0 0 1px rgba(255, 255, 255, 0.05) inset,
          0 20px 60px rgba(0, 0, 0, 0.5),
          0 0 100px rgba(100, 180, 255, 0.15),
          0 0 200px rgba(100, 180, 255, 0.05);
        position: relative;
        overflow-y: auto;
        overflow-x: hidden;
      }
      
      .room-overlay .overlay-title {
        font-size: 2.6rem;
        font-weight: 800;
        text-align: center;
        margin-bottom: 32px;
        background: linear-gradient(135deg, #fff 0%, #64b5f6 50%, #00e5ff 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        text-transform: uppercase;
        letter-spacing: 3px;
        text-shadow: 0 0 40px rgba(100, 180, 255, 0.5);
        animation: titleGlow 3s ease-in-out infinite alternate;
      }
      
      @keyframes titleGlow {
        from { filter: brightness(1) drop-shadow(0 0 20px rgba(100, 180, 255, 0.3)); }
        to { filter: brightness(1.2) drop-shadow(0 0 30px rgba(100, 180, 255, 0.6)); }
      }
      
      .lobby-section {
        animation: sectionSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      @keyframes sectionSlideIn {
        from { 
          opacity: 0; 
          transform: translateY(20px) scale(0.95);
        }
        to { 
          opacity: 1; 
          transform: translateY(0) scale(1);
        }
      }
      
      /* Form Groups */
      .form-group {
        margin-bottom: 20px;
      }
      
      .form-group label {
        display: block;
        font-size: 1.4rem;
        color: #ccc;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .form-group input,
      .form-group select {
        width: 100%;
        padding: 14px 18px;
        font-family: inherit;
        font-size: 1.5rem;
        color: #fff;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.06) 100%);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        outline: none;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .form-group input:hover,
      .form-group select:hover {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.08) 100%);
        border-color: rgba(255, 255, 255, 0.25);
      }
      
      .form-group input:focus,
      .form-group select:focus {
        border-color: #00e5ff;
        background: linear-gradient(135deg, rgba(0, 229, 255, 0.05) 0%, rgba(0, 229, 255, 0.1) 100%);
        box-shadow: 
          0 0 0 3px rgba(0, 229, 255, 0.1),
          0 0 20px rgba(0, 229, 255, 0.2),
          inset 0 0 20px rgba(0, 229, 255, 0.05);
        transform: translateY(-1px);
      }
      
      /* Buttons */
      .button-group {
        display: flex;
        gap: 12px;
        margin-top: 24px;
        justify-content: center;
        flex-wrap: wrap;
      }
      
      .primary-btn,
      .secondary-btn,
      .danger-btn {
        padding: 12px 24px;
        font-family: inherit;
        font-size: 1.6rem;
        font-weight: bold;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 1px;
        transition: all 0.2s ease;
        min-width: 140px;
      }
      
      .primary-btn {
        color: #000;
        background: linear-gradient(135deg, #00e5ff 0%, #00acc1 100%);
        position: relative;
        overflow: hidden;
      }
      
      .primary-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        transition: left 0.5s;
      }
      
      .primary-btn:hover:not(:disabled) {
        background: linear-gradient(135deg, #00ffff 0%, #00bcd4 100%);
        box-shadow: 
          0 4px 20px rgba(0, 229, 255, 0.4),
          0 0 40px rgba(0, 229, 255, 0.2),
          inset 0 0 20px rgba(255, 255, 255, 0.1);
        transform: translateY(-3px) scale(1.02);
      }
      
      .primary-btn:hover:not(:disabled)::before {
        left: 100%;
      }
      
      .primary-btn:active:not(:disabled) {
        transform: translateY(-1px) scale(1);
      }
      
      .secondary-btn {
        color: #fff;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.05) 100%);
        border: 1px solid rgba(255, 255, 255, 0.2);
        position: relative;
        overflow: hidden;
      }
      
      .secondary-btn::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
        opacity: 0;
        transition: opacity 0.3s;
      }
      
      .secondary-btn:hover {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.08) 100%);
        border-color: rgba(255, 255, 255, 0.4);
        box-shadow: 
          0 4px 15px rgba(255, 255, 255, 0.1),
          inset 0 0 20px rgba(255, 255, 255, 0.05);
        transform: translateY(-2px);
      }
      
      .secondary-btn:hover::after {
        opacity: 1;
      }
      
      .danger-btn {
        color: #fff;
        background: linear-gradient(135deg, #ff5252 0%, #d32f2f 100%);
        position: relative;
        overflow: hidden;
      }
      
      .danger-btn::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
        opacity: 0;
        transition: opacity 0.3s;
      }
      
      .danger-btn:hover {
        background: linear-gradient(135deg, #ff6b6b 0%, #f44336 100%);
        box-shadow: 
          0 4px 20px rgba(244, 67, 54, 0.4),
          0 0 40px rgba(244, 67, 54, 0.2),
          inset 0 0 20px rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
      }
      
      .danger-btn:hover::before {
        opacity: 1;
      }
      
      button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        filter: grayscale(0.5);
      }
      
      .icon-btn {
        width: 40px;
        height: 40px;
        padding: 0;
        font-size: 2rem;
        color: #fff;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.05) 100%);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .icon-btn:hover {
        background: linear-gradient(135deg, rgba(0, 229, 255, 0.15) 0%, rgba(0, 229, 255, 0.08) 100%);
        border-color: rgba(0, 229, 255, 0.4);
        transform: rotate(360deg) scale(1.1);
        box-shadow: 0 0 20px rgba(0, 229, 255, 0.3);
      }
      
      /* Room List */
      .room-list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 2px solid rgba(255, 255, 255, 0.2);
      }
      
      .room-count {
        font-size: 1.4rem;
        color: #ccc;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .room-list {
        max-height: 300px;
        overflow-y: auto;
        margin-bottom: 20px;
      }
      
      .room-item {
        padding: 18px;
        margin-bottom: 14px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }
      
      .room-item::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(0, 229, 255, 0.1) 0%, transparent 100%);
        opacity: 0;
        transition: opacity 0.3s;
      }
      
      .room-item:hover {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateX(4px);
        box-shadow: 
          0 4px 15px rgba(0, 0, 0, 0.2),
          inset 0 0 20px rgba(255, 255, 255, 0.02);
      }
      
      .room-item:hover::before {
        opacity: 1;
      }
      
      .room-item.selected {
        background: linear-gradient(135deg, rgba(0, 229, 255, 0.15) 0%, rgba(0, 229, 255, 0.05) 100%);
        border-color: rgba(0, 229, 255, 0.5);
        box-shadow: 
          0 0 20px rgba(0, 229, 255, 0.3),
          inset 0 0 30px rgba(0, 229, 255, 0.1);
        transform: translateX(8px) scale(1.02);
      }
      
      .room-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      
      .room-name {
        font-size: 1.6rem;
        font-weight: bold;
        color: #fff;
      }
      
      .room-players {
        font-size: 1.4rem;
        color: #00e5ff;
        font-weight: 600;
        text-shadow: 0 0 10px rgba(0, 229, 255, 0.5);
      }
      
      .room-id {
        font-size: 1.2rem;
        color: #888;
        font-family: monospace;
      }
      
      /* In Room View */
      .room-info {
        text-align: center;
        margin-bottom: 24px;
        padding-bottom: 20px;
        border-bottom: 2px solid rgba(255, 255, 255, 0.2);
      }
      
      .room-info h3 {
        font-size: 2rem;
        color: #fff;
        margin-bottom: 8px;
      }
      
      .room-code {
        font-size: 1.4rem;
        color: #ccc;
      }
      
      .room-code span {
        color: #00e5ff;
        font-family: 'Fira Code', 'Cascadia Code', monospace;
        font-weight: 600;
        text-shadow: 0 0 10px rgba(0, 229, 255, 0.5);
      }
      
      .players-section {
        margin-bottom: 24px;
      }
      
      .players-header {
        font-size: 1.4rem;
        color: #ccc;
        margin-bottom: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .player-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .player-item {
        padding: 14px 18px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }
      
      .player-item::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.5), transparent);
        opacity: 0;
        transition: opacity 0.3s;
      }
      
      .player-item:hover::before {
        opacity: 1;
      }
      
      .player-item.host {
        border-color: rgba(255, 215, 0, 0.4);
        background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.03) 100%);
        box-shadow: 
          0 0 20px rgba(255, 215, 0, 0.1),
          inset 0 0 20px rgba(255, 215, 0, 0.05);
      }
      
      .player-item.host::before {
        background: linear-gradient(180deg, transparent, #ffd700, transparent);
      }
      
      .player-item.self {
        border-color: rgba(0, 229, 255, 0.4);
        background: linear-gradient(135deg, rgba(0, 229, 255, 0.1) 0%, rgba(0, 229, 255, 0.03) 100%);
        box-shadow: 
          0 0 20px rgba(0, 229, 255, 0.1),
          inset 0 0 20px rgba(0, 229, 255, 0.05);
      }
      
      .player-item.self::before {
        background: linear-gradient(180deg, transparent, #00e5ff, transparent);
      }
      
      .player-name {
        font-size: 1.4rem;
        color: #fff;
      }
      
      .player-badge {
        font-size: 1.2rem;
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        text-transform: uppercase;
      }
      
      .player-badge.host {
        background: linear-gradient(135deg, #ffd700 0%, #ffb300 100%);
        color: #000;
        font-weight: 700;
        box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
      }
      
      /* Close Button */
      .close-btn {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 32px;
        height: 32px;
        font-size: 2.4rem;
        line-height: 1;
        color: #fff;
        background: transparent;
        border: none;
        cursor: pointer;
        opacity: 0.6;
        transition: opacity 0.2s ease;
      }
      
      .close-btn:hover {
        opacity: 1;
      }
      
      /* Empty State */
      .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #888;
        font-size: 1.4rem;
      }
      
      /* Loading State */
      .loading {
        text-align: center;
        padding: 20px;
        color: #ccc;
        font-size: 1.4rem;
      }
      
      .loading::after {
        content: '';
        animation: dots 1.5s steps(4, end) infinite;
      }
      
      @keyframes dots {
        0%, 20% { content: ''; }
        40% { content: '.'; }
        60% { content: '..'; }
        80%, 100% { content: '...'; }
      }
      
      /* Scrollbar Styling */
      .room-overlay .overlay-box::-webkit-scrollbar {
        width: 8px;
      }
      
      .room-overlay .overlay-box::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.02);
        border-radius: 4px;
      }
      
      .room-overlay .overlay-box::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, rgba(0, 229, 255, 0.3) 0%, rgba(0, 229, 255, 0.1) 100%);
        border-radius: 4px;
      }
      
      .room-overlay .overlay-box::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, rgba(0, 229, 255, 0.5) 0%, rgba(0, 229, 255, 0.2) 100%);
      }
      
      /* Responsive improvements */
      @media (max-width: 640px) {
        .room-overlay .overlay-box {
          width: 95vw;
          padding: 24px;
        }
        
        .room-overlay .overlay-title {
          font-size: 2rem;
        }
        
        .button-group {
          flex-direction: column;
        }
        
        .primary-btn,
        .secondary-btn,
        .danger-btn {
          width: 100%;
        }
      }
    `
    
    document.head.appendChild(style)
  }
  
  attachEventListeners() {
    // Main menu buttons
    document.getElementById('create-room-btn')?.addEventListener('click', () => {
      this.showSection('create-room-form')
    })
    
    document.getElementById('join-room-btn')?.addEventListener('click', () => {
      this.showSection('room-list-section')
      this.refreshRoomList()
    })
    
    document.getElementById('quick-play-btn')?.addEventListener('click', () => {
      this.quickPlay()
    })
    
    // Create room form
    document.getElementById('confirm-create-btn')?.addEventListener('click', () => {
      this.createRoom()
    })
    
    document.getElementById('cancel-create-btn')?.addEventListener('click', () => {
      this.showSection('lobby-menu')
    })
    
    // Room list
    document.getElementById('refresh-rooms-btn')?.addEventListener('click', () => {
      this.refreshRoomList()
    })
    
    document.getElementById('join-selected-btn')?.addEventListener('click', () => {
      this.joinSelectedRoom()
    })
    
    document.getElementById('back-to-menu-btn')?.addEventListener('click', () => {
      this.showSection('lobby-menu')
    })
    
    // In room
    document.getElementById('start-game-btn')?.addEventListener('click', () => {
      this.startGame()
    })
    
    document.getElementById('leave-room-btn')?.addEventListener('click', () => {
      this.leaveRoom()
    })
    
    // Close button
    document.getElementById('close-lobby-btn')?.addEventListener('click', () => {
      this.hide()
    })
  }
  
  setRoomManager(roomManager) {
    this.roomManager = roomManager
    
    // Set up room manager event listeners
    roomManager.on('onRoomListUpdate', (rooms) => {
      this.updateRoomList(rooms)
    })
    
    roomManager.on('onPlayerJoin', () => {
      this.updatePlayerList()
    })
    
    roomManager.on('onPlayerLeave', () => {
      this.updatePlayerList()
    })
    
    roomManager.on('onHostMigration', () => {
      this.updatePlayerList()
    })
  }
  
  show() {
    document.getElementById('room-lobby-overlay').hidden = false
    if (!this.isInRoom) {
      this.showSection('lobby-menu')
    }
  }
  
  hide() {
    document.getElementById('room-lobby-overlay').hidden = true
  }
  
  showSection(sectionId) {
    const sections = ['lobby-menu', 'create-room-form', 'room-list-section', 'in-room-view']
    sections.forEach(id => {
      const element = document.getElementById(id)
      if (element) {
        element.hidden = id !== sectionId
      }
    })
  }
  
  async createRoom() {
    if (!this.roomManager) {return}
    
    const roomName = document.getElementById('room-name').value.trim() || 'New Room'
    const maxPlayers = parseInt(document.getElementById('max-players').value)
    
    try {
      const room = await this.roomManager.createRoom(roomName, maxPlayers)
      this.isInRoom = true
      this.showInRoomView(room)
    } catch (error) {
      // Failed to create room
      alert('Failed to create room: ' + error.message)
    }
  }
  
  async joinSelectedRoom() {
    if (!this.roomManager || !this.selectedRoomId) {return}
    
    try {
      const room = await this.roomManager.joinRoom(this.selectedRoomId)
      this.isInRoom = true
      this.showInRoomView(room)
    } catch (error) {
      // Failed to join room
      alert('Failed to join room: ' + error.message)
    }
  }
  
  async quickPlay() {
    if (!this.roomManager) {return}
    
    const rooms = this.roomManager.getRoomList()
    const availableRooms = rooms.filter(r => r.playerCount < r.maxPlayers)
    
    if (availableRooms.length > 0) {
      // Join a random available room
      const randomRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)]
      this.selectedRoomId = randomRoom.id
      await this.joinSelectedRoom()
    } else {
      // Create a new room
      document.getElementById('room-name').value = 'Quick Play Room'
      document.getElementById('max-players').value = '4'
      await this.createRoom()
    }
  }
  
  async leaveRoom() {
    if (!this.roomManager) {return}
    
    await this.roomManager.leaveRoom()
    this.isInRoom = false
    this.showSection('lobby-menu')
  }
  
  startGame() {
    // Emit event to start the game
    if (this.onStartGame) {
      this.onStartGame()
    }
    this.hide()
  }
  
  refreshRoomList() {
    // The room list updates automatically via the onRoomListUpdate event
    const rooms = this.roomManager?.getRoomList() || []
    this.updateRoomList(rooms)
  }
  
  updateRoomList(rooms) {
    const roomListEl = document.getElementById('room-list')
    const roomCountEl = document.querySelector('.room-count')
    
    if (!roomListEl) {return}
    
    roomCountEl.textContent = `${rooms.length} ROOMS AVAILABLE`
    
    if (rooms.length === 0) {
      roomListEl.innerHTML = '<div class="empty-state">No rooms available. Create one!</div>'
      document.getElementById('join-selected-btn').disabled = true
      return
    }
    
    roomListEl.innerHTML = rooms.map(room => `
      <div class="room-item" data-room-id="${room.id}">
        <div class="room-item-header">
          <span class="room-name">${this.escapeHtml(room.name)}</span>
          <span class="room-players">${room.playerCount}/${room.maxPlayers}</span>
        </div>
        <div class="room-id">ID: ${room.id.substring(0, 8)}...</div>
      </div>
    `).join('')
    
    // Add click handlers
    roomListEl.querySelectorAll('.room-item').forEach(item => {
      item.addEventListener('click', () => {
        // Remove previous selection
        roomListEl.querySelectorAll('.room-item').forEach(i => i.classList.remove('selected'))
        // Add selection to clicked item
        item.classList.add('selected')
        this.selectedRoomId = item.dataset.roomId
        document.getElementById('join-selected-btn').disabled = false
      })
    })
  }
  
  showInRoomView(room) {
    document.getElementById('current-room-name').textContent = room.name
    document.getElementById('room-code-display').textContent = room.id
    document.getElementById('max-player-count').textContent = room.maxPlayers
    
    // Show start button only for host
    const startBtn = document.getElementById('start-game-btn')
    if (startBtn) {
      startBtn.hidden = !this.roomManager.isHost
    }
    
    this.updatePlayerList()
    this.showSection('in-room-view')
  }
  
  updatePlayerList() {
    if (!this.roomManager?.currentRoom) {return}
    
    const room = this.roomManager.currentRoom
    const playerListEl = document.getElementById('player-list')
    const playerCountEl = document.getElementById('player-count')
    
    if (!playerListEl) {return}
    
    playerCountEl.textContent = room.players.length
    
    playerListEl.innerHTML = room.players.map(playerId => {
      const isHost = playerId === room.hostId
      const isSelf = playerId === this.roomManager.selfId
      const classes = ['player-item']
      if (isHost) {classes.push('host')}
      if (isSelf) {classes.push('self')}
      
      return `
        <div class="${classes.join(' ')}">
          <span class="player-name">Player ${playerId.substring(0, 8)}</span>
          ${isHost ? '<span class="player-badge host">HOST</span>' : ''}
        </div>
      `
    }).join('')
  }
  
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}

export default RoomLobbyUI