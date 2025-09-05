// Wolf Body Variations System
// Generates procedural body variations for different wolf types and individuals

export class WolfBodyVariations {
    constructor() {
        // Base variation parameters
        this.variationParameters = {
            size: {
                min: 0.8,
                max: 1.4,
                distribution: 'normal'
            },
            proportions: {
                head: { min: 0.9, max: 1.2 },
                neck: { min: 0.85, max: 1.15 },
                legs: { min: 0.9, max: 1.1 },
                tail: { min: 0.8, max: 1.3 },
                body: { min: 0.9, max: 1.1 }
            },
            muscleTone: {
                min: 0.6,
                max: 1.4,
                distribution: 'normal'
            },
            bodyFat: {
                min: 0.7,
                max: 1.3,
                distribution: 'normal'
            },
            asymmetry: {
                max: 0.05, // Maximum asymmetry factor
                probability: 0.3 // Chance of having some asymmetry
            }
        }

        // Predefined wolf archetypes
        this.archetypes = {
            alpha: {
                sizeMultiplier: 1.2,
                muscleMultiplier: 1.3,
                aggressionMultiplier: 1.2,
                confidenceMultiplier: 1.4,
                features: ['mane', 'scars', 'dominant_posture']
            },
            scout: {
                sizeMultiplier: 0.9,
                muscleMultiplier: 1.1,
                speedMultiplier: 1.3,
                stealthMultiplier: 1.2,
                features: ['sleek_build', 'alert_ears', 'light_foot']
            },
            hunter: {
                sizeMultiplier: 1.1,
                muscleMultiplier: 1.2,
                staminaMultiplier: 1.2,
                precisionMultiplier: 1.1,
                features: ['powerful_legs', 'sharp_teeth', 'muscular_neck']
            },
            omega: {
                sizeMultiplier: 0.85,
                muscleMultiplier: 0.8,
                submissionMultiplier: 1.3,
                survivalMultiplier: 1.1,
                features: ['submissive_posture', 'scars', 'wary_expression']
            },
            elder: {
                sizeMultiplier: 0.95,
                muscleMultiplier: 0.9,
                wisdomMultiplier: 1.4,
                experienceMultiplier: 1.3,
                features: ['weathered_fur', 'battle_scars', 'wise_expression']
            },
            pup: {
                sizeMultiplier: 0.6,
                muscleMultiplier: 0.4,
                playfulnessMultiplier: 1.5,
                learningMultiplier: 1.2,
                features: ['fluffy_fur', 'large_eyes', 'clumsy_gait']
            }
        }

        // Environmental adaptation variations
        this.environmentalAdaptations = {
            forest: {
                legLengthMultiplier: 1.1,
                stealthFeatures: ['camouflage', 'quiet_paws'],
                adaptations: ['branch_navigation', 'undergrowth_maneuvering']
            },
            tundra: {
                sizeMultiplier: 1.15,
                furThicknessMultiplier: 1.3,
                adaptations: ['cold_resistance', 'snow_camouflage']
            },
            desert: {
                sizeMultiplier: 0.9,
                enduranceMultiplier: 1.2,
                adaptations: ['heat_resistance', 'water_conservation']
            },
            mountain: {
                legStrengthMultiplier: 1.2,
                lungCapacityMultiplier: 1.1,
                adaptations: ['climbing_ability', 'altitude_adaptation']
            }
        }

        // Individual variation seed (deterministic if available)
        this.seed = Number((globalThis.runSeedForVisuals ?? 1n) % 10000n)
    }

    // Generate complete body variation for a wolf
    generateBodyVariation(wolfType = 'normal', environment = 'forest', individualSeed = null) {
        // Set seed for reproducible results
        if (individualSeed !== null) {
            this.seed = individualSeed
        }

        const variation = {
            baseProfile: this.getBaseProfile(wolfType, environment),
            individualTraits: this.generateIndividualTraits(),
            anatomicalVariations: this.generateAnatomicalVariations(wolfType),
            visualFeatures: this.generateVisualFeatures(wolfType),
            behavioralTraits: this.generateBehavioralTraits(wolfType),
            environmentalAdaptations: this.getEnvironmentalAdaptations(environment)
        }

        // Combine all variations
        return this.combineVariations(variation)
    }

