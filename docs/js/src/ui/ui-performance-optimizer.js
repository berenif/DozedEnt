/**
 * UI Performance Optimizer - Optimizes UI rendering and removes redundant elements
 * Ensures smooth 60fps performance and minimal memory usage
 * Follows WASM-first architecture principles
 */

export class UIPerformanceOptimizer {
    constructor() {
        this.frameTime = 0;
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fps = 60;
        this.targetFrameTime = 16.67; // 60fps target
        this.performanceMetrics = {
            averageFrameTime: 0,
            worstFrameTime: 0,
            memoryUsage: 0,
            domNodeCount: 0
        };
        
        this.optimizations = {
            enableVirtualization: true,
            enableBatching: true,
            enableCaching: true,
            enableLazyLoading: true
        };
        
        this.elementCache = new Map();
        this.updateQueue = [];
        this.batchUpdateTimer = null;
        
        this.initialized = false;
    }
    
    /**
     * Initialize the performance optimizer
     */
    initialize() {
        if (this.initialized) {
            console.warn('UIPerformanceOptimizer already initialized');
            return;
        }
        
        console.log('⚡ Initializing UI Performance Optimizer...');
        
        // Setup performance monitoring
        this.setupPerformanceMonitoring();
        
        // Apply initial optimizations
        this.applyInitialOptimizations();
        
        // Setup update batching
        this.setupUpdateBatching();
        
        this.initialized = true;
        console.log('✅ UI Performance Optimizer initialized');
    }
    
    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        // Monitor frame times
        const measureFrameTime = () => {
            const currentTime = performance.now();
            this.frameTime = currentTime - this.lastFrameTime;
            this.lastFrameTime = currentTime;
            this.frameCount++;
            
            // Update metrics every 60 frames
            if (this.frameCount % 60 === 0) {
                this.updatePerformanceMetrics();
            }
            
            requestAnimationFrame(measureFrameTime);
        };
        
        requestAnimationFrame(measureFrameTime);
        
        // Monitor memory usage periodically
        if (performance.memory) {
            setInterval(() => {
                this.performanceMetrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
            }, 5000);
        }
        
