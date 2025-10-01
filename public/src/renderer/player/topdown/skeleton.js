// Drawing the player from an ISOMETRIC perspective (3/4 view with depth)
// Isometric projection: true 2:1 diamond, 45° rotate + 0.5 vertical scale
import { setScreenSpaceStroke, setDefaultLineStyles, singleBendIK } from './utils.js'

// Isometric coordinate transformation helper
function toIso(x, y, z = 0) {
	// True 2:1 mapping: rotate 45° in XY, scale vertical by 0.5
	// Produces exact 2:1 pixel ratio (diamond grid)
	return {
		x: (x - y),          // 45° rotate; no extra scale to preserve 2:1
		y: (x + y) * 0.5 - z // compress vertical by half; subtract height z
	}
}

export function drawTopDownSkeleton(ctx, state, position, baseRadius, skeleton, yaw = 0) {
	// Isometric character with 3D depth and perspective
	const hurt = state.anim === 'hurt'
	const isAttacking = state.anim === 'attacking'
	const isBlocking = state.anim === 'blocking'

	// Consistent line styles
	setDefaultLineStyles(ctx)

	// Determine draw order based on facing yaw (-PI..PI, 0 = facing right)
	function limbOrder(angle) {
		if (angle > -Math.PI * 0.25 && angle < Math.PI * 0.25) {
			return ['backLeg','backArm','torsoLower','torsoUpper','frontLeg','frontArm','neck','head']
		}
		if (angle >= Math.PI * 0.25 && angle <= Math.PI * 0.75) {
			return ['backArm','backLeg','torsoLower','torsoUpper','frontArm','frontLeg','neck','head']
		}
		if (angle <= -Math.PI * 0.25 && angle >= -Math.PI * 0.75) {
			return ['backArm','backLeg','torsoLower','torsoUpper','frontArm','frontLeg','neck','head']
		}
		return ['frontLeg','frontArm','torsoLower','torsoUpper','backLeg','backArm','neck','head']
	}

	function sidesFor(angle) {
		// Simple mapping: facing right/up -> left is front; facing left/down -> right is front
		if (angle > -Math.PI * 0.25 && angle < Math.PI * 0.75) {
			return { front: 'left', back: 'right' }
		}
		return { front: 'right', back: 'left' }
	}

	const order = limbOrder(yaw || 0)
	const sides = sidesFor(yaw || 0)

	for (const part of order) {
		if (part === 'torsoLower') {
			drawIsometricLowerBody(ctx, position, baseRadius)
		} else if (part === 'torsoUpper') {
			drawIsometricUpperBody(ctx, position, baseRadius, hurt)
		} else if (part === 'neck') {
			drawIsometricNeck(ctx, position, baseRadius)
		} else if (part === 'head') {
			drawIsometricHead(ctx, position, baseRadius, hurt)
		} else if (part === 'frontArm') {
			drawIsometricArm(ctx, position, baseRadius, skeleton[sides.front + 'Arm'], sides.front, state)
		} else if (part === 'backArm') {
			drawIsometricArm(ctx, position, baseRadius, skeleton[sides.back + 'Arm'], sides.back, state)
		} else if (part === 'frontLeg') {
			drawIsometricLeg(ctx, position, baseRadius, skeleton[sides.front + 'Leg'], sides.front, state)
		} else if (part === 'backLeg') {
			drawIsometricLeg(ctx, position, baseRadius, skeleton[sides.back + 'Leg'], sides.back, state)
		}
	}
}