    // Get base profile for wolf type and environment
    getBaseProfile(wolfType, environment) {
        const archetype = this.archetypes[wolfType] || this.archetypes.scout
        const envAdaptation = this.environmentalAdaptations[environment] || {}

        return {
            archetype,
            environmental: envAdaptation,
            baseSize: this.generateSize(archetype.sizeMultiplier || 1.0),
            baseMuscleTone: this.generateMuscleTone(archetype.muscleMultiplier || 1.0),
            baseBodyFat: this.generateBodyFat()
        }
    }

    // Generate individual size variation
    generateSize(baseMultiplier = 1.0) {
        const params = this.variationParameters.size
        let size = this.randomNormal(params.min, params.max)

        // Apply base multiplier
        size *= baseMultiplier

        // Add some individual variation
        size *= 0.9 + this.seededRandom() * 0.2

        return Math.max(params.min, Math.min(params.max, size))
    }

    // Generate muscle tone variation
    generateMuscleTone(baseMultiplier = 1.0) {
        const params = this.variationParameters.muscleTone
        let tone = this.randomNormal(params.min, params.max)

        // Apply base multiplier
        tone *= baseMultiplier

        // Add individual variation
        tone *= 0.8 + this.seededRandom() * 0.4

        return Math.max(params.min, Math.min(params.max, tone))
    }

    // Generate body fat variation
    generateBodyFat() {
        const params = this.variationParameters.bodyFat
        let fat = this.randomNormal(params.min, params.max)

        // Add individual variation
        fat *= 0.85 + this.seededRandom() * 0.3

        return Math.max(params.min, Math.min(params.max, fat))
    }

    // Generate individual traits
    generateIndividualTraits() {
        return {
            // Physical traits
            dominantEye: this.seededRandom() > 0.5 ? 'left' : 'right',
            pawSize: 0.9 + this.seededRandom() * 0.2,
            tailCurl: -0.2 + this.seededRandom() * 0.4,
            earShape: this.randomChoice(['pointed', 'rounded', 'floppy']),
            noseShape: this.randomChoice(['sharp', 'blunt', 'broad']),

            // Behavioral traits
            temperament: this.randomChoice(['bold', 'cautious', 'curious', 'aggressive', 'submissive']),
            learningStyle: this.randomChoice(['visual', 'kinesthetic', 'observational']),

            // Health traits
            naturalImmunity: 0.7 + this.seededRandom() * 0.6,
            recoveryRate: 0.8 + this.seededRandom() * 0.4,

            // Unique identifiers
            whiskerPattern: this.generateWhiskerPattern(),
            scarPattern: this.generateScarPattern()
        }
    }

    // Generate anatomical variations
    generateAnatomicalVariations(wolfType) {
        const proportions = this.variationParameters.proportions

        return {
            head: {
                length: proportions.head.min + this.seededRandom() * (proportions.head.max - proportions.head.min),
                width: proportions.head.min + this.seededRandom() * (proportions.head.max - proportions.head.min),
                snoutLength: 0.9 + this.seededRandom() * 0.3,
                earSize: 0.8 + this.seededRandom() * 0.4
            },
            neck: {
                length: proportions.neck.min + this.seededRandom() * (proportions.neck.max - proportions.neck.min),
                thickness: proportions.neck.min + this.seededRandom() * (proportions.neck.max - proportions.neck.min)
            },
            body: {
                length: proportions.body.min + this.seededRandom() * (proportions.body.max - proportions.body.min),
                depth: proportions.body.min + this.seededRandom() * (proportions.body.max - proportions.body.min),
                shoulderWidth: 0.9 + this.seededRandom() * 0.3
            },
            legs: {
                front: {
                    upperLength: proportions.legs.min + this.seededRandom() * (proportions.legs.max - proportions.legs.min),
                    lowerLength: proportions.legs.min + this.seededRandom() * (proportions.legs.max - proportions.legs.min),
                    strength: 0.8 + this.seededRandom() * 0.4
                },
                hind: {
                    upperLength: proportions.legs.min + this.seededRandom() * (proportions.legs.max - proportions.legs.min),
                    lowerLength: proportions.legs.min + this.seededRandom() * (proportions.legs.max - proportions.legs.min),
                    strength: 0.8 + this.seededRandom() * 0.4
                }
            },
            tail: {
                length: proportions.tail.min + this.seededRandom() * (proportions.tail.max - proportions.tail.min),
                bushiness: 0.7 + this.seededRandom() * 0.6
            }
        }
    }

