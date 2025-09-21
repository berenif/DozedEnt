/**
 * ChatIntegration UI Component
 * Handles squad chat functionality and message display
 */
export class ChatIntegration {
    constructor(containerId, options = {}) {
        this.containerId = containerId
        this.options = {
            onSendMessage: options.onSendMessage || (() => {}),
            onSendRandomMessage: options.onSendRandomMessage || (() => {}),
            onClearChat: options.onClearChat || (() => {}),
            onToggleMute: options.onToggleMute || (() => {}),
            ...options
        }
        this.element = null
        this.isMuted = false
        this.messages = []
        this.maxMessages = 50
    }

    /**
     * Initialize the ChatIntegration component
     */
    init() {
        this.element = document.getElementById(this.containerId)
        if (!this.element) {
            throw new Error(`ChatIntegration container with id "${this.containerId}" not found`)
        }
        
        this.render()
        this.attachEventListeners()
        return this
    }

    /**
     * Render the ChatIntegration HTML structure
     */
    render() {
        this.element.innerHTML = `
            <!-- Chat Message Integration -->
            <div class="chat-integration" role="region" aria-labelledby="chat-title" aria-describedby="chat-description">
                <div class="chat-header">
                    <span class="chat-title" id="chat-title">Squad Communications</span>
                    <div class="chat-status" id="chat-status" role="status" aria-live="polite">
                        <span class="status-indicator" aria-hidden="true"></span>
                        <span class="status-text">Ready</span>
                    </div>
                </div>
                
                <div class="chat-messages" id="chat-messages" role="log" aria-label="Squad chat messages" aria-live="polite" aria-atomic="false">
                    <div class="chat-message system" role="listitem">
                        <div class="message-avatar" aria-hidden="true">⚡</div>
                        <div class="message-content">
                            <div class="message-header">
                                <span class="message-sender">System</span>
                                <span class="message-time" aria-label="Message timestamp">Just now</span>
                            </div>
                            <div class="message-text">Squad communications established. All clear for battle chatter.</div>
                        </div>
                    </div>
                </div>
                
                <div class="chat-input-container">
                    <div class="chat-input-wrapper">
                        <label for="chat-message" class="sr-only">Type your message to the squad</label>
                        <input type="text" id="chat-message" placeholder="Send message to squad..." maxlength="200" aria-describedby="chat-help">
                        <button class="btn-send" id="send-message-btn" title="Send Message" aria-label="Send message to squad" type="button">
                            <span class="send-icon" aria-hidden="true">📤</span>
                        </button>
                    </div>
                    <div class="chat-quick-actions" role="toolbar" aria-label="Chat quick actions">
                        <button class="btn-quick" id="random-message-btn" title="Send Random Message" aria-label="Send a random message to squad" type="button">
                            <span class="quick-icon" aria-hidden="true">🎲</span>
                            Random
                        </button>
                        <button class="btn-quick" id="clear-chat-btn" title="Clear Chat" aria-label="Clear all chat messages" type="button">
                            <span class="quick-icon" aria-hidden="true">🗑️</span>
                            Clear
                        </button>
                        <button class="btn-quick" id="chat-mute-btn" title="Toggle Chat Mute" aria-label="Toggle chat mute" type="button">
                            <span class="quick-icon" aria-hidden="true">🔇</span>
                            Mute
                        </button>
                    </div>
                    <div id="chat-help" class="sr-only">Press Enter to send message. Use quick actions for common commands.</div>
                </div>
            </div>
        `
    }

