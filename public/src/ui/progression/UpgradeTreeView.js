// Minimal DOM view to render a list-style upgrade tree

export class UpgradeTreeView {
  constructor(container, viewModel, tree) {
    this.container = container;
    this.vm = viewModel;
    this.tree = tree;
    this.nodesById = new Map();
  }

  render() {
    this.container.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'prog-header';
    this.essenceEl = document.createElement('span');
    header.appendChild(this.essenceEl);
    this.container.appendChild(header);

    const list = document.createElement('div');
    list.className = 'prog-list';
    for (const node of this.tree.nodes) {
      const row = document.createElement('div');
      row.className = 'prog-row';
      const title = document.createElement('div');
      title.className = 'prog-title';
      title.textContent = `${node.title}`;
      const desc = document.createElement('div');
      desc.className = 'prog-desc';
      desc.textContent = node.description || '';
      const buy = document.createElement('button');
      buy.className = 'prog-buy';
      buy.textContent = `Buy (${node.cost})`;
      buy.addEventListener('click', () => this.vm.buy(node.id));
      row.appendChild(title);
      row.appendChild(desc);
      row.appendChild(buy);
      this.nodesById.set(node.id, { row, buy });
      list.appendChild(row);
    }
    this.container.appendChild(list);

    this.vm.onUpdate = (state) => this.updateState(state);
    if (this.vm.state) {this.updateState(this.vm.state);}
  }

  updateState(state) {
    if (!state) {return;}
    this.essenceEl.textContent = `Essence: ${state.essence ?? 0}`;
    // Enable/disable buttons based on levels and cost hints if present
    const levels = state.nodes || {};
    for (const node of this.tree.nodes) {
      const control = this.nodesById.get(node.id);
      if (!control) {continue;}
      const level = levels[node.id] || 0;
      const atMax = level >= (node.maxLevel || 1);
      control.buy.disabled = atMax;
    }
  }
}


