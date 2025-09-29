/**
 * IPFS Strategy for Trystero
 * Provides WebRTC signaling via IPFS pubsub
 */

export function joinRoom(config, roomId) {
  console.warn('IPFS strategy: stub implementation')
  
  const room = {
    makeAction: (actionId) => {
      const send = (data, targetPeers) => {
        console.log(`[IPFS] Send action ${actionId}:`, data)
      }
      const receive = (callback) => {
        console.log(`[IPFS] Receive handler for ${actionId} registered`)
      }
      const progress = (callback) => {
        console.log(`[IPFS] Progress handler for ${actionId} registered`)
      }
      return [send, receive, progress]
    },
    
    onPeerJoin: (callback) => {
      console.log('[IPFS] onPeerJoin registered')
    },
    
    onPeerLeave: (callback) => {
      console.log('[IPFS] onPeerLeave registered')
    },
    
    addStream: (stream, targetPeers, metadata) => {
      console.log('[IPFS] addStream called')
    },
    
    removeStream: (stream, targetPeers) => {
      console.log('[IPFS] removeStream called')
    },
    
    getPeers: () => {
      return []
    },
    
    leave: () => {
      console.log('[IPFS] leave called')
    }
  }
  
  return room
}

export const selfId = 'ipfs-stub-' + Math.random().toString(36).substr(2, 9)