# Tutorial System Implementation Guide

## Overview
The tutorial system provides an optional, non-intrusive onboarding experience for first-time players. It showcases controls, explains mechanics, and helps users get started quickly.

## HTML Structure

### Basic Tutorial Overlay
```html
<!-- Add to your main HTML file -->
<div class="tutorial-overlay" id="tutorial-overlay">
  <div class="tutorial-card">
    <h3>Welcome to DozedEnt! 🎮</h3>
    <p>Master these controls to dominate the arena</p>
    
    <div class="tutorial-controls">
      <div class="tutorial-control-item">
        <div class="tutorial-control-icon">🕹️</div>
        <div class="tutorial-control-label">Move</div>
      </div>
      <div class="tutorial-control-item">
        <div class="tutorial-control-icon">⚡</div>
        <div class="tutorial-control-label">Light Attack</div>
      </div>
      <div class="tutorial-control-item">
        <div class="tutorial-control-icon">💥</div>
        <div class="tutorial-control-label">Heavy Attack</div>
      </div>
      <div class="tutorial-control-item">
        <div class="tutorial-control-icon">🛡️</div>
        <div class="tutorial-control-label">Block</div>
      </div>
      <div class="tutorial-control-item">
        <div class="tutorial-control-icon">🔄</div>
        <div class="tutorial-control-label">Roll</div>
      </div>
      <div class="tutorial-control-item">
        <div class="tutorial-control-icon">✨</div>
        <div class="tutorial-control-label">Special</div>
      </div>
    </div>
    
    <button class="tutorial-btn" id="tutorial-next">Got It!</button>
    <div class="skip-tutorial" id="tutorial-skip">Skip Tutorial</div>
    
    <div class="tutorial-progress">
      <div class="tutorial-dot active"></div>
      <div class="tutorial-dot"></div>
      <div class="tutorial-dot"></div>
    </div>
  </div>
</div>
```

## JavaScript Implementation

### Basic Tutorial Manager

