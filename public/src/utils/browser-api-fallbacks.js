/**
 * Browser API Fallbacks and Graceful Degradation
 * Handles failures of Web Audio, Canvas, WebRTC, and other browser APIs
 */

/* global GamepadList */

export class BrowserAPIFallbacks {
  constructor() {
    this.capabilities = {
      webAudio: null,
      canvas: null,
      webRTC: null,
      gamepad: null,
      fullscreen: null,
      pointerLock: null,
      webGL: null
    };
    
    this.fallbacksActive = new Set();
    this.errorLog = [];
  }

  /**
   * Initialize all API capability checks
   */
  async initialize() {
    console.log('🔍 Checking browser API capabilities...');
    
    // Check all APIs in parallel
    await Promise.allSettled([
      this.checkWebAudioAPI(),
      this.checkCanvasAPI(),
      this.checkWebRTCAPI(),
      this.checkGamepadAPI(),
      this.checkFullscreenAPI(),
      this.checkPointerLockAPI(),
      this.checkWebGLAPI()
    ]);
    
    const supportedCount = Object.values(this.capabilities).filter(Boolean).length;
    const totalCount = Object.keys(this.capabilities).length;
    
    console.log(`✅ Browser API check complete: ${supportedCount}/${totalCount} APIs supported`);
    
    if (this.fallbacksActive.size > 0) {
      console.warn(`⚠️ ${this.fallbacksActive.size} API fallbacks active:`, Array.from(this.fallbacksActive));
      this.showAPIWarning();
    }
    
    return this.capabilities;
  }

