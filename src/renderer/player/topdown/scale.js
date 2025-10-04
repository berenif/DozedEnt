// Coordinate scaling helpers for skeleton spaces → screen radius

export function scalePoint(point, scale) {
	return { x: point.x * scale, y: point.y * scale }
}

export function scaleLimb(limb, scale) {
	const scaled = {}
	for (const [key, value] of Object.entries(limb)) {
		scaled[key] = scalePoint(value, scale)
	}
	return scaled
}

export function scaleSkeletonCoordinates(skeleton, scale) {
	return {
		root: scalePoint(skeleton.root, scale),
		pelvis: scalePoint(skeleton.pelvis, scale),
		lowerSpine: scalePoint(skeleton.lowerSpine, scale),
		chest: scalePoint(skeleton.chest, scale),
		neck: scalePoint(skeleton.neck, scale),
		torso: scalePoint(skeleton.torso, scale),
		head: scalePoint(skeleton.head, scale),
		clavicleL: scalePoint(skeleton.clavicleL, scale),
		clavicleR: scalePoint(skeleton.clavicleR, scale),
		leftArm: scaleLimb(skeleton.leftArm, scale),
		rightArm: scaleLimb(skeleton.rightArm, scale),
		leftLeg: scaleLimb(skeleton.leftLeg, scale),
		rightLeg: scaleLimb(skeleton.rightLeg, scale)
	}
}
