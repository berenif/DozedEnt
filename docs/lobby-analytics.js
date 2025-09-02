/**
 * Lobby Analytics Module - Tracks game statistics and player behavior
 */

export class LobbyAnalytics {
  constructor() {
    this.sessions = new Map();
    this.events = [];
    this.metrics = {
      totalPlayers: 0,
      totalRooms: 0,
      totalGames: 0,
      averageGameDuration: 0,
      peakConcurrentPlayers: 0,
      currentPlayers: 0
    };
    this.startTime = Date.now();
  }

  // Track a new event
  trackEvent(eventName, data = {}) {
    const event = {
      name: eventName,
      timestamp: Date.now(),
      data
    };
    
    this.events.push(event);
    
    // Keep only last 1000 events to prevent memory issues
    if (this.events.length > 1000) {
      this.events.shift();
    }
    
    // Update metrics based on event
    this.updateMetrics(eventName, data);
  }

  // Update metrics based on events
  updateMetrics(eventName, data) {
    switch (eventName) {
      case 'player_joined':
        this.metrics.currentPlayers++;
        this.metrics.totalPlayers++;
        this.metrics.peakConcurrentPlayers = Math.max(
          this.metrics.peakConcurrentPlayers,
          this.metrics.currentPlayers
        );
        break;
        
      case 'player_left':
        this.metrics.currentPlayers = Math.max(0, this.metrics.currentPlayers - 1);
        break;
        
      case 'room_created':
        this.metrics.totalRooms++;
        break;
        
      case 'game_started':
        this.metrics.totalGames++;
        break;
        
      case 'game_ended':
        if (data.duration) {
          // Update average game duration
          const prevTotal = this.metrics.averageGameDuration * (this.metrics.totalGames - 1);
          this.metrics.averageGameDuration = (prevTotal + data.duration) / this.metrics.totalGames;
        }
        break;
    }
  }

  // Start tracking a session
  startSession(sessionId, playerId) {
    this.sessions.set(sessionId, {
      playerId,
      startTime: Date.now(),
      events: []
    });
  }

  // End a session
  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = Date.now();
      session.duration = session.endTime - session.startTime;
      this.trackEvent('session_ended', {
        sessionId,
        duration: session.duration
      });
    }
  }

  // Get current metrics
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      eventCount: this.events.length,
      activeSessions: this.sessions.size
    };
  }

  // Get recent events
  getRecentEvents(count = 10) {
    return this.events.slice(-count);
  }

  // Get session data
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  // Clear old data
  cleanup() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    // Remove old sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.endTime && now - session.endTime > maxAge) {
        this.sessions.delete(sessionId);
      }
    }
    
    // Remove old events
    this.events = this.events.filter(event => now - event.timestamp < maxAge);
  }

  // Export analytics data
  exportData() {
    return {
      metrics: this.metrics,
      events: this.events,
      sessions: Array.from(this.sessions.entries()).map(([id, session]) => ({
        id,
        ...session
      })),
      exportTime: Date.now()
    };
  }

  // Generate a summary report
  generateReport() {
    const now = Date.now();
    const uptime = now - this.startTime;
    const uptimeHours = uptime / (1000 * 60 * 60);
    
    return {
      summary: {
        uptime: `${uptimeHours.toFixed(2)} hours`,
        totalPlayers: this.metrics.totalPlayers,
        totalRooms: this.metrics.totalRooms,
        totalGames: this.metrics.totalGames,
        averageGameDuration: `${(this.metrics.averageGameDuration / 60000).toFixed(2)} minutes`,
        peakConcurrentPlayers: this.metrics.peakConcurrentPlayers,
        currentPlayers: this.metrics.currentPlayers,
        activeSessions: this.sessions.size
      },
      hourlyRate: {
        playersPerHour: (this.metrics.totalPlayers / uptimeHours).toFixed(2),
        roomsPerHour: (this.metrics.totalRooms / uptimeHours).toFixed(2),
        gamesPerHour: (this.metrics.totalGames / uptimeHours).toFixed(2)
      },
      recentActivity: this.getRecentEvents(20)
    };
  }
}

export default LobbyAnalytics;