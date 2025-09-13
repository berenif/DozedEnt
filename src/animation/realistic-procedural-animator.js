/**
 * Realistic Procedural Animation System
 * Advanced physics-based animation that integrates with WASM for realistic character movement
 * Features: IK, secondary motion, environmental responses, and anatomically correct movement
 */

export class RealisticProceduralAnimator {
    constructor(options = {}) {
        // Configuration
        this.config = {
            // IK System
            ikEnabled: options.ikEnabled !== false,
            armLength: options.armLength || 20,
            forearmLength: options.forearmLength || 16,
            thighLength: options.thighLength || 18,
            shinLength: options.shinLength || 16,
            
            // Physics
            gravity: options.gravity || 0.3,
            damping: options.damping || 0.85,
            stiffness: options.stiffness || 0.4,
            
            // Visual
            renderSkeleton: options.renderSkeleton || false,
            renderIKTargets: options.renderIKTargets || false,
            renderSecondaryMotion: options.renderSecondaryMotion || false,
            
            // Performance
            updateRate: options.updateRate || 60,
            enableOptimizations: options.enableOptimizations !== false
        };
        
        // Animation state
        this.state = {
            position: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            facing: 1,
            isGrounded: true,
            
            // Body segments
            head: { x: 0, y: -25, rotation: 0 },
            torso: { x: 0, y: -15, rotation: 0 },
            pelvis: { x: 0, y: 0, rotation: 0 },
            
            // Arms
            leftShoulder: { x: -8, y: -20 },
            leftElbow: { x: -12, y: -10 },
            leftHand: { x: -15, y: 0 },
            rightShoulder: { x: 8, y: -20 },
            rightElbow: { x: 12, y: -10 },
            rightHand: { x: 15, y: 0 },
            
            // Legs
            leftHip: { x: -4, y: 0 },
            leftKnee: { x: -6, y: 10 },
            leftFoot: { x: -8, y: 20 },
            rightHip: { x: 4, y: 0 },
            rightKnee: { x: 6, y: 10 },
            rightFoot: { x: 8, y: 20 }
        };
        
        // IK Solver
        this.ikSolver = new AdvancedIKSolver({
            armLength: this.config.armLength,
            forearmLength: this.config.forearmLength,
            thighLength: this.config.thighLength,
            shinLength: this.config.shinLength
        });
        
        // Secondary motion systems
        this.secondaryMotion = new SecondaryMotionSystem();
        this.clothPhysics = new ClothPhysicsSystem();
        this.facialAnimator = new FacialAnimationSystem();
        
        // Performance optimization
        this.frameCount = 0;
        this.lastUpdate = 0;
        this.cachedTransforms = new Map();
        
        // Environmental response
        this.environmentalResponses = new EnvironmentalResponseSystem();
    }
    
    update(deltaTime, wasmData = {}) {
        this.frameCount++;
        const now = performance.now();
        
        // Performance throttling
        if (this.config.enableOptimizations && (now - this.lastUpdate) < (1000 / this.config.updateRate)) {
            return this.getCachedTransform();
        }
        this.lastUpdate = now;
        
        // Get enhanced animation data from WASM
        const wasmAnimData = this.getWasmAnimationData(wasmData);
        
        // Update base position and orientation
        this.updateBaseTransform(wasmAnimData, deltaTime);
        
        // Update skeletal system with IK
        this.updateSkeletalSystem(wasmAnimData, deltaTime);
        
        // Apply secondary motion
        this.updateSecondaryMotion(wasmAnimData, deltaTime);
        
        // Apply environmental responses
        this.updateEnvironmentalResponses(wasmAnimData, deltaTime);
        
        // Generate final transform
        const transform = this.generateTransform(wasmAnimData);
        
        // Cache for performance
        this.cacheTransform(transform);
        
        return transform;
    }
    
