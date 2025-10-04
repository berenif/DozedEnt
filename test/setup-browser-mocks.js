// Comprehensive Browser API Mocks for Node.js Testing Environment
// This file provides mocks for all browser APIs that are commonly used in the codebase

import sinon from 'sinon';

// Enhanced DOM mocking
const createMockElement = (tagName = 'div') => ({
  tagName: tagName.toUpperCase(),
  id: '',
  className: '',
  style: {},
  dataset: {},
  attributes: {},
  children: [],
  parentNode: null,
  nextSibling: null,
  previousSibling: null,
  textContent: '',
  innerHTML: '',
  addEventListener: sinon.stub(),
  removeEventListener: sinon.stub(),
  dispatchEvent: sinon.stub(),
  getAttribute: sinon.stub(),
  setAttribute: sinon.stub(),
  removeAttribute: sinon.stub(),
  hasAttribute: sinon.stub(),
  appendChild: sinon.stub(),
  removeChild: sinon.stub(),
  querySelector: sinon.stub(),
  querySelectorAll: sinon.stub().returns([]),
  getBoundingClientRect: sinon.stub().returns({
    left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100
  }),
  scrollIntoView: sinon.stub(),
  focus: sinon.stub(),
  blur: sinon.stub(),
  click: sinon.stub()
});

