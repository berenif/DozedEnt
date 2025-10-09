/**
 * WasmRNG - Facade for random number generation
 * Uses WASM RNG when available, falls back to deterministic RNG with warnings
 * Follows WASM-first principles from AGENTS.md
 */

export class WasmRNG {
  constructor(wasmExports, category = 'UI') {
    this.wasmExports = wasmExports;
    this.category = category;
    
    // Warn if used in gameplay
    if (category === 'GAMEPLAY') {
      console.error('WasmRNG: Do not use for gameplay! Use WASM RNG directly.');
    }
  }
  
  /**
   * Get random value (uses WASM if available, fallback to Math.random with warning)
   */
  random() {
    if (this.wasmExports?.get_random_float) {
      return this.wasmExports.get_random_float();
    }
    
    // Fallback with warning
    if (this.category !== 'UI_ONLY') {
      console.warn(`WasmRNG fallback for ${this.category} - may cause desync`);
    }
    
    return Math.random();
  }
  
  /**
   * Get random integer in range [min, max)
   */
  randomInt(min, max) {
    return Math.floor(this.random() * (max - min)) + min;
  }
  
  /**
   * Choose random element from array
   */
  choose(array) {
    return array[this.randomInt(0, array.length)];
  }
  
  /**
   * Get random boolean
   */
  randomBoolean() {
    return this.random() < 0.5;
  }
  
  /**
   * Get random float in range [min, max)
   */
  randomFloat(min, max) {
    return min + this.random() * (max - min);
  }
  
  /**
   * Shuffle array in place
   */
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  
  /**
   * Get random color (hex)
   */
  randomColor() {
    const r = this.randomInt(0, 256);
    const g = this.randomInt(0, 256);
    const b = this.randomInt(0, 256);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  /**
   * Get random angle in radians
   */
  randomAngle() {
    return this.random() * Math.PI * 2;
  }
  
  /**
   * Get random point in circle
   */
  randomPointInCircle(radius = 1) {
    const angle = this.randomAngle();
    const r = Math.sqrt(this.random()) * radius;
    return {
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r
    };
  }
  
  /**
   * Get random point in rectangle
   */
  randomPointInRect(width, height) {
    return {
      x: this.randomFloat(0, width),
      y: this.randomFloat(0, height)
    };
  }
  
  /**
   * Weighted random choice
   */
  weightedChoice(items, weights) {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = this.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }
  
  /**
   * Get random string
   */
  randomString(length = 8, charset = 'abcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset[this.randomInt(0, charset.length)];
    }
    return result;
  }
  
  /**
   * Get random UUID v4
   */
  randomUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = this.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  /**
   * Get random normal distribution (Box-Muller transform)
   */
  randomNormal(mean = 0, stdDev = 1) {
    if (this._spare !== undefined) {
      const spare = this._spare;
      this._spare = undefined;
      return spare * stdDev + mean;
    }
    
    const u1 = this.random();
    const u2 = this.random();
    const mag = stdDev * Math.sqrt(-2 * Math.log(u1));
    this._spare = mag * Math.cos(2 * Math.PI * u2);
    return mag * Math.sin(2 * Math.PI * u2) + mean;
  }
  
  /**
   * Get random exponential distribution
   */
  randomExponential(lambda = 1) {
    return -Math.log(this.random()) / lambda;
  }
  
  /**
   * Get random poisson distribution
   */
  randomPoisson(lambda) {
    let k = 0;
    let p = 1;
    const L = Math.exp(-lambda);
    
    do {
      k++;
      p *= this.random();
    } while (p > L);
    
    return k - 1;
  }
  
  /**
   * Set WASM exports
   */
  setWasmExports(wasmExports) {
    this.wasmExports = wasmExports;
  }
  
  /**
   * Get category
   */
  getCategory() {
    return this.category;
  }
  
  /**
   * Check if using WASM
   */
  isUsingWasm() {
    return this.wasmExports?.get_random_float !== undefined;
  }
}

// Export singleton instances for common use cases
export const uiRNG = new WasmRNG(null, 'UI_ONLY');
export const vfxRNG = new WasmRNG(null, 'VFX');
export const audioRNG = new WasmRNG(null, 'AUDIO');

// Export default instance
export default uiRNG;
