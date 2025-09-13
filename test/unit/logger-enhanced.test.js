import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

// Mock logger implementation based on the utils structure
const createMockLogger = () => {
  return class MockLogger {
    constructor(options = {}) {
      this.options = {
        level: 'info',
        prefix: '[DozedEnt]',
        enableColors: true,
        enableTimestamps: true,
        enableStackTrace: false,
        maxLogSize: 1000,
        outputTarget: 'console',
        ...options
      };
      
      this.logLevels = {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
        trace: 4
      };
      
      this.logs = [];
      this.listeners = new Map();
      this.muted = false;
      
      // Color codes for different log levels
      this.colors = {
        error: '\x1b[31m', // Red
        warn: '\x1b[33m',  // Yellow
        info: '\x1b[36m',  // Cyan
        debug: '\x1b[32m', // Green
        trace: '\x1b[90m', // Gray
        reset: '\x1b[0m'
      };
    }

    setLevel(level) {
      if (Object.prototype.hasOwnProperty.call(this.logLevels, level)) {
        this.options.level = level;
      } else {
        this.warn(`Invalid log level: ${level}`);
      }
    }

    getLevel() {
      return this.options.level;
    }

    shouldLog(level) {
      const currentLevel = this.logLevels[this.options.level] || 2;
      const messageLevel = this.logLevels[level] || 2;
      return messageLevel <= currentLevel && !this.muted;
    }

    formatMessage(level, message, ...args) {
      let formattedMessage = '';
      
      // Add timestamp
      if (this.options.enableTimestamps) {
        const timestamp = new Date().toISOString();
        formattedMessage += `[${timestamp}] `;
      }
      
      // Add prefix
      if (this.options.prefix) {
        formattedMessage += `${this.options.prefix} `;
      }
      
      // Add level
      const levelStr = level.toUpperCase();
      if (this.options.enableColors && typeof window === 'undefined') {
        formattedMessage += `${this.colors[level]}${levelStr}${this.colors.reset}: `;
      } else {
        formattedMessage += `${levelStr}: `;
      }
      
      // Add message
      if (typeof message === 'object') {
        formattedMessage += JSON.stringify(message, null, 2);
      } else {
        formattedMessage += message;
      }
      
      // Add additional arguments
      if (args.length > 0) {
        const argsStr = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        formattedMessage += ` ${argsStr}`;
      }
      
      return formattedMessage;
    }

    log(level, message, ...args) {
      if (!this.shouldLog(level)) {
        return;
      }
      
      const formattedMessage = this.formatMessage(level, message, ...args);
      const logEntry = {
        level,
        message,
        args,
        formattedMessage,
        timestamp: Date.now(),
        stack: this.options.enableStackTrace ? new Error().stack : null
      };
      
      // Store log entry
      this.logs.push(logEntry);
      
      // Limit log history
      if (this.logs.length > this.options.maxLogSize) {
        this.logs.shift();
      }
      
      // Output to target
      this.output(level, formattedMessage, logEntry);
      
      // Notify listeners
      this.emit('log', logEntry);
    }

    output(level, formattedMessage, logEntry) {
      if (this.options.outputTarget === 'console') {
        const consoleMethod = console[level] || console.log;
        consoleMethod(formattedMessage);
      } else if (this.options.outputTarget === 'memory') {
        // Already stored in this.logs
      } else if (typeof this.options.outputTarget === 'function') {
        this.options.outputTarget(logEntry);
      }
    }

    error(message, ...args) {
      this.log('error', message, ...args);
    }

    warn(message, ...args) {
      this.log('warn', message, ...args);
    }

    info(message, ...args) {
      this.log('info', message, ...args);
    }

    debug(message, ...args) {
      this.log('debug', message, ...args);
    }

    trace(message, ...args) {
      this.log('trace', message, ...args);
    }

    group(label) {
      if (console.group) {
        console.group(label);
      } else {
        this.info(`--- ${label} ---`);
      }
    }

    groupEnd() {
      if (console.groupEnd) {
        console.groupEnd();
      }
    }

    time(label) {
      if (console.time) {
        console.time(label);
      } else {
        this[`_time_${label}`] = Date.now();
      }
    }

    timeEnd(label) {
      if (console.timeEnd) {
        console.timeEnd(label);
      } else {
        const startTime = this[`_time_${label}`];
        if (startTime) {
          const duration = Date.now() - startTime;
          this.info(`${label}: ${duration}ms`);
          delete this[`_time_${label}`];
        }
      }
    }

    table(data) {
      if (console.table) {
        console.table(data);
      } else {
        this.info('Table data:', JSON.stringify(data, null, 2));
      }
    }

    count(label = 'default') {
      if (console.count) {
        console.count(label);
      } else {
        this[`_count_${label}`] = (this[`_count_${label}`] || 0) + 1;
        this.info(`${label}: ${this[`_count_${label}`]}`);
      }
    }

    countReset(label = 'default') {
      if (console.countReset) {
        console.countReset(label);
      } else {
        this[`_count_${label}`] = 0;
      }
    }

    assert(condition, message, ...args) {
      if (!condition) {
        this.error('Assertion failed:', message, ...args);
      }
    }

    clear() {
      this.logs = [];
      if (console.clear) {
        console.clear();
      }
    }

    mute() {
      this.muted = true;
    }

    unmute() {
      this.muted = false;
    }

    isMuted() {
      return this.muted;
    }

    getLogs(level = null) {
      if (level) {
        return this.logs.filter(log => log.level === level);
      }
      return [...this.logs];
    }

    getLastLog() {
      return this.logs[this.logs.length - 1] || null;
    }

    searchLogs(query) {
      return this.logs.filter(log => 
        log.formattedMessage.toLowerCase().includes(query.toLowerCase())
      );
    }

    exportLogs(format = 'json') {
      if (format === 'json') {
        return JSON.stringify(this.logs, null, 2);
      } else if (format === 'text') {
        return this.logs.map(log => log.formattedMessage).join('\n');
      } else if (format === 'csv') {
        const headers = 'timestamp,level,message\n';
        const rows = this.logs.map(log => 
          `${log.timestamp},${log.level},"${log.message.replace(/"/g, '""')}"`
        ).join('\n');
        return headers + rows;
      }
      throw new Error(`Unsupported export format: ${format}`);
    }

    on(event, listener) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(listener);
    }

    off(event, listener) {
      const listeners = this.listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    }

    emit(event, ...args) {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.forEach(listener => {
          try {
            listener(...args);
          } catch (error) {
            console.error('Error in log event listener:', error);
          }
        });
      }
    }

    createChild(options = {}) {
      const childOptions = { ...this.options, ...options };
      return new MockLogger(childOptions);
    }

    destroy() {
      this.logs = [];
      this.listeners.clear();
      this.muted = true;
    }
  };
};

