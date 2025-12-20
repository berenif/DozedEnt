// Coordinator wires lifecycle and input to the progression UI
import { ProgressionManager } from './progression-manager.js';
import { ProgressionViewModel } from '../../ui/progression/ProgressionViewModel.js';
import { UpgradeTreeView } from '../../ui/progression/UpgradeTreeView.js';

export class ProgressionCoordinator {
  constructor(modulePromise, root, options = {}) {
    this.pm = new ProgressionManager(modulePromise);
    this.root = root;
    this.vm = null;
    this.view = null;
    this.classId = options.classId || 'warden';
  }

  async start() {
    await this.pm.init();
    const tree = this.pm.trees.get(this.classId);
    this.vm = new ProgressionViewModel(this.pm);
    this.vm.attach(this.classId);
    this.view = new UpgradeTreeView(this.root, this.vm, tree);
    this.view.render();
  }

  stop() {
    if (this.vm) {this.vm.detach();}
  }
}


