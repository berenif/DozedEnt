/**
 * Death/Failure Feedback System for DozedEnt
 * Provides comprehensive analysis of death events with damage sources,
 * timeline reconstruction, missed opportunities, and improvement suggestions
 * 
 * Follows WASM-first architecture - only displays data from WASM, no game logic
 */

export class DeathFeedbackSystem {
    constructor(wasmManager) {
        this.wasmManager = wasmManager;
        this.isActive = false;
        this.deathData = null;
        
        // Combat event tracking (populated by WASM exports)
        this.combatTimeline = [];
        this.damageEvents = [];
        this.missedOpportunities = [];
        this.performanceMetrics = {};
        
        // UI elements
        this.overlayElement = null;
        this.timelineCanvas = null;
        this.timelineCtx = null;
        
        // Animation state
        this.animationProgress = 0;
        this.isAnimating = false;
        
        this.initialize();
    }

    /**
     * Initialize the death feedback system
     */
    initialize() {
        this.createDeathFeedbackOverlay();
        this.setupEventListeners();
    }

    /**
     * Create the death feedback overlay UI
     */
    createDeathFeedbackOverlay() {
        // Remove existing overlay if present
        const existing = document.getElementById('death-feedback-overlay');
        if (existing) {
            existing.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'death-feedback-overlay';
        overlay.className = 'death-feedback-overlay hidden';
        
        overlay.innerHTML = `
            <div class="death-feedback-container">
                <!-- Header Section -->
                <div class="death-feedback-header">
                    <div class="death-title">
                        <h1 id="death-title-text">Combat Analysis</h1>
                        <div class="death-subtitle" id="death-subtitle">Analyzing your performance...</div>
                    </div>
                    <div class="death-stats-summary">
                        <div class="stat-item">
                            <span class="stat-label">Survival Time</span>
                            <span class="stat-value" id="survival-time">--:--</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Rooms Cleared</span>
                            <span class="stat-value" id="rooms-cleared">--</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Enemies Defeated</span>
                            <span class="stat-value" id="enemies-defeated">--</span>
                        </div>
                    </div>
                </div>

                <!-- Main Content Tabs -->
                <div class="death-feedback-tabs">
                    <button class="tab-button active" data-tab="timeline">Timeline</button>
                    <button class="tab-button" data-tab="damage-analysis">Damage Sources</button>
                    <button class="tab-button" data-tab="opportunities">Missed Opportunities</button>
                    <button class="tab-button" data-tab="suggestions">Improvement Tips</button>
                </div>

                <!-- Tab Content -->
                <div class="death-feedback-content">
                    <!-- Timeline Tab -->
                    <div class="tab-content active" id="timeline-tab">
                        <div class="timeline-header">
                            <h3>Combat Timeline</h3>
                            <div class="timeline-controls">
                                <button id="timeline-play" class="timeline-btn">▶️ Replay</button>
                                <input type="range" id="timeline-scrubber" min="0" max="100" value="100" class="timeline-scrubber">
                                <span id="timeline-time">0:00 / 0:00</span>
                            </div>
                        </div>
                        <div class="timeline-container">
                            <canvas id="timeline-canvas" class="timeline-canvas"></canvas>
                            <div class="timeline-legend">
                                <div class="legend-item">
                                    <div class="legend-color damage-taken"></div>
                                    <span>Damage Taken</span>
                                </div>
                                <div class="legend-item">
                                    <div class="legend-color damage-dealt"></div>
                                    <span>Damage Dealt</span>
                                </div>
                                <div class="legend-item">
                                    <div class="legend-color missed-opportunity"></div>
                                    <span>Missed Opportunities</span>
                                </div>
                                <div class="legend-item">
                                    <div class="legend-color successful-action"></div>
                                    <span>Successful Actions</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Damage Analysis Tab -->
                    <div class="tab-content" id="damage-analysis-tab">
                        <div class="damage-breakdown">
                            <h3>Damage Sources</h3>
                            <div class="damage-chart-container">
                                <canvas id="damage-chart" class="damage-chart"></canvas>
                                <div class="damage-details" id="damage-details">
                                    <!-- Populated dynamically -->
                                </div>
                            </div>
                        </div>
                        <div class="damage-timeline">
                            <h4>Damage Over Time</h4>
                            <div class="damage-events" id="damage-events">
                                <!-- Populated dynamically -->
                            </div>
                        </div>
                    </div>

                    <!-- Missed Opportunities Tab -->
                    <div class="tab-content" id="opportunities-tab">
                        <div class="opportunities-header">
                            <h3>Missed Opportunities</h3>
                            <div class="opportunity-summary">
                                <div class="opportunity-stat">
                                    <span class="stat-number" id="missed-blocks">--</span>
                                    <span class="stat-label">Missed Blocks</span>
                                </div>
                                <div class="opportunity-stat">
                                    <span class="stat-number" id="missed-parries">--</span>
                                    <span class="stat-label">Missed Parries</span>
                                </div>
                                <div class="opportunity-stat">
                                    <span class="stat-number" id="missed-rolls">--</span>
                                    <span class="stat-label">Missed Dodges</span>
                                </div>
                            </div>
                        </div>
                        <div class="opportunities-list" id="opportunities-list">
                            <!-- Populated dynamically -->
                        </div>
                    </div>

                    <!-- Improvement Suggestions Tab -->
                    <div class="tab-content" id="suggestions-tab">
                        <div class="suggestions-container">
                            <h3>Personalized Improvement Tips</h3>
                            <div class="suggestion-categories">
                                <div class="suggestion-category" id="combat-suggestions">
                                    <h4>🗡️ Combat Technique</h4>
                                    <div class="suggestions-list">
                                        <!-- Populated dynamically -->
                                    </div>
                                </div>
                                <div class="suggestion-category" id="positioning-suggestions">
                                    <h4>🎯 Positioning & Movement</h4>
                                    <div class="suggestions-list">
                                        <!-- Populated dynamically -->
                                    </div>
                                </div>
                                <div class="suggestion-category" id="resource-suggestions">
                                    <h4>⚡ Resource Management</h4>
                                    <div class="suggestions-list">
                                        <!-- Populated dynamically -->
                                    </div>
                                </div>
                                <div class="suggestion-category" id="strategic-suggestions">
                                    <h4>🧠 Strategic Decisions</h4>
                                    <div class="suggestions-list">
                                        <!-- Populated dynamically -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Actions -->
                <div class="death-feedback-footer">
                    <button id="restart-run" class="btn-primary">Start New Run</button>
                    <button id="view-stats" class="btn-secondary">View Full Stats</button>
                    <button id="close-feedback" class="btn-tertiary">Close Analysis</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.overlayElement = overlay;
        
        // Initialize canvas
        this.timelineCanvas = document.getElementById('timeline-canvas');
        this.timelineCtx = this.timelineCanvas.getContext('2d');
        this.resizeCanvas();
    }

    /**
     * Setup event listeners for the death feedback system
     */
    setupEventListeners() {
        // Tab switching
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Timeline controls
        const playButton = document.getElementById('timeline-play');
        const scrubber = document.getElementById('timeline-scrubber');
        
        if (playButton) {
            playButton.addEventListener('click', () => {
                this.toggleTimelinePlayback();
            });
        }
        
        if (scrubber) {
            scrubber.addEventListener('input', (e) => {
                this.scrubTimeline(parseFloat(e.target.value));
            });
        }

        // Footer actions
        const restartButton = document.getElementById('restart-run');
        const statsButton = document.getElementById('view-stats');
        const closeButton = document.getElementById('close-feedback');
        
        if (restartButton) {
            restartButton.addEventListener('click', () => {
                this.restartRun();
            });
        }
        
        if (statsButton) {
            statsButton.addEventListener('click', () => {
                this.showFullStats();
            });
        }
        
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hide();
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.isActive) {
                this.handleKeyboardInput(e);
            }
        });

        // Window resize
        window.addEventListener('resize', () => {
            if (this.isActive) {
                this.resizeCanvas();
            }
        });
    }

    /**
     * Show death feedback with analysis data
     * @param {Object} deathData - Death event data from WASM
     */
    show(deathData) {
        this.deathData = deathData;
        this.isActive = true;
        
        // Gather data from WASM exports
        this.gatherCombatData();
        
        // Populate UI with data
        this.populateDeathSummary();
        this.populateTimeline();
        this.populateDamageAnalysis();
        this.populateMissedOpportunities();
        this.generateImprovementSuggestions();
        
        // Show overlay with animation
        this.overlayElement.classList.remove('hidden');
        this.animateIn();
    }

    /**
     * Hide death feedback overlay
     */
    hide() {
        this.isActive = false;
        this.overlayElement.classList.add('hidden');
        this.animationProgress = 0;
        this.isAnimating = false;
    }

    /**
     * Gather combat data from WASM exports
     */
    gatherCombatData() {
        if (!this.wasmManager || !this.wasmManager.exports) {
            console.warn('WASM manager not available for death feedback');
            return;
        }

        try {
            // Get basic stats
            this.performanceMetrics = {
                survivalTime: this.wasmManager.exports.get_survival_time?.() || 0,
                roomsCleared: this.wasmManager.exports.get_rooms_cleared?.() || 0,
                enemiesDefeated: this.wasmManager.exports.get_enemies_defeated?.() || 0,
                totalDamageDealt: this.wasmManager.exports.get_total_damage_dealt?.() || 0,
                totalDamageTaken: this.wasmManager.exports.get_total_damage_taken?.() || 0,
                perfectParries: this.wasmManager.exports.get_perfect_parries?.() || 0,
                successfulBlocks: this.wasmManager.exports.get_successful_blocks?.() || 0,
                successfulDodges: this.wasmManager.exports.get_successful_dodges?.() || 0
            };

            // Get combat timeline events
            this.gatherTimelineEvents();
            
            // Get damage breakdown
            this.gatherDamageEvents();
            
            // Analyze missed opportunities
            this.analyzeMissedOpportunities();
            
        } catch (error) {
            console.error('Error gathering combat data:', error);
        }
    }

    /**
     * Gather timeline events from WASM
     */
    gatherTimelineEvents() {
        this.combatTimeline = [];
        
        try {
            const eventCount = this.wasmManager.exports.get_combat_event_count?.() || 0;
            
            for (let i = 0; i < eventCount; i++) {
                const event = {
                    timestamp: this.wasmManager.exports.get_combat_event_time?.(i) || 0,
                    type: this.wasmManager.exports.get_combat_event_type?.(i) || 0,
                    value: this.wasmManager.exports.get_combat_event_value?.(i) || 0,
                    x: this.wasmManager.exports.get_combat_event_x?.(i) || 0,
                    y: this.wasmManager.exports.get_combat_event_y?.(i) || 0
                };
                
                this.combatTimeline.push(event);
            }
            
            // Sort by timestamp
            this.combatTimeline.sort((a, b) => a.timestamp - b.timestamp);
            
        } catch (error) {
            console.error('Error gathering timeline events:', error);
        }
    }

    /**
     * Gather damage events from WASM
     */
    gatherDamageEvents() {
        this.damageEvents = [];
        
        try {
            const damageCount = this.wasmManager.exports.get_damage_event_count?.() || 0;
            
            for (let i = 0; i < damageCount; i++) {
                const event = {
                    timestamp: this.wasmManager.exports.get_damage_event_time?.(i) || 0,
                    amount: this.wasmManager.exports.get_damage_event_amount?.(i) || 0,
                    source: this.wasmManager.exports.get_damage_event_source?.(i) || 0,
                    type: this.wasmManager.exports.get_damage_event_type?.(i) || 0,
                    wasBlocked: this.wasmManager.exports.get_damage_event_blocked?.(i) || false,
                    wasParried: this.wasmManager.exports.get_damage_event_parried?.(i) || false
                };
                
                this.damageEvents.push(event);
            }
            
        } catch (error) {
            console.error('Error gathering damage events:', error);
        }
    }

    /**
     * Analyze missed opportunities from combat data
     */
    analyzeMissedOpportunities() {
        this.missedOpportunities = [];
        
        try {
            const opportunityCount = this.wasmManager.exports.get_missed_opportunity_count?.() || 0;
            
            for (let i = 0; i < opportunityCount; i++) {
                const opportunity = {
                    timestamp: this.wasmManager.exports.get_missed_opportunity_time?.(i) || 0,
                    type: this.wasmManager.exports.get_missed_opportunity_type?.(i) || 0, // 0=block, 1=parry, 2=dodge
                    windowSize: this.wasmManager.exports.get_missed_opportunity_window?.(i) || 0,
                    damageAvoided: this.wasmManager.exports.get_missed_opportunity_damage?.(i) || 0,
                    description: this.getMissedOpportunityDescription(
                        this.wasmManager.exports.get_missed_opportunity_type?.(i) || 0
                    )
                };
                
                this.missedOpportunities.push(opportunity);
            }
            
        } catch (error) {
            console.error('Error analyzing missed opportunities:', error);
        }
    }

    /**
     * Get description for missed opportunity type
     */
    getMissedOpportunityDescription(type) {
        const descriptions = {
            0: 'Could have blocked incoming attack',
            1: 'Perfect parry window was available',
            2: 'Dodge roll would have avoided damage',
            3: 'Counter-attack opportunity missed',
            4: 'Healing window was available'
        };
        
        return descriptions[type] || 'Missed tactical opportunity';
    }

    /**
     * Populate death summary section
     */
    populateDeathSummary() {
        // Update title based on death cause
        const titleElement = document.getElementById('death-title-text');
        const subtitleElement = document.getElementById('death-subtitle');
        
        if (titleElement && subtitleElement) {
            const deathCause = this.deathData?.cause || 'unknown';
            titleElement.textContent = this.getDeathTitle(deathCause);
            subtitleElement.textContent = this.getDeathSubtitle(deathCause);
        }

        // Update stats
        const survivalTimeElement = document.getElementById('survival-time');
        const roomsClearedElement = document.getElementById('rooms-cleared');
        const enemiesDefeatedElement = document.getElementById('enemies-defeated');
        
        if (survivalTimeElement) {
            survivalTimeElement.textContent = this.formatTime(this.performanceMetrics.survivalTime);
        }
        
        if (roomsClearedElement) {
            roomsClearedElement.textContent = this.performanceMetrics.roomsCleared.toString();
        }
        
        if (enemiesDefeatedElement) {
            enemiesDefeatedElement.textContent = this.performanceMetrics.enemiesDefeated.toString();
        }
    }

    /**
     * Get death title based on cause
     */
    getDeathTitle(cause) {
        const titles = {
            'wolf_pack': '🐺 Overwhelmed by Wolf Pack',
            'stamina_exhaustion': '⚡ Stamina Depletion',
            'environmental': '🌋 Environmental Hazard',
            'boss_encounter': '👹 Boss Encounter',
            'unknown': '💀 Combat Analysis'
        };
        
        return titles[cause] || titles.unknown;
    }

    /**
     * Get death subtitle based on cause
     */
    getDeathSubtitle(cause) {
        const subtitles = {
            'wolf_pack': 'Multiple enemies coordinated against you',
            'stamina_exhaustion': 'Ran out of stamina at a critical moment',
            'environmental': 'Environmental damage proved fatal',
            'boss_encounter': 'Fell to a powerful enemy',
            'unknown': 'Reviewing your combat performance'
        };
        
        return subtitles[cause] || subtitles.unknown;
    }

    /**
     * Populate timeline visualization
     */
    populateTimeline() {
        if (!this.timelineCanvas || !this.timelineCtx) {
            return;
        }

        this.drawTimeline();
    }

    /**
     * Draw timeline on canvas
     */
    drawTimeline() {
        const ctx = this.timelineCtx;
        const canvas = this.timelineCanvas;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (this.combatTimeline.length === 0) {
            // Draw "No data available" message
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No combat data available', canvas.width / 2, canvas.height / 2);
            return;
        }

        const padding = 40;
        const timelineWidth = canvas.width - (padding * 2);
        const timelineHeight = canvas.height - (padding * 2);
        const maxTime = Math.max(...this.combatTimeline.map(e => e.timestamp));
        
        // Draw timeline background
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();
        
        // Draw time markers
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        
        for (let i = 0; i <= 10; i++) {
            const x = padding + (timelineWidth * i / 10);
            const time = (maxTime * i / 10);
            
            ctx.beginPath();
            ctx.moveTo(x, canvas.height - padding);
            ctx.lineTo(x, canvas.height - padding + 5);
            ctx.stroke();
            
            ctx.fillText(this.formatTime(time), x, canvas.height - padding + 20);
        }
        
        // Draw events
        this.combatTimeline.forEach((event, index) => {
            const x = padding + (timelineWidth * event.timestamp / maxTime);
            const y = this.getEventY(event, timelineHeight, padding);
            
            this.drawTimelineEvent(ctx, event, x, y);
        });
        
        // Draw current scrubber position if timeline is being scrubbed
        const scrubber = document.getElementById('timeline-scrubber');
        if (scrubber) {
            const scrubPosition = parseFloat(scrubber.value) / 100;
            const scrubX = padding + (timelineWidth * scrubPosition);
            
            ctx.strokeStyle = '#ff6b6b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(scrubX, padding);
            ctx.lineTo(scrubX, canvas.height - padding);
            ctx.stroke();
        }
    }

    /**
     * Get Y position for timeline event based on type
     */
    getEventY(event, timelineHeight, padding) {
        const eventTypes = {
            0: 0.8, // Damage taken (bottom)
            1: 0.6, // Damage dealt
            2: 0.4, // Missed opportunity
            3: 0.2, // Successful action (top)
        };
        
        const ratio = eventTypes[event.type] || 0.5;
        return padding + (timelineHeight * ratio);
    }

    /**
     * Draw individual timeline event
     */
    drawTimelineEvent(ctx, event, x, y) {
        const colors = {
            0: '#ff6b6b', // Damage taken (red)
            1: '#4ade80', // Damage dealt (green)
            2: '#fbbf24', // Missed opportunity (yellow)
            3: '#60a5fa', // Successful action (blue)
        };
        
        const color = colors[event.type] || '#666';
        const size = Math.max(3, Math.min(10, event.value / 10));
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add outline for better visibility
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    /**
     * Populate damage analysis section
     */
    populateDamageAnalysis() {
        const damageDetailsElement = document.getElementById('damage-details');
        const damageEventsElement = document.getElementById('damage-events');
        
        if (!damageDetailsElement || !damageEventsElement) {
            return;
        }

        // Calculate damage breakdown by source
        const damageBySource = {};
        let totalDamage = 0;
        
        this.damageEvents.forEach(event => {
            const sourceName = this.getDamageSourceName(event.source);
            damageBySource[sourceName] = (damageBySource[sourceName] || 0) + event.amount;
            totalDamage += event.amount;
        });

        // Populate damage breakdown
        damageDetailsElement.innerHTML = '';
        Object.entries(damageBySource).forEach(([source, damage]) => {
            const percentage = totalDamage > 0 ? (damage / totalDamage * 100).toFixed(1) : 0;
            
            const sourceElement = document.createElement('div');
            sourceElement.className = 'damage-source-item';
            sourceElement.innerHTML = `
                <div class="damage-source-info">
                    <span class="damage-source-name">${source}</span>
                    <span class="damage-source-amount">${damage} damage</span>
                </div>
                <div class="damage-source-bar">
                    <div class="damage-source-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="damage-source-percent">${percentage}%</span>
            `;
            
            damageDetailsElement.appendChild(sourceElement);
        });

        // Populate damage events timeline
        damageEventsElement.innerHTML = '';
        this.damageEvents.slice(-10).forEach(event => { // Show last 10 events
            const eventElement = document.createElement('div');
            eventElement.className = 'damage-event-item';
            
            const statusClass = event.wasParried ? 'parried' : event.wasBlocked ? 'blocked' : 'hit';
            const statusText = event.wasParried ? 'PARRIED' : event.wasBlocked ? 'BLOCKED' : 'HIT';
            
            eventElement.innerHTML = `
                <div class="damage-event-time">${this.formatTime(event.timestamp)}</div>
                <div class="damage-event-source">${this.getDamageSourceName(event.source)}</div>
                <div class="damage-event-amount ${statusClass}">${event.amount} ${statusText}</div>
            `;
            
            damageEventsElement.appendChild(eventElement);
        });
    }

    /**
     * Get damage source name from ID
     */
    getDamageSourceName(sourceId) {
        const sources = {
            0: 'Wolf Bite',
            1: 'Wolf Claw',
            2: 'Pack Coordination',
            3: 'Environmental',
            4: 'Boss Attack',
            5: 'Hazard'
        };
        
        return sources[sourceId] || 'Unknown';
    }

    /**
     * Populate missed opportunities section
     */
    populateMissedOpportunities() {
        // Update summary stats
        const missedBlocks = this.missedOpportunities.filter(op => op.type === 0).length;
        const missedParries = this.missedOpportunities.filter(op => op.type === 1).length;
        const missedRolls = this.missedOpportunities.filter(op => op.type === 2).length;
        
        const missedBlocksElement = document.getElementById('missed-blocks');
        const missedParriesElement = document.getElementById('missed-parries');
        const missedRollsElement = document.getElementById('missed-rolls');
        
        if (missedBlocksElement) missedBlocksElement.textContent = missedBlocks.toString();
        if (missedParriesElement) missedParriesElement.textContent = missedParries.toString();
        if (missedRollsElement) missedRollsElement.textContent = missedRolls.toString();

        // Populate opportunities list
        const opportunitiesListElement = document.getElementById('opportunities-list');
        if (!opportunitiesListElement) {
            return;
        }

        opportunitiesListElement.innerHTML = '';
        
        if (this.missedOpportunities.length === 0) {
            opportunitiesListElement.innerHTML = `
                <div class="no-opportunities">
                    <p>🎉 Great job! No major missed opportunities detected.</p>
                </div>
            `;
            return;
        }

        this.missedOpportunities.forEach(opportunity => {
            const opportunityElement = document.createElement('div');
            opportunityElement.className = 'opportunity-item';
            
            const typeIcon = this.getOpportunityIcon(opportunity.type);
            const typeColor = this.getOpportunityColor(opportunity.type);
            
            opportunityElement.innerHTML = `
                <div class="opportunity-icon" style="color: ${typeColor}">${typeIcon}</div>
                <div class="opportunity-details">
                    <div class="opportunity-description">${opportunity.description}</div>
                    <div class="opportunity-meta">
                        <span class="opportunity-time">At ${this.formatTime(opportunity.timestamp)}</span>
                        <span class="opportunity-damage">Could have avoided ${opportunity.damageAvoided} damage</span>
                        <span class="opportunity-window">Window: ${(opportunity.windowSize * 1000).toFixed(0)}ms</span>
                    </div>
                </div>
            `;
            
            opportunitiesListElement.appendChild(opportunityElement);
        });
    }

    /**
     * Get icon for opportunity type
     */
    getOpportunityIcon(type) {
        const icons = {
            0: '🛡️', // Block
            1: '⚔️', // Parry
            2: '🌀', // Dodge
            3: '💥', // Counter
            4: '❤️'  // Heal
        };
        
        return icons[type] || '❓';
    }

    /**
     * Get color for opportunity type
     */
    getOpportunityColor(type) {
        const colors = {
            0: '#60a5fa', // Block (blue)
            1: '#fbbf24', // Parry (yellow)
            2: '#4ade80', // Dodge (green)
            3: '#f87171', // Counter (red)
            4: '#fb7185'  // Heal (pink)
        };
        
        return colors[type] || '#666';
    }

    /**
     * Generate personalized improvement suggestions
     */
    generateImprovementSuggestions() {
        const suggestions = {
            combat: [],
            positioning: [],
            resource: [],
            strategic: []
        };

        // Analyze combat performance
        this.analyzeCombatSuggestions(suggestions.combat);
        this.analyzePositioningSuggestions(suggestions.positioning);
        this.analyzeResourceSuggestions(suggestions.resource);
        this.analyzeStrategicSuggestions(suggestions.strategic);

        // Populate suggestion categories
        this.populateSuggestionCategory('combat-suggestions', suggestions.combat);
        this.populateSuggestionCategory('positioning-suggestions', suggestions.positioning);
        this.populateSuggestionCategory('resource-suggestions', suggestions.resource);
        this.populateSuggestionCategory('strategic-suggestions', suggestions.strategic);
    }

    /**
     * Analyze combat technique suggestions
     */
    analyzeCombatSuggestions(suggestions) {
        const missedParries = this.missedOpportunities.filter(op => op.type === 1).length;
        const missedBlocks = this.missedOpportunities.filter(op => op.type === 0).length;
        const missedDodges = this.missedOpportunities.filter(op => op.type === 2).length;
        
        if (missedParries > 3) {
            suggestions.push({
                priority: 'high',
                title: 'Perfect Your Parry Timing',
                description: `You missed ${missedParries} parry opportunities. Practice the 120ms parry window in training mode.`,
                actionable: 'Try parrying just as the enemy attack animation reaches its peak.'
            });
        }
        
        if (missedBlocks > 5) {
            suggestions.push({
                priority: 'medium',
                title: 'Improve Defensive Awareness',
                description: `${missedBlocks} attacks could have been blocked. Watch for enemy telegraphs more carefully.`,
                actionable: 'Hold block when you see enemies winding up attacks.'
            });
        }
        
        if (missedDodges > 2) {
            suggestions.push({
                priority: 'medium',
                title: 'Use Dodge Rolls More Effectively',
                description: `${missedDodges} dodge opportunities were missed. Rolling provides 300ms of invincibility.`,
                actionable: 'Roll through attacks rather than away from them for better positioning.'
            });
        }

        // Analyze damage efficiency
        const damageRatio = this.performanceMetrics.totalDamageDealt / Math.max(1, this.performanceMetrics.totalDamageTaken);
        if (damageRatio < 1.5) {
            suggestions.push({
                priority: 'medium',
                title: 'Increase Damage Efficiency',
                description: 'You\'re taking more damage than you\'re dealing. Focus on hit-and-run tactics.',
                actionable: 'Attack during enemy recovery windows, then retreat to safety.'
            });
        }
    }

    /**
     * Analyze positioning and movement suggestions
     */
    analyzePositioningSuggestions(suggestions) {
        // This would analyze movement patterns from WASM data
        // For now, provide general positioning advice based on death cause
        
        if (this.deathData?.cause === 'wolf_pack') {
            suggestions.push({
                priority: 'high',
                title: 'Avoid Being Surrounded',
                description: 'You were overwhelmed by multiple enemies. Use terrain to limit approach angles.',
                actionable: 'Fight with your back to walls or in narrow passages when facing multiple enemies.'
            });
        }
        
        suggestions.push({
            priority: 'low',
            title: 'Master Spacing Control',
            description: 'Maintain optimal distance from enemies to maximize your reaction time.',
            actionable: 'Stay at the edge of your attack range, just outside enemy reach.'
        });
    }

    /**
     * Analyze resource management suggestions
     */
    analyzeResourceSuggestions(suggestions) {
        if (this.deathData?.cause === 'stamina_exhaustion') {
            suggestions.push({
                priority: 'high',
                title: 'Manage Stamina More Carefully',
                description: 'You ran out of stamina at a critical moment. Always keep some in reserve.',
                actionable: 'Never let stamina drop below 25% during combat encounters.'
            });
        }
        
        // Analyze stamina usage patterns
        const avgStaminaUsage = this.calculateAverageStaminaUsage();
        if (avgStaminaUsage > 0.8) {
            suggestions.push({
                priority: 'medium',
                title: 'Reduce Stamina Consumption',
                description: 'You\'re using stamina very aggressively. Consider more conservative play.',
                actionable: 'Use light attacks more often than heavy attacks to conserve stamina.'
            });
        }
    }

    /**
     * Analyze strategic decision suggestions
     */
    analyzeStrategicSuggestions(suggestions) {
        if (this.performanceMetrics.roomsCleared < 3) {
            suggestions.push({
                priority: 'medium',
                title: 'Focus on Early Game Survival',
                description: 'You\'re dying early in runs. Prioritize safety over aggression initially.',
                actionable: 'Take defensive choices in the first few rooms to build up survivability.'
            });
        }
        
        suggestions.push({
            priority: 'low',
            title: 'Learn Enemy Patterns',
            description: 'Each enemy type has predictable attack patterns you can exploit.',
            actionable: 'Spend time observing enemy behavior before engaging aggressively.'
        });
    }

    /**
     * Calculate average stamina usage (placeholder)
     */
    calculateAverageStaminaUsage() {
        // This would analyze stamina usage patterns from WASM data
        // For now, return a reasonable default
        return 0.6;
    }

    /**
     * Populate suggestion category with suggestions
     */
    populateSuggestionCategory(categoryId, suggestions) {
        const categoryElement = document.getElementById(categoryId);
        if (!categoryElement) {
            return;
        }

        const suggestionsContainer = categoryElement.querySelector('.suggestions-list');
        if (!suggestionsContainer) {
            return;
        }

        suggestionsContainer.innerHTML = '';
        
        if (suggestions.length === 0) {
            suggestionsContainer.innerHTML = `
                <div class="no-suggestions">
                    <p>✨ You're doing great in this area!</p>
                </div>
            `;
            return;
        }

        suggestions.forEach(suggestion => {
            const suggestionElement = document.createElement('div');
            suggestionElement.className = `suggestion-item priority-${suggestion.priority}`;
            
            const priorityIcon = suggestion.priority === 'high' ? '🔥' : 
                               suggestion.priority === 'medium' ? '⚠️' : '💡';
            
            suggestionElement.innerHTML = `
                <div class="suggestion-header">
                    <span class="suggestion-priority">${priorityIcon}</span>
                    <h5 class="suggestion-title">${suggestion.title}</h5>
                </div>
                <p class="suggestion-description">${suggestion.description}</p>
                <div class="suggestion-actionable">
                    <strong>Try this:</strong> ${suggestion.actionable}
                </div>
            `;
            
            suggestionsContainer.appendChild(suggestionElement);
        });
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        // Update tab buttons
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabName);
        });

        // Update tab content
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        // Redraw canvas if switching to timeline
        if (tabName === 'timeline') {
            setTimeout(() => this.drawTimeline(), 100);
        }
    }

    /**
     * Toggle timeline playback
     */
    toggleTimelinePlayback() {
        const playButton = document.getElementById('timeline-play');
        if (!playButton) {
            return;
        }

        if (this.isAnimating) {
            this.isAnimating = false;
            playButton.textContent = '▶️ Replay';
        } else {
            this.isAnimating = true;
            playButton.textContent = '⏸️ Pause';
            this.animateTimeline();
        }
    }

    /**
     * Animate timeline playback
     */
    animateTimeline() {
        if (!this.isAnimating) {
            return;
        }

        const scrubber = document.getElementById('timeline-scrubber');
        const timeDisplay = document.getElementById('timeline-time');
        
        if (!scrubber || !timeDisplay) {
            return;
        }

        const currentValue = parseFloat(scrubber.value);
        const newValue = Math.min(100, currentValue + 0.5); // Adjust speed as needed
        
        scrubber.value = newValue.toString();
        this.scrubTimeline(newValue);
        
        if (newValue >= 100) {
            this.isAnimating = false;
            const playButton = document.getElementById('timeline-play');
            if (playButton) {
                playButton.textContent = '🔄 Replay';
            }
        } else {
            requestAnimationFrame(() => this.animateTimeline());
        }
    }

    /**
     * Scrub timeline to specific position
     */
    scrubTimeline(position) {
        const timeDisplay = document.getElementById('timeline-time');
        if (!timeDisplay) {
            return;
        }

        const maxTime = this.combatTimeline.length > 0 ? 
            Math.max(...this.combatTimeline.map(e => e.timestamp)) : 0;
        const currentTime = (position / 100) * maxTime;
        
        timeDisplay.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(maxTime)}`;
        
        // Redraw timeline with scrubber position
        this.drawTimeline();
    }

    /**
     * Handle keyboard input for accessibility
     */
    handleKeyboardInput(e) {
        switch (e.key) {
            case 'Escape':
                this.hide();
                break;
            case 'Tab':
                // Let default tab navigation work
                break;
            case 'Enter':
            case ' ':
                if (e.target.classList.contains('tab-button')) {
                    e.preventDefault();
                    this.switchTab(e.target.dataset.tab);
                }
                break;
        }
    }

    /**
     * Restart the run
     */
    restartRun() {
        this.hide();
        
        // Trigger restart through WASM
        if (this.wasmManager && this.wasmManager.exports && this.wasmManager.exports.reset_run) {
            const newSeed = Math.floor(Math.random() * 1000000);
            this.wasmManager.exports.reset_run(newSeed);
        }
        
        // Emit restart event for other systems
        document.dispatchEvent(new CustomEvent('gameRestart'));
    }

    /**
     * Show full statistics
     */
    showFullStats() {
        // This would open a detailed statistics view
        console.log('Opening full statistics view...');
        // Could integrate with existing stats system
    }

    /**
     * Animate overlay entrance
     */
    animateIn() {
        this.animationProgress = 0;
        this.isAnimating = true;
        
        const animate = () => {
            this.animationProgress += 0.05;
            
            if (this.animationProgress >= 1) {
                this.animationProgress = 1;
                this.isAnimating = false;
            } else {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    /**
     * Resize canvas to fit container
     */
    resizeCanvas() {
        if (!this.timelineCanvas) {
            return;
        }

        const container = this.timelineCanvas.parentElement;
        if (container) {
            this.timelineCanvas.width = container.clientWidth;
            this.timelineCanvas.height = Math.min(300, container.clientHeight);
            
            if (this.isActive) {
                this.drawTimeline();
            }
        }
    }

    /**
     * Format time in MM:SS format
     */
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}
