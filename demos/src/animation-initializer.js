// Animation module initializer for WASM Combat Demo
export async function initializeAnimationModules() {
    let RealisticProceduralAnimator, ProceduralAnimator, CharacterAnimator;
    
    try {
        const animationModule = await import('./animation/realistic-procedural-animator.js');
        RealisticProceduralAnimator = animationModule.RealisticProceduralAnimator || animationModule.default;
        
        const systemModule = await import('./animation/animation-system.js');
        ProceduralAnimator = systemModule.ProceduralAnimator;
        CharacterAnimator = systemModule.CharacterAnimator;
    } catch (error) {
        console.warn('Could not load advanced animation modules:', error);
        // Provide simple fallback classes
        RealisticProceduralAnimator = class {
            constructor() {}
            update() { return { scaleX: 1, scaleY: 1, rotation: 0, offsetX: 0, offsetY: 0 }; }
            config = { renderSkeleton: false, renderIKTargets: false, renderSecondaryMotion: false };
        };
        ProceduralAnimator = class {
            createBreathingAnimation() { return { modulateForState() {}, update() { return { scaleX: 1, scaleY: 1, offsetY: 0 }; } }; }
            createMomentumSystem() { return { update() { return { leanAngle: 0, stretchFactor: 0, bounceFactor: 0 }; }, addImpulse() {} }; }
            createSquashStretch() { return { trigger() {}, update() { return { scaleX: 1, scaleY: 1 }; } }; }
            createAnticipation() { return { trigger() {}, update() { return { scaleX: 1, scaleY: 1, offsetX: 0 }; }, active: false, phase: 'idle' }; }
            createWobble() { return { impulse() {}, update() { return { scaleX: 1, scaleY: 1, rotation: 0 }; }, displacement: 0, velocity: 0 }; }
            createSecondaryMotion() { return { initialize() {}, update() { return []; } }; }
            createTrailEffect() { return { clear() {}, update() { return []; } }; }
            createIdleLookAround() { return { update() { return { headRotation: 0, headOffsetX: 0, headOffsetY: 0 }; }, reset() {} }; }
            createIdleWeightShift() { return { update() { return { weightOffsetX: 0, weightOffsetY: 0, bodyLean: 0 }; }, reset() {} }; }
            createIdleMicroMovements() { return { update() { return { handOffsetX: 0, handOffsetY: 0, shoulderRotation: 0 }; }, reset() {} }; }
        };
    }
    
    // Make the animation classes globally available
    globalThis.RealisticProceduralAnimator = RealisticProceduralAnimator;
    globalThis.ProceduralAnimator = ProceduralAnimator;
    globalThis.CharacterAnimator = CharacterAnimator;
    
    return { RealisticProceduralAnimator, ProceduralAnimator, CharacterAnimator };
}
