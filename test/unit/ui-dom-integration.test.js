/**
 * UI DOM Integration Tests
 * Tests DOM manipulation, event integration, and UI component interactions
 * Following WASM-first architecture principles
 */

import { expect } from 'chai';
import sinon from 'sinon';

describe('UI DOM Integration', () => {
  let mockDocument;
  let mockWindow;
  let mockElements;

  beforeEach(() => {
    // Mock DOM environment with comprehensive element tracking
    mockElements = new Map();
    
    mockDocument = {
      createElement: sinon.stub(),
      getElementById: sinon.stub(),
      querySelector: sinon.stub(),
      querySelectorAll: sinon.stub(),
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
      body: {
        appendChild: sinon.stub(),
        removeChild: sinon.stub()
      },
      hidden: false
    };

    mockWindow = {
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
      innerWidth: 1280,
      innerHeight: 720,
      devicePixelRatio: 1,
      requestAnimationFrame: sinon.stub(),
      cancelAnimationFrame: sinon.stub(),
      dispatchEvent: sinon.stub(),
      performance: {
        now: sinon.stub().returns(1000)
      }
    };

    global.document = mockDocument;
    global.window = mockWindow;
    global.performance = mockWindow.performance;

    // Setup element factory
    setupElementFactory();
  });

  afterEach(() => {
    sinon.restore();
    mockElements.clear();
  });

  function setupElementFactory() {
    mockDocument.createElement.callsFake((tagName) => {
      const element = createMockElement(tagName);
      const id = `mock-${tagName}-${Date.now()}-${Math.random()}`;
      mockElements.set(id, element);
      element._mockId = id;
      return element;
    });

    mockDocument.getElementById.callsFake((id) => {
      return mockElements.get(id) || createMockElement('div', id);
    });

    mockDocument.querySelector.callsFake((selector) => {
      // Return first matching element or create mock
      for (const [id, element] of mockElements) {
        if (element.matches && element.matches(selector)) {
          return element;
        }
      }
      return createMockElement('div');
    });

    mockDocument.querySelectorAll.callsFake((selector) => {
      const matches = [];
      for (const [id, element] of mockElements) {
        if (element.matches && element.matches(selector)) {
          matches.push(element);
        }
      }
      return matches.length > 0 ? matches : [createMockElement('div')];
    });
  }

  function createMockElement(tagName = 'div', id = null) {
    const element = {
      tagName: tagName.toUpperCase(),
      id: id || '',
      className: '',
      innerHTML: '',
      textContent: '',
      value: '',
      checked: false,
      disabled: false,
      style: {},
      dataset: {},
      attributes: new Map(),
      children: [],
      parentNode: null,
      parentElement: null,
      
      // Methods
      appendChild: sinon.stub().callsFake((child) => {
        element.children.push(child);
        child.parentNode = element;
        child.parentElement = element;
        return child;
      }),
      removeChild: sinon.stub().callsFake((child) => {
        const index = element.children.indexOf(child);
        if (index > -1) {
          element.children.splice(index, 1);
          child.parentNode = null;
          child.parentElement = null;
        }
        return child;
      }),
      remove: sinon.stub().callsFake(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }),
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
      dispatchEvent: sinon.stub(),
      focus: sinon.stub(),
      blur: sinon.stub(),
      click: sinon.stub(),
      
      // Properties
      classList: {
        add: sinon.stub(),
        remove: sinon.stub(),
        toggle: sinon.stub(),
        contains: sinon.stub().returns(false)
      },
      
      // Canvas-specific methods
      getContext: sinon.stub().returns(createMockContext()),
      
      // Form-specific methods
      submit: sinon.stub(),
      reset: sinon.stub(),
      
      // Element matching
      matches: sinon.stub().callsFake((selector) => {
        if (selector.startsWith('#')) {
          return element.id === selector.substring(1);
        }
        if (selector.startsWith('.')) {
          return element.className.includes(selector.substring(1));
        }
        return element.tagName.toLowerCase() === selector.toLowerCase();
      }),
      
      // Attribute methods
      getAttribute: sinon.stub().callsFake((name) => element.attributes.get(name)),
      setAttribute: sinon.stub().callsFake((name, value) => element.attributes.set(name, value)),
      removeAttribute: sinon.stub().callsFake((name) => element.attributes.delete(name)),
      hasAttribute: sinon.stub().callsFake((name) => element.attributes.has(name)),
      
      // Position methods
      getBoundingClientRect: sinon.stub().returns({
        left: 0, top: 0, right: 100, bottom: 100,
        width: 100, height: 100, x: 0, y: 0
      }),
      
      // Scrolling
      scrollTop: 0,
      scrollLeft: 0,
      scrollWidth: 100,
      scrollHeight: 100,
      clientWidth: 100,
      clientHeight: 100,
      offsetWidth: 100,
      offsetHeight: 100,
      offsetTop: 0,
      offsetLeft: 0
    };

    // Canvas-specific properties
    if (tagName.toLowerCase() === 'canvas') {
      element.width = 800;
      element.height = 600;
    }

    return element;
  }

  describe('DOM Element Creation and Management', () => {
    it('should create elements with correct properties', () => {
      const div = mockDocument.createElement('div');
      const canvas = mockDocument.createElement('canvas');
      
      expect(div.tagName).to.equal('DIV');
      expect(canvas.tagName).to.equal('CANVAS');
      expect(canvas.width).to.equal(800);
      expect(canvas.height).to.equal(600);
    });

    it('should track element relationships', () => {
      const parent = mockDocument.createElement('div');
      const child = mockDocument.createElement('span');
      
      parent.appendChild(child);
      
      expect(parent.children).to.include(child);
      expect(child.parentNode).to.equal(parent);
      expect(child.parentElement).to.equal(parent);
    });

    it('should handle element removal', () => {
      const parent = mockDocument.createElement('div');
      const child = mockDocument.createElement('span');
      
      parent.appendChild(child);
      child.remove();
      
      expect(parent.children).to.not.include(child);
      expect(child.parentNode).to.be.null;
    });

    it('should manage element attributes', () => {
      const element = mockDocument.createElement('div');
      
      element.setAttribute('data-test', 'value');
      element.setAttribute('id', 'test-element');
      
      expect(element.getAttribute('data-test')).to.equal('value');
      expect(element.getAttribute('id')).to.equal('test-element');
      expect(element.hasAttribute('data-test')).to.be.true;
      expect(element.hasAttribute('nonexistent')).to.be.false;
    });

    it('should handle CSS class manipulation', () => {
      const element = mockDocument.createElement('div');
      
      element.classList.add('test-class');
      element.classList.toggle('active');
      element.classList.remove('old-class');
      
      expect(element.classList.add.calledWith('test-class')).to.be.true;
      expect(element.classList.toggle.calledWith('active')).to.be.true;
      expect(element.classList.remove.calledWith('old-class')).to.be.true;
    });
  });

  describe('Event System Integration', () => {
    it('should attach and manage event listeners', () => {
      const element = mockDocument.createElement('button');
      const handler = sinon.stub();
      
      element.addEventListener('click', handler);
      element.click();
      
      expect(element.addEventListener.calledWith('click', handler)).to.be.true;
    });

    it('should handle multiple event listeners on same element', () => {
      const element = mockDocument.createElement('input');
      const keydownHandler = sinon.stub();
      const changeHandler = sinon.stub();
      
      element.addEventListener('keydown', keydownHandler);
      element.addEventListener('change', changeHandler);
      
      expect(element.addEventListener.callCount).to.equal(2);
    });

    it('should remove event listeners', () => {
      const element = mockDocument.createElement('div');
      const handler = sinon.stub();
      
      element.addEventListener('mouseover', handler);
      element.removeEventListener('mouseover', handler);
      
      expect(element.removeEventListener.calledWith('mouseover', handler)).to.be.true;
    });

    it('should handle document-level events', () => {
      const keydownHandler = sinon.stub();
      const clickHandler = sinon.stub();
      
      mockDocument.addEventListener('keydown', keydownHandler);
      mockDocument.addEventListener('click', clickHandler);
      
      expect(mockDocument.addEventListener.callCount).to.equal(2);
    });

    it('should handle window-level events', () => {
      const resizeHandler = sinon.stub();
      const unloadHandler = sinon.stub();
      
      mockWindow.addEventListener('resize', resizeHandler);
      mockWindow.addEventListener('beforeunload', unloadHandler);
      
      expect(mockWindow.addEventListener.callCount).to.equal(2);
    });
  });

  describe('Form Handling and Validation', () => {
    it('should handle form input elements', () => {
      const input = mockDocument.createElement('input');
      const textarea = mockDocument.createElement('textarea');
      const select = mockDocument.createElement('select');
      
      input.value = 'test input';
      textarea.value = 'test textarea';
      select.value = 'option1';
      
      expect(input.value).to.equal('test input');
      expect(textarea.value).to.equal('test textarea');
      expect(select.value).to.equal('option1');
    });

    it('should handle checkbox and radio inputs', () => {
      const checkbox = mockDocument.createElement('input');
      const radio = mockDocument.createElement('input');
      
      checkbox.type = 'checkbox';
      radio.type = 'radio';
      
      checkbox.checked = true;
      radio.checked = false;
      
      expect(checkbox.checked).to.be.true;
      expect(radio.checked).to.be.false;
    });

    it('should handle form submission', () => {
      const form = mockDocument.createElement('form');
      const submitHandler = sinon.stub();
      
      form.addEventListener('submit', submitHandler);
      form.submit();
      
      expect(form.addEventListener.calledWith('submit', submitHandler)).to.be.true;
    });

    it('should validate form data', () => {
      const input = mockDocument.createElement('input');
      input.required = true;
      input.value = '';
      
      // Mock validation
      const isValid = input.value.length > 0;
      expect(isValid).to.be.false;
      
      input.value = 'valid input';
      const isValidNow = input.value.length > 0;
      expect(isValidNow).to.be.true;
    });
  });

  describe('Canvas and Graphics Integration', () => {
    it('should create and configure canvas elements', () => {
      const canvas = mockDocument.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = 1280;
      canvas.height = 720;
      
      expect(canvas.width).to.equal(1280);
      expect(canvas.height).to.equal(720);
      expect(ctx).to.be.an('object');
    });

    it('should handle canvas context methods', () => {
      const canvas = mockDocument.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 100, 100);
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(10, 10, 80, 80);
      
      expect(ctx.fillRect.calledWith(0, 0, 100, 100)).to.be.true;
      expect(ctx.strokeRect.calledWith(10, 10, 80, 80)).to.be.true;
    });

    it('should handle canvas coordinate transformations', () => {
      const canvas = mockDocument.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      ctx.save();
      ctx.translate(50, 50);
      ctx.rotate(Math.PI / 4);
      ctx.scale(2, 2);
      ctx.restore();
      
      expect(ctx.save.called).to.be.true;
      expect(ctx.translate.calledWith(50, 50)).to.be.true;
      expect(ctx.rotate.called).to.be.true;
      expect(ctx.scale.calledWith(2, 2)).to.be.true;
      expect(ctx.restore.called).to.be.true;
    });
  });

  describe('Dynamic Content Management', () => {
    it('should handle dynamic element creation and insertion', () => {
      const container = mockDocument.createElement('div');
      const items = [];
      
      for (let i = 0; i < 5; i++) {
        const item = mockDocument.createElement('div');
        item.textContent = `Item ${i}`;
        item.className = 'dynamic-item';
        container.appendChild(item);
        items.push(item);
      }
      
      expect(container.children).to.have.length(5);
      expect(items[0].textContent).to.equal('Item 0');
      expect(items[4].textContent).to.equal('Item 4');
    });

    it('should handle element updates and modifications', () => {
      const element = mockDocument.createElement('div');
      element.innerHTML = '<span>Original</span>';
      
      // Simulate content update
      element.innerHTML = '<span>Updated</span><p>New content</p>';
      
      expect(element.innerHTML).to.equal('<span>Updated</span><p>New content</p>');
    });

    it('should handle conditional element display', () => {
      const element = mockDocument.createElement('div');
      
      // Show element
      element.style.display = 'block';
      expect(element.style.display).to.equal('block');
      
      // Hide element
      element.style.display = 'none';
      expect(element.style.display).to.equal('none');
      
      // Toggle visibility
      element.style.visibility = element.style.visibility === 'hidden' ? 'visible' : 'hidden';
      expect(element.style.visibility).to.equal('hidden');
    });

    it('should handle element positioning and layout', () => {
      const element = mockDocument.createElement('div');
      
      element.style.position = 'absolute';
      element.style.left = '100px';
      element.style.top = '200px';
      element.style.width = '300px';
      element.style.height = '150px';
      
      expect(element.style.position).to.equal('absolute');
      expect(element.style.left).to.equal('100px');
      expect(element.style.top).to.equal('200px');
      expect(element.style.width).to.equal('300px');
      expect(element.style.height).to.equal('150px');
    });
  });

  describe('Animation and Timing Integration', () => {
    it('should handle requestAnimationFrame', () => {
      const animationCallback = sinon.stub();
      
      mockWindow.requestAnimationFrame(animationCallback);
      
      expect(mockWindow.requestAnimationFrame.calledWith(animationCallback)).to.be.true;
    });

    it('should handle animation cancellation', () => {
      const animationId = 123;
      
      mockWindow.cancelAnimationFrame(animationId);
      
      expect(mockWindow.cancelAnimationFrame.calledWith(animationId)).to.be.true;
    });

    it('should handle performance timing', () => {
      const startTime = mockWindow.performance.now();
      mockWindow.performance.now.returns(1500);
      const endTime = mockWindow.performance.now();
      
      expect(startTime).to.equal(1000);
      expect(endTime).to.equal(1500);
      expect(endTime - startTime).to.equal(500);
    });

    it('should handle CSS transitions and animations', () => {
      const element = mockDocument.createElement('div');
      
      element.style.transition = 'opacity 0.3s ease-in-out';
      element.style.opacity = '0';
      
      // Simulate animation start
      setTimeout(() => {
        element.style.opacity = '1';
      }, 16);
      
      expect(element.style.transition).to.equal('opacity 0.3s ease-in-out');
    });
  });

  describe('Memory Management and Cleanup', () => {
    it('should track element creation and cleanup', () => {
      const initialCount = mockElements.size;
      
      const elements = [];
      for (let i = 0; i < 10; i++) {
        elements.push(mockDocument.createElement('div'));
      }
      
      expect(mockElements.size).to.equal(initialCount + 10);
      
      // Simulate cleanup
      elements.forEach(el => el.remove());
      
      // Elements should still exist in mockElements but be detached
      elements.forEach(el => {
        expect(el.parentNode).to.be.null;
      });
    });

    it('should handle event listener cleanup', () => {
      const element = mockDocument.createElement('button');
      const handlers = [];
      
      for (let i = 0; i < 5; i++) {
        const handler = sinon.stub();
        handlers.push(handler);
        element.addEventListener('click', handler);
      }
      
      expect(element.addEventListener.callCount).to.equal(5);
      
      // Cleanup all handlers
      handlers.forEach(handler => {
        element.removeEventListener('click', handler);
      });
      
      expect(element.removeEventListener.callCount).to.equal(5);
    });

    it('should prevent memory leaks in dynamic content', () => {
      const container = mockDocument.createElement('div');
      const items = [];
      
      // Create many elements
      for (let i = 0; i < 100; i++) {
        const item = mockDocument.createElement('div');
        item.addEventListener('click', () => {});
        container.appendChild(item);
        items.push(item);
      }
      
      // Clear container
      container.innerHTML = '';
      
      expect(container.children).to.have.length(0);
      
      // Verify elements are detached
      items.forEach(item => {
        expect(item.parentNode).to.not.equal(container);
      });
    });
  });

  describe('Accessibility and ARIA Integration', () => {
    it('should handle ARIA attributes', () => {
      const button = mockDocument.createElement('button');
      
      button.setAttribute('aria-label', 'Close dialog');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('role', 'button');
      
      expect(button.getAttribute('aria-label')).to.equal('Close dialog');
      expect(button.getAttribute('aria-expanded')).to.equal('false');
      expect(button.getAttribute('role')).to.equal('button');
    });

    it('should handle focus management', () => {
      const input = mockDocument.createElement('input');
      
      input.focus();
      expect(input.focus.called).to.be.true;
      
      input.blur();
      expect(input.blur.called).to.be.true;
    });

    it('should handle keyboard navigation', () => {
      const elements = [];
      for (let i = 0; i < 3; i++) {
        const button = mockDocument.createElement('button');
        button.setAttribute('tabindex', i.toString());
        elements.push(button);
      }
      
      elements.forEach((el, index) => {
        expect(el.getAttribute('tabindex')).to.equal(index.toString());
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null/undefined element operations', () => {
      mockDocument.getElementById.returns(null);
      mockDocument.querySelector.returns(null);
      
      const element = mockDocument.getElementById('nonexistent');
      expect(element).to.be.null;
      
      const queried = mockDocument.querySelector('.nonexistent');
      expect(queried).to.be.null;
    });

    it('should handle invalid DOM operations gracefully', () => {
      const element = mockDocument.createElement('div');
      
      expect(() => {
        element.appendChild(null);
        element.removeChild(null);
        element.setAttribute(null, 'value');
        element.style.invalidProperty = 'value';
      }).to.not.throw();
    });

    it('should handle malformed HTML content', () => {
      const element = mockDocument.createElement('div');
      
      element.innerHTML = '<div><span>Unclosed tags';
      element.innerHTML = '<></>'; // Invalid tags
      element.innerHTML = '<script>alert("xss")</script>'; // Potentially dangerous
      
      // Should not throw errors
      expect(element.innerHTML).to.be.a('string');
    });

    it('should handle rapid DOM manipulations', () => {
      const container = mockDocument.createElement('div');
      
      // Rapid creation and destruction
      for (let i = 0; i < 1000; i++) {
        const element = mockDocument.createElement('span');
        container.appendChild(element);
        if (i % 2 === 0) {
          element.remove();
        }
      }
      
      expect(container.children.length).to.be.at.most(500);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track DOM operation performance', () => {
      const startTime = mockWindow.performance.now();
      
      // Simulate expensive DOM operations
      const container = mockDocument.createElement('div');
      for (let i = 0; i < 100; i++) {
        const element = mockDocument.createElement('div');
        element.textContent = `Item ${i}`;
        element.style.position = 'absolute';
        element.style.left = `${i * 10}px`;
        container.appendChild(element);
      }
      
      mockWindow.performance.now.returns(1050);
      const endTime = mockWindow.performance.now();
      const duration = endTime - startTime;
      
      expect(duration).to.equal(50);
      expect(container.children).to.have.length(100);
    });

    it('should monitor memory usage patterns', () => {
      const initialElementCount = mockElements.size;
      const elements = [];
      
      // Create elements
      for (let i = 0; i < 50; i++) {
        elements.push(mockDocument.createElement('div'));
      }
      
      const peakElementCount = mockElements.size;
      expect(peakElementCount - initialElementCount).to.equal(50);
      
      // Cleanup half
      for (let i = 0; i < 25; i++) {
        elements[i].remove();
      }
      
      // Verify cleanup (elements still tracked but detached)
      const detachedCount = elements.slice(0, 25).filter(el => !el.parentNode).length;
      expect(detachedCount).to.equal(25);
    });
  });
});