  /**
   * Check Web Audio API availability
   */
  async checkWebAudioAPI() {
    try {
      // Test AudioContext creation
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('AudioContext not available');
      }

      const testContext = new AudioContextClass();
      
      // Test basic audio functionality
      const oscillator = testContext.createOscillator();
      const gainNode = testContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(testContext.destination);
      
      // Clean up test context
      await testContext.close();
      
      this.capabilities.webAudio = true;
      console.log('✅ Web Audio API: Supported');
      
    } catch (error) {
      this.capabilities.webAudio = false;
      this.fallbacksActive.add('webAudio');
      this.logError('Web Audio API', error);
      console.warn('❌ Web Audio API: Not supported -', error.message);
    }
  }

  /**
   * Check Canvas API availability
   */
  checkCanvasAPI() {
    try {
      const canvas = document.createElement('canvas');
      if (!canvas.getContext) {
        throw new Error('Canvas getContext not available');
      }

      const ctx2d = canvas.getContext('2d');
      if (!ctx2d) {
        throw new Error('2D context not available');
      }

      // Test basic drawing operations
      ctx2d.fillStyle = 'red';
      ctx2d.fillRect(0, 0, 10, 10);
      
      const imageData = ctx2d.getImageData(0, 0, 1, 1);
      if (!imageData || !imageData.data) {
        throw new Error('Canvas image data not accessible');
      }

      this.capabilities.canvas = true;
      console.log('✅ Canvas API: Supported');
      
    } catch (error) {
      this.capabilities.canvas = false;
      this.fallbacksActive.add('canvas');
      this.logError('Canvas API', error);
      console.warn('❌ Canvas API: Not supported -', error.message);
    }
  }

  /**
   * Check WebRTC API availability
   */
  checkWebRTCAPI() {
    try {
      if (!window.RTCPeerConnection) {
        throw new Error('RTCPeerConnection not available');
      }

      // Test RTCPeerConnection creation
      const testPC = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      // Test basic functionality
      if (typeof testPC.createOffer !== 'function') {
        throw new Error('RTCPeerConnection methods not available');
      }
      
      testPC.close();
      
      this.capabilities.webRTC = true;
      console.log('✅ WebRTC API: Supported');
      
    } catch (error) {
      this.capabilities.webRTC = false;
      this.fallbacksActive.add('webRTC');
      this.logError('WebRTC API', error);
      console.warn('❌ WebRTC API: Not supported -', error.message);
    }
  }

  /**
   * Check Gamepad API availability
   */
  checkGamepadAPI() {
    try {
      if (!navigator.getGamepads) {
        throw new Error('Gamepad API not available');
      }

      // Test gamepad detection
      const gamepads = navigator.getGamepads();
      if (!Array.isArray(gamepads) && !(gamepads instanceof GamepadList)) {
        throw new Error('Gamepad list not accessible');
      }

      this.capabilities.gamepad = true;
      console.log('✅ Gamepad API: Supported');
      
    } catch (error) {
      this.capabilities.gamepad = false;
      this.fallbacksActive.add('gamepad');
      this.logError('Gamepad API', error);
      console.warn('❌ Gamepad API: Not supported -', error.message);
    }
  }

  /**
   * Check Fullscreen API availability
   */
  checkFullscreenAPI() {
    try {
      const element = document.documentElement;
      const requestFullscreen = element.requestFullscreen || 
                               element.webkitRequestFullscreen || 
                               element.mozRequestFullScreen ||
                               element.msRequestFullscreen;

      if (!requestFullscreen) {
        throw new Error('Fullscreen API not available');
      }

      this.capabilities.fullscreen = true;
      console.log('✅ Fullscreen API: Supported');
      
    } catch (error) {
      this.capabilities.fullscreen = false;
      this.fallbacksActive.add('fullscreen');
      this.logError('Fullscreen API', error);
      console.warn('❌ Fullscreen API: Not supported -', error.message);
    }
  }

  /**
   * Check Pointer Lock API availability
   */
  checkPointerLockAPI() {
    try {
      const element = document.documentElement;
      const requestPointerLock = element.requestPointerLock || 
                                element.webkitRequestPointerLock ||
                                element.mozRequestPointerLock;

      if (!requestPointerLock) {
        throw new Error('Pointer Lock API not available');
      }

      this.capabilities.pointerLock = true;
      console.log('✅ Pointer Lock API: Supported');
      
    } catch (error) {
      this.capabilities.pointerLock = false;
      this.fallbacksActive.add('pointerLock');
      this.logError('Pointer Lock API', error);
      console.warn('❌ Pointer Lock API: Not supported -', error.message);
    }
  }

  /**
   * Check WebGL API availability
   */
  checkWebGLAPI() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        throw new Error('WebGL context not available');
      }

      // Test basic WebGL functionality
      gl.clear(gl.COLOR_BUFFER_BIT);
      const error = gl.getError();
      if (error !== gl.NO_ERROR) {
        throw new Error(`WebGL error: ${error}`);
      }

      this.capabilities.webGL = true;
      console.log('✅ WebGL API: Supported');
      
    } catch (error) {
      this.capabilities.webGL = false;
      this.fallbacksActive.add('webGL');
      this.logError('WebGL API', error);
      console.warn('❌ WebGL API: Not supported -', error.message);
    }
  }

  /**
   * Log API error for debugging
   */
  logError(apiName, error) {
    const errorInfo = {
      api: apiName,
      message: error.message,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    this.errorLog.push(errorInfo);
  }

  /**
   * Show user-friendly API warning notification
   */
  showAPIWarning() {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: #ffc107;
      color: #212529;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 9999;
      max-width: 350px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.4;
    `;
    
    const fallbackList = Array.from(this.fallbacksActive).join(', ');
    
    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 6px;">⚠️ Limited Browser Support</div>
      <div>Some features may be unavailable: ${fallbackList}</div>
      <button onclick="this.parentElement.remove()" style="
        background: rgba(0,0,0,0.1);
        border: none;
        color: #212529;
        padding: 4px 8px;
        border-radius: 3px;
        cursor: pointer;
        margin-top: 8px;
        font-size: 12px;
      ">OK</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 8000);
  }

  /**
   * Create fallback audio manager when Web Audio API is not available
   */
  createFallbackAudioManager() {
    console.log('🔇 Creating fallback audio manager (silent mode)');
    
    return {
      playSound: (soundId, options = {}) => {
        console.log(`🔇 Fallback: Would play sound "${soundId}"`, options);
      },
      
      playMusic: (musicId, options = {}) => {
        console.log(`🎵 Fallback: Would play music "${musicId}"`, options);
      },
      
      setVolume: (volume) => {
        console.log(`🔊 Fallback: Would set volume to ${volume}`);
      },
      
      stopAll: () => {
        console.log('⏹️ Fallback: Would stop all audio');
      },
      
      isSupported: () => false,
      
      getCapabilities: () => ({
        webAudio: false,
        htmlAudio: false,
        spatialAudio: false
      })
    };
  }

  /**
   * Create fallback canvas renderer when Canvas API is not available
   */
  createFallbackCanvasRenderer() {
    console.log('🎨 Creating fallback canvas renderer (DOM-based)');
    
    return {
      render: (gameState) => {
        // Use DOM elements for basic rendering
        this.updateDOMRenderer(gameState);
      },
      
      isSupported: () => false,
      
      getCapabilities: () => ({
        canvas2d: false,
        webgl: false,
        hardwareAcceleration: false
      })
    };
  }

  /**
   * Update DOM-based renderer fallback
   */
  updateDOMRenderer(gameState) {
    let domRenderer = document.getElementById('dom-fallback-renderer');
    
    if (!domRenderer) {
      domRenderer = document.createElement('div');
      domRenderer.id = 'dom-fallback-renderer';
      domRenderer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 400px;
        height: 300px;
        background: #222;
        color: #fff;
        border: 2px solid #555;
        border-radius: 8px;
        padding: 20px;
        font-family: monospace;
        z-index: 1000;
      `;
      document.body.appendChild(domRenderer);
    }
    
    // Basic text-based game state display
    domRenderer.innerHTML = `
      <h3>Game State (DOM Fallback)</h3>
      <div>Position: ${gameState?.playerX?.toFixed(2) || 0.5}, ${gameState?.playerY?.toFixed(2) || 0.5}</div>
      <div>Stamina: ${gameState?.stamina?.toFixed(2) || 1.0}</div>
      <div>Phase: ${gameState?.phase || 0}</div>
      <div style="margin-top: 16px; font-size: 12px; opacity: 0.7;">
        Canvas rendering not available - using DOM fallback
      </div>
    `;
  }

  /**
   * Get comprehensive API support report
   */
  getAPIReport() {
    return {
      capabilities: { ...this.capabilities },
      fallbacksActive: Array.from(this.fallbacksActive),
      errorLog: [...this.errorLog],
      supportScore: Object.values(this.capabilities).filter(Boolean).length / Object.keys(this.capabilities).length
    };
  }
}

// Create global instance
export const browserAPIFallbacks = new BrowserAPIFallbacks();

// Auto-initialize on module load
if (typeof document !== 'undefined' && document.readyState !== 'loading') {
  browserAPIFallbacks.initialize();
} else if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    browserAPIFallbacks.initialize();
  });
}
