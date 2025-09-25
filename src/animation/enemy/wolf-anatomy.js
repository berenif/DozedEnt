// Wolf Anatomy System
// Provides anatomically accurate wolf proportions and measurements based on real wolf biology

export class WolfAnatomy {
    constructor() {
        // Real wolf anatomical proportions (scaled for game)
        // Based on measurements from gray wolves (Canis lupus)
        this.canonicalProportions = {
            // Overall body ratios
            bodyLength: 1.0,           // Full body length (nose to tail base)
            bodyHeight: 0.32,          // Height at shoulder
            bodyDepth: 0.28,           // Body depth (front to back)

            // Head proportions
            headLength: 0.23,          // Head length (nose to back of skull)
            headWidth: 0.16,           // Head width at widest point
            headHeight: 0.14,          // Head height
            snoutLength: 0.11,         // Snout length
            snoutWidth: 0.06,          // Snout width

            // Neck proportions
            neckLength: 0.14,          // Neck length
            neckWidth: 0.08,           // Neck width at base
            neckDepth: 0.07,           // Neck depth

            // Leg proportions (front legs)
            frontLegUpper: 0.18,       // Upper front leg length
            frontLegLower: 0.14,       // Lower front leg length
            frontLegWidth: 0.05,       // Front leg width
            frontPawLength: 0.07,      // Front paw length
            frontPawWidth: 0.06,       // Front paw width

            // Leg proportions (hind legs)
            hindLegUpper: 0.20,        // Upper hind leg length
            hindLegLower: 0.15,        // Lower hind leg length
            hindLegWidth: 0.06,        // Hind leg width
            hindPawLength: 0.08,       // Hind paw length
            hindPawWidth: 0.07,        // Hind paw width

            // Tail proportions
            tailLength: 0.42,          // Tail length
            tailBaseWidth: 0.08,       // Tail width at base
            tailTipWidth: 0.02,        // Tail width at tip

            // Ear proportions
            earHeight: 0.10,           // Ear height
            earWidth: 0.04,            // Ear width
            earBaseWidth: 0.06,        // Ear base width

            // Eye proportions
            eyeSize: 0.025,            // Eye diameter
            eyeSpacing: 0.045,         // Distance between eyes

            // Nose proportions
            noseWidth: 0.015,          // Nose width
            noseHeight: 0.012,         // Nose height

            // Muscle groups (relative sizes)
            shoulderMuscles: 0.15,     // Shoulder muscle mass
            neckMuscles: 0.08,         // Neck muscle mass
            legMuscles: 0.12,          // Leg muscle mass
            jawMuscles: 0.04           // Jaw muscle mass
        }

        // Age-based proportion variations
        this.ageVariations = {
            pup: {
                scale: 0.4,
                headRatio: 1.3,
                legRatio: 0.8,
                bodyRatio: 0.9
            },
            juvenile: {
                scale: 0.7,
                headRatio: 1.15,
                legRatio: 0.9,
                bodyRatio: 0.95
            },
            adult: {
                scale: 1.0,
                headRatio: 1.0,
                legRatio: 1.0,
                bodyRatio: 1.0
            },
            elder: {
                scale: 0.95,
                headRatio: 0.95,
                legRatio: 0.95,
                bodyRatio: 0.98
            }
        }

        // Sex-based proportion variations
        this.sexVariations = {
            male: {
                sizeMultiplier: 1.1,
                muscleMultiplier: 1.15,
                neckMultiplier: 1.1,
                headMultiplier: 1.05
            },
            female: {
                sizeMultiplier: 0.95,
                muscleMultiplier: 0.9,
                neckMultiplier: 0.95,
                headMultiplier: 0.98
            }
        }

        // Breed variations (different wolf subspecies)
        this.breedVariations = {
            gray: {
                sizeMultiplier: 1.0,
                legMultiplier: 1.0,
                headMultiplier: 1.0,
                tailMultiplier: 1.0
            },
            arctic: {
                sizeMultiplier: 1.05,
                legMultiplier: 1.1,
                headMultiplier: 0.95,
                tailMultiplier: 1.0
            },
            mexican: {
                sizeMultiplier: 0.85,
                legMultiplier: 0.9,
                headMultiplier: 1.05,
                tailMultiplier: 0.95
            },
            timber: {
                sizeMultiplier: 1.15,
                legMultiplier: 1.05,
                headMultiplier: 1.0,
                tailMultiplier: 1.1
            },
            red: {
                sizeMultiplier: 0.9,
                legMultiplier: 0.95,
                headMultiplier: 0.95,
                tailMultiplier: 1.0
            }
        }

        // Health condition variations
        this.conditionVariations = {
            healthy: {
                muscleTone: 1.0,
                bodyFat: 1.0,
                posture: 1.0
            },
            injured: {
                muscleTone: 0.7,
                bodyFat: 0.9,
                posture: 0.8
            },
            starving: {
                muscleTone: 0.5,
                bodyFat: 0.6,
                posture: 0.7
            },
            well_fed: {
                muscleTone: 1.0,
                bodyFat: 1.2,
                posture: 1.0
            }
        }

        // Current wolf characteristics
        this.currentProfile = {
            age: 'adult',
            sex: 'male',
            breed: 'gray',
            condition: 'healthy',
            size: 1.0
        }
    }

