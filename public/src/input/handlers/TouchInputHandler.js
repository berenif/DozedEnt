const JOYSTICK_ELEMENT_IDS = new Set(['joystick', 'joystick-base', 'joystick-knob']);

export class TouchInputHandler {
  constructor({ stateManager, registerListener, config }) {
    this.stateManager = stateManager;
    this.registerListener = registerListener;
    this.config = config;

    this.joystickState = null;
    this.activeTouches = new Map();
  }

  initialize() {
    this.joystickState = {
      active: false,
      center: { x: 0, y: 0 },
      maxDistance: 60,
      touchId: null
    };

    const handleTouchStart = (event) => {
      for (const touch of event.changedTouches) {
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (this.config.debugInput) {
          console.log(`dY† Touch start at (${touch.clientX}, ${touch.clientY})`, element?.id || element?.className);
        }

        if (this.#isJoystickElement(element)) {
          event.preventDefault();
          this.handleJoystickStart(touch);
          this.activeTouches.set(touch.identifier, { type: 'joystick', element });
        } else if (element && element.closest('.action-btn')) {
          event.preventDefault();
          const actionBtn = element.closest('.action-btn');
          if (this.config.debugInput) {
            console.log('dYZ_ Action button touch detected:', actionBtn.dataset.action);
          }
          this.handleActionButtonTouch(actionBtn, true);
          this.activeTouches.set(touch.identifier, { type: 'button', element: actionBtn });
        } else {
          this.stateManager.setPointerPosition(touch.clientX, touch.clientY);
          this.stateManager.setPointerDown(true);
          this.activeTouches.set(touch.identifier, { type: 'pointer' });
        }
      }
    };

    const handleTouchMove = (event) => {
      for (const touch of event.changedTouches) {
        const touchData = this.activeTouches.get(touch.identifier);
        if (!touchData) {
          continue;
        }

        if (touchData.type === 'joystick') {
          event.preventDefault();
          this.handleJoystickMove(touch);
        } else if (touchData.type === 'pointer') {
          this.stateManager.setPointerPosition(touch.clientX, touch.clientY);
        }
      }
    };

    const handleTouchEnd = (event) => {
      for (const touch of event.changedTouches) {
        const touchData = this.activeTouches.get(touch.identifier);
        if (!touchData) {
          continue;
        }

        if (touchData.type === 'joystick') {
          this.handleJoystickEnd();
        } else if (touchData.type === 'button') {
          this.handleActionButtonTouch(touchData.element, false);
        } else if (touchData.type === 'pointer') {
          this.stateManager.setPointerDown(false);
        }

        this.activeTouches.delete(touch.identifier);
      }
    };

    this.registerListener(document, 'touchstart', handleTouchStart, { passive: false });
    this.registerListener(document, 'touchmove', handleTouchMove, { passive: false });
    this.registerListener(document, 'touchend', handleTouchEnd, { passive: false });
    this.registerListener(document, 'touchcancel', handleTouchEnd, { passive: false });
  }

  handleJoystickStart(touch) {
    this.joystickState.active = true;
    this.joystickState.touchId = touch.identifier;
    this.joystickState.center.x = touch.clientX;
    this.joystickState.center.y = touch.clientY;

    const joystickBase = document.getElementById('joystick-base');
    const joystickKnob = document.getElementById('joystick-knob');
    if (joystickBase && joystickKnob) {
      joystickBase.style.display = 'block';
      joystickKnob.style.display = 'block';
      joystickBase.style.left = `${touch.clientX - joystickBase.offsetWidth / 2}px`;
      joystickBase.style.top = `${touch.clientY - joystickBase.offsetHeight / 2}px`;
      joystickKnob.style.left = `${touch.clientX - joystickKnob.offsetWidth / 2}px`;
      joystickKnob.style.top = `${touch.clientY - joystickKnob.offsetHeight / 2}px`;
    }

    this.stateManager.setMovementVector(0, 0, { updateLastDirection: false });
  }

  handleJoystickMove(touch) {
    if (!this.joystickState.active || this.joystickState.touchId !== touch.identifier) {
      return;
    }

    const dx = touch.clientX - this.joystickState.center.x;
    const dy = touch.clientY - this.joystickState.center.y;
    const distance = Math.min(this.joystickState.maxDistance, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx);

    const normalizedX = Math.cos(angle) * (distance / this.joystickState.maxDistance);
    const normalizedY = Math.sin(angle) * (distance / this.joystickState.maxDistance);

    this.stateManager.setMovementVector(normalizedX, normalizedY);

    const joystickKnob = document.getElementById('joystick-knob');
    if (joystickKnob) {
      joystickKnob.style.left = `${this.joystickState.center.x + normalizedX * this.joystickState.maxDistance - joystickKnob.offsetWidth / 2}px`;
      joystickKnob.style.top = `${this.joystickState.center.y + normalizedY * this.joystickState.maxDistance - joystickKnob.offsetHeight / 2}px`;
    }
  }

  handleJoystickEnd() {
    this.joystickState.active = false;
    this.joystickState.touchId = null;
    this.stateManager.setMovementVector(0, 0, { updateLastDirection: false });

    const joystickBase = document.getElementById('joystick-base');
    const joystickKnob = document.getElementById('joystick-knob');
    if (joystickBase && joystickKnob) {
      joystickBase.style.display = 'none';
      joystickKnob.style.display = 'none';
    }
  }

  handleActionButtonTouch(button, pressed) {
    if (!button || !button.dataset.action) {
      return;
    }

    const action = button.dataset.action;

    // Handle both camelCase (HTML) and kebab-case formats
    switch (action) {
      case 'lightAttack':
      case 'light-attack':
        this.stateManager.handleAction('light-attack', pressed);
        break;
      case 'heavyAttack':
      case 'heavy-attack':
        this.stateManager.handleAction('heavy-attack', pressed);
        break;
      case 'block':
        this.stateManager.handleAction('block', pressed);
        break;
      case 'roll':
        this.stateManager.handleAction('roll', pressed);
        break;
      case 'special':
        this.stateManager.handleAction('special', pressed);
        break;
      // Three-button system support (camelCase -> kebab-case)
      case 'leftHand':
        this.stateManager.handleAction('left-hand', pressed);
        break;
      case 'rightHand':
        this.stateManager.handleAction('right-hand', pressed);
        break;
      case 'special3':
        this.stateManager.handleAction('special3', pressed);
        break;
      default:
        // Try passing through the action directly for custom buttons
        if (this.config.debugInput) {
          console.log(`[Touch] Unknown action: ${action}`);
        }
        this.stateManager.handleAction(action, pressed);
        break;
    }
  }

  #isJoystickElement(element) {
    if (!element) {
      return false;
    }
    if (JOYSTICK_ELEMENT_IDS.has(element.id)) {
      return true;
    }
    const closest = element.closest('#joystick, #joystick-base, #joystick-knob');
    return Boolean(closest);
  }
}
