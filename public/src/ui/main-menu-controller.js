/**
 * MainMenuController encapsulates start button and main menu interactions.
 * It notifies the host application when the player chooses a launch path.
 */
export class MainMenuController {
  constructor({
    startButtonId = 'start-game-btn',
    menuId = 'main-menu',
    onStartMenu,
    onSelection
  } = {}) {
    this.startButtonId = startButtonId;
    this.menuId = menuId;
    this.onStartMenu = onStartMenu || (() => true);
    this.onSelection = onSelection || (() => {});

    this.startButton = null;
    this.menuElement = null;
    this.boundStartHandler = null;
    this.menuButtonHandlers = new Map();
  }

  /**
   * Cache DOM nodes and bind the start button listener.
   */
  initialize() {
    this.startButton = document.getElementById(this.startButtonId);
    this.menuElement = document.getElementById(this.menuId);

    if (!this.startButton) {
      console.warn(`MainMenuController: start button #${this.startButtonId} not found.`);
      return;
    }

    this.boundStartHandler = () => this.handleStartButtonClick();
    this.startButton.addEventListener('click', this.boundStartHandler);
  }

  /**
   * Remove all bound listeners.
   */
  destroy() {
    if (this.startButton && this.boundStartHandler) {
      this.startButton.removeEventListener('click', this.boundStartHandler);
    }

    this.detachMenuHandlers();
  }

  /**
   * Respond to the start button click by opening the menu or falling back.
   */
  handleStartButtonClick() {
    const proceed = this.onStartMenu();
    if (proceed === false) {
      return;
    }

    this.presentMenu();
  }

  /**
   * Show the menu if available; otherwise immediately notify selection.
   */
  presentMenu() {
    if (!this.menuElement) {
      this.notifySelection('new-game');
      return;
    }

    this.menuElement.classList.remove('hidden');
    this.attachMenuHandlers();
  }

  /**
   * Hide the menu and clear button listeners.
   */
  closeMenu() {
    if (this.menuElement) {
      this.menuElement.classList.add('hidden');
    }

    this.detachMenuHandlers();
  }

  /**
   * Attach one-shot handlers for menu buttons.
   */
  attachMenuHandlers() {
    this.detachMenuHandlers();

    this.registerMenuHandler('menu-new-game', 'new-game');
    this.registerMenuHandler('menu-continue', 'continue');
    this.registerMenuHandler('menu-join-online', 'join-online');
  }

  registerMenuHandler(buttonId, action) {
    const button = document.getElementById(buttonId);
    if (!button) {
      return;
    }

    const handler = () => this.handleMenuSelection(action);
    button.addEventListener('click', handler, { once: true });
    this.menuButtonHandlers.set(button, handler);
  }

  /**
   * Remove existing handlers to prevent duplication when the menu reopens.
   */
  detachMenuHandlers() {
    this.menuButtonHandlers.forEach((handler, button) => {
      button.removeEventListener('click', handler);
    });

    this.menuButtonHandlers.clear();
  }

  /**
   * Handle a menu option selection.
   * @param {string} action
   */
  handleMenuSelection(action) {
    this.closeMenu();
    this.notifySelection(action);
  }

  /**
   * Notify the host application of the chosen action.
   * @param {string} action
   */
  notifySelection(action) {
    this.onSelection(action);
  }
}

export default MainMenuController;
