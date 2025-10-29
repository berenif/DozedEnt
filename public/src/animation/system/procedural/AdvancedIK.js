/**
 * AdvancedIK - Advanced Inverse Kinematics for limbs
 */

export function createAdvancedIK(options = {}) {
    const {
        armLength = 25,
        forearmLength = 20,
        damping = 0.8,
        stiffness = 0.5,
        maxReach = 40
    } = options;

    return {
        shoulder: { x: 0, y: 0 },
        elbow: { x: 0, y: 0 },
        hand: { x: 0, y: 0 },
        target: { x: 0, y: 0 },
        targetVelocity: { x: 0, y: 0 },
        _buf: {
            shoulder: { x: 0, y: 0 },
            elbow: { x: 0, y: 0 },
            hand: { x: 0, y: 0 },
            target: { x: 0, y: 0 },
            reach: 0,
            stiffness: 0
        },

        // Two-bone IK solver (CCD - Cyclic Coordinate Descent)
        solveIK(targetX, targetY, shoulderX, shoulderY) {
            this.target.x = targetX;
            this.target.y = targetY;
            this.shoulder.x = shoulderX;
            this.shoulder.y = shoulderY;

            // Calculate distance to target
            const dx = targetX - shoulderX;
            const dy = targetY - shoulderY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Clamp to maximum reach
            const clampedDistance = Math.min(distance, maxReach);
            const scale = clampedDistance / distance;
            const clampedTargetX = shoulderX + dx * scale;
            const clampedTargetY = shoulderY + dy * scale;

            // Solve for elbow and hand positions
            const totalLength = armLength + forearmLength;
            const cosAngle = Math.max(-1, Math.min(1, clampedDistance / totalLength));

            // Law of cosines for elbow angle
            const elbowAngle = Math.acos(cosAngle);
            const shoulderAngle = Math.atan2(clampedTargetY - shoulderY, clampedTargetX - shoulderX);

            // Position elbow
            this.elbow.x = shoulderX + Math.cos(shoulderAngle - elbowAngle * 0.5) * armLength;
            this.elbow.y = shoulderY + Math.sin(shoulderAngle - elbowAngle * 0.5) * armLength;

            // Position hand
            this.hand.x = this.elbow.x + Math.cos(shoulderAngle + elbowAngle * 0.5) * forearmLength;
            this.hand.y = this.elbow.y + Math.sin(shoulderAngle + elbowAngle * 0.5) * forearmLength;

            const res = this._buf;
            res.shoulder.x = this.shoulder.x;
            res.shoulder.y = this.shoulder.y;
            res.elbow.x = this.elbow.x;
            res.elbow.y = this.elbow.y;
            res.hand.x = this.hand.x;
            res.hand.y = this.hand.y;
            res.target.x = clampedTargetX;
            res.target.y = clampedTargetY;
            res.reach = clampedDistance / totalLength;
            return res;
        },

        // Smooth IK with velocity prediction
        update(deltaTime, targetX, targetY, shoulderX, shoulderY) {
            // Predict target position based on velocity
            const predictedTargetX = targetX + this.targetVelocity.x * deltaTime * 0.1;
            const predictedTargetY = targetY + this.targetVelocity.y * deltaTime * 0.1;

            // Update target velocity for smoothing
            this.targetVelocity.x = (predictedTargetX - this.target.x) / deltaTime * damping;
            this.targetVelocity.y = (predictedTargetY - this.target.y) / deltaTime * damping;

            // Solve IK with damping
            const solution = this.solveIK(predictedTargetX, predictedTargetY, shoulderX, shoulderY);

            // Apply stiffness damping to joints
            const stiffnessFactor = 1 - Math.exp(-stiffness * deltaTime);

            const res = this._buf;
            res.shoulder.x = solution.shoulder.x;
            res.shoulder.y = solution.shoulder.y;
            res.elbow.x = solution.elbow.x;
            res.elbow.y = solution.elbow.y;
            res.hand.x = solution.hand.x;
            res.hand.y = solution.hand.y;
            res.target.x = solution.target.x;
            res.target.y = solution.target.y;
            res.reach = solution.reach;
            res.stiffness = stiffnessFactor;
            return res;
        }
    };
}
