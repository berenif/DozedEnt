/**
 * Phase Overlay Manager - Handles phase transitions and overlay display
 * Ensures proper overlay management and prevents conflicts
 * Follows WASM-first architecture principles
 */

export class PhaseOverlayManager {
    constructor(wasmManager) {
        this.wasmManager = wasmManager;
        this.currentPhase = -1;
        this.activeOverlay = null;
        this.overlayElements = new Map();
        this.initialized = false;
        
        // Phase names for logging
        this.phaseNames = [
            'Explore', 'Fight', 'Choose', 'PowerUp', 
            'Risk', 'Escalate', 'CashOut', 'Reset'
        ];
    }
    
    /**
     * Initialize the phase overlay manager
     */
    initialize() {
        if (this.initialized) {
            console.warn('PhaseOverlayManager already initialized');
            return;
        }
        
        console.log('🎭 Initializing Phase Overlay Manager...');
        
        // Cache overlay elements
        this.cacheOverlayElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        this.initialized = true;
        console.log('✅ Phase Overlay Manager initialized');
    }
    
    /**
     * Cache overlay elements for better performance
     */
    cacheOverlayElements() {
        const overlayIds = [
            'choice-overlay',
            'risk-overlay', 
            'escalate-overlay',
            'cashout-overlay',
            'gameOverOverlay'
        ];
        
        overlayIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.overlayElements.set(id, element);
                // Ensure proper z-index
                element.style.zIndex = 'var(--z-overlays)';
            } else {
                console.warn(`Phase overlay element not found: ${id}`);
            }
        });
    }
    
    /**
     * Setup event listeners for phase overlays
     */
    setupEventListeners() {
        // Choice phase buttons
        this.setupChoiceButtons();
        
        // Risk phase buttons
        this.setupRiskButtons();
        
        // CashOut phase buttons
        this.setupCashOutButtons();
        
        // Game over buttons
        this.setupGameOverButtons();
    }
    
    /**
     * Setup choice phase buttons
     */
    setupChoiceButtons() {
        const choiceOverlay = this.overlayElements.get('choice-overlay');
        if (!choiceOverlay) return;
        
        const choiceButtons = choiceOverlay.querySelectorAll('.choice-button');
        choiceButtons.forEach((button, index) => {
            button.addEventListener('click', () => {
                this.handleChoiceSelection(index);
            });
        });
    }
    
    /**
     * Setup risk phase buttons
     */
    setupRiskButtons() {
        const riskOverlay = this.overlayElements.get('risk-overlay');
        if (!riskOverlay) return;
        
        const escapeButton = riskOverlay.querySelector('.phase-button');
        if (escapeButton) {
            escapeButton.addEventListener('click', () => {
                this.handleRiskEscape();
            });
        }
    }
    
    /**
     * Setup cash out phase buttons
     */
    setupCashOutButtons() {
        const cashoutOverlay = this.overlayElements.get('cashout-overlay');
        if (!cashoutOverlay) return;
        
        // Buy heal button
        const buyHealBtn = cashoutOverlay.querySelector('[onclick*="buyHeal"]');
        if (buyHealBtn) {
            buyHealBtn.onclick = null; // Remove inline handler
            buyHealBtn.addEventListener('click', () => {
                this.handleBuyHeal();
            });
        }
        
        // Reroll shop button
        const rerollBtn = cashoutOverlay.querySelector('[onclick*="rerollShopItems"]');
        if (rerollBtn) {
            rerollBtn.onclick = null; // Remove inline handler
            rerollBtn.addEventListener('click', () => {
                this.handleRerollShop();
            });
        }
        
        // Continue button
        const continueBtn = cashoutOverlay.querySelector('[onclick*="exitCashout"]');
        if (continueBtn) {
            continueBtn.onclick = null; // Remove inline handler
            continueBtn.addEventListener('click', () => {
                this.handleContinue();
            });
        }
    }
    
    /**
     * Setup game over buttons
     */
    setupGameOverButtons() {
        const gameOverOverlay = this.overlayElements.get('gameOverOverlay');
        if (!gameOverOverlay) return;
        
        const restartBtn = gameOverOverlay.querySelector('#restart-button');
        const rematchBtn = gameOverOverlay.querySelector('#rematch-button');
        
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.handleGameRestart();
            });
        }
        
        if (rematchBtn) {
            rematchBtn.addEventListener('click', () => {
                this.handleGameRematch();
            });
        }
    }
    
    /**
     * Update phase overlays based on current phase
     */
    update() {
        if (!this.wasmManager?.isLoaded) return;
        
        try {
            const currentPhase = this.wasmManager.getPhase();
            
            if (currentPhase !== this.currentPhase) {
                console.log(`🎯 Phase changed: ${this.phaseNames[this.currentPhase]} → ${this.phaseNames[currentPhase]}`);
                this.handlePhaseChange(currentPhase);
                this.currentPhase = currentPhase;
            }
            
        } catch (error) {
            console.error('Error updating phase overlays:', error);
        }
    }
    
    /**
     * Handle phase changes
     */
    handlePhaseChange(newPhase) {
        // Hide all overlays first
        this.hideAllOverlays();
        
        // Show appropriate overlay based on phase
        switch (newPhase) {
            case 2: // Choose phase
                this.showChoiceOverlay();
                break;
            case 4: // Risk phase
                this.showRiskOverlay();
                break;
            case 5: // Escalate phase
                this.showEscalateOverlay();
                break;
            case 6: // CashOut phase
                this.showCashOutOverlay();
                break;
            case 7: // Reset phase (Game Over)
                this.showGameOverOverlay();
                break;
            default:
                // For other phases (Explore, Fight, PowerUp), no overlay needed
                break;
        }
    }
    
    /**
     * Hide all phase overlays
     */
    hideAllOverlays() {
        this.overlayElements.forEach((element, id) => {
            element.classList.add('hidden');
            element.style.display = 'none';
        });
        this.activeOverlay = null;
    }
    
    /**
     * Show choice overlay
     */
    showChoiceOverlay() {
        const overlay = this.overlayElements.get('choice-overlay');
        if (!overlay) return;
        
        this.updateChoiceData(overlay);
        this.showOverlay(overlay, 'choice-overlay');
    }
    
    /**
     * Show risk overlay
     */
    showRiskOverlay() {
        const overlay = this.overlayElements.get('risk-overlay');
        if (!overlay) return;
        
        this.updateRiskData(overlay);
        this.showOverlay(overlay, 'risk-overlay');
    }
    
    /**
     * Show escalate overlay
     */
    showEscalateOverlay() {
        const overlay = this.overlayElements.get('escalate-overlay');
        if (!overlay) return;
        
        this.updateEscalateData(overlay);
        this.showOverlay(overlay, 'escalate-overlay');
    }
    
    /**
     * Show cash out overlay
     */
    showCashOutOverlay() {
        const overlay = this.overlayElements.get('cashout-overlay');
        if (!overlay) return;
        
        this.updateCashOutData(overlay);
        this.showOverlay(overlay, 'cashout-overlay');
    }
    
    /**
     * Show game over overlay
     */
    showGameOverOverlay() {
        const overlay = this.overlayElements.get('gameOverOverlay');
        if (!overlay) return;
        
        this.showOverlay(overlay, 'gameOverOverlay');
    }
    
    /**
     * Show overlay with proper styling and animation
     */
    showOverlay(element, id) {
        element.classList.remove('hidden');
        element.style.display = 'flex';
        element.style.opacity = '0';
        
        // Animate in
        requestAnimationFrame(() => {
            element.style.transition = 'opacity 0.3s ease';
            element.style.opacity = '1';
        });
        
        this.activeOverlay = id;
        console.log(`📺 Showing overlay: ${id}`);
    }
    
    /**
     * Update choice overlay data
     */
    updateChoiceData(overlay) {
        if (!this.wasmManager?.isLoaded) return;
        
        try {
            const choiceCount = this.wasmManager.getChoiceCount();
            const choiceButtons = overlay.querySelectorAll('.choice-button');
            
            for (let i = 0; i < choiceButtons.length && i < choiceCount; i++) {
                const choiceId = this.wasmManager.getChoiceId(i);
                const choiceType = this.wasmManager.getChoiceType(i);
                const choiceRarity = this.wasmManager.getChoiceRarity(i);
                
                const button = choiceButtons[i];
                button.textContent = this.getChoiceDisplayName(choiceType, choiceRarity);
                button.style.display = 'block';
                button.dataset.choiceId = choiceId;
            }
            
            // Hide unused buttons
            for (let i = choiceCount; i < choiceButtons.length; i++) {
                choiceButtons[i].style.display = 'none';
            }
            
        } catch (error) {
            console.error('Error updating choice data:', error);
        }
    }
    
    /**
     * Update risk overlay data
     */
    updateRiskData(overlay) {
        if (!this.wasmManager?.isLoaded) return;
        
        try {
            // Update risk multiplier
            const riskMult = overlay.querySelector('#risk-mult');
            if (riskMult && typeof this.wasmManager.getRiskMultiplier === 'function') {
                riskMult.textContent = `${this.wasmManager.getRiskMultiplier().toFixed(1)}x`;
            }
            
            // Update curse list
            const curseList = overlay.querySelector('#curse-list');
            if (curseList && typeof this.wasmManager.getCurseCount === 'function') {
                const curseCount = this.wasmManager.getCurseCount();
                curseList.innerHTML = '';
                
                for (let i = 0; i < curseCount; i++) {
                    const curseType = this.wasmManager.getCurseType(i);
                    const curseIntensity = this.wasmManager.getCurseIntensity(i);
                    
                    const curseItem = document.createElement('li');
                    curseItem.textContent = `${this.getCurseDisplayName(curseType)} (${(curseIntensity * 100).toFixed(0)}%)`;
                    curseList.appendChild(curseItem);
                }
                
                if (curseCount === 0) {
                    curseList.innerHTML = '<li>No active curses</li>';
                }
            }
            
        } catch (error) {
            console.error('Error updating risk data:', error);
        }
    }
    
    /**
     * Update escalate overlay data
     */
    updateEscalateData(overlay) {
        if (!this.wasmManager?.isLoaded) return;
        
        try {
            // Update escalation stats
            const escalationLvl = overlay.querySelector('#escalation-lvl');
            if (escalationLvl && typeof this.wasmManager.getEscalationLevel === 'function') {
                escalationLvl.textContent = `${(this.wasmManager.getEscalationLevel() * 100).toFixed(0)}%`;
            }
            
            const spawnRate = overlay.querySelector('#spawn-rate');
            if (spawnRate && typeof this.wasmManager.getSpawnRateModifier === 'function') {
                spawnRate.textContent = `${this.wasmManager.getSpawnRateModifier().toFixed(1)}x`;
            }
            
            // Check for miniboss
            const minibossAlert = overlay.querySelector('#miniboss-alert');
            if (minibossAlert && typeof this.wasmManager.getMinibossActive === 'function') {
                const isMinibossActive = this.wasmManager.getMinibossActive();
                minibossAlert.classList.toggle('hidden', !isMinibossActive);
            }
            
        } catch (error) {
            console.error('Error updating escalate data:', error);
        }
    }
    
    /**
     * Update cash out overlay data
     */
    updateCashOutData(overlay) {
        if (!this.wasmManager?.isLoaded) return;
        
        try {
            // Update currency displays
            const goldAmount = overlay.querySelector('#gold-amount');
            if (goldAmount && typeof this.wasmManager.getGold === 'function') {
                goldAmount.textContent = this.wasmManager.getGold();
            }
            
            const essenceAmount = overlay.querySelector('#essence-amount');
            if (essenceAmount && typeof this.wasmManager.getEssence === 'function') {
                essenceAmount.textContent = this.wasmManager.getEssence();
            }
            
            // Update shop items
            this.updateShopItems(overlay);
            
        } catch (error) {
            console.error('Error updating cash out data:', error);
        }
    }
    
    /**
     * Update shop items display
     */
    updateShopItems(overlay) {
        const shopItemsContainer = overlay.querySelector('#shop-items');
        if (!shopItemsContainer) return;
        
        shopItemsContainer.innerHTML = '';
        
        if (typeof this.wasmManager.getShopItemCount === 'function') {
            const itemCount = this.wasmManager.getShopItemCount();
            
            for (let i = 0; i < itemCount; i++) {
                const itemElement = document.createElement('div');
                itemElement.className = 'shop-item';
                itemElement.innerHTML = `
                    <div class="item-name">Item ${i + 1}</div>
                    <div class="item-price">Cost: 50🔶</div>
                    <button class="buy-item-btn" data-item-index="${i}">Buy</button>
                `;
                
                // Add event listener for buy button
                const buyBtn = itemElement.querySelector('.buy-item-btn');
                buyBtn.addEventListener('click', () => {
                    this.handleBuyShopItem(i);
                });
                
                shopItemsContainer.appendChild(itemElement);
            }
        }
    }
    
    // Event handlers
    handleChoiceSelection(choiceIndex) {
        if (!this.wasmManager?.isLoaded) return;
        
        const choiceButton = document.querySelector(`#choice-${choiceIndex}`);
        if (!choiceButton) return;
        
        const choiceId = parseInt(choiceButton.dataset.choiceId) || choiceIndex;
        
        console.log(`🎯 Player selected choice ${choiceIndex} (ID: ${choiceId})`);
        
        if (typeof this.wasmManager.commitChoice === 'function') {
            this.wasmManager.commitChoice(choiceId);
        }
        
        this.hideAllOverlays();
    }
    
    handleRiskEscape() {
        if (this.wasmManager?.isLoaded && typeof this.wasmManager.escapeRisk === 'function') {
            this.wasmManager.escapeRisk();
        }
        this.hideAllOverlays();
    }
    
    handleBuyHeal() {
        if (this.wasmManager?.isLoaded && typeof this.wasmManager.buyHeal === 'function') {
            this.wasmManager.buyHeal();
        }
    }
    
    handleRerollShop() {
        if (this.wasmManager?.isLoaded && typeof this.wasmManager.rerollShopItems === 'function') {
            this.wasmManager.rerollShopItems();
        }
        
        // Update shop display
        const overlay = this.overlayElements.get('cashout-overlay');
        if (overlay) {
            this.updateCashOutData(overlay);
        }
    }
    
    handleContinue() {
        if (this.wasmManager?.isLoaded && typeof this.wasmManager.exitCashout === 'function') {
            this.wasmManager.exitCashout();
        }
        this.hideAllOverlays();
    }
    
    handleBuyShopItem(itemIndex) {
        if (this.wasmManager?.isLoaded && typeof this.wasmManager.buyShopItem === 'function') {
            this.wasmManager.buyShopItem(itemIndex);
        }
        
        // Update shop display
        const overlay = this.overlayElements.get('cashout-overlay');
        if (overlay) {
            this.updateCashOutData(overlay);
        }
    }
    
    handleGameRestart() {
        console.log('🔄 Restarting game...');
        
        if (this.wasmManager?.isLoaded && typeof this.wasmManager.resetRun === 'function') {
            const seed = this.wasmManager.getRunSeed?.() ?? 1n;
            this.wasmManager.resetRun(seed);
        }
        
        this.hideAllOverlays();
        
        // Trigger game restart event
        window.dispatchEvent(new CustomEvent('gameRestart'));
    }
    
    handleGameRematch() {
        console.log('🆕 Starting new game...');
        
        if (this.wasmManager?.isLoaded && typeof this.wasmManager.initRun === 'function') {
            const seedParam = new URLSearchParams(location.search).get('seed');
            const newSeed = seedParam && /^\d+$/.test(seedParam) ? BigInt(seedParam) : 1n;
            this.wasmManager.initRun(newSeed, 0);
        }
        
        this.hideAllOverlays();
        
        // Trigger game rematch event
        window.dispatchEvent(new CustomEvent('gameRematch'));
    }
    
    // Utility methods
    getChoiceDisplayName(choiceType, choiceRarity) {
        const rarityNames = ['Common', 'Rare', 'Epic', 'Legendary'];
        const typeNames = ['Weapon', 'Armor', 'Skill', 'Blessing'];
        
        const rarity = rarityNames[choiceRarity] || 'Unknown';
        const type = typeNames[choiceType] || 'Mystery';
        
        return `${rarity} ${type}`;
    }
    
    getCurseDisplayName(curseType) {
        const curseNames = [
            'Weakness', 'Slowness', 'Fragility', 'Confusion', 
            'Blindness', 'Silence', 'Poison', 'Curse'
        ];
        return curseNames[curseType] || `Curse ${curseType}`;
    }
    
    /**
     * Get current active overlay
     */
    getActiveOverlay() {
        return this.activeOverlay;
    }
    
    /**
     * Force hide all overlays
     */
    forceHideAll() {
        this.hideAllOverlays();
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.hideAllOverlays();
        this.overlayElements.clear();
        this.initialized = false;
        
        console.log('🗑️ Phase Overlay Manager destroyed');
    }
}