const createMockCanvas = (width = 800, height = 600) => {
  const canvas = createMockElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext = sinon.stub().returns(createMockCanvasContext());
  canvas.toDataURL = sinon.stub().returns('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
  canvas.toBlob = sinon.stub().callsArgWith(0, new Blob());
  return canvas;
};

const createMockCanvasContext = () => ({
  // Transform methods
  save: sinon.stub(),
  restore: sinon.stub(),
  scale: sinon.stub(),
  rotate: sinon.stub(),
  translate: sinon.stub(),
  transform: sinon.stub(),
  setTransform: sinon.stub(),
  resetTransform: sinon.stub(),
  
  // Path methods
  beginPath: sinon.stub(),
  closePath: sinon.stub(),
  moveTo: sinon.stub(),
  lineTo: sinon.stub(),
  bezierCurveTo: sinon.stub(),
  quadraticCurveTo: sinon.stub(),
  arc: sinon.stub(),
  arcTo: sinon.stub(),
  ellipse: sinon.stub(),
  rect: sinon.stub(),
  
  // Drawing methods
  fill: sinon.stub(),
  stroke: sinon.stub(),
  fillRect: sinon.stub(),
  strokeRect: sinon.stub(),
  clearRect: sinon.stub(),
  
  // Text methods
  fillText: sinon.stub(),
  strokeText: sinon.stub(),
  measureText: sinon.stub().returns({ width: 50, height: 12 }),
  
  // Image methods
  drawImage: sinon.stub(),
  createImageData: sinon.stub().returns({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1
  }),
  getImageData: sinon.stub().returns({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1
  }),
  putImageData: sinon.stub(),
  
  // Gradient and pattern methods
  createLinearGradient: sinon.stub().returns({
    addColorStop: sinon.stub()
  }),
  createRadialGradient: sinon.stub().returns({
    addColorStop: sinon.stub()
  }),
  createConicGradient: sinon.stub().returns({
    addColorStop: sinon.stub()
  }),
  createPattern: sinon.stub().returns({}),
  
  // Clipping methods
  clip: sinon.stub(),
  isPointInPath: sinon.stub().returns(false),
  isPointInStroke: sinon.stub().returns(false),
  
  // Properties
  fillStyle: '#000000',
  strokeStyle: '#000000',
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  miterLimit: 10,
  lineDashOffset: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowBlur: 0,
  shadowColor: 'rgba(0, 0, 0, 0)',
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  font: '10px sans-serif',
  textAlign: 'start',
  textBaseline: 'alphabetic',
  direction: 'ltr',
  filter: 'none',
  
  // Methods
  getLineDash: sinon.stub().returns([]),
  setLineDash: sinon.stub()
});

// Mock Document
const mockDocument = {
  createElement: sinon.stub().callsFake(tagName => {
    if (tagName === 'canvas') {
      return createMockCanvas();
    }
    return createMockElement(tagName);
  }),
  createTextNode: sinon.stub().returns({ textContent: '', nodeType: 3 }),
  getElementById: sinon.stub().returns(null),
  getElementsByClassName: sinon.stub().returns([]),
  getElementsByTagName: sinon.stub().returns([]),
  querySelector: sinon.stub().returns(null),
  querySelectorAll: sinon.stub().returns([]),
  addEventListener: sinon.stub(),
  removeEventListener: sinon.stub(),
  dispatchEvent: sinon.stub(),
  body: createMockElement('body'),
  head: createMockElement('head'),
  documentElement: createMockElement('html'),
  readyState: 'complete',
  title: '',
  URL: 'http://localhost:3000',
  domain: 'localhost',
  cookie: '',
  hidden: false,
  visibilityState: 'visible'
};

// Mock Window
const mockWindow = {
  innerWidth: 1280,
  innerHeight: 720,
  outerWidth: 1280,
  outerHeight: 720,
  devicePixelRatio: 1,
  scrollX: 0,
  scrollY: 0,
  pageXOffset: 0,
  pageYOffset: 0,
  screen: {
    width: 1920,
    height: 1080,
    availWidth: 1920,
    availHeight: 1080,
    colorDepth: 24,
    pixelDepth: 24
  },
  location: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: ''
  },
  history: {
    length: 1,
    state: null,
    back: sinon.stub(),
    forward: sinon.stub(),
    go: sinon.stub(),
    pushState: sinon.stub(),
    replaceState: sinon.stub()
  },
  localStorage: {
    getItem: sinon.stub().returns(null),
    setItem: sinon.stub(),
    removeItem: sinon.stub(),
    clear: sinon.stub(),
    key: sinon.stub(),
    length: 0
  },
  sessionStorage: {
    getItem: sinon.stub().returns(null),
    setItem: sinon.stub(),
    removeItem: sinon.stub(),
    clear: sinon.stub(),
    key: sinon.stub(),
    length: 0
  },
  navigator: {
    userAgent: 'Mozilla/5.0 (Node.js) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    platform: 'Node.js',
    language: 'en-US',
    languages: ['en-US', 'en'],
    onLine: true,
    cookieEnabled: true,
    doNotTrack: null,
    maxTouchPoints: 0,
    hardwareConcurrency: 4,
    mediaDevices: {
      getUserMedia: sinon.stub().resolves({
        getTracks: () => [{
          kind: 'video',
          stop: sinon.stub()
        }],
        getVideoTracks: () => [{ stop: sinon.stub() }],
        getAudioTracks: () => [{ stop: sinon.stub() }]
      }),
      enumerateDevices: sinon.stub().resolves([])
    }
  },
  console: global.console,
  setTimeout: global.setTimeout,
  clearTimeout: global.clearTimeout,
  setInterval: global.setInterval,
  clearInterval: global.clearInterval,
  requestAnimationFrame: sinon.stub().callsFake(callback => {
    return setTimeout(callback, 16);
  }),
  cancelAnimationFrame: sinon.stub().callsFake(id => {
    clearTimeout(id);
  }),
  requestIdleCallback: sinon.stub().callsFake(callback => {
    return setTimeout(() => callback({ timeRemaining: () => 50 }), 0);
  }),
  cancelIdleCallback: sinon.stub().callsFake(id => {
    clearTimeout(id);
  }),
  addEventListener: sinon.stub(),
  removeEventListener: sinon.stub(),
  dispatchEvent: sinon.stub(),
  getComputedStyle: sinon.stub().returns({}),
  matchMedia: sinon.stub().returns({
    matches: false,
    media: '',
    addListener: sinon.stub(),
    removeListener: sinon.stub()
  }),
  open: sinon.stub(),
  close: sinon.stub(),
  focus: sinon.stub(),
  blur: sinon.stub(),
  alert: sinon.stub(),
  confirm: sinon.stub().returns(true),
  prompt: sinon.stub().returns('')
};

