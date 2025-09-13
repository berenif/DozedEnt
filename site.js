/**
 * Main Game Application - Refactored version using modular architecture
 * Follows WASM-first principles from AGENTS.MD guidelines
 */

// Core imports
import { setGlobalSeed } from './src/utils/rng.js'
import GameRenderer from './src/utils/game-renderer.js'
import CameraEffects from './src/utils/camera-effects.js'
import { WolfCharacter } from './src/gameentity/wolf-character.js'
import { EnhancedWolfAISystem } from './src/ai/wolf-ai.js'
import AnimatedPlayer from './src/animation/player-animator.js'

// New modular imports
import { WasmManager } from './src/wasm/wasm-manager.js'
import { RoomManager } from './src/lobby/room-manager.js'
import { AudioManager } from './src/audio/audio-manager.js'
import { GameStateManager } from './src/game/game-state-manager.js'
import { UIEventHandlers } from './src/ui/ui-event-handlers.js'
import { RoguelikeHUD } from './src/ui/roguelike-hud.js'
import { CombatFeedback } from './src/ui/combat-feedback.js'
import { InputManager } from './src/input/input-manager.js'
import { EnhancedMobileControls } from './src/input/mobile-controls.js'

/**
 * Main Game Application Class
 * Centralizes all game systems and manages their lifecycle
 */
class GameApplication {
  constructor() {
    // Core constants
    this.BiomeType = {
      Forest: 0,
      Swamp: 1,
      Mountains: 2,
      Plains: 3
    };

    this.VIRTUAL_WIDTH = 1280;
    this.VIRTUAL_HEIGHT = 720;
    this.WORLD_WIDTH = 3840;  // 3x viewport width
    this.WORLD_HEIGHT = 2160; // 3x viewport height

    // System managers
    this.wasmManager = new WasmManager();
    this.roomManager = new RoomManager();
    this.audioManager = new AudioManager();
    this.gameStateManager = new GameStateManager();
    this.inputManager = null;
    this.enhancedMobileControls = null;
    this.uiEventHandlers = null;
    this.roguelikeHUD = null;
    this.combatFeedback = null;

    // Game systems
    this.gameRenderer = null;
    this.cameraEffects = null;
    this.wolfAISystem = null;
    this.animatedPlayer = null;
    this.wolfCharacters = [];

    // DOM elements
    this.canvas = null;
    this.gameCanvas = null;

    // Game loop
    this.lastFrameTime = 0;
    this.animationFrameId = null;
    this.isInitialized = false;
  }

  /**
   * Initialize WASM-based environment system
   * @private
   */
  initializeWasmEnvironment() {
    if (!this.wasmManager || !this.wasmManager.module || !this.gameRenderer) {
      console.warn('WASM module or game renderer not ready for environment initialization');
      return;
    }

    try {
      // Generate environment in WASM for the initial biome, seeded from current run seed for determinism
      const runSeedBig = this.wasmManager.getRunSeed?.() ?? 0n;
      const envSeed = Number(runSeedBig % 2147483647n);
      this.gameRenderer.generateEnvironmentInWasm(
        this.wasmManager.module, 
        this.initialBiome, 
        envSeed
      );
      
      console.log('Successfully initialized WASM-based environment system');
    } catch (error) {
      console.error('Failed to initialize WASM environment:', error);
    }
  }

  /**
   * Change biome and regenerate environment
   * @param {number} biomeType - The biome type to switch to
   * @param {number} seed - Optional seed for deterministic generation
   */
  changeBiome(biomeType, seed = null) {
    if (!this.gameRenderer) return;
    
    const runSeedBig = this.wasmManager?.getRunSeed?.() ?? 0n;
    const fallbackSeed = Number(runSeedBig % 2147483647n);
    this.gameRenderer.changeBiome(
      biomeType, 
      this.wasmManager?.module,
      seed ?? fallbackSeed
    );
    
    // Update any game state related to biome change
    this.gameStateManager.updateBiome(biomeType);
  }

