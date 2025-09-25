/**
 * Environment Injection Template
 * 
 * This file demonstrates how to use __PLACEHOLDER__ tokens that will be
 * replaced with actual values during the deployment process.
 * 
 * These tokens are automatically replaced by the GitHub Actions workflow
 * during the build process.
 */

// Example usage of environment injection tokens
export const ENVIRONMENT_CONFIG = {
  // Protocol versions (injected at deployment time)
  clientProtocolVersion: '__CLIENT_PROTOCOL_VERSION__',
  serverProtocolVersion: '__SERVER_PROTOCOL_VERSION__',
  
  // Build information (injected at deployment time)
  buildEnvironment: '__BUILD_ENVIRONMENT__',
  deploymentTimestamp: '__DEPLOYMENT_TIMESTAMP__',
  buildTime: '__BUILD_TIME__',
  
  // Runtime configuration
  isProduction: '__BUILD_ENVIRONMENT__' === 'production',
  isDevelopment: '__BUILD_ENVIRONMENT__' === 'development',
  
  // Version compatibility check
  protocolVersionsMatch: '__CLIENT_PROTOCOL_VERSION__' === '__SERVER_PROTOCOL_VERSION__'
}

/**
 * Get the current environment configuration
 * @returns {Object} environment configuration object
 */
export function getEnvironmentConfig() {
  return {
    ...ENVIRONMENT_CONFIG,
    // Additional runtime information
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    url: window.location.href
  }
}

/**
 * Validate that environment variables were properly injected
 * @returns {boolean} true if all tokens were replaced
 */
export function validateEnvironmentInjection() {
  const config = ENVIRONMENT_CONFIG
  
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
  console.log(`   Client Protocol: ${config.clientProtocolVersion}`)
  console.log(`   Server Protocol: ${config.serverProtocolVersion}`)
  console.log(`   Environment: ${config.buildEnvironment}`)
  console.log(`   Build Time: ${config.buildTime}`)
  
  return true
}

/**
 * Check protocol version compatibility
 * @returns {boolean} true if versions are compatible
 */
export function checkProtocolCompatibility() {
  const config = ENVIRONMENT_CONFIG
  
  if (config.clientProtocolVersion !== config.serverProtocolVersion) {
    console.error('❌ Protocol version mismatch detected at runtime!')
    console.error(`   Client: ${config.clientProtocolVersion}`)
    console.error(`   Server: ${config.serverProtocolVersion}`)
    return false
  }
  
  console.log(`✅ Protocol versions compatible: ${config.clientProtocolVersion}`)
  return true
}

// Auto-validate on module load (in production)
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  validateEnvironmentInjection()
  checkProtocolCompatibility()
}
