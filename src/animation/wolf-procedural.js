// Wolf Procedural Animation (ECS/WASM-ready)
// Minimal, modular runtime driven entirely by physical/AI inputs (no baked clips)
//
// Design goals
// - Pure data-in/data-out per frame
// - No rendering side-effects; callers read pose buffers and render however they like
// - Externalized environment queries (raycast) and timing (dt)
// - WASM-friendly typed array I/O

// ---------------------------------------------
// Public enums and constants
// ---------------------------------------------

export const WolfGait = Object.freeze({
	Walk: 0,
	Trot: 1,
	Gallop: 2,
	Prowl: 3
})

export const WolfState = Object.freeze({
	Idle: 0,
	Prowl: 1,
	Walk: 2,
	Trot: 3,
	Gallop: 4,
	CombatReady: 5,
	Stunned: 6
})

export const WolfEmotionalState = Object.freeze({
	Calm: 0,
	Aggressive: 1,
	Fearful: 2,
	Desperate: 3,
	Confident: 4,
	Frustrated: 5
})

export const TerrainType = Object.freeze({
	HighGround: 0,
	Cover: 1,
	OpenField: 2,
	Chokepoint: 3,
	LowGround: 4,
	Water: 5
})

export const PackRole = Object.freeze({
	None: 0,
	Leader: 1,
	Scout: 2,
	Ambusher: 3,
	Flanker: 4
})

export const WolfAction = Object.freeze({
	None: 0,
	Bite: 1,
	Pounce: 2,
	Howl: 3,
	Stun: 4,
	Hit: 5
})

// Leg indices: LF, RF, LH, RH
export const LegIndex = Object.freeze({ LF: 0, RF: 1, LH: 2, RH: 3 })

// ---------------------------------------------
// Input Buffer Layout (WASM-friendly)
// ---------------------------------------------
// Float32Array layout for per-frame inputs, writeable from WASM/engine.
// 0..1   velocity_world xy
// 2      speed
// 3      turn_rate
// 4..6   slope_normal xyz
// 7      ground_height
// 8      ground_material (as number)
// 9      gait_state (enum WolfGait)
// 10     alertness (0..1)
// 11     fatigue (0..1)
// 12..13 target_dir xy (normalized)
// 14..15 target_pos xy
// 16     action (enum WolfAction)
// 17     emotionalState (enum WolfEmotionalState)
// 18     terrainType (enum TerrainType)
// 19     packRole (enum PackRole)
// 20     intelligence (0..1)
// 21     aggression (0..1)
// 22     coordination (0..1)
// 23     morale (0..1)
// 24     packSize (number of wolves in pack)
// 25     packLeaderDistance (distance to pack leader)
// 26     packSyncPhase (synchronization phase for coordinated actions)
// 27..29 reserved

export const WolfInputLayout = Object.freeze({
	Size: 30,
	VelX: 0,
	VelY: 1,
	Speed: 2,
	TurnRate: 3,
	SlopeX: 4,
	SlopeY: 5,
	SlopeZ: 6,
	GroundHeight: 7,
	GroundMaterial: 8,
	Gait: 9,
	Alertness: 10,
	Fatigue: 11,
	TargetDirX: 12,
	TargetDirY: 13,
	TargetPosX: 14,
	TargetPosY: 15,
	Action: 16,
	EmotionalState: 17,
	TerrainType: 18,
	PackRole: 19,
	Intelligence: 20,
	Aggression: 21,
	Coordination: 22,
	Morale: 23,
	PackSize: 24,
	PackLeaderDistance: 25,
	PackSyncPhase: 26
})

// ---------------------------------------------
// Pose Buffer Layout (WASM-friendly)
// ---------------------------------------------
// Float32Array layout, measured in floats. All rotations in radians.
// Root (pelvis) transform and key joint angles. 2D engines can ignore Z components.
//
// Offsets
// 0:2  rootPositionXY
// 2    rootHeight
// 3    rootYaw
// 4    rootPitch
// 5    spineCurve (overall curvature scalar)
// 6    neckYaw
// 7    neckPitch
// 8    headYaw
// 9    headPitch
// 10   jawOpen
// 11   tailBaseYaw
// 12   tailBasePitch
// 13   earLeftYaw
// 14   earRightYaw
// 15   breathing (chest scale proxy)
// 16..23  footTargetXY for LF,RF,LH,RH (pairs)
// 24..27  footPlantAlpha LF,RF,LH,RH (0..1 stance blend)
// 28..31  legExtension LF,RF,LH,RH (0..1)
// 32..35  legLift LF,RF,LH,RH (0..1)
// 36      debugFlags (bitfield)
// 37      reserved
// 38      reserved
// 39      reserved

export const WolfPoseLayout = Object.freeze({
	Size: 40,
	RootX: 0,
	RootY: 1,
	RootHeight: 2,
	RootYaw: 3,
	RootPitch: 4,
	SpineCurve: 5,
	NeckYaw: 6,
	NeckPitch: 7,
	HeadYaw: 8,
	HeadPitch: 9,
	JawOpen: 10,
	TailBaseYaw: 11,
	TailBasePitch: 12,
	EarLeftYaw: 13,
	EarRightYaw: 14,
	Breathing: 15,
	FootXYStart: 16, // 8 floats (4 * 2)
	FootPlantStart: 24, // 4 floats
	LegExtensionStart: 28, // 4 floats
	LegLiftStart: 32, // 4 floats
	DebugFlags: 36
})

// ---------------------------------------------
// Component factory
// ---------------------------------------------