```javascript
class TutorialManager {
  constructor() {
    this.overlay = document.getElementById('tutorial-overlay');
    this.currentStep = 0;
    this.steps = [
      {
        title: 'Welcome to DozedEnt! 🎮',
        content: 'Master these controls to dominate the arena',
        controls: ['move', 'lightAttack', 'heavyAttack', 'block', 'roll', 'special']
      },
      {
        title: 'Combat Basics ⚔️',
        content: 'Chain attacks for devastating combos',
        controls: ['lightAttack', 'heavyAttack']
      },
      {
        title: 'Defensive Tactics 🛡️',
        content: 'Time your blocks perfectly for counterattacks',
        controls: ['block', 'roll']
      }
    ];
    
    this.init();
  }
  
  init() {
    // Check if user has completed tutorial before
    const hasSeenTutorial = localStorage.getItem('dozedent_tutorial_completed');
    
    if (!hasSeenTutorial && this.isMobileDevice()) {
      this.show();
    }
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    const nextBtn = document.getElementById('tutorial-next');
    const skipBtn = document.getElementById('tutorial-skip');
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextStep());
    }
    
    if (skipBtn) {
      skipBtn.addEventListener('click', () => this.skip());
    }
  }
  
  show() {
    if (this.overlay) {
      this.overlay.classList.add('active');
      this.renderStep(this.currentStep);
      this.triggerHaptic('medium');
    }
  }
  
  hide() {
    if (this.overlay) {
      this.overlay.classList.remove('active');
    }
  }
  
  nextStep() {
    this.currentStep++;
    
    if (this.currentStep >= this.steps.length) {
      this.complete();
    } else {
      this.renderStep(this.currentStep);
      this.updateProgress();
      this.triggerHaptic('light');
    }
  }
  
  skip() {
    this.triggerHaptic('light');
    this.complete();
  }
  
  complete() {
    localStorage.setItem('dozedent_tutorial_completed', 'true');
    this.hide();
    this.triggerHaptic('success');
    
    // Dispatch event for game initialization
    window.dispatchEvent(new CustomEvent('tutorialComplete'));
  }
  
  renderStep(stepIndex) {
    const step = this.steps[stepIndex];
    const card = this.overlay.querySelector('.tutorial-card');
    
    if (!card) return;
    
    // Update title
    const title = card.querySelector('h3');
    if (title) title.textContent = step.title;
    
    // Update content
    const content = card.querySelector('p');
    if (content) content.textContent = step.content;
    
    // Update controls display
    const controlsContainer = card.querySelector('.tutorial-controls');
    if (controlsContainer) {
      controlsContainer.innerHTML = this.renderControls(step.controls);
    }
    
    // Update button text
    const nextBtn = document.getElementById('tutorial-next');
    if (nextBtn) {
      nextBtn.textContent = stepIndex === this.steps.length - 1 ? 'Start Playing!' : 'Next';
    }
  }
  
  renderControls(controlIds) {
    const controlMap = {
      move: { icon: '🕹️', label: 'Move' },
      lightAttack: { icon: '⚡', label: 'Light Attack' },
      heavyAttack: { icon: '💥', label: 'Heavy Attack' },
      block: { icon: '🛡️', label: 'Block' },
      roll: { icon: '🔄', label: 'Roll' },
      special: { icon: '✨', label: 'Special' }
    };
    
    return controlIds.map(id => {
      const control = controlMap[id];
      return `
        <div class="tutorial-control-item">
          <div class="tutorial-control-icon">${control.icon}</div>
          <div class="tutorial-control-label">${control.label}</div>
        </div>
      `;
    }).join('');
  }
  
  updateProgress() {
    const dots = this.overlay.querySelectorAll('.tutorial-dot');
    dots.forEach((dot, index) => {
      if (index === this.currentStep) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }
  
  triggerHaptic(intensity) {
    if (!navigator.vibrate) return;
    
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 30,
      success: [10, 50, 10, 50, 10]
    };
    
    navigator.vibrate(patterns[intensity] || patterns.medium);
  }
  
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 2);
  }
}

// Initialize tutorial when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const tutorial = new TutorialManager();
  
  // Make it globally accessible if needed
  window.tutorialManager = tutorial;
});
```

## Integration with Game Flow

### Listen for Tutorial Completion
```javascript
window.addEventListener('tutorialComplete', () => {
  console.log('Tutorial completed, starting game...');
  // Initialize game systems
  startGame();
});
```

### Reset Tutorial (for testing)
```javascript
// Add a reset option in developer menu
function resetTutorial() {
  localStorage.removeItem('dozedent_tutorial_completed');
  location.reload();
}
```

## Customization Options

### Multi-Step Tutorial

```javascript
const advancedSteps = [
  {
    title: 'Welcome! 👋',
    content: 'Let\'s learn the basics',
    controls: ['move']
  },
  {
    title: 'Attack Moves ⚔️',
    content: 'Tap to attack, hold for heavy',
    controls: ['lightAttack', 'heavyAttack'],
    hint: 'Try chaining light attacks!'
  },
  {
    title: 'Defense 🛡️',
    content: 'Block incoming attacks',
    controls: ['block'],
    hint: 'Perfect blocks counter-attack'
  },
  {
    title: 'Mobility 🏃',
    content: 'Roll to dodge attacks',
    controls: ['roll'],
    hint: 'Dodge through enemy attacks'
  },
  {
    title: 'Special Moves ✨',
    content: 'Unleash powerful abilities',
    controls: ['special'],
    hint: 'Builds over time with combat'
  }
];
```

### Interactive Tutorial

