/**
 * Nostr Protocol Implementation for Trystero
 * Provides P2P networking using Nostr relays
 */

import strategy from '../utils/strategy.js'
import {selfId, topicPath} from '../utils/utils.js'

// Default Nostr relay URLs
const defaultRelayUrls = [
  'wss://black.nostrcity.club',
  'wss://ftp.halifax.rwth-aachen.de/nostr',
  'wss://nos.lol',
  'wss://nostr.cool110.xyz',
  'wss://nostr.data.haus',
  'wss://nostr.sathoarder.com',
  'wss://nostr.vulpem.com',
  'wss://relay.agorist.space',
  'wss://relay.binaryrobot.com',
  'wss://relay.damus.io',
  'wss://relay.fountain.fm',
  'wss://relay.mostro.network',
  'wss://relay.nostraddress.com',
  'wss://relay.nostrdice.com',
  'wss://relay.nostromo.social',
  'wss://relay.oldenburg.cool',
  'wss://relay.verified-nostr.com',
  'wss://yabu.me/v2'
]

// Connection management
const connections = {}
const subscriptions = {}

// Generate random subscription ID
const generateSubId = () => Math.random().toString(36).substring(2, 15)

// Create Nostr event
const createEvent = async (kind, content, tags = []) => {
  const event = {
    kind,
    tags: [['x', kind], ...tags],
    created_at: Math.floor(Date.now() / 1000),
    content,
    pubkey: selfId
  }
  
  // In a real implementation, you would sign the event here
  // For now, we'll use a placeholder
  event.id = 'placeholder_id'
  event.sig = 'placeholder_sig'
  
  return JSON.stringify(['EVENT', event])
}

// Subscribe to events
const subscribe = (relay, kind, onMessage) => {
  const subId = generateSubId()
  const filter = {
    kinds: [kind],
    since: Math.floor(Date.now() / 1000),
    '#x': [kind]
  }
  
  subscriptions[subId] = onMessage
  relay.send(JSON.stringify(['REQ', subId, filter]))
  
  return () => {
    relay.send(JSON.stringify(['CLOSE', subId]))
    delete subscriptions[subId]
  }
}

// Initialize Nostr relay connection
const initRelay = (url) => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    const connection = {
      socket: ws,
      url: url,
      ready: new Promise(res => {
        ws.onopen = () => {
          res(connection)
        }
      }),
      send: (message) => {
        if (ws.readyState === 1) {
          ws.send(message)
        }
      }
    }
    
    ws.onclose = () => {
      // Auto-reconnect logic would go here
      setTimeout(() => initRelay(url), 3000)
    }
    
    ws.onmessage = (event) => {
      try {
        const [type, subId, event] = JSON.parse(event.data)
        
        if (type === 'EVENT' && subscriptions[subId]) {
          subscriptions[subId](event.content)
        } else if (type !== 'EVENT') {
          console.warn(`Nostr relay failure from ${url}: ${type}`)
        }
      } catch (error) {
        console.error('Error parsing Nostr message:', error)
      }
    }
    
    ws.onerror = (error) => {
      reject(error)
    }
    
    resolve(connection.ready)
  })
}

export const joinRoom = strategy({
  init: config => {
    const relayUrls = config.relayUrls || defaultRelayUrls
    const redundancy = config.relayRedundancy || 5
    
    // Select random relays for redundancy
    const selectedRelays = relayUrls
      .sort(() => Math.random() - 0.5)
      .slice(0, redundancy)
    
    return Promise.all(selectedRelays.map(initRelay))
  },

  subscribe: async (relays, rootTopic, selfTopic, onMessage) => {
    const unsubFns = []
    
    // Subscribe to both root and self topics
    for (const relay of relays) {
      const unsubRoot = subscribe(relay, rootTopic, (content) => {
        onMessage(rootTopic, content, (peerTopic, signal) => {
          // Send signal to peer
          announce(relay, peerTopic, signal)
        })
      })
      
      const unsubSelf = subscribe(relay, selfTopic, (content) => {
        onMessage(selfTopic, content, (peerTopic, signal) => {
          // Send signal to peer
          announce(relay, peerTopic, signal)
        })
      })
      
      unsubFns.push(unsubRoot, unsubSelf)
    }
    
    return () => unsubFns.forEach(fn => fn())
  },

  announce: async (relay, topic, signal) => {
    const event = await createEvent(topic, JSON.stringify({
      peerId: selfId,
      signal: signal
    }))
    relay.send(event)
  }
})

export {selfId} from '../utils/utils.js'
