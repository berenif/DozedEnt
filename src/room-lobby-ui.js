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
    if (document.getElementById('room-lobby-styles')) return
    
    const style = document.createElement('style')
    style.id = 'room-lobby-styles'
    style.textContent = `
      /* Room Lobby Overlay */
      .room-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(4px);
        display: grid;
        place-items: center;
        z-index: 1000;
        font-family: 'Space Mono', monospace;
      }
      
      .room-overlay[hidden] {
        display: none;
      }
      
      .room-overlay .overlay-box {
        width: min(90vw, 520px);
        max-height: 80vh;
        padding: 32px;
        border: 2px solid #fff;
        border-radius: 12px;
        background: #000;
        box-shadow: 
          0 0 0 2px rgba(255, 255, 255, 0.12) inset,
          0 12px 32px rgba(0, 0, 0, 0.6),
          0 0 40px rgba(0, 128, 255, 0.22);
        position: relative;
        overflow-y: auto;
      }
      
      .room-overlay .overlay-title {
        font-size: 2.4rem;
        font-weight: bold;
        text-align: center;
        margin-bottom: 24px;
        color: #fff;
        text-transform: uppercase;
        letter-spacing: 2px;
      }
      
      .lobby-section {
        animation: fadeIn 0.3s ease-out;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
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
        padding: 12px 16px;
        font-family: inherit;
        font-size: 1.6rem;
        color: #fff;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        outline: none;
        transition: all 0.2s ease;
      }
      
      .form-group input:focus,
      .form-group select:focus {
        border-color: #00e676;
        background: rgba(255, 255, 255, 0.08);
        box-shadow: 0 0 12px rgba(0, 230, 118, 0.3);
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
        background: #fff;
      }
      
      .primary-btn:hover:not(:disabled) {
        background: #00e676;
        box-shadow: 0 0 20px rgba(0, 230, 118, 0.5);
        transform: translateY(-2px);
      }
      
      .secondary-btn {
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.3);
      }
      
      .secondary-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
      }
      
      .danger-btn {
        color: #fff;
        background: #d32f2f;
      }
      
      .danger-btn:hover {
        background: #f44336;
        box-shadow: 0 0 20px rgba(244, 67, 54, 0.5);
      }
      
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .icon-btn {
        width: 36px;
        height: 36px;
        padding: 0;
        font-size: 2rem;
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .icon-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: rotate(180deg);
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
        padding: 16px;
        margin-bottom: 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .room-item:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.4);
      }
      
      .room-item.selected {
        background: rgba(0, 230, 118, 0.1);
        border-color: #00e676;
        box-shadow: 0 0 12px rgba(0, 230, 118, 0.3);
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
        color: #00e676;
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
        color: #00e676;
        font-family: monospace;
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
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .player-item.host {
        border-color: #ffd700;
        background: rgba(255, 215, 0, 0.05);
      }
      
      .player-item.self {
        border-color: #00e676;
        background: rgba(0, 230, 118, 0.05);
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
        background: #ffd700;
        color: #000;
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
    
    roomManager.on('onPlayerJoin', (playerId) => {
      this.updatePlayerList()
    })
    
    roomManager.on('onPlayerLeave', (playerId) => {
      this.updatePlayerList()
    })
    
    roomManager.on('onHostMigration', (newHostId) => {
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
    if (!this.roomManager) return
    
    const roomName = document.getElementById('room-name').value.trim() || 'New Room'
    const maxPlayers = parseInt(document.getElementById('max-players').value)
    
    try {
      const room = await this.roomManager.createRoom(roomName, maxPlayers)
      this.isInRoom = true
      this.showInRoomView(room)
    } catch (error) {
      console.error('Failed to create room:', error)
      alert('Failed to create room: ' + error.message)
    }
  }
  
  async joinSelectedRoom() {
    if (!this.roomManager || !this.selectedRoomId) return
    
    try {
      const room = await this.roomManager.joinRoom(this.selectedRoomId)
      this.isInRoom = true
      this.showInRoomView(room)
    } catch (error) {
      console.error('Failed to join room:', error)
      alert('Failed to join room: ' + error.message)
    }
  }
  
  async quickPlay() {
    if (!this.roomManager) return
    
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
    if (!this.roomManager) return
    
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
    
    if (!roomListEl) return
    
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
    if (!this.roomManager?.currentRoom) return
    
    const room = this.roomManager.currentRoom
    const playerListEl = document.getElementById('player-list')
    const playerCountEl = document.getElementById('player-count')
    
    if (!playerListEl) return
    
    playerCountEl.textContent = room.players.length
    
    playerListEl.innerHTML = room.players.map(playerId => {
      const isHost = playerId === room.hostId
      const isSelf = playerId === this.roomManager.selfId
      const classes = ['player-item']
      if (isHost) classes.push('host')
      if (isSelf) classes.push('self')
      
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