export function emitInitializationEvent(details) {
  try {
    const event = new CustomEvent('wasmInitialization', { detail: details });
    document.dispatchEvent(event);
  } catch (error) {
    console.warn('Failed to emit WASM initialization event:', error);
  }
}
