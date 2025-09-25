// Animation Synchronization System for Multiplayer
// Handles animation state synchronization across network

export class AnimationSyncSystem {
    constructor(options = {}) {
        this.localPlayerId = options.localPlayerId || null
        this.isHost = options.isHost || false
        this.interpolationDelay = options.interpolationDelay || 100 // ms
        this.predictionEnabled = options.predictionEnabled !== false
        this.rollbackEnabled = options.rollbackEnabled !== false
        
        // Animation states for all entities
        this.entityStates = new Map()
        this.stateHistory = new Map()
        this.predictedStates = new Map()
        
        // Network timing
        this.serverTime = 0
        this.clientTime = 0
        this.latency = 0
        this.jitter = 0
        
        // Interpolation buffers
        this.interpolationBuffers = new Map()
        
        // Rollback data
        this.rollbackFrames = options.rollbackFrames || 8
        this.confirmedStates = new Map()
        
        // Compression
        this.compressionEnabled = options.compressionEnabled !== false
        this.deltaCompression = options.deltaCompression !== false
    }

    // Create animation state snapshot
    createSnapshot(entity, animator) {
        const snapshot = {
            entityId: entity.id,
            timestamp: this.getNetworkTime(),
            state: {
                animationName: animator.controller.currentAnimation?.name || 'idle',
                animationFrame: animator.controller.currentAnimation?.currentFrame || 0,
                animationTime: animator.controller.currentAnimation?.elapsedTime || 0,
                animationSpeed: animator.controller.currentAnimation?.speed || 1,
                facing: animator.facing || 'right',
                position: {
                    x: entity.x,
                    y: entity.y
                },
                velocity: {
                    x: entity.vx || 0,
                    y: entity.vy || 0
                },
                // Procedural animation states
                procedural: {
                    breathing: animator.breathing?.phase || 0,
                    wobble: animator.wobble?.displacement || 0,
                    momentum: {
                        x: animator.momentumSystem?.momentum.x || 0,
                        y: animator.momentumSystem?.momentum.y || 0
                    }
                },
                // Combat states
                combat: {
                    attacking: entity.state === 'attacking',
                    blocking: entity.state === 'blocking',
                    invulnerable: entity.invulnerable || false,
                    comboCount: entity.comboCount || 0
                }
            }
        }
        
        // Compress if enabled
        if (this.compressionEnabled) {
            return this.compressSnapshot(snapshot)
        }
        
        return snapshot
    }

    // Apply animation state snapshot
    applySnapshot(entity, animator, snapshot, interpolate = true) {
        if (this.compressionEnabled) {
            snapshot = this.decompressSnapshot(snapshot)
        }
        
        // Store in history for rollback
        this.addToHistory(entity.id, snapshot)
        
        if (interpolate && entity.id !== this.localPlayerId) {
            // Add to interpolation buffer for smooth playback
            this.addToInterpolationBuffer(entity.id, snapshot)
        } else {
            // Direct application for local player or when not interpolating
            this.directApplySnapshot(entity, animator, snapshot)
        }
    }

    // Direct snapshot application
    directApplySnapshot(entity, animator, snapshot) {
        const state = snapshot.state
        
        // Apply animation state
        if (animator.controller.currentAnimation?.name !== state.animationName) {
            animator.controller.play(state.animationName)
        }
        
        // Sync animation timing
        if (animator.controller.currentAnimation) {
            animator.controller.currentAnimation.currentFrame = state.animationFrame
            animator.controller.currentAnimation.elapsedTime = state.animationTime
            animator.controller.currentAnimation.speed = state.animationSpeed
        }
        
        // Apply facing
        animator.setFacing(state.facing)
        
        // Apply position with prediction
        if (this.predictionEnabled && entity.id !== this.localPlayerId) {
            const predictedPos = this.predictPosition(state, snapshot.timestamp)
            entity.x = predictedPos.x
            entity.y = predictedPos.y
        } else {
            entity.x = state.position.x
            entity.y = state.position.y
        }
        
        // Apply velocity
        entity.vx = state.velocity.x
        entity.vy = state.velocity.y
        
        // Apply procedural states
        if (animator.breathing) {
            animator.breathing.phase = state.procedural.breathing
        }
        if (animator.wobble) {
            animator.wobble.displacement = state.procedural.wobble
        }
        if (animator.momentumSystem) {
            animator.momentumSystem.momentum = state.procedural.momentum
        }
        
        // Apply combat states
        if (state.combat.attacking && entity.state !== 'attacking') {
            entity.setState('attacking')
        }
        if (state.combat.blocking && entity.state !== 'blocking') {
            entity.setState('blocking')
        }
        entity.invulnerable = state.combat.invulnerable
        entity.comboCount = state.combat.comboCount
    }

