/**
 * Real-time Chat System
 * Features: Emoji support, message history, language detection, moderation, reactions
 */

export class ChatSystem {
  constructor(config = {}) {
    this.config = {
      maxMessageLength: 500,
      maxHistorySize: 1000,
      enableEmojis: true,
      enableReactions: true,
      enableModeration: true,
      enableTranslation: false,
      enableVoice: false,
      rateLimit: 10, // messages per minute
      cooldownPeriod: 1000, // ms between messages
      ...config
    }
    
    // Message storage
    this.messages = new Map() // roomId -> messages[]
    this.privateMessages = new Map() // userId -> messages[]
    
    // User data
    this.userProfiles = new Map()
    this.blockedUsers = new Set()
    this.mutedUsers = new Map() // userId -> muteExpiry
    
    // Moderation
    this.bannedWords = new Set()
    this.moderators = new Set()
    
    // Rate limiting
    this.rateLimits = new Map() // userId -> { count, resetTime }
    
    // Emoji data
    this.emojiCategories = {
      smileys: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘'],
      gestures: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👏', '🙌', '👐', '🤲', '🙏', '✊', '👊'],
      hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗'],
      gaming: ['🎮', '🕹️', '🎯', '🎲', '🎰', '🏆', '🥇', '🥈', '🥉', '⚔️', '🛡️', '🏹', '🔫', '💣', '🎯'],
      reactions: ['🔥', '💯', '✨', '⭐', '🌟', '💫', '⚡', '💥', '💢', '💦', '💨', '🎉', '🎊', '🎈', '🎁']
    }
    
    // Quick reactions
    this.quickReactions = ['👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🔥', '💯', '🎉']
    
    // Language detection patterns
    this.languagePatterns = {
      en: /^[a-zA-Z\s\d\W]*$/,
      zh: /[\u4e00-\u9fa5]/,
      ja: /[\u3040-\u309f\u30a0-\u30ff]/,
      ko: /[\uac00-\ud7af]/,
      ar: /[\u0600-\u06ff]/,
      ru: /[\u0400-\u04ff]/,
      es: /[áéíóúñü]/i,
      fr: /[àâäçèéêëîïôùûü]/i,
      de: /[äöüß]/i
    }
    
    // Message types
    this.messageTypes = {
      PLAYER: 'player',
      SYSTEM: 'system',
      ANNOUNCEMENT: 'announcement',
      WHISPER: 'whisper',
      TEAM: 'team',
      MODERATOR: 'moderator'
    }
    
    // Event listeners
    this.eventListeners = new Map()
    
    // Initialize
    this.initialize()
  }
  
  /**
   * Initialize chat system
   */
  initialize() {
    // Load banned words
    this.loadBannedWords()
    
    // Start rate limit cleanup
    this.startRateLimitCleanup()
    
    // Load user preferences
    this.loadUserPreferences()
  }
  