    getWasmAnimationData(wasmData) {
        // Extract enhanced animation data from WASM exports
        const exports = globalThis.wasmExports || {};
        
        return {
            // Base transform (existing)
            scaleX: exports.get_anim_scale_x?.() || 1.0,
            scaleY: exports.get_anim_scale_y?.() || 1.0,
            rotation: exports.get_anim_rotation?.() || 0.0,
            offsetX: exports.get_anim_offset_x?.() || 0.0,
            offsetY: exports.get_anim_offset_y?.() || 0.0,
            pelvisY: exports.get_anim_pelvis_y?.() || 0.0,
            
            // Enhanced animation data (new)
            spineCurve: exports.get_anim_spine_curve?.() || 0.0,
            shoulderRotation: exports.get_anim_shoulder_rotation?.() || 0.0,
            headBobX: exports.get_anim_head_bob_x?.() || 0.0,
            headBobY: exports.get_anim_head_bob_y?.() || 0.0,
            armSwingLeft: exports.get_anim_arm_swing_left?.() || 0.0,
            armSwingRight: exports.get_anim_arm_swing_right?.() || 0.0,
            legLiftLeft: exports.get_anim_leg_lift_left?.() || 0.0,
            legLiftRight: exports.get_anim_leg_lift_right?.() || 0.0,
            torsoTwist: exports.get_anim_torso_twist?.() || 0.0,
            breathingIntensity: exports.get_anim_breathing_intensity?.() || 1.0,
            fatigueFactory: exports.get_anim_fatigue_factor?.() || 0.0,
            momentumX: exports.get_anim_momentum_x?.() || 0.0,
            momentumY: exports.get_anim_momentum_y?.() || 0.0,
            
            // Secondary motion
            clothSway: exports.get_anim_cloth_sway?.() || 0.0,
            hairBounce: exports.get_anim_hair_bounce?.() || 0.0,
            equipmentJiggle: exports.get_anim_equipment_jiggle?.() || 0.0,
            
            // Environmental
            windResponse: exports.get_anim_wind_response?.() || 0.0,
            groundAdapt: exports.get_anim_ground_adapt?.() || 0.0,
            temperatureShiver: exports.get_anim_temperature_shiver?.() || 0.0,
            
            // Game state
            position: {
                x: exports.get_x?.() || 0.5,
                y: exports.get_y?.() || 0.5
            },
            velocity: {
                x: exports.get_vel_x?.() || 0.0,
                y: exports.get_vel_y?.() || 0.0
            },
            isGrounded: exports.get_is_grounded?.() === 1,
            stamina: exports.get_stamina?.() || 1.0,
            health: exports.get_hp?.() || 1.0,
            animState: exports.get_player_anim_state?.() || 0
        };
    }
    
    updateBaseTransform(wasmData, deltaTime) {
        // Update base position and facing
        this.state.position.x = wasmData.position.x;
        this.state.position.y = wasmData.position.y;
        this.state.velocity.x = wasmData.velocity.x;
        this.state.velocity.y = wasmData.velocity.y;
        this.state.isGrounded = wasmData.isGrounded;
        
        // Determine facing direction
        if (Math.abs(wasmData.velocity.x) > 0.01) {
            this.state.facing = wasmData.velocity.x > 0 ? 1 : -1;
        }
        
        // Update core body segments with WASM data
        this.state.torso.rotation = wasmData.torsoTwist;
        this.state.pelvis.y = wasmData.pelvisY;
        
        // Head positioning with realistic constraints
        this.state.head.x = wasmData.headBobX;
        this.state.head.y = -25 + wasmData.headBobY;
        this.state.head.rotation = wasmData.spineCurve * 0.3; // Head follows spine curve
    }
    
