/**
 * Main Utils Export Module
 * Central export point for utility functions
 */

// Export WASM utilities
export * from './wasm.js'

// Generic utility functions
export function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export function throttle(func, limit) {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function lerp(start, end, t) {
  return start + (end - start) * t
}

export default {
  generateId,
  debounce,
  throttle,
  clamp,
  lerp
}