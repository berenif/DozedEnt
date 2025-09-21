import mqtt from 'mqtt'
import strategy from '../utils/strategy.js'
import {getRelays, selfId, toJson} from '../utils/utils.js'

const sockets = {}
const defaultRedundancy = 4
const msgHandlers = {}
const getClientId = ({options}) => options.host + options.path

export const joinRoom = strategy({
  init: config =>
    getRelays(config, defaultRelayUrls, defaultRedundancy).map(url => {
      // Generate a more unique client ID to avoid conflicts
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 15)
      const sessionId = Math.random().toString(36).substring(2, 15)
      const mqttClientId = `trystero-${timestamp}-${randomId}-${sessionId}`
      
      const client = mqtt.connect(url, {
        clientId: mqttClientId,
        clean: true,
        connectTimeout: 10000, // Increased timeout for better reliability
        reconnectPeriod: 3000, // Increased reconnection period
        keepalive: 60, // Increased keepalive interval
        protocolVersion: 4, // Force MQTT 3.1.1 to avoid compatibility issues
        reschedulePings: true,
        queueQoSZero: false,
        // Add additional connection parameters for better compatibility
        username: undefined, // No authentication required for public brokers
        password: undefined,
        will: {
          topic: `trystero/disconnect/${mqttClientId}`,
          payload: JSON.stringify({ clientId: mqttClientId, timestamp: Date.now() }),
          qos: 0,
          retain: false
        }
      })
      const clientId = getClientId(client)

      sockets[clientId] = client.stream.socket
      msgHandlers[clientId] = {}

      client
        .on('message', (topic, buffer) =>
          msgHandlers[clientId][topic]?.(topic, buffer.toString())
        )
        .on('error', err => {
          console.error(`MQTT connection error for ${url}:`, err.message || err)
          // Don't throw the error, let the client handle reconnection
        })
        .on('close', () => {
          console.log(`MQTT connection closed for ${url}`)
        })
        .on('offline', () => {
          console.log(`MQTT client offline for ${url}`)
        })

      return new Promise((res, rej) => {
        const timeout = setTimeout(() => {
          console.warn(`MQTT connection timeout for ${url} - this may be due to Node.js 20+ compatibility issues with MQTT.js 5.13.0`)
          rej(new Error(`Connection timeout for ${url}`))
        }, 15000) // Increased timeout to 15 seconds
        
        client.on('connect', () => {
          clearTimeout(timeout)
          console.log(`MQTT connected successfully to ${url}`)
          res(client)
        })
        
        client.on('error', (err) => {
          clearTimeout(timeout)
          console.error(`MQTT connection error for ${url}:`, err.message || err)
          
          // Provide more specific error information and suggestions
          if (err.message && err.message.includes('connack')) {
            rej(new Error(`MQTT CONNACK timeout for ${url} - try using a different network provider or check your internet connection`))
          } else if (err.message && err.message.includes('Not authorized')) {
            console.warn(`MQTT broker ${url} rejected connection - this broker may require authentication or have connection limits`)
            rej(new Error(`MQTT broker ${url} rejected connection (Not authorized) - trying next broker...`))
          } else if (err.message && err.message.includes('Connection refused')) {
            console.warn(`MQTT broker ${url} refused connection - broker may be down or overloaded`)
            rej(new Error(`MQTT broker ${url} refused connection - trying next broker...`))
          } else {
            rej(err)
          }
        })
        
        // Add additional event handlers for better debugging
        client.on('close', () => {
          console.log(`MQTT connection closed for ${url}`)
        })
        
        client.on('offline', () => {
          console.log(`MQTT client offline for ${url}`)
        })
        
        client.on('reconnect', () => {
          console.log(`MQTT client reconnecting to ${url}`)
        })
      })
    }),

  subscribe: (client, rootTopic, selfTopic, onMessage) => {
    const clientId = getClientId(client)

    msgHandlers[clientId][rootTopic] = msgHandlers[clientId][selfTopic] = (
      topic,
      data
    ) => onMessage(topic, data, client.publish.bind(client))

    client.subscribe(rootTopic)
    client.subscribe(selfTopic)

    return () => {
      client.unsubscribe(rootTopic)
      client.unsubscribe(selfTopic)
      delete msgHandlers[clientId][rootTopic]
      delete msgHandlers[clientId][selfTopic]
    }
  },

  announce: (client, rootTopic) =>
    client.publish(rootTopic, toJson({peerId: selfId}))
})

export const getRelaySockets = () => ({...sockets})

export {selfId} from '../utils/utils.js'

export const defaultRelayUrls = [
  'mqtt.eclipseprojects.io:443/mqtt', // Preferred: stable WSS on 443
  'broker.emqx.io:8084/mqtt', // Solid public EMQX endpoint
  'broker-cn.emqx.io:8084/mqtt', // EMQX CN region
  'broker.hivemq.com:8884/mqtt', // Public HiveMQ
  'test.mosquitto.org:8081/mqtt' // Last: often overloaded
].map(url => 'wss://' + url)
