/**
 * Deterministic ID Generator
 * Provides deterministic alternatives to Math.random() for ID generation
 * Uses crypto-secure random values when available, falls back to deterministic generation
 * Follows WASM-first principles from AGENTS.MD
 */

export class DeterministicIdGenerator {
  constructor(seed = null) {
    // Use provided seed or generate deterministic seed
    this.seed = seed || this.generateDeterministicSeed();
    this.counter = 0;
    
    // Check for crypto availability
    this.crypto = this.getCrypto();
  }
  
  /**
   * Get crypto interface if available
   * @returns {Crypto|null} Crypto interface or null
   */
  getCrypto() {
    try {
      if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
        return globalThis.crypto;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Generate deterministic seed based on current time
   * @returns {number} Deterministic seed
   */
  generateDeterministicSeed() {
    // Use seconds since epoch for deterministic seeding
    // Avoid Math.random() - use deterministic time-based seed
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Simple deterministic RNG using Linear Congruential Generator
   * @returns {number} Random number between 0 and 1
   */
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) % 2147483647;
    return this.seed / 2147483647;
  }

  /**
   * Generate random string (crypto-secure if available, deterministic fallback)
   * @param {number} length - Length of string
   * @param {boolean} forceSecure - Force crypto-secure generation for sensitive IDs
   * @returns {string} Random string
   */
  randomString(length = 9, forceSecure = false) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    
    if (this.crypto && forceSecure) {
      // Use cryptographically secure random values for sensitive IDs
      const bytes = new Uint8Array(length);
      this.crypto.getRandomValues(bytes);
      return Array.from(bytes, byte => chars[byte % chars.length]).join('');
    } else if (this.crypto && !forceSecure) {
      // Use crypto for better randomness but not necessarily for security
      const bytes = new Uint8Array(length);
      this.crypto.getRandomValues(bytes);
      return Array.from(bytes, byte => chars[byte % chars.length]).join('');
    } 
      // Fallback to deterministic generation
      let result = '';
      for (let i = 0; i < length; i++) {
        const index = Math.floor(this.next() * chars.length);
        result += chars[index];
      }
      return result;
    
  }

  /**
   * Generate room ID (crypto-secure for privacy)
   * @returns {string} Room ID
   */
  generateRoomId() {
    this.counter++;
    return `room_${Date.now()}_${this.randomString(9, true)}`; // Force secure
  }

  /**
   * Generate room code (crypto-secure for privacy)
   * @returns {string} Room code
   */
  generateRoomCode() {
    this.counter++;
    return this.randomString(6, true).toUpperCase(); // Force secure
  }

  /**
   * Generate player ID (crypto-secure for privacy)
   * @returns {string} Player ID
   */
  generatePlayerId() {
    this.counter++;
    return `player_${Date.now()}_${this.randomString(9, true)}`; // Force secure
  }

  /**
   * Generate message ID (crypto-secure for privacy)
   * @returns {string} Message ID
   */
  generateMessageId() {
    this.counter++;
    return `msg_${Date.now()}_${this.randomString(9, true)}`; // Force secure
  }

  /**
   * Generate visual ID for UI elements (deterministic is fine)
   * @returns {string} Visual ID
   */
  generateVisualId() {
    this.counter++;
    return `visual_${Date.now()}_${this.randomString(9, false)}`; // Don't force secure
  }

  /**
   * Generate session token (crypto-secure for security)
   * @returns {string} Session token
   */
  generateSessionToken() {
    this.counter++;
    return this.randomString(32, true); // Force secure, longer length
  }

  /**
   * Generate API key (crypto-secure for security)
   * @returns {string} API key
   */
  generateApiKey() {
    this.counter++;
    return this.randomString(40, true); // Force secure, longer length
  }
}

// Global instance for consistent ID generation
export const idGenerator = new DeterministicIdGenerator();
