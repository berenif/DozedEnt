/**
 * Main Game Application - Refactored version using modular architecture
 * Follows WASM-first principles from AGENTS.MD guidelines
 */

// Core imports
import { setGlobalSeed } from '../src/utils/rng.js';
import GameRenderer from '../src/utils/game-renderer.js';
import CameraEffects from '../src/utils/camera-effects.js';
import { WolfCharacter } from '../src/gameentity/wolf-character.js';
import { EnhancedWolfAISystem } from '../src/ai/wolf-ai.js';
import AnimatedPlayer from '../src/animation/player/procedural/player-animator.js';

// New modular imports
import { WasmManager } from '../src/utils/wasm-manager.js';
import { RoomManager } from '../src/lobby/room-manager.js';
import { AudioManager } from '../src/audio/audio-manager.js';
import { GameStateManager } from '../src/game/game-state-manager.js';
import { UIEventHandlers } from '../src/ui/ui-event-handlers.js';
import { RoguelikeHUD } from '../src/ui/roguelike-hud.js';
import { EnhancedUIManager } from '../src/ui/enhanced-ui-manager.js';
import { InputManager } from '../src/input/input-manager.js';
import { EnhancedMobileControls } from '../src/input/mobile-controls.js';
import { OrientationManager } from '../src/ui/orientation-manager.js';
import { MainMenuController } from '../src/ui/main-menu-controller.js';
import { PhaseOverlayController } from '../src/ui/phase-overlay-controller.js';
import { LobbyUIController } from '../src/ui/lobby-ui-controller.js';

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
    this.enhancedUIManager = null;
    this.combatFeedback = null;
    this.orientationManager = null;
    this.mainMenuController = null;
    this.phaseOverlayController = null;
    this.lobbyUIController = null;


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
      console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â§ Initializing game application...');

      // Initialize DOM elements
      console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¹ Initializing DOM elements...');
      this.initializeDOM();
      console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ DOM elements initialized');

      // Initialize WASM first (core requirement)
      console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â§ Initializing WASM manager...');
      const wasmSuccess = await this.wasmManager.initialize();
      if (!wasmSuccess) {
        console.warn('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â WASM initialization failed - running in fallback mode');
      } else {
        console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ WASM initialized successfully');
        
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
      console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â§ Initializing game systems...');
      this.initializeGameSystems();
      console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Game systems initialized');

      // Initialize audio system
      console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â§ Initializing audio system...');
      this.audioManager.setupEventListeners();
      console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Audio system initialized');

      // Initialize UI event handlers
      console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â§ Initializing UI event handlers...');
      this.uiEventHandlers = new UIEventHandlers(
        this.gameStateManager,
        this.roomManager,
        this.audioManager
      );
      console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ UI event handlers initialized');


      // Initialize Roguelike HUD
      console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â§ Initializing Roguelike HUD...');
      this.roguelikeHUD = new RoguelikeHUD(this.gameStateManager, this.wasmManager);
      console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Roguelike HUD initialized');

      // Initialize Enhanced UI Manager
      console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â§ Initializing Enhanced UI Manager...');
      this.enhancedUIManager = new EnhancedUIManager(this.wasmManager);
      console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Enhanced UI Manager initialized');

      // Initialize game state with WASM
      console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â§ Initializing game state manager...');
      this.gameStateManager.initialize(this.wasmManager);
      console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Game state manager initialized');

      // Initialize input manager
      console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â§ Initializing input manager...');
      this.inputManager = new InputManager(this.wasmManager);
      console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Input manager initialized');

      // Initialize enhanced mobile controls
      console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â§ Initializing enhanced mobile controls...');
      this.enhancedMobileControls = new EnhancedMobileControls(this.gameStateManager);
      console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Enhanced mobile controls initialized');

      // Initialize UI controllers
      console.log('Initializing UI controllers...');
      this.initializeInterfaceControllers();
      console.log('UI controllers initialized');

      // Setup event listeners
      console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â§ Setting up event listeners...');
      this.setupEventListeners();
      console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Event listeners setup complete');

      // Update UI to reflect initialization status
      console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â§ Updating initialization UI...');
      this.updateInitializationUI(wasmSuccess);
      console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Initialization UI updated');

      this.isInitialized = true;
      console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â½ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â° Game application initialized successfully');
      return true;

    } catch (error) {
      console.error('ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ Failed to initialize game application:', error);
      console.error('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¹ Error details:', {
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
   * Initialize UI controllers that coordinate DOM interactions
   */
  initializeInterfaceControllers() {
    this.orientationManager = new OrientationManager({
      onPauseForOverlay: () => {
        if (this.gameStateManager?.isGameRunning && !this.gameStateManager?.isGamePaused) {
          this.gameStateManager.pauseGame?.();
        }
      },
      onResumeFromOverlay: () => {
        if (this.gameStateManager?.isGameRunning && this.gameStateManager?.isGamePaused) {
          this.gameStateManager.resumeGame?.();
        }
      },
      onOrientationChange: () => {
        this.enhancedMobileControls?.adjustLayoutForOrientation?.();
      }
    });
    this.orientationManager.initialize();

    this.mainMenuController = new MainMenuController({
      startButtonId: 'start-game-btn',
      menuId: 'main-menu',
      onStartMenu: () => this.handleStartMenuRequest(),
      onSelection: (action) => this.handleMainMenuSelection(action)
    });
    this.mainMenuController.initialize();

    this.phaseOverlayController = new PhaseOverlayController({
      wasmManager: this.wasmManager,
      onChoiceCommitted: () => {},
      onRestart: () => this.handleGameRestart(),
      onRematch: () => this.handleGameRematch()
    });
    this.phaseOverlayController.initialize();

    this.lobbyUIController = new LobbyUIController({
      roomManager: this.roomManager,
      onJoinRoom: (roomId) => this.joinRoom(roomId),
      onLeaveRoom: () => this.leaveRoom(),
      onStartRoomGame: () => this.startRoomGame()
    });
  }

  /**
   * Gate start flow when the start button is pressed.
   * @returns {boolean} False when start should be aborted.
   */
  handleStartMenuRequest() {
    if (!this.isInitialized) {
      console.error('Game not initialized - cannot start');
      alert('Game is not initialized yet. Check the browser console for errors.');
      return false;
    }

    this.hideLoadingScreen();
    return true;
  }

  /**
   * Respond to a main menu selection.
   * @param {string} action - Selected option
   */
  handleMainMenuSelection(action) {
    const startSequence = () => {
      this.startGame();

      if (action === 'continue') {
        this.gameStateManager?.showPersistenceUI?.('saves');
      } else if (action === 'join-online') {
        if (typeof window.toggleLobby === 'function') {
          window.toggleLobby();
        }
        this.lobbyUIController?.refreshRoomsList();
      }
    };

    if (this.orientationManager) {
      this.orientationManager.requestStart(startSequence);
    } else {
      startSequence();
    }
  }

  /**
   * Setup event listeners
   * @private
   */
  setupEventListeners() {
    const enhancedUIToggle = document.getElementById('enhanced-ui-toggle');
    if (enhancedUIToggle) {
      enhancedUIToggle.addEventListener('click', () => {
        this.toggleEnhancedUI();
      });
    }

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

    this.gameStateManager.on('phaseChanged', (phase) => {
      this.phaseOverlayController?.handlePhaseChange(phase);
    });

    this.roomManager.on('roomCreated', () => {
      this.lobbyUIController?.refreshRoomsList();
    });

    this.roomManager.on('roomJoined', (room) => {
      this.lobbyUIController?.showRoomInfo(room);
    });

    this.roomManager.on('chatMessage', (message) => {
      this.lobbyUIController?.appendChatMessage(message);
    });
  }


  /**
   * Update initialization UI
   * @param {boolean} wasmSuccess - WASM initialization success
   * @private
   */
  updateInitializationUI(wasmSuccess) {
    console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â§ Updating initialization UI with WASM success:', wasmSuccess);
    
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
      console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Start button found, enabling...');
      startGameBtn.disabled = false;
      startGameBtn.textContent = wasmSuccess ? 'Start Game' : 'Start (UI Only)';
      startGameBtn.style.background = wasmSuccess ? '#4a90e2' : '#ff6b6b';
      startGameBtn.style.cursor = 'pointer';
    } else {
      console.error('ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ Start button not found in DOM');
    }

    const loadingText = document.querySelector('.loading-text');
    if (loadingText) {
      if (loadingText.textContent.includes('Initializing WASM game engine')) {
        loadingText.textContent = wasmSuccess ? 'WASM game engine ready!' : 'WASM failed to load - running in fallback mode';
      }
    } else {
      console.warn('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â Loading text element not found');
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

  /**
   * Toggle between enhanced and legacy UI modes
   */
  toggleEnhancedUI() {
    console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â¡ Enhanced UI toggle clicked');
    
    if (this.enhancedUIManager) {
      this.enhancedUIManager.toggleUIMode();
      
      // Update toggle button appearance
      const toggleButton = document.getElementById('enhanced-ui-toggle');
      if (toggleButton) {
        const isEnhanced = this.enhancedUIManager.uiMode === 'enhanced';
        toggleButton.classList.toggle('active', isEnhanced);
        toggleButton.title = isEnhanced ? 'Switch to Legacy UI' : 'Switch to Enhanced UI';
        
        // Show notification
        if (this.enhancedUIManager.showNotification) {
          this.enhancedUIManager.showNotification(
            `Switched to ${isEnhanced ? 'Enhanced' : 'Legacy'} UI`,
            'success',
            2000
          );
        }
      }
    }
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

    console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â½Ãƒâ€šÃ‚Â® Starting game with WASM-first architecture');
    
    // Verify WASM is ready
    if (!this.wasmManager.isLoaded) {
      console.error('ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ WASM not loaded - cannot start deterministic gameplay');
      return;
    } else {
      console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ WASM engine ready, starting deterministic gameplay');
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
    console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã¢â‚¬â„¢Ãƒâ€šÃ‚Â Initializing game world...');
    
    try {
      // Spawn player at world center
      this.spawnPlayer();
      
      // Spawn initial enemies
      this.spawnWolves();
      
      // Initialize world state
      if (this.wasmManager.isLoaded) {
        const currentPhase = this.wasmManager.getPhase();
        console.log(`ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â½Ãƒâ€šÃ‚Â¯ Game started in phase: ${this.getPhaseNameById(currentPhase)}`);
      }
      
      console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Game world initialized successfully');
      
    } catch (error) {
      console.error('ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ Failed to initialize game world:', error);
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

      // Note: Player position synchronization is now handled in render() method
      // to ensure consistent coordinate system handling

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
      this.render(deltaTime);

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
  render(deltaTime = 0.016) {
    if (!this.gameRenderer || !this.cameraEffects) return;

    try {
      // Clear canvas
      const ctx = this.gameRenderer.ctx;
      ctx.clearRect(0, 0, this.VIRTUAL_WIDTH, this.VIRTUAL_HEIGHT);

      // Get player position from WASM if available, otherwise use fallback
      let playerWorldX = this.WORLD_WIDTH / 2;
      let playerWorldY = this.WORLD_HEIGHT / 2;
      
      if (this.wasmManager && this.wasmManager.isLoaded) {
        const playerPos = this.wasmManager.getPlayerPosition();
        playerWorldX = playerPos.x * this.WORLD_WIDTH;
        playerWorldY = playerPos.y * this.WORLD_HEIGHT;
        
        // Update animated player position from WASM
        if (this.animatedPlayer) {
          this.animatedPlayer.x = playerWorldX;
          this.animatedPlayer.y = playerWorldY;
        }
      } else if (this.animatedPlayer) {
        // Use animated player position as fallback
        playerWorldX = this.animatedPlayer.x;
        playerWorldY = this.animatedPlayer.y;
      }

      // Update game renderer's player position for camera tracking
      this.gameRenderer.player.x = playerWorldX;
      this.gameRenderer.player.y = playerWorldY;
      
      // Update GameRenderer camera to follow player
      this.gameRenderer.updateCamera(playerWorldX, playerWorldY, deltaTime);
      
      // Apply camera effects to follow player
      this.cameraEffects.followTarget(playerWorldX, playerWorldY);

      // Apply camera shake if needed
      const cameraState = this.gameStateManager.cameraState;
      this.cameraEffects.shake(cameraState.shakeStrength);

      // Render world (but disable internal player rendering)
      const originalUseExternalPlayer = this.gameRenderer.useExternalPlayer;
      this.gameRenderer.useExternalPlayer = true;
      this.gameRenderer.render();
      this.gameRenderer.useExternalPlayer = originalUseExternalPlayer;

      // Render wolves
      const camera = this.gameRenderer.camera;
      this.wolfCharacters.forEach(wolf => {
        wolf.render(ctx, camera);
      });

      // Render player using AnimatedPlayer (primary renderer)
      if (this.animatedPlayer) {
        this.animatedPlayer.render(ctx, camera);
      } else {
        // Fallback: render simple player rectangle
        ctx.save();
        ctx.fillStyle = '#4a90e2';
        const screenX = playerWorldX - camera.x;
        const screenY = playerWorldY - camera.y;
        ctx.fillRect(screenX - 16, screenY - 16, 32, 32);
        ctx.restore();
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
    const wasmStatus = this.wasmManager.isLoaded ? 'ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ WASM' : 'ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ Fallback';
    
    let debugInfo = `
      <div style="background: rgba(0,0,0,0.7); color: #fff; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px;">
        <div><strong>DozedEnt Debug</strong></div>
        <div>Engine: ${wasmStatus}</div>
        <div>Running: ${gameState.isGameRunning ? 'ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦' : 'ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢'}</div>
        <div>Phase: ${this.getPhaseNameById(gameState.phaseState?.currentPhase || 0)}</div>
        <div>Wolves: ${gameState.wolfState?.characterCount || 0}</div>
    `;

    // Show player position information
    if (this.wasmManager.isLoaded && gameState.isGameRunning) {
      const playerPos = this.wasmManager.getPlayerPosition();
      const stamina = this.wasmManager.getStamina();
      const worldX = playerPos.x * this.WORLD_WIDTH;
      const worldY = playerPos.y * this.WORLD_HEIGHT;
      
      debugInfo += `
        <div>WASM Pos: (${playerPos.x.toFixed(3)}, ${playerPos.y.toFixed(3)})</div>
        <div>World Pos: (${worldX.toFixed(0)}, ${worldY.toFixed(0)})</div>
        <div>Stamina: ${(stamina * 100).toFixed(0)}%</div>
      `;
    } else if (this.animatedPlayer) {
      debugInfo += `
        <div>Fallback Pos: (${this.animatedPlayer.x.toFixed(0)}, ${this.animatedPlayer.y.toFixed(0)})</div>
        <div>No WASM - Using fallback rendering</div>
      `;
    }

    // Show input state
    const inputState = this.inputManager?.getInputState();
    if (inputState) {
      const hasInput = inputState.direction.x !== 0 || inputState.direction.y !== 0 || 
                      inputState.lightAttack || inputState.heavyAttack || 
                      inputState.block || inputState.roll || inputState.special;
      debugInfo += `
        <div>Input: ${hasInput ? 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â½Ãƒâ€šÃ‚Â® Active' : 'ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â Idle'}</div>
      `;
      if (hasInput) {
        debugInfo += `
          <div>Dir: (${inputState.direction.x.toFixed(1)}, ${inputState.direction.y.toFixed(1)})</div>
        `;
      }
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
    this.lobbyUIController?.refreshRoomsList();
  }


  /**
   * Show room information
   * @param {Object} room - Room object
   */
  showRoomInfo(room) {
    this.lobbyUIController?.showRoomInfo(room);
  }


  /**
   * Display chat message
   * @param {Object} message - Chat message object
   */
  displayChatMessage(message) {
    this.lobbyUIController?.appendChatMessage(message);
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
    this.lobbyUIController?.clearRoomInfo();
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
   * Handle game restart
   * @private
   */
  handleGameRestart() {
    console.log('Restarting game...');

    if (this.wasmManager?.isLoaded && typeof this.wasmManager.resetRun === 'function') {
      const seed = this.wasmManager.getRunSeed?.() ?? 1n;
      this.wasmManager.resetRun(seed);
    }

    this.gameStateManager.reset();
    this.initializeGameWorld();
  }


  /**
   * Handle new game (rematch)
   * @private
   */
  handleGameRematch() {
    console.log('Starting new game...');

    if (this.wasmManager?.isLoaded && typeof this.wasmManager.initRun === 'function') {
      const seedParam = new URLSearchParams(location.search).get('seed');
      const newSeed = seedParam && /^\d+$/.test(seedParam) ? BigInt(seedParam) : 1n;
      this.wasmManager.initRun(newSeed, 0);
    }

    this.gameStateManager.reset();
    this.initializeGameWorld();
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

    this.orientationManager?.destroy?.();
    this.mainMenuController?.destroy?.();
    this.phaseOverlayController?.destroy?.();

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
  console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â¡ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ DOM Content Loaded - Starting game initialization');
  
  try {
    const success = await gameApp.initialize();
    if (success) {
      console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Game application ready');
    } else {
      console.warn('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â Game application initialized with warnings');
    }
  } catch (error) {
    console.error('ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ Failed to initialize game application:', error);
    console.error('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¹ Error stack:', error.stack);
    
    // Enable button anyway in case of initialization failure
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
      startGameBtn.disabled = false;
      startGameBtn.textContent = 'Start Game (Error Mode)';
      startGameBtn.style.background = '#ff6b6b';
      startGameBtn.style.cursor = 'pointer';
      
      // Add click handler directly as fallback
      startGameBtn.addEventListener('click', () => {
        console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â½Ãƒâ€šÃ‚Â® Fallback start button clicked');
        alert('Game initialization failed, but you clicked the button! Check console for details.');
      });
    }
  }
});

// Make game app globally accessible
window.gameApp = gameApp;