export function createWolfAnimComponent(overrides = {}) {
	return {
		// Inputs, set per frame by gameplay/AI/physics
		velocityWorld: { x: 0, y: 0 },
		speed: 0,
		turnRate: 0,
		slopeNormal: { x: 0, y: 1, z: 0 },
		groundHeight: 0,
		groundMaterial: 0,
		gait: WolfGait.Walk,
		alertness: 0,
		fatigue: 0,
		targetDir: { x: 1, y: 0 },
		targetPos: { x: 0, y: 0 },
		action: WolfAction.None,
		emotionalState: WolfEmotionalState.Calm,
		terrainType: TerrainType.OpenField,
		packRole: PackRole.None,
		intelligence: 0.5,
		aggression: 0.5,
		coordination: 0.5,
		morale: 0.5,
		packSize: 1,
		packLeaderDistance: 0,
		packSyncPhase: 0,

		// Internal state
		time: 0,
		state: WolfState.Idle,
		statePrev: WolfState.Idle,
		stateBlendT: 1,
		stateBlendDur: 0.18,
		phase: new Float32Array(4),
		phaseSpeed: 0,
		legStance: new Float32Array(4),
		footPos: [ {x:0,y:0}, {x:0,y:0}, {x:0,y:0}, {x:0,y:0} ],
		footLock: [ {x:0,y:0}, {x:0,y:0}, {x:0,y:0}, {x:0,y:0} ],
		footTarget: [ {x:0,y:0}, {x:0,y:0}, {x:0,y:0}, {x:0,y:0} ],
		footOrient: [ {yaw:0,pitch:0,roll:0}, {yaw:0,pitch:0,roll:0}, {yaw:0,pitch:0,roll:0}, {yaw:0,pitch:0,roll:0} ],
		footContact: [
			{ force:0, normal:{x:0,y:1,z:0}, friction:1, _vy:0 },
			{ force:0, normal:{x:0,y:1,z:0}, friction:1, _vy:0 },
			{ force:0, normal:{x:0,y:1,z:0}, friction:1, _vy:0 },
			{ force:0, normal:{x:0,y:1,z:0}, friction:1, _vy:0 }
		],
		legExtension: new Float32Array(4),
		legLift: new Float32Array(4),
		root: { x: 0, y: 0, height: 0.9, yaw: 0, pitch: 0 },
		spineCurve: 0,
		neckYaw: 0,
		neckPitch: 0,
		headYaw: 0,
		headPitch: 0,
		jawOpen: 0,
		tailYaw: 0,
		tailPitch: 0,
		earLeftYaw: 0,
		earRightYaw: 0,
		breathing: 0,
		furJitter: 0,
		pounceTimer: 0,
		stunTimer: 0,
		// Configurable params
		strideScale: 1,
		gaitParams: defaultGaitParams(),
		ik: defaultIkParams(),
		filters: defaultFilterParams(),
		body: defaultBodyParams(),
		curves: defaultCurveParams(),
		debugFlags: 0,
		gaitAuto: false,
		...overrides
	}
}

// ---------------------------------------------
// Update entry point
// ---------------------------------------------
// raycastGround(x, y) -> { hit: boolean, y: number, normal: {x,y,z}, material: int }

export function updateWolfAnimation(comp, dt, raycastGround) {
	// Time integration
	comp.time += dt

	// Update locomotion state based on speed/alertness
	updateHighLevelState(comp, dt)

	// Gait engine: update phase speed & per-leg phases
	updateGaitPhases(comp, dt)

	// Smoothly align root orientation to movement/aim
	updateRootOrientation(comp, dt)

	// Predict foot targets in body space and perform smart placement
	computeFootTargets(comp)
	applyFootIK(comp, dt, raycastGround)

	// Root height and pitch correction via virtual spring
	stabilizeRootOnGround(comp, dt)

	// Spine/neck/head and look-at
	updateSpineAndHead(comp, dt)

	// Secondary motion: tail, ears, breathing/fur proxy
	updateSecondaryMotion(comp, dt)

	// Actions (additive, prioritized)
	applyActions(comp, dt)
}

// ---------------------------------------------
// State selection and blending
// ---------------------------------------------

function updateHighLevelState(comp, dt) {
	const s = comp.speed
	const a = comp.alertness
	const e = comp.emotionalState
	const t = comp.terrainType
	const m = comp.morale
	// Optional auto-gait selection with hysteresis thresholds
	if (comp.gaitAuto) {
		selectGaitFromSpeed(comp)
	}
	let target = WolfState.Idle

	if (comp.stunTimer > 0) {
		target = WolfState.Stunned
	} else if (s < 0.05) {
		// Emotional state influences combat readiness
		const combatThreshold = e === WolfEmotionalState.Aggressive ? 0.3 :
		                      e === WolfEmotionalState.Fearful ? 0.8 :
		                      e === WolfEmotionalState.Confident ? 0.4 : 0.5

		target = a > combatThreshold ? WolfState.CombatReady :
		        (comp.gait === WolfGait.Prowl ? WolfState.Prowl : WolfState.Idle)
	} else if (comp.gait === WolfGait.Prowl) {
		target = WolfState.Prowl
	} else if (s < 1.2) {
		target = WolfState.Walk
	} else if (s < 3.0) {
		target = WolfState.Trot
	} else {
		target = WolfState.Gallop
	}

	// Terrain and morale affect movement confidence
	if (m < 0.3 && t === TerrainType.OpenField) {
		// Low morale wolves move more cautiously in open areas
		if (target === WolfState.Walk) target = WolfState.Prowl
		else if (target === WolfState.Trot) target = WolfState.Walk
	}

	// Blend states softly (120–200 ms)
	if (target !== comp.state) {
		comp.statePrev = comp.state
		comp.state = target
		comp.stateBlendT = 0
		// Transition duration scales with emotional state and intelligence
		const baseDur = 0.12 + 0.08 * (comp.speed > 0.5 ? 1 : 0) + 0.04 * comp.alertness
		const emotionalFactor = e === WolfEmotionalState.Frustrated ? 1.5 :
		                       e === WolfEmotionalState.Calm ? 0.8 : 1.0
		const intelligenceFactor = 1 - comp.intelligence * 0.2 // Smarter wolves transition faster
		comp.stateBlendDur = clamp(baseDur * emotionalFactor * intelligenceFactor, 0.08, 0.3)
	}
	if (comp.stateBlendT < 1) {
		comp.stateBlendT = Math.min(1, comp.stateBlendT + dt / Math.max(0.001, comp.stateBlendDur || 0.1))
	}
}

// ---------------------------------------------
// Gait engine
// ---------------------------------------------

function defaultGaitParams() {
	return {
		[WolfGait.Walk]: {
			phaseOffset: [0.00, 0.50, 0.25, 0.75], // LF, RF, LH, RH
			stride: speed => clamp(0.25 + 0.15 * speed, 0.2, 0.55),
			frequency: speed => clamp(1.0 * (0.4 + 0.25 * speed), 0.35, 1.6),
			hipAmplitude: 0.10
		},
		[WolfGait.Trot]: {
			phaseOffset: [0.00, 0.50, 0.50, 0.00], // LF w/ RH, RF w/ LH (2-beat)
			stride: speed => clamp(0.40 + 0.20 * speed, 0.35, 0.80),
			frequency: speed => clamp(1.6 * (0.5 + 0.3 * speed), 0.9, 2.4),
			hipAmplitude: 0.14
		},
		[WolfGait.Gallop]: {
			phaseOffset: [0.00, 0.35, 0.65, 0.85], // 4-beat w/ short suspension
			stride: speed => clamp(0.70 + 0.25 * speed, 0.6, 1.5),
			frequency: speed => clamp(2.1 * (0.7 + 0.4 * speed), 1.6, 3.8),
			hipAmplitude: 0.22
		},
		[WolfGait.Prowl]: {
			phaseOffset: [0.00, 0.50, 0.25, 0.75],
			stride: speed => clamp(0.15 + 0.05 * speed, 0.10, 0.25),
			frequency: speed => clamp(0.5 * (0.2 + 0.15 * speed), 0.15, 0.5),
			hipAmplitude: 0.06
		}
	}
}