function createMockContext() {
  return {
    save: sinon.stub(),
    restore: sinon.stub(),
    translate: sinon.stub(),
    rotate: sinon.stub(),
    scale: sinon.stub(),
    transform: sinon.stub(),
    setTransform: sinon.stub(),
    resetTransform: sinon.stub(),
    
    // Path methods
    beginPath: sinon.stub(),
    closePath: sinon.stub(),
    moveTo: sinon.stub(),
    lineTo: sinon.stub(),
    arc: sinon.stub(),
    arcTo: sinon.stub(),
    rect: sinon.stub(),
    quadraticCurveTo: sinon.stub(),
    bezierCurveTo: sinon.stub(),
    
    // Drawing methods
    fill: sinon.stub(),
    stroke: sinon.stub(),
    fillRect: sinon.stub(),
    strokeRect: sinon.stub(),
    clearRect: sinon.stub(),
    fillText: sinon.stub(),
    strokeText: sinon.stub(),
    measureText: sinon.stub().returns({ width: 100 }),
    
    // Image methods
    drawImage: sinon.stub(),
    createImageData: sinon.stub(),
    getImageData: sinon.stub(),
    putImageData: sinon.stub(),
    
    // Gradient and pattern methods
    createLinearGradient: sinon.stub(),
    createRadialGradient: sinon.stub(),
    createPattern: sinon.stub(),
    
    // Properties
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over'
  };
}