    // Interpolate between animation states
    interpolateStates(entity, animator, _deltaTime) {
        const buffer = this.interpolationBuffers.get(entity.id)
        if (!buffer || buffer.length < 2) {return}
        
        const now = this.getNetworkTime() - this.interpolationDelay
        
        // Find surrounding snapshots
        let from = null
        let to = null
        
        for (let i = 0; i < buffer.length - 1; i++) {
            if (buffer[i].timestamp <= now && buffer[i + 1].timestamp > now) {
                from = buffer[i]
                to = buffer[i + 1]
                break
            }
        }
        
        if (!from || !to) {
            // Apply latest if we can't interpolate
            if (buffer.length > 0) {
                this.directApplySnapshot(entity, animator, buffer[buffer.length - 1])
            }
            return
        }
        
        // Calculate interpolation factor
        const timeDiff = to.timestamp - from.timestamp
        const elapsed = now - from.timestamp
        const t = Math.max(0, Math.min(1, elapsed / timeDiff))
        
        // Interpolate position
        entity.x = this.lerp(from.state.position.x, to.state.position.x, t)
        entity.y = this.lerp(from.state.position.y, to.state.position.y, t)
        
        // Interpolate velocity
        entity.vx = this.lerp(from.state.velocity.x, to.state.velocity.x, t)
        entity.vy = this.lerp(from.state.velocity.y, to.state.velocity.y, t)
        
        // Interpolate procedural values
        if (animator.breathing) {
            animator.breathing.phase = this.lerp(
                from.state.procedural.breathing,
                to.state.procedural.breathing,
                t
            )
        }
        
        // Handle discrete state changes
        if (t > 0.5) {
            // Apply "to" state for discrete values
            if (animator.controller.currentAnimation?.name !== to.state.animationName) {
                animator.controller.play(to.state.animationName)
            }
            animator.setFacing(to.state.facing)
        }
        
        // Clean old snapshots from buffer
        this.cleanInterpolationBuffer(entity.id, now)
    }

    // Predict position based on velocity
    predictPosition(state, timestamp) {
        const timeDiff = (this.getNetworkTime() - timestamp) / 1000
        return {
            x: state.position.x + state.velocity.x * timeDiff,
            y: state.position.y + state.velocity.y * timeDiff
        }
    }

    // Rollback and replay for client-side prediction
    rollbackAndReplay(entity, animator, confirmedSnapshot) {
        if (!this.rollbackEnabled) {return}
        
        // Find the confirmed state in history
        const history = this.stateHistory.get(entity.id) || []
        const confirmedIndex = history.findIndex(
            s => s.timestamp === confirmedSnapshot.timestamp
        )
        
        if (confirmedIndex === -1) {return}
        
        // Apply confirmed state
        this.directApplySnapshot(entity, animator, confirmedSnapshot)
        
        // Replay all inputs after confirmed state
        for (let i = confirmedIndex + 1; i < history.length; i++) {
            const state = history[i]
            // Re-simulate with stored inputs
            this.simulateFrame(entity, animator, state.inputs, state.deltaTime)
        }
        
        // Store as new confirmed state
        this.confirmedStates.set(entity.id, confirmedSnapshot)
    }

