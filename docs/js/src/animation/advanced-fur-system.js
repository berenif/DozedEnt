// Advanced Fur Rendering System
// Provides realistic fur simulation with physics-based movement and detailed textures
import { createRngStream, randChoice } from '../utils/rng.js'

export class AdvancedFurSystem {
    constructor() {
        // Fur physics properties
        this.physics = {
            stiffness: 0.8,        // Fur strand stiffness
            damping: 0.9,          // Damping factor
            gravity: 0.1,          // Gravity effect on fur
            windStrength: 0.5,     // Wind influence
            movementInfluence: 0.7 // How much movement affects fur
        }

        // Fur rendering properties
        this.rendering = {
            strandCount: 1000,     // Total fur strands to render
            strandLength: 8,       // Base strand length
            strandWidth: 0.5,      // Strand width
            layerCount: 4,         // Number of fur layers
            density: 0.8,          // Fur density multiplier
            opacity: 0.6,          // Base opacity
            colorVariation: 0.3    // Color variation between strands
        }

        // Fur strand data
        this.strands = []
        this.windField = []
        this.movementField = []

        // Fur types and their properties
        this.furTypes = {
            guard: {
                length: 12,
                stiffness: 0.9,
                density: 0.6,
                color: 'primary',
                layer: 'outer'
            },
            undercoat: {
                length: 6,
                stiffness: 0.6,
                density: 0.8,
                color: 'belly',
                layer: 'inner'
            },
            whisker: {
                length: 15,
                stiffness: 1.0,
                density: 0.1,
                color: 'primary',
                layer: 'special'
            },
            tail: {
                length: 18,
                stiffness: 0.7,
                density: 0.9,
                color: 'secondary',
                layer: 'special'
            }
        }

        // Initialize wind field
        this.initializeWindField()

        // RNG stream (set per-wolf during initializeFur)
        this.rng = createRngStream('fur-default')

        // Fur animation state
        this.animationState = {
            time: 0,
            windDirection: { x: 1, y: 0 },
            windStrength: 0,
            movement: { x: 0, y: 0 }
        }
    }

    // Initialize wind field for realistic air flow
    initializeWindField() {
        const gridSize = 20
        this.windField = []

        for (let x = 0; x < gridSize; x++) {
            this.windField[x] = []
            for (let y = 0; y < gridSize; y++) {
                this.windField[x][y] = {
                    velocity: {
                        x: (this.rng.float() - 0.5) * 2,
                        y: (this.rng.float() - 0.5) * 2
                    },
                    turbulence: 0.5 + this.rng.float() * 0.5
                }
            }
        }
    }

    // Initialize fur for a wolf
    initializeFur(wolf, bodySystem) {
        this.wolf = wolf
        this.bodySystem = bodySystem

        // Set up fur colors from body system BEFORE generating strands
        this.colors = bodySystem.colors

        // Bind deterministic RNG stream to this wolf id
        const streamName = `fur-${wolf.id || 'unknown'}`
        this.rng = createRngStream(streamName)

        // Generate fur strands based on wolf type and body regions
        this.generateFurStrands()

        return this
    }

    // Generate fur strands for different body regions
    generateFurStrands() {
        this.strands = []

        // Define body regions and their fur properties
        const regions = [
            { name: 'back', bounds: [-0.4, -0.3, 0.8, 0.6], density: 1.0, type: 'guard' },
            { name: 'sides', bounds: [-0.5, -0.1, 1.0, 0.4], density: 0.8, type: 'undercoat' },
            { name: 'belly', bounds: [-0.3, 0.1, 0.6, 0.3], density: 0.6, type: 'undercoat' },
            { name: 'neck', bounds: [0.2, -0.2, 0.3, 0.4], density: 0.9, type: 'guard' },
            { name: 'tail', bounds: [-0.6, -0.2, 0.3, 0.4], density: 1.2, type: 'tail' },
            { name: 'legs', bounds: [-0.3, 0.2, 0.6, 0.3], density: 0.7, type: 'guard' },
            { name: 'head', bounds: [0.3, -0.3, 0.4, 0.6], density: 0.8, type: 'guard' }
        ]

        regions.forEach(region => {
            this.generateRegionFur(region)
        })

        // Add special fur features
        this.generateSpecialFeatures()
    }