// Draw isometric head with hair and facial features
function drawIsometricHead(ctx, position, baseRadius, hurt) {
	const headRadius = baseRadius * 0.22
	const headHeight = baseRadius * 0.82 // Z height above body (reduced to connect with neck)
	
	// Transform head position to isometric space
	const isoPos = toIso(0, 0, headHeight)
	const headX = position.x + isoPos.x
	const headY = position.y + isoPos.y
	
	ctx.save()
	
	// Hair/Head top (slightly oval for isometric perspective)
	const hairRadius = headRadius * 1.15
	ctx.fillStyle = '#3d2817' // Dark brown hair
	ctx.beginPath()
	ctx.ellipse(headX, headY, hairRadius, hairRadius * 0.8, 0, 0, Math.PI * 2)
	ctx.fill()
	
	// Face (skin tone) - front-facing oval
	ctx.fillStyle = hurt ? '#ffb3b3' : '#ffd4a3'
	ctx.beginPath()
	ctx.ellipse(headX, headY, headRadius * 0.85, headRadius * 0.75, 0, 0, Math.PI * 2)
	ctx.fill()
	
	// Face outline
	ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
	setScreenSpaceStroke(ctx, 1.5)
	ctx.stroke()
	
	// Eyes (visible from isometric angle)
	ctx.fillStyle = '#2c1810'
	const eyeY = headY - headRadius * 0.1
	const eyeSpacing = headRadius * 0.4
	const eyeSize = 2.5
	ctx.beginPath()
	ctx.ellipse(headX - eyeSpacing, eyeY, eyeSize * 0.8, eyeSize, 0, 0, Math.PI * 2)
	ctx.ellipse(headX + eyeSpacing, eyeY, eyeSize * 0.8, eyeSize, 0, 0, Math.PI * 2)
	ctx.fill()
	
	// Nose (small 3D-ish shape)
	ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
	ctx.beginPath()
	ctx.moveTo(headX, headY)
	ctx.lineTo(headX - 2, headY + headRadius * 0.2)
	ctx.lineTo(headX + 2, headY + headRadius * 0.2)
	ctx.fill()
	
	// Mouth (curved smile)
	ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
	setScreenSpaceStroke(ctx, 1.5)
	ctx.lineCap = 'round'
	ctx.beginPath()
	ctx.arc(headX, headY + headRadius * 0.1, headRadius * 0.3, 0.2, Math.PI - 0.2)
	ctx.stroke()
	
	ctx.restore()
}

// Draw isometric neck connecting head to shoulders
function drawIsometricNeck(ctx, position, baseRadius) {
	ctx.save()
	
	const neckHeight = baseRadius * 0.76
	const neckTop = toIso(0, 0, neckHeight)
	const neckBottom = toIso(0, 0, neckHeight * 0.92)
	
	const neckWidth = baseRadius * 0.08
	
	// Neck cylinder in isometric view (trapezoid)
	ctx.fillStyle = '#ffd4a3' // Skin tone
	ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)'
	setScreenSpaceStroke(ctx, 1.5)
	
	ctx.beginPath()
	ctx.moveTo(position.x + neckTop.x - neckWidth, position.y + neckTop.y)
	ctx.lineTo(position.x + neckTop.x + neckWidth, position.y + neckTop.y)
	ctx.lineTo(position.x + neckBottom.x + neckWidth * 1.2, position.y + neckBottom.y)
	ctx.lineTo(position.x + neckBottom.x - neckWidth * 1.2, position.y + neckBottom.y)
	ctx.closePath()
	ctx.fill()
	ctx.stroke()
	
	ctx.restore()
}

