export class KeyboardInputHandler {
  constructor({ stateManager, registerListener }) {
    this.stateManager = stateManager;
    this.registerListener = registerListener;
  }

  initialize() {
    const handleKeyDown = (event) => {
      const action = this.stateManager.getKeyMapping(event.code);
      if (!action) {
        return;
      }
      event.preventDefault();
      this.stateManager.handleAction(action, true);
      this.stateManager.addToInputBuffer(action);
    };

    const handleKeyUp = (event) => {
      const action = this.stateManager.getKeyMapping(event.code);
      if (!action) {
        return;
      }
      event.preventDefault();
      this.stateManager.handleAction(action, false);
    };

    this.registerListener(document, 'keydown', handleKeyDown);
    this.registerListener(document, 'keyup', handleKeyUp);
  }
}
