/**
 * Environment Configuration Utility
 * 
 * This module provides access to environment variables that are injected
 * at deployment time. Use this instead of hardcoded values.
 */

// Environment configuration with placeholder tokens
// These will be replaced with actual values during deployment
export const ENV_CONFIG = {
  // Protocol versions
  CLIENT_PROTOCOL_VERSION: '__CLIENT_PROTOCOL_VERSION__',
  SERVER_PROTOCOL_VERSION: '__SERVER_PROTOCOL_VERSION__',
  
  // Build information
  BUILD_ENVIRONMENT: '__BUILD_ENVIRONMENT__',
  DEPLOYMENT_TIMESTAMP: '__DEPLOYMENT_TIMESTAMP__',
  BUILD_TIME: '__BUILD_TIME__',
  
  // Computed values
  IS_PRODUCTION: '__BUILD_ENVIRONMENT__' === 'production',
  IS_DEVELOPMENT: '__BUILD_ENVIRONMENT__' === 'development',
  
  // Protocol compatibility
  PROTOCOL_VERSIONS_MATCH: '__CLIENT_PROTOCOL_VERSION__' === '__SERVER_PROTOCOL_VERSION__'
}

/**
 * Get the current environment configuration
 * @returns {Object} environment configuration object
 */
export function getEnvironmentConfig() {
  return {
    ...ENV_CONFIG,
    // Additional runtime information
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.href : 'unknown'
  }
}

/**
 * Validate that environment variables were properly injected
 * @returns {boolean} true if all tokens were replaced
 */
export function validateEnvironmentInjection() {
  const config = ENV_CONFIG
  
  // Check if any __PLACEHOLDER__ tokens remain (indicating failed injection)
  const hasPlaceholders = Object.values(config).some(value => 
    typeof value === 'string' && value.includes('__')
  )
  
  if (hasPlaceholders) {
    console.error('❌ Environment injection failed - placeholder tokens remain')
    console.error('   This indicates the deployment process did not properly inject environment variables')
    return false
  }
  
  console.log('✅ Environment injection validated successfully')
  console.log(`   Client Protocol: ${config.CLIENT_PROTOCOL_VERSION}`)
  console.log(`   Server Protocol: ${config.SERVER_PROTOCOL_VERSION}`)
  console.log(`   Environment: ${config.BUILD_ENVIRONMENT}`)
  console.log(`   Build Time: ${config.BUILD_TIME}`)
  
  return true
}

/**
 * Check protocol version compatibility
 * @returns {boolean} true if versions are compatible
 */
export function checkProtocolCompatibility() {
  const config = ENV_CONFIG
  
  if (config.CLIENT_PROTOCOL_VERSION !== config.SERVER_PROTOCOL_VERSION) {
    console.error('❌ Protocol version mismatch detected at runtime!')
    console.error(`   Client: ${config.CLIENT_PROTOCOL_VERSION}`)
    console.error(`   Server: ${config.SERVER_PROTOCOL_VERSION}`)
    return false
  }
  
  console.log(`✅ Protocol versions compatible: ${config.CLIENT_PROTOCOL_VERSION}`)
  return true
}

/**
 * Get the protocol version string for display
 * @returns {string} formatted version string
 */
export function getProtocolVersionString() {
  return `${ENV_CONFIG.CLIENT_PROTOCOL_VERSION} (Client) / ${ENV_CONFIG.SERVER_PROTOCOL_VERSION} (Server)`
}

/**
 * Check if we're running in production
 * @returns {boolean} true if production environment
 */
export function isProduction() {
  return ENV_CONFIG.IS_PRODUCTION
}

/**
 * Check if we're running in development
 * @returns {boolean} true if development environment
 */
export function isDevelopment() {
  return ENV_CONFIG.IS_DEVELOPMENT
}

// Auto-validate on module load (in production only)
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  // Run validation in production
  setTimeout(() => {
    validateEnvironmentInjection()
    checkProtocolCompatibility()
  }, 1000) // Delay to allow other modules to load
}