    // Generate visual features
    generateVisualFeatures(wolfType) {
        const archetype = this.archetypes[wolfType] || this.archetypes.scout
        const features = []

        // Add archetype-specific features
        if (archetype.features) {
            features.push(...archetype.features)
        }

        // Add random individual features
        const possibleFeatures = [
            'unique_marking', 'asymmetrical_ears', 'curved_claws',
            'patterned_fur', 'iridescent_eyes', 'torn_ear', 'limp'
        ]

        const numExtraFeatures = Math.floor(this.seededRandom() * 3)
        for (let i = 0; i < numExtraFeatures; i++) {
            const feature = possibleFeatures[Math.floor(this.seededRandom() * possibleFeatures.length)]
            if (!features.includes(feature)) {
                features.push(feature)
            }
        }

        return {
            specialFeatures: features,
            colorVariations: this.generateColorVariations(),
            markingPatterns: this.generateMarkingPatterns(),
            asymmetryFactors: this.generateAsymmetryFactors()
        }
    }

    // Generate behavioral traits
    generateBehavioralTraits(wolfType) {
        const archetype = this.archetypes[wolfType] || this.archetypes.scout

        return {
            aggression: this.generateTraitWithArchetype('aggressionMultiplier', archetype),
            confidence: this.generateTraitWithArchetype('confidenceMultiplier', archetype),
            speed: this.generateTraitWithArchetype('speedMultiplier', archetype),
            stamina: this.generateTraitWithArchetype('staminaMultiplier', archetype),
            stealth: this.generateTraitWithArchetype('stealthMultiplier', archetype),
            precision: this.generateTraitWithArchetype('precisionMultiplier', archetype),
            submission: this.generateTraitWithArchetype('submissionMultiplier', archetype),
            playfulness: this.generateTraitWithArchetype('playfulnessMultiplier', archetype),
            wisdom: this.generateTraitWithArchetype('wisdomMultiplier', archetype),
            experience: this.generateTraitWithArchetype('experienceMultiplier', archetype)
        }
    }

    // Generate trait value with archetype influence
    generateTraitWithArchetype(traitName, archetype) {
        const baseValue = 0.8 + this.seededRandom() * 0.4
        const archetypeMultiplier = archetype[traitName] || 1.0

        return Math.max(0.1, Math.min(1.5, baseValue * archetypeMultiplier))
    }

    // Get environmental adaptations
    getEnvironmentalAdaptations(environment) {
        return this.environmentalAdaptations[environment] || {}
    }

    // Generate whisker pattern
    generateWhiskerPattern() {
        const patterns = ['symmetrical', 'offset', 'curved', 'sparse', 'dense']
        return this.randomChoice(patterns)
    }

    // Generate scar pattern
    generateScarPattern() {
        const patterns = ['none', 'single_ear', 'facial', 'body_scar', 'multiple']
        const weights = [0.6, 0.15, 0.1, 0.1, 0.05] // Weighted probabilities

        let random = this.seededRandom()
        for (let i = 0; i < patterns.length; i++) {
            random -= weights[i]
            if (random <= 0) {
                return patterns[i]
            }
        }

        return 'none'
    }

    // Generate color variations
    generateColorVariations() {
        return {
            primary: this.generateColorVariation('#6b5d54'),
            secondary: this.generateColorVariation('#4a4038'),
            belly: this.generateColorVariation('#8b7d74'),
            eyes: this.generateColorVariation('#ffd700'),
            nose: this.generateColorVariation('#1a1a1a')
        }
    }

    // Generate color variation
    generateColorVariation(baseColor) {
        // Simple color variation - in practice you'd parse and modify RGB values
        const variations = [
            baseColor, // Original
            this.lightenColor(baseColor, 0.2),
            this.darkenColor(baseColor, 0.2),
            this.adjustSaturation(baseColor, 0.3)
        ]

        return this.randomChoice(variations)
    }

    // Generate marking patterns
    generateMarkingPatterns() {
        const patterns = []

        if (this.seededRandom() < 0.4) {
            patterns.push({
                type: 'facial_mask',
                position: { x: 0, y: 0 },
                size: 0.8 + this.seededRandom() * 0.4
            })
        }

        if (this.seededRandom() < 0.3) {
            patterns.push({
                type: 'shoulder_marks',
                position: { x: 0.2, y: 0.1 },
                size: 0.6 + this.seededRandom() * 0.4
            })
        }

        if (this.seededRandom() < 0.2) {
            patterns.push({
                type: 'leg_stripes',
                position: { x: 0, y: 0.3 },
                size: 0.7 + this.seededRandom() * 0.3
            })
        }

        return patterns
    }

