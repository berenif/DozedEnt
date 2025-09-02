(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('./animation-system.js'), require('./particle-system.js')) :
    typeof define === 'function' && define.amd ? define(['exports', './animation-system', './particle-system'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.WolfAnimationSystem = {}, null, global.particleSystem_js));
})(this, (function (exports, animationSystem_js, particleSystem_js) { 'use strict';

    // Enhanced Wolf Animation System
    // Provides advanced animations, procedural movements, and visual effects for wolves


    class WolfAnimationSystem {
        constructor() {
            // Animation definitions for different wolf states
            this.animations = new Map();
            this.proceduralAnimations = new Map();
            this.particleEffects = new Map();
            
            this.initializeAnimations();
            this.initializeProceduralAnimations();
            this.initializeParticleEffects();
        }
        
        initializeAnimations() {
            // Idle animation - subtle breathing and ear twitches
            this.animations.set('idle', {
                breathing: {
                    amplitude: 2,
                    frequency: 0.002,
                    offset: 0
                },
                earTwitch: {
                    probability: 0.001,
                    duration: 300,
                    maxRotation: 0.2
                },
                tailSway: {
                    amplitude: 0.1,
                    frequency: 0.003
                },
                blinking: {
                    probability: 0.002,
                    duration: 150
                }
            });
            
            // Walking animation
            this.animations.set('walking', {
                legCycle: {
                    frequency: 0.008,
                    amplitude: 8,
                    phaseOffset: Math.PI
                },
                bodyBob: {
                    amplitude: 2,
                    frequency: 0.016
                },
                headBob: {
                    amplitude: 1.5,
                    frequency: 0.008
                },
                tailSway: {
                    amplitude: 0.2,
                    frequency: 0.008
                }
            });
            
            // Running animation
            this.animations.set('running', {
                legCycle: {
                    frequency: 0.015,
                    amplitude: 12,
                    phaseOffset: Math.PI,
                    stretchFactor: 1.2
                },
                bodyBob: {
                    amplitude: 4,
                    frequency: 0.03
                },
                headBob: {
                    amplitude: 3,
                    frequency: 0.015
                },
                tailStream: {
                    amplitude: 0.4,
                    frequency: 0.02,
                    streamEffect: true
                },
                earsPinned: true
            });
            
            // Prowling animation (stalking)
            this.animations.set('prowling', {
                legCycle: {
                    frequency: 0.004,
                    amplitude: 5,
                    phaseOffset: Math.PI,
                    careful: true // Careful foot placement
                },
                bodyLowered: {
                    lowerAmount: 10,
                    sway: 1
                },
                headLowered: {
                    lowerAmount: 5,
                    scanning: true,
                    scanSpeed: 0.002
                },
                tailStill: {
                    tipTwitch: 0.01,
                    frequency: 0.005
                },
                earsForward: {
                    rotation: -0.3,
                    alertness: 1.0
                }
            });
            
            // Lunging animation
            this.animations.set('lunging', {
                bodyStretch: {
                    stretchFactor: 1.3,
                    compressionStart: 0.8, // Compress before launch
                    extensionPeak: 1.5
                },
                legsExtended: {
                    frontExtension: 20,
                    rearExtension: 15,
                    clawsOut: true
                },
                mouthOpen: {
                    openAmount: 0.8,
                    teethVisible: true
                },
                earsBack: {
                    rotation: 0.5
                },
                furRipple: {
                    intensity: 0.3,
                    speed: 0.02
                }
            });
            
            // Attacking animation
            this.animations.set('attacking', {
                biteSequence: [
                    { jaw: 0, duration: 100 },
                    { jaw: 0.9, duration: 50 },
                    { jaw: 0.7, duration: 100 },
                    { jaw: 0, duration: 150 }
                ],
                headShake: {
                    amplitude: 5,
                    frequency: 0.05
                },
                clawSwipe: {
                    swipeSpeed: 0.03,
                    swipeArc: Math.PI / 3
                },
                bodyTense: {
                    tensionLevel: 0.8
                }
            });
            
            // Howling animation
            this.animations.set('howling', {
                headTilt: {
                    startAngle: 0,
                    endAngle: -Math.PI / 4,
                    duration: 1000
                },
                mouthOpen: {
                    openAmount: 0.6,
                    vibration: 0.02
                },
                chestExpansion: {
                    expansionAmount: 1.2,
                    frequency: 0.003
                },
                tailRaised: {
                    angle: 0.3
                },
                soundWaves: {
                    frequency: 0.01,
                    amplitude: 2,
                    visible: true
                }
            });
            
            // Hurt animation
            this.animations.set('hurt', {
                flinch: {
                    intensity: 10,
                    duration: 200,
                    direction: 'away'
                },
                earsFlat: {
                    rotation: 0.6
                },
                tailTucked: {
                    tuckAmount: 0.8
                },
                whimper: {
                    mouthOpen: 0.2,
                    duration: 300
                },
                bodyShake: {
                    amplitude: 3,
                    frequency: 0.1,
                    dampening: 0.9
                }
            });
            
            // Death animation
            this.animations.set('death', {
                collapse: {
                    stages: [
                        { legs: 'buckle', duration: 300 },
                        { body: 'fall', duration: 400 },
                        { final: 'limp', duration: 500 }
                    ]
                },
                fadeOut: {
                    startDelay: 1000,
                    duration: 2000
                }
            });
        }
        
        initializeProceduralAnimations() {
            // Procedural leg movement system
            this.proceduralAnimations.set('legIK', {
                calculateLegPosition: (wolf, legIndex, time) => {
                    const anim = this.animations.get(wolf.state);
                    if (!anim || !anim.legCycle) return { x: 0, y: 0 }
                    
                    const cycle = anim.legCycle;
                    const phase = legIndex % 2 === 0 ? 0 : cycle.phaseOffset;
                    const t = time * cycle.frequency + phase;
                    
                    // Create realistic leg movement pattern
                    const x = Math.sin(t) * cycle.amplitude * 0.5;
                    const y = Math.max(0, Math.sin(t * 2)) * cycle.amplitude;
                    
                    // Add careful foot placement for prowling
                    if (cycle.careful) {
                        return {
                            x: x * 0.5,
                            y: y * 0.7,
                            placement: 'careful'
                        }
                    }
                    
                    return { x, y }
                }
            });
            
            // Procedural tail physics
            this.proceduralAnimations.set('tailPhysics', {
                segments: 5,
                calculateTailCurve: (wolf, time) => {
                    const anim = this.animations.get(wolf.state);
                    const segments = [];
                    
                    for (let i = 0; i < 5; i++) {
                        const delay = i * 0.1;
                        let angle = 0;
                        
                        if (anim?.tailSway) {
                            angle = Math.sin(time * anim.tailSway.frequency - delay) * 
                                   anim.tailSway.amplitude * (1 - i * 0.15);
                        } else if (anim?.tailStream) {
                            // Streaming effect for running
                            angle = Math.sin(time * anim.tailStream.frequency - delay) * 
                                   anim.tailStream.amplitude * (1 + i * 0.1);
                        } else if (anim?.tailTucked) {
                            angle = anim.tailTucked.tuckAmount * (1 + i * 0.2);
                        }
                        
                        segments.push({
                            angle,
                            length: 8 - i * 0.5
                        });
                    }
                    
                    return segments
                }
            });
            
            // Procedural fur animation
            this.proceduralAnimations.set('furDynamics', {
                calculateFurMovement: (wolf, time, windStrength = 0) => {
                    const speed = Math.sqrt(wolf.velocity.x ** 2 + wolf.velocity.y ** 2);
                    const windEffect = Math.sin(time * 0.005) * windStrength;
                    
                    return {
                        ripple: speed > 200 ? Math.sin(time * 0.02) * 0.2 : 0,
                        flow: windEffect + (speed / 1000),
                        ruffled: wolf.state === 'hurt' || wolf.state === 'attacking'
                    }
                }
            });
            
            // Procedural breathing
            this.proceduralAnimations.set('breathing', {
                calculateBreathing: (wolf, time) => {
                    const baseRate = 0.002;
                    const stateMultiplier = {
                        idle: 1,
                        walking: 1.2,
                        running: 2,
                        prowling: 0.8,
                        attacking: 1.5,
                        hurt: 1.8,
                        howling: 1.3
                    };
                    
                    const rate = baseRate * (stateMultiplier[wolf.state] || 1);
                    const depth = wolf.state === 'running' ? 4 : 2;
                    
                    return {
                        chestExpansion: Math.sin(time * rate) * depth,
                        bellyExpansion: Math.sin(time * rate - 0.2) * depth * 0.7
                    }
                }
            });
        }
        
        initializeParticleEffects() {
            // Dust particles for running
            this.particleEffects.set('runDust', {
                emitRate: 5,
                particleLife: 500,
                particleSpeed: { min: 20, max: 50 },
                particleSize: { min: 2, max: 5 },
                particleColor: 'rgba(139, 115, 85, 0.4)',
                emitAngle: { min: Math.PI * 0.4, max: Math.PI * 0.6 },
                gravity: 50
            });
            
            // Blood particles for attacks
            this.particleEffects.set('bloodSplatter', {
                emitRate: 20,
                particleLife: 800,
                particleSpeed: { min: 100, max: 200 },
                particleSize: { min: 1, max: 3 },
                particleColor: 'rgba(139, 0, 0, 0.7)',
                emitAngle: { min: 0, max: Math.PI * 2 },
                gravity: 200
            });
            
            // Saliva/foam for attacking
            this.particleEffects.set('attackFoam', {
                emitRate: 8,
                particleLife: 300,
                particleSpeed: { min: 50, max: 100 },
                particleSize: { min: 1, max: 2 },
                particleColor: 'rgba(255, 255, 255, 0.6)',
                emitAngle: { min: -Math.PI / 6, max: Math.PI / 6 },
                gravity: 100
            });
            
            // Sound waves for howling
            this.particleEffects.set('soundWaves', {
                emitRate: 2,
                particleLife: 1500,
                particleSpeed: { min: 100, max: 100 },
                particleSize: { min: 20, max: 40 },
                particleColor: 'rgba(255, 255, 255, 0.2)',
                emitAngle: { min: -Math.PI / 8, max: Math.PI / 8 },
                gravity: 0,
                expanding: true
            });
        }
        
        // Apply animation to wolf
        applyAnimation(wolf, deltaTime) {
            const time = wolf.animationTime;
            const state = wolf.state;
            const animation = this.animations.get(state);
            
            if (!animation) return
            
            // Apply procedural animations
            this.applyProceduralAnimations(wolf, time);
            
            // Apply state-specific animations
            switch (state) {
                case 'idle':
                    this.applyIdleAnimation(wolf, animation, time);
                    break
                case 'walking':
                case 'running':
                    this.applyLocomotionAnimation(wolf, animation, time);
                    break
                case 'prowling':
                    this.applyProwlingAnimation(wolf, animation, time);
                    break
                case 'lunging':
                    this.applyLungingAnimation(wolf, animation, time);
                    break
                case 'attacking':
                    this.applyAttackingAnimation(wolf, animation, time);
                    break
                case 'howling':
                    this.applyHowlingAnimation(wolf, animation, time);
                    break
                case 'hurt':
                    this.applyHurtAnimation(wolf, animation, time);
                    break
            }
            
            // Update particle effects
            this.updateParticleEffects(wolf, deltaTime);
        }
        
        applyProceduralAnimations(wolf, time) {
            // Apply breathing
            const breathing = this.proceduralAnimations.get('breathing');
            const breath = breathing.calculateBreathing(wolf, time);
            wolf.breathingOffset = breath.chestExpansion;
            wolf.bellyOffset = breath.bellyExpansion;
            
            // Apply fur dynamics
            const furDynamics = this.proceduralAnimations.get('furDynamics');
            wolf.furMovement = furDynamics.calculateFurMovement(wolf, time, 0.3);
            
            // Apply tail physics
            const tailPhysics = this.proceduralAnimations.get('tailPhysics');
            wolf.tailSegments = tailPhysics.calculateTailCurve(wolf, time);
        }
        
        applyIdleAnimation(wolf, animation, time) {
            // Ear twitching
            if (Math.random() < animation.earTwitch.probability) {
                wolf.earTwitchTime = time;
                wolf.earTwitchDuration = animation.earTwitch.duration;
            }
            
            if (wolf.earTwitchTime && time - wolf.earTwitchTime < wolf.earTwitchDuration) {
                const progress = (time - wolf.earTwitchTime) / wolf.earTwitchDuration;
                wolf.earRotation = Math.sin(progress * Math.PI) * animation.earTwitch.maxRotation;
            } else {
                wolf.earRotation = 0;
            }
            
            // Blinking
            if (Math.random() < animation.blinking.probability) {
                wolf.blinkTime = time;
                wolf.blinkDuration = animation.blinking.duration;
            }
            
            wolf.isBlinking = wolf.blinkTime && time - wolf.blinkTime < wolf.blinkDuration;
        }
        
        applyLocomotionAnimation(wolf, animation, time) {
            // Leg animation
            const legIK = this.proceduralAnimations.get('legIK');
            wolf.legPositions = [];
            
            for (let i = 0; i < 4; i++) {
                wolf.legPositions[i] = legIK.calculateLegPosition(wolf, i, time);
            }
            
            // Body bobbing
            wolf.bodyBob = Math.sin(time * animation.bodyBob.frequency) * animation.bodyBob.amplitude;
            wolf.headBob = Math.sin(time * animation.headBob.frequency) * animation.headBob.amplitude;
            
            // Ears pinned back when running fast
            if (animation.earsPinned) {
                wolf.earRotation = 0.4;
            }
        }
        
        applyProwlingAnimation(wolf, animation, time) {
            // Lower body position
            wolf.bodyLowered = animation.bodyLowered.lowerAmount;
            wolf.bodySway = Math.sin(time * 0.002) * animation.bodyLowered.sway;
            
            // Head scanning movement
            if (animation.headLowered.scanning) {
                wolf.headScan = Math.sin(time * animation.headLowered.scanSpeed) * 0.3;
            }
            
            // Alert ears
            wolf.earRotation = animation.earsForward.rotation;
            wolf.earAlertness = animation.earsForward.alertness;
            
            // Careful leg placement
            const legIK = this.proceduralAnimations.get('legIK');
            wolf.legPositions = [];
            for (let i = 0; i < 4; i++) {
                wolf.legPositions[i] = legIK.calculateLegPosition(wolf, i, time);
            }
        }
        
        applyLungingAnimation(wolf, animation, time) {
            const progress = wolf.lungeState.lungeProgress / wolf.lungeState.lungeDuration;
            
            // Body stretch effect
            let stretch = 1;
            if (progress < 0.2) {
                // Compression phase
                stretch = 1 - (progress / 0.2) * (1 - animation.bodyStretch.compressionStart);
            } else {
                // Extension phase
                const extProgress = (progress - 0.2) / 0.8;
                stretch = animation.bodyStretch.compressionStart + 
                         extProgress * (animation.bodyStretch.extensionPeak - animation.bodyStretch.compressionStart);
            }
            wolf.bodyStretch = stretch;
            
            // Legs extended
            wolf.frontLegExtension = animation.legsExtended.frontExtension * progress;
            wolf.rearLegExtension = animation.legsExtended.rearExtension * progress;
            wolf.clawsOut = animation.legsExtended.clawsOut;
            
            // Mouth open with teeth
            wolf.mouthOpen = animation.mouthOpen.openAmount;
            wolf.teethVisible = animation.mouthOpen.teethVisible;
            
            // Fur ripple effect
            wolf.furRipple = Math.sin(time * 0.02) * animation.furRipple.intensity;
        }
        
        applyAttackingAnimation(wolf, animation, time) {
            // Bite sequence
            if (!wolf.biteSequenceIndex) wolf.biteSequenceIndex = 0;
            if (!wolf.biteSequenceTime) wolf.biteSequenceTime = time;
            
            const currentBite = animation.biteSequence[wolf.biteSequenceIndex];
            const elapsed = time - wolf.biteSequenceTime;
            
            if (elapsed < currentBite.duration) {
                wolf.jawOpen = currentBite.jaw;
            } else {
                wolf.biteSequenceIndex = (wolf.biteSequenceIndex + 1) % animation.biteSequence.length;
                wolf.biteSequenceTime = time;
            }
            
            // Head shake
            wolf.headShake = Math.sin(time * animation.headShake.frequency) * animation.headShake.amplitude;
            
            // Body tension
            wolf.bodyTension = animation.bodyTense.tensionLevel;
        }
        
        applyHowlingAnimation(wolf, animation, time) {
            if (!wolf.howlStartTime) wolf.howlStartTime = time;
            
            const howlProgress = Math.min((time - wolf.howlStartTime) / animation.headTilt.duration, 1);
            
            // Head tilting back
            wolf.headTilt = animation.headTilt.startAngle + 
                           (animation.headTilt.endAngle - animation.headTilt.startAngle) * howlProgress;
            
            // Mouth vibration
            wolf.mouthOpen = animation.mouthOpen.openAmount;
            wolf.mouthVibration = Math.sin(time * 0.05) * animation.mouthOpen.vibration;
            
            // Chest expansion for breath
            wolf.chestExpansion = 1 + Math.sin(time * animation.chestExpansion.frequency) * 
                                 (animation.chestExpansion.expansionAmount - 1);
            
            // Sound wave effect
            if (animation.soundWaves.visible) {
                wolf.soundWavePhase = time * animation.soundWaves.frequency;
                wolf.soundWaveAmplitude = animation.soundWaves.amplitude;
            }
        }
        
        applyHurtAnimation(wolf, animation, time) {
            if (!wolf.hurtStartTime) wolf.hurtStartTime = time;
            
            const hurtElapsed = time - wolf.hurtStartTime;
            
            // Flinch effect
            if (hurtElapsed < animation.flinch.duration) {
                const flinchProgress = hurtElapsed / animation.flinch.duration;
                wolf.flinchOffset = animation.flinch.intensity * (1 - flinchProgress);
            }
            
            // Body shake with dampening
            const shakeFactor = Math.pow(animation.bodyShake.dampening, hurtElapsed / 100);
            wolf.bodyShake = Math.sin(time * animation.bodyShake.frequency) * 
                            animation.bodyShake.amplitude * shakeFactor;
            
            // Ears and tail position
            wolf.earRotation = animation.earsFlat.rotation;
            wolf.tailTucked = animation.tailTucked.tuckAmount;
        }
        
        updateParticleEffects(wolf, deltaTime) {
            if (!wolf.particleSystem) {
                wolf.particleSystem = new particleSystem_js.ParticleSystem();
            }
            
            // Emit dust when running
            if (wolf.state === 'running' && wolf.isGrounded) {
                const dustEffect = this.particleEffects.get('runDust');
                wolf.particleSystem.emit(
                    wolf.position.x - wolf.facing * 20,
                    wolf.position.y + wolf.height / 2,
                    dustEffect
                );
            }
            
            // Emit sound waves when howling
            if (wolf.state === 'howling') {
                const soundEffect = this.particleEffects.get('soundWaves');
                wolf.particleSystem.emit(
                    wolf.position.x + wolf.facing * 30,
                    wolf.position.y - wolf.height / 4,
                    soundEffect
                );
            }
            
            // Update all particles
            wolf.particleSystem.update(deltaTime);
        }
        
        // Enhanced rendering with all animation effects
        renderAnimatedWolf(ctx, wolf, camera) {
            ctx.save();
            
            // Calculate screen position
            const screenX = wolf.position.x - camera.x;
            const screenY = wolf.position.y - camera.y;
            
            // Apply transformations
            ctx.translate(screenX, screenY);
            
            // Apply body stretch for lunging
            const stretchX = wolf.bodyStretch || 1;
            const stretchY = 2 - stretchX; // Inverse stretch to maintain volume
            ctx.scale(wolf.size * wolf.facing * stretchX, wolf.size * stretchY);
            
            // Apply body shake for hurt animation
            if (wolf.bodyShake) {
                ctx.translate(wolf.bodyShake, 0);
            }
            
            // Apply flinch offset
            if (wolf.flinchOffset) {
                ctx.translate(-wolf.facing * wolf.flinchOffset, -wolf.flinchOffset * 0.5);
            }
            
            // Draw shadow with animation
            this.drawAnimatedShadow(ctx, wolf);
            
            // Draw animated body parts
            this.drawAnimatedTail(ctx, wolf);
            this.drawAnimatedLegs(ctx, wolf, 'hind');
            this.drawAnimatedBody(ctx, wolf);
            this.drawAnimatedLegs(ctx, wolf, 'front');
            this.drawAnimatedNeck(ctx, wolf);
            this.drawAnimatedHead(ctx, wolf);
            
            // Draw particle effects
            if (wolf.particleSystem) {
                wolf.particleSystem.render(ctx, camera);
            }
            
            // Draw UI elements
            this.drawWolfUI(ctx, wolf);
            
            ctx.restore();
        }
        
        drawAnimatedShadow(ctx, wolf) {
            const shadowScale = wolf.state === 'lunging' ? 1.3 : 1;
            const shadowAlpha = wolf.isGrounded ? 0.3 : 0.1;
            
            ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
            ctx.beginPath();
            ctx.ellipse(0, wolf.height / 2 + 5, wolf.width / 3 * shadowScale, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        drawAnimatedTail(ctx, wolf) {
            ctx.save();
            
            // Base tail position
            let baseTailX = -wolf.width * 0.35;
            let baseTailY = -wolf.height * 0.1;
            
            // Adjust for body lowered (prowling)
            if (wolf.bodyLowered) {
                baseTailY += wolf.bodyLowered * 0.5;
            }
            
            ctx.translate(baseTailX, baseTailY);
            
            // Draw segmented tail with physics
            if (wolf.tailSegments) {
                let currentX = 0;
                let currentY = 0;
                let currentAngle = 0;
                
                wolf.tailSegments.forEach((segment, i) => {
                    ctx.save();
                    ctx.translate(currentX, currentY);
                    ctx.rotate(currentAngle + segment.angle);
                    
                    // Tail segment
                    const segmentWidth = 8 - i * 1.2;
                    const segmentLength = segment.length;
                    
                    ctx.fillStyle = i % 2 === 0 ? wolf.colors.primary : wolf.colors.secondary;
                    ctx.fillRect(0, -segmentWidth/2, segmentLength, segmentWidth);
                    
                    // Update position for next segment
                    currentX += Math.cos(currentAngle + segment.angle) * segmentLength;
                    currentY += Math.sin(currentAngle + segment.angle) * segmentLength;
                    currentAngle += segment.angle;
                    
                    ctx.restore();
                });
            } else {
                // Fallback simple tail
                ctx.rotate(wolf.tailPosition || 0);
                ctx.fillStyle = wolf.colors.primary;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(-15, 5, -25, 15);
                ctx.quadraticCurveTo(-20, 20, -10, 18);
                ctx.quadraticCurveTo(-5, 10, 0, 0);
                ctx.fill();
            }
            
            ctx.restore();
        }
        
        drawAnimatedLegs(ctx, wolf, type) {
            const legPositions = wolf.legPositions || [];
            const isHind = type === 'hind';
            const startIndex = isHind ? 0 : 2;
            
            for (let i = startIndex; i < startIndex + 2; i++) {
                const legPos = legPositions[i] || { x: 0, y: 0 };
                const baseX = isHind ? 
                    -wolf.width * (0.25 - (i % 2) * 0.1) : 
                    wolf.width * (0.15 + (i % 2) * 0.1);
                const baseY = wolf.height * 0.2;
                
                ctx.save();
                ctx.translate(baseX + legPos.x, baseY);
                
                // Upper leg
                ctx.fillStyle = wolf.colors.primary;
                ctx.fillRect(0, 0, 10, 15 - legPos.y * 0.5);
                
                // Lower leg
                ctx.translate(0, 15 - legPos.y * 0.5);
                ctx.rotate(legPos.y * 0.02); // Slight rotation based on movement
                ctx.fillRect(0, 0, 8, 10 + legPos.y);
                
                // Paw
                ctx.translate(0, 10 + legPos.y);
                ctx.fillStyle = wolf.colors.secondary;
                ctx.fillRect(-1, 0, 10, 5);
                
                // Claws (visible when attacking or lunging)
                if (wolf.clawsOut) {
                    ctx.fillStyle = wolf.colors.claws;
                    for (let j = 0; j < 3; j++) {
                        ctx.fillRect(j * 3, 4, 2, 4);
                    }
                }
                
                ctx.restore();
            }
        }
        
        drawAnimatedBody(ctx, wolf) {
            ctx.save();
            
            // Apply body lowered for prowling
            if (wolf.bodyLowered) {
                ctx.translate(0, wolf.bodyLowered);
            }
            
            // Apply body bob for movement
            if (wolf.bodyBob) {
                ctx.translate(0, wolf.bodyBob);
            }
            
            // Main body with breathing
            const breathY = wolf.breathingOffset || 0;
            const chestExpansion = wolf.chestExpansion || 1;
            
            ctx.fillStyle = wolf.colors.primary;
            ctx.beginPath();
            ctx.ellipse(0, breathY, wolf.width * 0.35 * chestExpansion, wolf.height * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Belly with separate breathing
            const bellyY = breathY + (wolf.bellyOffset || 0);
            ctx.fillStyle = wolf.colors.belly;
            ctx.beginPath();
            ctx.ellipse(0, bellyY + wolf.height * 0.1, wolf.width * 0.3, wolf.height * 0.15, 0, 0, Math.PI);
            ctx.fill();
            
            // Animated fur texture
            if (wolf.furMovement) {
                this.drawAnimatedFur(ctx, wolf, 0, breathY, wolf.width * 0.35, wolf.height * 0.25);
            }
            
            ctx.restore();
        }
        
        drawAnimatedNeck(ctx, wolf) {
            ctx.save();
            
            // Apply head bob
            if (wolf.headBob) {
                ctx.translate(0, wolf.headBob * 0.5);
            }
            
            ctx.fillStyle = wolf.colors.primary;
            ctx.beginPath();
            ctx.moveTo(wolf.width * 0.15, -wolf.height * 0.1);
            ctx.quadraticCurveTo(wolf.width * 0.25, -wolf.height * 0.05, wolf.width * 0.3, -wolf.height * 0.15);
            ctx.quadraticCurveTo(wolf.width * 0.25, wolf.height * 0.05, wolf.width * 0.15, wolf.height * 0.1);
            ctx.fill();
            
            ctx.restore();
        }
        
        drawAnimatedHead(ctx, wolf) {
            ctx.save();
            ctx.translate(wolf.width * 0.35, -wolf.height * 0.15);
            
            // Apply head tilt for howling
            if (wolf.headTilt) {
                ctx.rotate(wolf.headTilt);
            }
            
            // Apply head shake for attacking
            if (wolf.headShake) {
                ctx.translate(wolf.headShake, 0);
            }
            
            // Apply head scan for prowling
            if (wolf.headScan) {
                ctx.rotate(wolf.headScan);
            }
            
            // Apply head bob
            if (wolf.headBob) {
                ctx.translate(0, wolf.headBob);
            }
            
            // Head shape
            ctx.fillStyle = wolf.colors.primary;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(10, -5, 15, 0);
            ctx.quadraticCurveTo(20, 3, 25, 5);
            ctx.lineTo(28, 8);
            ctx.quadraticCurveTo(25, 10, 20, 10);
            ctx.quadraticCurveTo(10, 8, 0, 10);
            ctx.quadraticCurveTo(-5, 5, 0, 0);
            ctx.fill();
            
            // Animated ears
            this.drawAnimatedEars(ctx, wolf);
            
            // Animated mouth
            this.drawAnimatedMouth(ctx, wolf);
            
            // Animated eyes
            this.drawAnimatedEyes(ctx, wolf);
            
            // Sound waves for howling
            if (wolf.soundWavePhase !== undefined) {
                this.drawSoundWaves(ctx, wolf);
            }
            
            ctx.restore();
        }
        
        drawAnimatedEars(ctx, wolf) {
            const baseRotation = wolf.earRotation || 0;
            const alertness = wolf.earAlertness || 0;
            
            // Left ear
            ctx.save();
            ctx.translate(5, -3);
            ctx.rotate(baseRotation - alertness * 0.1);
            
            ctx.fillStyle = wolf.colors.primary;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-3, -8 - alertness * 2);
            ctx.lineTo(3, -8 - alertness * 2);
            ctx.closePath();
            ctx.fill();
            
            // Inner ear
            ctx.fillStyle = wolf.colors.belly;
            ctx.beginPath();
            ctx.moveTo(0, -2);
            ctx.lineTo(-1, -6 - alertness);
            ctx.lineTo(1, -6 - alertness);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            
            // Right ear
            ctx.save();
            ctx.translate(8, -2);
            ctx.rotate(baseRotation + alertness * 0.1);
            
            ctx.fillStyle = wolf.colors.secondary;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-2, -7 - alertness * 2);
            ctx.lineTo(3, -7 - alertness * 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        
        drawAnimatedMouth(ctx, wolf) {
            const mouthOpen = wolf.mouthOpen || wolf.jawOpen || 0;
            const mouthVibration = wolf.mouthVibration || 0;
            
            // Snout
            ctx.fillStyle = wolf.colors.secondary;
            ctx.beginPath();
            ctx.moveTo(20, 5);
            ctx.quadraticCurveTo(25, 6, 28, 8);
            ctx.quadraticCurveTo(25, 9 + mouthOpen * 3, 20, 9 + mouthOpen * 3);
            ctx.fill();
            
            // Open mouth
            if (mouthOpen > 0) {
                // Jaw
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.beginPath();
                ctx.moveTo(20, 9);
                ctx.quadraticCurveTo(24, 9 + mouthOpen * 5 + mouthVibration, 
                                     28, 9 + mouthOpen * 3 + mouthVibration);
                ctx.quadraticCurveTo(24, 11 + mouthOpen * 5 + mouthVibration, 
                                     20, 11 + mouthOpen * 5);
                ctx.fill();
                
                // Teeth
                if (wolf.teethVisible || mouthOpen > 0.5) {
                    ctx.fillStyle = '#ffffff';
                    
                    // Upper fangs
                    ctx.beginPath();
                    ctx.moveTo(22, 9);
                    ctx.lineTo(21, 11 + mouthOpen * 2);
                    ctx.lineTo(23, 11 + mouthOpen * 2);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.moveTo(25, 9);
                    ctx.lineTo(24, 11 + mouthOpen * 2);
                    ctx.lineTo(26, 11 + mouthOpen * 2);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Lower fangs
                    if (mouthOpen > 0.7) {
                        ctx.beginPath();
                        ctx.moveTo(23, 11 + mouthOpen * 4);
                        ctx.lineTo(22, 9 + mouthOpen * 4);
                        ctx.lineTo(24, 9 + mouthOpen * 4);
                        ctx.closePath();
                        ctx.fill();
                    }
                }
                
                // Tongue
                if (mouthOpen > 0.3 && wolf.state !== 'attacking') {
                    ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
                    ctx.beginPath();
                    ctx.ellipse(24, 10 + mouthOpen * 3, 3, 2 + mouthOpen * 2, 0.2, 0, Math.PI);
                    ctx.fill();
                }
            }
            
            // Nose
            ctx.fillStyle = wolf.colors.nose;
            ctx.beginPath();
            ctx.arc(28, 8, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        drawAnimatedEyes(ctx, wolf) {
            // Check if blinking
            if (wolf.isBlinking) {
                // Closed eye line
                ctx.strokeStyle = wolf.colors.secondary;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(10, 3);
                ctx.lineTo(16, 3);
                ctx.stroke();
                return
            }
            
            // Eye glow effect
            if (wolf.state === 'prowling' || wolf.state === 'lunging' || wolf.state === 'attacking') {
                ctx.shadowColor = wolf.colors.eyes;
                ctx.shadowBlur = 8;
            }
            
            // Eye white
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(12, 3, 4, 3, -0.2, 0, Math.PI * 2);
            ctx.fill();
            
            // Iris with dynamic size
            const pupilDilation = wolf.state === 'attacking' ? 0.7 : 
                                 wolf.state === 'prowling' ? 0.5 : 0.3;
            ctx.fillStyle = wolf.colors.eyes;
            ctx.beginPath();
            ctx.arc(13, 3, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Pupil
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(13.5, 3, 1 * (1 - pupilDilation), 0, Math.PI * 2);
            ctx.fill();
            
            // Eye shine
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(12, 2, 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
        }
        
        drawAnimatedFur(ctx, wolf, x, y, width, height) {
            ctx.strokeStyle = wolf.colors.secondary;
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = 0.4;
            
            const furLines = 12;
            const ripple = wolf.furRipple || 0;
            const flow = wolf.furMovement?.flow || 0;
            const ruffled = wolf.furMovement?.ruffled || false;
            
            for (let i = 0; i < furLines; i++) {
                const angle = (i / furLines) * Math.PI * 2;
                const baseX = x + Math.cos(angle) * width * 0.7;
                const baseY = y + Math.sin(angle) * height * 0.7;
                
                // Add movement to fur
                const offsetX = Math.sin(wolf.animationTime * 0.01 + i) * ripple * 10;
                const offsetY = Math.cos(wolf.animationTime * 0.01 + i) * ripple * 5;
                
                ctx.beginPath();
                ctx.moveTo(baseX, baseY);
                
                if (ruffled) {
                    // Spiky fur when agitated
                    ctx.lineTo(baseX + Math.cos(angle) * 8 + offsetX, 
                              baseY + Math.sin(angle) * 8 + offsetY);
                } else {
                    // Smooth fur
                    ctx.quadraticCurveTo(
                        baseX + Math.cos(angle) * 4 + offsetX * 0.5,
                        baseY + Math.sin(angle) * 4 + offsetY * 0.5,
                        baseX + Math.cos(angle + flow) * 6 + offsetX,
                        baseY + Math.sin(angle + flow) * 6 + offsetY
                    );
                }
                ctx.stroke();
            }
            
            ctx.globalAlpha = 1;
        }
        
        drawSoundWaves(ctx, wolf) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = wolf.colors.eyes;
            ctx.lineWidth = 2;
            
            // Draw expanding circular waves
            for (let i = 0; i < 3; i++) {
                const phase = wolf.soundWavePhase + i * Math.PI / 3;
                const radius = 10 + Math.sin(phase) * wolf.soundWaveAmplitude + i * 15;
                const alpha = 0.3 - i * 0.1;
                
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(30, 5, radius, -Math.PI / 3, Math.PI / 3);
                ctx.stroke();
            }
            
            ctx.restore();
        }
        
        drawWolfUI(ctx, wolf) {
            // Draw health bar for special wolves
            if (wolf.isAlpha || wolf.health < wolf.maxHealth) {
                ctx.save();
                ctx.scale(1 / wolf.size, 1 / wolf.size);
                
                const barWidth = 60;
                const barHeight = 6;
                const barY = -wolf.height * 0.5 - 20;
                
                // Background
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);
                
                // Health
                const healthPercent = wolf.health / wolf.maxHealth;
                ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : 
                               healthPercent > 0.25 ? '#ff9800' : '#f44336';
                ctx.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight);
                
                // Border
                ctx.strokeStyle = wolf.isAlpha ? '#ffd700' : '#ffffff';
                ctx.lineWidth = 1;
                ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);
                
                // Status icons
                if (wolf.isAlpha) {
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('👑', 0, barY - 5);
                }
                
                // State indicator
                if (wolf.state === 'prowling') {
                    ctx.fillText('👁', -35, barY + 5);
                } else if (wolf.state === 'howling') {
                    ctx.fillText('🔊', -35, barY + 5);
                }
                
                ctx.restore();
            }
            
            // Draw charge indicator for lunge
            if (wolf.lungeState?.charging) {
                ctx.save();
                ctx.globalAlpha = 0.7;
                
                const chargePercent = wolf.lungeState.chargeTime / wolf.lungeState.maxChargeTime;
                const indicatorRadius = 15;
                
                // Charging circle
                ctx.strokeStyle = `hsl(${chargePercent * 60}, 100%, 50%)`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, -wolf.height * 0.7, indicatorRadius, 
                       -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * chargePercent);
                ctx.stroke();
                
                // Pulse effect
                if (chargePercent >= 1) {
                    ctx.globalAlpha = 0.3 + Math.sin(wolf.animationTime * 0.01) * 0.3;
                    ctx.strokeStyle = '#ff0000';
                    ctx.beginPath();
                    ctx.arc(0, -wolf.height * 0.7, indicatorRadius + 5, 0, Math.PI * 2);
                    ctx.stroke();
                }
                
                ctx.restore();
            }
        }
    }

    exports.WolfAnimationSystem = WolfAnimationSystem;
    exports.default = WolfAnimationSystem;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=wolf-animation.umd.js.map
