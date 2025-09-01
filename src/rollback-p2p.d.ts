/**
 * TypeScript definitions for Rollback P2P module
 */

export interface P2PConfig {
  iceServers?: RTCIceServer[]
  heartbeatInterval?: number
  connectionTimeout?: number
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'none'
}

export interface SignalingChannel {
  sendOffer: (peerId: string, offer: RTCSessionDescriptionInit) => void
  sendAnswer: (peerId: string, answer: RTCSessionDescriptionInit) => void
  sendIceCandidate: (peerId: string, candidate: RTCIceCandidate) => void
  onOffer?: (peerId: string, offer: RTCSessionDescriptionInit) => void
  onAnswer?: (peerId: string, answer: RTCSessionDescriptionInit) => void
  onIceCandidate?: (peerId: string, candidate: RTCIceCandidate) => void
}

export interface PeerStats {
  connected: boolean
  rtt: number | null
  packetLoss: number | null
  bytesReceived: number
  bytesSent: number
}

export default class RollbackP2P {
  constructor(config?: P2PConfig)
  
  // Properties
  localPeerId: string
  
  // Callbacks
  onPeerConnected: ((peerId: string) => void) | null
  onPeerDisconnected: ((peerId: string) => void) | null
  onInputReceived: ((peerId: string, frame: number, input: any) => void) | null
  onSyncTestReceived: ((peerId: string, frame: number, checksum: number) => void) | null
  
  // Methods
  initialize(signalingChannel: SignalingChannel, localPeerId?: string): void
  connectToPeer(peerId: string): Promise<void>
  disconnectPeer(peerId: string): void
  disconnectAll(): void
  broadcastInput(frame: number, input: any): void
  broadcastSyncTest(frame: number, checksum: number): void
  getStats(peerId?: string): Promise<{ [peerId: string]: PeerStats }>
}