    // Simulate frame with inputs (for rollback)
    simulateFrame(entity, animator, inputs, deltaTime) {
        // This should match your game's update logic
        entity.update(deltaTime, inputs)
        animator.update(deltaTime, entity.position, entity.velocity)
    }

    // Compress snapshot for network transmission
    compressSnapshot(snapshot) {
        if (!this.deltaCompression) {
            return this.basicCompress(snapshot)
        }
        
        const lastSnapshot = this.entityStates.get(snapshot.entityId)
        if (!lastSnapshot) {
            return this.basicCompress(snapshot)
        }
        
        // Delta compression
        const delta = {
            entityId: snapshot.entityId,
            timestamp: snapshot.timestamp,
            delta: {}
        }
        
        // Only send changed fields
        this.addDeltaField(delta.delta, 'animationName', 
            lastSnapshot.state.animationName, snapshot.state.animationName)
        this.addDeltaField(delta.delta, 'animationFrame',
            lastSnapshot.state.animationFrame, snapshot.state.animationFrame)
        this.addDeltaField(delta.delta, 'facing',
            lastSnapshot.state.facing, snapshot.state.facing)
        
        // Position and velocity always sent (they change frequently)
        delta.delta.position = snapshot.state.position
        delta.delta.velocity = snapshot.state.velocity
        
        // Combat state changes
        if (lastSnapshot.state.combat.attacking !== snapshot.state.combat.attacking) {
            delta.delta.attacking = snapshot.state.combat.attacking
        }
        if (lastSnapshot.state.combat.blocking !== snapshot.state.combat.blocking) {
            delta.delta.blocking = snapshot.state.combat.blocking
        }
        
        return delta
    }

    // Basic compression (field reduction)
    basicCompress(snapshot) {
        return {
            id: snapshot.entityId,
            t: snapshot.timestamp,
            s: {
                an: snapshot.state.animationName,
                af: snapshot.state.animationFrame,
                at: Math.round(snapshot.state.animationTime * 100) / 100,
                f: snapshot.state.facing[0], // First letter only
                p: [
                    Math.round(snapshot.state.position.x),
                    Math.round(snapshot.state.position.y)
                ],
                v: [
                    Math.round(snapshot.state.velocity.x),
                    Math.round(snapshot.state.velocity.y)
                ],
                c: this.packCombatState(snapshot.state.combat)
            }
        }
    }

    // Decompress snapshot
    decompressSnapshot(compressed) {
        if (compressed.delta) {
            return this.applyDelta(compressed)
        }
        
        return {
            entityId: compressed.id,
            timestamp: compressed.t,
            state: {
                animationName: compressed.s.an,
                animationFrame: compressed.s.af,
                animationTime: compressed.s.at,
                animationSpeed: 1,
                facing: compressed.s.f === 'r' ? 'right' : 'left',
                position: {
                    x: compressed.s.p[0],
                    y: compressed.s.p[1]
                },
                velocity: {
                    x: compressed.s.v[0],
                    y: compressed.s.v[1]
                },
                procedural: {
                    breathing: 0,
                    wobble: 0,
                    momentum: { x: 0, y: 0 }
                },
                combat: this.unpackCombatState(compressed.s.c)
            }
        }
    }

    // Pack combat state into bit flags
    packCombatState(combat) {
        let flags = 0
        if (combat.attacking) {flags |= 1}
        if (combat.blocking) {flags |= 2}
        if (combat.invulnerable) {flags |= 4}
        return flags | (combat.comboCount << 3)
    }

    // Unpack combat state from bit flags
    unpackCombatState(flags) {
        return {
            attacking: !!(flags & 1),
            blocking: !!(flags & 2),
            invulnerable: !!(flags & 4),
            comboCount: flags >> 3
        }
    }

    // Helper methods
    addDeltaField(delta, field, oldValue, newValue) {
        if (oldValue !== newValue) {
            delta[field] = newValue
        }
    }

