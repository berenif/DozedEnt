/**
 * Save/Load System JavaScript Integration
 * 
 * Provides JavaScript interface for the WASM save/load system
 * Handles data serialization, localStorage integration, and file operations
 */

class SaveLoadManager {
    constructor(wasmModule) {
        this.wasm = wasmModule;
        this.saveSlotCount = 5;
        this.autoSaveInterval = 300000; // 5 minutes in milliseconds
        this.autoSaveTimer = null;
        this.lastAutoSave = 0;
        
        // Initialize auto-save timer
        this.startAutoSave();
    }
    
    /**
     * Create a save game
     * @param {number} slot - Save slot number (0-4)
     * @param {string} name - Save name (optional)
     * @returns {boolean} Success status
     */
    createSave(slot = 0, name = null) {
        try {
            // Validate slot
            if (slot < 0 || slot >= this.saveSlotCount) {
                console.error('Invalid save slot:', slot);
                return false;
            }
            
            // Create save data in WASM
            const saveDataPtr = this.wasm.get_save_data_ptr();
            const saveDataSize = this.wasm.get_save_data_size_bytes();
            
            if (!saveDataPtr || saveDataSize === 0) {
                console.error('Failed to create save data');
                return false;
            }
            
            // Copy data from WASM memory
            const saveData = new Uint8Array(this.wasm.memory.buffer, saveDataPtr, saveDataSize);
            
            // Create save metadata
            const saveMetadata = {
                slot: slot,
                name: name || `Save ${slot + 1}`,
                timestamp: Date.now(),
                version: this.wasm.get_save_data_version(),
                size: saveDataSize,
                checksum: this.calculateChecksum(saveData)
            };
            
            // Store in localStorage
            const saveKey = `save_slot_${slot}`;
            const metadataKey = `save_metadata_${slot}`;
            
            localStorage.setItem(saveKey, this.arrayBufferToBase64(saveData.buffer));
            localStorage.setItem(metadataKey, JSON.stringify(saveMetadata));
            
            console.log(`Save created in slot ${slot}:`, saveMetadata.name);
            return true;
            
        } catch (error) {
            console.error('Error creating save:', error);
            return false;
        }
    }
    
    /**
     * Load a save game
     * @param {number} slot - Save slot number (0-4)
     * @returns {boolean} Success status
     */
    loadSave(slot = 0) {
        try {
            // Validate slot
            if (slot < 0 || slot >= this.saveSlotCount) {
                console.error('Invalid save slot:', slot);
                return false;
            }
            
            // Get save data from localStorage
            const saveKey = `save_slot_${slot}`;
            const metadataKey = `save_metadata_${slot}`;
            
            const saveDataBase64 = localStorage.getItem(saveKey);
            const metadataStr = localStorage.getItem(metadataKey);
            
            if (!saveDataBase64 || !metadataStr) {
                console.error('Save slot is empty:', slot);
                return false;
            }
            
            // Parse metadata
            const metadata = JSON.parse(metadataStr);
            
            // Convert base64 to array buffer
            const saveDataBuffer = this.base64ToArrayBuffer(saveDataBase64);
            const saveData = new Uint8Array(saveDataBuffer);
            
            // Validate save data
            if (!this.wasm.validate_save_data_from_ptr(saveData, saveData.length)) {
                console.error('Save data validation failed');
                return false;
            }
            
            // Load save data into WASM
            const success = this.wasm.load_game_from_save(saveData, saveData.length);
            
            if (success) {
                console.log(`Save loaded from slot ${slot}:`, metadata.name);
                return true;
            } else {
                console.error('Failed to load save data into WASM');
                return false;
            }
            
        } catch (error) {
            console.error('Error loading save:', error);
            return false;
        }
    }
    
    /**
     * Delete a save game
     * @param {number} slot - Save slot number (0-4)
     * @returns {boolean} Success status
     */
    deleteSave(slot = 0) {
        try {
            if (slot < 0 || slot >= this.saveSlotCount) {
                return false;
            }
            
            const saveKey = `save_slot_${slot}`;
            const metadataKey = `save_metadata_${slot}`;
            
            localStorage.removeItem(saveKey);
            localStorage.removeItem(metadataKey);
            
            console.log(`Save deleted from slot ${slot}`);
            return true;
            
        } catch (error) {
            console.error('Error deleting save:', error);
            return false;
        }
    }
    
    /**
     * Get save metadata for all slots
     * @returns {Array} Array of save metadata objects
     */
    getSaveSlots() {
        const slots = [];
        
        for (let i = 0; i < this.saveSlotCount; i++) {
            const metadataKey = `save_metadata_${i}`;
            const metadataStr = localStorage.getItem(metadataKey);
            
            if (metadataStr) {
                try {
                    const metadata = JSON.parse(metadataStr);
                    slots.push({
                        slot: i,
                        ...metadata,
                        exists: true
                    });
                } catch (error) {
                    console.error(`Error parsing metadata for slot ${i}:`, error);
                    slots.push({
                        slot: i,
                        exists: false,
                        error: 'Corrupted metadata'
                    });
                }
            } else {
                slots.push({
                    slot: i,
                    exists: false
                });
            }
        }
        
        return slots;
    }
    