        // Monitor DOM node count
        setInterval(() => {
            this.performanceMetrics.domNodeCount = document.querySelectorAll('*').length;
        }, 10000);
    }
    
    /**
     * Update performance metrics
     */
    updatePerformanceMetrics() {
        this.performanceMetrics.averageFrameTime = this.frameTime;
        this.performanceMetrics.worstFrameTime = Math.max(this.performanceMetrics.worstFrameTime, this.frameTime);
        this.fps = 1000 / this.frameTime;
        
        // Log performance warnings (less aggressive threshold)
        if (this.frameTime > this.targetFrameTime * 2.5) {
            console.warn(`⚠️ Frame time exceeded target: ${this.frameTime.toFixed(2)}ms (target: ${this.targetFrameTime}ms)`);
        }
        
        if (this.performanceMetrics.memoryUsage > 100) {
            console.warn(`⚠️ High memory usage: ${this.performanceMetrics.memoryUsage.toFixed(2)}MB`);
        }
    }
    
    /**
     * Apply initial optimizations
     */
    applyInitialOptimizations() {
        // Remove redundant UI elements
        this.removeRedundantElements();
        
        // Optimize CSS animations
        this.optimizeAnimations();
        
        // Setup element virtualization
        this.setupElementVirtualization();
        
        // Cache frequently accessed elements
        this.cacheFrequentElements();
    }
    
    /**
     * Remove redundant UI elements
     */
    removeRedundantElements() {
        console.log('🧹 Removing redundant UI elements...');
        
        // Remove duplicate health bars
        const healthBars = document.querySelectorAll('.health-bar, .critical-health-bar, .roguelike-health-bar');
        if (healthBars.length > 1) {
            // Keep only the enhanced UI health bar
            healthBars.forEach((bar, index) => {
                if (index > 0 && !bar.classList.contains('critical-health-bar')) {
                    bar.style.display = 'none';
                    console.log('🗑️ Hidden redundant health bar');
                }
            });
        }
        
        // Remove duplicate stamina bars
        const staminaBars = document.querySelectorAll('.stamina-bar, .critical-stamina-bar, .roguelike-stamina-bar');
        if (staminaBars.length > 1) {
            staminaBars.forEach((bar, index) => {
                if (index > 0 && !bar.classList.contains('critical-stamina-bar')) {
                    bar.style.display = 'none';
                    console.log('🗑️ Hidden redundant stamina bar');
                }
            });
        }
        
        // Remove duplicate ability bars
        const abilityBars = document.querySelectorAll('.ability-bar, .priority-abilities');
        if (abilityBars.length > 1) {
            abilityBars.forEach((bar, index) => {
                if (index > 0 && !bar.classList.contains('priority-abilities')) {
                    bar.style.display = 'none';
                    console.log('🗑️ Hidden redundant ability bar');
                }
            });
        }
        
        // Remove empty or unused UI containers
        const emptyContainers = document.querySelectorAll('div:empty, span:empty');
        emptyContainers.forEach(container => {
            if (!container.id && !container.className.includes('spacer')) {
                container.remove();
            }
        });
        
        console.log('✅ Redundant elements removed');
    }
    
    /**
     * Optimize CSS animations
     */
    optimizeAnimations() {
        console.log('🎨 Optimizing CSS animations...');
        
        // Use transform and opacity for animations (GPU accelerated)
        const animatedElements = document.querySelectorAll('[class*="animate"], [class*="transition"]');
        animatedElements.forEach(element => {
            element.style.willChange = 'transform, opacity';
            element.style.backfaceVisibility = 'hidden';
            element.style.perspective = '1000px';
        });
        
        // Disable animations during high CPU usage
        if (this.frameTime > this.targetFrameTime * 2) {
            document.body.classList.add('reduce-motion');
        }
        
        console.log('✅ Animations optimized');
    }
    
    /**
     * Setup element virtualization for large lists
     */
    setupElementVirtualization() {
        if (!this.optimizations.enableVirtualization) return;
        
        // Virtualize damage numbers
        this.virtualizeDamageNumbers();
        
        // Virtualize particle effects
        this.virtualizeParticleEffects();
    }
    
    /**
     * Virtualize damage numbers to prevent DOM bloat
     */
    virtualizeDamageNumbers() {
        const damageContainer = document.querySelector('.stable-damage-numbers, #damage-numbers-enhanced');
        if (!damageContainer) return;
        
        // Limit damage numbers to 20 visible at once
        const maxDamageNumbers = 20;
        let damageNumberPool = [];
        
        // Create object pool for damage numbers
        for (let i = 0; i < maxDamageNumbers; i++) {
            const damageNumber = document.createElement('div');
            damageNumber.className = 'damage-number pooled';
            damageNumber.style.display = 'none';
            damageContainer.appendChild(damageNumber);
            damageNumberPool.push(damageNumber);
        }
        
        // Store pool reference for reuse
        this.elementCache.set('damageNumberPool', damageNumberPool);
        
        console.log('✅ Damage number virtualization setup');
    }
    
    /**
     * Virtualize particle effects
     */
    virtualizeParticleEffects() {
        // Similar to damage numbers, create pools for particle effects
        const effectsContainer = document.querySelector('.stable-screen-effects, #screen-effects-enhanced');
        if (!effectsContainer) return;
        
        const maxEffects = 10;
        let effectPool = [];
        
        for (let i = 0; i < maxEffects; i++) {
            const effect = document.createElement('div');
            effect.className = 'screen-effect pooled';
            effect.style.display = 'none';
            effectsContainer.appendChild(effect);
            effectPool.push(effect);
        }
        
        this.elementCache.set('effectPool', effectPool);
        
        console.log('✅ Particle effect virtualization setup');
    }
    
    /**
     * Cache frequently accessed elements
     */
    cacheFrequentElements() {
        if (!this.optimizations.enableCaching) return;
        
        const frequentSelectors = [
            '#debug-hud',
            '#connectionStatus',
            '#playerCount',
            '.mobile-controls',
            '.phase-overlay',
            '#health-fill-enhanced',
            '#stamina-fill-enhanced'
        ];
        
        frequentSelectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                this.elementCache.set(selector, element);
            }
        });
        
        console.log(`✅ Cached ${this.elementCache.size} frequently accessed elements`);
    }
    
    /**
     * Setup update batching to reduce DOM thrashing
     */
    setupUpdateBatching() {
        if (!this.optimizations.enableBatching) return;
        
        // Batch DOM updates to avoid layout thrashing
        this.batchUpdate = (updateFn) => {
            this.updateQueue.push(updateFn);
            
            if (!this.batchUpdateTimer) {
                this.batchUpdateTimer = requestAnimationFrame(() => {
                    // Process all queued updates
                    this.updateQueue.forEach(update => {
                        try {
                            update();
                        } catch (error) {
                            console.error('Error in batched update:', error);
                        }
                    });
                    
                    this.updateQueue = [];
                    this.batchUpdateTimer = null;
                });
            }
        };
        
        console.log('✅ Update batching setup');
    }
    
    /**
     * Get cached element or query if not cached
     */
    getCachedElement(selector) {
        if (this.elementCache.has(selector)) {
            return this.elementCache.get(selector);
        }
        
        const element = document.querySelector(selector);
        if (element) {
            this.elementCache.set(selector, element);
        }
        
        return element;
    }
    
    /**
     * Optimized element update
     */
    updateElement(selector, updateFn) {
        if (this.optimizations.enableBatching) {
            this.batchUpdate(() => {
                const element = this.getCachedElement(selector);
                if (element) {
                    updateFn(element);
                }
            });
        } else {
            const element = this.getCachedElement(selector);
            if (element) {
                updateFn(element);
            }
        }
    }
    
    /**
     * Get object from pool or create new one
     */
    getPooledObject(poolName, createFn) {
        const pool = this.elementCache.get(poolName);
        if (!pool) return createFn();
        
        // Find available object in pool
        const available = pool.find(obj => obj.style.display === 'none');
        if (available) {
            return available;
        }
        
        // Pool is full, reuse oldest
        return pool[0];
    }
    
    /**
     * Return object to pool
     */
    returnToPool(poolName, object) {
        object.style.display = 'none';
        object.className = object.className.replace(/\s*active\s*/, '');
    }
    
    /**
     * Monitor and adjust performance based on current conditions
     */
    adaptiveOptimization() {
        const currentFPS = this.fps;
        
        if (currentFPS < 45) {
            // Performance is poor, enable more aggressive optimizations
            console.log('⚠️ Low FPS detected, enabling aggressive optimizations');
            
            // Disable non-essential animations
            document.body.classList.add('reduce-motion');
            
            // Reduce update frequency for non-critical elements
            this.optimizations.enableVirtualization = true;
            this.optimizations.enableBatching = true;
            
            // Hide decorative elements
            const decorativeElements = document.querySelectorAll('.decorative, .particle-effect');
            decorativeElements.forEach(el => el.style.display = 'none');
            
        } else if (currentFPS > 55) {
            // Performance is good, can enable more features
            document.body.classList.remove('reduce-motion');
            
            // Re-enable decorative elements
            const decorativeElements = document.querySelectorAll('.decorative, .particle-effect');
            decorativeElements.forEach(el => el.style.display = '');
        }
    }
    
    /**
     * Get current performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            fps: this.fps,
            frameTime: this.frameTime,
            cacheSize: this.elementCache.size,
            updateQueueSize: this.updateQueue.length
        };
    }
    
    /**
     * Enable/disable specific optimizations
     */
    setOptimization(name, enabled) {
        if (this.optimizations.hasOwnProperty(name)) {
            this.optimizations[name] = enabled;
            console.log(`${enabled ? '✅' : '❌'} ${name} optimization ${enabled ? 'enabled' : 'disabled'}`);
        }
    }
    
    /**
     * Clear caches and reset
     */
    clearCaches() {
        this.elementCache.clear();
        this.updateQueue = [];
        
        if (this.batchUpdateTimer) {
            cancelAnimationFrame(this.batchUpdateTimer);
            this.batchUpdateTimer = null;
        }
        
        console.log('🧹 Performance optimizer caches cleared');
    }
    
    /**
     * Cleanup and destroy
     */
    destroy() {
        this.clearCaches();
        this.initialized = false;
        
        console.log('🗑️ UI Performance Optimizer destroyed');
    }
}

// Global instance
export const uiPerformanceOptimizer = new UIPerformanceOptimizer();