function updateGaitPhases(comp, dt) {
	const gp = comp.gaitParams[comp.gait]
	// Prefer v ≈ f × L mapping, blended with authored frequency
	const strideLen = gp.stride(comp.speed)
	const freqCandidate = strideLen > 1e-4 ? comp.speed / Math.max(1e-4, strideLen) : gp.frequency(comp.speed)
	let freq = gp.frequency(comp.speed) * 0.5 + freqCandidate * 0.5

	// Emotional state affects gait timing
	const emotionalFreqMod = comp.emotionalState === WolfEmotionalState.Frustrated ? 1.3 :
	                        comp.emotionalState === WolfEmotionalState.Fearful ? 1.2 :
	                        comp.emotionalState === WolfEmotionalState.Calm ? 0.9 :
	                        comp.emotionalState === WolfEmotionalState.Confident ? 0.95 : 1.0

	// Terrain affects gait timing
	const terrainFreqMod = comp.terrainType === TerrainType.Chokepoint ? 0.8 :
	                      comp.terrainType === TerrainType.HighGround ? 1.1 :
	                      comp.terrainType === TerrainType.Water ? 0.7 : 1.0

	// Pack coordination affects synchronization
	let syncOffset = 0
	if (comp.packRole !== PackRole.None && comp.packSize > 1) {
		syncOffset = comp.packSyncPhase * comp.coordination * 0.2
	}

	freq *= emotionalFreqMod * terrainFreqMod
	comp.phaseSpeed = freq

	for (let i = 0; i < 4; i++) {
		const base = (comp.phase[i] || 0)
		let p = base + dt * freq
		p = p - Math.floor(p)

		// Add pack synchronization
		p += syncOffset
		p = p - Math.floor(p)

		comp.phase[i] = p
		const duty = dutyFactorFor(comp)
		comp.legStance[i] = stanceAlphaFromPhase(p, duty)
	}
}

function stanceAlphaFromPhase(p, duty) {
	// Smooth duty cycle: stance in [0, duty], swing in (duty, 1]
	// Feather creates a soft blend at both boundaries (wrap-aware)
	const feather = 0.12
	let a = 0
	// Inside stance plateau
	if (p < duty - feather * 0.5) a = 1
	else if (p > duty + feather * 0.5) a = 0
	else {
		// Blend window around duty boundary
		const t = clamp((p - (duty - feather * 0.5)) / (feather), 0, 1)
		a = 1 - smoothstep(0, 1, t)
	}
	// Also blend at wrap-around near p ~ 0 (stance near 0)
	if (p > 1 - feather * 0.5) {
		const t = clamp((p - (1 - feather * 0.5)) / (feather), 0, 1)
		a = Math.max(a, smoothstep(0, 1, t))
	}
	if (p < feather * 0.5) {
		const t = clamp((feather * 0.5 - p) / (feather), 0, 1)
		a = Math.max(a, smoothstep(0, 1, t))
	}
	return a
}

function computeFootTargets(comp) {
	const gp = comp.gaitParams[comp.gait]
	const stride = gp.stride(comp.speed) * comp.strideScale
	const dir = normalize2D(comp.velocityWorld)
	const lateral = { x: -dir.y, y: dir.x }

	const footBase = [
		{ x: 0.35, y: 0.20 }, // LF
		{ x: 0.35, y: -0.20 }, // RF
		{ x: -0.35, y: 0.22 }, // LH
		{ x: -0.35, y: -0.22 } // RH
	]

	for (let i = 0; i < 4; i++) {
		const gaitPhase = wrap01(comp.phase[i] + comp.gaitParams[comp.gait].phaseOffset[i])
		const stanceA = stanceAlphaFromPhase(gaitPhase, dutyFactorFor(comp))
		const swingT = 1 - stanceA
		const forward = mul2D(dir, lerp(-stride * 0.5, stride * 0.5, swingT))
		const side = mul2D(lateral, (i % 2 === 0 ? 1 : -1) * 0.06)
		const base = footBase[i]
		let bx = base.x + forward.x + side.x
		let by = base.y + forward.y + side.y
		// Terrain-aware refinement in world space, then convert back to body space
		const nominalWorld = worldFromBody(comp, { x: bx, y: by })
		const refined = refineFootTargetWithTerrain(comp, i, nominalWorld)
		const refinedBody = bodyFromWorld(comp, refined.position)
		comp.footTarget[i].x = refinedBody.x
		comp.footTarget[i].y = refinedBody.y
		// Store expected contact properties
		if (comp.footContact && comp.footContact[i]) {
			comp.footContact[i].normal = refined.normal
			comp.footContact[i].friction = refined.friction
		}
		comp.legLift[i] = swingT
		comp.legExtension[i] = 0.5 + 0.5 * (1 - swingT)
	}
}

// ---------------------------------------------
// Foot IK and ground adaptation
// ---------------------------------------------

function defaultIkParams() {
	return {
		lockBlend: 12,
		unlockSpeed: 10,
		heightSpring: 40,
		heightDamping: 8,
		antiSlipThreshold: 0.18,
		orientYawRate: 18,
		orientPitchRate: 16,
		orientRollRate: 16,
		pawSpring: 180,
		pawDamping: 28,
		footClearance: 0.12,
		stepSearchRadius: 0.12
	}
}

