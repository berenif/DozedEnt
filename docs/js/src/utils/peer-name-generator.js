/**
 * Peer Name Generator
 * Generates random peer names based on English words combined with animals
 */

export class PeerNameGenerator {
  constructor() {
    // English adjectives/descriptors
    this.descriptors = [
      'Swift', 'Bold', 'Clever', 'Brave', 'Fierce', 'Wild', 'Noble', 'Proud',
      'Silent', 'Bright', 'Dark', 'Golden', 'Silver', 'Crimson', 'Azure', 'Emerald',
      'Ancient', 'Young', 'Wise', 'Strong', 'Quick', 'Gentle', 'Mighty', 'Graceful',
      'Mysterious', 'Loyal', 'Free', 'Spirited', 'Majestic', 'Elegant', 'Fierce',
      'Cunning', 'Bold', 'Swift', 'Proud', 'Wild', 'Noble', 'Bright', 'Dark'
    ]

    // Animal names
    this.animals = [
      'Wolf', 'Eagle', 'Lion', 'Tiger', 'Bear', 'Fox', 'Hawk', 'Raven',
      'Panther', 'Lynx', 'Falcon', 'Owl', 'Coyote', 'Jaguar', 'Leopard', 'Cheetah',
      'Dragon', 'Phoenix', 'Griffin', 'Unicorn', 'Pegasus', 'Kraken', 'Basilisk',
      'Salamander', 'Serpent', 'Viper', 'Cobra', 'Python', 'Shark', 'Orca',
      'Dolphin', 'Whale', 'Stag', 'Buck', 'Doe', 'Ram', 'Bull', 'Stallion',
      'Mare', 'Colt', 'Filly', 'Cub', 'Pup', 'Kit', 'Chick', 'Fawn'
    ]

    // Used names to avoid duplicates
    this.usedNames = new Set()
  }

  /**
   * Generate a random peer name
   * @returns {string} Random peer name in format "DescriptorAnimal"
   */
  generateName() {
    let attempts = 0
    const maxAttempts = 100

    while (attempts < maxAttempts) {
      const descriptor = this.descriptors[Math.floor(Math.random() * this.descriptors.length)]
      const animal = this.animals[Math.floor(Math.random() * this.animals.length)]
      const name = `${descriptor}${animal}`

      if (!this.usedNames.has(name)) {
        this.usedNames.add(name)
        return name
      }

      attempts++
    }

    // Fallback: add random number if all combinations are used
    const descriptor = this.descriptors[Math.floor(Math.random() * this.descriptors.length)]
    const animal = this.animals[Math.floor(Math.random() * this.animals.length)]
    const randomNum = Math.floor(Math.random() * 9999) + 1
    return `${descriptor}${animal}${randomNum}`
  }

  /**
   * Generate multiple unique names
   * @param {number} count - Number of names to generate
   * @returns {Array<string>} Array of unique peer names
   */
  generateNames(count) {
    const names = []
    for (let i = 0; i < count; i++) {
      names.push(this.generateName())
    }
    return names
  }

  /**
   * Check if a name is already used
   * @param {string} name - Name to check
   * @returns {boolean} True if name is already used
   */
  isNameUsed(name) {
    return this.usedNames.has(name)
  }

  /**
   * Release a name back to the pool
   * @param {string} name - Name to release
   */
  releaseName(name) {
    this.usedNames.delete(name)
  }

  /**
   * Clear all used names
   */
  clearUsedNames() {
    this.usedNames.clear()
  }

  /**
   * Get all available descriptor-animal combinations
   * @returns {Array<string>} All possible combinations
   */
  getAllPossibleNames() {
    const combinations = []
    for (const descriptor of this.descriptors) {
      for (const animal of this.animals) {
        combinations.push(`${descriptor}${animal}`)
      }
    }
    return combinations
  }

  /**
   * Get statistics about name generation
   * @returns {Object} Statistics object
   */
  getStats() {
    const totalPossible = this.descriptors.length * this.animals.length
    const usedCount = this.usedNames.size
    const availableCount = totalPossible - usedCount

    return {
      totalPossible,
      usedCount,
      availableCount,
      usagePercentage: (usedCount / totalPossible * 100).toFixed(2)
    }
  }
}

// Create a singleton instance
export const peerNameGenerator = new PeerNameGenerator()

// Export default instance
export default peerNameGenerator
