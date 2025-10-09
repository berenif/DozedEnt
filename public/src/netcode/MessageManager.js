/**
 * MessageManager - Handles message sending, receiving, and broadcasting
 * Focused responsibility: Message passing and communication
 */

export class MessageManager {
  constructor(roomManager) {
    this.roomManager = roomManager
    this.messageHandlers = new Map()
    this.actions = new Map()
    this.callbacks = {
      onMessage: null,
      onError: null
    }
  }
  
  /**
   * Set up message actions (send/receive)
   */
  setupMessageActions() {
    const trysteroRoom = this.roomManager.getTrysteroRoom()
    if (!trysteroRoom) return
    
    // Create actions for different message types
    const messageTypes = [
      'roomState',
      'playerJoin',
      'playerLeave',
      'playerReady',
      'chatMessage',
      'gameStart',
      'gameSync',
      'heartbeat'
    ]
    
    messageTypes.forEach(type => {
      const [sendAction, receiveAction] = trysteroRoom.makeAction(type)
      
      this.actions.set(type, {
        send: sendAction,
        receive: receiveAction
      })
      
      // Set up receiver
      receiveAction((data, peerId) => {
        this.handleMessage(type, data, peerId)
      })
    })
  }
  
  /**
   * Handle incoming messages
   */
  handleMessage(type, data, peerId) {
    // Call registered handler
    if (this.messageHandlers.has(type)) {
      const handler = this.messageHandlers.get(type)
      try {
        handler(data, peerId)
      } catch (error) {
        console.error(`Error handling message type ${type}:`, error)
        this.emitError(error)
      }
    }
    
    // Call general callback
    if (this.callbacks.onMessage) {
      try {
        this.callbacks.onMessage(type, data, peerId)
      } catch (error) {
        console.error(`Error in message callback:`, error)
        this.emitError(error)
      }
    }
  }
  
  /**
   * Send message to specific peer
   */
  sendToPeer(peerId, message) {
    if (!this.roomManager.isInRoom() || !this.actions.has(message.type)) {
      console.warn('Cannot send message - not in room or invalid type')
      return false
    }
    
    const action = this.actions.get(message.type)
    action.send(message.data, peerId)
    return true
  }
  
  /**
   * Broadcast message to all peers
   */
  broadcastToRoom(message) {
    if (!this.roomManager.isInRoom() || !this.actions.has(message.type)) {
      console.warn('Cannot broadcast - not in room or invalid type')
      return false
    }
    
    const action = this.actions.get(message.type)
    action.send(message.data)
    return true
  }
  
  /**
   * Register message handler
   */
  onMessage(messageType, handler) {
    this.messageHandlers.set(messageType, handler)
  }
  
  /**
   * Unregister message handler
   */
  offMessage(messageType) {
    this.messageHandlers.delete(messageType)
  }
  
  /**
   * Get available message types
   */
  getMessageTypes() {
    return Array.from(this.actions.keys())
  }
  
  /**
   * Check if message type is supported
   */
  supportsMessageType(type) {
    return this.actions.has(type)
  }
  
  /**
   * Emit error
   */
  emitError(error) {
    if (this.callbacks.onError) {
      this.callbacks.onError(error)
    }
  }
  
  /**
   * Set callback
   */
  setCallback(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback
    }
  }
  
  /**
   * Clear all handlers
   */
  clearHandlers() {
    this.messageHandlers.clear()
  }
  
  /**
   * Get state info
   */
  getState() {
    return {
      messageTypes: this.getMessageTypes(),
      handlerCount: this.messageHandlers.size,
      inRoom: this.roomManager.isInRoom()
    }
  }
}

export default MessageManager