    // Get complete anatomical profile for a wolf
    getAnatomicalProfile(profile = {}) {
        // Merge with defaults
        const currentProfile = { ...this.currentProfile, ...profile }
        this.currentProfile = currentProfile

        // Start with canonical proportions
        let proportions = { ...this.canonicalProportions }

        // Apply size multiplier
        proportions = this.applySizeMultiplier(proportions, currentProfile.size)

        // Apply age variations
        proportions = this.applyAgeVariations(proportions, currentProfile.age)

        // Apply sex variations
        proportions = this.applySexVariations(proportions, currentProfile.sex)

        // Apply breed variations
        proportions = this.applyBreedVariations(proportions, currentProfile.breed)

        // Apply condition variations
        proportions = this.applyConditionVariations(proportions, currentProfile.condition)

        // Calculate derived measurements
        proportions = this.calculateDerivedMeasurements(proportions)

        return {
            profile: currentProfile,
            proportions,
            bodyParts: this.generateBodyPartDefinitions(proportions),
            muscleGroups: this.generateMuscleDefinitions(proportions),
            furDistribution: this.generateFurDistribution(proportions)
        }
    }

    // Apply overall size multiplier
    applySizeMultiplier(proportions, size) {
        const scaled = {}
        Object.keys(proportions).forEach(key => {
            scaled[key] = proportions[key] * size
        })
        return scaled
    }

    // Apply age-based variations
    applyAgeVariations(proportions, age) {
        const variation = this.ageVariations[age] || this.ageVariations.adult

        const scaled = { ...proportions }

        // Apply age-specific scaling
        scaled.headLength *= variation.headRatio
        scaled.headWidth *= variation.headRatio
        scaled.headHeight *= variation.headRatio

        scaled.frontLegUpper *= variation.legRatio
        scaled.frontLegLower *= variation.legRatio
        scaled.hindLegUpper *= variation.legRatio
        scaled.hindLegLower *= variation.legRatio

        scaled.bodyLength *= variation.bodyRatio
        scaled.bodyHeight *= variation.bodyRatio
        scaled.bodyDepth *= variation.bodyRatio

        return scaled
    }

    // Apply sex-based variations
    applySexVariations(proportions, sex) {
        const variation = this.sexVariations[sex] || this.sexVariations.male

        const scaled = { ...proportions }

        // Apply sex-specific scaling
        Object.keys(scaled).forEach(key => {
            scaled[key] *= variation.sizeMultiplier
        })

        // Specific adjustments
        scaled.neckLength *= variation.neckMultiplier
        scaled.neckWidth *= variation.neckMultiplier
        scaled.headLength *= variation.headMultiplier
        scaled.headWidth *= variation.headMultiplier

        scaled.shoulderMuscles *= variation.muscleMultiplier
        scaled.neckMuscles *= variation.muscleMultiplier
        scaled.legMuscles *= variation.muscleMultiplier

        return scaled
    }

    // Apply breed-specific variations
    applyBreedVariations(proportions, breed) {
        const variation = this.breedVariations[breed] || this.breedVariations.gray

        const scaled = { ...proportions }

        // Apply breed-specific scaling
        Object.keys(scaled).forEach(key => {
            scaled[key] *= variation.sizeMultiplier
        })

        // Specific breed adjustments
        scaled.frontLegUpper *= variation.legMultiplier
        scaled.frontLegLower *= variation.legMultiplier
        scaled.hindLegUpper *= variation.legMultiplier
        scaled.hindLegLower *= variation.legMultiplier

        scaled.headLength *= variation.headMultiplier
        scaled.headWidth *= variation.headMultiplier

        scaled.tailLength *= variation.tailMultiplier

        return scaled
    }