describe('Logger', function() {
  let Logger;
  let logger;
  let consoleStubs;

  beforeEach(function() {
    Logger = createMockLogger();
    
    // Stub console methods
    consoleStubs = {
      log: sinon.stub(console, 'log'),
      info: sinon.stub(console, 'info'),
      warn: sinon.stub(console, 'warn'),
      error: sinon.stub(console, 'error'),
      debug: sinon.stub(console, 'debug'),
      group: sinon.stub(console, 'group'),
      groupEnd: sinon.stub(console, 'groupEnd'),
      time: sinon.stub(console, 'time'),
      timeEnd: sinon.stub(console, 'timeEnd'),
      table: sinon.stub(console, 'table'),
      count: sinon.stub(console, 'count'),
      countReset: sinon.stub(console, 'countReset'),
      clear: sinon.stub(console, 'clear')
    };
    
    logger = new Logger();
  });

  afterEach(function() {
    if (logger) {
      logger.destroy();
    }
    sinon.restore();
  });

  describe('Initialization', function() {
    it('should initialize with default options', function() {
      expect(logger.options.level).to.equal('info');
      expect(logger.options.prefix).to.equal('[DozedEnt]');
      expect(logger.options.enableColors).to.be.true;
      expect(logger.options.enableTimestamps).to.be.true;
    });

    it('should initialize with custom options', function() {
      const customLogger = new Logger({
        level: 'debug',
        prefix: '[Custom]',
        enableColors: false
      });
      
      expect(customLogger.options.level).to.equal('debug');
      expect(customLogger.options.prefix).to.equal('[Custom]');
      expect(customLogger.options.enableColors).to.be.false;
    });

    it('should have all log levels defined', function() {
      expect(logger.logLevels).to.have.property('error', 0);
      expect(logger.logLevels).to.have.property('warn', 1);
      expect(logger.logLevels).to.have.property('info', 2);
      expect(logger.logLevels).to.have.property('debug', 3);
      expect(logger.logLevels).to.have.property('trace', 4);
    });
  });

  describe('Log Level Management', function() {
    it('should set log level', function() {
      logger.setLevel('debug');
      expect(logger.getLevel()).to.equal('debug');
    });

    it('should warn on invalid log level', function() {
      const warnSpy = sinon.spy(logger, 'warn');
      logger.setLevel('invalid');
      
      expect(warnSpy.called).to.be.true;
      expect(logger.getLevel()).to.equal('info'); // Should remain unchanged
    });

    it('should respect log level filtering', function() {
      logger.setLevel('warn');
      
      expect(logger.shouldLog('error')).to.be.true;
      expect(logger.shouldLog('warn')).to.be.true;
      expect(logger.shouldLog('info')).to.be.false;
      expect(logger.shouldLog('debug')).to.be.false;
    });

    it('should not log when muted', function() {
      logger.mute();
      expect(logger.shouldLog('error')).to.be.false;
      expect(logger.isMuted()).to.be.true;
      
      logger.unmute();
      expect(logger.shouldLog('error')).to.be.true;
      expect(logger.isMuted()).to.be.false;
    });
  });

  describe('Message Formatting', function() {
    it('should format basic message', function() {
      const formatted = logger.formatMessage('info', 'Test message');
      
      expect(formatted).to.include('[DozedEnt]');
      expect(formatted).to.include('INFO:');
      expect(formatted).to.include('Test message');
    });

    it('should include timestamp when enabled', function() {
      logger.options.enableTimestamps = true;
      const formatted = logger.formatMessage('info', 'Test');
      
      expect(formatted).to.match(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it('should exclude timestamp when disabled', function() {
      logger.options.enableTimestamps = false;
      const formatted = logger.formatMessage('info', 'Test');
      
      expect(formatted).to.not.match(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it('should format object messages', function() {
      const obj = { key: 'value', nested: { prop: 123 } };
      const formatted = logger.formatMessage('info', obj);
      
      expect(formatted).to.include('"key": "value"');
      expect(formatted).to.include('"prop": 123');
    });

    it('should handle additional arguments', function() {
      const formatted = logger.formatMessage('info', 'Message', 'arg1', 42, { key: 'value' });
      
      expect(formatted).to.include('Message');
      expect(formatted).to.include('arg1');
      expect(formatted).to.include('42');
      expect(formatted).to.include('{"key":"value"}');
    });

    it('should include colors in non-browser environment', function() {
      // Mock non-browser environment
      const originalWindow = global.window;
      delete global.window;
      
      try {
        const formatted = logger.formatMessage('error', 'Test');
        expect(formatted).to.include('\x1b[31m'); // Red color code
        expect(formatted).to.include('\x1b[0m');  // Reset code
      } finally {
        global.window = originalWindow;
      }
    });
  });

  describe('Logging Methods', function() {
    it('should log error messages', function() {
      logger.error('Error message');
      
      expect(consoleStubs.error.called).to.be.true;
      expect(logger.logs).to.have.length(1);
      expect(logger.logs[0].level).to.equal('error');
    });

    it('should log warn messages', function() {
      logger.warn('Warning message');
      
      expect(consoleStubs.warn.called).to.be.true;
      expect(logger.logs[0].level).to.equal('warn');
    });

    it('should log info messages', function() {
      logger.info('Info message');
      
      expect(consoleStubs.info.called).to.be.true;
      expect(logger.logs[0].level).to.equal('info');
    });

    it('should log debug messages when level permits', function() {
      logger.setLevel('debug');
      logger.debug('Debug message');
      
      expect(consoleStubs.debug.called).to.be.true;
      expect(logger.logs[0].level).to.equal('debug');
    });

    it('should not log debug messages when level is too high', function() {
      logger.setLevel('info');
      logger.debug('Debug message');
      
      expect(consoleStubs.debug.called).to.be.false;
      expect(logger.logs).to.have.length(0);
    });

    it('should log trace messages when level permits', function() {
      logger.setLevel('trace');
      logger.trace('Trace message');
      
      expect(logger.logs[0].level).to.equal('trace');
    });

    it('should handle multiple arguments', function() {
      logger.info('Message with', 'multiple', 'arguments', 123);
      
      const logEntry = logger.logs[0];
      expect(logEntry.args).to.deep.equal(['multiple', 'arguments', 123]);
    });
  });

  describe('Console Method Wrappers', function() {
    it('should handle console.group', function() {
      logger.group('Test Group');
      expect(consoleStubs.group.calledWith('Test Group')).to.be.true;
    });

    it('should handle console.groupEnd', function() {
      logger.groupEnd();
      expect(consoleStubs.groupEnd.called).to.be.true;
    });

    it('should handle console.time', function() {
      logger.time('timer1');
      expect(consoleStubs.time.calledWith('timer1')).to.be.true;
    });

    it('should handle console.timeEnd', function() {
      logger.timeEnd('timer1');
      expect(consoleStubs.timeEnd.calledWith('timer1')).to.be.true;
    });

    it('should handle console.table', function() {
      const data = [{ name: 'John', age: 30 }];
      logger.table(data);
      expect(consoleStubs.table.calledWith(data)).to.be.true;
    });

    it('should handle console.count', function() {
      logger.count('counter1');
      expect(consoleStubs.count.calledWith('counter1')).to.be.true;
    });

    it('should handle console.countReset', function() {
      logger.countReset('counter1');
      expect(consoleStubs.countReset.calledWith('counter1')).to.be.true;
    });

    it('should handle console.assert', function() {
      const errorSpy = sinon.spy(logger, 'error');
      logger.assert(false, 'Assertion failed');
      
      expect(errorSpy.called).to.be.true;
    });

    it('should not error on true assertion', function() {
      const errorSpy = sinon.spy(logger, 'error');
      logger.assert(true, 'This should not log');
      
      expect(errorSpy.called).to.be.false;
    });
  });

  describe('Log Storage and Retrieval', function() {
    beforeEach(function() {
      logger.error('Error 1');
      logger.warn('Warning 1');
      logger.info('Info 1');
      logger.warn('Warning 2');
    });

    it('should store log entries', function() {
      expect(logger.logs).to.have.length(4);
    });

    it('should get all logs', function() {
      const allLogs = logger.getLogs();
      expect(allLogs).to.have.length(4);
    });

    it('should filter logs by level', function() {
      const warnLogs = logger.getLogs('warn');
      expect(warnLogs).to.have.length(2);
      expect(warnLogs[0].level).to.equal('warn');
    });

    it('should get last log entry', function() {
      const lastLog = logger.getLastLog();
      expect(lastLog.message).to.equal('Warning 2');
    });

    it('should search logs', function() {
      const results = logger.searchLogs('Warning');
      expect(results).to.have.length(2);
    });

    it('should limit log history', function() {
      logger.options.maxLogSize = 2;
      
      logger.info('New log 1');
      logger.info('New log 2');
      logger.info('New log 3'); // Should cause oldest to be removed
      
      expect(logger.logs).to.have.length(2);
      expect(logger.logs[0].message).to.equal('New log 2');
    });
  });

  describe('Log Export', function() {
    beforeEach(function() {
      logger.info('Test message 1');
      logger.error('Test error');
    });

    it('should export logs as JSON', function() {
      const exported = logger.exportLogs('json');
      const parsed = JSON.parse(exported);
      
      expect(parsed).to.be.an('array');
      expect(parsed).to.have.length(2);
    });

    it('should export logs as text', function() {
      const exported = logger.exportLogs('text');
      
      expect(exported).to.be.a('string');
      expect(exported).to.include('Test message 1');
      expect(exported).to.include('Test error');
    });

    it('should export logs as CSV', function() {
      const exported = logger.exportLogs('csv');
      
      expect(exported).to.include('timestamp,level,message');
      expect(exported).to.include('info,"Test message 1"');
      expect(exported).to.include('error,"Test error"');
    });

    it('should throw error for unsupported format', function() {
      expect(() => {
        logger.exportLogs('xml');
      }).to.throw('Unsupported export format: xml');
    });
  });

  describe('Event System', function() {
    it('should emit log events', function() {
      const listener = sinon.stub();
      logger.on('log', listener);
      
      logger.info('Test message');
      
      expect(listener.called).to.be.true;
      expect(listener.getCall(0).args[0].level).to.equal('info');
    });

    it('should remove event listeners', function() {
      const listener = sinon.stub();
      logger.on('log', listener);
      logger.off('log', listener);
      
      logger.info('Test message');
      
      expect(listener.called).to.be.false;
    });

    it('should handle multiple listeners', function() {
      const listener1 = sinon.stub();
      const listener2 = sinon.stub();
      
      logger.on('log', listener1);
      logger.on('log', listener2);
      
      logger.info('Test message');
      
      expect(listener1.called).to.be.true;
      expect(listener2.called).to.be.true;
    });

    it('should handle listener errors gracefully', function() {
      const errorListener = sinon.stub().throws(new Error('Listener error'));
      const normalListener = sinon.stub();
      const consoleSpy = sinon.spy(console, 'error');
      
      logger.on('log', errorListener);
      logger.on('log', normalListener);
      
      logger.info('Test message');
      
      expect(consoleSpy.called).to.be.true;
      expect(normalListener.called).to.be.true;
    });
  });

  describe('Child Logger', function() {
    it('should create child logger with inherited options', function() {
      logger.setLevel('debug');
      const child = logger.createChild({ prefix: '[Child]' });
      
      expect(child.options.level).to.equal('debug');
      expect(child.options.prefix).to.equal('[Child]');
    });

    it('should allow child options to override parent', function() {
      const child = logger.createChild({
        level: 'error',
        enableTimestamps: false
      });
      
      expect(child.options.level).to.equal('error');
      expect(child.options.enableTimestamps).to.be.false;
      expect(child.options.prefix).to.equal('[DozedEnt]'); // Inherited
    });
  });

  describe('Output Targets', function() {
    it('should output to memory only', function() {
      const memoryLogger = new Logger({ outputTarget: 'memory' });
      memoryLogger.info('Memory test');
      
      expect(memoryLogger.logs).to.have.length(1);
      expect(consoleStubs.info.called).to.be.false;
    });

    it('should output to custom function', function() {
      const customOutput = sinon.stub();
      const customLogger = new Logger({ outputTarget: customOutput });
      
      customLogger.info('Custom test');
      
      expect(customOutput.called).to.be.true;
      expect(customOutput.getCall(0).args[0].level).to.equal('info');
    });
  });

  describe('Clear and Destroy', function() {
    it('should clear logs', function() {
      logger.info('Test 1');
      logger.info('Test 2');
      
      logger.clear();
      
      expect(logger.logs).to.have.length(0);
      expect(consoleStubs.clear.called).to.be.true;
    });

    it('should destroy logger properly', function() {
      logger.info('Test');
      logger.on('log', () => {});
      
      logger.destroy();
      
      expect(logger.logs).to.have.length(0);
      expect(logger.listeners.size).to.equal(0);
      expect(logger.isMuted()).to.be.true;
    });
  });

  describe('Edge Cases', function() {
    it('should handle null/undefined messages', function() {
      logger.info(null);
      logger.info(undefined);
      
      expect(logger.logs).to.have.length(2);
    });

    it('should handle circular references in objects', function() {
      const circular = { name: 'test' };
      circular.self = circular;
      
      // Should not throw error
      logger.info(circular);
      expect(logger.logs).to.have.length(1);
    });

    it('should handle very long messages', function() {
      const longMessage = 'x'.repeat(10000);
      logger.info(longMessage);
      
      expect(logger.logs[0].message).to.equal(longMessage);
    });

    it('should handle special characters', function() {
      const specialMessage = 'Test\n\r\t\0\x1b[31mcolored\x1b[0m';
      logger.info(specialMessage);
      
      expect(logger.logs[0].message).to.equal(specialMessage);
    });
  });

  describe('Performance', function() {
    it('should handle high-frequency logging', function() {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        logger.info(`Message ${i}`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).to.be.lessThan(5000); // Should complete in under 5 seconds
      expect(logger.logs).to.have.length(1000);
    });

    it('should efficiently filter logs by level', function() {
      logger.setLevel('error');
      
      const startTime = Date.now();
      
      // These should be filtered out quickly
      for (let i = 0; i < 1000; i++) {
        logger.debug(`Debug ${i}`);
        logger.info(`Info ${i}`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).to.be.lessThan(1000); // Should be very fast
      expect(logger.logs).to.have.length(0);
    });
  });
});
