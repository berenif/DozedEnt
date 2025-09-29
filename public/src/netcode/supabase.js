/**
 * Supabase Strategy for Trystero
 * Provides WebRTC signaling via Supabase Realtime
 */

export function joinRoom(config, roomId) {
  console.warn('Supabase strategy: stub implementation')
  
  const room = {
    makeAction: (actionId) => {
      const send = (data, targetPeers) => {
        console.log(`[Supabase] Send action ${actionId}:`, data)
      }
      const receive = (callback) => {
        console.log(`[Supabase] Receive handler for ${actionId} registered`)
      }
      const progress = (callback) => {
        console.log(`[Supabase] Progress handler for ${actionId} registered`)
      }
      return [send, receive, progress]
    },
    
    onPeerJoin: (callback) => {
      console.log('[Supabase] onPeerJoin registered')
    },
    
    onPeerLeave: (callback) => {
      console.log('[Supabase] onPeerLeave registered')
    },
    
    addStream: (stream, targetPeers, metadata) => {
      console.log('[Supabase] addStream called')
    },
    
    removeStream: (stream, targetPeers) => {
      console.log('[Supabase] removeStream called')
    },
    
    getPeers: () => {
      return []
    },
    
    leave: () => {
      console.log('[Supabase] leave called')
    }
  }
  
  return room
}

export const selfId = 'supabase-stub-' + Math.random().toString(36).substr(2, 9)