    // Generate asymmetry factors
    generateAsymmetryFactors() {
        const asymmetry = this.variationParameters.asymmetry

        if (this.seededRandom() > asymmetry.probability) {
            return { hasAsymmetry: false }
        }

        return {
            hasAsymmetry: true,
            earDifference: (this.seededRandom() - 0.5) * asymmetry.max,
            eyeDifference: (this.seededRandom() - 0.5) * asymmetry.max * 0.5,
            legDifference: (this.seededRandom() - 0.5) * asymmetry.max
        }
    }

    // Combine all variations into final profile
    combineVariations(variation) {
        const combined = {
            // Physical characteristics
            size: variation.baseProfile.baseSize,
            muscleTone: variation.baseProfile.baseMuscleTone,
            bodyFat: variation.baseProfile.baseBodyFat,

            // Anatomical proportions
            proportions: variation.anatomicalVariations,

            // Visual appearance
            colors: variation.visualFeatures.colorVariations,
            markings: variation.visualFeatures.markingPatterns,
            features: variation.visualFeatures.specialFeatures,

            // Behavioral traits
            traits: variation.behavioralTraits,

            // Environmental adaptations
            adaptations: variation.environmentalAdaptations,

            // Individual traits
            individual: variation.individualTraits,

            // Asymmetry
            asymmetry: variation.visualFeatures.asymmetryFactors,

            // Metadata
            archetype: variation.baseProfile.archetype,
            seed: this.seed,
            generated: Date.now()
        }

        // Apply environmental modifiers
        this.applyEnvironmentalModifiers(combined)

        return combined
    }

    // Apply environmental modifiers to the combined variation
    applyEnvironmentalModifiers(combined) {
        const env = combined.adaptations

        if (env.sizeMultiplier) {
            combined.size *= env.sizeMultiplier
        }

        if (env.furThicknessMultiplier) {
            combined.furThickness = env.furThicknessMultiplier
        }

        if (env.legLengthMultiplier) {
            combined.proportions.legs.front.upperLength *= env.legLengthMultiplier
            combined.proportions.legs.front.lowerLength *= env.legLengthMultiplier
            combined.proportions.legs.hind.upperLength *= env.legLengthMultiplier
            combined.proportions.legs.hind.lowerLength *= env.legLengthMultiplier
        }

        if (env.legStrengthMultiplier) {
            combined.proportions.legs.front.strength *= env.legStrengthMultiplier
            combined.proportions.legs.hind.strength *= env.legStrengthMultiplier
        }
    }

    // Utility functions
    seededRandom() {
        // Simple seeded random number generator
        this.seed = (this.seed * 9301 + 49297) % 233280
        return this.seed / 233280
    }

    randomNormal(min, max) {
        // Box-Muller transform for normal distribution
        const u1 = this.seededRandom()
        const u2 = this.seededRandom()
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)

        // Scale to desired range
        const mean = (min + max) / 2
        const std = (max - min) / 6 // 99.7% within range
        return Math.max(min, Math.min(max, mean + z0 * std))
    }

    randomChoice(array) {
        return array[Math.floor(this.seededRandom() * array.length)]
    }

    lightenColor(color, amount) {
        // Simple color lightening - in practice use proper color manipulation
        return color // Placeholder
    }

    darkenColor(color, amount) {
        // Simple color darkening - in practice use proper color manipulation
        return color // Placeholder
    }

    adjustSaturation(color, amount) {
        // Simple saturation adjustment - in practice use proper color manipulation
        return color // Placeholder
    }

    // Get variation preset for specific wolf type
    getVariationPreset(wolfType) {
        return this.generateBodyVariation(wolfType, 'forest', this.seed)
    }

    // Generate multiple variations for a pack
    generatePackVariations(packSize, leaderType = 'alpha', environment = 'forest') {
        const variations = []

        // Generate leader first
        variations.push(this.generateBodyVariation(leaderType, environment))

        // Generate pack members
        for (let i = 1; i < packSize; i++) {
            // Vary the seed for each pack member
            this.seed += 1000 + i * 500
            const memberType = this.randomChoice(['normal', 'scout', 'hunter', 'omega'])
            variations.push(this.generateBodyVariation(memberType, environment))
        }

        return variations
    }

    // Export variation data
    exportVariationData(variation) {
        return {
            ...variation,
            exportFormat: 'WolfBodyVariations_v1.0',
            exportedAt: Date.now()
        }
    }

    // Import variation data
    importVariationData(data) {
        if (data.exportFormat !== 'WolfBodyVariations_v1.0') {
            throw new Error('Invalid variation data format')
        }

        this.seed = data.seed
        return data
    }
}

export default WolfBodyVariations