function applyFootIK(comp, dt, raycastGround) {
	for (let i = 0; i < 4; i++) {
		const stance = comp.legStance[i] > 0.5
		if (stance) {
			const desired = worldFromBody(comp, comp.footTarget[i])
			const refined = refineFootPlacement(comp, i, desired, raycastGround)
			const gx = refined.position.x
			const gy = refined.position.y
			if (!comp.footLock[i]._init) {
				comp.footLock[i]._init = true
				comp.footLock[i].x = gx
				comp.footLock[i].y = gy
			}
			// Blend to ground lock point (x) and settle with compliance (y)
			comp.footLock[i].x = smooth(comp.footLock[i].x, gx, comp.ik.lockBlend, dt)
			// Vertical spring-damper toward refined y
			const yErr = (gy - comp.footPos[i].y)
			const accY = comp.ik.pawSpring * yErr - comp.ik.pawDamping * (comp.footContact[i]._vy || 0)
			comp.footContact[i]._vy = (comp.footContact[i]._vy || 0) + accY * dt
			comp.footPos[i].y = comp.footPos[i].y + comp.footContact[i]._vy * dt
			comp.footPos[i].x = comp.footLock[i].x
			// Anti-slip: if root drifted, retarget lock
			const dist = distance2D(refined.position, comp.footLock[i])
			if (dist > comp.ik.antiSlipThreshold) {
				comp.footLock[i].x = lerp(comp.footLock[i].x, refined.position.x, 0.5)
				comp.footLock[i].y = lerp(comp.footLock[i].y, refined.position.y, 0.5)
			}
			comp.footContact[i].force = Math.max(0, comp.ik.pawSpring * (gy - comp.footPos[i].y))
			comp.legExtension[i] = 1
			comp.legLift[i] = 0
			// Align paw to terrain
			alignPawOrientation(comp, i, refined.normal, dt)
		} else {
			// Swing: release lock and follow target with lift arc
			let target = worldFromBody(comp, comp.footTarget[i])
			comp.footLock[i]._init = false
			const lift = comp.legLift[i]
			// Dynamic swing peak height scales with speed and terrain
			const baseHeight = comp.body.swingPeakHeightBase
			const speedHeight = comp.body.swingHeightGain * clamp(comp.speed / 4.0, 0, 1)
			const arcY = parabolicArc(lift, baseHeight + speedHeight + comp.ik.footClearance)
			// Predict ground at target for smooth landing
			const refined = refineFootPlacement(comp, i, target, raycastGround)
			const ty = refined.position.y
			comp.footPos[i].x = smooth(comp.footPos[i].x, target.x, comp.ik.unlockSpeed, dt)
			comp.footPos[i].y = smooth(comp.footPos[i].y, ty + arcY, comp.ik.unlockSpeed, dt)
			// Pre-align paw towards landing orientation
			alignPawOrientation(comp, i, refined.normal, dt)
		}
	}
}

function stabilizeRootOnGround(comp, dt) {
	// Virtual spring for root height to average foot height
	let avgY = 0
	let count = 0
	for (let i = 0; i < 4; i++) {
		avgY += comp.footPos[i].y
		count++
	}
	avgY /= Math.max(1, count)
	const targetHeight = avgY + comp.body.pelvisOffset // pelvis offset
	const err = targetHeight - comp.root.height
	const vel = 0 // implicit damping term via smoothing
	const accel = comp.ik.heightSpring * err - comp.ik.heightDamping * vel
	comp.root.height = comp.root.height + accel * dt

	// Pitch to align with terrain slope using front vs hind average
	const frontY = 0.5 * (comp.footPos[LegIndex.LF].y + comp.footPos[LegIndex.RF].y)
	const hindY = 0.5 * (comp.footPos[LegIndex.LH].y + comp.footPos[LegIndex.RH].y)
	const pitchTarget = clamp((hindY - frontY) * comp.body.terrainPitchGain, -comp.body.pitchClamp, comp.body.pitchClamp)
	comp.root.pitch = smooth(comp.root.pitch, pitchTarget, 10, dt)

	// Subtle COM correction: pull root.x toward support centroid
	let cx = 0
	for (let i = 0; i < 4; i++) cx += comp.footPos[i].x
	cx *= 0.25
	const comTargetX = lerp(comp.root.x, cx, comp.body.comCentering)
	comp.root.x = smooth(comp.root.x, comTargetX, comp.body.comCenterRate, dt)

	// Body lean into turns proportional to curvature
	const curvature = clamp(comp.turnRate * comp.speed * comp.body.turnCurvatureGain, -1, 1)
	const lean = clamp(curvature * comp.body.lateralLeanGain, -comp.body.leanClamp, comp.body.leanClamp)
	comp.root.pitch = smooth(comp.root.pitch, comp.root.pitch + lean, 6, dt)
}

// ---------------------------------------------
// Root yaw alignment
// ---------------------------------------------
function updateRootOrientation(comp, dt) {
	const velLen = length2D(comp.velocityWorld)
	const aim = velLen > 0.15 ? comp.velocityWorld : comp.targetDir
	const desiredYaw = atan2safe(aim.y, aim.x)
	const rate = 10 + 10 * clamp(comp.speed / 4, 0, 1)
	comp.root.yaw = smooth(comp.root.yaw, desiredYaw, rate, dt)
}

// ---------------------------------------------
// Spine, neck, head, look-at
// ---------------------------------------------

function defaultFilterParams() {
	return {
		neckDamping: 14,
		headDamping: 16,
		lookClampYaw: 0.8,
		lookClampPitch: 0.5
	}
}

function defaultBodyParams() {
	return {
		pelvisOffset: 0.55,
		terrainPitchGain: 0.6,
		pitchClamp: 0.25,
		comCentering: 0.6,
		comCenterRate: 8,
		turnCurvatureGain: 0.06,
		lateralLeanGain: 0.06,
		leanClamp: 0.12,
		headStabilizeGain: 0.85,
		swingPeakHeightBase: 0.14,
		swingHeightGain: 0.08
	}
}

function defaultCurveParams() {
	return {
		// Duty factor curve by speed and gait
		dutyFactor(speed, gait) {
			const s = clamp(speed, 0, 4)
			switch (gait) {
				case WolfGait.Prowl: return 0.65 - 0.05 * s
				case WolfGait.Walk: return 0.60 - 0.06 * s
				case WolfGait.Trot: return 0.55 - 0.05 * s
				case WolfGait.Gallop: return 0.45 - 0.04 * s
				default: return 0.58
			}
		},
		gaitThresholds: {
			toWalk: 0.18,
			toTrot: 1.20,
			toGallop: 3.00,
			toProwl: 0.10,
			hysteresis: 0.12
		}
	}
}

function dutyFactorFor(comp) {
	return clamp(comp.curves.dutyFactor(comp.speed, comp.gait), 0.35, 0.75)
}