```javascript
class InteractiveTutorial extends TutorialManager {
  constructor() {
    super();
    this.requiredActions = [];
  }
  
  waitForAction(actionType) {
    return new Promise((resolve) => {
      const handler = (event) => {
        if (event.detail.action === actionType) {
          window.removeEventListener('gameAction', handler);
          this.showSuccess('Great job! 🎉');
          resolve();
        }
      };
      
      window.addEventListener('gameAction', handler);
    });
  }
  
  async nextStep() {
    const step = this.steps[this.currentStep];
    
    if (step.requiresAction) {
      this.showHint('Try it yourself!');
      await this.waitForAction(step.requiredAction);
    }
    
    super.nextStep();
  }
  
  showSuccess(message) {
    const successEl = document.createElement('div');
    successEl.className = 'tutorial-success-message';
    successEl.textContent = message;
    document.body.appendChild(successEl);
    
    setTimeout(() => successEl.remove(), 2000);
  }
}
```

## Control Hints System

### Floating Hints
```javascript
class ControlHints {
  constructor() {
    this.hints = new Map();
    this.shown = new Set();
  }
  
  registerHint(elementId, text, position = 'top') {
    this.hints.set(elementId, { text, position });
  }
  
  show(elementId) {
    if (this.shown.has(elementId)) return;
    
    const element = document.getElementById(elementId);
    const hint = this.hints.get(elementId);
    
    if (!element || !hint) return;
    
    const hintEl = document.createElement('div');
    hintEl.className = 'control-hint';
    hintEl.textContent = hint.text;
    
    const rect = element.getBoundingClientRect();
    hintEl.style.left = rect.left + rect.width / 2 + 'px';
    hintEl.style.top = rect.top - 40 + 'px';
    
    document.body.appendChild(hintEl);
    this.shown.add(elementId);
    
    setTimeout(() => hintEl.remove(), 3000);
  }
  
  reset() {
    this.shown.clear();
  }
}

// Usage
const hints = new ControlHints();
hints.registerHint('joystick', 'Drag to move');
hints.registerHint('light-attack', 'Quick attack');
hints.registerHint('heavy-attack', 'Powerful hit');

// Show hint when user first interacts
document.getElementById('joystick').addEventListener('touchstart', () => {
  hints.show('joystick');
}, { once: true });
```

## Best Practices

### 1. Progressive Disclosure
- Show only essential controls first
- Introduce advanced features gradually
- Allow skipping for experienced players

### 2. Interactive Learning
- Let users try controls immediately
- Provide instant feedback
- Celebrate successful actions

### 3. Contextual Hints
- Show hints when relevant
- Auto-hide after use
- Don't overwhelm with too many at once

### 4. Persistence
- Remember completion state
- Allow tutorial reset option
- Support returning users

### 5. Accessibility
- Ensure tutorial is keyboard navigable
- Provide text alternatives for icons
- Support screen readers
- Allow disabling animations

## Testing Checklist

- [ ] Tutorial appears on first launch
- [ ] Tutorial can be skipped
- [ ] Progress dots update correctly
- [ ] Completion state persists
- [ ] Haptic feedback works
- [ ] Animations are smooth
- [ ] Responsive on all screen sizes
- [ ] Works in landscape and portrait
- [ ] No memory leaks on repeat views
- [ ] Event listeners cleaned up properly

## Analytics Integration

```javascript
class TutorialAnalytics {
  trackStepView(stepIndex) {
    // Track which steps users view
    gtag('event', 'tutorial_step_view', {
      step_index: stepIndex,
      step_name: this.steps[stepIndex].title
    });
  }
  
  trackCompletion() {
    gtag('event', 'tutorial_complete', {
      duration: Date.now() - this.startTime
    });
  }
  
  trackSkip(stepIndex) {
    gtag('event', 'tutorial_skip', {
      skipped_at_step: stepIndex
    });
  }
}
```

## Future Enhancements

1. **Video Tutorials**: Embed short clips showing advanced techniques
2. **Practice Mode**: Sandbox environment for trying controls
3. **Achievements**: Reward tutorial completion
4. **Tips System**: Show contextual tips during gameplay
5. **Difficulty Selection**: Ask user skill level to customize tutorial
6. **Language Support**: Multi-language tutorial text
7. **Accessibility Options**: Audio descriptions, larger text, etc.

---

**Note**: The CSS for the tutorial system has already been added to `/workspace/public/src/css/mobile.css`. You only need to add the HTML structure and JavaScript implementation following the examples above.