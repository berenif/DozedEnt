// Animation Performance Monitoring System
// Tracks and optimizes animation performance metrics

export class AnimationPerformanceMonitor {
    constructor(options = {}) {
        this.enabled = options.enabled !== false
        this.sampleSize = options.sampleSize || 60
        this.warningThreshold = options.warningThreshold || 16.67 // ms (60 FPS)
        this.criticalThreshold = options.criticalThreshold || 33.33 // ms (30 FPS)
        
        // Performance metrics
        this.metrics = {
            frameTime: [],
            updateTime: [],
            renderTime: [],
            animationCount: [],
            particleCount: [],
            transformCalculations: [],
            memoryUsage: []
        }
        
        // Statistics
        this.stats = {
            averageFrameTime: 0,
            averageUpdateTime: 0,
            averageRenderTime: 0,
            peakFrameTime: 0,
            droppedFrames: 0,
            totalFrames: 0,
            fps: 60,
            targetFps: 60
        }
        
        // Performance optimizations
        this.optimizations = {
            reducedQuality: false,
            skipFrames: false,
            reduceParticles: false,
            simplifyAnimations: false,
            disableSecondaryMotion: false,
            reduceLOD: false
        }
        
        // Timing
        this.lastFrameTime = performance.now()
        this.frameStartTime = 0
        this.updateStartTime = 0
        this.renderStartTime = 0
        
        // Auto-optimization
        this.autoOptimize = options.autoOptimize !== false
        this.optimizationCooldown = 0
        this.optimizationDelay = options.optimizationDelay || 2000 // ms
    }

    // Start frame timing
    startFrame() {
        if (!this.enabled) return
        
        this.frameStartTime = performance.now()
        const deltaTime = this.frameStartTime - this.lastFrameTime
        
        // Record frame time
        this.recordMetric('frameTime', deltaTime)
        
        // Calculate FPS
        this.stats.fps = 1000 / deltaTime
        this.stats.totalFrames++
        
        // Check for dropped frames
        if (deltaTime > this.warningThreshold) {
            this.stats.droppedFrames++
        }
        
        this.lastFrameTime = this.frameStartTime
    }

    // End frame timing
    endFrame() {
        if (!this.enabled || !this.frameStartTime) return
        
        const frameTime = performance.now() - this.frameStartTime
        
        // Update peak frame time
        if (frameTime > this.stats.peakFrameTime) {
            this.stats.peakFrameTime = frameTime
        }
        
        // Auto-optimize if needed
        if (this.autoOptimize) {
            this.checkAutoOptimization(frameTime)
        }
    }

    // Start update timing
    startUpdate() {
        if (!this.enabled) return
        this.updateStartTime = performance.now()
    }

    // End update timing
    endUpdate(animationCount = 0) {
        if (!this.enabled || !this.updateStartTime) return
        
        const updateTime = performance.now() - this.updateStartTime
        this.recordMetric('updateTime', updateTime)
        this.recordMetric('animationCount', animationCount)
        
        this.stats.averageUpdateTime = this.calculateAverage('updateTime')
    }

    // Start render timing
    startRender() {
        if (!this.enabled) return
        this.renderStartTime = performance.now()
    }

    // End render timing
    endRender(particleCount = 0) {
        if (!this.enabled || !this.renderStartTime) return
        
        const renderTime = performance.now() - this.renderStartTime
        this.recordMetric('renderTime', renderTime)
        this.recordMetric('particleCount', particleCount)
        
        this.stats.averageRenderTime = this.calculateAverage('renderTime')
    }

    // Record a metric value
    recordMetric(name, value) {
        if (!this.metrics[name]) {
            this.metrics[name] = []
        }
        
        this.metrics[name].push(value)
        
        // Keep only recent samples
        if (this.metrics[name].length > this.sampleSize) {
            this.metrics[name].shift()
        }
    }

    // Calculate average of a metric
    calculateAverage(metricName) {
        const values = this.metrics[metricName]
        if (!values || values.length === 0) return 0
        
        const sum = values.reduce((a, b) => a + b, 0)
        return sum / values.length
    }

    // Calculate percentile of a metric
    calculatePercentile(metricName, percentile) {
        const values = [...this.metrics[metricName]].sort((a, b) => a - b)
        if (values.length === 0) return 0
        
        const index = Math.ceil((percentile / 100) * values.length) - 1
        return values[Math.max(0, index)]
    }