  /**
   * Send a message
   */
  sendMessage(roomId, userId, content, options = {}) {
    try {
      // Check if user is muted
      if (this.isUserMuted(userId)) {
        throw new Error('You are currently muted')
      }
      
      // Check rate limit
      if (!this.checkRateLimit(userId)) {
        throw new Error('Rate limit exceeded. Please slow down.')
      }
      
      // Sanitize and validate message
      const sanitized = this.sanitizeMessage(content)
      
      if (sanitized.length === 0) {
        throw new Error('Message cannot be empty')
      }
      
      if (sanitized.length > this.config.maxMessageLength) {
        throw new Error(`Message too long (max ${this.config.maxMessageLength} characters)`)
      }
      
      // Check for moderation
      if (this.config.enableModeration) {
        const moderationResult = this.moderateMessage(sanitized)
        if (moderationResult.blocked) {
          throw new Error(moderationResult.reason || 'Message blocked by moderation')
        }
      }
      
      // Create message object
      const message = {
        id: this.generateMessageId(),
        roomId,
        userId,
        userName: options.userName || this.getUserName(userId),
        content: sanitized,
        type: options.type || this.messageTypes.PLAYER,
        timestamp: Date.now(),
        edited: false,
        deleted: false,
        reactions: new Map(),
        metadata: {
          language: this.detectLanguage(sanitized),
          hasEmoji: this.containsEmoji(sanitized),
          hasMention: this.containsMention(sanitized),
          team: options.team || null,
          replyTo: options.replyTo || null
        }
      }
      
      // Process mentions
      if (message.metadata.hasMention) {
        message.mentions = this.extractMentions(sanitized)
      }
      
      // Store message
      if (!this.messages.has(roomId)) {
        this.messages.set(roomId, [])
      }
      
      const roomMessages = this.messages.get(roomId)
      roomMessages.push(message)
      
      // Trim history if needed
      if (roomMessages.length > this.config.maxHistorySize) {
        roomMessages.shift()
      }
      
      // Update rate limit
      this.updateRateLimit(userId)
      
      // Emit event
      this.emit('onMessage', message)
      
      // Handle special commands
      if (content.startsWith('/')) {
        this.handleCommand(roomId, userId, content)
      }
      
      return message
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error
    }
  }
  
  /**
   * Send private message
   */
  sendPrivateMessage(fromUserId, toUserId, content) {
    // Check if recipient has blocked sender
    if (this.hasBlocked(toUserId, fromUserId)) {
      throw new Error('Unable to send message to this user')
    }
    
    const message = {
      id: this.generateMessageId(),
      fromUserId,
      toUserId,
      content: this.sanitizeMessage(content),
      type: this.messageTypes.WHISPER,
      timestamp: Date.now(),
      read: false
    }
    
    // Store in both users' private message history
    for (const userId of [fromUserId, toUserId]) {
      if (!this.privateMessages.has(userId)) {
        this.privateMessages.set(userId, [])
      }
      this.privateMessages.get(userId).push(message)
    }
    
    // Emit event
    this.emit('onPrivateMessage', message)
    
    return message
  }
  
  /**
   * Add reaction to message
   */
  addReaction(messageId, userId, emoji) {
    if (!this.config.enableReactions) {
      throw new Error('Reactions are disabled')
    }
    
    // Find message
    const message = this.findMessage(messageId)
    if (!message) {
      throw new Error('Message not found')
    }
    
    // Validate emoji
    if (!this.isValidEmoji(emoji)) {
      throw new Error('Invalid emoji')
    }
    
    // Add or update reaction
    if (!message.reactions.has(emoji)) {
      message.reactions.set(emoji, new Set())
    }
    
    const reactionUsers = message.reactions.get(emoji)
    
    if (reactionUsers.has(userId)) {
      // Remove reaction if already exists
      reactionUsers.delete(userId)
      if (reactionUsers.size === 0) {
        message.reactions.delete(emoji)
      }
    } else {
      // Add reaction
      reactionUsers.add(userId)
    }
    
    // Emit event
    this.emit('onReaction', {
      messageId,
      userId,
      emoji,
      action: reactionUsers.has(userId) ? 'add' : 'remove'
    })
    
    return message
  }
  
  /**
   * Edit message
   */
  editMessage(messageId, userId, newContent) {
    const message = this.findMessage(messageId)
    
    if (!message) {
      throw new Error('Message not found')
    }
    
    if (message.userId !== userId && !this.isModerator(userId)) {
      throw new Error('You can only edit your own messages')
    }
    
    // Sanitize new content
    const sanitized = this.sanitizeMessage(newContent)
    
    // Update message
    message.content = sanitized
    message.edited = true
    message.editedAt = Date.now()
    
    // Re-detect language and mentions
    message.metadata.language = this.detectLanguage(sanitized)
    message.metadata.hasEmoji = this.containsEmoji(sanitized)
    message.metadata.hasMention = this.containsMention(sanitized)
    
    if (message.metadata.hasMention) {
      message.mentions = this.extractMentions(sanitized)
    }
    
    // Emit event
    this.emit('onMessageEdit', message)
    
    return message
  }
  