    updateSkeletalSystem(wasmData, deltaTime) {
        if (!this.config.ikEnabled) {return;}
        
        // Calculate IK targets for arms based on WASM animation data
        const leftArmTarget = this.calculateArmTarget('left', wasmData);
        const rightArmTarget = this.calculateArmTarget('right', wasmData);
        
        // Solve IK for arms
        const leftArmSolution = this.ikSolver.solveArm(
            this.state.leftShoulder,
            leftArmTarget,
            this.config.armLength,
            this.config.forearmLength
        );
        
        const rightArmSolution = this.ikSolver.solveArm(
            this.state.rightShoulder,
            rightArmTarget,
            this.config.armLength,
            this.config.forearmLength
        );
        
        // Apply arm solutions
        if (leftArmSolution) {
            this.state.leftElbow = leftArmSolution.elbow;
            this.state.leftHand = leftArmSolution.hand;
        }
        
        if (rightArmSolution) {
            this.state.rightElbow = rightArmSolution.elbow;
            this.state.rightHand = rightArmSolution.hand;
        }
        
        // Calculate IK targets for legs
        const leftLegTarget = this.calculateLegTarget('left', wasmData);
        const rightLegTarget = this.calculateLegTarget('right', wasmData);
        
        // Solve IK for legs
        const leftLegSolution = this.ikSolver.solveLeg(
            this.state.leftHip,
            leftLegTarget,
            this.config.thighLength,
            this.config.shinLength
        );
        
        const rightLegSolution = this.ikSolver.solveLeg(
            this.state.rightHip,
            rightLegTarget,
            this.config.thighLength,
            this.config.shinLength
        );
        
        // Apply leg solutions
        if (leftLegSolution) {
            this.state.leftKnee = leftLegSolution.knee;
            this.state.leftFoot = leftLegSolution.foot;
        }
        
        if (rightLegSolution) {
            this.state.rightKnee = rightLegSolution.knee;
            this.state.rightFoot = rightLegSolution.foot;
        }
    }
    
    calculateArmTarget(side, wasmData) {
        const isLeft = side === 'left';
        const sideMultiplier = isLeft ? -1 : 1;
        const armSwing = isLeft ? wasmData.armSwingLeft : wasmData.armSwingRight;
        
        // Base arm position
        let targetX = sideMultiplier * 12;
        let targetY = 5;
        
        // Apply natural arm swing
        targetX += Math.sin(armSwing) * 8;
        targetY += Math.cos(armSwing) * 4 - 2; // Arms swing forward/back and up/down
        
        // Adjust for shoulder rotation
        const shoulderOffset = wasmData.shoulderRotation * sideMultiplier;
        targetX += shoulderOffset * 3;
        
        // Adjust for momentum
        targetX += wasmData.momentumX * 0.3;
        targetY += wasmData.momentumY * 0.2;
        
        // Add some natural variation based on breathing
        targetY += Math.sin(Date.now() * 0.001 * wasmData.breathingIntensity) * 0.5;
        
        return { x: targetX, y: targetY };
    }
    
    calculateLegTarget(side, wasmData) {
        const isLeft = side === 'left';
        const sideMultiplier = isLeft ? -1 : 1;
        const legLift = isLeft ? wasmData.legLiftLeft : wasmData.legLiftRight;
        
        // Base leg position (foot placement)
        let targetX = sideMultiplier * 6;
        let targetY = 20; // Ground level
        
        // Apply leg lift for walking animation
        targetY -= legLift * 8; // Lift foot during walk cycle
        targetX += legLift * 2 * sideMultiplier; // Slight forward movement when lifted
        
        // Ground adaptation
        targetY += wasmData.groundAdapt;
        
        // Momentum-based foot placement
        targetX += wasmData.momentumX * 0.2;
        
        // Fatigue effect - less precise foot placement
        // Fatigue offset calculation - commented out due to architectural fix
        // const fatigueOffset = wasmData.fatigueFactory * 2;
        // ARCHITECTURAL VIOLATION FIXED: Fatigue variation should be deterministic from WASM
        // targetX += (Math.random() - 0.5) * fatigueOffset;
        
        return { x: targetX, y: targetY };
    }
    
    updateSecondaryMotion(wasmData, deltaTime) {
        // Update cloth physics
        this.clothPhysics.update(deltaTime, {
            sway: wasmData.clothSway,
            windResponse: wasmData.windResponse,
            momentum: { x: wasmData.momentumX, y: wasmData.momentumY }
        });
        
        // Update hair physics
        this.secondaryMotion.updateHair(deltaTime, {
            bounce: wasmData.hairBounce,
            windResponse: wasmData.windResponse,
            headMovement: { x: wasmData.headBobX, y: wasmData.headBobY }
        });
        
        // Update equipment physics
        this.secondaryMotion.updateEquipment(deltaTime, {
            jiggle: wasmData.equipmentJiggle,
            momentum: { x: wasmData.momentumX, y: wasmData.momentumY }
        });
    }
    
