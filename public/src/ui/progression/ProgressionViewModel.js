// ViewModel surfaces observable state for the progression UI

export class ProgressionViewModel {
  constructor(progressionManager) {
    this.pm = progressionManager;
    this.classId = null;
    this.state = null;
    this.subs = [];
  }

  attach(classId) {
    this.classId = classId;
    this.state = this.pm.loadClassState(classId);
    this.subs.push(this.pm.on('stateChanged', ({ classId: cid, state }) => {
      if (cid !== this.classId) return;
      this.state = state;
      this.onUpdate && this.onUpdate(this.state);
    }));
    this.subs.push(this.pm.on('essenceChanged', ({ classId: cid, essence }) => {
      if (cid !== this.classId) return;
      if (!this.state) this.state = { essence };
      else this.state.essence = essence;
      this.onUpdate && this.onUpdate(this.state);
    }));
  }

  detach() {
    for (const off of this.subs) off();
    this.subs = [];
  }

  canBuy(nodeId) {
    if (!this.state) return false;
    return true;
  }

  buy(nodeId) {
    if (!this.classId) return false;
    return this.pm.purchase(this.classId, nodeId);
  }
}


