/**
 * Save/Load UI - User interface for save/load operations
 * Provides save slot management, quick save/load buttons, and save metadata display
 */

export class SaveLoadUI {
  constructor(saveLoadManager) {
    this.saveLoadManager = saveLoadManager;
    this.isMenuOpen = false;
    this.selectedSlot = null;
    
    this.initialize();
  }
  
  /**
   * Initialize the save/load UI
   */
  initialize() {
    this.createUI();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.updateSaveSlots();
  }
  
  /**
   * Create the save/load UI elements
   */
  createUI() {
    // Create save/load menu container
    const menuContainer = document.createElement('div');
    menuContainer.id = 'save-load-menu';
    menuContainer.className = 'save-load-menu hidden';
    menuContainer.innerHTML = `
      <div class="save-load-menu-content">
        <div class="save-load-header">
          <h2>Save / Load Game</h2>
          <button class="close-button" id="close-save-menu">×</button>
        </div>
        
        <div class="save-slots-container">
          ${this.createSaveSlots()}
        </div>
        
        <div class="save-load-actions">
          <button class="action-button save-button" id="save-to-slot" disabled>
            <span class="action-icon">💾</span> Save
          </button>
          <button class="action-button load-button" id="load-from-slot" disabled>
            <span class="action-icon">📁</span> Load
          </button>
          <button class="action-button delete-button" id="delete-save" disabled>
            <span class="action-icon">🗑️</span> Delete
          </button>
        </div>
        
        <div class="save-load-options">
          <label class="auto-save-toggle">
            <input type="checkbox" id="auto-save-toggle" checked>
            <span>Enable Auto-Save</span>
          </label>
          
          <div class="import-export-buttons">
            <button class="small-button" id="export-save">Export</button>
            <button class="small-button" id="import-save">Import</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(menuContainer);
    
    // Create quick save/load buttons
    const quickButtons = document.createElement('div');
    quickButtons.id = 'quick-save-buttons';
    quickButtons.className = 'quick-save-buttons';
    quickButtons.innerHTML = `
      <button class="quick-button" id="quick-save-btn" title="Quick Save (F5)">
        <span class="quick-icon">💾</span>
      </button>
      <button class="quick-button" id="quick-load-btn" title="Quick Load (F9)">
        <span class="quick-icon">📁</span>
      </button>
      <button class="quick-button" id="open-save-menu-btn" title="Save Menu (Esc)">
        <span class="quick-icon">📋</span>
      </button>
    `;
    
    document.body.appendChild(quickButtons);
    
    // Create auto-save indicator
    const autoSaveIndicator = document.createElement('div');
    autoSaveIndicator.id = 'auto-save-indicator';
    autoSaveIndicator.className = 'auto-save-indicator hidden';
    autoSaveIndicator.innerHTML = `
      <span class="auto-save-icon">⏱️</span>
      <span class="auto-save-text">Auto-saving...</span>
    `;
    
    document.body.appendChild(autoSaveIndicator);
    
    // Add styles
    this.injectStyles();
  }
  
  /**
   * Create save slot HTML
   * @returns {string}
   */
  createSaveSlots() {
    let slotsHTML = '';
    
    for (let i = 0; i < 3; i++) {
      slotsHTML += `
        <div class="save-slot" data-slot="${i}">
          <div class="slot-number">Slot ${i + 1}</div>
          <div class="slot-content">
            <div class="slot-empty" id="slot-empty-${i}">
              <span class="empty-text">Empty Slot</span>
            </div>
            <div class="slot-data hidden" id="slot-data-${i}">
              <div class="save-info">
                <div class="save-stat">
                  <span class="stat-label">Level:</span>
                  <span class="stat-value" id="slot-${i}-level">-</span>
                </div>
                <div class="save-stat">
                  <span class="stat-label">Gold:</span>
                  <span class="stat-value" id="slot-${i}-gold">-</span>
                </div>
                <div class="save-stat">
                  <span class="stat-label">Room:</span>
                  <span class="stat-value" id="slot-${i}-room">-</span>
                </div>
                <div class="save-stat">
                  <span class="stat-label">Phase:</span>
                  <span class="stat-value" id="slot-${i}-phase">-</span>
                </div>
              </div>
              <div class="save-time">
                <span class="time-label">Saved:</span>
                <span class="time-value" id="slot-${i}-time">-</span>
              </div>
              <div class="play-time">
                <span class="time-label">Play Time:</span>
                <span class="time-value" id="slot-${i}-playtime">-</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    // Add auto-save slot
    slotsHTML += `
      <div class="save-slot auto-save-slot" data-slot="auto">
        <div class="slot-number">Auto-Save</div>
        <div class="slot-content">
          <div class="slot-empty" id="slot-empty-auto">
            <span class="empty-text">No Auto-Save</span>
          </div>
          <div class="slot-data hidden" id="slot-data-auto">
            <div class="save-time">
              <span class="time-label">Auto-saved:</span>
              <span class="time-value" id="slot-auto-time">-</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    return slotsHTML;
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Menu controls
    document.getElementById('close-save-menu').addEventListener('click', () => {
      this.closeMenu();
    });
    
    document.getElementById('open-save-menu-btn').addEventListener('click', () => {
      this.openMenu();
    });
    
    // Quick buttons
    document.getElementById('quick-save-btn').addEventListener('click', () => {
      this.quickSave();
    });
    
    document.getElementById('quick-load-btn').addEventListener('click', () => {
      this.quickLoad();
    });
    
    // Save slots
    document.querySelectorAll('.save-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        const slotIndex = slot.dataset.slot;
        if (slotIndex !== 'auto') {
          this.selectSlot(parseInt(slotIndex));
        } else {
          this.loadAutoSave();
        }
      });
    });
    
    // Action buttons
    document.getElementById('save-to-slot').addEventListener('click', () => {
      if (this.selectedSlot !== null) {
        this.saveToSlot(this.selectedSlot);
      }
    });
    
    document.getElementById('load-from-slot').addEventListener('click', () => {
      if (this.selectedSlot !== null) {
        this.loadFromSlot(this.selectedSlot);
      }
    });
    
    document.getElementById('delete-save').addEventListener('click', () => {
      if (this.selectedSlot !== null) {
        this.deleteSave(this.selectedSlot);
      }
    });
    
    // Auto-save toggle
    document.getElementById('auto-save-toggle').addEventListener('change', (e) => {
      this.saveLoadManager.setAutoSaveEnabled(e.target.checked);
    });
    
    // Import/Export
    document.getElementById('export-save').addEventListener('click', () => {
      if (this.selectedSlot !== null) {
        this.exportSave(this.selectedSlot);
      }
    });
    
    document.getElementById('import-save').addEventListener('click', () => {
      if (this.selectedSlot !== null) {
        this.importSave(this.selectedSlot);
      }
    });
    
    // Listen for save/load events
    window.addEventListener('gameSaved', (e) => {
      this.updateSaveSlot(e.detail.slotIndex, e.detail.metadata);
      this.showSaveIndicator();
    });
    
    window.addEventListener('gameLoaded', () => {
      this.closeMenu();
    });
    
    window.addEventListener('notification', (e) => {
      if (e.detail.message.includes('Auto-sav')) {
        this.showAutoSaveIndicator();
      }
    });
  }
  
  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // F5 - Quick Save
      if (e.key === 'F5') {
        e.preventDefault();
        this.quickSave();
      }
      // F9 - Quick Load
      else if (e.key === 'F9') {
        e.preventDefault();
        this.quickLoad();
      }
      // Escape - Toggle save menu
      else if (e.key === 'Escape') {
        if (this.isMenuOpen) {
          this.closeMenu();
        } else {
          this.openMenu();
        }
      }
    });
  }
  
  /**
   * Open save/load menu
   */
  openMenu() {
    const menu = document.getElementById('save-load-menu');
    menu.classList.remove('hidden');
    this.isMenuOpen = true;
    this.updateSaveSlots();
  }
  
  /**
   * Close save/load menu
   */
  closeMenu() {
    const menu = document.getElementById('save-load-menu');
    menu.classList.add('hidden');
    this.isMenuOpen = false;
    this.selectedSlot = null;
    this.updateButtonStates();
  }
  
  /**
   * Select a save slot
   * @param {number} slotIndex
   */
  selectSlot(slotIndex) {
    // Remove previous selection
    document.querySelectorAll('.save-slot').forEach(slot => {
      slot.classList.remove('selected');
    });
    
    // Add selection to new slot
    const slot = document.querySelector(`.save-slot[data-slot="${slotIndex}"]`);
    if (slot) {
      slot.classList.add('selected');
      this.selectedSlot = slotIndex;
      this.updateButtonStates();
    }
  }
  
  /**
   * Update button states based on selected slot
   */
  updateButtonStates() {
    const saveBtn = document.getElementById('save-to-slot');
    const loadBtn = document.getElementById('load-from-slot');
    const deleteBtn = document.getElementById('delete-save');
    const exportBtn = document.getElementById('export-save');
    
    if (this.selectedSlot === null) {
      saveBtn.disabled = true;
      loadBtn.disabled = true;
      deleteBtn.disabled = true;
      exportBtn.disabled = true;
    } else {
      saveBtn.disabled = false;
      
      const metadata = this.saveLoadManager.saveMetadata.get(this.selectedSlot);
      if (metadata) {
        loadBtn.disabled = false;
        deleteBtn.disabled = false;
        exportBtn.disabled = false;
      } else {
        loadBtn.disabled = true;
        deleteBtn.disabled = true;
        exportBtn.disabled = true;
      }
    }
  }
  
  /**
   * Update all save slots display
   */
  updateSaveSlots() {
    const metadata = this.saveLoadManager.getAllSaveMetadata();
    
    metadata.forEach((meta, index) => {
      this.updateSaveSlot(index, meta);
    });
    
    // Update auto-save slot
    const autoSaveTime = localStorage.getItem('game_auto_save_time');
    if (autoSaveTime) {
      document.getElementById('slot-empty-auto').classList.add('hidden');
      document.getElementById('slot-data-auto').classList.remove('hidden');
      document.getElementById('slot-auto-time').textContent = 
        this.formatTime(parseInt(autoSaveTime));
    } else {
      document.getElementById('slot-empty-auto').classList.remove('hidden');
      document.getElementById('slot-data-auto').classList.add('hidden');
    }
  }
  
  /**
   * Update a specific save slot display
   * @param {number} slotIndex
   * @param {Object} metadata
   */
  updateSaveSlot(slotIndex, metadata) {
    if (metadata) {
      document.getElementById(`slot-empty-${slotIndex}`).classList.add('hidden');
      document.getElementById(`slot-data-${slotIndex}`).classList.remove('hidden');
      
      // Update stats
      document.getElementById(`slot-${slotIndex}-level`).textContent = 
        metadata.stats.level || '-';
      document.getElementById(`slot-${slotIndex}-gold`).textContent = 
        this.formatNumber(metadata.stats.gold || 0);
      document.getElementById(`slot-${slotIndex}-room`).textContent = 
        metadata.stats.roomCount || '-';
      document.getElementById(`slot-${slotIndex}-phase`).textContent = 
        metadata.stats.phase || '-';
      document.getElementById(`slot-${slotIndex}-time`).textContent = 
        this.formatTime(metadata.timestamp);
      document.getElementById(`slot-${slotIndex}-playtime`).textContent = 
        this.formatDuration(metadata.stats.totalPlayTime || 0);
    } else {
      document.getElementById(`slot-empty-${slotIndex}`).classList.remove('hidden');
      document.getElementById(`slot-data-${slotIndex}`).classList.add('hidden');
    }
  }
  
  /**
   * Quick save
   */
  async quickSave() {
    const success = await this.saveLoadManager.quickSave();
    if (success) {
      this.showSaveIndicator();
      this.updateSaveSlots();
    }
  }
  
  /**
   * Quick load
   */
  async quickLoad() {
    const success = await this.saveLoadManager.quickLoad();
    if (success) {
      this.closeMenu();
    }
  }
  
  /**
   * Save to selected slot
   * @param {number} slotIndex
   */
  async saveToSlot(slotIndex) {
    const success = await this.saveLoadManager.saveGame(slotIndex);
    if (success) {
      this.updateSaveSlots();
      this.showSaveIndicator();
    }
  }
  
  /**
   * Load from selected slot
   * @param {number} slotIndex
   */
  async loadFromSlot(slotIndex) {
    const success = await this.saveLoadManager.loadGame(slotIndex);
    if (success) {
      this.closeMenu();
    }
  }
  
  /**
   * Load auto-save
   */
  async loadAutoSave() {
    const success = await this.saveLoadManager.loadAutoSave();
    if (success) {
      this.closeMenu();
    }
  }
  
  /**
   * Delete save from selected slot
   * @param {number} slotIndex
   */
  deleteSave(slotIndex) {
    if (confirm(`Are you sure you want to delete save slot ${slotIndex + 1}?`)) {
      this.saveLoadManager.deleteSave(slotIndex);
      this.updateSaveSlots();
      this.selectedSlot = null;
      this.updateButtonStates();
    }
  }
  
  /**
   * Export save from selected slot
   * @param {number} slotIndex
   */
  exportSave(slotIndex) {
    const exportData = this.saveLoadManager.exportSave(slotIndex);
    if (exportData) {
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `save_slot_${slotIndex + 1}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }
  