  /**
   * Initialize the game application
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      console.log('🔧 Initializing game application...');

      // Initialize DOM elements
      console.log('📋 Initializing DOM elements...');
      this.initializeDOM();
      console.log('✅ DOM elements initialized');

      // Initialize WASM first (core requirement)
      console.log('🔧 Initializing WASM manager...');
      const wasmSuccess = await this.wasmManager.initialize();
      if (!wasmSuccess) {
        console.warn('⚠️ WASM initialization failed - running in fallback mode');
      } else {
        console.log('✅ WASM initialized successfully');
        
        // Initialize WASM-based environment system now that WASM is ready
        this.initializeWasmEnvironment();

        // Seed deterministic visual RNG from the current run seed
        try {
          const seed = this.wasmManager.getRunSeed?.();
          if (seed !== undefined && seed !== null) {
            setGlobalSeed(seed);
          }
        } catch (e) {
          console.warn('Failed to seed visual RNG:', e);
        }
      }

      // Initialize game systems
      console.log('🔧 Initializing game systems...');
      this.initializeGameSystems();
      console.log('✅ Game systems initialized');

      // Initialize audio system
      console.log('🔧 Initializing audio system...');
      this.audioManager.setupEventListeners();
      console.log('✅ Audio system initialized');

      // Initialize UI event handlers
      console.log('🔧 Initializing UI event handlers...');
      this.uiEventHandlers = new UIEventHandlers(
        this.gameStateManager,
        this.roomManager,
        this.audioManager
      );
      console.log('✅ UI event handlers initialized');

      // Initialize Combat Feedback
      console.log('🔧 Initializing Combat Feedback...');
      this.combatFeedback = new CombatFeedback();
      console.log('✅ Combat Feedback initialized');

      // Initialize Roguelike HUD
      console.log('🔧 Initializing Roguelike HUD...');
      this.roguelikeHUD = new RoguelikeHUD(this.gameStateManager, this.wasmManager, this.combatFeedback);
      console.log('✅ Roguelike HUD initialized');

      // Initialize game state with WASM
      console.log('🔧 Initializing game state manager...');
      this.gameStateManager.initialize(this.wasmManager);
      console.log('✅ Game state manager initialized');

      // Initialize input manager
      console.log('🔧 Initializing input manager...');
      this.inputManager = new InputManager(this.wasmManager);
      console.log('✅ Input manager initialized');

      // Initialize enhanced mobile controls
      console.log('🔧 Initializing enhanced mobile controls...');
      this.enhancedMobileControls = new EnhancedMobileControls(this.gameStateManager);
      console.log('✅ Enhanced mobile controls initialized');

      // Setup event listeners
      console.log('🔧 Setting up event listeners...');
      this.setupEventListeners();
      console.log('✅ Event listeners setup complete');

      // Update UI to reflect initialization status
      console.log('🔧 Updating initialization UI...');
      this.updateInitializationUI(wasmSuccess);
      console.log('✅ Initialization UI updated');

      this.isInitialized = true;
      console.log('🎉 Game application initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize game application:', error);
      console.error('📋 Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      this.handleInitializationError(error);
      return false;
    }
  }

  /**
   * Initialize DOM elements
   * @private
   */
  initializeDOM() {
    this.canvas = document.getElementById('canvas');
    this.gameCanvas = document.getElementById('gameCanvas');

    if (!this.gameCanvas) {
      throw new Error('Game canvas not found');
    }
  }

  /**
   * Initialize game systems
   * @private
   */
  initializeGameSystems() {
    if (!this.gameCanvas) return;

    const ctx = this.gameCanvas.getContext('2d');
    this.gameCanvas.width = this.VIRTUAL_WIDTH;
    this.gameCanvas.height = this.VIRTUAL_HEIGHT;

    // Initialize renderer
    this.gameRenderer = new GameRenderer(ctx, this.gameCanvas, this.BiomeType.Forest);
    this.gameRenderer.useExternalPlayer = true;
    
    // Store reference for later WASM integration
    this.initialBiome = this.BiomeType.Forest;

    // Initialize camera effects
    this.cameraEffects = new CameraEffects(this.gameCanvas);

    // Initialize wolf AI system
    this.wolfAISystem = new EnhancedWolfAISystem(null);

    // Initialize animated player
    const worldCenterX = this.WORLD_WIDTH / 2;
    const worldCenterY = this.WORLD_HEIGHT / 2;
    this.animatedPlayer = new AnimatedPlayer(worldCenterX, worldCenterY, {
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      speed: 250,
      rollSpeed: 500,
      attackDamage: 20,
      attackRange: 60,
      particleSystem: null,
      soundSystem: null
    });

    // Set wolf AI system in game state
    this.gameStateManager.setWolfAISystem(this.wolfAISystem);

    // Make systems globally accessible for debugging
    window.gameRenderer = this.gameRenderer;
    window.cameraEffects = this.cameraEffects;
    window.wolfAISystem = this.wolfAISystem;
    window.roomManager = this.roomManager;
    window.animatedPlayer = this.animatedPlayer;
    window.wasmManager = this.wasmManager;
    window.gameStateManager = this.gameStateManager;
  }

  /**
   * Setup event listeners
   * @private
   */
  setupEventListeners() {
    // Start button click handler
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
      startGameBtn.addEventListener('click', () => {
        this.handleStartButtonClick();
      });
    }

    // Mobile overlay start button
    const overlayStartBtn = document.getElementById('overlay-start');
    if (overlayStartBtn) {
      overlayStartBtn.addEventListener('click', () => {
        this.handleOrientationOverlayStart();
      });
    }

    // Game state event listeners
    this.gameStateManager.on('gameStarted', () => {
      this.startGameLoop();
    });

    this.gameStateManager.on('gameStopped', () => {
      this.stopGameLoop();
    });

    this.gameStateManager.on('gamePaused', () => {
      this.pauseGameLoop();
    });

    this.gameStateManager.on('gameResumed', () => {
      this.resumeGameLoop();
    });

    // Phase change event listener
    this.gameStateManager.on('phaseChanged', (phase) => {
      this.handlePhaseChange(phase);
    });

    // Room manager event listeners
    this.roomManager.on('roomCreated', (room) => {
      this.updateRoomsList();
    });

    this.roomManager.on('roomJoined', (room) => {
      this.showRoomInfo(room);
    });

    this.roomManager.on('chatMessage', (message) => {
      this.displayChatMessage(message);
    });

    // Setup phase overlay event listeners
    this.setupPhaseOverlayEvents();

