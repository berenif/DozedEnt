const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const damp = (current, target, deltaTime, speed) => {
    const lambda = Math.exp(-speed * deltaTime)
    return (current * lambda) + (target * (1 - lambda))
}

// Two-bone IK solver for arms (shoulder -> elbow -> wrist -> hand)
const solveArmIK = (shoulderPos, targetHandPos, upperLength, lowerLength, preferDown = true) => {
    const dx = targetHandPos.x - shoulderPos.x
    const dy = targetHandPos.y - shoulderPos.y
    const distance = Math.hypot(dx, dy)
    
    // Clamp to reachable range
    const maxReach = upperLength + lowerLength
    const minReach = Math.abs(upperLength - lowerLength)
    const reachDistance = clamp(distance, minReach + 0.1, maxReach - 0.1)
    
    // Law of cosines for elbow angle
    const cosElbowAngle = (upperLength * upperLength + lowerLength * lowerLength - reachDistance * reachDistance) 
                         / (2 * upperLength * lowerLength)
    const elbowAngle = Math.acos(clamp(cosElbowAngle, -1, 1))
    
    // Angle from shoulder to target
    const shoulderToTargetAngle = Math.atan2(dy, dx)
    
    // Angle from shoulder to elbow
    const cosShoulderAngle = (upperLength * upperLength + reachDistance * reachDistance - lowerLength * lowerLength)
                            / (2 * upperLength * reachDistance)
    const shoulderAngle = Math.acos(clamp(cosShoulderAngle, -1, 1))
    
    // Bend elbow down (positive y) or up based on preference
    const bendDirection = preferDown ? 1 : -1
    const elbowDirection = shoulderToTargetAngle + bendDirection * shoulderAngle
    
    const elbow = {
        x: shoulderPos.x + Math.cos(elbowDirection) * upperLength,
        y: shoulderPos.y + Math.sin(elbowDirection) * upperLength
    }
    
    const wrist = {
        x: elbow.x + Math.cos(shoulderToTargetAngle - bendDirection * (Math.PI - elbowAngle)) * lowerLength,
        y: elbow.y + Math.sin(shoulderToTargetAngle - bendDirection * (Math.PI - elbowAngle)) * lowerLength
    }
    
    return { elbow, wrist }
}

// ArmIKModule resolves hand target positions from combat/locomotion modules
// into natural arm poses with proper elbow bending and wrist orientation.
export default class ArmIKModule {
    constructor(config = {}) {
        this.config = {
            upperArmLength: config.upperArmLength ?? 8,
            forearmLength: config.forearmLength ?? 7,
            handLength: config.handLength ?? 2,
            elbowBias: config.elbowBias ?? 1,  // 1 = down, -1 = up
            wristResponsiveness: config.wristResponsiveness ?? 10
        }
        
        this.wristState = {
            leftRotation: 0,
            rightRotation: 0,
            leftPronation: 0,  // -1 to 1, pronation to supination
            rightPronation: 0
        }
    }

    apply(deltaTime, pose, context) {
        // combat context available if needed for hand targets
        const facing = context.facing ?? 1;
        const state = context.playerState || 'idle';
        
        // Get hand targets from combat module (already set by combat module)
        // We'll use the current hand positions as targets
        const leftTarget = { x: pose.leftArm.hand.x, y: pose.leftArm.hand.y }
        const rightTarget = { x: pose.rightArm.hand.x, y: pose.rightArm.hand.y }
        
        // Get shoulder positions (already set by spine module)
        const shoulderL = { x: pose.leftArm.shoulder.x, y: pose.leftArm.shoulder.y }
        const shoulderR = { x: pose.rightArm.shoulder.x, y: pose.rightArm.shoulder.y }
        
        // Determine elbow bend preference based on state
        const preferDown = true  // Natural human elbow bends downward
        
        // Solve IK for both arms
        const leftIK = solveArmIK(shoulderL, leftTarget, this.config.upperArmLength, this.config.forearmLength, preferDown)
        const rightIK = solveArmIK(shoulderR, rightTarget, this.config.upperArmLength, this.config.forearmLength, preferDown)
        
        // Calculate wrist orientation based on state and movement
        let leftWristRotation;
        let rightWristRotation;
        let leftPronation;
        let rightPronation;
        
        if (state === 'attacking') {
            // Attacking: pronate wrist during swing for power
            const attackPhase = context.normalizedTime ?? 0;
            if (attackPhase >= 0.3 && attackPhase <= 0.7) {
                rightPronation = -0.7;  // Pronated during active swing
                rightWristRotation = facing * 0.3;
            } else {
                rightPronation = 0.2;   // Slightly supinated at rest
                rightWristRotation = 0;
            }
            leftPronation = 0.3;
            leftWristRotation = 0;
        } else if (state === 'blocking') {
            // Blocking: both hands up, slight supination for guard
            leftPronation = 0.4;
            rightPronation = 0.4;
            leftWristRotation = -facing * 0.2;
            rightWristRotation = -facing * 0.2;
        } else {
            // Idle/walking: neutral wrist position
            leftPronation = 0.1;
            rightPronation = 0.1;
            leftWristRotation = 0;
            rightWristRotation = 0;
        }
        
        // Smooth wrist transitions
        this.wristState.leftRotation = damp(this.wristState.leftRotation, leftWristRotation, deltaTime, this.config.wristResponsiveness)
        this.wristState.rightRotation = damp(this.wristState.rightRotation, rightWristRotation, deltaTime, this.config.wristResponsiveness)
        this.wristState.leftPronation = damp(this.wristState.leftPronation, leftPronation, deltaTime, this.config.wristResponsiveness)
        this.wristState.rightPronation = damp(this.wristState.rightPronation, rightPronation, deltaTime, this.config.wristResponsiveness)
        
        // Apply IK results to pose
        pose.leftArm.elbow = leftIK.elbow
        pose.leftArm.wrist = leftIK.wrist
        pose.leftArm.wrist.rotation = this.wristState.leftRotation
        pose.leftArm.wrist.pronation = this.wristState.leftPronation
        
        pose.rightArm.elbow = rightIK.elbow
        pose.rightArm.wrist = rightIK.wrist
        pose.rightArm.wrist.rotation = this.wristState.rightRotation
        pose.rightArm.wrist.pronation = this.wristState.rightPronation
        
        // Update hand positions (slightly offset from wrist)
        const handOffset = this.config.handLength
        pose.leftArm.hand.x = leftIK.wrist.x + Math.cos(this.wristState.leftRotation) * handOffset * facing
        pose.leftArm.hand.y = leftIK.wrist.y + Math.sin(this.wristState.leftRotation) * handOffset
        pose.rightArm.hand.x = rightIK.wrist.x + Math.cos(this.wristState.rightRotation) * handOffset * facing
        pose.rightArm.hand.y = rightIK.wrist.y + Math.sin(this.wristState.rightRotation) * handOffset
        
        return {
            wristOrientations: {
                left: {
                    rotation: this.wristState.leftRotation,
                    pronation: this.wristState.leftPronation
                },
                right: {
                    rotation: this.wristState.rightRotation,
                    pronation: this.wristState.rightPronation
                }
            },
            elbowPositions: {
                left: leftIK.elbow,
                right: rightIK.elbow
            }
        }
    }
}