function selectGaitFromSpeed(comp) {
	const th = comp.curves.gaitThresholds
	const s = comp.speed
	const h = th.hysteresis
	switch (comp.gait) {
		case WolfGait.Prowl:
			if (s > th.toWalk + h) comp.gait = WolfGait.Walk
			break
		case WolfGait.Walk:
			if (s < th.toProwl - h) comp.gait = WolfGait.Prowl
			else if (s > th.toTrot + h) comp.gait = WolfGait.Trot
			break
		case WolfGait.Trot:
			if (s < th.toWalk - h) comp.gait = WolfGait.Walk
			else if (s > th.toGallop + h) comp.gait = WolfGait.Gallop
			break
		case WolfGait.Gallop:
			if (s < th.toTrot - h) comp.gait = WolfGait.Trot
			break
		default:
			comp.gait = WolfGait.Walk
	}
}

function updateSpineAndHead(comp, dt) {
	const alert = comp.alertness
	const lookYaw = atan2safe(comp.targetDir.y, comp.targetDir.x)
	const lookPitch = 0 // 2D default; extend for 3D

	const neckYawTarget = clamp(lookYaw * (0.5 + 0.5 * alert), -comp.filters.lookClampYaw, comp.filters.lookClampYaw)
	const headYawTarget = clamp(lookYaw, -comp.filters.lookClampYaw, comp.filters.lookClampYaw)
	const neckPitchTarget = clamp(lookPitch * 0.5, -comp.filters.lookClampPitch, comp.filters.lookClampPitch)
	const headPitchTarget = clamp(lookPitch, -comp.filters.lookClampPitch, comp.filters.lookClampPitch)

	const neckRate = comp.filters.neckDamping * (1 + 0.5 * alert)
	const headRate = comp.filters.headDamping * (1 + 0.5 * alert)

	comp.neckYaw = smooth(comp.neckYaw, neckYawTarget, neckRate, dt)
	comp.headYaw = smooth(comp.headYaw, headYawTarget, headRate, dt)
	comp.neckPitch = smooth(comp.neckPitch, neckPitchTarget, neckRate, dt)
	comp.headPitch = smooth(comp.headPitch, headPitchTarget, headRate, dt)

	comp.spineCurve = smooth(comp.spineCurve, spineCurveForState(comp), 6, dt)

	// Head stabilizer keeps gaze level against pelvis pitch (comfort-limited)
	const stabilize = clamp(-comp.root.pitch * comp.body.headStabilizeGain, -comp.filters.lookClampPitch, comp.filters.lookClampPitch)
	comp.headPitch = smooth(comp.headPitch, stabilize + headPitchTarget, headRate, dt)
}

function spineCurveForState(comp) {
	const e = comp.emotionalState
	const t = comp.terrainType

	let baseCurve = 0.02

	// Base curve by state
	switch (comp.state) {
		case WolfState.Gallop: baseCurve = 0.18; break
		case WolfState.Trot: baseCurve = 0.12; break
		case WolfState.Walk: baseCurve = 0.08; break
		case WolfState.Prowl: baseCurve = -0.05; break
		case WolfState.CombatReady: baseCurve = 0.05; break
	}

	// Emotional state modulation
	let emotionalMod = 1.0
	switch (e) {
		case WolfEmotionalState.Aggressive: emotionalMod = 1.3; break
		case WolfEmotionalState.Fearful: emotionalMod = 0.8; break
		case WolfEmotionalState.Confident: emotionalMod = 1.1; break
		case WolfEmotionalState.Frustrated: emotionalMod = 1.2; break
		case WolfEmotionalState.Desperate: emotionalMod = 1.4; break
		case WolfEmotionalState.Calm: emotionalMod = 0.9; break
	}

	// Terrain type modulation
	let terrainMod = 1.0
	switch (t) {
		case TerrainType.HighGround: terrainMod = 1.1; break // Straighter spine on high ground
		case TerrainType.LowGround: terrainMod = 0.9; break // More curved in low ground
		case TerrainType.Cover: terrainMod = 0.85; break // Crouched in cover
		case TerrainType.Chokepoint: terrainMod = 0.8; break // Compressed in tight spaces
		case TerrainType.Water: terrainMod = 0.95; break // Slight adjustment in water
	}

	// Morale affects posture (low morale = more hunched)
	const moraleMod = lerp(0.8, 1.0, comp.morale)

	return baseCurve * emotionalMod * terrainMod * moraleMod
}

// ---------------------------------------------
// Secondary motion: tail, ears, breathing
// ---------------------------------------------