    /**
     * Export save data as downloadable file
     * @param {number} slot - Save slot number (0-4)
     * @param {string} filename - Optional filename
     */
    exportSave(slot = 0, filename = null) {
        try {
            const saveKey = `save_slot_${slot}`;
            const metadataKey = `save_metadata_${slot}`;
            
            const saveDataBase64 = localStorage.getItem(saveKey);
            const metadataStr = localStorage.getItem(metadataKey);
            
            if (!saveDataBase64) {
                console.error('No save data to export');
                return false;
            }
            
            const metadata = metadataStr ? JSON.parse(metadataStr) : {};
            const saveDataBuffer = this.base64ToArrayBuffer(saveDataBase64);
            
            // Create download
            const blob = new Blob([saveDataBuffer], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || `save_slot_${slot}_${metadata.name || 'unnamed'}.sav`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            console.log(`Save exported from slot ${slot}`);
            return true;
            
        } catch (error) {
            console.error('Error exporting save:', error);
            return false;
        }
    }
    
    /**
     * Import save data from file
     * @param {File} file - File object from file input
     * @param {number} slot - Target save slot (0-4)
     * @returns {Promise<boolean>} Success status
     */
    async importSave(file, slot = 0) {
        try {
            if (slot < 0 || slot >= this.saveSlotCount) {
                return false;
            }
            
            const arrayBuffer = await file.arrayBuffer();
            const saveData = new Uint8Array(arrayBuffer);
            
            // Validate save data
            if (!this.wasm.validate_save_data_from_ptr(saveData, saveData.length)) {
                console.error('Imported save data validation failed');
                return false;
            }
            
            // Store in localStorage
            const saveKey = `save_slot_${slot}`;
            const metadataKey = `save_metadata_${slot}`;
            
            const saveDataBase64 = this.arrayBufferToBase64(arrayBuffer);
            const metadata = {
                slot: slot,
                name: file.name.replace('.sav', ''),
                timestamp: Date.now(),
                version: this.wasm.get_save_data_version(),
                size: saveData.length,
                checksum: this.calculateChecksum(saveData),
                imported: true
            };
            
            localStorage.setItem(saveKey, saveDataBase64);
            localStorage.setItem(metadataKey, JSON.stringify(metadata));
            
            console.log(`Save imported to slot ${slot}:`, metadata.name);
            return true;
            
        } catch (error) {
            console.error('Error importing save:', error);
            return false;
        }
    }
    
    /**
     * Perform quick save (auto-save to slot 0)
     * @returns {boolean} Success status
     */
    quickSave() {
        return this.createSave(0, 'Quick Save');
    }
    
    /**
     * Start auto-save timer
     */
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setInterval(() => {
            this.performAutoSave();
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
     * Perform auto-save if conditions are met
     */
    performAutoSave() {
        try {
            // Check if auto-save should trigger
            const shouldAutoSave = this.wasm.check_auto_save();
            
            if (shouldAutoSave) {
                // Create auto-save
                const timestamp = new Date().toISOString();
                const success = this.createSave(0, `Auto Save ${timestamp}`);
                
                if (success) {
                    this.lastAutoSave = Date.now();
                    console.log('Auto-save completed');
                }
            }
        } catch (error) {
            console.error('Error during auto-save:', error);
        }
    }
    
    /**
     * Get current save statistics
     * @returns {Object} Save statistics
     */
    getSaveStatistics() {
        try {
            const statsStr = this.wasm.get_save_statistics_json();
            return JSON.parse(statsStr);
        } catch (error) {
            console.error('Error getting save statistics:', error);
            return null;
        }
    }
    
    /**
     * Clear current save data
     */
    clearCurrentSave() {
        this.wasm.clear_current_save();
    }
    
    /**
     * Utility: Convert ArrayBuffer to base64
     * @param {ArrayBuffer} buffer - ArrayBuffer to convert
     * @returns {string} Base64 string
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    
    /**
     * Utility: Convert base64 to ArrayBuffer
     * @param {string} base64 - Base64 string
     * @returns {ArrayBuffer} ArrayBuffer
     */
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
    
    /**
     * Utility: Calculate checksum for data validation
     * @param {Uint8Array} data - Data to checksum
     * @returns {number} Checksum
     */
    calculateChecksum(data) {
        let checksum = 0;
        for (let i = 0; i < data.length; i++) {
            checksum = ((checksum << 5) + checksum) + data[i];
        }
        return checksum;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SaveLoadManager;
} else if (typeof window !== 'undefined') {
    window.SaveLoadManager = SaveLoadManager;
}