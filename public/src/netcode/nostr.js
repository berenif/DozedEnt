/**
 * Nostr Strategy for Trystero
 * Provides WebRTC signaling via Nostr protocol
 */

export function joinRoom(config, roomId) {
  console.warn('Nostr strategy: stub implementation')
  
  const room = {
    makeAction: (actionId) => {
      const send = (data, targetPeers) => {
        console.log(`[Nostr] Send action ${actionId}:`, data)
      }
      const receive = (callback) => {
        console.log(`[Nostr] Receive handler for ${actionId} registered`)
      }
      const progress = (callback) => {
        console.log(`[Nostr] Progress handler for ${actionId} registered`)
      }
      return [send, receive, progress]
    },
    
    onPeerJoin: (callback) => {
      console.log('[Nostr] onPeerJoin registered')
    },
    
    onPeerLeave: (callback) => {
      console.log('[Nostr] onPeerLeave registered')
    },
    
    addStream: (stream, targetPeers, metadata) => {
      console.log('[Nostr] addStream called')
    },
    
    removeStream: (stream, targetPeers) => {
      console.log('[Nostr] removeStream called')
    },
    
    getPeers: () => {
      return []
    },
    
    leave: () => {
      console.log('[Nostr] leave called')
    }
  }
  
  return room
}

export const selfId = 'nostr-stub-' + Math.random().toString(36).substr(2, 9)