// Draw isometric upper body (chest and shoulders) as 3D box
function drawIsometricUpperBody(ctx, position, baseRadius, hurt) {
	ctx.save()
	
	const torsoHeight = baseRadius * 0.65 // Z height
	const shoulderWidth = baseRadius * 0.45
	const torsoDepth = baseRadius * 0.32
	
	// Shirt color
	const shirtColor = hurt ? '#ef4444' : '#3b82f6'
	const shirtDark = hurt ? '#dc2626' : '#2563eb'
	const shirtLight = hurt ? '#f87171' : '#60a5fa'
	
	// Transform corners to isometric space
	const topFrontLeft = toIso(-shoulderWidth / 2, torsoDepth / 2, torsoHeight)
	const topFrontRight = toIso(shoulderWidth / 2, torsoDepth / 2, torsoHeight)
	const topBackLeft = toIso(-shoulderWidth / 2, -torsoDepth / 2, torsoHeight)
	const topBackRight = toIso(shoulderWidth / 2, -torsoDepth / 2, torsoHeight)
	const bottomFrontLeft = toIso(-shoulderWidth / 2, torsoDepth / 2, torsoHeight * 0.5)
	const bottomFrontRight = toIso(shoulderWidth / 2, torsoDepth / 2, torsoHeight * 0.5)
	const bottomBackLeft = toIso(-shoulderWidth / 2, -torsoDepth / 2, torsoHeight * 0.5)
	const bottomBackRight = toIso(shoulderWidth / 2, -torsoDepth / 2, torsoHeight * 0.5)
	
	// Draw visible faces of the torso box
	// Left face (darker)
	ctx.fillStyle = shirtDark
	ctx.beginPath()
	ctx.moveTo(position.x + topFrontLeft.x, position.y + topFrontLeft.y)
	ctx.lineTo(position.x + bottomFrontLeft.x, position.y + bottomFrontLeft.y)
	ctx.lineTo(position.x + bottomBackLeft.x, position.y + bottomBackLeft.y)
	ctx.lineTo(position.x + topBackLeft.x, position.y + topBackLeft.y)
	ctx.closePath()
	ctx.fill()
	ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'
	setScreenSpaceStroke(ctx, 1.5)
	ctx.stroke()
	
	// Front face (main color)
	ctx.fillStyle = shirtColor
	ctx.beginPath()
	ctx.moveTo(position.x + topFrontLeft.x, position.y + topFrontLeft.y)
	ctx.lineTo(position.x + topFrontRight.x, position.y + topFrontRight.y)
	ctx.lineTo(position.x + bottomFrontRight.x, position.y + bottomFrontRight.y)
	ctx.lineTo(position.x + bottomFrontLeft.x, position.y + bottomFrontLeft.y)
	ctx.closePath()
	ctx.fill()
	ctx.stroke()
	
	// Top face (lighter)
	ctx.fillStyle = shirtLight
	ctx.beginPath()
	ctx.moveTo(position.x + topFrontLeft.x, position.y + topFrontLeft.y)
	ctx.lineTo(position.x + topFrontRight.x, position.y + topFrontRight.y)
	ctx.lineTo(position.x + topBackRight.x, position.y + topBackRight.y)
	ctx.lineTo(position.x + topBackLeft.x, position.y + topBackLeft.y)
	ctx.closePath()
	ctx.fill()
	ctx.stroke()
	
	ctx.restore()
}

// Draw isometric lower body (hips/pelvis) as 3D box
function drawIsometricLowerBody(ctx, position, baseRadius) {
	ctx.save()
	
	const pelvisHeight = baseRadius * 0.32 // Z height
	const pelvisWidth = baseRadius * 0.42
	const pelvisDepth = baseRadius * 0.28
	
	// Pants colors (darker than shirt)
	const pantsColor = '#1f2937'
	const pantsDark = '#111827'
	const pantsLight = '#374151'
	
	// Transform corners to isometric space
	const topFrontLeft = toIso(-pelvisWidth / 2, pelvisDepth / 2, pelvisHeight)
	const topFrontRight = toIso(pelvisWidth / 2, pelvisDepth / 2, pelvisHeight)
	const topBackLeft = toIso(-pelvisWidth / 2, -pelvisDepth / 2, pelvisHeight)
	const topBackRight = toIso(pelvisWidth / 2, -pelvisDepth / 2, pelvisHeight)
	const bottomFrontLeft = toIso(-pelvisWidth / 2, pelvisDepth / 2, 0)
	const bottomFrontRight = toIso(pelvisWidth / 2, pelvisDepth / 2, 0)
	const bottomBackLeft = toIso(-pelvisWidth / 2, -pelvisDepth / 2, 0)
	const bottomBackRight = toIso(pelvisWidth / 2, -pelvisDepth / 2, 0)
	
	// Left face
	ctx.fillStyle = pantsDark
	ctx.beginPath()
	ctx.moveTo(position.x + topFrontLeft.x, position.y + topFrontLeft.y)
	ctx.lineTo(position.x + bottomFrontLeft.x, position.y + bottomFrontLeft.y)
	ctx.lineTo(position.x + bottomBackLeft.x, position.y + bottomBackLeft.y)
	ctx.lineTo(position.x + topBackLeft.x, position.y + topBackLeft.y)
	ctx.closePath()
	ctx.fill()
	ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
	setScreenSpaceStroke(ctx, 1.5)
	ctx.stroke()
	
	// Front face
	ctx.fillStyle = pantsColor
	ctx.beginPath()
	ctx.moveTo(position.x + topFrontLeft.x, position.y + topFrontLeft.y)
	ctx.lineTo(position.x + topFrontRight.x, position.y + topFrontRight.y)
	ctx.lineTo(position.x + bottomFrontRight.x, position.y + bottomFrontRight.y)
	ctx.lineTo(position.x + bottomFrontLeft.x, position.y + bottomFrontLeft.y)
	ctx.closePath()
	ctx.fill()
	ctx.stroke()
	
	// Belt line on front face
	ctx.strokeStyle = '#854d0e'
	setScreenSpaceStroke(ctx, 2)
	const beltY = position.y + topFrontLeft.y - 2
	ctx.beginPath()
	ctx.moveTo(position.x + topFrontLeft.x, beltY)
	ctx.lineTo(position.x + topFrontRight.x, beltY)
	ctx.stroke()
	
	// Top face
	ctx.fillStyle = pantsLight
	ctx.beginPath()
	ctx.moveTo(position.x + topFrontLeft.x, position.y + topFrontLeft.y)
	ctx.lineTo(position.x + topFrontRight.x, position.y + topFrontRight.y)
	ctx.lineTo(position.x + topBackRight.x, position.y + topBackRight.y)
	ctx.lineTo(position.x + topBackLeft.x, position.y + topBackLeft.y)
	ctx.closePath()
	ctx.fill()
	ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
	ctx.stroke()
	
	ctx.restore()
}

