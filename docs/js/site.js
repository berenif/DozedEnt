/**
 * Main Game Application - Refactored version using modular architecture
 * Follows WASM-first principles from AGENTS.MD guidelines
 * 
 * This file contains the main GameApplication class that orchestrates all game systems.
 * It follows the WASM-first architecture where all game logic resides in WebAssembly
 * and JavaScript handles only rendering, input capture, and networking.
 * 
 * @fileoverview Main game application entry point
 * @author DozedEnt Development Team
 * @version 2.0.0
 */

// Core imports
import { setGlobalSeed } from './src/utils/rng.js';
import GameRenderer from './src/utils/game-renderer.js';
import CameraEffects from './src/utils/camera-effects.js';
import { WolfCharacter } from './src/gameentity/wolf-character.js';
import { EnhancedWolfAISystem } from './src/ai/wolf-ai.js';
import AnimatedPlayer from './src/animation/player-animator.js';

// New modular imports
import { WasmManager } from './src/wasm/wasm-manager.js';
import { RoomManager } from './src/lobby/room-manager.js';
import { AudioManager } from './src/audio/audio-manager.js';
import { GameStateManager } from './src/game/game-state-manager.js';
import { UIEventHandlers } from './src/ui/ui-event-handlers.js';
import { RoguelikeHUD } from './src/ui/roguelike-hud.js';
import { InputManager } from './src/input/input-manager.js';
import { EnhancedMobileControls } from './src/input/mobile-controls.js';

// Enhanced UI Systems
import { EnhancedUIIntegration } from './src/ui/enhanced-ui-integration.js';
import { uiCoordinator } from './src/ui/ui-coordinator.js';
import { PhaseOverlayManager } from './src/ui/phase-overlay-manager.js';
import { uiPerformanceOptimizer } from './src/ui/ui-performance-optimizer.js';

// Modern Roguelite UI Components
import { ModernRogueliteUI } from './src/ui/modern-roguelite-ui.js';
import { InputManager as ModernInputManager } from './src/ui/input-manager.js';
import { AccessibilityManager } from './src/ui/accessibility-manager.js';

// Performance optimization systems
import { globalFrameTimeOptimizer } from './src/utils/frame-time-optimizer.js';
import { globalWillChangeOptimizer } from './src/utils/will-change-optimizer.js';
import { globalPerformanceIntegration } from './src/utils/performance-integration.js';

/**
 * Main Game Application Class
 * Centralizes all game systems and manages their lifecycle
 * 
 * This class follows the WASM-first architecture principle where all game logic
 * resides in WebAssembly modules, while JavaScript handles only rendering,
 * input capture, and networking.
 * 
 * @class GameApplication
 */
class GameApplication {
  /**
   * Creates a new GameApplication instance
   * Initializes all core constants and system managers
   */
  constructor() {
    this._initializeConstants();
    this._initializeSystemManagers();
    this._initializeDOMReferences();
    this._initializeGameLoop();
  }

  /**
   * Initialize core game constants
   * @private
   */
  _initializeConstants() {
    // Biome types for environment generation
    this.BiomeType = {
      Forest: 0,
      Swamp: 1,
      Mountains: 2,
      Plains: 3
    };

    // Viewport and world dimensions
    this.VIRTUAL_WIDTH = 1280;
    this.VIRTUAL_HEIGHT = 720;
    this.WORLD_WIDTH = 3840;  // 3x viewport width
    this.WORLD_HEIGHT = 2160; // 3x viewport height
  }

  /**
   * Initialize system managers
   * @private
   */
  _initializeSystemManagers() {
    this.wasmManager = new WasmManager();
    this.roomManager = new RoomManager();
    this.audioManager = new AudioManager();
    this.gameStateManager = new GameStateManager();
    this.inputManager = null;
    this.enhancedMobileControls = null;
    this.uiEventHandlers = null;
    this.roguelikeHUD = null;
    this.combatFeedback = null;
    
    // Enhanced UI Integration
    this.enhancedUI = null;
    this.phaseOverlayManager = null;
  }

  /**
   * Initialize game systems
   * @private
   */
  _initializeGameSystems() {
    this.gameRenderer = null;
    this.cameraEffects = null;
    this.wolfAISystem = null;
    this.animatedPlayer = null;
    this.wolfCharacters = [];
  }

  /**
   * Initialize DOM element references
   * @private
   */
  _initializeDOMReferences() {
    this.canvas = null;
    this.gameCanvas = null;
  }

