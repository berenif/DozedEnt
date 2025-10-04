export async function decompressIfNeeded(arrayBuffer, {
  enableCompression = true,
  compressionThreshold = 1024 * 50
} = {}, { logger = console, sourcePath = '' } = {}) {
  if (!enableCompression) {
    return arrayBuffer;
  }

  if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) {
    logger.warn('WASM compression: invalid buffer received for decompression');
    return arrayBuffer;
  }

  if (arrayBuffer.byteLength < compressionThreshold) {
    return arrayBuffer;
  }

  // Placeholder for real decompression logic. Return as-is for now.
  logger.debug?.(`WASM compression: no-op decompression for ${sourcePath || 'unknown source'}`);
  return arrayBuffer;
}
