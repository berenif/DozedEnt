/**
 * MQTT Strategy for Trystero
 * Provides WebRTC signaling via MQTT brokers
 */

export function joinRoom(config, roomId) {
  console.warn('MQTT strategy: stub implementation')
  
  const room = {
    makeAction: (actionId) => {
      const send = (data, targetPeers) => {
        console.log(`[MQTT] Send action ${actionId}:`, data)
      }
      const receive = (callback) => {
        console.log(`[MQTT] Receive handler for ${actionId} registered`)
      }
      const progress = (callback) => {
        console.log(`[MQTT] Progress handler for ${actionId} registered`)
      }
      return [send, receive, progress]
    },
    
    onPeerJoin: (callback) => {
      console.log('[MQTT] onPeerJoin registered')
    },
    
    onPeerLeave: (callback) => {
      console.log('[MQTT] onPeerLeave registered')
    },
    
    addStream: (stream, targetPeers, metadata) => {
      console.log('[MQTT] addStream called')
    },
    
    removeStream: (stream, targetPeers) => {
      console.log('[MQTT] removeStream called')
    },
    
    getPeers: () => {
      return []
    },
    
    leave: () => {
      console.log('[MQTT] leave called')
    }
  }
  
  return room
}

export const selfId = 'mqtt-stub-' + Math.random().toString(36).substr(2, 9)