    // Audio manager is initialized via setupEventListeners() call
    // No event listeners needed as AudioManager handles initialization internally

    // Handle orientation changes on mobile
    window.addEventListener('orientationchange', () => {
      this.handleOrientationChange();
    });

    // Also listen for resize events as a fallback
    window.addEventListener('resize', () => {
      // Only handle resize for mobile devices
      if (this.detectMobileDevice()) {
        this.handleOrientationChange();
      }
    });
  }

  /**
   * Handle device orientation change
   * @private
   */
  handleOrientationChange() {
    if (!this.detectMobileDevice()) return;

    const orientationOverlay = document.getElementById('orientation-overlay');
    if (!orientationOverlay) return;

    const isPortrait = window.innerHeight > window.innerWidth;
    
    if (isPortrait && this.gameStateManager?.isGameRunning) {
      console.log('📱 Device rotated to portrait - showing rotation prompt');
      orientationOverlay.style.display = 'flex';
    } else if (!isPortrait) {
      console.log('📱 Device rotated to landscape - hiding overlay');
      orientationOverlay.style.display = 'none';
    }
  }

  /**
   * Update initialization UI
   * @param {boolean} wasmSuccess - WASM initialization success
   * @private
   */
  updateInitializationUI(wasmSuccess) {
    console.log('🔧 Updating initialization UI with WASM success:', wasmSuccess);
    
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
      console.log('✅ Start button found, enabling...');
      startGameBtn.disabled = false;
      startGameBtn.textContent = wasmSuccess ? 'Start Game' : 'Start (UI Only)';
      startGameBtn.style.background = wasmSuccess ? '#4a90e2' : '#ff6b6b';
      startGameBtn.style.cursor = 'pointer';
      
      // Ensure click handler is attached (defensive programming)
      const existingHandler = startGameBtn.onclick;
      if (!existingHandler) {
        console.log('⚠️ No click handler found, adding fallback...');
        startGameBtn.addEventListener('click', () => {
          console.log('🎮 Fallback click handler triggered');
          this.handleStartButtonClick();
        });
      }
    } else {
      console.error('❌ Start button not found in DOM');
    }

    const loadingText = document.querySelector('.loading-text');
    if (loadingText) {
      if (loadingText.textContent.includes('Initializing WASM game engine')) {
        loadingText.textContent = wasmSuccess ? 'WASM game engine ready!' : 'WASM failed to load - running in fallback mode';
      }
    } else {
      console.warn('⚠️ Loading text element not found');
    }
  }

  /**
   * Handle initialization error
   * @param {Error} error - Initialization error
   * @private
   */
  handleInitializationError(error) {
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
      startGameBtn.disabled = false;
      startGameBtn.textContent = 'Start Game (Error)';
      startGameBtn.style.background = '#ff6b6b';
      startGameBtn.style.cursor = 'pointer';
    }

    const loadingText = document.querySelector('.loading-text');
    if (loadingText) {
      loadingText.textContent = `Initialization failed: ${error.message}`;
    }
  }

  /**
   * Handle start button click from loading screen
   * @private
   */
  handleStartButtonClick() {
    console.log('🎮 Start button clicked - launching game');
    console.log('📊 Game state:', {
      isInitialized: this.isInitialized,
      wasmLoaded: this.wasmManager?.isLoaded,
      gameRunning: this.gameStateManager?.isGameRunning
    });
    
    if (!this.isInitialized) {
      console.error('❌ Game not initialized - cannot start');
      alert('Game is not initialized yet. Check the browser console for errors.');
      return;
    }

    console.log('✅ Game is initialized, proceeding with startup...');

    // Check if we're on desktop or mobile
    const isDesktop = !this.detectMobileDevice();
    console.log(`📱 Device type: ${isDesktop ? 'Desktop' : 'Mobile'}`);

    // Hide loading screen
    console.log('🔧 Hiding loading screen...');
    this.hideLoadingScreen();

    // Show main menu for mode selection
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) {
      mainMenu.classList.remove('hidden');

      const launch = () => {
        if (isDesktop) {
          console.log('🖥️ Desktop detected - starting game directly');
          this.startGame();
        } else {
          console.log('📱 Mobile detected - checking orientation');
          this.checkOrientationAndStart();
        }
      };

      document.getElementById('menu-new-game')?.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        launch();
      });

      document.getElementById('menu-continue')?.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        launch();
        this.gameStateManager?.showPersistenceUI('saves');
      });

      document.getElementById('menu-join-online')?.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        launch();
        window.toggleLobby();
      });
    } else {
      // Fallback: start game immediately
      if (isDesktop) {
        console.log('🖥️ Desktop detected - starting game directly');
        this.startGame();
      } else {
        console.log('📱 Mobile detected - checking orientation');
        this.checkOrientationAndStart();
      }
    }
  }

  /**
   * Detect if running on mobile device
   * @returns {boolean} True if mobile device
   * @private
   */
  detectMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase()) ||
                     (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    return isMobile;
  }

  /**
   * Check orientation and start game on mobile
   * @private
   */
  checkOrientationAndStart() {
    const orientationOverlay = document.getElementById('orientation-overlay');
    if (!orientationOverlay) {
      console.log('⚠️ Orientation overlay not found - starting game directly');
      this.startGame();
      return;
    }

    const isPortrait = window.innerHeight > window.innerWidth;
    
    if (isPortrait) {
      console.log('📱 Portrait orientation detected - showing rotation prompt');
      orientationOverlay.style.display = 'flex';
    } else {
      console.log('📱 Landscape orientation detected - starting game');
      orientationOverlay.style.display = 'none';
      this.startGame();
    }
  }

  /**
   * Handle orientation overlay start button click
   * @private
   */
  handleOrientationOverlayStart() {
    console.log('📱 Orientation overlay start button clicked');
    const orientationOverlay = document.getElementById('orientation-overlay');
    if (orientationOverlay) {
      orientationOverlay.style.display = 'none';
    }
    this.startGame();
  }

  /**
   * Hide the loading screen and show game UI
   * @private
   */
  hideLoadingScreen() {
    // Add class to body to trigger CSS transitions
    document.body.classList.add('game-started');
    console.log('Loading screen hidden, game UI shown');
  }

  /**
   * Start the game
   */
  startGame() {
    if (!this.isInitialized) {
      console.error('Game not initialized');
      return;
    }

    console.log('🎮 Starting game with WASM-first architecture');
    
    // Verify WASM is ready
    if (!this.wasmManager.isLoaded) {
      console.error('❌ WASM not loaded - cannot start deterministic gameplay');
      return;
    } else {
      console.log('✅ WASM engine ready, starting deterministic gameplay');
    }

    // Start game state manager
    this.gameStateManager.startGame();
    
    // Initialize game world
    this.initializeGameWorld();
  }

  /**
   * Initialize the game world
   * @private
   */
  initializeGameWorld() {
    console.log('🌍 Initializing game world...');
    
    try {
      // Spawn player at world center
      this.spawnPlayer();
      
      // Spawn initial enemies
      this.spawnWolves();
      
      // Initialize world state
      if (this.wasmManager.isLoaded) {
        const currentPhase = this.wasmManager.getPhase();
        console.log(`🎯 Game started in phase: ${this.getPhaseNameById(currentPhase)}`);
      }
      
      console.log('✅ Game world initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize game world:', error);
    }
  }

  /**
   * Get phase name by ID for logging
   * @param {number} phaseId - Phase ID
   * @returns {string} Phase name
   * @private
   */
  getPhaseNameById(phaseId) {
    const phases = [
      'Explore', 'Fight', 'Choose', 'PowerUp', 
      'Risk', 'Escalate', 'CashOut', 'Reset'
    ];
    return phases[phaseId] || `Unknown(${phaseId})`;
  }

  /**
   * Spawn player at center of world
   * @private
   */
  spawnPlayer() {
    if (!this.animatedPlayer) {
      console.error('Cannot spawn player - animatedPlayer is null');
      return;
    }

    // Get initial position from WASM if available
    if (this.wasmManager && this.wasmManager.isLoaded) {
      const wasmPos = this.wasmManager.getPlayerPosition();
      const posX = wasmPos.x * this.WORLD_WIDTH;
      const posY = wasmPos.y * this.WORLD_HEIGHT;
      
      this.animatedPlayer.x = posX;
      this.animatedPlayer.y = posY;
      console.log(`Player spawned at WASM position: (${posX.toFixed(0)}, ${posY.toFixed(0)}) from normalized (${wasmPos.x.toFixed(3)}, ${wasmPos.y.toFixed(3)})`);
    } else {
      // Fallback to center of world
      const posX = this.WORLD_WIDTH / 2;
      const posY = this.WORLD_HEIGHT / 2;
      
      this.animatedPlayer.x = posX;
      this.animatedPlayer.y = posY;
      console.log(`Player spawned at center: (${posX.toFixed(0)}, ${posY.toFixed(0)})`);
    }
  }

  /**
   * Spawn wolf characters
   * @private
   */
  spawnWolves() {
    if (!this.wolfAISystem) return;

    // Spawn wolves at various positions
    const wolfPositions = [
      { x: 1000, y: 800, role: 'Alpha' },
      { x: 1200, y: 1000, role: 'Beta' },
      { x: 800, y: 1200, role: 'Hunter' }
    ];

    wolfPositions.forEach(pos => {
      const wolf = new WolfCharacter(pos.x, pos.y, { role: pos.role });
      this.wolfCharacters.push(wolf);
      this.gameStateManager.addWolfCharacter(wolf);
    });

    console.log(`Spawned ${wolfPositions.length} wolves`);
  }

  /**
   * Start game loop
   * @private
   */
  startGameLoop() {
    if (this.animationFrameId) return;

    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  /**
   * Stop game loop
   * @private
   */
  stopGameLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Pause game loop
   * @private
   */
  pauseGameLoop() {
    this.stopGameLoop();
  }

  /**
   * Resume game loop
   * @private
   */
  resumeGameLoop() {
    this.startGameLoop();
  }

  /**
   * Main game loop
   * @private
   */
  gameLoop() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
    this.lastFrameTime = currentTime;

    try {
      // Get input state from input manager (with null check)
      const inputState = this.inputManager?.getInputState() || {};

      // Update game state
      this.gameStateManager.update(deltaTime, inputState);

      // Sync player position from WASM to animated player
      if (this.animatedPlayer && this.gameStateManager.playerState) {
        const oldX = this.animatedPlayer.x;
        const oldY = this.animatedPlayer.y;
        this.animatedPlayer.x = this.gameStateManager.playerState.position.x;
        this.animatedPlayer.y = this.gameStateManager.playerState.position.y;
        
        // Log significant movement
        const dx = this.animatedPlayer.x - oldX;
        const dy = this.animatedPlayer.y - oldY;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          console.log(`Player moved: (${oldX.toFixed(0)}, ${oldY.toFixed(0)}) -> (${this.animatedPlayer.x.toFixed(0)}, ${this.animatedPlayer.y.toFixed(0)})`);
        }
      }

      // Update wolf AI
      if (this.wolfAISystem && this.animatedPlayer) {
        this.wolfAISystem.update(deltaTime, this.animatedPlayer, this.wolfCharacters);
      }

      // Update audio visualizations
      this.audioManager.updateVocalizationVisuals();

      // Update Roguelike HUD
      if (this.roguelikeHUD) {
        this.roguelikeHUD.update();
      }

      // Update Combat Feedback
      if (this.combatFeedback) {
        this.combatFeedback.update();
      }

      // Render frame
      this.render();

      // Continue loop
      this.animationFrameId = requestAnimationFrame(() => this.gameLoop());

    } catch (error) {
      console.error('Error in game loop:', error);
      this.stopGameLoop();
    }
  }

  /**
   * Render game frame
   * @private
   */
  render() {
    if (!this.gameRenderer || !this.cameraEffects) return;

    try {
      // Clear canvas
      const ctx = this.gameRenderer.ctx;
      ctx.clearRect(0, 0, this.VIRTUAL_WIDTH, this.VIRTUAL_HEIGHT);

      // Update camera to follow player
      if (this.animatedPlayer) {
        // Update game renderer's player position for camera tracking
        this.gameRenderer.player.x = this.animatedPlayer.x;
        this.gameRenderer.player.y = this.animatedPlayer.y;
        
        // Apply camera effects to follow player
        this.cameraEffects.followTarget(this.animatedPlayer.x, this.animatedPlayer.y);
      }

      // Apply camera shake if needed
      const cameraState = this.gameStateManager.cameraState;
      this.cameraEffects.shake(cameraState.shakeStrength);

      // Render world
      this.gameRenderer.render();

      // Render wolves
      const camera = this.gameRenderer.camera;
      this.wolfCharacters.forEach(wolf => {
        wolf.render(ctx, camera);
      });

      // Render player
      if (this.animatedPlayer) {
        this.animatedPlayer.render(ctx, camera);
      }

      // Render UI overlays
      this.renderUI();

    } catch (error) {
      console.error('Error in render loop:', error);
    }
  }

  /**
   * Render UI overlays
   * @private
   */
  renderUI() {
    this.updateDebugHUD();
    this.updatePlayerHUD();
  }

  /**
   * Update debug HUD with game state information
   * @private
   */
  updateDebugHUD() {
    const debugHud = document.getElementById('debug-hud');
    if (!debugHud) return;

    const gameState = this.gameStateManager.getStateSnapshot();
    const wasmStatus = this.wasmManager.isLoaded ? '✅ WASM' : '❌ Fallback';
    
    let debugInfo = `
      <div style="background: rgba(0,0,0,0.7); color: #fff; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px;">
        <div><strong>DozedEnt Debug</strong></div>
        <div>Engine: ${wasmStatus}</div>
        <div>Running: ${gameState.isGameRunning ? '✅' : '❌'}</div>
        <div>Phase: ${this.getPhaseNameById(gameState.phaseState?.currentPhase || 0)}</div>
        <div>Wolves: ${gameState.wolfState?.characterCount || 0}</div>
    `;

    if (this.wasmManager.isLoaded && gameState.isGameRunning) {
      const playerPos = this.wasmManager.getPlayerPosition();
      const stamina = this.wasmManager.getStamina();
      debugInfo += `
        <div>Pos: (${playerPos.x.toFixed(2)}, ${playerPos.y.toFixed(2)})</div>
        <div>Stamina: ${(stamina * 100).toFixed(0)}%</div>
      `;
    }

    debugInfo += `</div>`;
    debugHud.innerHTML = debugInfo;
  }

  /**
   * Update player HUD elements
   * @private
   */
  updatePlayerHUD() {
    // Update connection status
    const connectionStatus = document.getElementById('connectionStatus');
    if (connectionStatus) {
      if (this.gameStateManager.isGameRunning) {
        connectionStatus.textContent = 'Playing';
        connectionStatus.className = 'status-connected';
      } else {
        connectionStatus.textContent = 'Ready';
        connectionStatus.className = 'status-connecting';
      }
    }

    // Update player count (for multiplayer)
    const playerCount = document.getElementById('playerCount');
    if (playerCount) {
      const count = this.roomManager.currentRoom?.players?.length || 1;
      playerCount.textContent = `Players: ${count}`;
    }
  }

  /**
   * Update rooms list display
   */
  updateRoomsList() {
    const roomsList = document.getElementById('roomsList');
    if (!roomsList) return;

    const rooms = this.roomManager.getRoomList({ hasSpace: true });

    if (rooms.length === 0) {
      roomsList.innerHTML = '<p style="color: #888;">No rooms available. Create one!</p>';
    } else {
      roomsList.innerHTML = rooms.map(room => `
        <div style="border: 1px solid #333; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
          <h4 style="margin: 0; color: #4a90e2;">${room.name}</h4>
          <p style="margin: 5px 0; color: #888;">
            ${room.players.length}/${room.maxPlayers} players | 
            Mode: ${room.gameMode} | 
            Code: ${room.code}
          </p>
          <button onclick="gameApp.joinRoom('${room.id}')" style="padding: 5px 10px; background: #4a90e2; border: none; color: white; border-radius: 3px; cursor: pointer;">Join</button>
        </div>
      `).join('');
    }
  }

  /**
   * Show room information
   * @param {Object} room - Room object
   */
  showRoomInfo(room) {
    const roomInfo = document.getElementById('roomInfo');
    if (!roomInfo) return;

    roomInfo.innerHTML = `
      <h3>Room: ${room.name}</h3>
      <p>Players: ${room.players.length}/${room.maxPlayers}</p>
      <p>Mode: ${room.gameMode}</p>
      <p>Code: ${room.code}</p>
      <button onclick="gameApp.leaveRoom()">Leave Room</button>
      <button onclick="gameApp.startRoomGame()">Start Game</button>
    `;
  }

  /**
   * Display chat message
   * @param {Object} message - Chat message object
   */
  displayChatMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const messageElement = document.createElement('div');
    messageElement.innerHTML = `
      <strong>${message.playerName}:</strong> ${message.message}
    `;
    messageElement.style.marginBottom = '5px';
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  /**
   * Join room
   * @param {string} roomId - Room ID
   */
  async joinRoom(roomId) {
    try {
      await this.roomManager.joinRoom(roomId);
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('Failed to join room: ' + error.message);
    }
  }

  /**
   * Leave current room
   */
  leaveRoom() {
    this.roomManager.leaveRoom();
    const roomInfo = document.getElementById('roomInfo');
    if (roomInfo) {
      roomInfo.innerHTML = '';
    }
  }

  /**
   * Start room game
   */
  startRoomGame() {
    const success = this.roomManager.startRoomGame();
    if (success) {
      this.startGame();
    }
  }

  /**
   * Setup phase overlay event listeners
   * @private
   */
  setupPhaseOverlayEvents() {
    // Choice phase buttons
    const choiceButtons = document.querySelectorAll('.choice-button');
    choiceButtons.forEach((button, index) => {
      button.addEventListener('click', () => {
        this.handleChoiceSelection(index);
      });
    });

    // Game over restart button
    const restartButton = document.getElementById('restart-button');
    if (restartButton) {
      restartButton.addEventListener('click', () => {
        this.handleGameRestart();
      });
    }

    // Game over rematch button
    const rematchButton = document.getElementById('rematch-button');
    if (rematchButton) {
      rematchButton.addEventListener('click', () => {
        this.handleGameRematch();
      });
    }
  }

  /**
   * Handle phase changes and show appropriate overlays
   * @param {number} phase - New phase ID
   * @private
   */
  handlePhaseChange(phase) {
    console.log(`🎯 Phase changed to: ${this.getPhaseNameById(phase)}`);
    
    // Hide all phase overlays first
    this.hideAllPhaseOverlays();
    
    // Show appropriate overlay based on phase
    switch (phase) {
      case 2: // Choose phase
        this.showChoicePhase();
        break;
      case 4: // Risk phase
        this.showRiskPhase();
        break;
      case 5: // Escalate phase
        this.showEscalatePhase();
        break;
      case 6: // CashOut phase
        this.showCashOutPhase();
        break;
      case 7: // Reset phase (Game Over)
        this.showGameOverPhase();
        break;
      default:
        // For other phases (Explore, Fight, PowerUp), no overlay needed
        break;
    }
  }

  /**
   * Hide all phase overlays
   * @private
   */
  hideAllPhaseOverlays() {
    const overlays = document.querySelectorAll('.phase-overlay');
    overlays.forEach(overlay => {
      overlay.classList.add('hidden');
    });
  }

  /**
   * Show choice phase overlay
   * @private
   */
  showChoicePhase() {
    const overlay = document.getElementById('choice-overlay');
    if (!overlay) return;

    // Update choice buttons with WASM data
    if (this.wasmManager && this.wasmManager.isLoaded) {
      const choiceCount = this.wasmManager.getChoiceCount();
      const choiceButtons = overlay.querySelectorAll('.choice-button');
      
      for (let i = 0; i < choiceButtons.length && i < choiceCount; i++) {
        const choiceId = this.wasmManager.getChoiceId(i);
        const choiceType = this.wasmManager.getChoiceType(i);
        const choiceRarity = this.wasmManager.getChoiceRarity(i);
        
        const button = choiceButtons[i];
        button.textContent = this.getChoiceDisplayName(choiceType, choiceRarity);
        button.style.display = 'block';
        button.dataset.choiceId = choiceId;
      }
      
      // Hide unused buttons
      for (let i = choiceCount; i < choiceButtons.length; i++) {
        choiceButtons[i].style.display = 'none';
      }
    }

    overlay.classList.remove('hidden');
  }

  /**
   * Show risk phase overlay
   * @private
   */
  showRiskPhase() {
    const overlay = document.getElementById('risk-overlay');
    if (!overlay || !this.wasmManager?.isLoaded) return;

    // Update risk multiplier
    const riskMult = document.getElementById('risk-mult');
    if (riskMult && typeof this.wasmManager.getRiskMultiplier === 'function') {
      riskMult.textContent = `${this.wasmManager.getRiskMultiplier().toFixed(1)}x`;
    }

    // Update curse list
    const curseList = document.getElementById('curse-list');
    if (curseList && typeof this.wasmManager.getCurseCount === 'function') {
      const curseCount = this.wasmManager.getCurseCount();
      curseList.innerHTML = '';
      
      for (let i = 0; i < curseCount; i++) {
        const curseType = this.wasmManager.getCurseType(i);
        const curseIntensity = this.wasmManager.getCurseIntensity(i);
        
        const curseItem = document.createElement('li');
        curseItem.textContent = `${this.getCurseDisplayName(curseType)} (${(curseIntensity * 100).toFixed(0)}%)`;
        curseList.appendChild(curseItem);
      }
      
      if (curseCount === 0) {
        curseList.innerHTML = '<li>No active curses</li>';
      }
    }

    overlay.classList.remove('hidden');
  }

  /**
   * Show escalate phase overlay
   * @private
   */
  showEscalatePhase() {
    const overlay = document.getElementById('escalate-overlay');
    if (!overlay || !this.wasmManager?.isLoaded) return;

    // Update escalation stats
    const escalationLvl = document.getElementById('escalation-lvl');
    if (escalationLvl && typeof this.wasmManager.getEscalationLevel === 'function') {
      escalationLvl.textContent = `${(this.wasmManager.getEscalationLevel() * 100).toFixed(0)}%`;
    }

    const spawnRate = document.getElementById('spawn-rate');
    if (spawnRate && typeof this.wasmManager.getSpawnRateModifier === 'function') {
      spawnRate.textContent = `${this.wasmManager.getSpawnRateModifier().toFixed(1)}x`;
    }

    // Check for miniboss
    const minibossAlert = document.getElementById('miniboss-alert');
    if (minibossAlert && typeof this.wasmManager.getMinibossActive === 'function') {
      const isMinibossActive = this.wasmManager.getMinibossActive();
      minibossAlert.classList.toggle('hidden', !isMinibossActive);
    }

    overlay.classList.remove('hidden');
  }

  /**
   * Show cash out phase overlay
   * @private
   */
  showCashOutPhase() {
    const overlay = document.getElementById('cashout-overlay');
    if (!overlay || !this.wasmManager?.isLoaded) return;

    // Update currency displays
    const goldAmount = document.getElementById('gold-amount');
    if (goldAmount && typeof this.wasmManager.getGold === 'function') {
      goldAmount.textContent = this.wasmManager.getGold();
    }

    const essenceAmount = document.getElementById('essence-amount');
    if (essenceAmount && typeof this.wasmManager.getEssence === 'function') {
      essenceAmount.textContent = this.wasmManager.getEssence();
    }

    // Update shop items
    this.updateShopItems();

    overlay.classList.remove('hidden');
  }

  /**
   * Show game over phase overlay
   * @private
   */
  showGameOverPhase() {
    const overlay = document.getElementById('gameOverOverlay');
    if (!overlay) return;

    overlay.classList.remove('hidden');
  }

  /**
   * Handle choice selection
   * @param {number} choiceIndex - Choice button index
   * @private
   */
  handleChoiceSelection(choiceIndex) {
    if (!this.wasmManager?.isLoaded) return;

    const choiceButton = document.querySelector(`#choice-${choiceIndex}`);
    if (!choiceButton) return;

    const choiceId = parseInt(choiceButton.dataset.choiceId) || choiceIndex;
    
    console.log(`🎯 Player selected choice ${choiceIndex} (ID: ${choiceId})`);
    
    // Commit choice to WASM
    if (typeof this.wasmManager.commitChoice === 'function') {
      this.wasmManager.commitChoice(choiceId);
    }
    
    // Hide choice overlay
    const overlay = document.getElementById('choice-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  /**
   * Handle game restart
   * @private
   */
  handleGameRestart() {
    console.log('🔄 Restarting game...');
    
    if (this.wasmManager?.isLoaded && typeof this.wasmManager.resetRun === 'function') {
      const seed = this.wasmManager.getRunSeed?.() ?? 1n;
      this.wasmManager.resetRun(seed);
    }
    
    // Hide game over overlay
    const overlay = document.getElementById('gameOverOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
    
    // Restart game state
    this.gameStateManager.reset();
    this.initializeGameWorld();
  }

  /**
   * Handle new game (rematch)
   * @private
   */
  handleGameRematch() {
    console.log('🆕 Starting new game...');
    
    if (this.wasmManager?.isLoaded && typeof this.wasmManager.initRun === 'function') {
      const seedParam = new URLSearchParams(location.search).get('seed');
      const newSeed = seedParam && /^\d+$/.test(seedParam) ? BigInt(seedParam) : 1n;
      this.wasmManager.initRun(newSeed, 0);
    }
    
    // Hide game over overlay
    const overlay = document.getElementById('gameOverOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
    
    // Reset everything and start fresh
    this.gameStateManager.reset();
    this.initializeGameWorld();
  }

  /**
   * Update shop items display
   * @private
   */
  updateShopItems() {
    const shopItemsContainer = document.getElementById('shop-items');
    if (!shopItemsContainer || !this.wasmManager?.isLoaded) return;

    shopItemsContainer.innerHTML = '';

    if (typeof this.wasmManager.getShopItemCount === 'function') {
      const itemCount = this.wasmManager.getShopItemCount();
      
      for (let i = 0; i < itemCount; i++) {
        const itemElement = document.createElement('div');
        itemElement.className = 'shop-item';
        itemElement.innerHTML = `
          <div class="item-name">Item ${i + 1}</div>
          <div class="item-price">Cost: 50🔶</div>
          <button onclick="gameApp.wasmManager?.buyShopItem?.(${i})">Buy</button>
        `;
        shopItemsContainer.appendChild(itemElement);
      }
    }
  }

  /**
   * Get display name for choice type
   * @param {number} choiceType - Choice type ID
   * @param {number} choiceRarity - Choice rarity
   * @returns {string} Display name
   * @private
   */
  getChoiceDisplayName(choiceType, choiceRarity) {
    const rarityNames = ['Common', 'Rare', 'Epic', 'Legendary'];
    const typeNames = ['Weapon', 'Armor', 'Skill', 'Blessing'];
    
    const rarity = rarityNames[choiceRarity] || 'Unknown';
    const type = typeNames[choiceType] || 'Mystery';
    
    return `${rarity} ${type}`;
  }

  /**
   * Get display name for curse type
   * @param {number} curseType - Curse type ID
   * @returns {string} Display name
   * @private
   */
  getCurseDisplayName(curseType) {
    const curseNames = [
      'Weakness', 'Slowness', 'Fragility', 'Confusion', 
      'Blindness', 'Silence', 'Poison', 'Curse'
    ];
    return curseNames[curseType] || `Curse ${curseType}`;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopGameLoop();
    
    if (this.inputManager) {
      this.inputManager.destroy();
    }
    
    if (this.enhancedMobileControls) {
      this.enhancedMobileControls.destroy();
    }
    
    if (this.uiEventHandlers) {
      this.uiEventHandlers.destroy();
    }
    
    if (this.roguelikeHUD) {
      this.roguelikeHUD.destroy();
    }
    
    if (this.combatFeedback) {
      this.combatFeedback.destroy();
    }
    
    if (this.audioManager) {
      this.audioManager.destroy();
    }
    
    this.gameStateManager.reset();
  }
}

// Global game application instance
const gameApp = new GameApplication();

// Global functions for UI compatibility
window.toggleLobby = function() {
  const lobbyPanel = document.getElementById('lobbyPanel');
  if (lobbyPanel) {
    lobbyPanel.style.display = lobbyPanel.style.display === 'none' ? 'block' : 'none';
    if (lobbyPanel.style.display === 'block') {
      gameApp.updateRoomsList();
    }
  }
};

window.showLobbyTab = function(tabName) {
  gameApp.uiEventHandlers.showTab(tabName);
};

window.createRoom = async function() {
  const roomName = document.getElementById('roomName').value || 'New Room';
  const gameMode = document.getElementById('gameMode').value;
  
  try {
    await gameApp.roomManager.createRoom({
      name: roomName,
      type: 'public',
      gameMode: gameMode,
      maxPlayers: 4,
      allowSpectators: true
    });
    gameApp.updateRoomsList();
  } catch (error) {
    console.error('Failed to create room:', error);
    alert('Failed to create room: ' + error.message);
  }
};

window.quickPlay = async function() {
  try {
    await gameApp.roomManager.quickPlay({
      gameMode: 'default',
      maxPlayers: 4
    });
  } catch (error) {
    console.error('Quick play failed:', error);
    alert('Quick play failed: ' + error.message);
  }
};

window.sendChat = function() {
  gameApp.uiEventHandlers.handleChatSubmit();
};

window.joinRoom = function(roomId) {
  gameApp.joinRoom(roomId);
};

window.leaveRoom = function() {
  gameApp.leaveRoom();
};

window.startRoomGame = function() {
  gameApp.startRoomGame();
};

window.toggleReady = function() {
  gameApp.roomManager.toggleReady();
};

window.startGame = function() {
  gameApp.startGame();
};

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 DOM Content Loaded - Starting game initialization');
  
  try {
    const success = await gameApp.initialize();
    if (success) {
      console.log('✅ Game application ready');
    } else {
      console.warn('⚠️ Game application initialized with warnings');
    }
  } catch (error) {
    console.error('❌ Failed to initialize game application:', error);
    console.error('📋 Error stack:', error.stack);
    
    // Enable button anyway in case of initialization failure
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
      startGameBtn.disabled = false;
      startGameBtn.textContent = 'Start Game (Error Mode)';
      startGameBtn.style.background = '#ff6b6b';
      startGameBtn.style.cursor = 'pointer';
      
      // Add click handler directly as fallback
      startGameBtn.addEventListener('click', () => {
        console.log('🎮 Fallback start button clicked');
        alert('Game initialization failed, but you clicked the button! Check console for details.');
      });
    }
  }
});

// Make game app globally accessible
window.gameApp = gameApp;
