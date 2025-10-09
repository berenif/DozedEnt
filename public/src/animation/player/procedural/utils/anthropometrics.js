// Simple seeded PRNG (Mulberry32)
const createRng = (seed) => {
    let t = (seed >>> 0) || 0x9e3779b9
    return function() {
        t += 0x6D2B79F5
        let r = Math.imul(t ^ (t >>> 15), 1 | t)
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
}

const remap = (v, min = 0.9, max = 1.1) => min + v * (max - min)

export function generateAnthropometrics(seed = 0x12345678) {
    const rng = createRng(seed)
    return {
        overallScale: remap(rng(), 0.95, 1.08),
        spineLengthScale: remap(rng(), 0.95, 1.08),
        armLengthScale: remap(rng(), 0.9, 1.12),
        forearmLengthScale: remap(rng(), 0.9, 1.12),
        handLengthScale: remap(rng(), 0.9, 1.15),
        thighLengthScale: remap(rng(), 0.9, 1.12),
        shinLengthScale: remap(rng(), 0.9, 1.12),
        footLengthScale: remap(rng(), 0.9, 1.12)
    }
}

export function generateAsymmetry(seed = 0xabcdef) {
    const rng = createRng(seed)
    // Subtle phase offsets and arm swing bias
    const phaseRange = 0.03
    return {
        leftPhaseOffset: (rng() - 0.5) * phaseRange,
        rightPhaseOffset: (rng() - 0.5) * phaseRange,
        armSwingBias: (rng() - 0.5) * 0.2
    }
}