  /**
   * Delete message
   */
  deleteMessage(messageId, userId) {
    const message = this.findMessage(messageId)
    
    if (!message) {
      throw new Error('Message not found')
    }
    
    if (message.userId !== userId && !this.isModerator(userId)) {
      throw new Error('You can only delete your own messages')
    }
    
    // Mark as deleted
    message.deleted = true
    message.deletedAt = Date.now()
    message.content = '[Message deleted]'
    
    // Emit event
    this.emit('onMessageDelete', message)
    
    return message
  }
  
  /**
   * Handle chat commands
   */
  handleCommand(roomId, userId, command) {
    const parts = command.split(' ')
    const cmd = parts[0].toLowerCase()
    const args = parts.slice(1)
    
    switch (cmd) {
      case '/help':
        this.sendSystemMessage(roomId, this.getHelpText())
        break
        
      case '/whisper':
      case '/w':
        if (args.length >= 2) {
          const targetUser = args[0]
          const message = args.slice(1).join(' ')
          this.sendPrivateMessage(userId, targetUser, message)
        }
        break
        
      case '/mute':
        if (this.isModerator(userId) && args.length > 0) {
          const targetUser = args[0]
          const duration = parseInt(args[1]) || 60 // Default 60 seconds
          this.muteUser(targetUser, duration)
        }
        break
        
      case '/unmute':
        if (this.isModerator(userId) && args.length > 0) {
          this.unmuteUser(args[0])
        }
        break
        
      case '/clear':
        if (this.isModerator(userId)) {
          this.clearChat(roomId)
        }
        break
        
      case '/emoji':
        this.sendSystemMessage(roomId, this.getEmojiList(), { userId })
        break
        
      case '/stats':
        this.sendSystemMessage(roomId, this.getChatStats(roomId), { userId })
        break
        
      default:
        this.sendSystemMessage(roomId, `Unknown command: ${cmd}`, { userId })
    }
  }
  
  /**
   * Send system message
   */
  sendSystemMessage(roomId, content, options = {}) {
    const message = {
      id: this.generateMessageId(),
      roomId,
      userId: 'system',
      userName: 'System',
      content,
      type: this.messageTypes.SYSTEM,
      timestamp: Date.now(),
      private: options.userId || false // If userId provided, only they see it
    }
    
    if (!this.messages.has(roomId)) {
      this.messages.set(roomId, [])
    }
    
    this.messages.get(roomId).push(message)
    
    this.emit('onSystemMessage', message)
    
    return message
  }
  
  /**
   * Moderate message
   */
  moderateMessage(content) {
    const result = {
      blocked: false,
      reason: null,
      severity: 0
    }
    
    // Check for banned words
    const lowerContent = content.toLowerCase()
    for (const word of this.bannedWords) {
      if (lowerContent.includes(word)) {
        result.blocked = true
        result.reason = 'Contains inappropriate content'
        result.severity = 2
        return result
      }
    }
    
    // Check for spam patterns
    if (this.isSpam(content)) {
      result.blocked = true
      result.reason = 'Spam detected'
      result.severity = 1
      return result
    }
    
    // Check for excessive caps
    if (this.hasExcessiveCaps(content)) {
      result.blocked = false // Warning only
      result.reason = 'Excessive caps detected'
      result.severity = 0
    }
    
    return result
  }
  
  /**
   * Mute user
   */
  muteUser(userId, duration = 60) {
    const expiry = Date.now() + (duration * 1000)
    this.mutedUsers.set(userId, expiry)
    
    this.emit('onUserMuted', { userId, duration, expiry })
  }
  
