/**
 * Threat Awareness UI System for DozedEnt
 * Enhances player awareness of incoming threats through:
 * - Directional damage indicators
 * - Enemy attack telegraphs
 * - Audio-visual cues for incoming attacks
 * - Clear distinction between blockable vs unblockable attacks
 * 
 * Follows WASM-first architecture - only displays threat data from WASM
 */

export class ThreatAwarenessUI {
    constructor(wasmManager, canvas, audioManager) {
        this.wasmManager = wasmManager;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.audioManager = audioManager;
        
        // Threat tracking
        this.activeThreatIndicators = [];
        this.damageIndicators = [];
        this.telegraphIndicators = [];
        this.audioWarnings = new Map();
        
        // UI settings
        this.settings = {
            enableDirectionalIndicators: true,
            enableTelegraphWarnings: true,
            enableAudioCues: true,
            indicatorOpacity: 0.8,
            indicatorScale: 1.0,
            colorBlindMode: 'none', // 'none', 'protanopia', 'deuteranopia', 'tritanopia'
            reducedMotion: false
        };
        
        // Visual configuration
        this.visualConfig = {
            // Directional indicator settings
            indicatorRadius: 60,
            indicatorThickness: 8,
            indicatorDistance: 80,
            
            // Telegraph settings
            telegraphRadius: 40,
            telegraphPulseSpeed: 2.0,
            telegraphFadeTime: 0.5,
            
            // Damage indicator settings
            damageIndicatorSize: 24,
            damageIndicatorLifetime: 1.5,
            
            // Colors (adjusted for colorblind accessibility)
            colors: {
                blockable: '#60a5fa',      // Blue - can be blocked
                unblockable: '#ef4444',    // Red - cannot be blocked
                parryable: '#fbbf24',      // Yellow - can be parried
                environmental: '#8b5cf6',   // Purple - environmental hazard
                critical: '#f97316',       // Orange - critical threat
                incoming: '#10b981'        // Green - incoming but not immediate
            }
        };
        
        // Performance tracking
        this.performanceMetrics = {
            lastUpdate: 0,
            updateFrequency: 60, // Target 60 FPS
            indicatorCount: 0,
            renderTime: 0
        };
        
        this.initialize();
    }

    /**
     * Initialize the threat awareness system
     */
    initialize() {
        this.createThreatOverlay();
        this.setupColorBlindSupport();
        this.loadUserSettings();
        this.startUpdateLoop();
    }

