export function update(deltaTime, player) {
    // Update animation time
    this.animationTime += deltaTime
    this.animationFrame = Math.floor(this.animationTime / this.animationSpeed)

    // Update animation system with WASM data
    if (this.wasmModule) {
        try {
            // Get current WASM enemy data for this wolf using array index (not ID!)
            const wasmIndex = this.wasmIndex >= 0 ? this.wasmIndex : Math.max(0, this.id - 1); // Fallback: ID-1 = index, min 0
            const wasmEnemyType = typeof this.wasmModule.get_enemy_type === 'function' ? 
                this.wasmModule.get_enemy_type(wasmIndex) : 0;
            const wasmEnemyState = typeof this.wasmModule.get_enemy_state === 'function' ? 
                this.wasmModule.get_enemy_state(wasmIndex) : 0;
            const wasmEnemyFacingX = typeof this.wasmModule.get_enemy_face_x === 'function' ? 
                this.wasmModule.get_enemy_face_x(wasmIndex) : 1;
            const wasmEnemyFacingY = typeof this.wasmModule.get_enemy_face_y === 'function' ? 
                this.wasmModule.get_enemy_face_y(wasmIndex) : 0;
            const wasmEnemyVX = typeof this.wasmModule.get_enemy_vx === 'function' ? 
                this.wasmModule.get_enemy_vx(wasmIndex) : 0;
            const wasmEnemyVY = typeof this.wasmModule.get_enemy_vy === 'function' ? 
                this.wasmModule.get_enemy_vy(wasmIndex) : 0;

            // Update wolf's JS-side state based on WASM state
            this.type = this.getWolfTypeFromWasm(wasmEnemyType);
            switch(wasmEnemyState) {
                case 1: this.state = 'running'; break; // seek
                case 2: this.state = 'prowling'; break; // circle
                case 3: this.state = 'attacking'; break; // harass
                case 4: this.state = 'hurt'; break; // recover
                default: this.state = 'idle'; break;
            }

            this.facing = (wasmEnemyFacingX >= 0) ? 1 : -1;
            this.velocity.x = wasmEnemyVX;
            this.velocity.y = wasmEnemyVY;

            this.animationSystem.applyAnimation(this, deltaTime);

            // WASM already handles physics (position integration, friction, etc.)
            // So we skip JS-side physics to avoid double application
            // Just sync position from WASM using the array index (not ID!)
            // wasmIndex already declared above
            const wasmEnemyX = typeof this.wasmModule.get_enemy_x === 'function' ? 
                this.wasmModule.get_enemy_x(wasmIndex) : this.position.x;
            const wasmEnemyY = typeof this.wasmModule.get_enemy_y === 'function' ? 
                this.wasmModule.get_enemy_y(wasmIndex) : this.position.y;

            this.position.x = wasmEnemyX;
            this.position.y = wasmEnemyY;

            // Reset acceleration for next frame
            this.acceleration.x = 0;
            this.acceleration.y = 0;

            // Early return - WASM handles all physics
            return;
        } catch (error) {
            console.warn('WASM function call failed in wolf update:', error);
            // Continue with fallback behavior
        }
    }

    // Fallback behavior: If WASM is not available, log error and return
    // Note: The early return at line 57 means this code only runs if WASM module
    // exists but the try block above failed
    console.error('Wolf update failed: WASM module present but calls failed');
}

export function updateLungeAttack(deltaTime, player) {
    const now = Date.now()

    // Check if we can start a new lunge
    if (!this.lungeState.active && 
        now - this.lungeState.lastLungeTime > this.lungeState.cooldown) {

        const distanceToPlayer = this.getDistanceTo(player)

        // Start charging if player is in range
        if (distanceToPlayer < this.detectionRange && 
            distanceToPlayer > this.attackRange) {

            if (!this.lungeState.charging) {
                this.startLungeCharge(player)
            } else {
                // Continue charging
                this.lungeState.chargeTime += deltaTime * 1000

                // Launch lunge when fully charged
                if (this.lungeState.chargeTime >= this.lungeState.maxChargeTime) {
                    this.executeLunge(player)
                }
            }
        } else if (this.lungeState.charging) {
            // Cancel charge if player moves out of range
            this.cancelLungeCharge()
        }
    }

    // Update active lunge
    if (this.lungeState.active) {
        this.lungeState.lungeProgress += deltaTime * 1000

        if (this.lungeState.lungeProgress >= this.lungeState.lungeDuration) {
            // End lunge
            this.endLunge()
        } else {
            // Continue lunge movement
            const progress = this.lungeState.lungeProgress / this.lungeState.lungeDuration
            const easeOut = 1 - (1 - progress)**3 // Cubic ease-out

            // Interpolate position
            if (this.lungeState.startPosition && this.lungeState.targetPosition) {
                this.position.x = this.lungeState.startPosition.x + 
                    (this.lungeState.targetPosition.x - this.lungeState.startPosition.x) * easeOut
                this.position.y = this.lungeState.startPosition.y + 
                    (this.lungeState.targetPosition.y - this.lungeState.startPosition.y) * easeOut
            }
        }
    }
}