    // Check and apply auto-optimizations
    checkAutoOptimization(frameTime) {
        // Cooldown to prevent rapid optimization changes
        if (this.optimizationCooldown > 0) {
            this.optimizationCooldown -= frameTime
            return
        }
        
        const avgFrameTime = this.calculateAverage('frameTime')
        
        // Apply optimizations if performance is poor
        if (avgFrameTime > this.criticalThreshold) {
            this.applyOptimizationLevel(3) // Critical
        } else if (avgFrameTime > this.warningThreshold) {
            this.applyOptimizationLevel(2) // Warning
        } else if (avgFrameTime < this.warningThreshold * 0.5) {
            this.applyOptimizationLevel(0) // Can increase quality
        }
    }

    // Apply optimization level
    applyOptimizationLevel(level) {
        switch (level) {
            case 0: // High quality
                this.optimizations = {
                    reducedQuality: false,
                    skipFrames: false,
                    reduceParticles: false,
                    simplifyAnimations: false,
                    disableSecondaryMotion: false,
                    reduceLOD: false
                }
                break
                
            case 1: // Slight reduction
                this.optimizations = {
                    reducedQuality: false,
                    skipFrames: false,
                    reduceParticles: true,
                    simplifyAnimations: false,
                    disableSecondaryMotion: false,
                    reduceLOD: true
                }
                break
                
            case 2: // Medium reduction
                this.optimizations = {
                    reducedQuality: true,
                    skipFrames: false,
                    reduceParticles: true,
                    simplifyAnimations: true,
                    disableSecondaryMotion: true,
                    reduceLOD: true
                }
                break
                
            case 3: // Maximum reduction
                this.optimizations = {
                    reducedQuality: true,
                    skipFrames: true,
                    reduceParticles: true,
                    simplifyAnimations: true,
                    disableSecondaryMotion: true,
                    reduceLOD: true
                }
                break
        }
        
        this.optimizationCooldown = this.optimizationDelay
    }

    // Get current performance status
    getStatus() {
        const avgFrameTime = this.calculateAverage('frameTime')
        
        return {
            healthy: avgFrameTime < this.warningThreshold,
            warning: avgFrameTime >= this.warningThreshold && avgFrameTime < this.criticalThreshold,
            critical: avgFrameTime >= this.criticalThreshold,
            fps: Math.round(this.stats.fps),
            frameTime: avgFrameTime.toFixed(2),
            droppedFrames: this.stats.droppedFrames,
            optimizations: this.optimizations
        }
    }

    // Get detailed metrics
    getDetailedMetrics() {
        return {
            frameTime: {
                average: this.calculateAverage('frameTime'),
                p50: this.calculatePercentile('frameTime', 50),
                p95: this.calculatePercentile('frameTime', 95),
                p99: this.calculatePercentile('frameTime', 99),
                peak: this.stats.peakFrameTime
            },
            updateTime: {
                average: this.calculateAverage('updateTime'),
                p95: this.calculatePercentile('updateTime', 95)
            },
            renderTime: {
                average: this.calculateAverage('renderTime'),
                p95: this.calculatePercentile('renderTime', 95)
            },
            counts: {
                animations: this.calculateAverage('animationCount'),
                particles: this.calculateAverage('particleCount'),
                transforms: this.calculateAverage('transformCalculations')
            },
            performance: {
                fps: Math.round(this.stats.fps),
                targetFps: this.stats.targetFps,
                droppedFrames: this.stats.droppedFrames,
                droppedFrameRate: (this.stats.droppedFrames / this.stats.totalFrames) * 100
            }
        }
    }

    // Reset metrics
    reset() {
        for (const key in this.metrics) {
            this.metrics[key] = []
        }
        
        this.stats = {
            averageFrameTime: 0,
            averageUpdateTime: 0,
            averageRenderTime: 0,
            peakFrameTime: 0,
            droppedFrames: 0,
            totalFrames: 0,
            fps: 60,
            targetFps: 60
        }
        
        this.lastFrameTime = performance.now()
    }

