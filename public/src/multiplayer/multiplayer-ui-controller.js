/**
 * Multiplayer UI Controller
 * Handles all UI interactions for the multiplayer lobby and game
 */

export class RoomLobbyUI {
  constructor(coordinator) {
    this.coordinator = coordinator
    this.elements = {}
    this.statusTimeout = null
  }
  
  initialize() {
    console.log('🎨 Initializing UI controller...')
    
    // Get all DOM elements
    this.elements = {
      // Containers
      lobbyContainer: document.getElementById('lobby-container'),
      gameContainer: document.getElementById('game-container'),
      
      // Lobby elements
      createRoomBtn: document.getElementById('create-room-btn'),
      refreshRoomsBtn: document.getElementById('refresh-rooms-btn'),
      quickPlayBtn: document.getElementById('quick-play-btn'),
      roomList: document.getElementById('room-list'),
      
      // Player info
      playerNameInput: document.getElementById('player-name-input'),
      playerRating: document.getElementById('player-rating'),
      playerGames: document.getElementById('player-games'),
      
      // Network settings
      networkProviderSelect: document.getElementById('network-provider-select'),
      networkStatus: document.getElementById('network-status'),
      
      // Current room
      currentRoomSection: document.getElementById('current-room-section'),
      currentRoomName: document.getElementById('current-room-name'),
      currentRoomHost: document.getElementById('current-room-host'),
      currentRoomMode: document.getElementById('current-room-mode'),
      currentRoomStatus: document.getElementById('current-room-status'),
      playerCount: document.getElementById('player-count'),
      maxPlayers: document.getElementById('max-players'),
      playerListContainer: document.getElementById('player-list-container'),
      readyBtn: document.getElementById('ready-btn'),
      leaveRoomBtn: document.getElementById('leave-room-btn'),
      
      // Modal
      createRoomModal: document.getElementById('create-room-modal'),
      createRoomForm: document.getElementById('create-room-form'),
      roomNameInput: document.getElementById('room-name-input'),
      roomTypeSelect: document.getElementById('room-type-select'),
      gameModeSelect: document.getElementById('game-mode-select'),
      maxPlayersInput: document.getElementById('max-players-input'),
      cancelCreateBtn: document.getElementById('cancel-create-btn'),
      
      // Status and feedback
      statusMessage: document.getElementById('status-message'),
      loading: document.getElementById('loading'),
      networkIndicator: document.getElementById('network-indicator'),
      networkDot: document.getElementById('network-dot'),
      networkText: document.getElementById('network-text')
    }
    
    // Set up event listeners
    this.setupEventListeners()
    
    // Initialize player name input
    this.elements.playerNameInput.value = this.coordinator.state.playerName
    
    console.log('✅ UI controller initialized')
  }
  
  setupEventListeners() {
    // Create room button
    this.elements.createRoomBtn?.addEventListener('click', () => {
      this.showCreateRoomModal()
    })
    
    // Refresh rooms button
    this.elements.refreshRoomsBtn?.addEventListener('click', () => {
      this.coordinator.refreshRooms()
      this.showStatus('Refreshing rooms...', 'info')
    })
    
    // Quick play button
    this.elements.quickPlayBtn?.addEventListener('click', () => {
      this.coordinator.quickPlay()
    })
    
    // Player name input
    this.elements.playerNameInput?.addEventListener('change', (e) => {
      const name = e.target.value.trim()
      if (name) {
        this.coordinator.savePlayerName(name)
      }
    })
    
    // Network provider selector
    this.elements.networkProviderSelect?.addEventListener('change', async (e) => {
      const provider = e.target.value
      await this.coordinator.changeNetworkProvider(provider)
    })
    
    // Ready button
    this.elements.readyBtn?.addEventListener('click', () => {
      this.coordinator.toggleReady()
    })
    
    // Leave room button
    this.elements.leaveRoomBtn?.addEventListener('click', () => {
      this.coordinator.leaveRoom()
    })
    
    // Create room form
    this.elements.createRoomForm?.addEventListener('submit', (e) => {
      e.preventDefault()
      this.handleCreateRoom()
    })
    
    // Cancel create room
    this.elements.cancelCreateBtn?.addEventListener('click', () => {
      this.hideCreateRoomModal()
    })
    
    // Click outside modal to close
    this.elements.createRoomModal?.addEventListener('click', (e) => {
      if (e.target === this.elements.createRoomModal) {
        this.hideCreateRoomModal()
      }
    })
  }
  
