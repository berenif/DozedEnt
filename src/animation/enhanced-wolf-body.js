// Enhanced Wolf Body Rendering System
// Provides anatomically accurate wolf body with detailed visual features
import { randInt, randRange, randChoice } from '../utils/rng.js'

export class EnhancedWolfBody {
    constructor() {
        // Body proportions (realistic wolf anatomy ratios)
        this.proportions = {
            headLength: 0.25,      // Head length as % of body length
            headWidth: 0.18,       // Head width as % of body length
            neckLength: 0.15,      // Neck length as % of body length
            bodyLength: 1.0,       // Full body length
            bodyWidth: 0.30,       // Body width at shoulders
            legLength: 0.35,       // Leg length as % of body length
            tailLength: 0.45,      // Tail length as % of body length
            earHeight: 0.08,       // Ear height as % of body length
            snoutLength: 0.12      // Snout length as % of body length
        }

        // Color palettes for different wolf types
        this.colorPalettes = {
            gray: {
                primary: '#6b5d54',
                secondary: '#4a4038',
                belly: '#8b7d74',
                eyes: '#ffd700',
                nose: '#1a1a1a',
                claws: '#2c2c2c',
                fur: ['#5a4f45', '#6b5d54', '#7a6b61', '#4a4038']
            },
            black: {
                primary: '#2c2c2c',
                secondary: '#1a1a1a',
                belly: '#4a4a4a',
                eyes: '#ff4444',
                nose: '#000000',
                claws: '#1a1a1a',
                fur: ['#1a1a1a', '#2c2c2c', '#3a3a3a', '#0f0f0f']
            },
            brown: {
                primary: '#8b7355',
                secondary: '#6b5a47',
                belly: '#a89484',
                eyes: '#90ee90',
                nose: '#2a2a2a',
                claws: '#3c3c3c',
                fur: ['#6b5a47', '#8b7355', '#a89484', '#5a4a3c']
            },
            white: {
                primary: '#f5f5f5',
                secondary: '#e0e0e0',
                belly: '#ffffff',
                eyes: '#4169e1',
                nose: '#c0c0c0',
                claws: '#d3d3d3',
                fur: ['#e0e0e0', '#f5f5f5', '#ffffff', '#c0c0c0']
            }
        }

        // Time accumulator for deterministic animations
        this.elapsedTime = 0

        // Body part definitions with detailed anatomy
        this.bodyParts = {
            head: {
                muzzle: { width: 0.08, height: 0.06, angle: 0 },
                skull: { width: 0.12, height: 0.08, angle: 0 },
                ears: {
                    left: { x: -0.04, y: -0.03, width: 0.02, height: 0.05, angle: -0.3 },
                    right: { x: 0.04, y: -0.03, width: 0.02, height: 0.05, angle: 0.3 }
                }
            },
            neck: {
                upper: { width: 0.06, height: 0.08, angle: 0 },
                lower: { width: 0.08, height: 0.07, angle: 0 }
            },
            torso: {
                shoulders: { width: 0.30, height: 0.12, angle: 0 },
                ribcage: { width: 0.28, height: 0.18, angle: 0 },
                hips: { width: 0.25, height: 0.10, angle: 0 }
            },
            legs: {
                front: {
                    left: {
                        upper: { width: 0.04, height: 0.12, angle: 0 },
                        lower: { width: 0.03, height: 0.10, angle: 0 },
                        paw: { width: 0.05, height: 0.03, angle: 0 }
                    },
                    right: {
                        upper: { width: 0.04, height: 0.12, angle: 0 },
                        lower: { width: 0.03, height: 0.10, angle: 0 },
                        paw: { width: 0.05, height: 0.03, angle: 0 }
                    }
                },
                hind: {
                    left: {
                        upper: { width: 0.04, height: 0.14, angle: 0 },
                        lower: { width: 0.03, height: 0.11, angle: 0 },
                        paw: { width: 0.05, height: 0.03, angle: 0 }
                    },
                    right: {
                        upper: { width: 0.04, height: 0.14, angle: 0 },
                        lower: { width: 0.03, height: 0.11, angle: 0 },
                        paw: { width: 0.05, height: 0.03, angle: 0 }
                    }
                }
            },
            tail: {
                base: { width: 0.06, height: 0.04, angle: 0 },
                segments: []
            }
        }

        // Fur rendering properties
        this.furProperties = {
            length: 0.02,           // Fur length
            density: 50,            // Fur strands per unit area
            layers: 3,              // Number of fur layers
            windSensitivity: 0.8,   // How much wind affects fur
            animationSpeed: 0.01    // Fur animation speed
        }

        // Muscle definition for dynamic body
        this.muscleGroups = {
            shoulders: { tension: 0, definition: 0.8 },
            neck: { tension: 0, definition: 0.6 },
            legs: { tension: 0, definition: 0.7 },
            jaw: { tension: 0, definition: 0.9 }
        }

        // Animation state tracking
        this.animationState = {
            breathing: 0,
            muscleTension: 0,
            furFlow: { x: 0, y: 0 },
            bodyDeformation: 0
        }
    }