// Draw isometric arm with 3D depth
function drawIsometricArm(ctx, position, baseRadius, arm, side, state) {
	const isBlocking = state.anim === 'blocking'
	const isAttacking = state.anim === 'attacking'
	
	ctx.save()
	ctx.lineCap = 'round'
	ctx.lineJoin = 'round'
	
	// Get skeleton coordinates and transform to isometric
	const shoulderBase = toIso(
		(arm.shoulder?.x || 0) * 0.28, 
		(arm.shoulder?.y || 0) * 0.28, 
		baseRadius * 0.62
	)
	const elbowBase = toIso(
		(arm.elbow?.x || 0) * 0.32, 
		(arm.elbow?.y || 0) * 0.32,
		baseRadius * 0.42
	)
	const handBase = toIso(
		(arm.hand?.x || 0) * 0.38,
		(arm.hand?.y || 0) * 0.38,
		baseRadius * 0.25
	)
	
	const shoulderX = position.x + shoulderBase.x
	const shoulderY = position.y + shoulderBase.y
	const elbowX = position.x + elbowBase.x
	const elbowY = position.y + elbowBase.y
	const handX = position.x + handBase.x
	const handY = position.y + handBase.y
	
	// Optional: refine elbow with single-bend IK for cleaner bend
	// Compute approximate segment lengths in isometric space
	const approxUpperLen = Math.hypot((elbowBase.x - shoulderBase.x), (elbowBase.y - shoulderBase.y))
	const approxLowerLen = Math.hypot((handBase.x - elbowBase.x), (handBase.y - elbowBase.y))
	const bendDir = side === 'left' ? 1 : -1
	const elbowIso = singleBendIK(
		{ x: shoulderX, y: shoulderY },
		{ x: handX, y: handY },
		approxUpperLen,
		approxLowerLen,
		bendDir
	)
	const elbowDrawX = (elbowIso?.x ?? elbowX)
	const elbowDrawY = (elbowIso?.y ?? elbowY)

	// Upper arm (shirt sleeve) - thicker for 3D effect
	const sleeveColor = isAttacking ? '#f87171' : (isBlocking ? '#60a5fa' : '#3b82f6')
	ctx.strokeStyle = sleeveColor
	setScreenSpaceStroke(ctx, 4)
	ctx.beginPath()
	ctx.moveTo(shoulderX, shoulderY)
	ctx.lineTo(elbowDrawX, elbowDrawY)
	ctx.stroke()
	
	// Lower arm (skin) - forearm
	ctx.strokeStyle = '#ffd4a3'
	setScreenSpaceStroke(ctx, 3.5)
	ctx.beginPath()
	ctx.moveTo(elbowDrawX, elbowDrawY)
	ctx.lineTo(handX, handY)
	ctx.stroke()
	
	// Elbow joint
	ctx.fillStyle = sleeveColor
	ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
	setScreenSpaceStroke(ctx, 1)
	ctx.beginPath()
	ctx.arc(elbowDrawX, elbowDrawY, 3, 0, Math.PI * 2)
	ctx.fill()
	ctx.stroke()
	
	// Hand (3D-ish oval)
	ctx.fillStyle = isAttacking ? '#ff6b6b' : '#ffd4a3'
	ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
	setScreenSpaceStroke(ctx, 1.5)
	ctx.beginPath()
	ctx.ellipse(handX, handY, 4, 3.5, 0, 0, Math.PI * 2)
	ctx.fill()
	ctx.stroke()
	
	ctx.restore()
}