  /**
   * Unmute user
   */
  unmuteUser(userId) {
    this.mutedUsers.delete(userId)
    this.emit('onUserUnmuted', { userId })
  }
  
  /**
   * Check if user is muted
   */
  isUserMuted(userId) {
    if (!this.mutedUsers.has(userId)) {
      return false
    }
    
    const expiry = this.mutedUsers.get(userId)
    if (Date.now() > expiry) {
      this.mutedUsers.delete(userId)
      return false
    }
    
    return true
  }
  
  /**
   * Block user
   */
  blockUser(userId, targetUserId) {
    const key = `${userId}_${targetUserId}`
    this.blockedUsers.add(key)
  }
  
  /**
   * Unblock user
   */
  unblockUser(userId, targetUserId) {
    const key = `${userId}_${targetUserId}`
    this.blockedUsers.delete(key)
  }
  
  /**
   * Check if user has blocked another
   */
  hasBlocked(userId, targetUserId) {
    const key = `${userId}_${targetUserId}`
    return this.blockedUsers.has(key)
  }
  
  /**
   * Clear chat history
   */
  clearChat(roomId) {
    if (this.messages.has(roomId)) {
      this.messages.get(roomId).length = 0
    }
    
    this.emit('onChatCleared', { roomId })
  }
  
  /**
   * Get chat history
   */
  getChatHistory(roomId, limit = 100) {
    const messages = this.messages.get(roomId) || []
    return messages.slice(-limit)
  }
  
  /**
   * Get private messages
   */
  getPrivateMessages(userId, limit = 50) {
    const messages = this.privateMessages.get(userId) || []
    return messages.slice(-limit)
  }
  
  /**
   * Helper: Sanitize message
   */
  sanitizeMessage(content) {
    // Remove HTML tags
    content = content.replace(/<[^>]*>/g, '')
    
    // Trim whitespace
    content = content.trim()
    
    // Limit consecutive spaces
    content = content.replace(/\s+/g, ' ')
    
    return content
  }
  
  /**
   * Helper: Detect language
   */
  detectLanguage(content) {
    for (const [lang, pattern] of Object.entries(this.languagePatterns)) {
      if (pattern.test(content)) {
        return lang
      }
    }
    return 'en'
  }
  
  /**
   * Helper: Check if contains emoji
   */
  containsEmoji(content) {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu
    return emojiRegex.test(content)
  }
  
  /**
   * Helper: Check if contains mention
   */
  containsMention(content) {
    return /@\w+/.test(content)
  }
  
  /**
   * Helper: Extract mentions
   */
  extractMentions(content) {
    const mentions = content.match(/@\w+/g) || []
    return mentions.map(m => m.substring(1))
  }
  
  /**
   * Helper: Check if valid emoji
   */
  isValidEmoji(emoji) {
    const emojiRegex = /^[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]$/u
    return emojiRegex.test(emoji) || this.quickReactions.includes(emoji)
  }
  
  /**
   * Helper: Check spam
   */
  isSpam(content) {
    // Check for repeated characters
    if (/(.)\1{9,}/.test(content)) {
      return true
    }
    
    // Check for repeated words
    const words = content.split(' ')
    const wordCount = {}
    for (const word of words) {
      wordCount[word] = (wordCount[word] || 0) + 1
      if (wordCount[word] > 5) {
        return true
      }
    }
    
    return false
  }
  
  /**
   * Helper: Check excessive caps
   */
  hasExcessiveCaps(content) {
    const letters = content.replace(/[^a-zA-Z]/g, '')
    if (letters.length < 10) return false
    
    const capsCount = (content.match(/[A-Z]/g) || []).length
    return capsCount / letters.length > 0.7
  }
  
  /**
   * Helper: Find message
   */
  findMessage(messageId) {
    for (const messages of this.messages.values()) {
      const message = messages.find(m => m.id === messageId)
      if (message) return message
    }
    return null
  }
  
