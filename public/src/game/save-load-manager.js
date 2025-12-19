/**
 * Save/Load Manager - JavaScript integration for WASM save system
 * Handles save/load operations, auto-save, and localStorage persistence
 */

export class SaveLoadManager {
  constructor(wasmManager) {
    this.wasmManager = wasmManager;
    this.saveSlots = 3;
    this.autoSaveEnabled = true;
    this.autoSaveInterval = 60000; // 1 minute
    this.autoSaveTimer = null;
    this.lastAutoSaveTime = 0;
    
    // Save metadata cache
    this.saveMetadata = new Map();
    
    this.initialize();
  }
  
  /**
   * Initialize save/load system
   */
  initialize() {
    this.loadSaveMetadata();
    this.startAutoSave();
    this.setupEventListeners();
  }
  
  /**
   * Setup event listeners for save triggers
   */
  setupEventListeners() {
    // Listen for phase transitions for auto-save
    window.addEventListener('phaseTransition', () => {
      if (this.autoSaveEnabled) {
        this.autoSave();
      }
    });
    
    // Listen for achievement unlocks
    window.addEventListener('achievementUnlocked', () => {
      if (this.autoSaveEnabled) {
        this.autoSave();
      }
    });
    
    // Save before page unload
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedProgress()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved progress. Are you sure you want to leave?';
        this.quickSave();
      }
    });
  }
  
  /**
   * Save game to specified slot
   * @param {number} slotIndex - Save slot index (0-2)
   * @returns {Promise<boolean>} Success status
   */
  async saveGame(slotIndex) {
    if (!this.wasmManager.isLoaded) {
      console.error('WASM not loaded');
      return false;
    }
    
    if (slotIndex < 0 || slotIndex >= this.saveSlots) {
      console.error('Invalid save slot index:', slotIndex);
      return false;
    }
    
    try {
      // Get save data from WASM
      const saveDataPtr = this.wasmManager.exports.create_save_data();
      const saveSize = this.wasmManager.exports.get_save_data_size();
      
      // Read save data from WASM memory
      const memory = new Uint8Array(this.wasmManager.exports.memory.buffer);
      const saveData = new Uint8Array(saveSize);
      for (let i = 0; i < saveSize; i++) {
        saveData[i] = memory[saveDataPtr + i];
      }
      
      // Convert to base64 for storage
      const saveString = btoa(String.fromCharCode(...saveData));
      
      // Store in localStorage
      const key = `game_save_slot_${slotIndex}`;
      localStorage.setItem(key, saveString);
      
      // Get and store metadata
      const statsJson = this.wasmManager.exports.get_save_statistics();
      const statsPtr = statsJson;
      let statsStr = '';
      let i = 0;
      while (memory[statsPtr + i] !== 0 && i < 1024) {
        statsStr += String.fromCharCode(memory[statsPtr + i]);
        i++;
      }
      
      let stats;
      try {
        stats = JSON.parse(statsStr);
      } catch (e) {
        stats = {};
      }
      
      const metadata = {
        timestamp: Date.now(),
        version: this.wasmManager.exports.get_save_version(),
        slotIndex: slotIndex,
        stats: {
          level: stats.level || 1,
          gold: stats.gold || 0,
          essence: stats.essence || 0,
          roomCount: stats.roomCount || 1,
          totalPlayTime: stats.totalPlayTime || 0,
          phase: this.getPhaseName(stats.phase || 0)
        }
      };
      
      localStorage.setItem(`${key}_meta`, JSON.stringify(metadata));
      this.saveMetadata.set(slotIndex, metadata);
      
      // Dispatch save event
      window.dispatchEvent(new CustomEvent('gameSaved', {
        detail: { slotIndex, metadata }
      }));
      
      console.log(`Game saved to slot ${slotIndex}`);
      return true;
      
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }
  
  /**
   * Load game from specified slot
   * @param {number} slotIndex - Save slot index (0-2)
   * @returns {Promise<boolean>} Success status
   */
  async loadGame(slotIndex) {
    if (!this.wasmManager.isLoaded) {
      console.error('WASM not loaded');
      return false;
    }
    
    if (slotIndex < 0 || slotIndex >= this.saveSlots) {
      console.error('Invalid save slot index:', slotIndex);
      return false;
    }
    
    try {
      const key = `game_save_slot_${slotIndex}`;
      const saveString = localStorage.getItem(key);
      
      if (!saveString) {
        console.log(`No save data found in slot ${slotIndex}`);
        return false;
      }
      
      // Convert from base64
      const saveData = Uint8Array.from(atob(saveString), c => c.charCodeAt(0));
      
      // Allocate memory in WASM for save data
      const memory = new Uint8Array(this.wasmManager.exports.memory.buffer);
      const saveDataPtr = this.wasmManager.exports.malloc ? 
        this.wasmManager.exports.malloc(saveData.length) : 
        0x10000; // Use fixed address if malloc not available
      
      // Copy save data to WASM memory
      for (let i = 0; i < saveData.length; i++) {
        memory[saveDataPtr + i] = saveData[i];
      }
      
      // Load the save data
      const result = this.wasmManager.exports.load_save_data(saveDataPtr, saveData.length);
      
      // Free allocated memory if malloc was used
      if (this.wasmManager.exports.free) {
        this.wasmManager.exports.free(saveDataPtr);
      }
      
      if (result === 1) {
        // Dispatch load event
        const metadata = this.saveMetadata.get(slotIndex);
        window.dispatchEvent(new CustomEvent('gameLoaded', {
          detail: { slotIndex, metadata }
        }));
        
        console.log(`Game loaded from slot ${slotIndex}`);
        return true;
      } 
        console.error(`Failed to load save data from slot ${slotIndex}`);
        return false;
      
      
    } catch (error) {
      console.error('Failed to load game:', error);
      return false;
    }
  }
  
  /**
   * Quick save to slot 0
   * @returns {Promise<boolean>} Success status
   */
  async quickSave() {
    const success = await this.saveGame(0);
    if (success) {
      this.showNotification('Quick save successful', 'success');
    } else {
      this.showNotification('Quick save failed', 'error');
    }
    return success;
  }
  
  /**
   * Quick load from slot 0
   * @returns {Promise<boolean>} Success status
   */
  async quickLoad() {
    const success = await this.loadGame(0);
    if (success) {
      this.showNotification('Quick load successful', 'success');
    } else {
      this.showNotification('Quick load failed', 'error');
    }
    return success;
  }
  
  /**
   * Auto-save to dedicated auto-save slot
   * @returns {Promise<boolean>} Success status
   */
  async autoSave() {
    if (!this.autoSaveEnabled || !this.wasmManager.isLoaded) {
      return false;
    }
    
    // Check if auto-save should trigger
    const shouldSave = this.wasmManager.exports.auto_save_check();
    if (shouldSave !== 1) {
      return false;
    }
    
    // Use a special auto-save slot (slot -1 internally, stored separately)
    try {
      // Get save data from WASM
      const saveDataPtr = this.wasmManager.exports.create_save_data();
      const saveSize = this.wasmManager.exports.get_save_data_size();
      
      // Read save data from WASM memory
      const memory = new Uint8Array(this.wasmManager.exports.memory.buffer);
      const saveData = new Uint8Array(saveSize);
      for (let i = 0; i < saveSize; i++) {
        saveData[i] = memory[saveDataPtr + i];
      }
      
      // Convert to base64 for storage
      const saveString = btoa(String.fromCharCode(...saveData));
      
      // Store in localStorage with auto-save key
      localStorage.setItem('game_auto_save', saveString);
      localStorage.setItem('game_auto_save_time', Date.now().toString());
      
      this.lastAutoSaveTime = Date.now();
      
      // Show subtle notification
      this.showNotification('Auto-saved', 'info', 1000);
      
      return true;
      
    } catch (error) {
      console.error('Auto-save failed:', error);
      return false;
    }
  }
  
  /**
   * Load auto-save
   * @returns {Promise<boolean>} Success status
   */
  async loadAutoSave() {
    try {
      const saveString = localStorage.getItem('game_auto_save');
      
      if (!saveString) {
        console.log('No auto-save found');
        return false;
      }
      
      // Convert from base64
      const saveData = Uint8Array.from(atob(saveString), c => c.charCodeAt(0));
      
      // Allocate memory in WASM for save data
      const memory = new Uint8Array(this.wasmManager.exports.memory.buffer);
      const saveDataPtr = this.wasmManager.exports.malloc ? 
        this.wasmManager.exports.malloc(saveData.length) : 
        0x10000; // Use fixed address if malloc not available
      
      // Copy save data to WASM memory
      for (let i = 0; i < saveData.length; i++) {
        memory[saveDataPtr + i] = saveData[i];
      }
      
      // Load the save data
      const result = this.wasmManager.exports.load_save_data(saveDataPtr, saveData.length);
      
      // Free allocated memory if malloc was used
      if (this.wasmManager.exports.free) {
        this.wasmManager.exports.free(saveDataPtr);
      }
      
      if (result === 1) {
        this.showNotification('Auto-save loaded', 'success');
        return true;
      } 
        console.error('Failed to load auto-save data');
        return false;
      
      
    } catch (error) {
      console.error('Failed to load auto-save:', error);
      return false;
    }
  }
  
  /**
   * Delete save from specified slot
   * @param {number} slotIndex - Save slot index (0-2)
   */
  deleteSave(slotIndex) {
    const key = `game_save_slot_${slotIndex}`;
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}_meta`);
    this.saveMetadata.delete(slotIndex);
    
    window.dispatchEvent(new CustomEvent('saveDeleted', {
      detail: { slotIndex }
    }));
    
    this.showNotification(`Save slot ${slotIndex + 1} deleted`, 'info');
  }
  
  /**
   * Get all save metadata
   * @returns {Array} Array of save metadata
   */
  getAllSaveMetadata() {
    const metadata = [];
    for (let i = 0; i < this.saveSlots; i++) {
      const meta = this.saveMetadata.get(i);
      metadata.push(meta || null);
    }
    return metadata;
  }
  
  /**
   * Load save metadata from localStorage
   */
  loadSaveMetadata() {
    for (let i = 0; i < this.saveSlots; i++) {
      const key = `game_save_slot_${i}_meta`;
      const metaString = localStorage.getItem(key);
      
      if (metaString) {
        try {
          const metadata = JSON.parse(metaString);
          this.saveMetadata.set(i, metadata);
        } catch (error) {
          console.warn(`Failed to parse save metadata for slot ${i}:`, error);
        }
      }
    }
  }
  
  /**
   * Check if there's unsaved progress
   * @returns {boolean}
   */
  hasUnsavedProgress() {
    if (!this.wasmManager.isLoaded) {
      return false;
    }
    
    // Check if significant time has passed since last save
    const timeSinceLastSave = Date.now() - this.lastAutoSaveTime;
    return timeSinceLastSave > 30000; // 30 seconds
  }
  
  /**
   * Start auto-save timer
   */
  startAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    this.autoSaveTimer = setInterval(() => {
      if (this.autoSaveEnabled) {
        this.autoSave();
      }
    }, this.autoSaveInterval);
  }
  
  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }
  
  /**
   * Toggle auto-save
   * @param {boolean} enabled
   */
  setAutoSaveEnabled(enabled) {
    this.autoSaveEnabled = enabled;
    if (enabled) {
      this.startAutoSave();
    } else {
      this.stopAutoSave();
    }
  }
  
  /**
   * Get phase name from phase number
   * @param {number} phase
   * @returns {string}
   */
  getPhaseName(phase) {
    const phases = [
      'Explore', 'Fight', 'Choose', 'PowerUp', 
      'Risk', 'Escalate', 'CashOut', 'Reset'
    ];
    return phases[phase] || 'Unknown';
  }
  
  /**
   * Show notification
   * @param {string} message
   * @param {string} type - 'success', 'error', 'info'
   * @param {number} duration - Duration in milliseconds
   */
  showNotification(message, type = 'info', duration = 2000) {
    window.dispatchEvent(new CustomEvent('notification', {
      detail: { message, type, duration }
    }));
  }
  
  /**
   * Export save data as base64 string
   * @param {number} slotIndex
   * @returns {string|null}
   */
  exportSave(slotIndex) {
    const key = `game_save_slot_${slotIndex}`;
    const saveString = localStorage.getItem(key);
    
    if (!saveString) {
      return null;
    }
    
    const metadata = this.saveMetadata.get(slotIndex);
    return JSON.stringify({
      save: saveString,
      metadata: metadata
    });
  }
  
  /**
   * Import save data from exported string
   * @param {string} exportedData
   * @param {number} slotIndex
   * @returns {boolean}
   */
  importSave(exportedData, slotIndex) {
    try {
      const data = JSON.parse(exportedData);
      
      if (!data.save) {
        return false;
      }
      
      const key = `game_save_slot_${slotIndex}`;
      localStorage.setItem(key, data.save);
      
      if (data.metadata) {
        localStorage.setItem(`${key}_meta`, JSON.stringify(data.metadata));
        this.saveMetadata.set(slotIndex, data.metadata);
      }
      
      this.showNotification(`Save imported to slot ${slotIndex + 1}`, 'success');
      return true;
      
    } catch (error) {
      console.error('Failed to import save:', error);
      this.showNotification('Failed to import save', 'error');
      return false;
    }
  }
}