// Mock Audio APIs
const createMockAudioContext = () => ({
  state: 'running',
  sampleRate: 44100,
  currentTime: 0,
  destination: {
    channelCount: 2,
    channelCountMode: 'explicit',
    channelInterpretation: 'speakers',
    connect: sinon.stub(),
    disconnect: sinon.stub()
  },
  listener: {
    positionX: { value: 0 },
    positionY: { value: 0 },
    positionZ: { value: 0 },
    forwardX: { value: 0 },
    forwardY: { value: 0 },
    forwardZ: { value: -1 },
    upX: { value: 0 },
    upY: { value: 1 },
    upZ: { value: 0 }
  },
  createGain: sinon.stub().returns({
    gain: { value: 1, setValueAtTime: sinon.stub() },
    connect: sinon.stub(),
    disconnect: sinon.stub()
  }),
  createBufferSource: sinon.stub().returns({
    buffer: null,
    loop: false,
    loopStart: 0,
    loopEnd: 0,
    playbackRate: { value: 1 },
    start: sinon.stub(),
    stop: sinon.stub(),
    connect: sinon.stub(),
    disconnect: sinon.stub()
  }),
  createBuffer: sinon.stub().returns({
    length: 44100,
    numberOfChannels: 2,
    sampleRate: 44100,
    getChannelData: sinon.stub().returns(new Float32Array(44100)),
    copyFromChannel: sinon.stub(),
    copyToChannel: sinon.stub()
  }),
  createOscillator: sinon.stub().returns({
    type: 'sine',
    frequency: { value: 440 },
    detune: { value: 0 },
    start: sinon.stub(),
    stop: sinon.stub(),
    connect: sinon.stub(),
    disconnect: sinon.stub()
  }),
  createAnalyser: sinon.stub().returns({
    fftSize: 2048,
    frequencyBinCount: 1024,
    minDecibels: -100,
    maxDecibels: -30,
    smoothingTimeConstant: 0.8,
    getByteFrequencyData: sinon.stub(),
    getByteTimeDomainData: sinon.stub(),
    getFloatFrequencyData: sinon.stub(),
    getFloatTimeDomainData: sinon.stub(),
    connect: sinon.stub(),
    disconnect: sinon.stub()
  }),
  createDelay: sinon.stub().returns({
    delayTime: { value: 0 },
    connect: sinon.stub(),
    disconnect: sinon.stub()
  }),
  createBiquadFilter: sinon.stub().returns({
    type: 'lowpass',
    frequency: { value: 350 },
    Q: { value: 1 },
    gain: { value: 0 },
    connect: sinon.stub(),
    disconnect: sinon.stub()
  }),
  createConvolver: sinon.stub().returns({
    buffer: null,
    normalize: true,
    connect: sinon.stub(),
    disconnect: sinon.stub()
  }),
  createDynamicsCompressor: sinon.stub().returns({
    threshold: { value: -24 },
    knee: { value: 30 },
    ratio: { value: 12 },
    attack: { value: 0.003 },
    release: { value: 0.25 },
    connect: sinon.stub(),
    disconnect: sinon.stub()
  }),
  createPanner: sinon.stub().returns({
    panningModel: 'HRTF',
    distanceModel: 'inverse',
    refDistance: 1,
    maxDistance: 10000,
    rolloffFactor: 1,
    coneInnerAngle: 360,
    coneOuterAngle: 0,
    coneOuterGain: 0,
    positionX: { value: 0 },
    positionY: { value: 0 },
    positionZ: { value: 0 },
    orientationX: { value: 1 },
    orientationY: { value: 0 },
    orientationZ: { value: 0 },
    connect: sinon.stub(),
    disconnect: sinon.stub()
  }),
  decodeAudioData: sinon.stub().resolves({
    length: 44100,
    numberOfChannels: 2,
    sampleRate: 44100,
    getChannelData: () => new Float32Array(44100)
  }),
  suspend: sinon.stub().resolves(),
  resume: sinon.stub().resolves(),
  close: sinon.stub().resolves()
});