    // Initialize wolf body with specific characteristics
    initializeWolf(wolf, type = 'normal', size = 1.0) {
        this.wolf = wolf
        this.type = type
        this.size = size
        this.colors = this.colorPalettes[type] || this.colorPalettes.gray

        // Generate unique fur pattern
        this.generateFurPattern()

        // Initialize body scaling
        this.scaleBodyParts(size)

        // Set up muscle groups based on wolf type
        this.initializeMuscleGroups(type)

        return this
    }

    // Generate unique fur pattern for this wolf
    generateFurPattern() {
        const stream = `wolf-fur:${this.wolf?.id || 'unknown'}`
        this.furPattern = {
            seed: randInt(1000, stream),
            markings: this.generateFurMarkings(stream),
            texture: this.generateFurTexture(stream),
            flow: this.generateFurFlow()
        }
    }

    // Generate natural fur markings
    generateFurMarkings(stream = `wolf-fur:${this.wolf?.id || 'unknown'}`) {
        const markings = []
        const numMarkings = randInt(3, `${stream}:count`) + 1

        for (let i = 0; i < numMarkings; i++) {
            const local = `${stream}:${i}`
            markings.push({
                type: randChoice(['stripe', 'patch', 'blaze'], `${local}:type`),
                position: {
                    x: randRange(-0.3, 0.3, `${local}:px`),
                    y: randRange(-0.2, 0.2, `${local}:py`)
                },
                size: randRange(0.1, 0.3, `${local}:size`),
                color: randChoice(this.colors.fur, `${local}:color`),
                opacity: randRange(0.1, 0.4, `${local}:op`)
            })
        }

        return markings
    }

    // Generate fur texture properties
    generateFurTexture(stream = `wolf-fur:${this.wolf?.id || 'unknown'}`) {
        return {
            coarseness: randRange(0.7, 1.0, `${stream}:coarse`),
            length: randRange(0.015, 0.025, `${stream}:len`),
            curl: randRange(0.0, 0.5, `${stream}:curl`),
            density: randRange(30, 50, `${stream}:dens`)
        }
    }

    // Generate fur flow direction
    generateFurFlow() {
        const flowPoints = []
        const numPoints = 20

        for (let i = 0; i < numPoints; i++) {
            flowPoints.push({
                x: (i / numPoints - 0.5) * 2,
                y: Math.sin(i * 0.3) * 0.2,
                direction: Math.sin(i * 0.5) * 0.5
            })
        }

        return flowPoints
    }

    // Scale body parts based on wolf size
    scaleBodyParts(scale) {
        // Validate scale parameter to prevent negative/zero scaling
        if (scale <= 0) {
            console.warn(`Invalid scale parameter: ${scale}. Using default scale of 1.0`)
            scale = 1.0
        }

        // Scale all body part dimensions
        Object.keys(this.bodyParts).forEach(partKey => {
            const part = this.bodyParts[partKey]

            if (part.width) {part.width *= scale}
            if (part.height) {part.height *= scale}

            // Handle nested structures
            if (part.left && part.right) {
                ['left', 'right'].forEach(side => {
                    Object.keys(part[side]).forEach(subpart => {
                        const sub = part[side][subpart]
                        if (sub.width) {sub.width *= scale}
                        if (sub.height) {sub.height *= scale}
                    })
                })
            }

            if (part.ears) {
                Object.keys(part.ears).forEach(ear => {
                    const e = part.ears[ear]
                    if (e.width) {e.width *= scale}
                    if (e.height) {e.height *= scale}
                })
            }
        })

        // Scale proportions
        Object.keys(this.proportions).forEach(prop => {
            this.proportions[prop] *= scale
        })

        // Scale fur properties
        this.furProperties.length *= scale
    }