  /**
   * Initialize game loop variables
   * @private
   */
  _initializeGameLoop() {
    this.lastFrameTime = 0;
    this.animationFrameId = null;
    this.frameCount = 0;
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

  // ============================================================================
  // WORLD MANAGEMENT METHODS
  // ============================================================================

  /**
   * Change biome and regenerate environment
   * Updates the current biome and regenerates the environment with optional seed
   * @param {number} biomeType - The biome type to switch to (0-3)
   * @param {number} [seed=null] - Optional seed for deterministic generation
   * @throws {Error} If game renderer is not available
   */
  changeBiome(biomeType, seed = null) {
    if (!this.gameRenderer) {
      throw new Error('Cannot change biome - game renderer not available');
    }
    
    try {
      const runSeedBig = this.wasmManager?.getRunSeed?.() ?? 0n;
      const fallbackSeed = Number(runSeedBig % 2147483647n);
      
      this.gameRenderer.changeBiome(
        biomeType, 
        this.wasmManager?.module,
        seed ?? fallbackSeed
      );
      
      // Update any game state related to biome change
      this.gameStateManager.updateBiome(biomeType);
      
      console.log(`🌍 Biome changed to: ${this._getBiomeName(biomeType)}`);
    } catch (error) {
      console.error('Failed to change biome:', error);
      throw error;
    }
  }

  /**
   * Get biome name by type ID
   * @private
   * @param {number} biomeType - Biome type ID
   * @returns {string} Biome name
   */
  _getBiomeName(biomeType) {
    const biomeNames = ['Forest', 'Swamp', 'Mountains', 'Plains'];
    return biomeNames[biomeType] || `Unknown(${biomeType})`;
  }

  /**
   * Initialize the game application
   * Orchestrates the initialization of all game systems in the correct order
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      console.log('🔧 Initializing game application...');

      const wasmSuccess = await this._initializeCoreSystems();
      await this._initializeGameSystems(wasmSuccess);
      await this._initializeUISystems(wasmSuccess);
      this._setupEventListeners();
      this._updateInitializationUI(wasmSuccess);

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
   * Initialize core systems (UI optimizers, DOM, WASM)
   * @private
   * @returns {Promise<boolean>} WASM initialization success
   */
  async _initializeCoreSystems() {
    // Initialize UI Performance Optimizer first
    console.log('⚡ Initializing UI Performance Optimizer...');
    uiPerformanceOptimizer.initialize();
    console.log('✅ UI Performance Optimizer initialized');

    // Initialize UI Coordinator
    console.log('🎛️ Initializing UI Coordinator...');
    uiCoordinator.initialize();
    console.log('✅ UI Coordinator initialized');

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
      this._initializeWasmEnvironment();
      this._seedVisualRNG();
    }

    return wasmSuccess;
  }

  /**
   * Initialize WASM-based environment system
   * @private
   */
  _initializeWasmEnvironment() {
    this.initializeWasmEnvironment();
  }

  /**
   * Seed deterministic visual RNG from WASM run seed
   * @private
   */
  _seedVisualRNG() {
    try {
      const seed = this.wasmManager.getRunSeed?.();
      if (seed !== undefined && seed !== null) {
        setGlobalSeed(seed);
      }
    } catch (e) {
      console.warn('Failed to seed visual RNG:', e);
    }
  }

  /**
   * Initialize game systems (renderer, audio, input, etc.)
   * @private
   * @param {boolean} wasmSuccess - Whether WASM initialization succeeded
   */
  async _initializeGameSystems(wasmSuccess) {
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

    // Initialize Roguelike HUD
    console.log('🔧 Initializing Roguelike HUD...');
    this.roguelikeHUD = new RoguelikeHUD(this.gameStateManager, this.wasmManager);
    uiCoordinator.registerSystem('roguelike-hud', this.roguelikeHUD);
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
    uiCoordinator.registerSystem('mobile-controls', this.enhancedMobileControls);
    console.log('✅ Enhanced mobile controls initialized');
  }

  /**
   * Initialize UI systems (enhanced UI, phase overlays, modern UI)
   * @private
   * @param {boolean} wasmSuccess - Whether WASM initialization succeeded
   */
  async _initializeUISystems(wasmSuccess) {
    // Initialize enhanced UI systems after WASM is ready
    if (wasmSuccess) {
      console.log('🔧 Initializing Enhanced UI Systems...');
      this.enhancedUI = new EnhancedUIIntegration(
        this.wasmManager,
        this.gameCanvas,
        this.audioManager
      );
      uiCoordinator.registerSystem('enhanced-ui', this.enhancedUI);
      console.log('✅ Enhanced UI Systems initialized');
    }

    // Initialize Phase Overlay Manager
    console.log('🔧 Initializing Phase Overlay Manager...');
    this.phaseOverlayManager = new PhaseOverlayManager(this.wasmManager);
    this.phaseOverlayManager.initialize();
    uiCoordinator.registerSystem('phase-overlays', this.phaseOverlayManager);
    console.log('✅ Phase Overlay Manager initialized');

    // Initialize Modern Roguelite UI Components
    console.log('🔧 Initializing Modern Roguelite UI...');
    this.accessibilityManager = new AccessibilityManager();
    this.modernInputManager = new ModernInputManager(this.wasmManager);
    this.modernUI = new ModernRogueliteUI(this.wasmManager);
    
    // Register with UI coordinator
    uiCoordinator.registerSystem('modern-ui', this.modernUI);
    uiCoordinator.registerSystem('accessibility', this.accessibilityManager);
    uiCoordinator.registerSystem('modern-input', this.modernInputManager);
    
    console.log('✅ Modern Roguelite UI initialized');
  }