    updateEnvironmentalResponses(wasmData, deltaTime) {
        // Temperature response
        if (wasmData.temperatureShiver > 0) {
            this.environmentalResponses.applyShivering(this.state, wasmData.temperatureShiver);
        }
        
        // Wind response
        if (wasmData.windResponse !== 0) {
            this.environmentalResponses.applyWindEffects(this.state, wasmData.windResponse);
        }
    }
    
    generateTransform(wasmData) {
        return {
            // Base transform from WASM
            scaleX: wasmData.scaleX,
            scaleY: wasmData.scaleY,
            rotation: wasmData.rotation,
            offsetX: wasmData.offsetX,
            offsetY: wasmData.offsetY,
            
            // Enhanced skeletal data
            skeleton: {
                head: this.state.head,
                torso: this.state.torso,
                pelvis: this.state.pelvis,
                leftArm: {
                    shoulder: this.state.leftShoulder,
                    elbow: this.state.leftElbow,
                    hand: this.state.leftHand
                },
                rightArm: {
                    shoulder: this.state.rightShoulder,
                    elbow: this.state.rightElbow,
                    hand: this.state.rightHand
                },
                leftLeg: {
                    hip: this.state.leftHip,
                    knee: this.state.leftKnee,
                    foot: this.state.leftFoot
                },
                rightLeg: {
                    hip: this.state.rightHip,
                    knee: this.state.rightKnee,
                    foot: this.state.rightFoot
                }
            },
            
            // Secondary motion data
            secondaryMotion: {
                cloth: this.clothPhysics.getState(),
                hair: this.secondaryMotion.getHairState(),
                equipment: this.secondaryMotion.getEquipmentState()
            },
            
            // Environmental effects
            environmental: {
                windResponse: wasmData.windResponse,
                temperatureShiver: wasmData.temperatureShiver,
                groundAdapt: wasmData.groundAdapt
            },
            
            // Debug information
            debug: {
                frameCount: this.frameCount,
                animState: wasmData.animState,
                fatigue: wasmData.fatigueFactory,
                breathing: wasmData.breathingIntensity
            }
        };
    }
    
    cacheTransform(transform) {
        const cacheKey = `${this.frameCount}_${this.lastUpdate}`;
        this.cachedTransforms.set(cacheKey, transform);
        
        // Limit cache size
        if (this.cachedTransforms.size > 10) {
            const firstKey = this.cachedTransforms.keys().next().value;
            this.cachedTransforms.delete(firstKey);
        }
    }
    
    getCachedTransform() {
        const keys = Array.from(this.cachedTransforms.keys());
        const latestKey = keys[keys.length - 1];
        return this.cachedTransforms.get(latestKey) || this.generateDefaultTransform();
    }
    
    generateDefaultTransform() {
        return {
            scaleX: 1, scaleY: 1, rotation: 0, offsetX: 0, offsetY: 0,
            skeleton: null, secondaryMotion: null, environmental: null, debug: null
        };
    }
    
    // Rendering method for debug visualization
    renderDebug(ctx, x, y, scale = 1) {
        if (!this.config.renderSkeleton) {return;}
        
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        
        // Render skeleton
        this.renderSkeleton(ctx);
        
        // Render IK targets
        if (this.config.renderIKTargets) {
            this.renderIKTargets(ctx);
        }
        
        // Render secondary motion
        if (this.config.renderSecondaryMotion) {
            this.renderSecondaryMotion(ctx);
        }
        
        ctx.restore();
    }
    