    // Apply health condition variations
    applyConditionVariations(proportions, condition) {
        const variation = this.conditionVariations[condition] || this.conditionVariations.healthy

        const scaled = { ...proportions }

        // Apply muscle tone
        scaled.shoulderMuscles *= variation.muscleTone
        scaled.neckMuscles *= variation.muscleTone
        scaled.legMuscles *= variation.muscleTone
        scaled.jawMuscles *= variation.muscleTone

        // Apply body fat (affects overall proportions slightly)
        const fatMultiplier = variation.bodyFat
        scaled.bodyDepth *= fatMultiplier
        scaled.bodyHeight *= Math.sqrt(fatMultiplier) // Less effect on height

        return scaled
    }

    // Calculate derived anatomical measurements
    calculateDerivedMeasurements(proportions) {
        const derived = { ...proportions }

        // Calculate total height (including legs)
        derived.totalHeight = proportions.bodyHeight + proportions.frontLegUpper + proportions.frontLegLower

        // Calculate body mass estimate (rough approximation)
        derived.bodyMass = this.calculateBodyMass(proportions)

        // Calculate leg joint positions
        derived.frontLegJointY = proportions.bodyHeight
        derived.hindLegJointY = proportions.bodyHeight * 0.9

        // Calculate center of mass
        derived.centerOfMass = {
            x: proportions.bodyLength * 0.45,
            y: proportions.bodyHeight * 0.5
        }

        // Calculate balance points
        derived.balancePoint = proportions.bodyLength * 0.55

        return derived
    }

    // Estimate body mass based on proportions
    calculateBodyMass(proportions) {
        // Rough mass estimation based on volume approximations
        const bodyVolume = proportions.bodyLength * proportions.bodyWidth * proportions.bodyDepth
        const headVolume = proportions.headLength * proportions.headWidth * proportions.headHeight
        const legVolume = (proportions.frontLegUpper + proportions.frontLegLower) *
                         proportions.frontLegWidth * proportions.bodyWidth * 4

        const totalVolume = bodyVolume + headVolume + legVolume

        // Convert volume to mass (rough approximation for game purposes)
        return totalVolume * 1000
    }

    // Generate detailed body part definitions
    generateBodyPartDefinitions(proportions) {
        return {
            head: {
                position: { x: proportions.bodyLength * 0.75, y: proportions.bodyHeight * 0.8 },
                size: { width: proportions.headWidth, height: proportions.headHeight },
                rotation: 0,
                parts: {
                    skull: {
                        position: { x: 0, y: 0 },
                        size: { width: proportions.headWidth * 0.8, height: proportions.headHeight * 0.7 }
                    },
                    snout: {
                        position: { x: proportions.headWidth * 0.4, y: 0 },
                        size: { width: proportions.snoutLength, height: proportions.headHeight * 0.4 }
                    },
                    ears: {
                        left: {
                            position: { x: -proportions.headWidth * 0.3, y: -proportions.headHeight * 0.2 },
                            size: { width: proportions.earWidth, height: proportions.earHeight }
                        },
                        right: {
                            position: { x: proportions.headWidth * 0.3, y: -proportions.headHeight * 0.2 },
                            size: { width: proportions.earWidth, height: proportions.earHeight }
                        }
                    },
                    eyes: {
                        left: {
                            position: { x: -proportions.eyeSpacing * 0.5, y: -proportions.headHeight * 0.1 },
                            size: proportions.eyeSize
                        },
                        right: {
                            position: { x: proportions.eyeSpacing * 0.5, y: -proportions.headHeight * 0.1 },
                            size: proportions.eyeSize
                        }
                    },
                    nose: {
                        position: { x: proportions.headWidth * 0.5, y: proportions.headHeight * 0.1 },
                        size: { width: proportions.noseWidth, height: proportions.noseHeight }
                    }
                }
            },
            neck: {
                position: { x: proportions.bodyLength * 0.6, y: proportions.bodyHeight * 0.7 },
                size: { width: proportions.neckWidth, height: proportions.neckLength },
                curve: 0.2
            },
            torso: {
                position: { x: proportions.bodyLength * 0.4, y: proportions.bodyHeight * 0.5 },
                size: {
                    width: proportions.bodyLength * 0.5,
                    height: proportions.bodyHeight,
                    depth: proportions.bodyDepth
                },
                parts: {
                    shoulders: {
                        position: { x: 0, y: proportions.bodyHeight * 0.8 },
                        size: { width: proportions.bodyLength * 0.3, height: proportions.bodyHeight * 0.3 }
                    },
                    ribcage: {
                        position: { x: 0, y: proportions.bodyHeight * 0.5 },
                        size: { width: proportions.bodyLength * 0.4, height: proportions.bodyHeight * 0.6 }
                    },
                    hips: {
                        position: { x: -proportions.bodyLength * 0.2, y: proportions.bodyHeight * 0.4 },
                        size: { width: proportions.bodyLength * 0.25, height: proportions.bodyHeight * 0.4 }
                    }
                }
            },
            legs: {
                front: {
                    left: this.generateLegDefinition(proportions, 'front', 'left'),
                    right: this.generateLegDefinition(proportions, 'front', 'right')
                },
                hind: {
                    left: this.generateLegDefinition(proportions, 'hind', 'left'),
                    right: this.generateLegDefinition(proportions, 'hind', 'right')
                }
            },
            tail: {
                position: { x: -proportions.bodyLength * 0.35, y: proportions.bodyHeight * 0.6 },
                length: proportions.tailLength,
                baseWidth: proportions.tailBaseWidth,
                tipWidth: proportions.tailTipWidth,
                segments: 8
            }
        }
    }