function updateSecondaryMotion(comp, dt) {
	const speedN = clamp(comp.speed / 4.0, 0, 1)
	const alert = comp.alertness
	const e = comp.emotionalState
	const m = comp.morale
	const t = comp.time

	// Emotional state affects tail position and movement
	let tailEmotionalMod = { yawAmp: 0, pitchAmp: 0, freq: 1 }
	switch (e) {
		case WolfEmotionalState.Calm:
			tailEmotionalMod = { yawAmp: 0.03, pitchAmp: 0.05, freq: 0.8 }
			break
		case WolfEmotionalState.Aggressive:
			tailEmotionalMod = { yawAmp: 0.08, pitchAmp: 0.15, freq: 1.3 }
			break
		case WolfEmotionalState.Fearful:
			tailEmotionalMod = { yawAmp: 0.02, pitchAmp: -0.1, freq: 1.5 }
			break
		case WolfEmotionalState.Confident:
			tailEmotionalMod = { yawAmp: 0.06, pitchAmp: 0.2, freq: 1.1 }
			break
		case WolfEmotionalState.Frustrated:
			tailEmotionalMod = { yawAmp: 0.1, pitchAmp: 0.05, freq: 1.8 }
			break
		case WolfEmotionalState.Desperate:
			tailEmotionalMod = { yawAmp: 0.12, pitchAmp: -0.05, freq: 2.0 }
			break
	}

	// Pack role affects tail position (alpha wolf holds tail higher)
	const packTailMod = comp.packRole === PackRole.Leader ? 0.1 : 0

	// Tail inertial follower with emotional modulation
	const desiredTailYaw = clamp(
		-comp.turnRate * 0.05 +
		Math.sin(t * (2 + 4 * speedN) * tailEmotionalMod.freq) * tailEmotionalMod.yawAmp,
		-0.6, 0.6
	)
	const desiredTailPitch = lerp(0.05, 0.35, speedN) + alert * 0.1 +
	                        tailEmotionalMod.pitchAmp + packTailMod

	comp.tailYaw = smooth(comp.tailYaw, desiredTailYaw, 10 + 10 * speedN, dt)
	comp.tailPitch = smooth(comp.tailPitch, desiredTailPitch, 8 + 8 * speedN, dt)

	// Ears respond to emotional state and alertness
	let earEmotionalMod = { alertness: 0, asymmetry: 0 }
	switch (e) {
		case WolfEmotionalState.Aggressive:
			earEmotionalMod = { alertness: 0.6, asymmetry: 0.1 }
			break
		case WolfEmotionalState.Fearful:
			earEmotionalMod = { alertness: -0.2, asymmetry: -0.05 }
			break
		case WolfEmotionalState.Confident:
			earEmotionalMod = { alertness: 0.3, asymmetry: 0.05 }
			break
		case WolfEmotionalState.Frustrated:
			earEmotionalMod = { alertness: 0.4, asymmetry: 0.15 }
			break
	}

	const earAim = clamp(alert * 0.4 + earEmotionalMod.alertness, -0.3, 0.6)
	const earAsym = earEmotionalMod.asymmetry

	// Intelligence affects ear jitter (smarter wolves have more controlled ear movements)
	const intelligenceMod = 1 - comp.intelligence * 0.3
	const jitterL = (hashNoise(t * 2.7) - 0.5) * (0.02 + 0.02 * (1 - speedN)) * intelligenceMod
	const jitterR = (hashNoise(t * 2.9 + 7) - 0.5) * (0.02 + 0.02 * (1 - speedN)) * intelligenceMod

	comp.earLeftYaw = smooth(comp.earLeftYaw, -earAim + earAsym + jitterL, 18, dt)
	comp.earRightYaw = smooth(comp.earRightYaw, earAim - earAsym + jitterR, 18, dt)

	// Breathing modulated by emotional state and morale
	const emotionalBreathMod = e === WolfEmotionalState.Fearful ? 1.5 :
	                           e === WolfEmotionalState.Aggressive ? 1.3 :
	                           e === WolfEmotionalState.Calm ? 0.8 : 1.0

	const moraleBreathMod = lerp(0.7, 1.2, m) // Low morale = shallower breathing

	const baseFreq = (0.6 + 1.4 * speedN) * emotionalBreathMod
	const amp = lerp(0.02, 0.10, clamp(comp.fatigue, 0, 1)) * moraleBreathMod
	comp.breathing = Math.sin(t * baseFreq) * amp

	// Fur jitter modulated by emotional state
	const idleFactor = 1 - speedN
	const emotionalFurMod = e === WolfEmotionalState.Fearful ? 2.0 :
	                       e === WolfEmotionalState.Aggressive ? 1.5 :
	                       e === WolfEmotionalState.Frustrated ? 1.8 : 1.0

	comp.furJitter = (hashNoise(t * 3.7) - 0.5) * 0.02 * (0.3 + 0.7 * idleFactor) * emotionalFurMod

	// Pack coordination affects subtle body synchronization
	if (comp.packRole !== PackRole.None && comp.packSize > 1) {
		const packSync = Math.sin(t * 0.5 + comp.packSyncPhase) * comp.coordination * 0.02
		comp.breathing += packSync
		comp.furJitter += packSync * 0.5
	}
}

// ---------------------------------------------
// Actions (additive)
// ---------------------------------------------

function applyActions(comp, dt) {
	const aggressionMod = comp.aggression
	const emotionalMod = comp.emotionalState

	switch (comp.action) {
		case WolfAction.Bite: {
			const phase = (comp.time * 6) % 1
			let open = phase < 0.3 ? lerp(0, 1, phase / 0.3) : lerp(1, 0, (phase - 0.3) / 0.7)

			// Aggression affects bite intensity
			open *= (0.8 + 0.4 * aggressionMod)

			// Emotional state affects bite ferocity
			if (emotionalMod === WolfEmotionalState.Aggressive || emotionalMod === WolfEmotionalState.Desperate) {
				open *= 1.2
			} else if (emotionalMod === WolfEmotionalState.Fearful) {
				open *= 0.7
			}

			comp.jawOpen = Math.max(comp.jawOpen, open)

			// Aggressive wolves snap head more during bite
			if (aggressionMod > 0.7) {
				const headSnap = Math.sin(phase * Math.PI * 2) * 0.1 * aggressionMod
				comp.headYaw += headSnap
				comp.neckYaw += headSnap * 0.5
			}
			break
		}
		case WolfAction.Pounce: {
			comp.pounceTimer += dt
			const prep = Math.min(comp.pounceTimer / 0.25, 1)
			let compress = 0.2 * (1 - prep)

			// Aggression affects pounce preparation intensity
			compress *= (0.8 + 0.4 * aggressionMod)

			comp.spineCurve -= compress

			// Lock feet until release
			for (let i = 0; i < 4; i++) comp.legStance[i] = 1

			// Confident wolves crouch lower for better pounce
			if (emotionalMod === WolfEmotionalState.Confident) {
				comp.root.height *= 0.9
			}
			break
		}
		case WolfAction.Howl: {
			let jawOpenAmount = 0.6 + 0.1 * Math.sin(comp.time * 20)

			// Emotional state affects howl intensity
			const emotionalHowlMod = emotionalMod === WolfEmotionalState.Confident ? 1.3 :
			                        emotionalMod === WolfEmotionalState.Desperate ? 1.2 :
			                        emotionalMod === WolfEmotionalState.Fearful ? 0.8 : 1.0

			jawOpenAmount *= emotionalHowlMod
			comp.jawOpen = Math.max(comp.jawOpen, jawOpenAmount)

			let neckPitchTarget = -0.3
			// Alpha wolves howl with more authority (higher head position)
			if (comp.packRole === PackRole.Leader) {
				neckPitchTarget = -0.2
				jawOpenAmount *= 1.1
			}

			comp.neckPitch = smooth(comp.neckPitch, neckPitchTarget, 6, dt)

			// Pack coordination affects howl synchronization
			if (comp.packSize > 1 && comp.coordination > 0.5) {
				const packSyncMod = Math.sin(comp.time * 15 + comp.packSyncPhase) * 0.05 * comp.coordination
				comp.jawOpen += packSyncMod
			}
			break
		}
		case WolfAction.Stun:
		case WolfAction.Hit: {
			let stunDuration = 0.2

			// Intelligence affects recovery time (smarter wolves recover faster)
			stunDuration *= (1 - comp.intelligence * 0.3)

			// Low morale wolves stay stunned longer
			stunDuration *= (1 + (1 - comp.morale) * 0.5)

			comp.stunTimer = Math.max(comp.stunTimer, stunDuration)
			break
		}
		default:
			comp.pounceTimer = 0
	}

	// Decay jaw open softly
	let jawDecayRate = 12

	// Emotional state affects jaw relaxation speed
	if (emotionalMod === WolfEmotionalState.Frustrated) {
		jawDecayRate *= 1.5 // Frustrated wolves snap jaws shut faster
	} else if (emotionalMod === WolfEmotionalState.Calm) {
		jawDecayRate *= 0.8 // Calm wolves relax more slowly
	}

	comp.jawOpen = smooth(comp.jawOpen, 0, jawDecayRate, dt)

	// Decay stun timer
	if (comp.stunTimer > 0) comp.stunTimer = Math.max(0, comp.stunTimer - dt)
}

