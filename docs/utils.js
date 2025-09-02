/**
 * Utility functions for the game
 */

// Generate a unique ID
export function genId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Convert object to JSON string
export function toJson(obj) {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    console.error('Failed to stringify object:', e);
    return '{}';
  }
}

// Parse JSON string to object
export function fromJson(str) {
  try {
    return typeof str === 'string' ? JSON.parse(str) : str;
  } catch (e) {
    console.error('Failed to parse JSON:', e);
    return {};
  }
}

// Clamp a value between min and max
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Linear interpolation
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

// Distance between two points
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Normalize a vector
export function normalize(x, y) {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

// Random number between min and max
export function random(min, max) {
  return Math.random() * (max - min) + min;
}

// Random integer between min and max (inclusive)
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Debounce function
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export default {
  genId,
  toJson,
  fromJson,
  clamp,
  lerp,
  distance,
  normalize,
  random,
  randomInt,
  debounce,
  throttle
};