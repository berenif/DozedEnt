import { expect } from 'chai';
import sinon from 'sinon';
import { createLogger } from '../../public/src/utils/logger.js';

describe('Logger', () => {
  let consoleStubs;

  beforeEach(() => {
    consoleStubs = {
      error: sinon.stub(console, 'error'),
      warn: sinon.stub(console, 'warn'),
      info: sinon.stub(console, 'info'),
      debug: sinon.stub(console, 'debug')
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('createLogger', () => {
    it('should create logger with default options', () => {
      const logger = createLogger();
      
      expect(logger).to.have.property('error');
      expect(logger).to.have.property('warn');
      expect(logger).to.have.property('info');
      expect(logger).to.have.property('debug');
      expect(typeof logger.error).to.equal('function');
      expect(typeof logger.warn).to.equal('function');
      expect(typeof logger.info).to.equal('function');
      expect(typeof logger.debug).to.equal('function');
    });

    it('should create logger with custom level', () => {
      const logger = createLogger({ level: 'debug' });
      
      logger.debug('debug message');
      expect(consoleStubs.debug.called).to.be.true;
      expect(consoleStubs.debug.calledWith('[Trystero:debug]', 'debug message')).to.be.true;
    });

    it('should create logger with custom prefix', () => {
      const logger = createLogger({ prefix: 'CustomApp' });
      
      logger.warn('warning message');
      expect(consoleStubs.warn.called).to.be.true;
      expect(consoleStubs.warn.calledWith('[CustomApp:warn]', 'warning message')).to.be.true;
    });

    it('should create logger with both custom level and prefix', () => {
      const logger = createLogger({ level: 'info', prefix: 'MyApp' });
      
      logger.info('info message');
      expect(consoleStubs.info.called).to.be.true;
      expect(consoleStubs.info.calledWith('[MyApp:info]', 'info message')).to.be.true;
    });

    it('should handle null options', () => {
      const logger = createLogger(null);
      
      logger.warn('test message');
      expect(consoleStubs.warn.called).to.be.true;
    });

    it('should handle undefined options', () => {
      const logger = createLogger(undefined);
      
      logger.warn('test message');
      expect(consoleStubs.warn.called).to.be.true;
    });
  });

  describe('Log Levels', () => {
    it('should respect "none" level - no logging', () => {
      const logger = createLogger({ level: 'none' });
      
      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');
      
      expect(consoleStubs.error.called).to.be.false;
      expect(consoleStubs.warn.called).to.be.false;
      expect(consoleStubs.info.called).to.be.false;
      expect(consoleStubs.debug.called).to.be.false;
    });

    it('should respect "error" level - only error logging', () => {
      const logger = createLogger({ level: 'error' });
      
      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');
      
      expect(consoleStubs.error.called).to.be.true;
      expect(consoleStubs.warn.called).to.be.false;
      expect(consoleStubs.info.called).to.be.false;
      expect(consoleStubs.debug.called).to.be.false;
    });

    it('should respect "warn" level - error and warn logging', () => {
      const logger = createLogger({ level: 'warn' });
      
      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');
      
      expect(consoleStubs.error.called).to.be.true;
      expect(consoleStubs.warn.called).to.be.true;
      expect(consoleStubs.info.called).to.be.false;
      expect(consoleStubs.debug.called).to.be.false;
    });

    it('should respect "info" level - error, warn, and info logging', () => {
      const logger = createLogger({ level: 'info' });
      
      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');
      
      expect(consoleStubs.error.called).to.be.true;
      expect(consoleStubs.warn.called).to.be.true;
      expect(consoleStubs.info.called).to.be.true;
      expect(consoleStubs.debug.called).to.be.false;
    });

    it('should respect "debug" level - all logging', () => {
      const logger = createLogger({ level: 'debug' });
      
      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');
      
      expect(consoleStubs.error.called).to.be.true;
      expect(consoleStubs.warn.called).to.be.true;
      expect(consoleStubs.info.called).to.be.true;
      expect(consoleStubs.debug.called).to.be.true;
    });

    it('should default to "warn" level for invalid level', () => {
      const logger = createLogger({ level: 'invalid-level' });
      
      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');
      
      expect(consoleStubs.error.called).to.be.true;
      expect(consoleStubs.warn.called).to.be.true;
      expect(consoleStubs.info.called).to.be.false;
      expect(consoleStubs.debug.called).to.be.false;
    });
  });

  describe('Message Formatting', () => {
    it('should format messages with tags', () => {
      const logger = createLogger({ level: 'debug', prefix: 'TestApp' });
      
      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');
      
      expect(consoleStubs.error.calledWith('[TestApp:error]', 'error message')).to.be.true;
      expect(consoleStubs.warn.calledWith('[TestApp:warn]', 'warn message')).to.be.true;
      expect(consoleStubs.info.calledWith('[TestApp:info]', 'info message')).to.be.true;
      expect(consoleStubs.debug.calledWith('[TestApp:debug]', 'debug message')).to.be.true;
    });

    it('should handle multiple arguments', () => {
      const logger = createLogger({ level: 'info' });
      
      logger.info('message', 'arg1', 42, { key: 'value' });
      
      expect(consoleStubs.info.calledWith('[Trystero:info]', 'message', 'arg1', 42, { key: 'value' })).to.be.true;
    });

    it('should handle no arguments', () => {
      const logger = createLogger({ level: 'warn' });
      
      logger.warn();
      
      expect(consoleStubs.warn.calledWith('[Trystero:warn]')).to.be.true;
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string level', () => {
      const logger = createLogger({ level: '' });
      
      logger.warn('test message');
      expect(consoleStubs.warn.called).to.be.true; // Should default to warn
    });

    it('should handle empty string prefix', () => {
      const logger = createLogger({ prefix: '' });
      
      logger.warn('test message');
      expect(consoleStubs.warn.calledWith('[:warn]', 'test message')).to.be.true;
    });

    it('should handle numeric level', () => {
      const logger = createLogger({ level: 123 });
      
      logger.warn('test message');
      expect(consoleStubs.warn.called).to.be.true; // Should default to warn
    });

    it('should handle object as level', () => {
      const logger = createLogger({ level: {} });
      
      logger.warn('test message');
      expect(consoleStubs.warn.called).to.be.true; // Should default to warn
    });

    it('should handle very long prefix', () => {
      const longPrefix = 'A'.repeat(1000);
      const logger = createLogger({ prefix: longPrefix });
      
      logger.warn('test message');
      expect(consoleStubs.warn.calledWith(`[${longPrefix}:warn]`, 'test message')).to.be.true;
    });
  });

  describe('Performance', () => {
    it('should not call console methods when level is too low', () => {
      const logger = createLogger({ level: 'error' });
      
      // These should not trigger console calls
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');
      
      expect(consoleStubs.warn.called).to.be.false;
      expect(consoleStubs.info.called).to.be.false;
      expect(consoleStubs.debug.called).to.be.false;
    });

    it('should handle high-frequency logging', () => {
      const logger = createLogger({ level: 'debug' });
      
      for (let i = 0; i < 1000; i++) {
        logger.debug(`Message ${i}`);
      }
      
      expect(consoleStubs.debug.callCount).to.equal(1000);
    });
  });

  describe('Integration', () => {
    it('should work with real-world scenarios', () => {
      const logger = createLogger({ level: 'info', prefix: 'GameEngine' });
      
      // Simulate game logging scenarios
      logger.info('Game initialized');
      logger.warn('Low memory warning');
      logger.error('Connection failed');
      logger.debug('Frame rendered'); // Should not log
      
      expect(consoleStubs.info.calledWith('[GameEngine:info]', 'Game initialized')).to.be.true;
      expect(consoleStubs.warn.calledWith('[GameEngine:warn]', 'Low memory warning')).to.be.true;
      expect(consoleStubs.error.calledWith('[GameEngine:error]', 'Connection failed')).to.be.true;
      expect(consoleStubs.debug.called).to.be.false;
    });

    it('should maintain separate logger instances', () => {
      const logger1 = createLogger({ level: 'error', prefix: 'Module1' });
      const logger2 = createLogger({ level: 'debug', prefix: 'Module2' });
      
      logger1.warn('Module1 warning'); // Should not log
      logger2.warn('Module2 warning'); // Should log
      
      expect(consoleStubs.warn.called).to.be.true;
      expect(consoleStubs.warn.calledOnce).to.be.true;
      expect(consoleStubs.warn.calledWith('[Module2:warn]', 'Module2 warning')).to.be.true;
    });
  });
});