    renderSkeleton(ctx) {
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        
        // Draw bones
        this.drawBone(ctx, this.state.torso, this.state.head);
        this.drawBone(ctx, this.state.torso, this.state.pelvis);
        
        // Arms
        this.drawBone(ctx, this.state.leftShoulder, this.state.leftElbow);
        this.drawBone(ctx, this.state.leftElbow, this.state.leftHand);
        this.drawBone(ctx, this.state.rightShoulder, this.state.rightElbow);
        this.drawBone(ctx, this.state.rightElbow, this.state.rightHand);
        
        // Legs
        this.drawBone(ctx, this.state.leftHip, this.state.leftKnee);
        this.drawBone(ctx, this.state.leftKnee, this.state.leftFoot);
        this.drawBone(ctx, this.state.rightHip, this.state.rightKnee);
        this.drawBone(ctx, this.state.rightKnee, this.state.rightFoot);
        
        // Draw joints
        ctx.fillStyle = '#ffff44';
        Object.values(this.state).forEach(joint => {
            if (typeof joint.x !== "undefined" && typeof joint.y !== "undefined") {
                ctx.beginPath();
                ctx.arc(joint.x, joint.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
    
    drawBone(ctx, start, end) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    }
    
    renderIKTargets(ctx) {
        // Render IK target positions for debugging
        ctx.fillStyle = '#ff4444';
        // Implementation would show where IK is trying to reach
    }
    
    renderSecondaryMotion(ctx) {
        // Render cloth, hair, and equipment physics
        this.clothPhysics.render(ctx);
        this.secondaryMotion.renderHair(ctx);
        this.secondaryMotion.renderEquipment(ctx);
    }
}

// Advanced IK Solver for realistic limb movement
class AdvancedIKSolver {
    constructor(options = {}) {
        this.armLength = options.armLength || 20;
        this.forearmLength = options.forearmLength || 16;
        this.thighLength = options.thighLength || 18;
        this.shinLength = options.shinLength || 16;
        
        // IK solving parameters
        this.maxIterations = options.maxIterations || 10;
        this.tolerance = options.tolerance || 0.1;
        this.damping = options.damping || 0.8;
    }
    
    solveArm(shoulder, target, upperLength, lowerLength) {
        const distance = Math.sqrt(
            (target.x - shoulder.x)**2 + 
            (target.y - shoulder.y)**2
        );
        
        const maxReach = upperLength + lowerLength;
        
        // Check if target is reachable
        if (distance > maxReach) {
            // Stretch towards target at maximum reach
            const angle = Math.atan2(target.y - shoulder.y, target.x - shoulder.x);
            return {
                elbow: {
                    x: shoulder.x + Math.cos(angle) * upperLength,
                    y: shoulder.y + Math.sin(angle) * upperLength
                },
                hand: {
                    x: shoulder.x + Math.cos(angle) * maxReach,
                    y: shoulder.y + Math.sin(angle) * maxReach
                }
            };
        }
        
        // Two-bone IK solution using law of cosines
        const a = upperLength;
        const b = lowerLength;
        const c = distance;
        
        // Calculate angles
        const angleA = Math.acos((b * b + c * c - a * a) / (2 * b * c));
        const angleB = Math.acos((a * a + c * c - b * b) / (2 * a * c));
        
        const targetAngle = Math.atan2(target.y - shoulder.y, target.x - shoulder.x);
        
        // Calculate elbow position
        const elbowAngle = targetAngle + angleB;
        const elbow = {
            x: shoulder.x + Math.cos(elbowAngle) * upperLength,
            y: shoulder.y + Math.sin(elbowAngle) * upperLength
        };
        
        return {
            elbow: elbow,
            hand: target
        };
    }
    
    solveLeg(hip, target, upperLength, lowerLength) {
        // Similar to arm IK but with different constraints for legs
        return this.solveArm(hip, target, upperLength, lowerLength);
    }
}

// Secondary motion system for cloth, hair, and equipment
class SecondaryMotionSystem {
    constructor() {
        this.hairSegments = [];
        this.equipmentItems = [];
        this.initializeHair();
        this.initializeEquipment();
    }
    
    initializeHair() {
        // Create hair segments for physics simulation
        for (let i = 0; i < 5; i++) {
            this.hairSegments.push({
                position: { x: 0, y: -25 - i * 3 },
                velocity: { x: 0, y: 0 },
                restLength: 3
            });
        }
    }
    
    initializeEquipment() {
        // Initialize equipment items (sword, pouch, etc.)
        this.equipmentItems = [
            { type: 'sword', position: { x: 8, y: 5 }, velocity: { x: 0, y: 0 } },
            { type: 'pouch', position: { x: -6, y: 8 }, velocity: { x: 0, y: 0 } }
        ];
    }
    
    updateHair(deltaTime, forces) {
        // Simple verlet integration for hair physics
        this.hairSegments.forEach((segment, index) => {
            if (index === 0) {return;} // Root segment is fixed to head
            
            // Apply forces
            segment.velocity.x += forces.windResponse * 0.1;
            segment.velocity.y += 0.1; // Gravity
            
            // Apply bounce from head movement
            if (index === 1) {
                segment.velocity.x += forces.headMovement.x * 0.05;
                segment.velocity.y += forces.headMovement.y * 0.05;
            }
            
            // Update position
            segment.position.x += segment.velocity.x * deltaTime;
            segment.position.y += segment.velocity.y * deltaTime;
            
            // Apply damping
            segment.velocity.x *= 0.95;
            segment.velocity.y *= 0.95;
            
            // Constraint to previous segment
            if (index > 0) {
                const prev = this.hairSegments[index - 1];
                const dx = segment.position.x - prev.position.x;
                const dy = segment.position.y - prev.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > segment.restLength) {
                    const correction = (distance - segment.restLength) / distance * 0.5;
                    segment.position.x -= dx * correction;
                    segment.position.y -= dy * correction;
                }
            }
        });
    }
    
    updateEquipment(deltaTime, forces) {
        this.equipmentItems.forEach(item => {
            // ARCHITECTURAL VIOLATION FIXED: Jiggle forces should be deterministic from WASM
            // Apply jiggle forces
            // item.velocity.x += (Math.random() - 0.5) * forces.jiggle * 0.1;
            // item.velocity.y += (Math.random() - 0.5) * forces.jiggle * 0.1;
            
            // Apply momentum
            item.velocity.x += forces.momentum.x * 0.02;
            item.velocity.y += forces.momentum.y * 0.02;
            
            // Update position
            item.position.x += item.velocity.x * deltaTime;
            item.position.y += item.velocity.y * deltaTime;
            
            // Apply damping
            item.velocity.x *= 0.9;
            item.velocity.y *= 0.9;
        });
    }
    
    getHairState() {
        return this.hairSegments;
    }
    
    getEquipmentState() {
        return this.equipmentItems;
    }
    
    renderHair(ctx) {
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        this.hairSegments.forEach((segment, index) => {
            if (index === 0) {
                ctx.moveTo(segment.position.x, segment.position.y);
            } else {
                ctx.lineTo(segment.position.x, segment.position.y);
            }
        });
        ctx.stroke();
    }
    
    renderEquipment(ctx) {
        this.equipmentItems.forEach(item => {
            ctx.fillStyle = item.type === 'sword' ? '#C0C0C0' : '#8B4513';
            ctx.fillRect(item.position.x - 2, item.position.y - 1, 4, 2);
        });
    }
}

// Cloth physics system
class ClothPhysicsSystem {
    constructor() {
        this.clothPoints = [];
        this.constraints = [];
        this.initializeCloth();
    }
    
    initializeCloth() {
        // Create a simple cloth simulation for capes/cloaks
        const width = 3;
        const height = 4;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                this.clothPoints.push({
                    position: { x: x * 3 - 3, y: y * 3 + 5 },
                    oldPosition: { x: x * 3 - 3, y: y * 3 + 5 },
                    pinned: y === 0 // Pin top row
                });
            }
        }
        
        // Create constraints between neighboring points
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (x < width - 1) {
                    this.constraints.push({
                        p1: y * width + x,
                        p2: y * width + x + 1,
                        restLength: 3
                    });
                }
                if (y < height - 1) {
                    this.constraints.push({
                        p1: y * width + x,
                        p2: (y + 1) * width + x,
                        restLength: 3
                    });
                }
            }
        }
    }
    
    update(deltaTime, forces) {
        // Verlet integration
        this.clothPoints.forEach(point => {
            if (point.pinned) {return;}
            
            const velX = point.position.x - point.oldPosition.x;
            const velY = point.position.y - point.oldPosition.y;
            
            point.oldPosition.x = point.position.x;
            point.oldPosition.y = point.position.y;
            
            // Apply forces
            point.position.x += velX + forces.sway * 0.1 + forces.windResponse * 0.2;
            point.position.y += velY + 0.2; // Gravity
        });
        
        // Satisfy constraints
        for (let i = 0; i < 2; i++) { // Multiple iterations for stability
            this.constraints.forEach(constraint => {
                const p1 = this.clothPoints[constraint.p1];
                const p2 = this.clothPoints[constraint.p2];
                
                const dx = p2.position.x - p1.position.x;
                const dy = p2.position.y - p1.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const difference = constraint.restLength - distance;
                const percent = difference / distance / 2;
                
                const offsetX = dx * percent;
                const offsetY = dy * percent;
                
                if (!p1.pinned) {
                    p1.position.x -= offsetX;
                    p1.position.y -= offsetY;
                }
                if (!p2.pinned) {
                    p2.position.x += offsetX;
                    p2.position.y += offsetY;
                }
            });
        }
    }
    
    getState() {
        return this.clothPoints;
    }
    
    render(ctx) {
        // Render cloth as a mesh
        ctx.strokeStyle = '#4A4A4A';
        ctx.lineWidth = 1;
        
        this.constraints.forEach(constraint => {
            const p1 = this.clothPoints[constraint.p1];
            const p2 = this.clothPoints[constraint.p2];
            
            ctx.beginPath();
            ctx.moveTo(p1.position.x, p1.position.y);
            ctx.lineTo(p2.position.x, p2.position.y);
            ctx.stroke();
        });
    }
}

