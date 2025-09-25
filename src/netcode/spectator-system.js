/**
 * Spectator System - Advanced spectating with multiple camera modes
 * Features follow cam, free cam, picture-in-picture, and replay controls
 */

export class SpectatorSystem {
  constructor(gameStateManager, roomManager, visualEffectsManager) {
    this.gameStateManager = gameStateManager;
    this.roomManager = roomManager;
    this.visualEffectsManager = visualEffectsManager;
    
    // Spectator state
    this.isSpectating = false;
    this.spectatorMode = 'follow'; // follow, free, overview, cinematic
    this.targetPlayerId = null;
    this.spectatorCount = 0;
    
    // Camera system
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1.0,
      targetZoom: 1.0,
      rotation: 0,
      smoothing: 0.1,
      bounds: { minX: 0, minY: 0, maxX: 1920, maxY: 1080 }
    };
    
    // Player tracking
    this.trackedPlayers = new Map();
    this.playerStates = new Map();
    this.playerColors = new Map();
    
    // Spectator UI
    this.ui = {
      playerList: null,
      cameraControls: null,
      spectatorHUD: null,
      minimap: null
    };
    
    // Recording and replay
    this.isRecording = false;
    this.recordedFrames = [];
    this.replayMode = false;
    this.replayFrame = 0;
    
    // Performance tracking
    this.performance = {
      frameTime: 0,
      networkLatency: 0,
      updateRate: 60
    };
    
    // Spectator settings
    this.settings = {
      autoFollow: true,
      showUI: true,
      showPlayerNames: true,
      showHealthBars: true,
      showMinimap: true,
      cameraSmoothing: 0.1,
      zoomSensitivity: 0.1,
      panSensitivity: 1.0
    };
    
