// WolfSnapshotReader.js
// Helper for rendering layer to read wolf snapshots efficiently

export class WolfSnapshotReader {
  constructor(wolfStateManager) {
    this.wolfStateManager = wolfStateManager
    this._lastTick = -1
    this._snapshot = { wolves: [], packs: [], valid: false }
  }

  read(tick) {
    const snap = this.wolfStateManager.getSnapshot(tick)
    // Keep a local reference to avoid repeated freezes/copies in render loop
    this._snapshot = snap
    this._lastTick = typeof tick === 'number' ? tick : this._lastTick + 1
    return this._snapshot
  }
}