    // Generate fur for a specific body region
    generateRegionFur(region) {
        const furType = this.furTypes[region.type]
        const strandCount = Math.floor(
            this.rendering.strandCount * region.density *
            furType.density * this.rendering.density
        )

        for (let i = 0; i < strandCount; i++) {
            // Generate strand position within region bounds
            const localX = region.bounds[0] + this.rng.float() * region.bounds[2]
            const localY = region.bounds[1] + this.rng.float() * region.bounds[3]

            // Create strand with physics properties
            const strand = {
                id: `${region.name}_${i}`,
                position: { x: localX, y: localY },
                basePosition: { x: localX, y: localY },
                velocity: { x: 0, y: 0 },
                targetPosition: { x: localX, y: localY },
                length: furType.length * (0.8 + this.rng.float() * 0.4),
                stiffness: furType.stiffness,
                damping: this.physics.damping,
                color: this.getFurColor(furType.color, region.name),
                layer: furType.layer,
                region: region.name,
                curl: this.rng.float() * 0.5,
                thickness: 0.3 + this.rng.float() * 0.7,
                segments: this.generateStrandSegments(furType.length)
            }

            this.strands.push(strand)
        }
    }

    // Generate special fur features (mane, tufts, etc.)
    generateSpecialFeatures() {
        // Alpha wolf mane
        if (this.wolf.type === 'alpha') {
            this.generateMane()
        }

        // Tail tuft
        this.generateTailTuft()

        // Ear tufts
        this.generateEarTufts()

        // Whiskers
        this.generateWhiskers()
    }

    // Generate alpha wolf mane
    generateMane() {
        const maneStrands = 200

        for (let i = 0; i < maneStrands; i++) {
            const angle = (i / maneStrands) * Math.PI * 2
            const radius = 0.3 + this.rng.float() * 0.1
            const x = Math.cos(angle) * radius + 0.2
            const y = Math.sin(angle) * radius - 0.1

            this.strands.push({
                id: `mane_${i}`,
                position: { x, y },
                basePosition: { x, y },
                velocity: { x: 0, y: 0 },
                targetPosition: { x, y },
                length: 20 + this.rng.float() * 15,
                stiffness: 0.6,
                damping: 0.8,
                color: this.colors.primary,
                layer: 'special',
                region: 'mane',
                curl: 0.3,
                thickness: 0.8 + this.rng.float() * 0.4,
                segments: this.generateStrandSegments(25)
            })
        }
    }

    // Generate tail tuft
    generateTailTuft() {
        const tuftStrands = 50

        for (let i = 0; i < tuftStrands; i++) {
            const x = -0.45 + this.rng.float() * 0.1
            const y = -0.15 + this.rng.float() * 0.3

            this.strands.push({
                id: `tail_tuft_${i}`,
                position: { x, y },
                basePosition: { x, y },
                velocity: { x: 0, y: 0 },
                targetPosition: { x, y },
                length: 25 + this.rng.float() * 10,
                stiffness: 0.5,
                damping: 0.9,
                color: this.colors.secondary,
                layer: 'special',
                region: 'tail_tuft',
                curl: 0.4,
                thickness: 0.6 + this.rng.float() * 0.4,
                segments: this.generateStrandSegments(30)
            })
        }
    }

