/**
 * Protocol Version Configuration
 * 
 * This file defines the protocol versions used by the client and server.
 * These versions must match for the application to function correctly.
 * 
 * The build process will validate that these versions are compatible.
 */

export const PROTOCOL_VERSIONS = {
  // Client protocol version - defines the client's communication protocol
  CLIENT: '1.0.0',
  
  // Server protocol version - defines the server's communication protocol  
  SERVER: '1.0.0',
  
  // MQTT protocol version - used for MQTT broker connections
  MQTT: 4, // MQTT 3.1.1
  
  // WebRTC protocol version - used for P2P connections
  WEBRTC: '1.0.0',
  
  // Game protocol version - defines game state synchronization protocol
  GAME: '1.0.0'
}

/**
 * Validate that client and server protocol versions are compatible
 * @returns {boolean} true if versions are compatible
 */
export function validateProtocolVersions() {
  const clientVersion = PROTOCOL_VERSIONS.CLIENT
  const serverVersion = PROTOCOL_VERSIONS.SERVER
  
  if (clientVersion !== serverVersion) {
    console.error('❌ Protocol version mismatch!')
    console.error(`   Client version: ${clientVersion}`)
    console.error(`   Server version: ${serverVersion}`)
    return false
  }
  
  console.log(`✅ Protocol versions match: ${clientVersion}`)
  return true
}

/**
 * Get the current protocol version string for display
 * @returns {string} formatted version string
 */
export function getProtocolVersionString() {
  return `${PROTOCOL_VERSIONS.CLIENT} (Client) / ${PROTOCOL_VERSIONS.SERVER} (Server)`
}

/**
 * Check if a given version is compatible with the current protocol
 * @param {string} version - version to check
 * @returns {boolean} true if compatible
 */
export function isVersionCompatible(version) {
  return version === PROTOCOL_VERSIONS.CLIENT
}

// Export individual versions for convenience
export const CLIENT_PROTOCOL_VERSION = PROTOCOL_VERSIONS.CLIENT
export const SERVER_PROTOCOL_VERSION = PROTOCOL_VERSIONS.SERVER
export const MQTT_PROTOCOL_VERSION = PROTOCOL_VERSIONS.MQTT
export const WEBRTC_PROTOCOL_VERSION = PROTOCOL_VERSIONS.WEBRTC
export const GAME_PROTOCOL_VERSION = PROTOCOL_VERSIONS.GAME