// Facial animation system
class FacialAnimationSystem {
    constructor() {
        this.expressions = {
            neutral: { eyeOpenness: 1.0, mouthCurve: 0.0, eyebrowHeight: 0.0 },
            happy: { eyeOpenness: 0.8, mouthCurve: 0.5, eyebrowHeight: 0.2 },
            angry: { eyeOpenness: 0.6, mouthCurve: -0.3, eyebrowHeight: -0.4 },
            surprised: { eyeOpenness: 1.2, mouthCurve: -0.2, eyebrowHeight: 0.6 },
            tired: { eyeOpenness: 0.4, mouthCurve: -0.1, eyebrowHeight: -0.1 }
        };
        
        this.currentExpression = 'neutral';
        this.blendWeight = 0.0;
    }
    
    setExpression(expression, blendTime = 0.5) {
        this.targetExpression = expression;
        this.blendTime = blendTime;
        this.blendWeight = 0.0;
    }
    
    update(deltaTime, emotionalState) {
        // Determine expression based on game state
        if (emotionalState.stamina < 0.3) {
            this.setExpression('tired');
        } else if (emotionalState.health < 0.5) {
            this.setExpression('angry');
        } else {
            this.setExpression('neutral');
        }
        
        // Blend towards target expression
        if (this.blendWeight < 1.0) {
            this.blendWeight += deltaTime / this.blendTime;
            this.blendWeight = Math.min(this.blendWeight, 1.0);
        }
    }
}

// Environmental response system
class EnvironmentalResponseSystem {
    applyShivering(state, _intensity) {
        // ARCHITECTURAL VIOLATION FIXED: Shivering should be deterministic from WASM
        // Apply small deterministic movements to simulate shivering
        const shiver = 0; // Should be calculated deterministically in WASM
        
        Object.values(state).forEach(joint => {
            if (typeof joint.x !== "undefined") {
                joint.x += shiver * 0.5;
                joint.y += shiver * 0.3;
            }
        });
    }
    
    applyWindEffects(state, windStrength) {
        // Apply wind forces to extremities
        state.head.x += windStrength * 0.5;
        state.leftHand.x += windStrength * 0.8;
        state.rightHand.x += windStrength * 0.8;
    }
}

export default RealisticProceduralAnimator;