    // Generate ear tufts
    generateEarTufts() {
        const earPositions = [
            { x: 0.35, y: -0.25 }, // Left ear
            { x: 0.42, y: -0.22 }  // Right ear
        ]

        earPositions.forEach((earPos, earIndex) => {
            const tuftStrands = 15

            for (let i = 0; i < tuftStrands; i++) {
                const x = earPos.x + (this.rng.float() - 0.5) * 0.05
                const y = earPos.y + (this.rng.float() - 0.5) * 0.05

                this.strands.push({
                    id: `ear_tuft_${earIndex}_${i}`,
                    position: { x, y },
                    basePosition: { x, y },
                    velocity: { x, y },
                    targetPosition: { x, y },
                    length: 8 + this.rng.float() * 6,
                    stiffness: 0.8,
                    damping: 0.95,
                    color: this.colors.primary,
                    layer: 'special',
                    region: 'ear_tuft',
                    curl: 0.2,
                    thickness: 0.4 + this.rng.float() * 0.3,
                    segments: this.generateStrandSegments(10)
                })
            }
        })
    }

    // Generate whiskers
    generateWhiskers() {
        const whiskerPositions = [
            { x: 0.45, y: -0.15, angle: -0.3 }, // Left upper
            { x: 0.45, y: -0.05, angle: -0.1 }, // Left middle
            { x: 0.45, y: 0.05, angle: 0.1 },  // Left lower
            { x: 0.45, y: -0.12, angle: 0.3 }, // Right upper
            { x: 0.45, y: -0.02, angle: 0.1 }, // Right middle
            { x: 0.45, y: 0.08, angle: -0.1 }  // Right lower
        ]

        whiskerPositions.forEach((pos, index) => {
            this.strands.push({
                id: `whisker_${index}`,
                position: { x: pos.x, y: pos.y },
                basePosition: { x: pos.x, y: pos.y },
                velocity: { x: 0, y: 0 },
                targetPosition: { x: pos.x, y: pos.y },
                length: 20 + this.rng.float() * 10,
                stiffness: 1.0,
                damping: 0.98,
                color: '#ffffff',
                layer: 'special',
                region: 'whisker',
                curl: 0.1,
                thickness: 0.2,
                segments: this.generateStrandSegments(25),
                angle: pos.angle
            })
        })
    }

    // Generate strand segments for physics simulation
    generateStrandSegments(length) {
        const segmentCount = Math.max(3, Math.floor(length / 3))
        const segments = []

        for (let i = 0; i < segmentCount; i++) {
            segments.push({
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                angle: 0,
                length: length / segmentCount
            })
        }

        return segments
    }

    // Get fur color based on type and region
    getFurColor(colorType, region) {
        const baseColor = this.colors[colorType] || this.colors.primary

        // Add variation based on region and randomness
        const variation = this.rendering.colorVariation
        const regionVariation = this.getRegionColorVariation(region)

        return this.varyColor(baseColor, variation + regionVariation)
    }

    // Get color variation for specific regions
    getRegionColorVariation(region) {
        const variations = {
            mane: 0.2,
            tail_tuft: 0.15,
            ear_tuft: 0.1,
            whisker: 0.05,
            back: 0.1,
            sides: 0.08,
            belly: 0.05,
            neck: 0.12,
            legs: 0.07,
            head: 0.09
        }
        return variations[region] || 0.1
    }

    // Vary a color by adding random variation
    varyColor(baseColor, variation) {
        // Simple color variation - in practice you'd parse and modify the hex/rgb values
        // eslint-disable-next-line no-unused-vars
        const baseRef = baseColor; // Reserved for future color parsing
        // eslint-disable-next-line no-unused-vars  
        const varRef = variation; // Reserved for future variation calculation
        const colors = ['#8b7355', '#6b5a47', '#a89484', '#4a4038', '#7a6b61']
        return randChoice(colors, `fur-color-${this.wolf?.id || 'default'}`) || colors[0]
    }

    // Update fur physics
    update(deltaTime) {
        this.animationState.time += deltaTime

        // Update wind
        this.updateWind(deltaTime)

        // Update movement influence
        this.updateMovementInfluence()

        // Update each fur strand
        this.strands.forEach(strand => {
            this.updateStrand(strand, deltaTime)
        })

        // Sort strands by layer for proper rendering
        this.sortStrandsByLayer()
    }

