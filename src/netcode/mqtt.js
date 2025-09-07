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
      const client = mqtt.connect(url, {
        clientId: `trystero-${Math.random().toString(36).substr(2, 9)}`,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
        keepalive: 30
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
          rej(new Error(`Connection timeout for ${url}`))
        }, 10000)
        
        client.on('connect', () => {
          clearTimeout(timeout)
          res(client)
        })
        
        client.on('error', (err) => {
          clearTimeout(timeout)
          rej(err)
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
  'test.mosquitto.org:8081/mqtt',
  'broker.emqx.io:8084/mqtt',
  'broker.hivemq.com:8884/mqtt',
  'broker-cn.emqx.io:8084/mqtt'
].map(url => 'wss://' + url)