// ---------------------------------------------
// Pose buffer packing
// ---------------------------------------------

export function writePoseToBuffer(comp, out) {
	if (!out || out.length < WolfPoseLayout.Size) { return }
	out[WolfPoseLayout.RootX] = comp.root.x
	out[WolfPoseLayout.RootY] = comp.root.y
	out[WolfPoseLayout.RootHeight] = comp.root.height
	out[WolfPoseLayout.RootYaw] = comp.root.yaw
	out[WolfPoseLayout.RootPitch] = comp.root.pitch
	out[WolfPoseLayout.SpineCurve] = comp.spineCurve
	out[WolfPoseLayout.NeckYaw] = comp.neckYaw
	out[WolfPoseLayout.NeckPitch] = comp.neckPitch
	out[WolfPoseLayout.HeadYaw] = comp.headYaw
	out[WolfPoseLayout.HeadPitch] = comp.headPitch
	out[WolfPoseLayout.JawOpen] = comp.jawOpen
	out[WolfPoseLayout.TailBaseYaw] = comp.tailYaw
	out[WolfPoseLayout.TailBasePitch] = comp.tailPitch
	out[WolfPoseLayout.EarLeftYaw] = comp.earLeftYaw
	out[WolfPoseLayout.EarRightYaw] = comp.earRightYaw
	out[WolfPoseLayout.Breathing] = comp.breathing

	let o = WolfPoseLayout.FootXYStart
	for (let i = 0; i < 4; i++) {
		out[o++] = comp.footPos[i].x
		out[o++] = comp.footPos[i].y
	}
	o = WolfPoseLayout.FootPlantStart
	for (let i = 0; i < 4; i++) out[o++] = comp.legStance[i]
	o = WolfPoseLayout.LegExtensionStart
	for (let i = 0; i < 4; i++) out[o++] = comp.legExtension[i]
	o = WolfPoseLayout.LegLiftStart
	for (let i = 0; i < 4; i++) out[o++] = comp.legLift[i]
	out[WolfPoseLayout.DebugFlags] = comp.debugFlags
}

// ---------------------------------------------
// Input buffer unpacking
// ---------------------------------------------

export function readInputsFromBuffer(comp, input) {
	if (!input || input.length < WolfInputLayout.Size) { return }
	comp.velocityWorld.x = input[WolfInputLayout.VelX]
	comp.velocityWorld.y = input[WolfInputLayout.VelY]
	comp.speed = input[WolfInputLayout.Speed]
	comp.turnRate = input[WolfInputLayout.TurnRate]
	comp.slopeNormal.x = input[WolfInputLayout.SlopeX]
	comp.slopeNormal.y = input[WolfInputLayout.SlopeY]
	comp.slopeNormal.z = input[WolfInputLayout.SlopeZ]
	comp.groundHeight = input[WolfInputLayout.GroundHeight]
	comp.groundMaterial = input[WolfInputLayout.GroundMaterial] | 0
	comp.gait = (input[WolfInputLayout.Gait] | 0)
	comp.alertness = clamp(input[WolfInputLayout.Alertness], 0, 1)
	comp.fatigue = clamp(input[WolfInputLayout.Fatigue], 0, 1)
	comp.targetDir.x = input[WolfInputLayout.TargetDirX]
	comp.targetDir.y = input[WolfInputLayout.TargetDirY]
	// Normalize targetDir to avoid excessive head twist
	comp.targetDir = normalize2D(comp.targetDir)
	comp.targetPos.x = input[WolfInputLayout.TargetPosX]
	comp.targetPos.y = input[WolfInputLayout.TargetPosY]
	comp.action = (input[WolfInputLayout.Action] | 0)
	comp.emotionalState = (input[WolfInputLayout.EmotionalState] | 0)
	comp.terrainType = (input[WolfInputLayout.TerrainType] | 0)
	comp.packRole = (input[WolfInputLayout.PackRole] | 0)
	comp.intelligence = clamp(input[WolfInputLayout.Intelligence], 0, 1)
	comp.aggression = clamp(input[WolfInputLayout.Aggression], 0, 1)
	comp.coordination = clamp(input[WolfInputLayout.Coordination], 0, 1)
	comp.morale = clamp(input[WolfInputLayout.Morale], 0, 1)
	comp.packSize = Math.max(1, input[WolfInputLayout.PackSize] | 0)
	comp.packLeaderDistance = Math.max(0, input[WolfInputLayout.PackLeaderDistance])
	comp.packSyncPhase = input[WolfInputLayout.PackSyncPhase]
}

// ---------------------------------------------
// Helpers
// ---------------------------------------------

function lerp(a, b, t) { return a + (b - a) * t }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
function smoothstep(edge0, edge1, x) {
	// Hermite smoothstep: 0 at edge0, 1 at edge1, smooth cubic in between
	const t = clamp((x - edge0) / ((edge1 - edge0) || 1e-6), 0, 1)
	return t * t * (3 - 2 * t)
}
function wrap01(v) { return v - Math.floor(v) }
function length2D(v) { return Math.hypot(v.x, v.y) }
function normalize2D(v) { const L = length2D(v); return L > 1e-5 ? { x: v.x / L, y: v.y / L } : { x: 1, y: 0 } }
function mul2D(v, s) { return { x: v.x * s, y: v.y * s } }
function distance2D(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }
function atan2safe(y, x) { return Math.atan2(y, x || 1e-6) }
function smooth(current, target, rate, dt) { const t = 1 - Math.exp(-rate * dt); return current + (target - current) * t }