    /**
     * Create threat awareness overlay
     */
    createThreatOverlay() {
        // Remove existing overlay
        const existing = document.getElementById('threat-awareness-overlay');
        if (existing) {
            existing.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'threat-awareness-overlay';
        overlay.className = 'threat-awareness-overlay';
        
        // Create canvas for threat indicators
        const threatCanvas = document.createElement('canvas');
        threatCanvas.id = 'threat-canvas';
        threatCanvas.className = 'threat-canvas';
        threatCanvas.width = this.canvas.width;
        threatCanvas.height = this.canvas.height;
        
        overlay.appendChild(threatCanvas);
        
        // Create directional indicator container
        const directionalContainer = document.createElement('div');
        directionalContainer.id = 'directional-indicators';
        directionalContainer.className = 'directional-indicators';
        overlay.appendChild(directionalContainer);
        
        // Create telegraph warning container
        const telegraphContainer = document.createElement('div');
        telegraphContainer.id = 'telegraph-warnings';
        telegraphContainer.className = 'telegraph-warnings';
        overlay.appendChild(telegraphContainer);
        
        // Threat Types legend panel removed per request
        
        document.body.appendChild(overlay);
        
        this.threatCanvas = threatCanvas;
        this.threatCtx = threatCanvas.getContext('2d');
    }

    /**
     * Create threat type legend
     */
    createThreatLegend() {
        const colors = this.getColorScheme();
        
        return `
            <div class="legend-title">Threat Types</div>
            <div class="legend-items">
                <div class="legend-item">
                    <div class="legend-color" style="background: ${colors.blockable}"></div>
                    <span>Blockable</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: ${colors.parryable}"></div>
                    <span>Parryable</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: ${colors.unblockable}"></div>
                    <span>Unblockable</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: ${colors.environmental}"></div>
                    <span>Environmental</span>
                </div>
            </div>
        `;
    }

    /**
     * Setup colorblind support
     */
    setupColorBlindSupport() {
        // Adjust colors based on colorblind mode
        if (this.settings.colorBlindMode !== 'none') {
            this.visualConfig.colors = this.getColorBlindFriendlyColors(this.settings.colorBlindMode);
        }
    }

    /**
     * Get colorblind-friendly color scheme
     */
    getColorBlindFriendlyColors(mode) {
        const schemes = {
            protanopia: {
                blockable: '#0ea5e9',      // Bright blue
                unblockable: '#dc2626',    // Dark red
                parryable: '#eab308',      // Yellow
                environmental: '#7c3aed',  // Purple
                critical: '#ea580c',       // Orange
                incoming: '#059669'        // Green
            },
            deuteranopia: {
                blockable: '#0ea5e9',      // Bright blue
                unblockable: '#dc2626',    // Dark red
                parryable: '#eab308',      // Yellow
                environmental: '#7c3aed',  // Purple
                critical: '#ea580c',       // Orange
                incoming: '#0891b2'        // Cyan
            },
            tritanopia: {
                blockable: '#0ea5e9',      // Bright blue
                unblockable: '#dc2626',    // Dark red
                parryable: '#f59e0b',      // Amber
                environmental: '#7c3aed',  // Purple
                critical: '#ea580c',       // Orange
                incoming: '#059669'        // Green
            }
        };
        
        return schemes[mode] || this.visualConfig.colors;
    }

    /**
     * Get current color scheme
     */
    getColorScheme() {
        return this.settings.colorBlindMode !== 'none' 
            ? this.getColorBlindFriendlyColors(this.settings.colorBlindMode)
            : this.visualConfig.colors;
    }

    /**
     * Start the update loop
     */
    startUpdateLoop() {
        const updateLoop = () => {
            const now = performance.now();
            const deltaTime = (now - this.performanceMetrics.lastUpdate) / 1000;
            this.performanceMetrics.lastUpdate = now;
            
            this.update(deltaTime);
            this.render();
            
            requestAnimationFrame(updateLoop);
        };
        
        updateLoop();
    }

    /**
     * Update threat awareness system
     */
    update(deltaTime) {
        if (!this.wasmManager || !this.wasmManager.exports) {
            return;
        }

        try {
            // Update threat data from WASM
            this.updateThreatsFromWASM();
            
            // Update existing indicators
            this.updateThreatIndicators(deltaTime);
            this.updateDamageIndicators(deltaTime);
            this.updateTelegraphIndicators(deltaTime);
            
            // Process audio warnings
            this.updateAudioWarnings(deltaTime);
            
            // Clean up expired indicators
            this.cleanupExpiredIndicators();
            
        } catch (error) {
            console.error('Error updating threat awareness:', error);
        }
    }

    /**
     * Update threat data from WASM exports
     */
    updateThreatsFromWASM() {
        // Get player position for directional calculations
        const playerX = this.wasmManager.exports.get_x?.() || 0.5;
        const playerY = this.wasmManager.exports.get_y?.() || 0.5;
        
        // Get active threats
        const threatCount = this.wasmManager.exports.get_active_threat_count?.() || 0;
        
        for (let i = 0; i < threatCount; i++) {
            const threat = {
                id: this.wasmManager.exports.get_threat_id?.(i) || i,
                x: this.wasmManager.exports.get_threat_x?.(i) || 0,
                y: this.wasmManager.exports.get_threat_y?.(i) || 0,
                type: this.wasmManager.exports.get_threat_type?.(i) || 0,
                intensity: this.wasmManager.exports.get_threat_intensity?.(i) || 0.5,
                timeToImpact: this.wasmManager.exports.get_threat_time_to_impact?.(i) || 1.0,
                isBlockable: this.wasmManager.exports.get_threat_blockable?.(i) || false,
                isParryable: this.wasmManager.exports.get_threat_parryable?.(i) || false,
                telegraphTime: this.wasmManager.exports.get_threat_telegraph_time?.(i) || 0.5
            };
            
            this.processThreat(threat, playerX, playerY);
        }
        
        // Get recent damage events for damage indicators
        const damageCount = this.wasmManager.exports.get_recent_damage_count?.() || 0;
        
        for (let i = 0; i < damageCount; i++) {
            const damage = {
                x: this.wasmManager.exports.get_damage_x?.(i) || playerX,
                y: this.wasmManager.exports.get_damage_y?.(i) || playerY,
                amount: this.wasmManager.exports.get_damage_amount?.(i) || 0,
                type: this.wasmManager.exports.get_damage_type?.(i) || 0,
                timestamp: performance.now()
            };
            
            this.addDamageIndicator(damage);
        }
    }

    /**
     * Process individual threat
     */
    processThreat(threat, playerX, playerY) {
        // Calculate direction from player to threat
        const dx = threat.x - playerX;
        const dy = threat.y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Determine threat urgency
        const urgency = this.calculateThreatUrgency(threat, distance);
        
        // Add or update directional indicator
        if (this.settings.enableDirectionalIndicators && distance > 0.1) {
            this.addOrUpdateDirectionalIndicator(threat, angle, urgency);
        }
        
        // Add telegraph warning if threat is about to attack
        if (this.settings.enableTelegraphWarnings && threat.timeToImpact < threat.telegraphTime) {
            this.addTelegraphWarning(threat);
        }
        
        // Trigger audio warning if needed
        if (this.settings.enableAudioCues && urgency > 0.7) {
            this.triggerAudioWarning(threat);
        }
    }

    /**
     * Calculate threat urgency (0-1 scale)
     */
    calculateThreatUrgency(threat, distance) {
        let urgency = 0;
        
        // Base urgency from time to impact
        urgency += Math.max(0, 1 - (threat.timeToImpact / 2.0)) * 0.5;
        
        // Distance factor (closer = more urgent)
        urgency += Math.max(0, 1 - (distance / 0.3)) * 0.3;
        
        // Threat intensity
        urgency += threat.intensity * 0.2;
        
        return Math.min(1.0, urgency);
    }

    /**
     * Add or update directional indicator
     */
    addOrUpdateDirectionalIndicator(threat, angle, urgency) {
        // Find existing indicator for this threat
        let indicator = this.activeThreatIndicators.find(ind => ind.threatId === threat.id);
        
        if (!indicator) {
            // Create new indicator
            indicator = {
                threatId: threat.id,
                angle: angle,
                urgency: urgency,
                type: threat.type,
                isBlockable: threat.isBlockable,
                isParryable: threat.isParryable,
                pulsePhase: 0,
                lifetime: 0
            };
            
            this.activeThreatIndicators.push(indicator);
        } else {
            // Update existing indicator
            indicator.angle = angle;
            indicator.urgency = urgency;
            indicator.type = threat.type;
            indicator.isBlockable = threat.isBlockable;
            indicator.isParryable = threat.isParryable;
        }
    }

    /**
     * Add telegraph warning
     */
    addTelegraphWarning(threat) {
        // Check if telegraph already exists
        const existing = this.telegraphIndicators.find(tel => tel.threatId === threat.id);
        if (existing) {
            return;
        }
        
        const telegraph = {
            threatId: threat.id,
            x: threat.x,
            y: threat.y,
            type: threat.type,
            isBlockable: threat.isBlockable,
            isParryable: threat.isParryable,
            timeToImpact: threat.timeToImpact,
            pulsePhase: 0,
            lifetime: 0,
            maxLifetime: threat.telegraphTime
        };
        
        this.telegraphIndicators.push(telegraph);
    }

    /**
     * Add damage indicator
     */
    addDamageIndicator(damage) {
        const indicator = {
            x: damage.x,
            y: damage.y,
            amount: damage.amount,
            type: damage.type,
            lifetime: 0,
            maxLifetime: this.visualConfig.damageIndicatorLifetime,
            velocityY: -50, // Float upward
            alpha: 1.0
        };
        
        this.damageIndicators.push(indicator);
    }

    /**
     * Trigger audio warning
     */
    triggerAudioWarning(threat) {
        if (!this.audioManager) {
            return;
        }

        const warningKey = `threat_${threat.id}`;
        
        // Avoid spamming audio warnings
        if (this.audioWarnings.has(warningKey)) {
            return;
        }
        
        // Determine audio cue based on threat type
        let audioFile = 'warning_generic';
        
        if (!threat.isBlockable && !threat.isParryable) {
            audioFile = 'warning_unblockable';
        } else if (threat.isParryable) {
            audioFile = 'warning_parryable';
        } else if (threat.isBlockable) {
            audioFile = 'warning_blockable';
        }
        
        // Play audio warning
        this.audioManager.playSound(audioFile, {
            volume: 0.7,
            priority: 'high'
        });
        
        // Track warning to prevent spam
        this.audioWarnings.set(warningKey, performance.now());
    }

    /**
     * Update threat indicators
     */
    updateThreatIndicators(deltaTime) {
        this.activeThreatIndicators.forEach(indicator => {
            indicator.lifetime += deltaTime;
            indicator.pulsePhase += deltaTime * this.visualConfig.telegraphPulseSpeed;
            
            if (indicator.pulsePhase > Math.PI * 2) {
                indicator.pulsePhase -= Math.PI * 2;
            }
        });
    }

    /**
     * Update damage indicators
     */
    updateDamageIndicators(deltaTime) {
        this.damageIndicators.forEach(indicator => {
            indicator.lifetime += deltaTime;
            indicator.y += indicator.velocityY * deltaTime;
            indicator.alpha = 1.0 - (indicator.lifetime / indicator.maxLifetime);
        });
    }

    /**
     * Update telegraph indicators
     */
    updateTelegraphIndicators(deltaTime) {
        this.telegraphIndicators.forEach(indicator => {
            indicator.lifetime += deltaTime;
            indicator.pulsePhase += deltaTime * this.visualConfig.telegraphPulseSpeed;
            
            if (indicator.pulsePhase > Math.PI * 2) {
                indicator.pulsePhase -= Math.PI * 2;
            }
        });
    }

    /**
     * Update audio warnings
     */
    updateAudioWarnings(_deltaTime) {
        const now = performance.now();
        const warningCooldown = 2000; // 2 seconds
        
        // Clean up old warnings
        for (const [key, timestamp] of this.audioWarnings.entries()) {
            if (now - timestamp > warningCooldown) {
                this.audioWarnings.delete(key);
            }
        }
    }

    /**
     * Clean up expired indicators
     */
    cleanupExpiredIndicators() {
        // Remove expired damage indicators
        this.damageIndicators = this.damageIndicators.filter(
            indicator => indicator.lifetime < indicator.maxLifetime
        );
        
        // Remove expired telegraph indicators
        this.telegraphIndicators = this.telegraphIndicators.filter(
            indicator => indicator.lifetime < indicator.maxLifetime
        );
        
        // Remove threat indicators for threats that no longer exist
        // (This would need WASM integration to track active threat IDs)
    }

    /**
     * Render threat awareness UI
     */
    render() {
        if (!this.threatCanvas || !this.threatCtx) {
            return;
        }

        const startTime = performance.now();
        
        // Clear canvas
        this.threatCtx.clearRect(0, 0, this.threatCanvas.width, this.threatCanvas.height);
        
        // Render directional indicators
        this.renderDirectionalIndicators();
        
        // Render telegraph warnings
        this.renderTelegraphWarnings();
        
        // Render damage indicators
        this.renderDamageIndicators();
        
        // Update performance metrics
        this.performanceMetrics.renderTime = performance.now() - startTime;
        this.performanceMetrics.indicatorCount = 
            this.activeThreatIndicators.length + 
            this.telegraphIndicators.length + 
            this.damageIndicators.length;
    }

    /**
     * Render directional threat indicators
     */
    renderDirectionalIndicators() {
        const centerX = this.threatCanvas.width / 2;
        const centerY = this.threatCanvas.height / 2;
        const colors = this.getColorScheme();
        
        this.activeThreatIndicators.forEach(indicator => {
            const distance = this.visualConfig.indicatorDistance;
            const x = centerX + Math.cos(indicator.angle) * distance;
            const y = centerY + Math.sin(indicator.angle) * distance;
            
            // Determine color based on threat type
            let color = colors.incoming;
            if (!indicator.isBlockable && !indicator.isParryable) {
                color = colors.unblockable;
            } else if (indicator.isParryable) {
                color = colors.parryable;
            } else if (indicator.isBlockable) {
                color = colors.blockable;
            }
            
            // Calculate pulse effect
            const pulseScale = 1.0 + Math.sin(indicator.pulsePhase) * 0.2 * indicator.urgency;
            const alpha = this.settings.indicatorOpacity * (0.6 + indicator.urgency * 0.4);
            
            this.drawDirectionalIndicator(x, y, color, alpha, pulseScale, indicator);
        });
    }

    /**
     * Draw individual directional indicator
     */
    drawDirectionalIndicator(x, y, color, alpha, scale, indicator) {
        const ctx = this.threatCtx;
        const radius = this.visualConfig.indicatorRadius * scale * this.settings.indicatorScale;
        const thickness = this.visualConfig.indicatorThickness * scale;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Draw outer ring
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw inner fill based on urgency
        if (indicator.urgency > 0.5) {
            ctx.fillStyle = color;
            ctx.globalAlpha = alpha * 0.3;
            ctx.beginPath();
            ctx.arc(x, y, radius - thickness, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw directional arrow
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        this.drawArrow(ctx, x, y, indicator.angle, radius * 0.6);
        
        // Draw threat type indicator
        this.drawThreatTypeIcon(ctx, x, y, indicator, radius * 0.3);
        
        ctx.restore();
    }

    /**
     * Draw arrow pointing in direction
     */
    drawArrow(ctx, x, y, angle, size) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        ctx.beginPath();
        ctx.moveTo(size, 0);
        ctx.lineTo(size * 0.6, -size * 0.3);
        ctx.lineTo(size * 0.6, size * 0.3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * Draw threat type icon
     */
    drawThreatTypeIcon(ctx, x, y, indicator, size) {
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.font = `${size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let icon = '⚠️';
        if (!indicator.isBlockable && !indicator.isParryable) {
            icon = '🚫'; // Unblockable
        } else if (indicator.isParryable) {
            icon = '⚔️'; // Parryable
        } else if (indicator.isBlockable) {
            icon = '🛡️'; // Blockable
        }
        
        ctx.fillText(icon, x, y);
        ctx.restore();
    }

    /**
     * Render telegraph warnings
     */
    renderTelegraphWarnings() {
        const colors = this.getColorScheme();
        
        this.telegraphIndicators.forEach(indicator => {
            // Convert world coordinates to screen coordinates
            const screenX = indicator.x * this.threatCanvas.width;
            const screenY = indicator.y * this.threatCanvas.height;
            
            // Determine color
            let color = colors.incoming;
            if (!indicator.isBlockable && !indicator.isParryable) {
                color = colors.unblockable;
            } else if (indicator.isParryable) {
                color = colors.parryable;
            } else if (indicator.isBlockable) {
                color = colors.blockable;
            }
            
            // Calculate pulse and fade
            const pulseScale = 1.0 + Math.sin(indicator.pulsePhase) * 0.3;
            const fadeAlpha = 1.0 - (indicator.lifetime / indicator.maxLifetime);
            
            this.drawTelegraphWarning(screenX, screenY, color, fadeAlpha, pulseScale, indicator);
        });
    }

    /**
     * Draw telegraph warning
     */
    drawTelegraphWarning(x, y, color, alpha, scale, indicator) {
        const ctx = this.threatCtx;
        const radius = this.visualConfig.telegraphRadius * scale;
        
        ctx.save();
        ctx.globalAlpha = alpha * this.settings.indicatorOpacity;
        
        // Draw pulsing circle
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw inner warning
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha * 0.2;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw countdown indicator
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        const progress = 1.0 - (indicator.lifetime / indicator.maxLifetime);
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (Math.PI * 2 * progress);
        
        ctx.beginPath();
        ctx.arc(x, y, radius + 8, startAngle, endAngle);
        ctx.stroke();
        
        ctx.restore();
    }

    /**
     * Render damage indicators
     */
    renderDamageIndicators() {
        this.damageIndicators.forEach(indicator => {
            // Convert world coordinates to screen coordinates
            const screenX = indicator.x * this.threatCanvas.width;
            const screenY = indicator.y * this.threatCanvas.height;
            
            this.drawDamageIndicator(screenX, screenY, indicator);
        });
    }

    /**
     * Draw damage indicator
     */
    drawDamageIndicator(x, y, indicator) {
        const ctx = this.threatCtx;
        
        ctx.save();
        ctx.globalAlpha = indicator.alpha * this.settings.indicatorOpacity;
        
        // Determine color based on damage type
        const colors = this.getColorScheme();
        let color = colors.critical;
        
        if (indicator.type === 0) { // Normal damage
            color = '#ff6b6b';
        } else if (indicator.type === 1) { // Critical damage
            color = colors.critical;
        } else if (indicator.type === 2) { // Environmental damage
            color = colors.environmental;
        }
        
        ctx.fillStyle = color;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.font = `bold ${this.visualConfig.damageIndicatorSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw damage amount
        const text = indicator.amount.toString();
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
        
        ctx.restore();
    }

    /**
     * Update settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Update color scheme if colorblind mode changed
        if (newSettings.colorBlindMode !== undefined) {
            this.setupColorBlindSupport();
            this.updateThreatLegend();
        }
        
        this.saveUserSettings();
    }

    /**
     * Update threat legend with new colors
     */
    updateThreatLegend() {
        const legend = document.getElementById('threat-legend');
        if (legend) {
            legend.innerHTML = this.createThreatLegend();
        }
    }

    /**
     * Resize canvas to match game canvas
     */
    resizeCanvas() {
        if (this.threatCanvas && this.canvas) {
            this.threatCanvas.width = this.canvas.width;
            this.threatCanvas.height = this.canvas.height;
        }
    }

    /**
     * Load user settings
     */
    loadUserSettings() {
        try {
            const savedSettings = localStorage.getItem('threatAwarenessSettings');
            if (savedSettings) {
                const parsedSettings = JSON.parse(savedSettings);
                this.settings = { ...this.settings, ...parsedSettings };
                this.setupColorBlindSupport();
            }
        } catch (error) {
            console.warn('Failed to load threat awareness settings:', error);
        }
    }

    /**
     * Save user settings
     */
    saveUserSettings() {
        try {
            localStorage.setItem('threatAwarenessSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save threat awareness settings:', error);
        }
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }

    /**
     * Enable/disable threat awareness
     */
    setEnabled(enabled) {
        const overlay = document.getElementById('threat-awareness-overlay');
        if (overlay) {
            overlay.style.display = enabled ? 'block' : 'none';
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        const overlay = document.getElementById('threat-awareness-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        this.activeThreatIndicators.length = 0;
        this.damageIndicators.length = 0;
        this.telegraphIndicators.length = 0;
        this.audioWarnings.clear();
    }
}
