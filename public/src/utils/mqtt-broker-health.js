/**
 * MQTT Broker Health Monitor
 * Monitors broker availability and provides health metrics
 */

import { createLogger } from './logger.js'

export class MQTTBrokerHealthMonitor {
  constructor() {
    this.logger = createLogger({ 
      level: 'info',
      prefix: '[BrokerHealth]'
    })
    
    // Broker health data
    this.brokerHealth = new Map()
    this.lastHealthCheck = null
    this.healthCheckInterval = null
    
    // Default broker URLs (same as in mqtt.js)
    this.brokerUrls = [
      'wss://broker.emqx.io:8084/mqtt', // Most reliable: EMQX Global
      'wss://broker-cn.emqx.io:8084/mqtt', // Backup: EMQX China region
      'wss://broker.hivemq.com:8884/mqtt', // Solid: HiveMQ public broker
      'wss://test.mosquitto.org:8081/mqtt', // Fallback: Mosquitto test broker
      'wss://mqtt.eclipseprojects.io:443/mqtt' // Last resort: Eclipse IoT
    ]
    
    // Initialize health data
    this.brokerUrls.forEach(url => {
      this.brokerHealth.set(url, {
        url,
        isHealthy: true,
        lastCheck: null,
        responseTime: null,
        consecutiveFailures: 0,
        totalChecks: 0,
        successRate: 100,
        lastError: null,
        priority: this.brokerUrls.indexOf(url) // Lower number = higher priority
      })
    })
  }
  
  /**
   * Get healthy brokers ordered by priority
   * @returns {Array} Array of healthy broker URLs
   */
  getHealthyBrokers() {
    const healthyBrokers = Array.from(this.brokerHealth.values())
      .filter(broker => broker.isHealthy)
      .sort((a, b) => a.priority - b.priority)
      .map(broker => broker.url)
    
    this.logger.info(`Found ${healthyBrokers.length}/${this.brokerUrls.length} healthy brokers`)
    return healthyBrokers
  }
  
  /**
   * Get broker health statistics
   * @returns {Object} Health statistics
   */
  getHealthStats() {
    const brokers = Array.from(this.brokerHealth.values())
    const healthyCount = brokers.filter(b => b.isHealthy).length
    const totalCount = brokers.length
    
    return {
      totalBrokers: totalCount,
      healthyBrokers: healthyCount,
      unhealthyBrokers: totalCount - healthyCount,
      overallHealth: (healthyCount / totalCount) * 100,
      lastCheck: this.lastHealthCheck,
      brokers: brokers.map(broker => ({
        url: broker.url,
        isHealthy: broker.isHealthy,
        successRate: broker.successRate,
        responseTime: broker.responseTime,
        consecutiveFailures: broker.consecutiveFailures,
        lastError: broker.lastError
      }))
    }
  }
  