    // Initialize muscle groups based on wolf type
    initializeMuscleGroups(type) {
        const typeModifiers = {
            normal: { tension: 0.5, definition: 0.7 },
            alpha: { tension: 0.8, definition: 0.9 },
            scout: { tension: 0.6, definition: 0.6 },
            hunter: { tension: 0.7, definition: 0.8 }
        }

        const modifier = typeModifiers[type] || typeModifiers.normal

        Object.keys(this.muscleGroups).forEach(group => {
            this.muscleGroups[group].tension = modifier.tension
            this.muscleGroups[group].definition *= modifier.definition
        })
    }

    // Update body animation state
    update(deltaTime, wolf) {
        // Accumulate elapsed time in milliseconds
        this.elapsedTime += deltaTime * 1000

        this.updateBreathing(deltaTime, wolf)
        this.updateMuscleTension(deltaTime, wolf)
        this.updateFurDynamics(deltaTime, wolf)
        this.updateBodyDeformation(deltaTime, wolf)
    }

    // Update breathing animation
    updateBreathing(deltaTime, wolf) {
        const breathRate = wolf.state === 'running' ? 0.008 : 0.003
        const breathAmplitude = wolf.state === 'running' ? 0.04 : 0.02

        this.animationState.breathing = Math.sin(this.elapsedTime * breathRate) * breathAmplitude
    }

    // Update muscle tension based on activity
    updateMuscleTension(deltaTime, wolf) {
        const targetTension = this.getTensionForState(wolf.state)
        const tensionRate = 2.0 // Tension change rate

        this.animationState.muscleTension +=
            (targetTension - this.animationState.muscleTension) * tensionRate * deltaTime

        // Update individual muscle groups
        Object.keys(this.muscleGroups).forEach(group => {
            const baseTension = this.muscleGroups[group].tension
            this.muscleGroups[group].currentTension = baseTension + this.animationState.muscleTension
        })
    }

    // Get appropriate tension for wolf state
    getTensionForState(state) {
        const tensionMap = {
            idle: 0.1,
            prowling: 0.3,
            walking: 0.4,
            running: 0.7,
            lunging: 0.9,
            attacking: 0.8,
            hurt: 0.2,
            death: 0.0
        }
        return tensionMap[state] || 0.1
    }

    // Update fur dynamics
    updateFurDynamics(deltaTime, wolf) {
        // Fur flow based on movement and wind
        // Calculate movement speed for fur dynamics
        const windEffect = { x: Math.sin(this.elapsedTime * 0.001) * 0.1, y: 0 }

        this.animationState.furFlow.x = -wolf.velocity.x * 0.001 + windEffect.x
        this.animationState.furFlow.y = -wolf.velocity.y * 0.001 + windEffect.y
    }

    // Update body deformation
    updateBodyDeformation(deltaTime, wolf) {
        const deformationTarget = wolf.state === 'lunging' ? 0.3 :
                                wolf.state === 'running' ? 0.1 : 0.0

        this.animationState.bodyDeformation +=
            (deformationTarget - this.animationState.bodyDeformation) * 3 * deltaTime
    }

    // Render the enhanced wolf body
    render(ctx, wolf, camera) {
        ctx.save()

        // If camera is provided and not already pre-transformed, apply transform here
        const hasCamera = camera && typeof camera.x === 'number' && typeof camera.y === 'number'
        const applyTransform = !!(hasCamera && (camera.x !== 0 || camera.y !== 0))
        if (applyTransform) {
            const screenX = wolf.position.x - camera.x
            const screenY = wolf.position.y - camera.y
            ctx.translate(screenX, screenY)
            ctx.scale(wolf.facing * this.size, this.size)
        }

        // Apply body deformation
        if (this.animationState.bodyDeformation > 0) {
            ctx.scale(1 + this.animationState.bodyDeformation, 1 - this.animationState.bodyDeformation * 0.5)
        }

        // Render body parts in correct order
        this.renderShadow(ctx, wolf)
        this.renderTail(ctx, wolf)
        this.renderHindLegs(ctx, wolf)
        this.renderBody(ctx, wolf)
        this.renderFrontLegs(ctx, wolf)
        this.renderNeck(ctx, wolf)
        this.renderHead(ctx, wolf)
        this.renderFurOverlay(ctx, wolf)

        ctx.restore()
    }

