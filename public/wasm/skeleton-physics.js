// ESM stub for Skeleton WASM glue. Provides a JS implementation compatible
// with the expected interface so demos can run without the compiled WASM.
// If you later drop in the real Emscripten output with the same filename,
// this file can be replaced.

class Skeleton {
  constructor() {
    this.bones = [];
    this.joints = [];
  }

  // API expected by WasmLoaderService.createWasmSkeleton
  addBone(name, parentIndex, px, py, pz, length, radius, mass) {
    const idx = this.bones.length;
    this.bones.push({
      name,
      parentIndex,
      position: { x: px, y: py, z: pz },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      length,
      radius,
      mass,
      velocity: { x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 }
    });
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
      stiffness, damping
    });
    return idx;
  }

  // Minimal physics/update placeholder (no-op)
  update(dt) {
    // Intentionally minimal; replace with real integration when using WASM
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
  setPhysicsEnabled(_enabled) {}
  setGravityEnabled(_enabled) {}
  setGlobalStiffness(_v) {}
  setGlobalDamping(_v) {}
  setJointTargetAngles(index, x, y, z) {
    if (this.joints[index]) {
      this.joints[index].targetAngles = { x, y, z };
    }
  }
}

export default async function createModule() {
  // Emulate Emscripten factory shape: return object with classes/functions
  return {
    Skeleton
  };
}