// Draw isometric leg with 3D depth
function drawIsometricLeg(ctx, position, baseRadius, leg, side, state) {
	ctx.save()
	ctx.lineCap = 'round'
	ctx.lineJoin = 'round'
	
	// Transform leg joints to isometric space
	const hipBase = toIso(
		(leg.hip?.x || 0) * 0.22,
		(leg.hip?.y || 0) * 0.22,
		baseRadius * 0.26
	)
	const kneeBase = toIso(
		(leg.knee?.x || 0) * 0.28,
		(leg.knee?.y || 0) * 0.28,
		baseRadius * 0.13
	)
	const ankleBase = toIso(
		(leg.ankle?.x || 0) * 0.32,
		(leg.ankle?.y || 0) * 0.32,
		baseRadius * 0.04
	)
	const footBase = toIso(
		(leg.foot?.x || 0) * 0.35,
		(leg.foot?.y || 0) * 0.35,
		0
	)
	
	const hipX = position.x + hipBase.x
	const hipY = position.y + hipBase.y
	const kneeX = position.x + kneeBase.x
	const kneeY = position.y + kneeBase.y
	const ankleX = position.x + ankleBase.x
	const ankleY = position.y + ankleBase.y
	const footX = position.x + footBase.x
	const footY = position.y + footBase.y
	
	// Optional IK for knee for cleaner bend
	const upperLen = Math.hypot((kneeBase.x - hipBase.x), (kneeBase.y - hipBase.y))
	const lowerLen = Math.hypot((ankleBase.x - kneeBase.x), (ankleBase.y - kneeBase.y))
	const kneeIso = singleBendIK(
		{ x: hipX, y: hipY },
		{ x: ankleX, y: ankleY },
		upperLen,
		lowerLen,
		side === 'left' ? 1 : -1
	)
	const kneeDrawX = (kneeIso?.x ?? kneeX)
	const kneeDrawY = (kneeIso?.y ?? kneeY)

	// Thigh (pants) - thicker for 3D effect
	ctx.strokeStyle = '#1f2937'
	setScreenSpaceStroke(ctx, 5)
	ctx.beginPath()
	ctx.moveTo(hipX, hipY)
	ctx.lineTo(kneeDrawX, kneeDrawY)
	ctx.stroke()
	
	// Lower leg (pants)
	setScreenSpaceStroke(ctx, 4.5)
	ctx.beginPath()
	ctx.moveTo(kneeDrawX, kneeDrawY)
	ctx.lineTo(ankleX, ankleY)
	ctx.stroke()
	
	// Knee joint
	ctx.fillStyle = '#374151'
	ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'
	setScreenSpaceStroke(ctx, 1)
	ctx.beginPath()
	ctx.arc(kneeDrawX, kneeDrawY, 3, 0, Math.PI * 2)
	ctx.fill()
	ctx.stroke()
	
	// Foot/shoe (isometric shoe shape)
	ctx.fillStyle = '#0f172a'
	ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
	setScreenSpaceStroke(ctx, 1.5)
	ctx.beginPath()
	// Draw shoe as parallelogram for isometric look
	ctx.moveTo(footX - 3, footY)
	ctx.lineTo(footX + 3, footY - 2)
	ctx.lineTo(footX + 5, footY + 4)
	ctx.lineTo(footX - 1, footY + 6)
	ctx.closePath()
	ctx.fill()
	ctx.stroke()
	
	// Shoe lace detail
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
	setScreenSpaceStroke(ctx, 1)
	ctx.beginPath()
	ctx.moveTo(footX - 1, footY + 1)
	ctx.lineTo(footX + 2, footY + 2)
	ctx.stroke()
	
	ctx.restore()
}

// Helper: Draw rounded rectangle
function roundRect(ctx, x, y, width, height, radius) {
	ctx.beginPath()
	ctx.moveTo(x + radius, y)
	ctx.lineTo(x + width - radius, y)
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
	ctx.lineTo(x + width, y + height - radius)
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
	ctx.lineTo(x + radius, y + height)
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
	ctx.lineTo(x, y + radius)
	ctx.quadraticCurveTo(x, y, x + radius, y)
	ctx.closePath()
}
