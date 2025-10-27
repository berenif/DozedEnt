// ESM stub for Skeleton WASM glue. Provides a JS implementation compatible
// with the expected interface so demos can run without the compiled WASM.
// If you later drop in the real Emscripten output with the same filename,
// this file can be replaced.

class Skeleton {
  constructor() {
    this.bones = [];
    this.joints = [];
    this.initialPositions = [];
    this._forceUpdate = true; // Force update on first frame
    this._updateCount = 0;
  }

  // API expected by WasmLoaderService.createWasmSkeleton
  addBone(name, parentIndex, px, py, pz, length, radius, mass) {
    const idx = this.bones.length;
    
    // Compute absolute position from parent
    let absPos;
    if (parentIndex < 0) {
      // Root bone - use absolute position
      absPos = { x: px, y: py, z: pz };
    } else {
      // Child bone - px, py, pz are offsets from parent
      const parentPos = this.bones[parentIndex].position;
      absPos = {
        x: parentPos.x + px,
        y: parentPos.y + py,
        z: parentPos.z + pz
      };
    }
    
    this.bones.push({
      name,
      parentIndex,
      position: { ...absPos },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      length,
      radius,
      mass,
      velocity: { x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
      offsetFromParent: { x: px, y: py, z: pz } // Store the offset
    });
    this.initialPositions.push({ ...absPos });
    return idx;
  }

  addJoint(name, parentIdx, childIdx, type,
           minX, minY, minZ, maxX, maxY, maxZ,
           stiffness, damping) {
    const idx = this.joints.length;
    this.joints.push({
      name, parentIdx, childIdx, type,
      limits: [minX, minY, minZ, maxX, maxY, maxZ],
      targetAngles: { x: 0, y: 0, z: 0 },
      currentAngles: { x: 0, y: 0, z: 0 },
      stiffness, damping
    });
    return idx;
  }

  // Simple forward kinematics update
  update(dt) {
    if (!dt || dt <= 0) return; // Skip invalid dt
    
    // Smoothly interpolate current angles toward target angles
    let hasChanges = false;
    for (const joint of this.joints) {
      const lerpFactor = Math.min(1.0, dt * 5.0); // Smooth transition
      const oldX = joint.currentAngles.x;
      joint.currentAngles.x += (joint.targetAngles.x - joint.currentAngles.x) * lerpFactor;
      joint.currentAngles.y += (joint.targetAngles.y - joint.currentAngles.y) * lerpFactor;
      joint.currentAngles.z += (joint.targetAngles.z - joint.currentAngles.z) * lerpFactor;
      
      if (Math.abs(joint.currentAngles.x - oldX) > 0.001) {
        hasChanges = true;
      }
    }

    // Apply forward kinematics
    if (hasChanges || this._forceUpdate) {
      this._updateBonePositions();
      this._forceUpdate = false;
    }
  }

  _updateBonePositions() {
    this._updateCount++;
    
    // Simple forward kinematics: update bone positions based on parent bones and joint angles
    for (let i = 0; i < this.bones.length; i++) {
      const bone = this.bones[i];
      if (bone.parentIndex < 0) {
        // Root bone stays at initial position
        bone.position = { ...this.initialPositions[i] };
        continue;
      }

      // Find the joint connecting this bone to its parent
      const joint = this.joints.find(j => j.childIdx === i);
      const parent = this.bones[bone.parentIndex];
      const offset = bone.offsetFromParent;
      
      if (!joint) {
        // No joint found, use unrotated offset from parent
        bone.position = {
          x: parent.position.x + offset.x,
          y: parent.position.y + offset.y,
          z: parent.position.z + offset.z
        };
        continue;
      }

      // Apply joint rotation to the offset
      const rotated = this._rotateVector(offset, joint.currentAngles);
      bone.position = {
        x: parent.position.x + rotated.x,
        y: parent.position.y + rotated.y,
        z: parent.position.z + rotated.z
      };
      
      // Debug log every 60 frames for a specific bone
      if (this._updateCount % 60 === 0 && i === 9) { // upperArm_R
        console.log(`[Frame ${this._updateCount}] Bone ${i} (${bone.name}): pos=[${bone.position.x.toFixed(2)}, ${bone.position.y.toFixed(2)}, ${bone.position.z.toFixed(2)}], joint angles=[${joint.currentAngles.x.toFixed(2)}, ${joint.currentAngles.y.toFixed(2)}, ${joint.currentAngles.z.toFixed(2)}]`);
      }
    }
  }

  _rotateVector(v, angles) {
    // Apply rotations in XYZ order
    let x = v.x, y = v.y, z = v.z;
    
    // Rotation around X axis
    if (angles.x !== 0) {
      const cos = Math.cos(angles.x);
      const sin = Math.sin(angles.x);
      const ny = y * cos - z * sin;
      const nz = y * sin + z * cos;
      y = ny;
      z = nz;
    }
    
    // Rotation around Y axis
    if (angles.y !== 0) {
      const cos = Math.cos(angles.y);
      const sin = Math.sin(angles.y);
      const nx = x * cos + z * sin;
      const nz = -x * sin + z * cos;
      x = nx;
      z = nz;
    }
    
    // Rotation around Z axis
    if (angles.z !== 0) {
      const cos = Math.cos(angles.z);
      const sin = Math.sin(angles.z);
      const nx = x * cos - y * sin;
      const ny = x * sin + y * cos;
      x = nx;
      y = ny;
    }
    
    return { x, y, z };
  }

  // Query API
  getBoneCount() { return this.bones.length; }
  getJointCount() { return this.joints.length; }
  getBonePosition(i) { return this.bones[i]?.position || { x: 0, y: 0, z: 0 }; }
  getBoneRotation(i) { return this.bones[i]?.rotation || { x: 0, y: 0, z: 0, w: 1 }; }
  getBoneName(i) { return this.bones[i]?.name || ''; }
  getBoneLength(i) { return this.bones[i]?.length || 0; }
  getBoneRadius(i) { return this.bones[i]?.radius || 0; }
  getJointName(i) { return this.joints[i]?.name || ''; }
  getJointChildBoneIndex(i) { return this.joints[i]?.childIdx ?? -1; }

  // Control API
  setPhysicsEnabled(_enabled) {
    console.log('setPhysicsEnabled:', _enabled);
  }
  setGravityEnabled(_enabled) {
    console.log('setGravityEnabled:', _enabled);
  }
  setGlobalStiffness(_v) {
    console.log('setGlobalStiffness:', _v);
  }
  setGlobalDamping(_v) {
    console.log('setGlobalDamping:', _v);
  }
  setJointTargetAngles(index, x, y, z) {
    if (this.joints[index]) {
      this.joints[index].targetAngles = { x, y, z };
      this._forceUpdate = true; // Force update when angles change
      
      // Only log occasionally to avoid spam
      if (this._updateCount % 60 === 0) {
        console.log(`[Frame ${this._updateCount}] Joint ${index} (${this.joints[index].name}): target=[${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}], current=[${this.joints[index].currentAngles.x.toFixed(2)}, ${this.joints[index].currentAngles.y.toFixed(2)}, ${this.joints[index].currentAngles.z.toFixed(2)}]`);
      }
    } else {
      console.warn(`setJointTargetAngles: joint ${index} not found`);
    }
  }
}

export default async function createModule() {
  // Emulate Emscripten factory shape: return object with classes/functions
  return {
    Skeleton
  };
}


