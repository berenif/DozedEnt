/**
 * Torrent Strategy for Trystero
 * Provides WebRTC signaling via BitTorrent trackers
 */

export function joinRoom(config, roomId) {
  console.warn('Torrent strategy: stub implementation')
  
  const room = {
    makeAction: (actionId) => {
      const send = (data, targetPeers) => {
        console.log(`[Torrent] Send action ${actionId}:`, data)
      }
      const receive = (callback) => {
        console.log(`[Torrent] Receive handler for ${actionId} registered`)
      }
      const progress = (callback) => {
        console.log(`[Torrent] Progress handler for ${actionId} registered`)
      }
      return [send, receive, progress]
    },
    
    onPeerJoin: (callback) => {
      console.log('[Torrent] onPeerJoin registered')
    },
    
    onPeerLeave: (callback) => {
      console.log('[Torrent] onPeerLeave registered')
    },
    
    addStream: (stream, targetPeers, metadata) => {
      console.log('[Torrent] addStream called')
    },
    
    removeStream: (stream, targetPeers) => {
      console.log('[Torrent] removeStream called')
    },
    
    getPeers: () => {
      return []
    },
    
    leave: () => {
      console.log('[Torrent] leave called')
    }
  }
  
  return room
}

export const selfId = 'torrent-stub-' + Math.random().toString(36).substr(2, 9)