    // Update wind simulation
    updateWind(deltaTime) {
        // eslint-disable-next-line no-unused-vars
        const dtRef = deltaTime; // Reserved for future wind time-based calculations
        // Update wind direction and strength
        const time = this.animationState.time
        this.animationState.windDirection.x = Math.sin(time * 0.001) * 0.7 + Math.cos(time * 0.0005) * 0.3
        this.animationState.windDirection.y = Math.cos(time * 0.001) * 0.7 + Math.sin(time * 0.0007) * 0.3
        this.animationState.windStrength = 0.3 + Math.sin(time * 0.002) * 0.2

        // Normalize wind direction
        const length = Math.sqrt(
            this.animationState.windDirection.x ** 2 +
            this.animationState.windDirection.y ** 2
        )
        if (length > 0) {
            this.animationState.windDirection.x /= length
            this.animationState.windDirection.y /= length
        }
    }

    // Update movement influence on fur
    updateMovementInfluence() {
        if (this.wolf && this.wolf.velocity) {
            this.animationState.movement.x = this.wolf.velocity.x * this.physics.movementInfluence
            this.animationState.movement.y = this.wolf.velocity.y * this.physics.movementInfluence
        }
    }

    // Update individual fur strand physics
    updateStrand(strand, deltaTime) {
        // Calculate wind force at strand position
        const windForce = this.getWindForceAt(strand.position)

        // Calculate movement force
        const movementForce = {
            x: this.animationState.movement.x * strand.stiffness,
            y: this.animationState.movement.y * strand.stiffness
        }

        // Combine forces
        const totalForce = {
            x: windForce.x + movementForce.x,
            y: windForce.y + movementForce.y + this.physics.gravity
        }

        // Update strand velocity with physics
        strand.velocity.x = (strand.velocity.x + totalForce.x * deltaTime) * strand.damping
        strand.velocity.y = (strand.velocity.y + totalForce.y * deltaTime) * strand.damping

        // Update strand position
        strand.position.x += strand.velocity.x * deltaTime
        strand.position.y += strand.velocity.y * deltaTime

        // Apply spring force back to base position
        const springForce = {
            x: (strand.basePosition.x - strand.position.x) * strand.stiffness,
            y: (strand.basePosition.y - strand.position.y) * strand.stiffness
        }

        strand.velocity.x += springForce.x * deltaTime
        strand.velocity.y += springForce.y * deltaTime

        // Update strand segments
        this.updateStrandSegments(strand, deltaTime)
    }

    // Get wind force at a specific position
    getWindForceAt(position) {
        // Sample wind field at position
        const gridX = Math.floor((position.x + 0.5) * 10) % 20
        const gridY = Math.floor((position.y + 0.5) * 10) % 20

        const windSample = this.windField[gridX]?.[gridY] || { velocity: { x: 0, y: 0 }, turbulence: 1 }

        return {
            x: windSample.velocity.x * this.animationState.windStrength * windSample.turbulence,
            y: windSample.velocity.y * this.animationState.windStrength * windSample.turbulence
        }
    }

    // Update strand segments for more detailed physics
    updateStrandSegments(strand, deltaTime) {
        if (!strand.segments || strand.segments.length === 0) {
            return
        }

        // Update each segment based on parent movement
        for (let i = 0; i < strand.segments.length; i++) {
            const segment = strand.segments[i]

            // Each segment follows the previous one with some lag
            const parentPos = i === 0 ? strand.position : strand.segments[i - 1].position

            // Calculate desired position
            const segmentAngle = strand.curl * Math.sin(this.animationState.time * 0.01 + i * 0.5)
            const desiredX = parentPos.x + Math.cos(segmentAngle) * segment.length
            const desiredY = parentPos.y + Math.sin(segmentAngle) * segment.length

            // Apply spring physics to segment
            const springForce = {
                x: (desiredX - segment.position.x) * 0.5,
                y: (desiredY - segment.position.y) * 0.5
            }

            segment.velocity.x = (segment.velocity.x + springForce.x) * 0.9
            segment.velocity.y = (segment.velocity.y + springForce.y) * 0.9

            segment.position.x += segment.velocity.x * deltaTime
            segment.position.y += segment.velocity.y * deltaTime
        }
    }

