// Thin JS wrapper around WASM upgrade exports (works with project's wasmApi)
import { createStringCodec } from '../utils/wasm.js';

function readCString(memory, ptr, maxBytes = 1 << 20) {
  if (!ptr || !memory) return '';
  const view = new Uint8Array(memory.buffer);
  let end = ptr;
  const limit = Math.min(view.length, ptr + maxBytes);
  while (end < limit && view[end] !== 0) end++;
  return new TextDecoder().decode(view.subarray(ptr, end));
}

export class ProgressionBridge {
  constructor(wasmApi) {
    this.exports = wasmApi?.exports || {};
    this.memory = wasmApi?.memory || null;
    this.codec = null;
    if (this.memory && typeof this.exports.malloc === 'function') {
      this.codec = createStringCodec({ memory: this.memory, exports: this.exports });
    }
    if (typeof this.exports.upgrade_create_system === 'function') {
      try { this.exports.upgrade_create_system(); } catch {}
    }
  }

  setTree(classId, treeJson) {
    if (!this.codec || typeof this.exports.upgrade_set_tree !== 'function') return;
    const { ptr, len } = this.codec.toWasm(treeJson);
    try {
      this.exports.upgrade_set_tree(classId, ptr, len);
    } finally {
      // no free available in this runtime helper; rely on wasm GC or exported free if present
      if (typeof this.exports.free === 'function') this.exports.free(ptr);
    }
  }

  setState(classId, stateJson) {
    if (!this.codec || typeof this.exports.upgrade_set_state !== 'function') return;
    const { ptr, len } = this.codec.toWasm(stateJson);
    try {
      this.exports.upgrade_set_state(classId, ptr, len);
    } finally {
      if (typeof this.exports.free === 'function') this.exports.free(ptr);
    }
  }

  getState(classId) {
    if (typeof this.exports.upgrade_get_state !== 'function') return null;
    const cPtr = this.exports.upgrade_get_state(classId);
    const json = readCString(this.memory, cPtr);
    try { return json ? JSON.parse(json) : null; } catch { return null; }
  }

  getEssence(classId) {
    if (typeof this.exports.upgrade_get_essence !== 'function') return 0;
    return this.exports.upgrade_get_essence(classId) | 0;
  }

  canPurchase(classId, nodeId) {
    if (typeof this.exports.upgrade_can_purchase !== 'function') return 9;
    return this.exports.upgrade_can_purchase(classId, nodeId) | 0;
  }

  addEssence(classId, delta) {
    if (typeof this.exports.upgrade_add_essence !== 'function') return;
    this.exports.upgrade_add_essence(classId, delta | 0);
  }

  purchase(classId, nodeId) {
    if (typeof this.exports.upgrade_purchase !== 'function') return 9;
    return this.exports.upgrade_purchase(classId, nodeId | 0) | 0;
  }

  resetClass(classId) {
    if (typeof this.exports.upgrade_reset_class !== 'function') return;
    this.exports.upgrade_reset_class(classId);
  }

  getEffectScalar(classId, key) {
    if (!this.codec || typeof this.exports.upgrade_get_effect_scalar !== 'function') return 0;
    const { ptr, len } = this.codec.toWasm(key);
    try {
      const raw = this.exports.upgrade_get_effect_scalar(classId, ptr, len);
      return raw / 65536.0;
    } finally {
      if (typeof this.exports.free === 'function') this.exports.free(ptr);
    }
  }
}