    // Generate leg definition
    generateLegDefinition(proportions, type, side) {
        const isFront = type === 'front'
        const isLeft = side === 'left'

        const upperLength = isFront ? proportions.frontLegUpper : proportions.hindLegUpper
        const lowerLength = isFront ? proportions.frontLegLower : proportions.hindLegLower
        const width = isFront ? proportions.frontLegWidth : proportions.hindLegWidth

        const baseX = isFront ?
            proportions.bodyLength * (isLeft ? 0.25 : 0.35) :
            proportions.bodyLength * (isLeft ? -0.15 : -0.05)
        const baseY = proportions.bodyHeight * (isFront ? 0.9 : 0.8)

        return {
            position: { x: baseX, y: baseY },
            upper: {
                length: upperLength,
                width: width,
                angle: isFront ? -0.2 : 0.1
            },
            lower: {
                length: lowerLength,
                width: width * 0.8,
                angle: isFront ? 0.3 : -0.2
            },
            paw: {
                length: isFront ? proportions.frontPawLength : proportions.hindPawLength,
                width: isFront ? proportions.frontPawWidth : proportions.hindPawWidth,
                angle: 0
            }
        }
    }

    // Generate muscle group definitions
    generateMuscleDefinitions(proportions) {
        return {
            shoulders: {
                position: { x: proportions.bodyLength * 0.4, y: proportions.bodyHeight * 0.8 },
                size: proportions.shoulderMuscles,
                definition: 0.8,
                tension: 0
            },
            neck: {
                position: { x: proportions.bodyLength * 0.6, y: proportions.bodyHeight * 0.7 },
                size: proportions.neckMuscles,
                definition: 0.6,
                tension: 0
            },
            legs: {
                front: {
                    left: { size: proportions.legMuscles * 0.6, definition: 0.7, tension: 0 },
                    right: { size: proportions.legMuscles * 0.6, definition: 0.7, tension: 0 }
                },
                hind: {
                    left: { size: proportions.legMuscles * 0.8, definition: 0.7, tension: 0 },
                    right: { size: proportions.legMuscles * 0.8, definition: 0.7, tension: 0 }
                }
            },
            jaw: {
                position: { x: proportions.bodyLength * 0.75, y: proportions.bodyHeight * 0.65 },
                size: proportions.jawMuscles,
                definition: 0.9,
                tension: 0
            }
        }
    }

    // Generate fur distribution patterns
    generateFurDistribution(proportions) {
        return {
            guardHairs: {
                density: 0.8,
                length: proportions.bodyLength * 0.05,
                regions: ['back', 'shoulders', 'neck']
            },
            undercoat: {
                density: 1.2,
                length: proportions.bodyLength * 0.03,
                regions: ['belly', 'inner_legs', 'chest']
            },
            whiskers: {
                density: 0.3,
                length: proportions.bodyLength * 0.08,
                regions: ['snout']
            },
            tailFur: {
                density: 1.0,
                length: proportions.bodyLength * 0.06,
                regions: ['tail']
            },
            earFur: {
                density: 0.9,
                length: proportions.bodyLength * 0.02,
                regions: ['ears']
            }
        }
    }

