/**
 * Room Code Manager
 * Handles room code formatting, validation, and generation
 */

export class RoomCodeManager {
    constructor() {
        this.storageKey = 'working-demo-last-room-code'
    }

    /**
     * Format a room code with proper formatting (ABC-123)
     * @param {string} value - Raw room code value
     * @returns {string} Formatted room code
     */
    formatRoomCode(value = '') {
        const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
        if (cleaned.length <= 3) return cleaned
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
    }

    /**
     * Validate if a room code is properly formatted
     * @param {string} raw - Raw room code (without formatting)
     * @returns {boolean} True if valid
     */
    isValidRoomCode(raw) {
        return /^[A-Z0-9]{6}$/.test(raw)
    }

    /**
     * Generate a random room code
     * @param {string} provided - Optional provided room code
     * @returns {string} Generated room code
     */
    generateRoomId(provided = '') {
        const rawProvided = provided.replace(/[^A-Z0-9]/g, '').slice(0, 6)
        if (rawProvided.length === 6) return rawProvided
        return Math.random().toString(36).slice(2, 8).toUpperCase()
    }

    /**
     * Save room code to localStorage
     * @param {string} code - Room code to save
     */
    saveRoomCode(code) {
        try {
            localStorage.setItem(this.storageKey, code)
        } catch (_) {
            // Ignore localStorage errors
        }
    }

    /**
     * Load room code from localStorage
     * @returns {string|null} Saved room code or null
     */
    loadRoomCode() {
        try {
            return localStorage.getItem(this.storageKey)
        } catch (_) {
            return null
        }
    }

    /**
     * Update room code status indicator
     * @param {HTMLElement} statusElement - Status element to update
     * @param {boolean} isValid - Whether the code is valid
     */
    updateRoomCodeStatus(statusElement, isValid) {
        if (!statusElement) return
        statusElement.innerHTML = isValid ? '&#10003;' : ''
        statusElement.classList.toggle('valid', isValid)
    }

    /**
     * Handle room code input with formatting
     * @param {Event} event - Input event
     * @param {HTMLElement} statusElement - Status element to update
     * @returns {string} Formatted room code
     */
    handleRoomCodeInput(event, statusElement) {
        const formatted = this.formatRoomCode(event.target.value)
        event.target.value = formatted
        const raw = formatted.replace(/[^A-Z0-9]/g, '')
        this.updateRoomCodeStatus(statusElement, this.isValidRoomCode(raw))
        if (raw.length <= 6) {
            this.saveRoomCode(raw)
        }
        return formatted
    }

    /**
     * Handle room code paste with formatting
     * @param {Event} event - Paste event
     * @param {HTMLElement} inputElement - Input element to update
     * @param {HTMLElement} statusElement - Status element to update
     * @returns {string} Formatted room code
     */
    handleRoomCodePaste(event, inputElement, statusElement) {
        const text = (event.clipboardData || window.clipboardData).getData('text')
        if (!text) return ''
        
        event.preventDefault()
        const formatted = this.formatRoomCode(text)
        inputElement.value = formatted
        const raw = formatted.replace(/[^A-Z0-9]/g, '')
        this.updateRoomCodeStatus(statusElement, this.isValidRoomCode(raw))
        this.saveRoomCode(raw)
        return formatted
    }
}

// Create singleton instance
export const roomCodeManager = new RoomCodeManager()

export default roomCodeManager