    // Render performance overlay
    renderOverlay(ctx, x = 10, y = 10) {
        if (!this.enabled) return
        
        const status = this.getStatus()
        const metrics = this.getDetailedMetrics()
        
        ctx.save()
        ctx.font = '12px monospace'
        ctx.fillStyle = status.critical ? '#ff0000' : 
                       status.warning ? '#ffaa00' : '#00ff00'
        
        // FPS counter
        ctx.fillText(`FPS: ${metrics.performance.fps}/${metrics.performance.targetFps}`, x, y)
        y += 15
        
        // Frame time
        ctx.fillText(`Frame: ${metrics.frameTime.average.toFixed(2)}ms (p95: ${metrics.frameTime.p95.toFixed(2)}ms)`, x, y)
        y += 15
        
        // Update/Render breakdown
        ctx.fillText(`Update: ${metrics.updateTime.average.toFixed(2)}ms`, x, y)
        y += 15
        ctx.fillText(`Render: ${metrics.renderTime.average.toFixed(2)}ms`, x, y)
        y += 15
        
        // Counts
        ctx.fillText(`Animations: ${Math.round(metrics.counts.animations)}`, x, y)
        y += 15
        ctx.fillText(`Particles: ${Math.round(metrics.counts.particles)}`, x, y)
        y += 15
        
        // Dropped frames
        if (metrics.performance.droppedFrames > 0) {
            ctx.fillStyle = '#ff0000'
            ctx.fillText(`Dropped: ${metrics.performance.droppedFrames} (${metrics.performance.droppedFrameRate.toFixed(1)}%)`, x, y)
            y += 15
        }
        
        // Active optimizations
        const activeOpts = Object.entries(this.optimizations)
            .filter(([_, enabled]) => enabled)
            .map(([name, _]) => name)
        
        if (activeOpts.length > 0) {
            ctx.fillStyle = '#ffaa00'
            ctx.fillText(`Optimizations: ${activeOpts.join(', ')}`, x, y)
            y += 15
        }
        
        // Performance graph
        this.renderPerformanceGraph(ctx, x, y, 200, 50)
        
        ctx.restore()
    }

    // Render performance graph
    renderPerformanceGraph(ctx, x, y, width, height) {
        const frameTimeData = this.metrics.frameTime
        if (frameTimeData.length < 2) return
        
        ctx.save()
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(x, y, width, height)
        
        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
        ctx.lineWidth = 1
        
        // 60 FPS line
        const fps60Y = y + height - (16.67 / this.criticalThreshold) * height
        ctx.beginPath()
        ctx.moveTo(x, fps60Y)
        ctx.lineTo(x + width, fps60Y)
        ctx.stroke()
        
        // 30 FPS line
        const fps30Y = y + height - (33.33 / this.criticalThreshold) * height
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.2)'
        ctx.beginPath()
        ctx.moveTo(x, fps30Y)
        ctx.lineTo(x + width, fps30Y)
        ctx.stroke()
        
        // Frame time graph
        ctx.strokeStyle = '#00ff00'
        ctx.lineWidth = 2
        ctx.beginPath()
        
        const step = width / (frameTimeData.length - 1)
        frameTimeData.forEach((frameTime, index) => {
            const graphX = x + index * step
            const normalizedTime = Math.min(frameTime / this.criticalThreshold, 1)
            const graphY = y + height - (normalizedTime * height)
            
            if (index === 0) {
                ctx.moveTo(graphX, graphY)
            } else {
                ctx.lineTo(graphX, graphY)
            }
            
            // Color based on performance
            if (frameTime > this.criticalThreshold) {
                ctx.strokeStyle = '#ff0000'
            } else if (frameTime > this.warningThreshold) {
                ctx.strokeStyle = '#ffaa00'
            }
        })
        
        ctx.stroke()
        
        // Labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.font = '10px monospace'
        ctx.fillText('60', x - 20, fps60Y + 3)
        ctx.fillText('30', x - 20, fps30Y + 3)
        
        ctx.restore()
    }
}

// Global performance monitor instance
export const globalPerformanceMonitor = new AnimationPerformanceMonitor()

// Performance-aware animation wrapper
export class PerformanceAwareAnimation {
    constructor(animation, performanceMonitor = globalPerformanceMonitor) {
        this.animation = animation
        this.performanceMonitor = performanceMonitor
        this.frameSkip = 0
        this.qualityLevel = 1
    }

    update(deltaTime) {
        const optimizations = this.performanceMonitor.optimizations
        
        // Skip frames if needed
        if (optimizations.skipFrames) {
            this.frameSkip++
            if (this.frameSkip < 2) return
            this.frameSkip = 0
        }
        
        // Adjust animation speed for reduced quality
        const speedMultiplier = optimizations.reducedQuality ? 1.5 : 1
        this.animation.update(deltaTime * speedMultiplier)
    }

    getCurrentFrame() {
        const optimizations = this.performanceMonitor.optimizations
        
        // Return simplified frame if needed
        if (optimizations.simplifyAnimations) {
            // Return middle frame or simplified version
            const frames = this.animation.frames
            if (frames && frames.length > 0) {
                return frames[Math.floor(frames.length / 2)]
            }
        }
        
        return this.animation.getCurrentFrame()
    }
}

export default AnimationPerformanceMonitor