  /**
   * Helper: Check rate limit
   */
  checkRateLimit(userId) {
    const now = Date.now()
    const limit = this.rateLimits.get(userId)
    
    if (!limit) {
      return true
    }
    
    if (now > limit.resetTime) {
      this.rateLimits.delete(userId)
      return true
    }
    
    return limit.count < this.config.rateLimit
  }
  
  /**
   * Helper: Update rate limit
   */
  updateRateLimit(userId) {
    const now = Date.now()
    const limit = this.rateLimits.get(userId) || {
      count: 0,
      resetTime: now + 60000 // 1 minute
    }
    
    limit.count++
    this.rateLimits.set(userId, limit)
  }
  
  /**
   * Helper: Start rate limit cleanup
   */
  startRateLimitCleanup() {
    setInterval(() => {
      const now = Date.now()
      for (const [userId, limit] of this.rateLimits) {
        if (now > limit.resetTime) {
          this.rateLimits.delete(userId)
        }
      }
    }, 60000) // Clean up every minute
  }
  
  /**
   * Helper: Load banned words
   */
  loadBannedWords() {
    // Default banned words (would typically load from config/database)
    this.bannedWords = new Set([
      // Add inappropriate words here
    ])
  }
  
  /**
   * Helper: Load user preferences
   */
  loadUserPreferences() {
    // Load from localStorage or database
    try {
      const stored = localStorage.getItem('chat_preferences')
      if (stored) {
        const prefs = JSON.parse(stored)
        // Apply preferences
      }
    } catch (error) {
      console.error('Failed to load chat preferences:', error)
    }
  }
  
  /**
   * Helper: Get user name
   */
  getUserName(userId) {
    const profile = this.userProfiles.get(userId)
    return profile?.name || `User${userId.substr(-4)}`
  }
  
  /**
   * Helper: Check if moderator
   */
  isModerator(userId) {
    return this.moderators.has(userId)
  }
  
  /**
   * Helper: Add moderator
   */
  addModerator(userId) {
    this.moderators.add(userId)
  }
  
  /**
   * Helper: Remove moderator
   */
  removeModerator(userId) {
    this.moderators.delete(userId)
  }
  
  /**
   * Helper: Generate message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Helper: Get help text
   */
  getHelpText() {
    return `
Chat Commands:
/help - Show this help message
/whisper [user] [message] - Send private message
/emoji - Show emoji list
/stats - Show chat statistics
${this.isModerator() ? `
Moderator Commands:
/mute [user] [seconds] - Mute a user
/unmute [user] - Unmute a user
/clear - Clear chat history
` : ''}
    `.trim()
  }
  
  /**
   * Helper: Get emoji list
   */
  getEmojiList() {
    let text = 'Available Emojis:\n'
    for (const [category, emojis] of Object.entries(this.emojiCategories)) {
      text += `\n${category}: ${emojis.join(' ')}`
    }
    return text
  }
  
  /**
   * Helper: Get chat stats
   */
  getChatStats(roomId) {
    const messages = this.messages.get(roomId) || []
    const userStats = {}
    
    for (const msg of messages) {
      if (msg.type === this.messageTypes.PLAYER) {
        userStats[msg.userId] = (userStats[msg.userId] || 0) + 1
      }
    }
    
    const topUsers = Object.entries(userStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    
    return `
Chat Statistics:
Total Messages: ${messages.length}
Active Users: ${Object.keys(userStats).length}
Top Chatters:
${topUsers.map(([user, count], i) => `${i + 1}. ${this.getUserName(user)}: ${count} messages`).join('\n')}
    `.trim()
  }
  
  /**
   * Event system
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event).push(callback)
  }
  
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event)
      const index = listeners.indexOf(callback)
      if (index !== -1) {
        listeners.splice(index, 1)
      }
    }
  }
  
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      for (const callback of this.eventListeners.get(event)) {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in chat event listener for ${event}:`, error)
        }
      }
    }
  }
}

export default ChatSystem