  /**
   * Import save to selected slot
   * @param {number} slotIndex
   */
  importSave(slotIndex) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const text = await file.text();
        const success = this.saveLoadManager.importSave(text, slotIndex);
        if (success) {
          this.updateSaveSlots();
        }
      }
    };
    
    input.click();
  }
  
  /**
   * Show save indicator
   */
  showSaveIndicator() {
    const quickSaveBtn = document.getElementById('quick-save-btn');
    quickSaveBtn.classList.add('save-success');
    setTimeout(() => {
      quickSaveBtn.classList.remove('save-success');
    }, 1000);
  }
  
  /**
   * Show auto-save indicator
   */
  showAutoSaveIndicator() {
    const indicator = document.getElementById('auto-save-indicator');
    indicator.classList.remove('hidden');
    setTimeout(() => {
      indicator.classList.add('hidden');
    }, 2000);
  }
  
  /**
   * Format timestamp to readable time
   * @param {number} timestamp
   * @returns {string}
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } 
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    
  }
  
  /**
   * Format duration to readable format
   * @param {number} seconds
   * @returns {string}
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } 
      return `${secs}s`;
    
  }
  
  /**
   * Format number with commas
   * @param {number} num
   * @returns {string}
   */
  formatNumber(num) {
    return num.toLocaleString();
  }
  
  /**
   * Inject CSS styles
   */
  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Save/Load Menu Styles */
      .save-load-menu {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
      }
      
      .save-load-menu.hidden {
        display: none;
      }
      
      .save-load-menu-content {
        background: #1a1a2e;
        border-radius: 10px;
        padding: 30px;
        max-width: 800px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      }
      
      .save-load-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #16213e;
      }
      
      .save-load-header h2 {
        margin: 0;
        color: #fff;
        font-size: 24px;
      }
      
      .close-button {
        background: none;
        border: none;
        color: #fff;
        font-size: 30px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .close-button:hover {
        color: #ff6b6b;
      }
      
      /* Save Slots */
      .save-slots-container {
        display: grid;
        gap: 15px;
        margin-bottom: 20px;
      }
      
      .save-slot {
        background: #16213e;
        border: 2px solid #0f3460;
        border-radius: 8px;
        padding: 15px;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .save-slot:hover {
        border-color: #e94560;
        transform: translateX(5px);
      }
      
      .save-slot.selected {
        border-color: #4fbdba;
        background: #1e3a5f;
      }
      
      .save-slot.auto-save-slot {
        background: #1a3a3a;
        border-color: #2a5a5a;
      }
      
      .slot-number {
        font-weight: bold;
        color: #4fbdba;
        margin-bottom: 10px;
        font-size: 16px;
      }
      
      .slot-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .slot-empty {
        color: #666;
        font-style: italic;
        padding: 20px;
        text-align: center;
      }
      
      .slot-data {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .save-info {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 10px;
      }
      
      .save-stat {
        display: flex;
        gap: 5px;
        color: #fff;
      }
      
      .stat-label {
        color: #999;
      }
      
      .stat-value {
        font-weight: bold;
      }
      
      .save-time, .play-time {
        display: flex;
        gap: 5px;
        color: #999;
        font-size: 14px;
      }
      
      .time-value {
        color: #ccc;
      }
      
      /* Action Buttons */
      .save-load-actions {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }
      
      .action-button {
        flex: 1;
        padding: 12px 20px;
        border: none;
        border-radius: 5px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      
      .save-button {
        background: #4fbdba;
        color: #fff;
      }
      
      .save-button:hover:not(:disabled) {
        background: #7ecdc9;
      }
      
      .load-button {
        background: #e94560;
        color: #fff;
      }
      
      .load-button:hover:not(:disabled) {
        background: #ff6b86;
      }
      
      .delete-button {
        background: #666;
        color: #fff;
      }
      
      .delete-button:hover:not(:disabled) {
        background: #888;
      }
      
      .action-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      /* Options */
      .save-load-options {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 15px;
        border-top: 1px solid #16213e;
      }
      
      .auto-save-toggle {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #fff;
        cursor: pointer;
      }
      
      .auto-save-toggle input {
        width: 20px;
        height: 20px;
        cursor: pointer;
      }
      
      .import-export-buttons {
        display: flex;
        gap: 10px;
      }
      
      .small-button {
        padding: 8px 15px;
        background: #16213e;
        border: 1px solid #0f3460;
        color: #fff;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .small-button:hover {
        background: #0f3460;
      }
      
      /* Quick Save Buttons */
      .quick-save-buttons {
        position: fixed;
        top: 10px;
        right: 10px;
        display: flex;
        gap: 10px;
        z-index: 1000;
      }
      
      .quick-button {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(22, 33, 62, 0.9);
        border: 2px solid #0f3460;
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }
      
      .quick-button:hover {
        background: rgba(79, 189, 186, 0.9);
        transform: scale(1.1);
      }
      
      .quick-button.save-success {
        background: rgba(76, 175, 80, 0.9);
        animation: pulse 0.5s ease;
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
      
      /* Auto-save Indicator */
      .auto-save-indicator {
        position: fixed;
        top: 60px;
        right: 10px;
        background: rgba(22, 33, 62, 0.9);
        border: 1px solid #0f3460;
        border-radius: 5px;
        padding: 8px 15px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #fff;
        z-index: 999;
        animation: slideIn 0.3s ease;
      }
      
      .auto-save-indicator.hidden {
        display: none;
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      .auto-save-icon {
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    
    document.head.appendChild(style);
  }
}