export function startLungeCharge(target) {
    if (!target || !target.position) {
        return
    }

    this.lungeState.charging = true
    this.lungeState.chargeTime = 0
    this.state = 'prowling'

    // Face the target
    this.facing = target.position.x > this.position.x ? 1 : -1
}

export function executeLunge(target) {
    if (!target || !target.position) {
        return
    }

    this.lungeState.active = true
    this.lungeState.charging = false
    this.lungeState.lungeProgress = 0
    this.lungeState.lastLungeTime = Date.now()

    // Store start and target positions
    this.lungeState.startPosition = { ...this.position }

    // Calculate lunge target (slightly past the player for overshoot effect)
    const dx = target.position.x - this.position.x
    const dy = target.position.y - this.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    // Prevent division by zero if wolf and target are at same position
    if (distance === 0) {
        console.warn('Wolf executeLunge: target at same position, canceling lunge');
        return;
    }
    
    const normalizedDx = dx / distance
    const normalizedDy = dy / distance

    this.lungeState.targetPosition = {
        x: this.position.x + normalizedDx * Math.min(distance + 50, this.lungeState.lungeDistance),
        y: this.position.y + normalizedDy * Math.min(distance + 50, this.lungeState.lungeDistance)
    }

    this.state = 'lunging'
    this.facing = normalizedDx > 0 ? 1 : -1
}

export function cancelLungeCharge() {
    this.lungeState.charging = false
    this.lungeState.chargeTime = 0
    this.state = 'idle'
}

export function endLunge() {
    this.lungeState.active = false
    this.lungeState.lungeProgress = 0
    this.lungeState.startPosition = null
    this.lungeState.targetPosition = null
    this.state = 'idle'

    // Add a small recovery pause
    this.velocity.x = 0
    this.velocity.y = 0
}

export function getDistanceTo(target) {
    if (!target || !target.position) { return Infinity; }
    const dx = this.position.x - target.position.x
    const dy = this.position.y - target.position.y
    return Math.sqrt(dx * dx + dy * dy)
}

export function setState(newState) {
    if (this.state !== newState) {
        this.state = newState
        this.animationFrame = 0
        this.animationTime = 0
    }
}

export function moveTowards(target, speed = null) {
    if (!target) {
        return
    }

    // Handle both target.position and direct target coordinates
    const targetX = target.position ? target.position.x : target.x
    const targetY = target.position ? target.position.y : target.y

    if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
        return
    }

    const dx = targetX - this.position.x
    const dy = targetY - this.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Prevent division by zero
    if (distance > 0.001) {
        const moveSpeed = speed || this.speed
        this.velocity.x = (dx / distance) * moveSpeed
        this.velocity.y = (dy / distance) * moveSpeed
        this.facing = dx > 0 ? 1 : -1

        if (distance > this.attackRange) {
            this.setState('running')
        }
    }
}

export function attack(target) {
    const distance = this.getDistanceTo(target)

    if (distance <= this.attackRange) {
        this.setState('attacking')
        // Deal damage logic would go here
        return true
    }
    return false
}

export function takeDamage(amount) {
    this.health -= amount
    this.setState('hurt')

    // Knockback effect
    this.velocity.x = -this.facing * 100
    this.velocity.y = -50

    if (this.health <= 0) {
        this.health = 0
        this.setState('death')
    }
}

export function howl() {
    const now = Date.now()
    if (now - this.lastHowlTime > 10000) { // 10 second cooldown
        this.setState('howling')
        this.lastHowlTime = now
        this.velocity.x = 0
        this.velocity.y = 0

        // Return howl data for pack coordination
        return {
            position: { ...this.position },
            type: this.type,
            isAlpha: this.isAlpha,
            packId: this.packId,
            effect: this.isAlpha ? 'rally' : 'call'
        }
    }
    return null
}

export function updatePackFormation(leaderPosition, formationIndex, totalPack) {
    if (this.state !== 'packRun') {
        this.setState('packRun')
    }

    // Calculate formation offset based on index
    const angle = (formationIndex / totalPack) * Math.PI * 2
    const radius = 100 + (formationIndex % 2) * 50 // Stagger formation

    this.packFormationOffset.x = Math.cos(angle) * radius
    this.packFormationOffset.y = Math.sin(angle) * radius * 0.5 // Elliptical formation
    this.packFormationAngle = angle

    // Move towards formation position
    const targetX = leaderPosition.x + this.packFormationOffset.x
    const targetY = leaderPosition.y + this.packFormationOffset.y

    this.moveTowards({ x: targetX, y: targetY }, this.speed * 1.2)
}
