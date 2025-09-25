#!/usr/bin/env node

/**
 * Protocol Version Validation Script
 * 
 * This script validates that client and server protocol versions are compatible
 * and fails the build if they don't match.
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')

console.log('🔍 Validating protocol versions...')

// Read protocol versions from config
const protocolConfigPath = join(projectRoot, 'src', 'config', 'protocol-versions.js')
let protocolVersions

try {
  const configContent = readFileSync(protocolConfigPath, 'utf8')
  
  // Extract version constants using regex
  const clientMatch = configContent.match(/CLIENT:\s*['"`]([^'"`]+)['"`]/)
  const serverMatch = configContent.match(/SERVER:\s*['"`]([^'"`]+)['"`]/)
  
  if (!clientMatch || !serverMatch) {
    throw new Error('Could not extract protocol versions from config')
  }
  
  protocolVersions = {
    CLIENT: clientMatch[1],
    SERVER: serverMatch[1]
  }
  
  console.log(`📋 Found protocol versions:`)
  console.log(`   Client: ${protocolVersions.CLIENT}`)
  console.log(`   Server: ${protocolVersions.SERVER}`)
  
} catch (error) {
  console.error('❌ Error reading protocol configuration:', error.message)
  process.exit(1)
}

// Validate protocol versions
function validateProtocolVersions() {
  const { CLIENT, SERVER } = protocolVersions
  
  if (CLIENT !== SERVER) {
    console.error('❌ Protocol version mismatch!')
    console.error(`   Client version: ${CLIENT}`)
    console.error(`   Server version: ${SERVER}`)
    console.error('   Build failed due to incompatible protocol versions.')
    console.error('   Please update the protocol versions in src/config/protocol-versions.js')
    return false
  }
  
  console.log(`✅ Protocol versions match: ${CLIENT}`)
  return true
}

// Check for environment variable overrides
const envClientVersion = process.env.CLIENT_PROTOCOL_VERSION
const envServerVersion = process.env.SERVER_PROTOCOL_VERSION

if (envClientVersion || envServerVersion) {
  console.log('🔧 Environment variable overrides detected:')
  
  if (envClientVersion) {
    console.log(`   CLIENT_PROTOCOL_VERSION: ${envClientVersion}`)
    protocolVersions.CLIENT = envClientVersion
  }
  
  if (envServerVersion) {
    console.log(`   SERVER_PROTOCOL_VERSION: ${envServerVersion}`)
    protocolVersions.SERVER = envServerVersion
  }
}

// Run validation
const isValid = validateProtocolVersions()

if (!isValid) {
  console.error('')
  console.error('🚨 BUILD FAILED: Protocol version validation failed')
  console.error('')
  console.error('To fix this issue:')
  console.error('1. Update src/config/protocol-versions.js to match versions')
  console.error('2. Or set environment variables:')
  console.error('   CLIENT_PROTOCOL_VERSION=1.0.0')
  console.error('   SERVER_PROTOCOL_VERSION=1.0.0')
  console.error('')
  process.exit(1)
}

console.log('✅ Protocol version validation passed!')
console.log('🚀 Build can proceed safely')