    applyDelta(compressed) {
        const lastSnapshot = this.entityStates.get(compressed.entityId)
        if (!lastSnapshot) {
            console.warn('No base snapshot for delta compression')
            return null
        }
        
        const snapshot = JSON.parse(JSON.stringify(lastSnapshot))
        snapshot.timestamp = compressed.timestamp
        
        // Apply delta changes
        const delta = compressed.delta
        // eslint-disable-next-line eqeqeq
        if (delta.animationName != null) {
            snapshot.state.animationName = delta.animationName
        }
        // eslint-disable-next-line eqeqeq
        if (delta.animationFrame != null) {
            snapshot.state.animationFrame = delta.animationFrame
        }
        // eslint-disable-next-line eqeqeq
        if (delta.facing != null) {
            snapshot.state.facing = delta.facing
        }
        if (delta.position) {
            snapshot.state.position = delta.position
        }
        if (delta.velocity) {
            snapshot.state.velocity = delta.velocity
        }
        // eslint-disable-next-line eqeqeq
        if (delta.attacking != null) {
            snapshot.state.combat.attacking = delta.attacking
        }
        // eslint-disable-next-line eqeqeq
        if (delta.blocking != null) {
            snapshot.state.combat.blocking = delta.blocking
        }
        
        return snapshot
    }

    addToHistory(entityId, snapshot) {
        if (!this.stateHistory.has(entityId)) {
            this.stateHistory.set(entityId, [])
        }
        
        const history = this.stateHistory.get(entityId)
        history.push(snapshot)
        
        // Keep only recent history
        const maxHistory = this.rollbackFrames * 2
        if (history.length > maxHistory) {
            history.splice(0, history.length - maxHistory)
        }
    }

    addToInterpolationBuffer(entityId, snapshot) {
        if (!this.interpolationBuffers.has(entityId)) {
            this.interpolationBuffers.set(entityId, [])
        }
        
        const buffer = this.interpolationBuffers.get(entityId)
        buffer.push(snapshot)
        
        // Sort by timestamp
        buffer.sort((a, b) => a.timestamp - b.timestamp)
    }

    cleanInterpolationBuffer(entityId, currentTime) {
        const buffer = this.interpolationBuffers.get(entityId)
        if (!buffer) {return}
        
        // Remove old snapshots
        const cutoff = currentTime - this.interpolationDelay * 2
        const newBuffer = buffer.filter(s => s.timestamp > cutoff)
        this.interpolationBuffers.set(entityId, newBuffer)
    }

    lerp(a, b, t) {
        return a + (b - a) * t
    }

    getNetworkTime() {
        return this.isHost ? Date.now() : this.serverTime + (Date.now() - this.clientTime)
    }

    updateNetworkTime(serverTime) {
        this.serverTime = serverTime
        this.clientTime = Date.now()
    }

    setLatency(latency) {
        this.latency = latency
        this.jitter = Math.abs(latency - this.latency) * 0.1 + this.jitter * 0.9
    }

    // Debug rendering
    renderDebug(ctx, x = 10, y = 100) {
        ctx.save()
        ctx.font = '12px monospace'
        ctx.fillStyle = 'white'
        
        ctx.fillText(`Network Animation Sync`, x, y)
        y += 15
        ctx.fillText(`Latency: ${this.latency.toFixed(0)}ms (±${this.jitter.toFixed(0)}ms)`, x, y)
        y += 15
        ctx.fillText(`Entities: ${this.entityStates.size}`, x, y)
        y += 15
        ctx.fillText(`Interpolation Delay: ${this.interpolationDelay}ms`, x, y)
        y += 15
        
        // Show buffer sizes
        for (const [entityId, buffer] of this.interpolationBuffers) {
            ctx.fillText(`  Entity ${entityId}: ${buffer.length} snapshots`, x, y)
            y += 12
        }
        
        ctx.restore()
    }
}

export default AnimationSyncSystem