  /**
   * Check health of a specific broker
   * @param {string} url - Broker URL
   * @param {Object} mqttClient - MQTT client instance
   * @returns {Promise<Object>} Health check result
   */
  async checkBrokerHealth(url, mqttClient) {
    const startTime = Date.now()
    const brokerData = this.brokerHealth.get(url)
    
    try {
      // Generate unique client ID
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 15)
      const sessionId = Math.random().toString(36).substring(2, 15)
      const mqttClientId = `health-check-${timestamp}-${randomId}-${sessionId}`
      
      const client = mqttClient.connect(url, {
        clientId: mqttClientId,
        clean: true,
        connectTimeout: 5000, // Shorter timeout for health checks
        reconnectPeriod: 1000,
        keepalive: 30,
        protocolVersion: 4,
        reschedulePings: true,
        queueQoSZero: false
      })
      
      const result = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          client.end()
          reject(new Error('Health check timeout'))
        }, 8000)
        
        client.on('connect', () => {
          clearTimeout(timeout)
          client.end()
          resolve({ success: true, responseTime: Date.now() - startTime })
        })
        
        client.on('error', (err) => {
          clearTimeout(timeout)
          client.end()
          resolve({ success: false, error: err.message, responseTime: Date.now() - startTime })
        })
      })
      
      // Update broker health data
      brokerData.lastCheck = new Date()
      brokerData.totalChecks++
      brokerData.responseTime = result.responseTime
      
      if (result.success) {
        brokerData.isHealthy = true
        brokerData.consecutiveFailures = 0
        brokerData.lastError = null
        this.logger.debug(`✅ Health check passed for ${url} (${result.responseTime}ms)`)
      } else {
        brokerData.consecutiveFailures++
        brokerData.lastError = result.error
        brokerData.isHealthy = brokerData.consecutiveFailures < 3 // Mark unhealthy after 3 consecutive failures
        this.logger.warn(`❌ Health check failed for ${url}: ${result.error}`)
      }
      
      // Update success rate
      brokerData.successRate = ((brokerData.totalChecks - brokerData.consecutiveFailures) / brokerData.totalChecks) * 100
      
      return result
      
    } catch (error) {
      brokerData.lastCheck = new Date()
      brokerData.totalChecks++
      brokerData.consecutiveFailures++
      brokerData.lastError = error.message
      brokerData.isHealthy = brokerData.consecutiveFailures < 3
      
      this.logger.error(`❌ Health check error for ${url}: ${error.message}`)
      return { success: false, error: error.message, responseTime: Date.now() - startTime }
    }
  }
  
  /**
   * Perform health check on all brokers
   * @param {Object} mqttClient - MQTT client instance
   * @returns {Promise<Object>} Overall health check results
   */
  async performHealthCheck(mqttClient) {
    this.logger.info('🔍 Performing health check on all brokers...')
    this.lastHealthCheck = new Date()
    
    const results = []
    
    // Check brokers in parallel for faster results
    const healthChecks = this.brokerUrls.map(url => 
      this.checkBrokerHealth(url, mqttClient)
    )
    
    const checkResults = await Promise.allSettled(healthChecks)
    
    checkResults.forEach((result, index) => {
      const url = this.brokerUrls[index]
      if (result.status === 'fulfilled') {
        results.push({ url, ...result.value })
      } else {
        results.push({ 
          url, 
          success: false, 
          error: result.reason?.message || 'Unknown error',
          responseTime: null
        })
      }
    })
    
    const healthyCount = results.filter(r => r.success).length
    this.logger.info(`📊 Health check complete: ${healthyCount}/${this.brokerUrls.length} brokers healthy`)
    
    return {
      timestamp: this.lastHealthCheck,
      totalBrokers: this.brokerUrls.length,
      healthyBrokers: healthyCount,
      results
    }
  }
  
  /**
   * Start periodic health monitoring
   * @param {Object} mqttClient - MQTT client instance
   * @param {number} intervalMs - Check interval in milliseconds (default: 5 minutes)
   */
  startHealthMonitoring(mqttClient, intervalMs = 5 * 60 * 1000) {
    if (this.healthCheckInterval) {
      this.logger.warn('Health monitoring already running')
      return
    }
    
    this.logger.info(`🔄 Starting health monitoring (interval: ${intervalMs}ms)`)
    
    // Perform initial health check
    this.performHealthCheck(mqttClient)
    
    // Set up periodic checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck(mqttClient)
    }, intervalMs)
  }
  
  /**
   * Stop periodic health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
      this.logger.info('⏹️ Health monitoring stopped')
    }
  }
  
  /**
   * Get recommended broker for connection
   * @returns {string|null} Best available broker URL
   */
  getRecommendedBroker() {
    const healthyBrokers = this.getHealthyBrokers()
    if (healthyBrokers.length === 0) {
      this.logger.warn('⚠️ No healthy brokers available')
      return null
    }
    
    // Return the highest priority healthy broker
    const recommended = healthyBrokers[0]
    this.logger.info(`🎯 Recommended broker: ${recommended}`)
    return recommended
  }
}

export default MQTTBrokerHealthMonitor