const mockAudio = class MockAudio {
  constructor(src) {
    this.src = src || '';
    this.currentTime = 0;
    this.duration = NaN;
    this.paused = true;
    this.ended = false;
    this.volume = 1;
    this.muted = false;
    this.loop = false;
    this.autoplay = false;
    this.preload = 'metadata';
    this.readyState = 0;
    this.networkState = 0;
    this.error = null;
    this.onloadstart = null;
    this.onloadeddata = null;
    this.onloadedmetadata = null;
    this.oncanplay = null;
    this.oncanplaythrough = null;
    this.onplay = null;
    this.onpause = null;
    this.onended = null;
    this.onerror = null;
    this.ontimeupdate = null;
    this.onvolumechange = null;
    
    // Simulate loading
    setTimeout(() => {
      this.duration = 10; // 10 seconds
      this.readyState = 4;
      if (this.onloadedmetadata) this.onloadedmetadata();
      if (this.oncanplaythrough) this.oncanplaythrough();
    }, 0);
  }
  
  play() {
    this.paused = false;
    if (this.onplay) this.onplay();
    return Promise.resolve();
  }
  
  pause() {
    this.paused = true;
    if (this.onpause) this.onpause();
  }
  
  load() {
    this.readyState = 0;
    if (this.onloadstart) this.onloadstart();
  }
  
  addEventListener(event, handler) {
    this[`on${event}`] = handler;
  }
  
  removeEventListener(event, handler) {
    if (this[`on${event}`] === handler) {
      this[`on${event}`] = null;
    }
  }
};

// Mock WebRTC APIs
const createMockRTCPeerConnection = () => ({
  localDescription: null,
  remoteDescription: null,
  signalingState: 'stable',
  iceConnectionState: 'new',
  iceGatheringState: 'new',
  connectionState: 'new',
  canTrickleIceCandidates: null,
  iceServers: [],
  onicecandidate: null,
  oniceconnectionstatechange: null,
  onnegotiationneeded: null,
  ondatachannel: null,
  ontrack: null,
  createOffer: sinon.stub().resolves({ type: 'offer', sdp: 'mock-sdp' }),
  createAnswer: sinon.stub().resolves({ type: 'answer', sdp: 'mock-sdp' }),
  setLocalDescription: sinon.stub().resolves(),
  setRemoteDescription: sinon.stub().resolves(),
  addIceCandidate: sinon.stub().resolves(),
  getStats: sinon.stub().resolves(new Map()),
  createDataChannel: sinon.stub().returns({
    label: '',
    ordered: true,
    maxPacketLifeTime: null,
    maxRetransmits: null,
    protocol: '',
    negotiated: false,
    id: null,
    readyState: 'connecting',
    bufferedAmount: 0,
    bufferedAmountLowThreshold: 0,
    binaryType: 'blob',
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
    send: sinon.stub(),
    close: sinon.stub(),
    addEventListener: sinon.stub(),
    removeEventListener: sinon.stub()
  }),
  addTrack: sinon.stub(),
  removeTrack: sinon.stub(),
  getSenders: sinon.stub().returns([]),
  getReceivers: sinon.stub().returns([]),
  getTransceivers: sinon.stub().returns([]),
  addTransceiver: sinon.stub(),
  close: sinon.stub(),
  addEventListener: sinon.stub(),
  removeEventListener: sinon.stub()
});

// Mock WebSocket
const mockWebSocket = class MockWebSocket {
  constructor(url, protocols) {
    this.url = url;
    this.protocols = protocols || [];
    this.readyState = MockWebSocket.CONNECTING;
    this.bufferedAmount = 0;
    this.extensions = '';
    this.protocol = '';
    this.binaryType = 'blob';
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;
    
    // Simulate connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen({ type: 'open' });
    }, 0);
  }
  
  send(data) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }
  
  close(code, reason) {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) this.onclose({ type: 'close', code: code || 1000, reason: reason || '' });
    }, 0);
  }
  
  addEventListener(event, handler) {
    this[`on${event}`] = handler;
  }
  
  removeEventListener(event, handler) {
    if (this[`on${event}`] === handler) {
      this[`on${event}`] = null;
    }
  }
};

mockWebSocket.CONNECTING = 0;
mockWebSocket.OPEN = 1;
mockWebSocket.CLOSING = 2;
mockWebSocket.CLOSED = 3;

