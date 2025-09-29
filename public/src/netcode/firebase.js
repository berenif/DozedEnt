/**
 * Firebase Strategy for Trystero
 * Provides WebRTC signaling via Firebase Realtime Database
 */

export function joinRoom(config, roomId) {
  console.warn('Firebase strategy: stub implementation')
  
  const room = {
    makeAction: (actionId) => {
      const send = (data, targetPeers) => {
        console.log(`[Firebase] Send action ${actionId}:`, data)
      }
      const receive = (callback) => {
        console.log(`[Firebase] Receive handler for ${actionId} registered`)
      }
      const progress = (callback) => {
        console.log(`[Firebase] Progress handler for ${actionId} registered`)
      }
      return [send, receive, progress]
    },
    
    onPeerJoin: (callback) => {
      console.log('[Firebase] onPeerJoin registered')
    },
    
    onPeerLeave: (callback) => {
      console.log('[Firebase] onPeerLeave registered')
    },
    
    addStream: (stream, targetPeers, metadata) => {
      console.log('[Firebase] addStream called')
    },
    
    removeStream: (stream, targetPeers) => {
      console.log('[Firebase] removeStream called')
    },
    
    getPeers: () => {
      return []
    },
    
    leave: () => {
      console.log('[Firebase] leave called')
    }
  }
  
  return room
}

export const selfId = 'firebase-stub-' + Math.random().toString(36).substr(2, 9)