    // Get proportion for specific wolf type
    getProportionForWolf(wolfType, proportionName) {
        const profile = this.getWolfTypeProfile(wolfType)
        const anatomy = this.getAnatomicalProfile(profile)
        return anatomy.proportions[proportionName]
    }

    // Get profile for predefined wolf types
    getWolfTypeProfile(wolfType) {
        const profiles = {
            normal: { age: 'adult', sex: 'male', breed: 'gray', condition: 'healthy', size: 1.0 },
            alpha: { age: 'adult', sex: 'male', breed: 'timber', condition: 'healthy', size: 1.2 },
            scout: { age: 'adult', sex: 'female', breed: 'gray', condition: 'healthy', size: 0.9 },
            hunter: { age: 'adult', sex: 'male', breed: 'red', condition: 'healthy', size: 1.1 },
            pup: { age: 'pup', sex: 'male', breed: 'gray', condition: 'healthy', size: 0.6 },
            elder: { age: 'elder', sex: 'female', breed: 'gray', condition: 'healthy', size: 0.95 },
            injured: { age: 'adult', sex: 'male', breed: 'gray', condition: 'injured', size: 1.0 },
            starving: { age: 'adult', sex: 'male', breed: 'gray', condition: 'starving', size: 0.9 }
        }

        return profiles[wolfType] || profiles.normal
    }

    // Validate proportions for anatomical correctness
    validateProportions(proportions) {
        const issues = []

        // Check head proportions
        if (proportions.headLength > proportions.bodyLength * 0.3) {
            issues.push('Head length too large for body')
        }

        // Check leg proportions
        if (proportions.frontLegUpper + proportions.frontLegLower > proportions.bodyHeight * 1.5) {
            issues.push('Legs too long for body height')
        }

        // Check tail proportions
        if (proportions.tailLength > proportions.bodyLength * 0.6) {
            issues.push('Tail too long for body')
        }

        // Check muscle proportions
        const totalMuscleMass = proportions.shoulderMuscles + proportions.neckMuscles +
                              proportions.legMuscles + proportions.jawMuscles
        if (totalMuscleMass > proportions.bodyMass * 0.5) {
            issues.push('Muscle mass too high for body size')
        }

        return {
            valid: issues.length === 0,
            issues
        }
    }

    // Export anatomy data for external use
    exportAnatomyData(wolfType = 'normal') {
        const profile = this.getWolfTypeProfile(wolfType)
        const anatomy = this.getAnatomicalProfile(profile)
        const validation = this.validateProportions(anatomy.proportions)

        return {
            profile,
            proportions: anatomy.proportions,
            bodyParts: anatomy.bodyParts,
            muscleGroups: anatomy.muscleGroups,
            furDistribution: anatomy.furDistribution,
            validation,
            metadata: {
                version: '1.0',
                source: 'Wolf Anatomy System',
                based_on: 'Canis lupus measurements'
            }
        }
    }

    // Get joint positions for animation
    getJointPositions(proportions) {
        return {
            head: { x: proportions.bodyLength * 0.75, y: proportions.bodyHeight * 0.8 },
            neck: { x: proportions.bodyLength * 0.6, y: proportions.bodyHeight * 0.7 },
            shoulders: { x: proportions.bodyLength * 0.4, y: proportions.bodyHeight * 0.8 },
            hips: { x: proportions.bodyLength * 0.2, y: proportions.bodyHeight * 0.6 },
            frontLeftKnee: {
                x: proportions.bodyLength * 0.25,
                y: proportions.bodyHeight * 0.9 - proportions.frontLegUpper
            },
            frontRightKnee: {
                x: proportions.bodyLength * 0.35,
                y: proportions.bodyHeight * 0.9 - proportions.frontLegUpper
            },
            hindLeftKnee: {
                x: proportions.bodyLength * -0.15,
                y: proportions.bodyHeight * 0.8 - proportions.hindLegUpper
            },
            hindRightKnee: {
                x: proportions.bodyLength * -0.05,
                y: proportions.bodyHeight * 0.8 - proportions.hindLegUpper
            },
            tailBase: { x: -proportions.bodyLength * 0.35, y: proportions.bodyHeight * 0.6 }
        }
    }
}

export default WolfAnatomy