    this.init();
  }
  
  /**
   * Initialize spectator system
   */
  init() {
    this.setupEventListeners();
    this.createSpectatorUI();
    this.initializeCamera();
    this.assignPlayerColors();
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Room events
    window.addEventListener('playerJoined', (event) => {
      this.handlePlayerJoined(event.detail);
    });
    
    window.addEventListener('playerLeft', (event) => {
      this.handlePlayerLeft(event.detail);
    });
    
    window.addEventListener('playerStateUpdate', (event) => {
      this.handlePlayerStateUpdate(event.detail);
    });
    
    // Spectator controls
    window.addEventListener('keydown', (event) => {
      if (this.isSpectating) {
        this.handleSpectatorInput(event);
      }
    });
    
    window.addEventListener('wheel', (event) => {
      if (this.isSpectating) {
        this.handleZoom(event);
      }
    });
    
    // Mouse controls for free cam
    window.addEventListener('mousemove', (event) => {
      if (this.isSpectating && this.spectatorMode === 'free') {
        this.handleFreeCamMove(event);
      }
    });
    
    // Network events
    window.addEventListener('networkLatencyUpdate', (event) => {
      this.performance.networkLatency = event.detail.latency;
    });
  }
  
  /**
   * Start spectating
   */
  startSpectating(targetPlayerId = null) {
    if (this.isSpectating) {
      console.warn('Already spectating');
      return false;
    }
    
    this.isSpectating = true;
    this.targetPlayerId = targetPlayerId || this.getFirstAvailablePlayer();
    this.spectatorMode = 'follow';
    
    // Initialize camera
    this.initializeCamera();
    
    // Show spectator UI
    this.showSpectatorUI();
    
    // Notify room
    if (this.roomManager) {
      this.roomManager.sendSpectatorUpdate({
        action: 'start',
        targetPlayer: this.targetPlayerId
      });
    }
    
    console.log('👁️ Started spectating:', this.targetPlayerId);
    return true;
  }
  
  /**
   * Stop spectating
   */
  stopSpectating() {
    if (!this.isSpectating) {return;}
    
    this.isSpectating = false;
    this.targetPlayerId = null;
    
    // Hide spectator UI
    this.hideSpectatorUI();
    
    // Reset camera
    this.resetCamera();
    
    // Notify room
    if (this.roomManager) {
      this.roomManager.sendSpectatorUpdate({
        action: 'stop'
      });
    }
    
    console.log('👁️ Stopped spectating');
  }
  
  /**
   * Switch spectator target
   */
  switchTarget(playerId) {
    if (!this.isSpectating) {return false;}
    
    if (this.trackedPlayers.has(playerId)) {
      this.targetPlayerId = playerId;
      
      // Reset camera to new target
      if (this.spectatorMode === 'follow') {
        this.focusOnPlayer(playerId);
      }
      
      console.log('👁️ Switched spectator target to:', playerId);
      return true;
    }
    
    return false;
  }
  
  /**
   * Switch spectator mode
   */
  switchMode(mode) {
    const validModes = ['follow', 'free', 'overview', 'cinematic'];
    if (!validModes.includes(mode)) {
      console.warn('Invalid spectator mode:', mode);
      return false;
    }
    
    this.spectatorMode = mode;
    
    // Apply mode-specific settings
    switch (mode) {
      case 'follow':
        if (this.targetPlayerId) {
          this.focusOnPlayer(this.targetPlayerId);
        }
        break;
        
      case 'free':
        // Enable free camera controls
        this.camera.smoothing = 0.05; // More responsive
        break;
        
      case 'overview':
        this.setOverviewCamera();
        break;
        
      case 'cinematic':
        this.startCinematicMode();
        break;
    }
    
    this.updateSpectatorUI();
    console.log('👁️ Switched to spectator mode:', mode);
    return true;
  }
  
  /**
   * Update spectator system
   */
  update(deltaTime) {
    if (!this.isSpectating) {return;}
    
    const startTime = performance.now();
    
    // Update camera
    this.updateCamera(deltaTime);
    
    // Update player tracking
    this.updatePlayerTracking(deltaTime);
    
    // Update spectator UI
    this.updateSpectatorUI();
    
    // Record frame if recording
    if (this.isRecording) {
      this.recordFrame();
    }
    
    // Track performance
    this.performance.frameTime = performance.now() - startTime;
  }
  
  /**
   * Update camera based on current mode
   */
  updateCamera(deltaTime) {
    switch (this.spectatorMode) {
      case 'follow':
        this.updateFollowCamera(deltaTime);
        break;
        
      case 'free':
        this.updateFreeCamera(deltaTime);
        break;
        
      case 'overview':
        this.updateOverviewCamera(deltaTime);
        break;
        
      case 'cinematic':
        this.updateCinematicCamera(deltaTime);
        break;
    }
    
    // Apply camera smoothing
    this.applyCameraSmoothing(deltaTime);
  }
  
  /**
   * Update follow camera
   */
  updateFollowCamera(_deltaTime) {
    if (!this.targetPlayerId) {return;}
    
    const playerState = this.playerStates.get(this.targetPlayerId);
    if (!playerState) {return;}
    
    // Follow player position
    this.camera.x = playerState.x;
    this.camera.y = playerState.y;
    
    // Adjust zoom based on player state
    if (playerState.inCombat) {
      this.camera.targetZoom = 1.2; // Zoom in during combat
    } else {
      this.camera.targetZoom = 1.0;
    }
  }
  
  /**
   * Update free camera
   */
  updateFreeCamera(_deltaTime) {
    // Free camera movement is handled by input events
    // Just apply bounds checking here
    this.camera.x = Math.max(this.camera.bounds.minX, 
      Math.min(this.camera.bounds.maxX, this.camera.x));
    this.camera.y = Math.max(this.camera.bounds.minY, 
      Math.min(this.camera.bounds.maxY, this.camera.y));
  }
  
  /**
   * Update overview camera
   */
  updateOverviewCamera(_deltaTime) {
    // Calculate center point of all players
    const players = Array.from(this.playerStates.values());
    if (players.length === 0) {return;}
    
    let centerX = 0; let centerY = 0;
    let minX = Infinity; let maxX = -Infinity;
    let minY = Infinity; let maxY = -Infinity;
    
    players.forEach(player => {
      centerX += player.x;
      centerY += player.y;
      minX = Math.min(minX, player.x);
      maxX = Math.max(maxX, player.x);
      minY = Math.min(minY, player.y);
      maxY = Math.max(maxY, player.y);
    });
    
    centerX /= players.length;
    centerY /= players.length;
    
    // Position camera at center
    this.camera.x = centerX;
    this.camera.y = centerY;
    
    // Adjust zoom to fit all players
    const width = maxX - minX;
    const height = maxY - minY;
    const maxDimension = Math.max(width, height);
    this.camera.targetZoom = maxDimension > 0 ? Math.min(1.0, 800 / maxDimension) : 1.0;
  }
  
  /**
   * Update cinematic camera
   */
  updateCinematicCamera(_deltaTime) {
    // Implement cinematic camera movements
    const time = performance.now() * 0.001; // Convert to seconds
    
    // Smooth orbital movement around the action
    if (this.targetPlayerId) {
      const playerState = this.playerStates.get(this.targetPlayerId);
      if (playerState) {
        const radius = 200;
        const speed = 0.5;
        
        this.camera.x = playerState.x + Math.cos(time * speed) * radius;
        this.camera.y = playerState.y + Math.sin(time * speed) * radius;
        this.camera.rotation = time * speed + Math.PI / 2;
      }
    }
  }
  
  /**
   * Apply camera smoothing
   */
  applyCameraSmoothing(_deltaTime) {
    // Smooth zoom
    const zoomDiff = this.camera.targetZoom - this.camera.zoom;
    this.camera.zoom += zoomDiff * this.settings.cameraSmoothing;
    
    // Apply to visual effects manager
    if (this.visualEffectsManager) {
      this.visualEffectsManager.setCameraTarget(
        this.camera.x,
        this.camera.y,
        this.camera.zoom,
        this.camera.rotation
      );
    }
  }
  
  /**
   * Handle spectator input
   */
  handleSpectatorInput(event) {
    switch (event.code) {
      case 'Tab':
        event.preventDefault();
        this.switchToNextPlayer();
        break;
        
      case 'Digit1':
        this.switchMode('follow');
        break;
        
      case 'Digit2':
        this.switchMode('free');
        break;
        
      case 'Digit3':
        this.switchMode('overview');
        break;
        
      case 'Digit4':
        this.switchMode('cinematic');
        break;
        
      case 'KeyR':
        this.toggleRecording();
        break;
        
      case 'KeyH':
        this.toggleUI();
        break;
        
      // Free cam controls
      case 'ArrowUp':
      case 'KeyW':
        if (this.spectatorMode === 'free') {
          this.camera.y -= 10 * this.settings.panSensitivity;
        }
        break;
        
      case 'ArrowDown':
      case 'KeyS':
        if (this.spectatorMode === 'free') {
          this.camera.y += 10 * this.settings.panSensitivity;
        }
        break;
        
      case 'ArrowLeft':
      case 'KeyA':
        if (this.spectatorMode === 'free') {
          this.camera.x -= 10 * this.settings.panSensitivity;
        }
        break;
        
      case 'ArrowRight':
      case 'KeyD':
        if (this.spectatorMode === 'free') {
          this.camera.x += 10 * this.settings.panSensitivity;
        }
        break;
    }
  }
  
  /**
   * Handle zoom input
   */
  handleZoom(event) {
    event.preventDefault();
    
    const zoomDelta = event.deltaY > 0 ? -0.1 : 0.1;
    this.camera.targetZoom = Math.max(0.1, Math.min(3.0, 
      this.camera.targetZoom + zoomDelta * this.settings.zoomSensitivity));
  }
  
  /**
   * Handle free cam mouse movement
   */
  handleFreeCamMove(event) {
    if (event.buttons === 1) { // Left mouse button
      this.camera.x -= event.movementX * this.settings.panSensitivity;
      this.camera.y -= event.movementY * this.settings.panSensitivity;
    }
  }
  
  /**
   * Switch to next available player
   */
  switchToNextPlayer() {
    const playerIds = Array.from(this.trackedPlayers.keys());
    if (playerIds.length === 0) {return;}
    
    const currentIndex = playerIds.indexOf(this.targetPlayerId);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    this.switchTarget(playerIds[nextIndex]);
  }
  
  /**
   * Focus camera on specific player
   */
  focusOnPlayer(playerId) {
    const playerState = this.playerStates.get(playerId);
    if (playerState) {
      this.camera.x = playerState.x;
      this.camera.y = playerState.y;
      this.camera.targetZoom = 1.0;
    }
  }
  
  /**
   * Set overview camera position
   */
  setOverviewCamera() {
    this.camera.x = this.camera.bounds.maxX / 2;
    this.camera.y = this.camera.bounds.maxY / 2;
    this.camera.targetZoom = 0.5;
    this.camera.rotation = 0;
  }
  
  /**
   * Start cinematic mode
   */
  startCinematicMode() {
    this.camera.targetZoom = 0.8;
    this.camera.rotation = 0;
  }
  
  /**
   * Handle player joined event
   */
  handlePlayerJoined(playerData) {
    const { playerId, playerName } = playerData;
    
    this.trackedPlayers.set(playerId, {
      id: playerId,
      name: playerName,
      color: this.assignPlayerColor(playerId),
      isSpectating: false
    });
    
    // If no target set and auto-follow enabled, target this player
    if (!this.targetPlayerId && this.settings.autoFollow) {
      this.targetPlayerId = playerId;
    }
    
    this.updatePlayerList();
  }
  
  /**
   * Handle player left event
   */
  handlePlayerLeft(playerData) {
    const { playerId } = playerData;
    
    this.trackedPlayers.delete(playerId);
    this.playerStates.delete(playerId);
    this.playerColors.delete(playerId);
    
    // Switch target if current target left
    if (this.targetPlayerId === playerId) {
      this.targetPlayerId = this.getFirstAvailablePlayer();
    }
    
    this.updatePlayerList();
  }
  
  /**
   * Handle player state update
   */
  handlePlayerStateUpdate(stateData) {
    const { playerId, state } = stateData;
    
    this.playerStates.set(playerId, {
      ...state,
      lastUpdate: performance.now()
    });
    
    // Update spectator count if this is spectator data
    if (typeof state.isSpectating !== "undefined") {
      this.updateSpectatorCount();
    }
  }
  
  /**
   * Update player tracking
   */
  updatePlayerTracking(_deltaTime) {
    const now = performance.now();
    
    // Remove stale player states (no update for 5 seconds)
    this.playerStates.forEach((state, playerId) => {
      if (now - state.lastUpdate > 5000) {
        this.playerStates.delete(playerId);
      }
    });
  }
  
  /**
   * Assign unique color to player
   */
  assignPlayerColor(playerId) {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
    ];
    
    const colorIndex = Array.from(this.trackedPlayers.keys()).length % colors.length;
    const color = colors[colorIndex];
    this.playerColors.set(playerId, color);
    return color;
  }
  
  /**
   * Assign colors to all players
   */
  assignPlayerColors() {
    this.trackedPlayers.forEach((player, playerId) => {
      if (!this.playerColors.has(playerId)) {
        this.assignPlayerColor(playerId);
      }
    });
  }
  
  /**
   * Get first available player
   */
  getFirstAvailablePlayer() {
    const playerIds = Array.from(this.trackedPlayers.keys());
    return playerIds.length > 0 ? playerIds[0] : null;
  }
  
  /**
   * Update spectator count
   */
  updateSpectatorCount() {
    this.spectatorCount = Array.from(this.playerStates.values())
      .filter(state => state.isSpectating).length;
  }
  
  /**
   * Create spectator UI
   */
  createSpectatorUI() {
    // Create spectator HUD
    this.ui.spectatorHUD = document.createElement('div');
    this.ui.spectatorHUD.className = 'spectator-hud';
    this.ui.spectatorHUD.innerHTML = `
      <div class="spectator-info">
        <span class="spectator-label">👁️ SPECTATING</span>
        <span class="spectator-target" id="spectator-target">-</span>
        <span class="spectator-mode" id="spectator-mode">Follow</span>
      </div>
      
      <div class="spectator-controls">
        <div class="control-group">
          <span class="control-label">Camera:</span>
          <button class="control-btn" data-mode="follow">Follow</button>
          <button class="control-btn" data-mode="free">Free</button>
          <button class="control-btn" data-mode="overview">Overview</button>
          <button class="control-btn" data-mode="cinematic">Cinematic</button>
        </div>
        
        <div class="control-group">
          <span class="control-label">Actions:</span>
          <button class="control-btn" id="record-btn">Record</button>
          <button class="control-btn" id="toggle-ui-btn">Hide UI</button>
        </div>
      </div>
    `;
    
    // Create player list
    this.ui.playerList = document.createElement('div');
    this.ui.playerList.className = 'spectator-player-list';
    
    // Create minimap
    this.ui.minimap = document.createElement('div');
    this.ui.minimap.className = 'spectator-minimap';
    this.ui.minimap.innerHTML = `
      <canvas id="minimap-canvas" width="200" height="150"></canvas>
    `;
    
    // Add event listeners
    this.setupUIEventListeners();
  }
  
  /**
   * Setup UI event listeners
   */
  setupUIEventListeners() {
    // Camera mode buttons
    this.ui.spectatorHUD.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchMode(btn.dataset.mode);
      });
    });
    
    // Record button
    const recordBtn = this.ui.spectatorHUD.querySelector('#record-btn');
    recordBtn?.addEventListener('click', () => {
      this.toggleRecording();
    });
    
    // Toggle UI button
    const toggleUIBtn = this.ui.spectatorHUD.querySelector('#toggle-ui-btn');
    toggleUIBtn?.addEventListener('click', () => {
      this.toggleUI();
    });
  }
  
  /**
   * Show spectator UI
   */
  showSpectatorUI() {
    if (!this.settings.showUI) {return;}
    
    document.body.appendChild(this.ui.spectatorHUD);
    document.body.appendChild(this.ui.playerList);
    
    if (this.settings.showMinimap) {
      document.body.appendChild(this.ui.minimap);
    }
    
    this.updateSpectatorUI();
  }
  
  /**
   * Hide spectator UI
   */
  hideSpectatorUI() {
    this.ui.spectatorHUD.remove();
    this.ui.playerList.remove();
    this.ui.minimap.remove();
  }
  
  /**
   * Update spectator UI
   */
  updateSpectatorUI() {
    if (!this.isSpectating || !this.settings.showUI) {return;}
    
    // Update target display
    const targetElement = this.ui.spectatorHUD.querySelector('#spectator-target');
    if (targetElement) {
      const targetPlayer = this.trackedPlayers.get(this.targetPlayerId);
      targetElement.textContent = targetPlayer ? targetPlayer.name : 'None';
    }
    
    // Update mode display
    const modeElement = this.ui.spectatorHUD.querySelector('#spectator-mode');
    if (modeElement) {
      modeElement.textContent = this.spectatorMode.charAt(0).toUpperCase() + this.spectatorMode.slice(1);
    }
    
    // Update active mode button
    this.ui.spectatorHUD.querySelectorAll('[data-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === this.spectatorMode);
    });
    
    // Update recording button
    const recordBtn = this.ui.spectatorHUD.querySelector('#record-btn');
    if (recordBtn) {
      recordBtn.textContent = this.isRecording ? 'Stop Recording' : 'Record';
      recordBtn.classList.toggle('recording', this.isRecording);
    }
    
    // Update player list
    this.updatePlayerList();
    
    // Update minimap
    if (this.settings.showMinimap) {
      this.updateMinimap();
    }
  }
  
  /**
   * Update player list UI
   */
  updatePlayerList() {
    if (!this.ui.playerList) {return;}
    
    const playerHTML = Array.from(this.trackedPlayers.entries()).map(([playerId, player]) => {
      const state = this.playerStates.get(playerId);
      const isTarget = playerId === this.targetPlayerId;
      const isOnline = state && (performance.now() - state.lastUpdate) < 5000;
      
      return `
        <div class="player-item ${isTarget ? 'target' : ''} ${isOnline ? 'online' : 'offline'}" 
             data-player-id="${playerId}">
          <div class="player-color" style="background-color: ${player.color}"></div>
          <span class="player-name">${player.name}</span>
          <div class="player-stats">
            ${state ? `
              <span class="player-health">❤️ ${Math.round(state.health || 0)}</span>
              <span class="player-score">🏆 ${state.score || 0}</span>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
    
    this.ui.playerList.innerHTML = `
      <div class="player-list-header">
        <span>Players (${this.trackedPlayers.size})</span>
        <span class="spectator-count">👁️ ${this.spectatorCount}</span>
      </div>
      <div class="player-list-content">
        ${playerHTML}
      </div>
    `;
    
    // Add click handlers for player switching
    this.ui.playerList.querySelectorAll('.player-item').forEach(item => {
      item.addEventListener('click', () => {
        this.switchTarget(item.dataset.playerId);
      });
    });
  }
  
  /**
   * Update minimap
   */
  updateMinimap() {
    const canvas = this.ui.minimap.querySelector('#minimap-canvas');
    if (!canvas) {return;}
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw players
    this.playerStates.forEach((state, playerId) => {
      const player = this.trackedPlayers.get(playerId);
      if (!player) {return;}
      
      // Convert world coordinates to minimap coordinates
      const x = (state.x / this.camera.bounds.maxX) * width;
      const y = (state.y / this.camera.bounds.maxY) * height;
      
      // Draw player dot
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Highlight target player
      if (playerId === this.targetPlayerId) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    
    // Draw camera view
    const cameraX = (this.camera.x / this.camera.bounds.maxX) * width;
    const cameraY = (this.camera.y / this.camera.bounds.maxY) * height;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(
      cameraX - 20 / this.camera.zoom,
      cameraY - 15 / this.camera.zoom,
      40 / this.camera.zoom,
      30 / this.camera.zoom
    );
    ctx.setLineDash([]);
  }
  
  /**
   * Toggle recording
   */
  toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }
  
  /**
   * Start recording spectator session
   */
  startRecording() {
    this.isRecording = true;
    this.recordedFrames = [];
    console.log('🎬 Started spectator recording');
  }
  
  /**
   * Stop recording spectator session
   */
  stopRecording() {
    this.isRecording = false;
    
    // Save recording
    const recording = {
      timestamp: Date.now(),
      duration: this.recordedFrames.length / 60, // Assuming 60 FPS
      frames: this.recordedFrames,
      players: Object.fromEntries(this.trackedPlayers)
    };
    
    // Store in localStorage or send to server
    this.saveRecording(recording);
    
    console.log('🎬 Stopped spectator recording', {
      frames: this.recordedFrames.length,
      duration: recording.duration
    });
  }
  
  /**
   * Record current frame
   */
  recordFrame() {
    const frame = {
      timestamp: performance.now(),
      camera: { ...this.camera },
      players: Object.fromEntries(this.playerStates),
      mode: this.spectatorMode,
      target: this.targetPlayerId
    };
    
    this.recordedFrames.push(frame);
  }
  
  /**
   * Save recording to storage
   */
  saveRecording(recording) {
    try {
      const recordings = JSON.parse(localStorage.getItem('spectatorRecordings') || '[]');
      recordings.push(recording);
      
      // Keep only last 10 recordings
      if (recordings.length > 10) {
        recordings.splice(0, recordings.length - 10);
      }
      
      localStorage.setItem('spectatorRecordings', JSON.stringify(recordings));
    } catch (error) {
      console.error('Failed to save spectator recording:', error);
    }
  }
  
  /**
   * Toggle UI visibility
   */
  toggleUI() {
    this.settings.showUI = !this.settings.showUI;
    
    if (this.settings.showUI) {
      this.showSpectatorUI();
    } else {
      this.hideSpectatorUI();
    }
  }
  
  /**
   * Initialize camera
   */
  initializeCamera() {
    this.camera.x = this.camera.bounds.maxX / 2;
    this.camera.y = this.camera.bounds.maxY / 2;
    this.camera.zoom = 1.0;
    this.camera.targetZoom = 1.0;
    this.camera.rotation = 0;
  }
  
  /**
   * Reset camera
   */
  resetCamera() {
    if (this.visualEffectsManager) {
      this.visualEffectsManager.setCameraTarget(0, 0, 1, 0);
    }
  }
  
  /**
   * Get spectator statistics
   */
  getSpectatorStats() {
    return {
      isSpectating: this.isSpectating,
      spectatorMode: this.spectatorMode,
      targetPlayer: this.targetPlayerId,
      trackedPlayers: this.trackedPlayers.size,
      spectatorCount: this.spectatorCount,
      performance: this.performance,
      isRecording: this.isRecording,
      recordedFrames: this.recordedFrames.length
    };
  }
  
  /**
   * Update spectator settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    
    // Apply settings immediately
    this.camera.smoothing = this.settings.cameraSmoothing;
    
    if (this.isSpectating) {
      this.updateSpectatorUI();
    }
  }
  
  /**
   * Cleanup spectator system
   */
  destroy() {
    this.stopSpectating();
    this.hideSpectatorUI();
    
    // Clear data
    this.trackedPlayers.clear();
    this.playerStates.clear();
    this.playerColors.clear();
    this.recordedFrames = [];
  }
}