    // Sort strands by layer for proper rendering order
    sortStrandsByLayer() {
        const layerOrder = { 'inner': 0, 'outer': 1, 'special': 2 }

        this.strands.sort((a, b) => {
            const layerA = layerOrder[a.layer] || 0
            const layerB = layerOrder[b.layer] || 0
            return layerA - layerB
        })
    }

    // Render fur system
    render(ctx, wolf, camera) {
        ctx.save()

        // If camera provided and not zeroed, apply our own transform
        const hasCamera = camera && typeof camera.x === 'number' && typeof camera.y === 'number'
        const applyTransform = !!(hasCamera && (camera.x !== 0 || camera.y !== 0))
        if (applyTransform) {
            const screenX = wolf.position.x - camera.x
            const screenY = wolf.position.y - camera.y
            ctx.translate(screenX, screenY)
            ctx.scale(wolf.size * wolf.facing, wolf.size)
        }

        // Render fur strands in layer order
        this.strands.forEach(strand => {
            this.renderStrand(ctx, strand)
        })

        ctx.restore()
    }

    // Render individual fur strand
    renderStrand(ctx, strand) {
        ctx.save()

        // Set strand appearance
        ctx.strokeStyle = strand.color
        ctx.lineWidth = strand.thickness
        ctx.globalAlpha = this.rendering.opacity * strand.thickness

        // Special rendering for whiskers
        if (strand.region === 'whisker') {
            ctx.globalAlpha = 0.8
            ctx.lineWidth = 0.8
        }

        // Render strand as curved line
        ctx.beginPath()

        if (strand.segments && strand.segments.length > 0) {
            // Render segmented strand
            ctx.moveTo(strand.position.x, strand.position.y)

            strand.segments.forEach(segment => {
                ctx.lineTo(segment.position.x, segment.position.y)
            })
        } else {
            // Simple strand rendering
            const endX = strand.position.x + Math.cos(strand.angle || 0) * strand.length
            const endY = strand.position.y + Math.sin(strand.angle || 0) * strand.length

            ctx.moveTo(strand.position.x, strand.position.y)
            ctx.quadraticCurveTo(
                strand.position.x + (endX - strand.position.x) * 0.5,
                strand.position.y + (endY - strand.position.y) * 0.5 - strand.curl * 5,
                endX,
                endY
            )
        }

        ctx.stroke()
        ctx.restore()
    }

    // Get fur interaction bounds
    getInteractionBounds() {
        return {
            x: -0.6,
            y: -0.4,
            width: 1.2,
            height: 0.8
        }
    }

    // Apply external force to fur (e.g., from attacks or environment)
    applyForce(position, force, radius) {
        this.strands.forEach(strand => {
            const distance = Math.sqrt(
                (strand.position.x - position.x) ** 2 +
                (strand.position.y - position.y) ** 2
            )

            if (distance < radius) {
                const forceMultiplier = 1 - (distance / radius)
                strand.velocity.x += force.x * forceMultiplier
                strand.velocity.y += force.y * forceMultiplier
            }
        })
    }

    // Reset fur to default state
    reset() {
        this.strands.forEach(strand => {
            strand.position.x = strand.basePosition.x
            strand.position.y = strand.basePosition.y
            strand.velocity.x = 0
            strand.velocity.y = 0
        })
    }

    // Export fur configuration
    exportConfig() {
        return {
            physics: this.physics,
            rendering: this.rendering,
            furTypes: this.furTypes,
            strandCount: this.strands.length
        }
    }
}

export default AdvancedFurSystem