    // Render wolf shadow
    renderShadow(ctx, wolf) {
        const shadowScale = wolf.isGrounded ? 1.0 : 0.6
        const shadowAlpha = wolf.isGrounded ? 0.3 : 0.1

        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`
        ctx.beginPath()

        // Ensure positive radius values for shadow ellipse
        const shadowRadiusX = Math.max(0.1, Math.abs(this.proportions.bodyLength * 0.4 * shadowScale))
        const shadowRadiusY = Math.max(0.1, Math.abs(this.proportions.bodyWidth * 0.3 * shadowScale))

        ctx.ellipse(0, this.proportions.bodyWidth * 0.3, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2)
        ctx.fill()
    }

    // Render wolf tail with segments
    renderTail(ctx, wolf) {
        ctx.save()

        // Position at tail base
        const tailBaseX = -this.proportions.bodyLength * 0.4
        const tailBaseY = -this.proportions.bodyWidth * 0.1
        ctx.translate(tailBaseX, tailBaseY)

        // Apply tail animation
        const tailAngle = wolf.tailPosition || 0
        ctx.rotate(tailAngle)

        // Render tail segments
        const segmentLength = this.proportions.tailLength / 8
        let currentX = 0
        let currentY = 0
        let currentAngle = 0

        for (let i = 0; i < 8; i++) {
            ctx.save()
            ctx.translate(currentX, currentY)
            ctx.rotate(currentAngle)

            // Segment shape
            const width = 6 - i * 0.5
            const length = segmentLength

            ctx.fillStyle = i % 2 === 0 ? this.colors.primary : this.colors.secondary
            ctx.fillRect(-width/2, 0, width, length)

            // Add fur texture
            this.renderFurStrands(ctx, -width/2, 0, width, length, i)

            // Update for next segment
            const segmentAngle = Math.sin(this.elapsedTime * 0.003 + i * 0.5) * 0.2
            currentX += Math.cos(segmentAngle) * length
            currentY += Math.sin(segmentAngle) * length
            currentAngle += segmentAngle

            ctx.restore()
        }

        ctx.restore()
    }

    // Render hind legs
    renderHindLegs(ctx, wolf) {
        this.renderLegPair(ctx, wolf, 'hind', -this.proportions.bodyLength * 0.25)
    }

    // Render front legs
    renderFrontLegs(ctx, wolf) {
        this.renderLegPair(ctx, wolf, 'front', this.proportions.bodyLength * 0.15)
    }

    // Render a pair of legs
    renderLegPair(ctx, wolf, type, baseX) {
        const legData = this.bodyParts.legs[type]

        // Left leg
        ctx.save()
        ctx.translate(baseX - this.proportions.bodyWidth * 0.15, this.proportions.bodyWidth * 0.1)
        this.renderSingleLeg(ctx, legData.left)
        ctx.restore()

        // Right leg
        ctx.save()
        ctx.translate(baseX + this.proportions.bodyWidth * 0.15, this.proportions.bodyWidth * 0.1)
        this.renderSingleLeg(ctx, legData.right)
        ctx.restore()
    }

    // Render single leg
    renderSingleLeg(ctx, legData) {
        // Upper leg
        ctx.fillStyle = this.colors.primary
        ctx.fillRect(-legData.upper.width/2, 0, legData.upper.width, legData.upper.height)

        // Lower leg
        ctx.translate(0, legData.upper.height)
        ctx.fillRect(-legData.lower.width/2, 0, legData.lower.width, legData.lower.height)

        // Paw
        ctx.translate(0, legData.lower.height)
        ctx.fillStyle = this.colors.secondary
        ctx.fillRect(-legData.paw.width/2, 0, legData.paw.width, legData.paw.height)

        // Claws
        if (wolf.clawsOut) {
            ctx.fillStyle = this.colors.claws
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(-legData.paw.width/2 + i * 3, legData.paw.height - 2, 2, 4)
            }
        }
    }

    // Render main body
    renderBody(ctx, wolf) {
        // Body shape with breathing animation
        const breathOffset = this.animationState.breathing

        // Main body ellipse
        ctx.fillStyle = this.colors.primary
        ctx.beginPath()

        // Ensure positive radius values to prevent canvas errors
        const bodyRadiusX = Math.max(0.1, Math.abs(this.proportions.bodyLength * 0.4))
        const bodyRadiusY = Math.max(0.1, Math.abs(this.proportions.bodyWidth * 0.3 + breathOffset * 5))

        ctx.ellipse(0, breathOffset * 10, bodyRadiusX, bodyRadiusY, 0, 0, Math.PI * 2)
        ctx.fill()

        // Belly
        ctx.fillStyle = this.colors.belly
        ctx.beginPath()

        // Ensure positive radius values for belly ellipse
        const bellyRadiusX = Math.max(0.1, Math.abs(this.proportions.bodyLength * 0.35))
        const bellyRadiusY = Math.max(0.1, Math.abs(this.proportions.bodyWidth * 0.2 + breathOffset * 3))

        ctx.ellipse(0, this.proportions.bodyWidth * 0.15 + breathOffset * 5,
                   bellyRadiusX, bellyRadiusY, 0, 0, Math.PI)
        ctx.fill()

        // Shoulder definition
        this.renderMuscleDefinition(ctx, wolf, 'shoulders')
    }

    // Render neck
    renderNeck(ctx, wolf) {
        ctx.save()

        // Position at front of body
        ctx.translate(this.proportions.bodyLength * 0.25, -this.proportions.bodyWidth * 0.05)

        // Neck curve
        ctx.fillStyle = this.colors.primary
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.quadraticCurveTo(
            this.proportions.neckLength * 0.3,
            -this.proportions.neckLength * 0.2,
            this.proportions.neckLength * 0.6,
            -this.proportions.neckLength * 0.1
        )
        ctx.quadraticCurveTo(
            this.proportions.neckLength * 0.8,
            this.proportions.neckLength * 0.1,
            this.proportions.neckLength,
            this.proportions.neckLength * 0.2
        )
        ctx.fill()

        // Neck muscle definition
        this.renderMuscleDefinition(ctx, wolf, 'neck')

        ctx.restore()
    }

    // Render head
    renderHead(ctx, wolf) {
        ctx.save()

        // Position at end of neck
        ctx.translate(this.proportions.bodyLength * 0.35, -this.proportions.bodyWidth * 0.15)

        // Apply head animations
        if (wolf.headTilt) {ctx.rotate(wolf.headTilt)}
        if (wolf.headShake) {ctx.translate(wolf.headShake, 0)}

        // Head shape
        ctx.fillStyle = this.colors.primary
        ctx.beginPath()

        // Ensure positive radius values for head ellipse
        const headRadiusX = Math.max(0.1, Math.abs(this.proportions.headWidth))
        const headRadiusY = Math.max(0.1, Math.abs(this.proportions.headLength * 0.8))

        ctx.ellipse(0, 0, headRadiusX, headRadiusY, 0, 0, Math.PI * 2)
        ctx.fill()

        // Ears
        this.renderEars(ctx, wolf)

        // Snout
        this.renderSnout(ctx)

        // Eyes
        this.renderEyes(ctx, wolf)

        // Nose
        this.renderNose(ctx, wolf)

        // Jaw muscle definition
        this.renderMuscleDefinition(ctx, wolf, 'jaw')

        ctx.restore()
    }

    // Render ears
    renderEars(ctx, wolf) {
        const earData = this.bodyParts.head.ears

        // Left ear
        ctx.save()
        ctx.translate(earData.left.x * this.proportions.headWidth * 2,
                     earData.left.y * this.proportions.headLength * 2)
        ctx.rotate((wolf.earRotation || 0) + earData.left.angle)

        ctx.fillStyle = this.colors.primary
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(-earData.left.width/2, -earData.left.height)
        ctx.lineTo(earData.left.width/2, -earData.left.height)
        ctx.closePath()
        ctx.fill()

        // Inner ear
        ctx.fillStyle = this.colors.belly
        ctx.beginPath()
        ctx.moveTo(0, -earData.left.height * 0.2)
        ctx.lineTo(-earData.left.width/3, -earData.left.height * 0.7)
        ctx.lineTo(earData.left.width/3, -earData.left.height * 0.7)
        ctx.closePath()
        ctx.fill()

        ctx.restore()

        // Right ear (mirrored)
        ctx.save()
        ctx.translate(earData.right.x * this.proportions.headWidth * 2,
                     earData.right.y * this.proportions.headLength * 2)
        ctx.rotate((wolf.earRotation || 0) + earData.right.angle)

        ctx.fillStyle = this.colors.secondary
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(-earData.right.width/2, -earData.right.height)
        ctx.lineTo(earData.right.width/2, -earData.right.height)
        ctx.closePath()
        ctx.fill()

        ctx.restore()
    }

    // Render snout
    renderSnout(ctx) {
        const snoutLength = this.proportions.snoutLength

        // Snout shape
        ctx.fillStyle = this.colors.secondary
        ctx.beginPath()
        ctx.moveTo(this.proportions.headWidth * 0.8, 0)
        ctx.lineTo(this.proportions.headWidth * 0.8 + snoutLength, -this.proportions.headLength * 0.2)
        ctx.lineTo(this.proportions.headWidth * 0.8 + snoutLength, this.proportions.headLength * 0.2)
        ctx.closePath()
        ctx.fill()

        // Nostrils
        ctx.fillStyle = this.colors.nose
        ctx.beginPath()
        ctx.arc(this.proportions.headWidth * 0.9 + snoutLength, -this.proportions.headLength * 0.1, 2, 0, Math.PI * 2)
        ctx.arc(this.proportions.headWidth * 0.9 + snoutLength, this.proportions.headLength * 0.1, 2, 0, Math.PI * 2)
        ctx.fill()
    }

    // Render eyes
    renderEyes(ctx, wolf) {
        // Left eye
        ctx.save()
        ctx.translate(this.proportions.headWidth * 0.4, -this.proportions.headLength * 0.3)

        // Eye glow effect
        if (wolf.state === 'prowling' || wolf.state === 'lunging') {
            ctx.shadowColor = this.colors.eyes
            ctx.shadowBlur = 8
        }

        // Eye white
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.ellipse(0, 0, 6, 4, -0.2, 0, Math.PI * 2)
        ctx.fill()

        // Iris
        ctx.fillStyle = this.colors.eyes
        ctx.beginPath()
        ctx.arc(2, 0, 3, 0, Math.PI * 2)
        ctx.fill()

        // Pupil
        ctx.fillStyle = '#000000'
        ctx.beginPath()
        ctx.arc(3, 0, 1.5, 0, Math.PI * 2)
        ctx.fill()

        // Eye shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
        ctx.beginPath()
        ctx.arc(0, -1, 1, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()

        // Right eye (simplified)
        ctx.save()
        ctx.translate(this.proportions.headWidth * 0.4, this.proportions.headLength * 0.3)

        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.ellipse(0, 0, 5, 3, 0.2, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = this.colors.eyes
        ctx.beginPath()
        ctx.arc(1, 0, 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#000000'
        ctx.beginPath()
        ctx.arc(2, 0, 1, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()

        ctx.shadowBlur = 0
    }

    // Render nose
    renderNose(ctx, wolf) {
        ctx.fillStyle = this.colors.nose
        ctx.beginPath()
        ctx.arc(this.proportions.headWidth * 0.9 + this.proportions.snoutLength, 0, 3, 0, Math.PI * 2)
        ctx.fill()
    }

    // Render fur overlay
    renderFurOverlay(ctx, wolf) {
        // Add fur texture to visible areas
        this.renderFurTexture(ctx, wolf)
        this.renderFurMarkings(ctx, wolf)
    }

    // Render fur texture
    renderFurTexture(ctx, wolf) {
        ctx.save()
        ctx.globalAlpha = 0.4

        // Simulate fur strands
        const furStrands = 30
        let s = Number((globalThis.runSeedForVisuals ?? 1n) % 65521n)
        const next = () => { s = (s * 1664525 + 1013904223) % 0x80000000; return s / 0x80000000 }
        for (let i = 0; i < furStrands; i++) {
            const x = (next() - 0.5) * this.proportions.bodyLength * 0.8
            const y = (next() - 0.5) * this.proportions.bodyWidth * 0.6
            const length = next() * 3 + 1

            // Fur strand color
            ctx.strokeStyle = this.colors.fur[Math.floor(next() * this.colors.fur.length)]
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(x, y)
            ctx.lineTo(x + this.animationState.furFlow.x * length,
                      y + this.animationState.furFlow.y * length)
            ctx.stroke()
        }

        ctx.restore()
    }

    // Render fur markings
    renderFurMarkings(ctx, wolf) {
        this.furPattern.markings.forEach(mark => {
            ctx.save()
            ctx.globalAlpha = mark.opacity
            ctx.fillStyle = mark.color

            // Draw marking shape
            ctx.beginPath()
            if (mark.type === 'stripe') {
                const stripeRadiusX = Math.max(0.1, Math.abs(mark.size * this.proportions.bodyLength))
                const stripeRadiusY = Math.max(0.1, Math.abs(mark.size * this.proportions.bodyWidth * 0.3))
                ctx.ellipse(mark.position.x * this.proportions.bodyLength,
                           mark.position.y * this.proportions.bodyWidth,
                           stripeRadiusX, stripeRadiusY, 0, 0, Math.PI * 2)
            } else if (mark.type === 'patch') {
                const patchRadius = Math.max(0.1, Math.abs(mark.size * this.proportions.bodyLength))
                ctx.arc(mark.position.x * this.proportions.bodyLength,
                       mark.position.y * this.proportions.bodyWidth,
                       patchRadius, 0, Math.PI * 2)
            } else if (mark.type === 'blaze') {
                const blazeRadiusX = Math.max(0.1, Math.abs(mark.size * this.proportions.bodyLength * 0.5))
                const blazeRadiusY = Math.max(0.1, Math.abs(mark.size * this.proportions.bodyWidth))
                ctx.ellipse(mark.position.x * this.proportions.bodyLength,
                           mark.position.y * this.proportions.bodyWidth,
                           blazeRadiusX, blazeRadiusY, 0, 0, Math.PI * 2)
            }
            ctx.fill()
            ctx.restore()
        })
    }

    // Render fur strands on specific areas
    renderFurStrands(ctx, x, y, width, height, seed) {
        ctx.save()
        ctx.globalAlpha = 0.3

        const strandCount = Math.floor(width * height * 0.1)
        let r = Number((globalThis.runSeedForVisuals ?? 1n) % 131071n)
        const next2 = () => { r = (r * 1103515245 + 12345) % 0x80000000; return r / 0x80000000 }
        for (let i = 0; i < strandCount; i++) {
            const localX = x + next2() * width
            const localY = y + next2() * height
            const strandLength = next2() * 2 + 1

            ctx.strokeStyle = this.colors.fur[(seed + i) % this.colors.fur.length]
            ctx.lineWidth = 0.3
            ctx.beginPath()
            ctx.moveTo(localX, localY)
            ctx.lineTo(localX, localY + strandLength)
            ctx.stroke()
        }

        ctx.restore()
    }

    // Render muscle definition
    renderMuscleDefinition(ctx, wolf, muscleGroup) {
        const muscle = this.muscleGroups[muscleGroup]
        if (!muscle || muscle.definition < 0.5) {return}

        ctx.save()
        ctx.globalAlpha = muscle.currentTension * 0.2
        ctx.strokeStyle = this.colors.secondary
        ctx.lineWidth = 1

        // Simple muscle definition lines
        const definition = muscle.definition
        ctx.beginPath()
        ctx.moveTo(-10, -5)
        ctx.quadraticCurveTo(0, -5 - definition * 3, 10, -5)
        ctx.stroke()

        ctx.restore()
    }

    // Get body bounds for collision detection
    getBounds(wolf) {
        return {
            x: wolf.position.x - this.proportions.bodyLength * 0.5 * this.size,
            y: wolf.position.y - this.proportions.bodyWidth * 0.3 * this.size,
            width: this.proportions.bodyLength * this.size,
            height: this.proportions.bodyWidth * 0.6 * this.size
        }
    }

    // Export body configuration for persistence
    exportConfig() {
        return {
            type: this.type,
            size: this.size,
            colors: this.colors,
            furPattern: this.furPattern,
            proportions: this.proportions
        }
    }

    // Import body configuration
    importConfig(config) {
        this.type = config.type
        this.size = config.size
        this.colors = config.colors
        this.furPattern = config.furPattern
        Object.assign(this.proportions, config.proportions)
    }
}

export default EnhancedWolfBody
