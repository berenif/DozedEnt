export class MouseInputHandler {
  constructor({ stateManager, registerListener, config }) {
    this.stateManager = stateManager;
    this.registerListener = registerListener;
    this.config = config;
  }

  initialize() {
    const handleMouseDown = (event) => {
      this.stateManager.setPointerDown(true);
      const canvas = document.getElementById('demo-canvas');
      if (canvas && event.target !== canvas) {
        return;
      }

      switch (event.button) {
        case 0:
          this.stateManager.handleAction('light-attack', true);
          break;
        case 2:
          this.stateManager.handleAction('block', true);
          break;
        default:
          break;
      }
    };

    const handleMouseUp = (event) => {
      this.stateManager.setPointerDown(false);
      switch (event.button) {
        case 0:
          this.stateManager.handleAction('light-attack', false);
          break;
        case 2:
          this.stateManager.handleAction('block', false);
          break;
        default:
          break;
      }
    };

    const handleMouseMove = (event) => {
      this.stateManager.setPointerPosition(event.clientX, event.clientY);
    };

    this.registerListener(document, 'mousedown', handleMouseDown);
    this.registerListener(document, 'mouseup', handleMouseUp);
    this.registerListener(document, 'mousemove', handleMouseMove);
  }
}