  updateRoomList(rooms) {
    if (!this.elements.roomList) {return}
    
    if (!rooms || rooms.length === 0) {
      this.elements.roomList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎲</div>
          <p>No rooms available. Create one to get started!</p>
        </div>
      `
      return
    }
    
    this.elements.roomList.innerHTML = rooms.map(room => {
      const playerCount = room.players instanceof Map ? room.players.size : (room.players?.length || 0)
      return `
        <div class="room-item" data-room-id="${room.id}">
          <div class="room-item-header">
            <div class="room-name">${this.escapeHtml(room.name)}</div>
            <div class="room-players">${playerCount}/${room.maxPlayers}</div>
          </div>
          <div class="room-info">
            <span>🎮 ${this.getGameModeLabel(room.gameMode)}</span>
            <span>🏠 ${this.getRoomTypeLabel(room.type)}</span>
            <span>⚡ ${this.getRoomStatusLabel(room.status)}</span>
          </div>
        </div>
      `
    }).join('')
    
    // Add click handlers to room items
    this.elements.roomList.querySelectorAll('.room-item').forEach(item => {
      item.addEventListener('click', () => {
        const roomId = item.dataset.roomId
        this.coordinator.joinRoom(roomId)
      })
    })
  }
  
  showCurrentRoom(room) {
    if (!this.elements.currentRoomSection) {return}
    
    this.elements.currentRoomSection.classList.add('active')
    this.elements.currentRoomName.textContent = room.name
    this.elements.currentRoomHost.textContent = this.coordinator.state.isHost ? 'You' : room.host || 'Unknown'
    this.elements.currentRoomMode.textContent = this.getGameModeLabel(room.gameMode)
    this.elements.currentRoomStatus.textContent = this.getRoomStatusLabel(room.status)
    this.elements.maxPlayers.textContent = room.maxPlayers
    
    this.updatePlayerList(room)
  }
  
  hideCurrentRoom() {
    if (!this.elements.currentRoomSection) {return}
    this.elements.currentRoomSection.classList.remove('active')
  }
  
  updatePlayerList(room) {
    if (!this.elements.playerListContainer || !room) {return}
    
    // Convert Map to Array if needed
    const players = room.players instanceof Map 
      ? Array.from(room.players.values())
      : (Array.isArray(room.players) ? room.players : [])
    this.elements.playerCount.textContent = players.length
    
    this.elements.playerListContainer.innerHTML = players.map(player => `
      <div class="player-list-item">
        <div class="player-name">${this.escapeHtml(player.name || player.id)}</div>
        <div class="player-role">${player.role === 'host' ? '👑 Host' : '🎮 Player'}</div>
      </div>
    `).join('')
    
    if (players.length === 0) {
      this.elements.playerListContainer.innerHTML = '<p style="color: #667799; text-align: center;">Waiting for players...</p>'
    }
  }
  
  updateReadyButton(isReady) {
    if (!this.elements.readyBtn) {return}
    
    if (isReady) {
      this.elements.readyBtn.textContent = 'Not Ready'
      this.elements.readyBtn.classList.add('btn-secondary')
    } else {
      this.elements.readyBtn.textContent = 'Ready'
      this.elements.readyBtn.classList.remove('btn-secondary')
    }
  }
  
  updatePlayerStats(stats) {
    if (this.elements.playerRating) {
      this.elements.playerRating.textContent = stats.rating || 1000
    }
    if (this.elements.playerGames) {
      this.elements.playerGames.textContent = stats.gamesPlayed || 0
    }
  }
  
  showCreateRoomModal() {
    if (!this.elements.createRoomModal) {return}
    this.elements.createRoomModal.classList.add('active')
  }
  
  hideCreateRoomModal() {
    if (!this.elements.createRoomModal) {return}
    this.elements.createRoomModal.classList.remove('active')
    this.elements.createRoomForm?.reset()
  }
  
  async handleCreateRoom() {
    const options = {
      name: this.elements.roomNameInput.value.trim(),
      type: this.elements.roomTypeSelect.value,
      gameMode: this.elements.gameModeSelect.value,
      maxPlayers: parseInt(this.elements.maxPlayersInput.value)
    }
    
    try {
      await this.coordinator.createRoom(options)
      this.hideCreateRoomModal()
    } catch (error) {
      console.error('Failed to create room:', error)
    }
  }
  
  showLobby() {
    if (this.elements.lobbyContainer) {
      this.elements.lobbyContainer.classList.remove('hidden')
    }
    if (this.elements.gameContainer) {
      this.elements.gameContainer.classList.remove('active')
    }
  }
  
  showGame() {
    if (this.elements.lobbyContainer) {
      this.elements.lobbyContainer.classList.add('hidden')
    }
    if (this.elements.gameContainer) {
      this.elements.gameContainer.classList.add('active')
    }
    
    // Show mobile controls if on mobile
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      const mobileControls = document.getElementById('mobile-controls')
      if (mobileControls) {
        mobileControls.style.display = 'flex'
      }
    }
  }
  
  showLoading(show) {
    if (!this.elements.loading) {return}
    
    if (show) {
      this.elements.loading.classList.add('active')
    } else {
      this.elements.loading.classList.remove('active')
    }
  }
  
  showStatus(message, type = 'info') {
    if (!this.elements.statusMessage) {return}
    
    // Clear previous timeout
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout)
    }
    
    // Set message and type
    this.elements.statusMessage.textContent = message
    this.elements.statusMessage.className = 'status-message active ' + type
    
    // Auto-hide after 3 seconds
    this.statusTimeout = setTimeout(() => {
      this.elements.statusMessage.classList.remove('active')
    }, 3000)
  }
  
  updateNetworkQuality(quality) {
    if (!this.elements.networkIndicator) {return}
    
    this.elements.networkIndicator.classList.add('active')
    
    let statusText = 'Connected'
    let dotClass = ''
    
    switch (quality) {
      case 'excellent':
      case 'good':
        statusText = 'Connection: Good'
        dotClass = ''
        break
      case 'fair':
        statusText = 'Connection: Fair'
        dotClass = 'warning'
        break
      case 'poor':
        statusText = 'Connection: Poor'
        dotClass = 'poor'
        break
      default:
        statusText = 'Connecting...'
        dotClass = 'warning'
    }
    
    this.elements.networkText.textContent = statusText
    this.elements.networkDot.className = 'network-dot ' + dotClass
  }
  
  // Helper methods
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
  
  getGameModeLabel(mode) {
    const labels = {
      default: 'Default',
      deathmatch: 'Deathmatch',
      team: 'Team Battle',
      ctf: 'Capture the Flag',
      survival: 'Survival'
    }
    return labels[mode] || mode
  }
  
  getRoomTypeLabel(type) {
    const labels = {
      public: 'Public',
      private: 'Private',
      ranked: 'Ranked',
      custom: 'Custom'
    }
    return labels[type] || type
  }
  
  getRoomStatusLabel(status) {
    const labels = {
      waiting: 'Waiting',
      starting: 'Starting',
      in_progress: 'In Progress',
      paused: 'Paused',
      completed: 'Completed'
    }
    return labels[status] || status
  }
}