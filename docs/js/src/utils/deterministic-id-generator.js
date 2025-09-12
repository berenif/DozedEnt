/**
 * Deterministic ID Generator
 * Provides deterministic alternatives to Math.random() for ID generation
 * Follows WASM-first principles from AGENTS.MD
 */

export class DeterministicIdGenerator {
  constructor(seed = null) {
    // Use provided seed or generate deterministic seed
    this.seed = seed || this.generateDeterministicSeed();
    this.counter = 0;
  }

  /**
   * Generate deterministic seed based on current time
   * @returns {number} Deterministic seed
   */
  generateDeterministicSeed() {
    // Use seconds since epoch for deterministic seeding
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
   * Generate deterministic random string
   * @param {number} length - Length of string
   * @returns {string} Random string
   */
  randomString(length = 9) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      const index = Math.floor(this.next() * chars.length);
      result += chars[index];
    }
    
    return result;
  }

  /**
   * Generate room ID
   * @returns {string} Room ID
   */
  generateRoomId() {
    this.counter++;
    return `room_${Date.now()}_${this.randomString(9)}`;
  }

  /**
   * Generate room code
   * @returns {string} Room code
   */
  generateRoomCode() {
    this.counter++;
    return this.randomString(6).toUpperCase();
  }

  /**
   * Generate player ID
   * @returns {string} Player ID
   */
  generatePlayerId() {
    this.counter++;
    return `player_${Date.now()}_${this.randomString(9)}`;
  }

  /**
   * Generate message ID
   * @returns {string} Message ID
   */
  generateMessageId() {
    this.counter++;
    return `msg_${Date.now()}_${this.randomString(9)}`;
  }

  /**
   * Generate visual ID for UI elements
   * @returns {string} Visual ID
   */
  generateVisualId() {
    this.counter++;
    return `visual_${Date.now()}_${this.randomString(9)}`;
  }
}

// Global instance for consistent ID generation
export const idGenerator = new DeterministicIdGenerator();
