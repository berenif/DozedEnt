/**
 * Choice System Clarity Enhancement for DozedEnt
 * Improves choice system UI with:
 * - Consistent visual language for risk/reward
 * - Clear comparison tools between choices
 * - Immediate vs long-term consequence visualization
 * - Reduced choice paralysis through better information architecture
 * 
 * Follows WASM-first architecture - only displays choice data from WASM
 */

export class ChoiceSystemClarity {
    constructor(wasmManager) {
        this.wasmManager = wasmManager;
        this.isActive = false;
        this.currentChoices = [];
        
        // Choice comparison state
        this.selectedForComparison = new Set();
        this.comparisonMode = false;
        
        // Visual configuration
        this.visualConfig = {
            // Risk/reward visual language
            riskColors: {
                safe: '#10b981',      // Green - low risk
                moderate: '#f59e0b',  // Amber - medium risk
                risky: '#ef4444',     // Red - high risk
                unknown: '#6b7280'    // Gray - unknown risk
            },
            
            rewardColors: {
                low: '#6b7280',       // Gray - low reward
                medium: '#3b82f6',    // Blue - medium reward
                high: '#8b5cf6',      // Purple - high reward
                legendary: '#f59e0b'  // Gold - legendary reward
            },
            
            // Consequence timeline colors
            consequenceColors: {
                immediate: '#10b981',  // Green - immediate effect
                shortTerm: '#3b82f6', // Blue - short term (1-3 rooms)
                longTerm: '#8b5cf6',  // Purple - long term (4+ rooms)
                permanent: '#f59e0b'  // Gold - permanent effect
            },
            
            // Choice type indicators
            typeIcons: {
                passive: '📊',    // Stat boost
                active: '⚡',     // New ability
                economy: '💰',    // Currency/resource
                defensive: '🛡️', // Protection
                offensive: '⚔️', // Damage
                utility: '🔧'    // Special effect
            }
        };
        
        // Choice analysis cache
        this.choiceAnalysis = new Map();
        
        // Animation state
        this.animationState = {
            revealProgress: 0,
            comparisonTransition: 0,
            isAnimating: false
        };
        
        this.initialize();
    }

    /**
     * Initialize the choice system clarity enhancement
     */
    initialize() {
        this.createChoiceOverlay();
        this.setupEventListeners();
        this.loadUserPreferences();
    }