    /**
     * Attach event listeners to the ChatIntegration component
     */
    attachEventListeners() {
        // Send message button
        const sendMessageBtn = this.element.querySelector('#send-message-btn')
        if (sendMessageBtn) {
            sendMessageBtn.addEventListener('click', () => {
                this.sendMessage()
            })
        }

        // Random message button
        const randomMessageBtn = this.element.querySelector('#random-message-btn')
        if (randomMessageBtn) {
            randomMessageBtn.addEventListener('click', () => {
                this.options.onSendRandomMessage()
            })
        }

        // Clear chat button
        const clearChatBtn = this.element.querySelector('#clear-chat-btn')
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => {
                this.clearChat()
            })
        }

        // Mute toggle button
        const muteBtn = this.element.querySelector('#chat-mute-btn')
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                this.toggleMute()
            })
        }

        // Chat input - Enter key support
        const chatInput = this.element.querySelector('#chat-message')
        if (chatInput) {
            chatInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault()
                    this.sendMessage()
                }
            })
        }
    }

    /**
     * Send a message
     */
    sendMessage() {
        const chatInput = this.element.querySelector('#chat-message')
        if (!chatInput) return

        const message = chatInput.value.trim()
        if (!message) return

        this.options.onSendMessage(message)
        chatInput.value = ''
    }

    /**
     * Add a chat message to the display
     */
    addChatMessage(sender, message, isSystem = false, isSelf = false) {
        const chatMessages = this.element.querySelector('#chat-messages')
        if (!chatMessages) return

        const messageElement = document.createElement('div')
        const timestamp = new Date().toLocaleTimeString()
        
        let avatar = '⚔️'
        let senderClass = ''
        
        if (isSystem) {
            avatar = '⚡'
            senderClass = 'system'
        } else if (isSelf) {
            avatar = '👑'
            senderClass = 'self'
        }

        messageElement.className = `chat-message ${senderClass}`
        messageElement.setAttribute('role', 'listitem')
        messageElement.setAttribute('aria-label', `Message from ${sender}: ${message}`)
        messageElement.innerHTML = `
            <div class="message-avatar" aria-hidden="true">${avatar}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${sender}</span>
                    <span class="message-time" aria-label="Message timestamp">${timestamp}</span>
                </div>
                <div class="message-text">${this.escapeForHtml(message)}</div>
            </div>
        `

        // Add with animation
        messageElement.style.opacity = '0'
        messageElement.style.transform = 'translateY(-10px)'
        chatMessages.insertBefore(messageElement, chatMessages.firstChild)

        // Animate in
        setTimeout(() => {
            messageElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
            messageElement.style.opacity = '1'
            messageElement.style.transform = 'translateY(0)'
        }, 10)

        // Keep only last N messages
        while (chatMessages.children.length > this.maxMessages) {
            chatMessages.removeChild(chatMessages.lastChild)
        }

        // Auto-scroll to show new message
        chatMessages.scrollTop = 0

        // Store message
        this.messages.unshift({
            sender,
            message,
            timestamp: new Date().toISOString(),
            isSystem,
            isSelf
        })

        // Keep only last N messages in memory
        if (this.messages.length > this.maxMessages) {
            this.messages = this.messages.slice(0, this.maxMessages)
        }
    }

    /**
     * Clear all chat messages
     */
    clearChat() {
        const chatMessages = this.element.querySelector('#chat-messages')
        if (!chatMessages) return

        chatMessages.innerHTML = `
            <div class="chat-message system" role="listitem">
                <div class="message-avatar" aria-hidden="true">⚡</div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-sender">System</span>
                        <span class="message-time" aria-label="Message timestamp">Just now</span>
                    </div>
                    <div class="message-text">Chat cleared. Squad communications ready.</div>
                </div>
            </div>
        `

        this.messages = []
        this.options.onClearChat()
    }

    /**
     * Toggle chat mute
     */
    toggleMute() {
        this.isMuted = !this.isMuted
        const muteBtn = this.element.querySelector('#chat-mute-btn')
        const muteIcon = muteBtn?.querySelector('.quick-icon')
        
        if (this.isMuted) {
            if (muteIcon) muteIcon.textContent = '🔊'
            if (muteBtn) muteBtn.title = 'Unmute Chat'
            this.updateChatStatus('Muted')
            this.addChatMessage('System', 'Chat muted. You will not receive new messages.', true)
        } else {
            if (muteIcon) muteIcon.textContent = '🔇'
            if (muteBtn) muteBtn.title = 'Toggle Chat Mute'
            this.updateChatStatus('Connected')
            this.addChatMessage('System', 'Chat unmuted. You will receive new messages.', true)
        }

        this.options.onToggleMute(this.isMuted)
    }

    /**
     * Update chat status display
     */
    updateChatStatus(status) {
        const statusIndicator = this.element.querySelector('.status-indicator')
        const statusText = this.element.querySelector('.status-text')
        
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator'
        }
        if (statusText) {
            statusText.textContent = status
        }
        
        switch (status) {
            case 'Connected':
                if (statusIndicator) statusIndicator.classList.add('connected')
                break
            case 'Disconnected':
                if (statusIndicator) statusIndicator.classList.add('disconnected')
                break
            case 'Muted':
                if (statusIndicator) statusIndicator.classList.add('muted')
                break
            case 'Ready':
                // Default state
                break
        }
    }

    /**
     * Handle incoming message
     */
    handleIncomingMessage(message) {
        if (this.isMuted) return
        
        // Parse message format: [sender]: message
        const match = message.match(/^\[([^\]]+)\]:\s*(.+)$/)
        if (match) {
            const [, sender, content] = match
            const isSelf = sender === this.options.currentPeerName
            this.addChatMessage(sender, content, false, isSelf)
        } else {
            // Fallback for non-formatted messages
            this.addChatMessage('Unknown', message)
        }
    }

    /**
     * Set the current peer name for self-message detection
     */
    setCurrentPeerName(peerName) {
        this.options.currentPeerName = peerName
    }

    /**
     * Get current chat state
     */
    getChatState() {
        return {
            isMuted: this.isMuted,
            messageCount: this.messages.length,
            messages: [...this.messages]
        }
    }

    /**
     * Export chat history
     */
    exportChatHistory() {
        const chatData = {
            timestamp: new Date().toISOString(),
            messageCount: this.messages.length,
            messages: this.messages
        }
        
        const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `chat-history-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    /**
     * Escape HTML characters
     */
    escapeForHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
    }

    /**
     * Clean up event listeners and resources
     */
    destroy() {
        // Remove event listeners if needed
        // This component uses minimal event handling, so cleanup is minimal
    }
}