// Mock Crypto API
const mockCrypto = {
  getRandomValues: (array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
  randomUUID: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
  subtle: {
    generateKey: sinon.stub().resolves({}),
    importKey: sinon.stub().resolves({}),
    exportKey: sinon.stub().resolves(new ArrayBuffer(32)),
    encrypt: sinon.stub().resolves(new ArrayBuffer(16)),
    decrypt: sinon.stub().resolves(new ArrayBuffer(16)),
    sign: sinon.stub().resolves(new ArrayBuffer(32)),
    verify: sinon.stub().resolves(true),
    digest: sinon.stub().resolves(new ArrayBuffer(32)),
    deriveBits: sinon.stub().resolves(new ArrayBuffer(32)),
    deriveKey: sinon.stub().resolves({})
  }
};

// Mock Fetch API
const mockFetch = sinon.stub().resolves({
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: new Map(),
  url: '',
  json: sinon.stub().resolves({}),
  text: sinon.stub().resolves(''),
  blob: sinon.stub().resolves(new Blob()),
  arrayBuffer: sinon.stub().resolves(new ArrayBuffer(0)),
  clone: sinon.stub().returns(this)
});

// Apply all mocks to global scope
export function setupBrowserMocks() {
  // Core browser APIs
  global.window = mockWindow;
  global.document = mockDocument;
  global.navigator = mockWindow.navigator;
  global.location = mockWindow.location;
  global.history = mockWindow.history;
  global.screen = mockWindow.screen;
  
  // Storage APIs
  global.localStorage = mockWindow.localStorage;
  global.sessionStorage = mockWindow.sessionStorage;
  
  // Animation APIs
  global.requestAnimationFrame = mockWindow.requestAnimationFrame;
  global.cancelAnimationFrame = mockWindow.cancelAnimationFrame;
  global.requestIdleCallback = mockWindow.requestIdleCallback;
  global.cancelIdleCallback = mockWindow.cancelIdleCallback;
  
  // Audio APIs
  global.AudioContext = createMockAudioContext;
  global.webkitAudioContext = createMockAudioContext;
  global.Audio = mockAudio;
  
  // WebRTC APIs
  global.RTCPeerConnection = createMockRTCPeerConnection;
  global.webkitRTCPeerConnection = createMockRTCPeerConnection;
  global.mozRTCPeerConnection = createMockRTCPeerConnection;
  
  // WebSocket API
  global.WebSocket = mockWebSocket;
  
  // Crypto API
  Object.defineProperty(global, 'crypto', {
    value: mockCrypto,
    configurable: true,
    writable: true
  });
  
  // Fetch API
  global.fetch = mockFetch;
  
  // Canvas and Image APIs
  global.Image = class MockImage {
    constructor() {
      this.onload = null;
      this.onerror = null;
      this.src = '';
      this.width = 100;
      this.height = 100;
      this.complete = false;
      this.naturalWidth = 100;
      this.naturalHeight = 100;
    }
    
    set src(value) {
      this._src = value;
      this.complete = false;
      setTimeout(() => {
        this.complete = true;
        if (this.onload) this.onload();
      }, 0);
    }
    
    get src() {
      return this._src;
    }
  };
  
  // Performance API
  global.performance = global.performance || {
    now: () => Date.now(),
    mark: sinon.stub(),
    measure: sinon.stub(),
    getEntriesByType: sinon.stub().returns([]),
    getEntriesByName: sinon.stub().returns([]),
    clearMarks: sinon.stub(),
    clearMeasures: sinon.stub()
  };
  
  // URL API
  global.URL = class MockURL {
    constructor(url, base) {
      this.href = url;
      this.origin = 'http://localhost:3000';
      this.protocol = 'http:';
      this.host = 'localhost:3000';
      this.hostname = 'localhost';
      this.port = '3000';
      this.pathname = '/';
      this.search = '';
      this.hash = '';
    }
    
    static createObjectURL(object) {
      return 'blob:http://localhost:3000/' + Math.random().toString(36).substr(2, 9);
    }
    
    static revokeObjectURL(url) {
      // Mock implementation
    }
  };
  
  // Blob API
  global.Blob = class MockBlob {
    constructor(parts = [], options = {}) {
      this.size = parts.reduce((size, part) => {
        if (typeof part === 'string') return size + part.length;
        if (part instanceof ArrayBuffer) return size + part.byteLength;
        return size;
      }, 0);
      this.type = options.type || '';
    }
    
    slice(start, end, contentType) {
      return new MockBlob([], { type: contentType });
    }
    
    stream() {
      return new ReadableStream();
    }
    
    text() {
      return Promise.resolve('');
    }
    
    arrayBuffer() {
      return Promise.resolve(new ArrayBuffer(this.size));
    }
  };
  
  // File API
  global.File = class MockFile extends global.Blob {
    constructor(parts, name, options = {}) {
      super(parts, options);
      this.name = name;
      this.lastModified = Date.now();
    }
  };
  
  // FileReader API
  global.FileReader = class MockFileReader {
    constructor() {
      this.readyState = 0; // EMPTY
      this.result = null;
      this.error = null;
      this.onload = null;
      this.onerror = null;
      this.onloadstart = null;
      this.onloadend = null;
      this.onprogress = null;
    }
    
    readAsText(file) {
      this.readyState = 1; // LOADING
      if (this.onloadstart) this.onloadstart();
      setTimeout(() => {
        this.readyState = 2; // DONE
        this.result = 'mock file content';
        if (this.onload) this.onload();
        if (this.onloadend) this.onloadend();
      }, 0);
    }
    
    readAsDataURL(file) {
      this.readAsText(file);
      this.result = 'data:text/plain;base64,bW9jayBmaWxlIGNvbnRlbnQ=';
    }
    
    readAsArrayBuffer(file) {
      this.readAsText(file);
      this.result = new ArrayBuffer(16);
    }
  };
  
  // WebAssembly API (enhanced)
  global.WebAssembly = global.WebAssembly || {
    instantiate: sinon.stub().resolves({
      instance: {
        exports: {}
      },
      module: {}
    }),
    instantiateStreaming: sinon.stub().resolves({
      instance: {
        exports: {}
      },
      module: {}
    }),
    compile: sinon.stub().resolves({}),
    compileStreaming: sinon.stub().resolves({}),
    validate: sinon.stub().returns(true),
    Module: class MockModule {
      constructor() {}
      static exports() { return []; }
      static imports() { return []; }
      static customSections() { return []; }
    },
    Instance: class MockInstance {
      constructor(module, imports) {
        this.exports = {};
      }
    },
    Memory: class MockMemory {
      constructor(descriptor) {
        this.buffer = new ArrayBuffer(descriptor.initial * 65536);
      }
      grow(delta) {
        const oldSize = this.buffer.byteLength;
        const newBuffer = new ArrayBuffer(oldSize + delta * 65536);
        return oldSize / 65536;
      }
    },
    Table: class MockTable {
      constructor(descriptor) {
        this.length = descriptor.initial;
      }
      get(index) { return null; }
      set(index, value) {}
      grow(delta) { return this.length; }
    }
  };
}

// Cleanup function to reset mocks
export function cleanupBrowserMocks() {
  // Reset all sinon stubs
  sinon.restore();
  
  // Remove global mocks
  delete global.window;
  delete global.document;
  delete global.navigator;
  delete global.location;
  delete global.history;
  delete global.screen;
  delete global.localStorage;
  delete global.sessionStorage;
  delete global.requestAnimationFrame;
  delete global.cancelAnimationFrame;
  delete global.AudioContext;
  delete global.webkitAudioContext;
  delete global.Audio;
  delete global.RTCPeerConnection;
  delete global.webkitRTCPeerConnection;
  delete global.mozRTCPeerConnection;
  delete global.WebSocket;
  delete global.crypto;
  delete global.fetch;
  delete global.Image;
  delete global.URL;
  delete global.Blob;
  delete global.File;
  delete global.FileReader;
}

export {
  createMockCanvas,
  createMockCanvasContext,
  createMockElement,
  createMockAudioContext,
  createMockRTCPeerConnection,
  mockDocument,
  mockWindow,
  mockAudio,
  mockWebSocket,
  mockCrypto,
  mockFetch
};