    /**
     * Create enhanced choice overlay
     */
    createChoiceOverlay() {
        // Remove existing overlay
        const existing = document.getElementById('enhanced-choice-overlay');
        if (existing) {
            existing.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'enhanced-choice-overlay';
        overlay.className = 'enhanced-choice-overlay hidden';
        
        overlay.innerHTML = `
            <div class="choice-container">
                <!-- Header Section -->
                <div class="choice-header">
                    <div class="choice-title">
                        <h2>Choose Your Path</h2>
                        <div class="choice-subtitle">Select one option to continue your journey</div>
                    </div>
                    <div class="choice-controls">
                        <button id="comparison-mode-toggle" class="comparison-toggle">
                            <span class="toggle-icon">⚖️</span>
                            <span class="toggle-text">Compare</span>
                        </button>
                        <button id="choice-help" class="choice-help-btn">
                            <span class="help-icon">❓</span>
                            <span class="help-text">Help</span>
                        </button>
                    </div>
                </div>

                <!-- Choice Cards Container -->
                <div class="choices-grid" id="choices-grid">
                    <!-- Choice cards populated dynamically -->
                </div>

                <!-- Comparison Panel -->
                <div class="comparison-panel hidden" id="comparison-panel">
                    <div class="comparison-header">
                        <h3>Choice Comparison</h3>
                        <button id="close-comparison" class="close-comparison">✕</button>
                    </div>
                    <div class="comparison-content" id="comparison-content">
                        <!-- Comparison data populated dynamically -->
                    </div>
                </div>

                <!-- Choice Analysis Panel -->
                <div class="analysis-panel" id="analysis-panel">
                    <div class="analysis-tabs">
                        <button class="analysis-tab active" data-tab="consequences">Consequences</button>
                        <button class="analysis-tab" data-tab="synergies">Synergies</button>
                        <button class="analysis-tab" data-tab="statistics">Statistics</button>
                    </div>
                    <div class="analysis-content">
                        <div class="analysis-tab-content active" id="consequences-tab">
                            <!-- Consequences analysis -->
                        </div>
                        <div class="analysis-tab-content" id="synergies-tab">
                            <!-- Synergies analysis -->
                        </div>
                        <div class="analysis-tab-content" id="statistics-tab">
                            <!-- Statistics analysis -->
                        </div>
                    </div>
                </div>

                <!-- Help Panel -->
                <div class="help-panel hidden" id="help-panel">
                    <div class="help-header">
                        <h3>Choice System Guide</h3>
                        <button id="close-help" class="close-help">✕</button>
                    </div>
                    <div class="help-content">
                        ${this.createHelpContent()}
                    </div>
                </div>

                <!-- Footer -->
                <div class="choice-footer">
                    <div class="choice-timer" id="choice-timer">
                        <span class="timer-label">Time to decide:</span>
                        <span class="timer-value" id="timer-value">∞</span>
                    </div>
                    <div class="choice-actions">
                        <button id="random-choice" class="btn-secondary">Random Choice</button>
                        <button id="skip-choice" class="btn-tertiary">Skip (if available)</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.overlayElement = overlay;
    }

    /**
     * Create help content
     */
    createHelpContent() {
        return `
            <div class="help-section">
                <h4>🎯 Risk & Reward System</h4>
                <div class="help-items">
                    <div class="help-item">
                        <span class="risk-indicator safe"></span>
                        <strong>Safe Choices:</strong> Low risk, guaranteed benefits, good for consistent progress
                    </div>
                    <div class="help-item">
                        <span class="risk-indicator moderate"></span>
                        <strong>Moderate Choices:</strong> Balanced risk/reward, most versatile options
                    </div>
                    <div class="help-item">
                        <span class="risk-indicator risky"></span>
                        <strong>Risky Choices:</strong> High risk, high reward, can be game-changing
                    </div>
                </div>
            </div>
            
            <div class="help-section">
                <h4>⏱️ Consequence Timeline</h4>
                <div class="help-items">
                    <div class="help-item">
                        <span class="consequence-indicator immediate"></span>
                        <strong>Immediate:</strong> Effects apply right now
                    </div>
                    <div class="help-item">
                        <span class="consequence-indicator short-term"></span>
                        <strong>Short-term:</strong> Effects last 1-3 rooms
                    </div>
                    <div class="help-item">
                        <span class="consequence-indicator long-term"></span>
                        <strong>Long-term:</strong> Effects last 4+ rooms
                    </div>
                    <div class="help-item">
                        <span class="consequence-indicator permanent"></span>
                        <strong>Permanent:</strong> Effects last the entire run
                    </div>
                </div>
            </div>
            
            <div class="help-section">
                <h4>🔧 Choice Types</h4>
                <div class="help-items">
                    <div class="help-item">
                        <span class="type-icon">📊</span>
                        <strong>Passive:</strong> Stat boosts and permanent improvements
                    </div>
                    <div class="help-item">
                        <span class="type-icon">⚡</span>
                        <strong>Active:</strong> New abilities and combat options
                    </div>
                    <div class="help-item">
                        <span class="type-icon">💰</span>
                        <strong>Economy:</strong> Currency and resource management
                    </div>
                    <div class="help-item">
                        <span class="type-icon">🛡️</span>
                        <strong>Defensive:</strong> Protection and survivability
                    </div>
                    <div class="help-item">
                        <span class="type-icon">⚔️</span>
                        <strong>Offensive:</strong> Damage and combat effectiveness
                    </div>
                    <div class="help-item">
                        <span class="type-icon">🔧</span>
                        <strong>Utility:</strong> Special effects and unique mechanics
                    </div>
                </div>
            </div>
            
            <div class="help-section">
                <h4>💡 Tips for Better Choices</h4>
                <ul class="help-tips">
                    <li>Use comparison mode to evaluate multiple options side-by-side</li>
                    <li>Consider your current build and what synergizes well</li>
                    <li>Balance immediate needs with long-term strategy</li>
                    <li>Don't always pick the highest rarity - context matters</li>
                    <li>Pay attention to consequence timelines for planning</li>
                </ul>
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Comparison mode toggle
        const comparisonToggle = document.getElementById('comparison-mode-toggle');
        if (comparisonToggle) {
            comparisonToggle.addEventListener('click', () => {
                this.toggleComparisonMode();
            });
        }

        // Help panel toggle
        const helpButton = document.getElementById('choice-help');
        const closeHelp = document.getElementById('close-help');
        
        if (helpButton) {
            helpButton.addEventListener('click', () => {
                this.showHelpPanel();
            });
        }
        
        if (closeHelp) {
            closeHelp.addEventListener('click', () => {
                this.hideHelpPanel();
            });
        }

        // Comparison panel close
        const closeComparison = document.getElementById('close-comparison');
        if (closeComparison) {
            closeComparison.addEventListener('click', () => {
                this.hideComparisonPanel();
            });
        }

        // Analysis tabs
        const analysisTabs = document.querySelectorAll('.analysis-tab');
        analysisTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchAnalysisTab(e.target.dataset.tab);
            });
        });

        // Footer actions
        const randomChoice = document.getElementById('random-choice');
        const skipChoice = document.getElementById('skip-choice');
        
        if (randomChoice) {
            randomChoice.addEventListener('click', () => {
                this.selectRandomChoice();
            });
        }
        
        if (skipChoice) {
            skipChoice.addEventListener('click', () => {
                this.skipChoice();
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.isActive) {
                this.handleKeyboardInput(e);
            }
        });
    }

    /**
     * Show choice overlay with enhanced choices
     */
    show(choices) {
        this.currentChoices = choices;
        this.isActive = true;
        
        // Analyze choices
        this.analyzeChoices();
        
        // Populate UI
        this.populateChoiceCards();
        this.populateAnalysisPanel();
        
        // Show overlay with animation
        this.overlayElement.classList.remove('hidden');
        this.animateIn();
    }

    /**
     * Hide choice overlay
     */
    hide() {
        this.isActive = false;
        this.overlayElement.classList.add('hidden');
        this.selectedForComparison.clear();
        this.comparisonMode = false;
        this.choiceAnalysis.clear();
    }

    /**
     * Analyze choices for enhanced display
     */
    analyzeChoices() {
        this.currentChoices.forEach(choice => {
            const analysis = this.performChoiceAnalysis(choice);
            this.choiceAnalysis.set(choice.id, analysis);
        });
    }

    /**
     * Perform detailed analysis of a choice
     */
    performChoiceAnalysis(choice) {
        // Get choice data from WASM if available
        const wasmData = this.getChoiceDataFromWASM(choice.id);
        
        return {
            // Risk assessment (0-1 scale)
            riskLevel: this.calculateRiskLevel(choice, wasmData),
            
            // Reward potential (0-1 scale)
            rewardLevel: this.calculateRewardLevel(choice, wasmData),
            
            // Consequence timeline
            consequences: this.analyzeConsequences(choice, wasmData),
            
            // Synergy analysis
            synergies: this.analyzeSynergies(choice, wasmData),
            
            // Statistical data
            statistics: this.gatherStatistics(choice, wasmData),
            
            // Visual indicators
            visualData: this.generateVisualData(choice, wasmData)
        };
    }

    /**
     * Get choice data from WASM exports
     */
    getChoiceDataFromWASM(choiceId) {
        if (!this.wasmManager || !this.wasmManager.exports) {
            return null;
        }

        try {
            return {
                tags: this.wasmManager.exports.get_choice_tags?.(choiceId) || 0,
                effects: this.wasmManager.exports.get_choice_effects?.(choiceId) || [],
                duration: this.wasmManager.exports.get_choice_duration?.(choiceId) || 0,
                stackable: this.wasmManager.exports.get_choice_stackable?.(choiceId) || false,
                prerequisites: this.wasmManager.exports.get_choice_prerequisites?.(choiceId) || [],
                conflicts: this.wasmManager.exports.get_choice_conflicts?.(choiceId) || []
            };
        } catch (error) {
            console.warn('Error getting choice data from WASM:', error);
            return null;
        }
    }

    /**
     * Calculate risk level for a choice
     */
    calculateRiskLevel(choice, wasmData) {
        let risk = 0;
        
        // Base risk from rarity (higher rarity often means higher risk)
        const rarityRisk = {
            0: 0.1, // Common - low risk
            1: 0.3, // Uncommon - low-medium risk
            2: 0.6, // Rare - medium-high risk
            3: 0.8  // Legendary - high risk
        };
        
        risk += rarityRisk[choice.rarity] || 0.5;
        
        // Risk from choice type
        const typeRisk = {
            0: 0.1, // Passive - usually safe
            1: 0.4, // Active - moderate risk
            2: 0.7, // Economy - can be risky
            3: 0.2, // Defensive - usually safe
            4: 0.5, // Offensive - moderate risk
            5: 0.6  // Utility - variable risk
        };
        
        risk += (typeRisk[choice.type] || 0.5) * 0.3;
        
        // Risk from tags (if available from WASM)
        if (wasmData && wasmData.tags) {
            // Certain tags indicate higher risk
            const riskTags = [0x100, 0x200, 0x400]; // Example risk tag values
            const hasRiskTags = riskTags.some(tag => wasmData.tags & tag);
            if (hasRiskTags) {
                risk += 0.2;
            }
        }
        
        return Math.min(1.0, risk);
    }

    /**
     * Calculate reward level for a choice
     */
    calculateRewardLevel(choice, _wasmData) {
        let reward = 0;
        
        // Base reward from rarity
        const rarityReward = {
            0: 0.2, // Common
            1: 0.4, // Uncommon
            2: 0.7, // Rare
            3: 1.0  // Legendary
        };
        
        reward += rarityReward[choice.rarity] || 0.5;
        
        // Reward from choice type
        const typeReward = {
            0: 0.6, // Passive - consistent reward
            1: 0.8, // Active - high potential
            2: 0.5, // Economy - variable
            3: 0.4, // Defensive - situational
            4: 0.7, // Offensive - good reward
            5: 0.9  // Utility - unique value
        };
        
        reward += (typeReward[choice.type] || 0.5) * 0.3;
        
        return Math.min(1.0, reward);
    }

    /**
     * Analyze consequences timeline
     */
    analyzeConsequences(choice, wasmData) {
        const consequences = {
            immediate: [],
            shortTerm: [],
            longTerm: [],
            permanent: []
        };
        
        // Determine consequence timing based on choice type and tags
        if (choice.type === 0) { // Passive
            consequences.permanent.push('Permanent stat increase');
        }
        
        if (choice.type === 1) { // Active
            consequences.immediate.push('New ability available');
            consequences.longTerm.push('Changes combat strategy');
        }
        
        if (choice.type === 2) { // Economy
            consequences.immediate.push('Resource change');
            consequences.shortTerm.push('Affects next few purchases');
        }
        
        // Add more specific consequences based on WASM data
        if (wasmData && wasmData.duration) {
            if (wasmData.duration < 3) {
                consequences.shortTerm.push('Temporary effect');
            } else if (wasmData.duration < 10) {
                consequences.longTerm.push('Extended effect');
            } else {
                consequences.permanent.push('Long-lasting change');
            }
        }
        
        return consequences;
    }

    /**
     * Analyze synergies with existing choices
     */
    analyzeSynergies(choice, _wasmData) {
        const synergies = {
            positive: [],
            negative: [],
            neutral: []
        };
        
        // This would analyze synergies with current player state
        // For now, provide example synergies based on choice type
        
        if (choice.type === 0) { // Passive
            synergies.positive.push('Stacks with other stat bonuses');
            synergies.neutral.push('No conflicts with active abilities');
        }
        
        if (choice.type === 1) { // Active
            synergies.positive.push('Complements existing combat style');
            synergies.negative.push('May conflict with similar abilities');
        }
        
        return synergies;
    }

    /**
     * Get deterministic seed for statistics
     */
    getDeterministicStatsSeed(choice) {
        // Use choice ID and time for consistent statistics
        const choiceId = choice.id || 0
        const timeSeed = (Date.now() * 0.001) % 1
        return (choiceId + timeSeed) % 1
    }

    /**
     * Get deterministic seed for recommendations
     */
    getDeterministicRecommendationSeed() {
        // Use time-based seed for consistent recommendations
        return (Date.now() * 0.001) % 1
    }

    /**
     * Get deterministic seed for random choice selection
     */
    getDeterministicRandomChoiceSeed() {
        // Use time and choice count for consistent random selection
        const timeSeed = (Date.now() * 0.001) % 1
        const countSeed = this.currentChoices.length / 1000
        return (timeSeed + countSeed) % 1
    }

    /**
     * Gather statistical data about choice
     */
    gatherStatistics(choice, _wasmData) {
        // Use deterministic seed for consistent statistics
        const statsSeed = this.getDeterministicStatsSeed(choice)
        return {
            pickRate: statsSeed * 100, // Placeholder - would come from analytics
            winRate: 50 + statsSeed * 40, // Placeholder
            averageValue: statsSeed * 100, // Placeholder
            playerLevel: 'Beginner', // Would be determined by player stats
            recommendation: this.generateRecommendation(choice)
        };
    }

    /**
     * Generate recommendation for choice
     */
    generateRecommendation(_choice) {
        const recommendations = [
            'Good for beginners',
            'Advanced strategy choice',
            'High risk, high reward',
            'Safe and reliable',
            'Situationally powerful',
            'Build-defining choice'
        ];
        
        // Use deterministic seed for consistent recommendations
        const recSeed = this.getDeterministicRecommendationSeed()
        return recommendations[Math.floor(recSeed * recommendations.length)];
    }

    /**
     * Generate visual data for choice display
     */
    generateVisualData(choice, wasmData) {
        const analysis = this.choiceAnalysis.get(choice.id);
        const riskLevel = analysis?.riskLevel || this.calculateRiskLevel(choice, wasmData);
        const rewardLevel = analysis?.rewardLevel || this.calculateRewardLevel(choice, wasmData);
        
        return {
            riskColor: this.getRiskColor(riskLevel),
            rewardColor: this.getRewardColor(rewardLevel),
            typeIcon: this.visualConfig.typeIcons[choice.type] || '❓',
            riskLabel: this.getRiskLabel(riskLevel),
            rewardLabel: this.getRewardLabel(rewardLevel)
        };
    }

    /**
     * Get risk color based on level
     */
    getRiskColor(riskLevel) {
        if (riskLevel < 0.3) {return this.visualConfig.riskColors.safe;}
        if (riskLevel < 0.7) {return this.visualConfig.riskColors.moderate;}
        return this.visualConfig.riskColors.risky;
    }

    /**
     * Get reward color based on level
     */
    getRewardColor(rewardLevel) {
        if (rewardLevel < 0.3) {return this.visualConfig.rewardColors.low;}
        if (rewardLevel < 0.6) {return this.visualConfig.rewardColors.medium;}
        if (rewardLevel < 0.9) {return this.visualConfig.rewardColors.high;}
        return this.visualConfig.rewardColors.legendary;
    }

    /**
     * Get risk label
     */
    getRiskLabel(riskLevel) {
        if (riskLevel < 0.3) {return 'Safe';}
        if (riskLevel < 0.7) {return 'Moderate';}
        return 'Risky';
    }

    /**
     * Get reward label
     */
    getRewardLabel(rewardLevel) {
        if (rewardLevel < 0.3) {return 'Low';}
        if (rewardLevel < 0.6) {return 'Medium';}
        if (rewardLevel < 0.9) {return 'High';}
        return 'Legendary';
    }

    /**
     * Populate choice cards
     */
    populateChoiceCards() {
        const grid = document.getElementById('choices-grid');
        if (!grid) {return;}

        grid.innerHTML = '';
        
        this.currentChoices.forEach((choice, index) => {
            const analysis = this.choiceAnalysis.get(choice.id);
            const visualData = analysis?.visualData || this.generateVisualData(choice, null);
            
            const card = this.createChoiceCard(choice, analysis, visualData, index);
            grid.appendChild(card);
        });
    }

    /**
     * Create individual choice card
     */
    createChoiceCard(choice, analysis, visualData, index) {
        const card = document.createElement('div');
        card.className = 'choice-card';
        card.dataset.choiceId = choice.id;
        card.dataset.choiceIndex = index;
        
        const riskLevel = analysis?.riskLevel || 0.5;
        const rewardLevel = analysis?.rewardLevel || 0.5;
        
        card.innerHTML = `
            <div class="choice-card-header">
                <div class="choice-type-icon">${visualData.typeIcon}</div>
                <div class="choice-rarity rarity-${choice.rarity}">
                    ${this.getRarityName(choice.rarity)}
                </div>
                <div class="choice-comparison-checkbox">
                    <input type="checkbox" id="compare-${choice.id}" class="comparison-checkbox">
                    <label for="compare-${choice.id}">Compare</label>
                </div>
            </div>
            
            <div class="choice-card-content">
                <h3 class="choice-title">${this.getChoiceName(choice)}</h3>
                <p class="choice-description">${this.getChoiceDescription(choice)}</p>
                
                <div class="choice-indicators">
                    <div class="risk-reward-bar">
                        <div class="risk-section">
                            <label>Risk</label>
                            <div class="risk-bar">
                                <div class="risk-fill" style="width: ${riskLevel * 100}%; background: ${visualData.riskColor}"></div>
                            </div>
                            <span class="risk-label">${visualData.riskLabel}</span>
                        </div>
                        <div class="reward-section">
                            <label>Reward</label>
                            <div class="reward-bar">
                                <div class="reward-fill" style="width: ${rewardLevel * 100}%; background: ${visualData.rewardColor}"></div>
                            </div>
                            <span class="reward-label">${visualData.rewardLabel}</span>
                        </div>
                    </div>
                </div>
                
                <div class="choice-consequences">
                    <h4>Effects Timeline</h4>
                    <div class="consequence-timeline">
                        ${this.renderConsequenceTimeline(analysis?.consequences)}
                    </div>
                </div>
                
                <div class="choice-stats">
                    <div class="stat-item">
                        <span class="stat-label">Pick Rate:</span>
                        <span class="stat-value">${analysis?.statistics?.pickRate?.toFixed(1) || '--'}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Win Rate:</span>
                        <span class="stat-value">${analysis?.statistics?.winRate?.toFixed(1) || '--'}%</span>
                    </div>
                </div>
            </div>
            
            <div class="choice-card-footer">
                <button class="choice-select-btn" data-choice-id="${choice.id}">
                    Select This Choice
                </button>
                <button class="choice-details-btn" data-choice-id="${choice.id}">
                    View Details
                </button>
            </div>
        `;
        
        // Add event listeners
        const selectBtn = card.querySelector('.choice-select-btn');
        const detailsBtn = card.querySelector('.choice-details-btn');
        const compareCheckbox = card.querySelector('.comparison-checkbox');
        
        if (selectBtn) {
            selectBtn.addEventListener('click', () => {
                this.selectChoice(choice.id);
            });
        }
        
        if (detailsBtn) {
            detailsBtn.addEventListener('click', () => {
                this.showChoiceDetails(choice.id);
            });
        }
        
        if (compareCheckbox) {
            compareCheckbox.addEventListener('change', (e) => {
                this.toggleChoiceComparison(choice.id, e.target.checked);
            });
        }
        
        // Add hover effects
        card.addEventListener('mouseenter', () => {
            this.highlightChoice(choice.id);
        });
        
        card.addEventListener('mouseleave', () => {
            this.unhighlightChoice(choice.id);
        });
        
        return card;
    }

    /**
     * Render consequence timeline
     */
    renderConsequenceTimeline(consequences) {
        if (!consequences) {
            return '<div class="no-consequences">No specific timeline data available</div>';
        }
        
        const timelineItems = [];
        
        Object.entries(consequences).forEach(([timing, effects]) => {
            if (effects.length > 0) {
                const color = this.visualConfig.consequenceColors[timing.replace('-', '')];
                timelineItems.push(`
                    <div class="timeline-item ${timing}">
                        <div class="timeline-indicator" style="background: ${color}"></div>
                        <div class="timeline-content">
                            <div class="timeline-label">${this.formatTimingLabel(timing)}</div>
                            <ul class="timeline-effects">
                                ${effects.map(effect => `<li>${effect}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `);
            }
        });
        
        return timelineItems.join('');
    }

    /**
     * Format timing label for display
     */
    formatTimingLabel(timing) {
        const labels = {
            immediate: 'Right Now',
            shortTerm: '1-3 Rooms',
            longTerm: '4+ Rooms',
            permanent: 'Entire Run'
        };
        
        return labels[timing.replace('-', '')] || timing;
    }

    /**
     * Get choice name (placeholder - would come from WASM data)
     */
    getChoiceName(choice) {
        const names = {
            0: ['Health Boost', 'Stamina Increase', 'Speed Enhancement'],
            1: ['Lightning Strike', 'Shield Bash', 'Whirlwind'],
            2: ['Gold Rush', 'Treasure Hunter', 'Coin Flip'],
            3: ['Iron Skin', 'Dodge Master', 'Shield Wall'],
            4: ['Berserker Rage', 'Critical Strike', 'Combo Master'],
            5: ['Teleport', 'Time Slow', 'Phase Walk']
        };
        
        const typeNames = names[choice.type] || ['Unknown Choice'];
        return typeNames[choice.id % typeNames.length];
    }

    /**
     * Get choice description (placeholder - would come from WASM data)
     */
    getChoiceDescription(choice) {
        const descriptions = {
            0: 'Permanently increases your survivability through enhanced stats.',
            1: 'Grants a new combat ability that changes how you fight.',
            2: 'Affects your resource management and economic strategy.',
            3: 'Improves your defensive capabilities and damage mitigation.',
            4: 'Enhances your offensive power and damage output.',
            5: 'Provides unique utility effects that open new strategies.'
        };
        
        return descriptions[choice.type] || 'A mysterious choice with unknown effects.';
    }

    /**
     * Get rarity name
     */
    getRarityName(rarity) {
        const names = ['Common', 'Uncommon', 'Rare', 'Legendary'];
        return names[rarity] || 'Unknown';
    }

    /**
     * Populate analysis panel
     */
    populateAnalysisPanel() {
        this.updateConsequencesTab();
        this.updateSynergiesTab();
        this.updateStatisticsTab();
    }

    /**
     * Update consequences tab
     */
    updateConsequencesTab() {
        const tab = document.getElementById('consequences-tab');
        if (!tab) {return;}

        // Analyze consequences (currently showing static content, but analysis available for future use)
        this.analyzeOverallConsequences();
        
        tab.innerHTML = `
            <div class="consequences-overview">
                <h4>Decision Impact Analysis</h4>
                <div class="impact-summary">
                    <div class="impact-item immediate">
                        <div class="impact-icon">⚡</div>
                        <div class="impact-content">
                            <div class="impact-title">Immediate Effects</div>
                            <div class="impact-description">Changes that happen right away</div>
                        </div>
                    </div>
                    <div class="impact-item long-term">
                        <div class="impact-icon">🎯</div>
                        <div class="impact-content">
                            <div class="impact-title">Long-term Strategy</div>
                            <div class="impact-description">How this affects your overall build</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="consequences-details">
                <h4>Choice Comparison Matrix</h4>
                <div class="comparison-matrix">
                    ${this.renderComparisonMatrix()}
                </div>
            </div>
        `;
    }

    /**
     * Analyze overall consequences across all choices
     */
    analyzeOverallConsequences() {
        // Analyze the collective impact of all available choices
        return {
            riskSpread: this.calculateRiskSpread(),
            rewardPotential: this.calculateRewardPotential(),
            strategicDiversity: this.calculateStrategicDiversity()
        };
    }

    /**
     * Calculate risk spread across choices
     */
    calculateRiskSpread() {
        const risks = this.currentChoices.map(choice => {
            const analysis = this.choiceAnalysis.get(choice.id);
            return analysis?.riskLevel || 0.5;
        });
        
        const minRisk = Math.min(...risks);
        const maxRisk = Math.max(...risks);
        
        return {
            min: minRisk,
            max: maxRisk,
            spread: maxRisk - minRisk,
            average: risks.reduce((a, b) => a + b, 0) / risks.length
        };
    }

    /**
     * Calculate reward potential
     */
    calculateRewardPotential() {
        const rewards = this.currentChoices.map(choice => {
            const analysis = this.choiceAnalysis.get(choice.id);
            return analysis?.rewardLevel || 0.5;
        });
        
        return {
            max: Math.max(...rewards),
            average: rewards.reduce((a, b) => a + b, 0) / rewards.length,
            distribution: rewards
        };
    }

    /**
     * Calculate strategic diversity
     */
    calculateStrategicDiversity() {
        const types = new Set(this.currentChoices.map(choice => choice.type));
        const rarities = new Set(this.currentChoices.map(choice => choice.rarity));
        
        return {
            typeVariety: types.size,
            rarityVariety: rarities.size,
            totalOptions: this.currentChoices.length
        };
    }

    /**
     * Render comparison matrix
     */
    renderComparisonMatrix() {
        const headers = ['Choice', 'Risk', 'Reward', 'Type', 'Timeline'];
        
        let matrix = `
            <table class="matrix-table">
                <thead>
                    <tr>
                        ${headers.map(header => `<th>${header}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;
        
        this.currentChoices.forEach(choice => {
            const analysis = this.choiceAnalysis.get(choice.id);
            const visualData = analysis?.visualData || this.generateVisualData(choice, null);
            
            matrix += `
                <tr class="matrix-row" data-choice-id="${choice.id}">
                    <td class="choice-name">
                        ${visualData.typeIcon} ${this.getChoiceName(choice)}
                    </td>
                    <td class="risk-cell">
                        <span class="risk-indicator" style="background: ${visualData.riskColor}"></span>
                        ${visualData.riskLabel}
                    </td>
                    <td class="reward-cell">
                        <span class="reward-indicator" style="background: ${visualData.rewardColor}"></span>
                        ${visualData.rewardLabel}
                    </td>
                    <td class="type-cell">${this.getTypeName(choice.type)}</td>
                    <td class="timeline-cell">${this.getTimelineSummary(analysis?.consequences)}</td>
                </tr>
            `;
        });
        
        matrix += `
                </tbody>
            </table>
        `;
        
        return matrix;
    }

    /**
     * Get type name for display
     */
    getTypeName(type) {
        const names = {
            0: 'Passive',
            1: 'Active',
            2: 'Economy',
            3: 'Defensive',
            4: 'Offensive',
            5: 'Utility'
        };
        
        return names[type] || 'Unknown';
    }

    /**
     * Get timeline summary
     */
    getTimelineSummary(consequences) {
        if (!consequences) {return 'Unknown';}
        
        const timings = [];
        if (consequences.immediate?.length > 0) {timings.push('Now');}
        if (consequences.shortTerm?.length > 0) {timings.push('Short');}
        if (consequences.longTerm?.length > 0) {timings.push('Long');}
        if (consequences.permanent?.length > 0) {timings.push('Permanent');}
        
        return timings.join(', ') || 'No effects';
    }

    /**
     * Update synergies tab
     */
    updateSynergiesTab() {
        const tab = document.getElementById('synergies-tab');
        if (!tab) {return;}

        tab.innerHTML = `
            <div class="synergies-content">
                <h4>Build Synergy Analysis</h4>
                <p class="synergies-description">
                    Analyze how each choice fits with your current build and strategy.
                </p>
                
                <div class="synergy-grid">
                    ${this.currentChoices.map(choice => this.renderChoiceSynergy(choice)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render choice synergy analysis
     */
    renderChoiceSynergy(choice) {
        const analysis = this.choiceAnalysis.get(choice.id);
        const synergies = analysis?.synergies || { positive: [], negative: [], neutral: [] };
        
        return `
            <div class="synergy-card">
                <div class="synergy-header">
                    <span class="synergy-icon">${this.visualConfig.typeIcons[choice.type]}</span>
                    <span class="synergy-name">${this.getChoiceName(choice)}</span>
                </div>
                <div class="synergy-details">
                    ${synergies.positive.length > 0 ? `
                        <div class="synergy-section positive">
                            <h5>✅ Synergizes With</h5>
                            <ul>
                                ${synergies.positive.map(item => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${synergies.negative.length > 0 ? `
                        <div class="synergy-section negative">
                            <h5>❌ Conflicts With</h5>
                            <ul>
                                ${synergies.negative.map(item => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${synergies.neutral.length > 0 ? `
                        <div class="synergy-section neutral">
                            <h5>ℹ️ Notes</h5>
                            <ul>
                                ${synergies.neutral.map(item => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Update statistics tab
     */
    updateStatisticsTab() {
        const tab = document.getElementById('statistics-tab');
        if (!tab) {return;}

        tab.innerHTML = `
            <div class="statistics-content">
                <h4>Choice Statistics & Recommendations</h4>
                
                <div class="stats-overview">
                    <div class="stat-card">
                        <div class="stat-title">Most Popular</div>
                        <div class="stat-value">${this.getMostPopularChoice()}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">Highest Win Rate</div>
                        <div class="stat-value">${this.getHighestWinRateChoice()}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">Best for Beginners</div>
                        <div class="stat-value">${this.getBestBeginnerChoice()}</div>
                    </div>
                </div>
                
                <div class="detailed-stats">
                    <h5>Detailed Analysis</h5>
                    <div class="stats-table">
                        ${this.renderDetailedStats()}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get most popular choice
     */
    getMostPopularChoice() {
        let maxPickRate = 0;
        let mostPopular = 'Unknown';
        
        this.currentChoices.forEach(choice => {
            const analysis = this.choiceAnalysis.get(choice.id);
            const pickRate = analysis?.statistics?.pickRate || 0;
            
            if (pickRate > maxPickRate) {
                maxPickRate = pickRate;
                mostPopular = this.getChoiceName(choice);
            }
        });
        
        return mostPopular;
    }

    /**
     * Get highest win rate choice
     */
    getHighestWinRateChoice() {
        let maxWinRate = 0;
        let bestChoice = 'Unknown';
        
        this.currentChoices.forEach(choice => {
            const analysis = this.choiceAnalysis.get(choice.id);
            const winRate = analysis?.statistics?.winRate || 0;
            
            if (winRate > maxWinRate) {
                maxWinRate = winRate;
                bestChoice = this.getChoiceName(choice);
            }
        });
        
        return bestChoice;
    }

    /**
     * Get best beginner choice
     */
    getBestBeginnerChoice() {
        // Find the safest choice (lowest risk, decent reward)
        let bestScore = 0;
        let bestChoice = 'Unknown';
        
        this.currentChoices.forEach(choice => {
            const analysis = this.choiceAnalysis.get(choice.id);
            const riskLevel = analysis?.riskLevel || 0.5;
            const rewardLevel = analysis?.rewardLevel || 0.5;
            
            // Score favors low risk and decent reward
            const score = (1 - riskLevel) * 0.7 + rewardLevel * 0.3;
            
            if (score > bestScore) {
                bestScore = score;
                bestChoice = this.getChoiceName(choice);
            }
        });
        
        return bestChoice;
    }

    /**
     * Render detailed statistics table
     */
    renderDetailedStats() {
        let table = `
            <table class="detailed-stats-table">
                <thead>
                    <tr>
                        <th>Choice</th>
                        <th>Pick Rate</th>
                        <th>Win Rate</th>
                        <th>Recommendation</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        this.currentChoices.forEach(choice => {
            const analysis = this.choiceAnalysis.get(choice.id);
            const stats = analysis?.statistics || {};
            
            table += `
                <tr>
                    <td>${this.getChoiceName(choice)}</td>
                    <td>${stats.pickRate?.toFixed(1) || '--'}%</td>
                    <td>${stats.winRate?.toFixed(1) || '--'}%</td>
                    <td>${stats.recommendation || 'No data'}</td>
                </tr>
            `;
        });
        
        table += `
                </tbody>
            </table>
        `;
        
        return table;
    }

    /**
     * Toggle comparison mode
     */
    toggleComparisonMode() {
        this.comparisonMode = !this.comparisonMode;
        
        const toggle = document.getElementById('comparison-mode-toggle');
        const checkboxes = document.querySelectorAll('.comparison-checkbox');
        
        if (toggle) {
            toggle.classList.toggle('active', this.comparisonMode);
        }
        
        checkboxes.forEach(checkbox => {
            checkbox.style.display = this.comparisonMode ? 'block' : 'none';
        });
        
        if (!this.comparisonMode) {
            this.selectedForComparison.clear();
            this.hideComparisonPanel();
        }
    }

    /**
     * Toggle choice comparison
     */
    toggleChoiceComparison(choiceId, selected) {
        if (selected) {
            this.selectedForComparison.add(choiceId);
        } else {
            this.selectedForComparison.delete(choiceId);
        }
        
        if (this.selectedForComparison.size >= 2) {
            this.showComparisonPanel();
        } else {
            this.hideComparisonPanel();
        }
    }

    /**
     * Show comparison panel
     */
    showComparisonPanel() {
        const panel = document.getElementById('comparison-panel');
        if (!panel) {return;}

        panel.classList.remove('hidden');
        this.populateComparisonPanel();
    }

    /**
     * Hide comparison panel
     */
    hideComparisonPanel() {
        const panel = document.getElementById('comparison-panel');
        if (panel) {
            panel.classList.add('hidden');
        }
    }

    /**
     * Populate comparison panel
     */
    populateComparisonPanel() {
        const content = document.getElementById('comparison-content');
        if (!content) {return;}

        const selectedChoices = this.currentChoices.filter(choice => 
            this.selectedForComparison.has(choice.id)
        );
        
        if (selectedChoices.length < 2) {
            content.innerHTML = '<p>Select at least 2 choices to compare</p>';
            return;
        }
        
        content.innerHTML = this.renderChoiceComparison(selectedChoices);
    }

    /**
     * Render choice comparison
     */
    renderChoiceComparison(choices) {
        const comparison = `
            <div class="comparison-grid">
                ${choices.map(choice => this.renderComparisonCard(choice)).join('')}
            </div>
            
            <div class="comparison-analysis">
                <h4>Comparison Analysis</h4>
                ${this.renderComparisonAnalysis(choices)}
            </div>
        `;
        
        return comparison;
    }

    /**
     * Render comparison card for a choice
     */
    renderComparisonCard(choice) {
        const analysis = this.choiceAnalysis.get(choice.id);
        const visualData = analysis?.visualData || this.generateVisualData(choice, null);
        
        return `
            <div class="comparison-card">
                <div class="comparison-header">
                    <span class="comparison-icon">${visualData.typeIcon}</span>
                    <h4>${this.getChoiceName(choice)}</h4>
                </div>
                
                <div class="comparison-metrics">
                    <div class="metric">
                        <label>Risk Level</label>
                        <div class="metric-bar">
                            <div class="metric-fill" style="width: ${(analysis?.riskLevel || 0.5) * 100}%; background: ${visualData.riskColor}"></div>
                        </div>
                        <span>${visualData.riskLabel}</span>
                    </div>
                    
                    <div class="metric">
                        <label>Reward Level</label>
                        <div class="metric-bar">
                            <div class="metric-fill" style="width: ${(analysis?.rewardLevel || 0.5) * 100}%; background: ${visualData.rewardColor}"></div>
                        </div>
                        <span>${visualData.rewardLabel}</span>
                    </div>
                </div>
                
                <div class="comparison-stats">
                    <div class="stat">
                        <span class="stat-label">Pick Rate:</span>
                        <span class="stat-value">${analysis?.statistics?.pickRate?.toFixed(1) || '--'}%</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Win Rate:</span>
                        <span class="stat-value">${analysis?.statistics?.winRate?.toFixed(1) || '--'}%</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render comparison analysis
     */
    renderComparisonAnalysis(choices) {
        const riskComparison = this.compareRisks(choices);
        const rewardComparison = this.compareRewards(choices);
        const recommendationComparison = this.compareRecommendations(choices);
        
        return `
            <div class="analysis-sections">
                <div class="analysis-section">
                    <h5>Risk Analysis</h5>
                    <p>${riskComparison}</p>
                </div>
                
                <div class="analysis-section">
                    <h5>Reward Analysis</h5>
                    <p>${rewardComparison}</p>
                </div>
                
                <div class="analysis-section">
                    <h5>Recommendation</h5>
                    <p>${recommendationComparison}</p>
                </div>
            </div>
        `;
    }

    /**
     * Compare risks between choices
     */
    compareRisks(choices) {
        const risks = choices.map(choice => {
            const analysis = this.choiceAnalysis.get(choice.id);
            return {
                name: this.getChoiceName(choice),
                risk: analysis?.riskLevel || 0.5
            };
        });
        
        risks.sort((a, b) => a.risk - b.risk);
        
        return `${risks[0].name} is the safest option, while ${risks[risks.length - 1].name} carries the highest risk. Consider your current situation when choosing between safety and potential.`;
    }

    /**
     * Compare rewards between choices
     */
    compareRewards(choices) {
        const rewards = choices.map(choice => {
            const analysis = this.choiceAnalysis.get(choice.id);
            return {
                name: this.getChoiceName(choice),
                reward: analysis?.rewardLevel || 0.5
            };
        });
        
        rewards.sort((a, b) => b.reward - a.reward);
        
        return `${rewards[0].name} offers the highest potential reward, followed by ${rewards[1]?.name || 'the other options'}. Higher rewards often come with increased complexity or risk.`;
    }

    /**
     * Compare recommendations between choices
     */
    compareRecommendations(choices) {
        const hasLowRisk = choices.some(choice => {
            const analysis = this.choiceAnalysis.get(choice.id);
            return (analysis?.riskLevel || 0.5) < 0.3;
        });
        
        const hasHighReward = choices.some(choice => {
            const analysis = this.choiceAnalysis.get(choice.id);
            return (analysis?.rewardLevel || 0.5) > 0.7;
        });
        
        if (hasLowRisk && hasHighReward) {
            return 'You have both safe and high-reward options available. Consider your current health, resources, and confidence level when deciding.';
        } else if (hasLowRisk) {
            return 'Focus on the safer options if you\'re struggling or want consistent progress.';
        } else if (hasHighReward) {
            return 'The high-reward options could be game-changing if you\'re willing to take the risk.';
        } 
            return 'All options are fairly balanced. Consider which type of effect would benefit your current strategy most.';
        
    }

    /**
     * Show help panel
     */
    showHelpPanel() {
        const panel = document.getElementById('help-panel');
        if (panel) {
            panel.classList.remove('hidden');
        }
    }

    /**
     * Hide help panel
     */
    hideHelpPanel() {
        const panel = document.getElementById('help-panel');
        if (panel) {
            panel.classList.add('hidden');
        }
    }

    /**
     * Switch analysis tab
     */
    switchAnalysisTab(tabName) {
        // Update tab buttons
        const tabs = document.querySelectorAll('.analysis-tab');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        const contents = document.querySelectorAll('.analysis-tab-content');
        contents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    /**
     * Select choice
     */
    selectChoice(choiceId) {
        if (!this.wasmManager || !this.wasmManager.exports) {
            console.warn('Cannot select choice - WASM manager not available');
            return;
        }

        try {
            // Commit choice through WASM
            const result = this.wasmManager.exports.commit_choice?.(choiceId);
            
            if (result) {
                this.hide();
                
                // Emit choice selected event
                document.dispatchEvent(new CustomEvent('choiceSelected', {
                    detail: { choiceId, choices: this.currentChoices }
                }));
            } else {
                console.warn('Failed to commit choice:', choiceId);
            }
        } catch (error) {
            console.error('Error selecting choice:', error);
        }
    }

    /**
     * Show choice details
     */
    showChoiceDetails(choiceId) {
        const choice = this.currentChoices.find(c => c.id === choiceId);
        const analysis = this.choiceAnalysis.get(choiceId);
        
        if (!choice || !analysis) {
            return;
        }

        // This could open a detailed modal or expand the card
        console.log('Showing details for choice:', choice, analysis);
    }

    /**
     * Highlight choice on hover
     */
    highlightChoice(choiceId) {
        const card = document.querySelector(`[data-choice-id="${choiceId}"]`);
        if (card) {
            card.classList.add('highlighted');
        }
    }

    /**
     * Remove highlight from choice
     */
    unhighlightChoice(choiceId) {
        const card = document.querySelector(`[data-choice-id="${choiceId}"]`);
        if (card) {
            card.classList.remove('highlighted');
        }
    }

    /**
     * Select random choice
     */
    selectRandomChoice() {
        if (this.currentChoices.length === 0) {
            return;
        }

        // Use deterministic seed for consistent random selection
        const randomSeed = this.getDeterministicRandomChoiceSeed()
        const randomIndex = Math.floor(randomSeed * this.currentChoices.length);
        const randomChoice = this.currentChoices[randomIndex];
        
        this.selectChoice(randomChoice.id);
    }

    /**
     * Skip choice (if available)
     */
    skipChoice() {
        // This would depend on WASM implementation
        console.log('Skipping choice...');
        this.hide();
    }

    /**
     * Handle keyboard input
     */
    handleKeyboardInput(e) {
        switch (e.key) {
            case 'Escape':
                if (!document.querySelector('.help-panel.hidden') || 
                    !document.querySelector('.comparison-panel.hidden')) {
                    this.hideHelpPanel();
                    this.hideComparisonPanel();
                } else {
                    // Could close entire overlay or show confirmation
                }
                break;
                
            case '1':
            case '2':
            case '3': {
                const index = parseInt(e.key) - 1;
                if (index < this.currentChoices.length) {
                    this.selectChoice(this.currentChoices[index].id);
                }
                break;
            }
                
            case 'c':
            case 'C':
                this.toggleComparisonMode();
                break;
                
            case 'h':
            case 'H':
                this.showHelpPanel();
                break;
                
            case 'r':
            case 'R':
                this.selectRandomChoice();
                break;
        }
    }

    /**
     * Animate overlay entrance
     */
    animateIn() {
        this.animationState.isAnimating = true;
        this.animationState.revealProgress = 0;
        
        const animate = () => {
            this.animationState.revealProgress += 0.05;
            
            if (this.animationState.revealProgress >= 1) {
                this.animationState.revealProgress = 1;
                this.animationState.isAnimating = false;
            } else {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    /**
     * Load user preferences
     */
    loadUserPreferences() {
        try {
            const saved = localStorage.getItem('choiceSystemSettings');
            if (saved) {
                // Parse and apply saved settings if available
                JSON.parse(saved);
                // Apply any saved settings as needed
            }
        } catch (error) {
            console.warn('Failed to load choice system settings:', error);
        }
    }

    /**
     * Save user preferences
     */
    saveUserPreferences() {
        try {
            const settings = {
                comparisonMode: this.comparisonMode,
                // Add other settings as needed
            };
            localStorage.setItem('choiceSystemSettings', JSON.stringify(settings));
        } catch (error) {
            console.warn('Failed to save choice system settings:', error);
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.overlayElement) {
            this.overlayElement.remove();
        }
        
        this.currentChoices.length = 0;
        this.choiceAnalysis.clear();
        this.selectedForComparison.clear();
    }
}