function parabolicArc(t, height) {
	// Simple parabola peaking at t=0.5, f(0)=0, f(1)=0
	const s = t * (1 - t) * 4
	return s * height
}

function worldFromBody(comp, p) {
	// Body frame assumed centered at pelvis root at (root.x, root.y)
	const c = Math.cos(comp.root.yaw)
	const s = Math.sin(comp.root.yaw)
	return {
		x: comp.root.x + c * p.x - s * p.y,
		y: comp.root.y + s * p.x + c * p.y
	}
}

function bodyFromWorld(comp, p) {
	const c = Math.cos(-comp.root.yaw)
	const s = Math.sin(-comp.root.yaw)
	const dx = p.x - comp.root.x
	const dy = p.y - comp.root.y
	return { x: c * dx - s * dy, y: s * dx + c * dy }
}

function frictionFromTerrain(terrainType) {
	switch (terrainType) {
		case TerrainType.Water: return 0.3
		case TerrainType.LowGround: return 0.6
		case TerrainType.OpenField: return 0.8
		case TerrainType.Cover: return 0.75
		case TerrainType.Chokepoint: return 0.85
		case TerrainType.HighGround: return 0.9
		default: return 0.8
	}
}

// Planner-side refinement using known slope/terrain (no raycasts here)
function refineFootTargetWithTerrain(comp, legIndex, nominalWorld) {
	// Slight bias along downhill based on slope normal
	const n = comp.slopeNormal || { x: 0, y: 1, z: 0 }
	const downhill = { x: -n.x, y: 0 } // 2D projection
	const scale = 0.04 * (1 - n.y) // steeper slope => more bias
	const px = nominalWorld.x + downhill.x * scale
	const py = nominalWorld.y // y will be set by placement raycast later
	return {
		position: { x: px, y: py },
		normal: { x: 0, y: 1, z: 0 },
		friction: frictionFromTerrain(comp.terrainType)
	}
}

// IK-side refinement performing terrain sampling via raycasts
function refineFootPlacement(comp, legIndex, desiredWorld, raycastGround) {
	const radius = comp.ik.stepSearchRadius || 0.1
	const samples = []
	const forward = normalize2D(comp.velocityWorld)
	const lateral = { x: -forward.y, y: forward.x }
	// Candidate offsets: center, forward/back, lateral, diagonals
	const offs = [
		{ x: 0, y: 0, w: 1.0 },
		{ x: radius, y: 0, w: 0.8 },
		{ x: -radius, y: 0, w: 0.8 },
		{ x: 0, y: radius, w: 0.8 },
		{ x: 0, y: -radius, w: 0.8 },
		{ x: radius * 0.7, y: radius * 0.7, w: 0.7 },
		{ x: radius * 0.7, y: -radius * 0.7, w: 0.7 },
		{ x: -radius * 0.7, y: radius * 0.7, w: 0.7 },
		{ x: -radius * 0.7, y: -radius * 0.7, w: 0.7 }
	]
	for (let k = 0; k < offs.length; k++) {
		const o = offs[k]
		const dx = forward.x * o.x + lateral.x * o.y
		const dy = forward.y * o.x + lateral.y * o.y
		const cx = desiredWorld.x + dx
		const cy = desiredWorld.y + dy
		const hit = raycastGround(cx, cy)
		const gy = hit?.hit ? hit.y : comp.groundHeight
		samples.push({
			pos: { x: cx, y: gy },
			normal: hit?.normal || { x: 0, y: 1, z: 0 },
			w: o.w
		})
	}
	// Score: prefer flatter (normal.y close to 1), smaller offset, and small height delta to current lock
	let best = samples[0]
	let bestScore = Infinity
	for (let s = 0; s < samples.length; s++) {
		const c = samples[s]
		const flat = 1 - (c.normal.y || 1)
		const offset = distance2D(c.pos, desiredWorld)
		const heightDelta = Math.abs(c.pos.y - (comp.footLock[legIndex].y || comp.groundHeight))
		const score = flat * 2.0 + offset * 1.0 + heightDelta * 0.5 - c.w * 0.2
		if (score < bestScore) { bestScore = score; best = c }
	}
	return { position: best.pos, normal: best.normal, friction: frictionFromTerrain(comp.terrainType) }
}

function alignPawOrientation(comp, legIndex, surfaceNormal, dt) {
	// Yaw follows body yaw; pitch and roll respond to surface and motion
	const yawTarget = comp.root.yaw
	const sideSign = (legIndex % 2 === 0) ? 1 : -1 // left positive, right negative
	const slopeAmt = clamp(1 - (surfaceNormal?.y ?? 1), 0, 1)
	const pitchTarget = clamp((legIndex < 2 ? -1 : 1) * slopeAmt * 0.25, -0.4, 0.4)
	const rollTarget = clamp(sideSign * comp.speed * comp.body.lateralLeanGain * 0.8, -0.35, 0.35)
	const o = comp.footOrient[legIndex]
	o.yaw = smooth(o.yaw, yawTarget, comp.ik.orientYawRate, dt)
	o.pitch = smooth(o.pitch, pitchTarget, comp.ik.orientPitchRate, dt)
	o.roll = smooth(o.roll, rollTarget, comp.ik.orientRollRate, dt)
}

function hashNoise(x) {
	// Small, fast deterministic noise in [0,1]
	let n = Math.sin(x * 12.9898) * 43758.5453
	return n - Math.floor(n)
}

// ---------------------------------------------
// Optional debug utilities (no-op placeholders)
// ---------------------------------------------

export function renderWolfDebug(ctx, comp, camera = { x: 0, y: 0 }) {
	if (!ctx) { return }
	ctx.save()
	ctx.translate(-camera.x, -camera.y)
	// Feet
	ctx.fillStyle = '#44ff88'
	for (let i = 0; i < 4; i++) {
		ctx.beginPath()
		ctx.arc(comp.footPos[i].x, comp.footPos[i].y, 3, 0, Math.PI * 2)
		ctx.fill()
	}
	// Root
	ctx.fillStyle = '#ffffff'
	ctx.fillRect(comp.root.x - 2, comp.root.height - 2, 4, 4)
	ctx.restore()
}

export default {
	WolfGait,
	WolfState,
	WolfAction,
	WolfEmotionalState,
	TerrainType,
	PackRole,
	LegIndex,
	WolfInputLayout,
	WolfPoseLayout,
	createWolfAnimComponent,
	updateWolfAnimation,
	writePoseToBuffer,
	readInputsFromBuffer,
	renderWolfDebug
}