  /**
   * Setup event listeners for the application
   * @private
   */
  _setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    this.setupEventListeners();
    console.log('✅ Event listeners setup complete');
  }

  /**
   * Update UI to reflect initialization status
   * @private
   * @param {boolean} wasmSuccess - Whether WASM initialization succeeded
   */
  _updateInitializationUI(wasmSuccess) {
    console.log('🔧 Updating initialization UI...');
    this.updateInitializationUI(wasmSuccess);
    console.log('✅ Initialization UI updated');
  }

  /**
   * Initialize DOM elements
   * @private
   * @throws {Error} If required DOM elements are not found
   */
  initializeDOM() {
    try {
      this.canvas = document.getElementById('canvas');
      this.gameCanvas = document.getElementById('gameCanvas');

      if (!this.gameCanvas) {
        throw new Error('Game canvas not found - required element #gameCanvas missing from DOM');
      }

      console.log('✅ DOM elements initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize DOM elements:', error.message);
      throw error;
    }
  }

  /**
   * Initialize game systems
   * Sets up renderer, camera effects, AI systems, and player
   * @private
   * @throws {Error} If canvas context cannot be obtained or systems fail to initialize
   */
  initializeGameSystems() {
    if (!this.gameCanvas) {
      throw new Error('Cannot initialize game systems - game canvas not available');
    }

    try {
      // Ensure wolfCharacters is initialized
      this.wolfCharacters = this.wolfCharacters || [];
      this._initializeCanvas();
      this._initializeRenderer();
      this._initializeCameraEffects();
      this._initializeAISystems();
      this._initializePlayer();
      this._setupGlobalDebugAccess();
      
      console.log('✅ Game systems initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize game systems:', error.message);
      throw error;
    }
  }

  /**
   * Initialize canvas context and dimensions
   * @private
   * @throws {Error} If canvas context cannot be obtained
   */
  _initializeCanvas() {
    const ctx = this.gameCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D canvas context');
    }
    
    this.gameCanvas.width = this.VIRTUAL_WIDTH;
    this.gameCanvas.height = this.VIRTUAL_HEIGHT;
  }

  /**
   * Initialize game renderer
   * @private
   * @throws {Error} If renderer initialization fails
   */
  _initializeRenderer() {
    const ctx = this.gameCanvas.getContext('2d');
    this.gameRenderer = new GameRenderer(ctx, this.gameCanvas, this.BiomeType.Forest);
    this.gameRenderer.useExternalPlayer = true;
    
    // Store reference for later WASM integration
    this.initialBiome = this.BiomeType.Forest;
  }

  /**
   * Initialize camera effects system
   * @private
   * @throws {Error} If camera effects initialization fails
   */
  _initializeCameraEffects() {
    this.cameraEffects = new CameraEffects(this.gameCanvas);
  }

  /**
   * Initialize AI systems
   * @private
   * @throws {Error} If AI system initialization fails
   */
  _initializeAISystems() {
    this.wolfAISystem = new EnhancedWolfAISystem(null);
    this.gameStateManager.setWolfAISystem(this.wolfAISystem);
  }

  /**
   * Initialize animated player
   * @private
   * @throws {Error} If player initialization fails
   */
  _initializePlayer() {
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
  }

  /**
   * Setup global debug access for development
   * @private
   */
  _setupGlobalDebugAccess() {
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

    // Phase change event listener - handled by PhaseOverlayManager
    // this.gameStateManager.on('phaseChanged', (phase) => {
    //   this.handlePhaseChange(phase);
    // });

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

    const loadingText = document.querySelector('.loading-text');
    if (loadingText) {
      if (loadingText.textContent.includes('Initializing WASM game engine')) {
        loadingText.textContent = wasmSuccess ? 'WASM game engine ready!' : 'WASM failed to load - running in fallback mode';
      }
    } else {
      console.warn('⚠️ Loading text element not found');
    }

    // Hide loading screen automatically when WASM is ready
    if (wasmSuccess) {
      console.log('🎮 WASM ready - hiding loading screen automatically');
      setTimeout(() => {
        this.hideLoadingScreen();
      }, 500); // Small delay to show the "ready" message
    }
  }

  /**
   * Handle initialization error
   * Updates UI to show error state and provides user feedback
   * @param {Error} error - Initialization error
   * @private
   */
  handleInitializationError(error) {
    console.error('🚨 Initialization error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    });

    this._updateErrorUI(error);
    this._logErrorMetrics(error);
  }

  /**
   * Update UI to show error state
   * @private
   * @param {Error} error - The error that occurred
   */
  _updateErrorUI(error) {
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) {
      loadingText.textContent = `Initialization failed: ${error.message}`;
    }
  }

  /**
   * Log error metrics for debugging
   * @private
   * @param {Error} error - The error that occurred
   */
  _logErrorMetrics(error) {
    // Log error metrics for debugging and monitoring
    const errorMetrics = {
      type: 'initialization_error',
      message: error.message,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.log('📊 Error metrics:', errorMetrics);
  }

  /**
   * Safe execution wrapper for methods that might fail
   * @private
   * @param {Function} method - Method to execute safely
   * @param {string} methodName - Name of the method for logging
   * @param {Array} args - Arguments to pass to the method
   * @returns {*} Result of the method execution or null if it failed
   */
  _safeExecute(method, methodName, args = []) {
    try {
      return method.apply(this, args);
    } catch (error) {
      console.error(`❌ Error in ${methodName}:`, error.message);
      return null;
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
    
    // On desktop, start the game directly
    // On mobile, the orientation overlay will handle the game start
    if (isDesktop) {
      console.log('🖥️ Desktop detected - starting game directly');
      this.startGame();
    } else {
      console.log('📱 Mobile detected - checking orientation');
      this.checkOrientationAndStart();
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

  // ============================================================================
  // GAME CONTROL METHODS
  // ============================================================================

  /**
   * Start the game
   * Initializes the game world and begins the game loop
   * @throws {Error} If game is not properly initialized or WASM is not loaded
   */
  startGame() {
    if (!this.isInitialized) {
      throw new Error('Cannot start game - application not initialized');
    }

    console.log('🎮 Starting game with WASM-first architecture');
    
    // Verify WASM is ready
    if (!this.wasmManager.isLoaded) {
      throw new Error('Cannot start game - WASM not loaded, deterministic gameplay unavailable');
    }
    
    console.log('✅ WASM engine ready, starting deterministic gameplay');

    try {
      // Start game state manager
      this.gameStateManager.startGame();
      
      // Initialize game world
      this.initializeGameWorld();
      
      console.log('🎉 Game started successfully');
    } catch (error) {
      console.error('❌ Failed to start game:', error);
      throw error;
    }
  }

  // ============================================================================
  // GAME WORLD INITIALIZATION METHODS
  // ============================================================================

  /**
   * Initialize the game world
   * Spawns player, enemies, and sets up initial world state
   * @private
   * @throws {Error} If world initialization fails
   */
  initializeGameWorld() {
    console.log('🌍 Initializing game world...');
    
    try {
      this._spawnPlayer();
      this._spawnWolves();
      this._logInitialPhase();
      
      console.log('✅ Game world initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize game world:', error);
      throw error;
    }
  }

  /**
   * Spawn player at world center
   * @private
   * @throws {Error} If player spawning fails
   */
  _spawnPlayer() {
    this.spawnPlayer();
  }

  /**
   * Spawn initial wolf enemies
   * @private
   * @throws {Error} If wolf spawning fails
   */
  _spawnWolves() {
    this.spawnWolves();
  }

  /**
   * Log the initial game phase
   * @private
   */
  _logInitialPhase() {
    if (this.wasmManager.isLoaded) {
      const currentPhase = this.wasmManager.getPhase();
      console.log(`🎯 Game started in phase: ${this.getPhaseNameById(currentPhase)}`);
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
      
      // Use normalized coordinates directly (0-1 range)
      this.animatedPlayer.x = wasmPos.x;
      this.animatedPlayer.y = wasmPos.y;
      console.log(`Player spawned at WASM normalized position: (${wasmPos.x.toFixed(3)}, ${wasmPos.y.toFixed(3)})`);
      
      // Debug: Check if position is valid
      if (wasmPos.x < 0 || wasmPos.x > 1 || wasmPos.y < 0 || wasmPos.y > 1) {
        console.warn('Player spawned at invalid normalized position, using center fallback');
        this.animatedPlayer.x = 0.5;
        this.animatedPlayer.y = 0.5;
      }
    } else {
      // Fallback to center (normalized coordinates)
      this.animatedPlayer.x = 0.5;
      this.animatedPlayer.y = 0.5;
      console.log(`Player spawned at center (normalized): (0.5, 0.5)`);
    }
    
    // Make gameRenderer globally available for coordinate conversion
    globalThis.gameRenderer = this.gameRenderer;
    globalThis.wasmExports = this.wasmManager?.exports;
    
    // Debug: Log final player position
    console.log('Final player position:', {
      x: this.animatedPlayer.x,
      y: this.animatedPlayer.y,
      worldWidth: this.WORLD_WIDTH,
      worldHeight: this.WORLD_HEIGHT
    });
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
   * Handles frame timing, updates all systems, and renders the frame
   * @private
   */
  gameLoop() {
    const frameStartTime = performance.now();
    const deltaTime = this._calculateDeltaTime(frameStartTime);
    this.frameCount++;

    try {
      this._updateGameSystems(deltaTime);
      this._updateUISystems();
      this._renderFrame(deltaTime);
      this._optimizeFramePerformance(frameStartTime);

      // Continue loop
      this.animationFrameId = requestAnimationFrame(() => this.gameLoop());

    } catch (error) {
      this._handleGameLoopError(error);
    }
  }

  /**
   * Calculate delta time for this frame
   * @private
   * @param {number} frameStartTime - Current frame start time
   * @returns {number} Delta time in seconds
   */
  _calculateDeltaTime(frameStartTime) {
    const deltaTime = (frameStartTime - this.lastFrameTime) / 1000; // Convert to seconds
    this.lastFrameTime = frameStartTime;
    return deltaTime;
  }

  /**
   * Update all game systems
   * @private
   * @param {number} deltaTime - Time elapsed since last frame in seconds
   */
  _updateGameSystems(deltaTime) {
    const inputState = this._getInputState();
    this._logDebugInfo(inputState);

    this._updateGameState(deltaTime, inputState);
    this._syncPlayerPosition();
    this._updateWolfAI(deltaTime);
    this._updateAudioVisualizations();
  }

  /**
   * Get input state from input manager
   * @private
   * @returns {Object} Input state object
   */
  _getInputState() {
    return this.inputManager?.getInputState() || {};
  }

  /**
   * Log debug information every second
   * @private
   * @param {Object} inputState - Current input state
   */
  _logDebugInfo(inputState) {
    if (this.frameCount % 60 === 0) { // Log every second at 60fps
      console.log(`🎮 Input manager status: ${!!this.inputManager}, input state:`, inputState);
    }
  }

  /**
   * Update game state with error handling
   * @private
   * @param {number} deltaTime - Time elapsed since last frame
   * @param {Object} inputState - Current input state
   */
  _updateGameState(deltaTime, inputState) {
    try {
      this.gameStateManager.update(deltaTime, inputState);
    } catch (gameStateError) {
      console.error('Error updating game state:', gameStateError);
      // Continue with other updates even if game state update fails
    }
  }

  /**
   * Sync player position from WASM to animated player
   * @private
   */
  _syncPlayerPosition() {
    try {
      if (this.animatedPlayer && this.wasmManager && this.wasmManager.isLoaded) {
        const oldX = this.animatedPlayer.x;
        const oldY = this.animatedPlayer.y;
        
        // Get position directly from WASM (normalized 0-1 coordinates)
        const wasmPos = this.wasmManager.getPlayerPosition();
        this.animatedPlayer.x = wasmPos.x;
        this.animatedPlayer.y = wasmPos.y;
        
        // Log significant movement
        const dx = this.animatedPlayer.x - oldX;
        const dy = this.animatedPlayer.y - oldY;
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
          console.log(`Player moved: (${oldX.toFixed(3)}, ${oldY.toFixed(3)}) -> (${this.animatedPlayer.x.toFixed(3)}, ${this.animatedPlayer.y.toFixed(3)})`);
        }
      }
    } catch (positionError) {
      console.error('Error syncing player position:', positionError);
    }
  }

  /**
   * Update wolf AI system
   * @private
   * @param {number} deltaTime - Time elapsed since last frame
   */
  _updateWolfAI(deltaTime) {
    try {
      if (this.wolfAISystem && this.animatedPlayer) {
        this.wolfAISystem.update(deltaTime, this.animatedPlayer, this.wolfCharacters);
      }
    } catch (aiError) {
      console.error('Error updating wolf AI:', aiError);
    }
  }

  /**
   * Update audio visualizations
   * @private
   */
  _updateAudioVisualizations() {
    try {
      this.audioManager.updateVocalizationVisuals();
    } catch (audioError) {
      console.error('Error updating audio visualizations:', audioError);
    }
  }

  /**
   * Update all UI systems
   * @private
   */
  _updateUISystems() {
    this._updateRoguelikeHUD();
    this._updateCombatFeedback();
    this._updatePhaseOverlayManager();
    this._runPerformanceOptimization();
  }

  /**
   * Update Roguelike HUD
   * @private
   */
  _updateRoguelikeHUD() {
    try {
      if (this.roguelikeHUD) {
        this.roguelikeHUD.update();
      }
    } catch (hudError) {
      console.error('Error updating Roguelike HUD:', hudError);
    }
  }

  /**
   * Update Combat Feedback
   * @private
   */
  _updateCombatFeedback() {
    try {
      if (this.combatFeedback) {
        this.combatFeedback.update();
      }
    } catch (combatError) {
      console.error('Error updating Combat Feedback:', combatError);
    }
  }

  /**
   * Update Phase Overlay Manager
   * @private
   */
  _updatePhaseOverlayManager() {
    try {
      if (this.phaseOverlayManager) {
        this.phaseOverlayManager.update();
      }
    } catch (phaseError) {
      console.error('Error updating Phase Overlay Manager:', phaseError);
    }
  }

  /**
   * Run adaptive performance optimization every 60 frames
   * @private
   */
  _runPerformanceOptimization() {
    if (this.frameCount % 60 === 0) {
      try {
        uiPerformanceOptimizer.adaptiveOptimization();
      } catch (perfError) {
        console.error('Error in adaptive performance optimization:', perfError);
      }
    }
  }

  /**
   * Render the current frame
   * @private
   * @param {number} deltaTime - Time elapsed since last frame
   */
  _renderFrame(deltaTime) {
    try {
      this.render(deltaTime);
    } catch (renderError) {
      console.error('Error rendering frame:', renderError);
    }
  }

  /**
   * Optimize frame time performance
   * @private
   * @param {number} frameStartTime - Frame start time
   */
  _optimizeFramePerformance(frameStartTime) {
    try {
      const frameEndTime = performance.now();
      const optimizationResult = globalFrameTimeOptimizer.optimizeFrame(this.frameStartTime || frameEndTime);
      
      // Log performance warnings
      if (optimizationResult.frameTime > 50) {
        console.warn(`⚠️ Frame time exceeded target: ${optimizationResult.frameTime.toFixed(2)}ms (target: 16.67ms)`);
      }
    } catch (optimizationError) {
      console.error('Frame optimization error:', optimizationError);
    }
  }

  /**
   * Handle game loop errors with appropriate recovery
   * @private
   * @param {Error} error - The error that occurred
   */
  _handleGameLoopError(error) {
    console.error('Critical error in game loop:', error);
    
    // Only stop the game loop for truly critical errors
    // For WASM errors, try to continue running
    if (error.message && (error.message.includes('WASM') || error.message.includes('index out of bounds'))) {
      console.warn('WASM error detected, continuing game loop with degraded functionality');
      this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    } else {
      console.error('Stopping game loop due to critical error');
      this.stopGameLoop();
    }
  }

  /**
   * Render game frame
   * Optimized rendering pipeline with performance monitoring
   * @private
   * @param {number} deltaTime - Time elapsed since last frame in seconds
   */
  render(deltaTime) {
    if (!this.gameRenderer || !this.cameraEffects) {
      return;
    }

    const renderStartTime = performance.now();

    try {
      this._clearCanvas();
      this._updateCamera(deltaTime);
      this._renderWorld();
      this._renderEntities();
      this._renderUI();

      // Performance monitoring
      const renderTime = performance.now() - renderStartTime;
      if (renderTime > 16) { // Warn if render takes longer than one frame
        console.warn(`⚠️ Render time exceeded target: ${renderTime.toFixed(2)}ms`);
      }

    } catch (error) {
      console.error('Error in render loop:', error);
    }
  }

  /**
   * Clear the canvas for new frame
   * @private
   */
  _clearCanvas() {
    const ctx = this.gameRenderer.ctx;
    ctx.clearRect(0, 0, this.VIRTUAL_WIDTH, this.VIRTUAL_HEIGHT);
  }

  /**
   * Update camera system
   * @private
   * @param {number} deltaTime - Time elapsed since last frame
   */
  _updateCamera(deltaTime) {
    if (!this.animatedPlayer || !this.gameRenderer) {
      return;
    }

    // Convert WASM coordinates to world coordinates for camera tracking
    const worldPos = this.gameRenderer.wasmToWorld(this.animatedPlayer.x, this.animatedPlayer.y);
    
    // Update game renderer's player position for camera tracking
    this.gameRenderer.player.x = worldPos.x;
    this.gameRenderer.player.y = worldPos.y;
    
    // Update GameRenderer camera to follow player
    this.gameRenderer.updateCamera(worldPos.x, worldPos.y, deltaTime);
    
    // Apply camera effects to follow player
    this.cameraEffects.followTarget(worldPos.x, worldPos.y);
    
    // Update game renderer's camera with camera effects position
    this.gameRenderer.camera.x = this.cameraEffects.position.x;
    this.gameRenderer.camera.y = this.cameraEffects.position.y;

    // Update camera effects
    this.cameraEffects.update(deltaTime);
    
    // Apply camera shake if needed
    const cameraState = this.gameStateManager.cameraState;
    this.cameraEffects.shake(cameraState.shakeStrength);
  }

  /**
   * Render the game world
   * @private
   */
  _renderWorld() {
    this.gameRenderer.render();
  }

  /**
   * Render all game entities (wolves, player)
   * @private
   */
  _renderEntities() {
    const ctx = this.gameRenderer.ctx;
    const camera = this.gameRenderer.camera;

    // Render wolves
    (this.wolfCharacters || []).forEach(wolf => {
      wolf.render(ctx, camera);
    });

    // Render player
    if (this.animatedPlayer) {
      this._logPlayerRenderDebug(camera);
      this.animatedPlayer.render(ctx, camera);
    } else {
      console.warn('No animatedPlayer to render');
    }
  }

  /**
   * Render UI elements
   * @private
   */
  _renderUI() {
    // UI rendering logic can be added here if needed
    // For now, this is a placeholder to prevent the error
  }

  /**
   * Log player rendering debug info every second
   * @private
   * @param {Object} camera - Camera object
   */
  _logPlayerRenderDebug(camera) {
    if (this.frameCount % 60 === 0) {
      console.log('Rendering player at:', {
        x: this.animatedPlayer.x,
        y: this.animatedPlayer.y,
        camera: camera
      });
    }
  }

  /**
   * Render UI overlays
   * @private
   */
  renderUI() {
    this.updateDebugHUD();
    this.updatePlayerHUD();
    
    // Debug: Log player position every 60 frames
    if (this.frameCount % 60 === 0 && this.animatedPlayer) {
      console.log('Player position:', {
        animatedPlayer: { x: this.animatedPlayer.x, y: this.animatedPlayer.y },
        gameState: this.gameStateManager.playerState?.position,
        camera: this.gameRenderer?.camera,
        wasmPos: this.wasmManager?.getPlayerPosition?.()
      });
    }
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

  // ============================================================================
  // MULTIPLAYER & ROOM MANAGEMENT METHODS
  // ============================================================================

  /**
   * Update rooms list display
   * Refreshes the UI with current available rooms
   */
  updateRoomsList() {
    const roomsList = document.getElementById('roomsList');
    if (!roomsList) {
      console.warn('Rooms list element not found');
      return;
    }

    try {
      const rooms = this.roomManager.getRoomList({ hasSpace: true });
      this._renderRoomsList(roomsList, rooms);
    } catch (error) {
      console.error('Failed to update rooms list:', error);
      roomsList.innerHTML = '<p style="color: #ff6b6b;">Error loading rooms</p>';
    }
  }

  /**
   * Render the rooms list HTML
   * @private
   * @param {HTMLElement} roomsList - The rooms list DOM element
   * @param {Array} rooms - Array of room objects
   */
  _renderRoomsList(roomsList, rooms) {
    if (rooms.length === 0) {
      roomsList.innerHTML = '<p style="color: #888;">No rooms available. Create one!</p>';
    } else {
      roomsList.innerHTML = rooms.map(room => this._createRoomHTML(room)).join('');
    }
  }

  /**
   * Create HTML for a single room
   * @private
   * @param {Object} room - Room object
   * @returns {string} HTML string for the room
   */
  _createRoomHTML(room) {
    return `
      <div style="border: 1px solid #333; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
        <h4 style="margin: 0; color: #4a90e2;">${room.name}</h4>
        <p style="margin: 5px 0; color: #888;">
          ${room.players.length}/${room.maxPlayers} players | 
          Mode: ${room.gameMode} | 
          Code: ${room.code}
        </p>
        <button onclick="gameApp.joinRoom('${room.id}')" style="padding: 5px 10px; background: #4a90e2; border: none; color: white; border-radius: 3px; cursor: pointer;">Join</button>
      </div>
    `;
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

  // ============================================================================
  // CLEANUP & RESOURCE MANAGEMENT METHODS
  // ============================================================================

  /**
   * Cleanup resources and destroy all game systems
   * Properly disposes of all managers and stops the game loop
   */
  destroy() {
    console.log('🧹 Cleaning up game application resources...');
    
    try {
      this._stopGameSystems();
      this._destroyManagers();
      this._resetGameState();
      
      console.log('✅ Game application cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  /**
   * Stop game systems and loop
   * @private
   */
  _stopGameSystems() {
    this.stopGameLoop();
  }

  /**
   * Destroy all managers and UI systems
   * @private
   */
  _destroyManagers() {
    const managers = [
      { name: 'inputManager', instance: this.inputManager },
      { name: 'enhancedMobileControls', instance: this.enhancedMobileControls },
      { name: 'uiEventHandlers', instance: this.uiEventHandlers },
      { name: 'roguelikeHUD', instance: this.roguelikeHUD },
      { name: 'combatFeedback', instance: this.combatFeedback },
      { name: 'audioManager', instance: this.audioManager },
      { name: 'enhancedUI', instance: this.enhancedUI }
    ];

    managers.forEach(({ name, instance }) => {
      if (instance && typeof instance.destroy === 'function') {
        try {
          instance.destroy();
          console.log(`✅ ${name} destroyed`);
        } catch (error) {
          console.error(`❌ Failed to destroy ${name}:`, error);
        }
      }
    });
  }

  /**
   * Reset game state
   * @private
   */
  _resetGameState() {
    if (this.gameStateManager) {
      this.gameStateManager.reset();
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get application status information
   * @returns {Object} Status object with initialization and system states
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      wasmLoaded: this.wasmManager?.isLoaded || false,
      gameRunning: this.gameStateManager?.isGameRunning || false,
      frameCount: this.frameCount,
      systems: {
        renderer: !!this.gameRenderer,
        camera: !!this.cameraEffects,
        input: !!this.inputManager,
        audio: !!this.audioManager,
        ui: !!this.enhancedUI
      }
    };
  }

  /**
   * Validate that all required systems are initialized
   * @returns {boolean} True if all systems are ready
   */
  validateSystems() {
    const requiredSystems = [
      { name: 'WASM Manager', instance: this.wasmManager },
      { name: 'Game Renderer', instance: this.gameRenderer },
      { name: 'Camera Effects', instance: this.cameraEffects },
      { name: 'Game State Manager', instance: this.gameStateManager },
      { name: 'Input Manager', instance: this.inputManager }
    ];

    const missingSystems = requiredSystems.filter(({ instance }) => !instance);
    
    if (missingSystems.length > 0) {
      console.warn('⚠️ Missing required systems:', missingSystems.map(s => s.name));
      return false;
    }

    return true;
  }
}

// ============================================================================
// GLOBAL APPLICATION INSTANCE
// ============================================================================

/**
 * Global game application instance
 * This instance is created when the module loads and manages the entire game
 * @type {GameApplication}
 */
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
      console.log('✅ Game application ready - auto-starting game');
      // Auto-start the game after successful initialization
      setTimeout(() => {
        try {
          gameApp.handleStartButtonClick();
        } catch (error) {
          console.error('❌ Failed to auto-start game:', error);
        }
      }, 100); // Small delay to ensure everything is ready
    } else {
      console.warn('⚠️ Game application initialized with warnings - auto-starting anyway');
      // Still try to start the game even with warnings
      setTimeout(() => {
        try {
          gameApp.handleStartButtonClick();
        } catch (error) {
          console.error('❌ Failed to auto-start game:', error);
        }
      }, 100);
    }
  } catch (error) {
    console.error('❌ Failed to initialize game application:', error);
    console.error('📋 Error stack:', error.stack);
    
    // Ensure canvas is visible even if initialization fails
    document.body.classList.add('game-started');
    console.log('🔧 Canvas made visible despite initialization error');
  }
});

// Make game app globally accessible
window.gameApp = gameApp;

// Fallback: Ensure canvas is visible after 3 seconds regardless of initialization status
setTimeout(() => {
  if (!document.body.classList.contains('game-started')) {
    console.log('🔧 Fallback: Making canvas visible after timeout');
    document.body.classList.add('game-started');
  }
}, 3000);

// Additional immediate canvas visibility check
document.addEventListener('DOMContentLoaded', () => {
  // Check canvas visibility every 500ms for the first 10 seconds
  let checkCount = 0;
  const maxChecks = 20; // 10 seconds total
  
  const canvasVisibilityChecker = setInterval(() => {
    checkCount++;
    
    // Check if canvas elements exist and are visible
    const gameCanvas = document.getElementById('gameCanvas');
    const viewport = document.getElementById('viewport');
    
    if (gameCanvas && viewport) {
      const canvasStyle = getComputedStyle(gameCanvas);
      const viewportStyle = getComputedStyle(viewport);
      
      // If canvas or viewport is not visible, force visibility
      if (canvasStyle.display === 'none' || 
          canvasStyle.visibility === 'hidden' || 
          parseFloat(canvasStyle.opacity) === 0 ||
          viewportStyle.display === 'none' ||
          parseFloat(viewportStyle.opacity) === 0) {
        
        console.log('🔧 Canvas visibility issue detected - forcing visibility');
        document.body.classList.add('game-started');
        
        // Force canvas visibility
        gameCanvas.style.display = 'block';
        gameCanvas.style.visibility = 'visible';
        gameCanvas.style.opacity = '1';
        
        // Force viewport visibility
        viewport.style.display = 'block';
        viewport.style.opacity = '1';
        
        // Hide loading screen
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
          loadingScreen.style.opacity = '0';
          loadingScreen.style.visibility = 'hidden';
          loadingScreen.style.pointerEvents = 'none';
        }
      }
    }
    
    // Stop checking after max attempts or if game-started class is present
    if (checkCount >= maxChecks || document.body.classList.contains('game-started')) {
      clearInterval(canvasVisibilityChecker);
      console.log('🔧 Canvas visibility checker stopped');
    }
  }, 500);
});

