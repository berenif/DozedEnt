import { expect } from 'chai';
import sinon from 'sinon';
import { createLogger } from '../../src/logger.js';

describe('Logger Module', () => {
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
    Object.values(consoleStubs).forEach(stub => stub.restore());
  });

  describe('createLogger', () => {
    it('should create logger with default options', () => {
      const logger = createLogger();
      
      expect(logger).to.have.property('error');
      expect(logger).to.have.property('warn');
      expect(logger).to.have.property('info');
      expect(logger).to.have.property('debug');
      expect(logger.error).to.be.a('function');
      expect(logger.warn).to.be.a('function');
      expect(logger.info).to.be.a('function');
      expect(logger.debug).to.be.a('function');
    });

    it('should use default level "warn" when not specified', () => {
      const logger = createLogger();
      
      logger.error('test error');
      logger.warn('test warn');
      logger.info('test info');
      logger.debug('test debug');
      
      expect(consoleStubs.error.calledOnce).to.be.true;
      expect(consoleStubs.warn.calledOnce).to.be.true;
      expect(consoleStubs.info.called).to.be.false;
      expect(consoleStubs.debug.called).to.be.false;
    });

    it('should use default prefix "Trystero" when not specified', () => {
      const logger = createLogger();
      
      logger.error('test error');
      logger.warn('test warn');
      
      expect(consoleStubs.error.firstCall.args[0]).to.equal('[Trystero:error]');
      expect(consoleStubs.warn.firstCall.args[0]).to.equal('[Trystero:warn]');
    });

    it('should respect custom prefix', () => {
      const logger = createLogger({ prefix: 'CustomApp' });
      
      logger.error('test error');
      logger.warn('test warn');
      
      expect(consoleStubs.error.firstCall.args[0]).to.equal('[CustomApp:error]');
      expect(consoleStubs.warn.firstCall.args[0]).to.equal('[CustomApp:warn]');
    });

    describe('log levels', () => {
      it('should log nothing with level "none"', () => {
        const logger = createLogger({ level: 'none' });
        
        logger.error('test error');
        logger.warn('test warn');
        logger.info('test info');
        logger.debug('test debug');
        
        expect(consoleStubs.error.called).to.be.false;
        expect(consoleStubs.warn.called).to.be.false;
        expect(consoleStubs.info.called).to.be.false;
        expect(consoleStubs.debug.called).to.be.false;
      });

      it('should log only errors with level "error"', () => {
        const logger = createLogger({ level: 'error' });
        
        logger.error('test error');
        logger.warn('test warn');
        logger.info('test info');
        logger.debug('test debug');
        
        expect(consoleStubs.error.calledOnce).to.be.true;
        expect(consoleStubs.warn.called).to.be.false;
        expect(consoleStubs.info.called).to.be.false;
        expect(consoleStubs.debug.called).to.be.false;
      });

      it('should log errors and warnings with level "warn"', () => {
        const logger = createLogger({ level: 'warn' });
        
        logger.error('test error');
        logger.warn('test warn');
        logger.info('test info');
        logger.debug('test debug');
        
        expect(consoleStubs.error.calledOnce).to.be.true;
        expect(consoleStubs.warn.calledOnce).to.be.true;
        expect(consoleStubs.info.called).to.be.false;
        expect(consoleStubs.debug.called).to.be.false;
      });

      it('should log errors, warnings, and info with level "info"', () => {
        const logger = createLogger({ level: 'info' });
        
        logger.error('test error');
        logger.warn('test warn');
        logger.info('test info');
        logger.debug('test debug');
        
        expect(consoleStubs.error.calledOnce).to.be.true;
        expect(consoleStubs.warn.calledOnce).to.be.true;
        expect(consoleStubs.info.calledOnce).to.be.true;
        expect(consoleStubs.debug.called).to.be.false;
      });

      it('should log everything with level "debug"', () => {
        const logger = createLogger({ level: 'debug' });
        
        logger.error('test error');
        logger.warn('test warn');
        logger.info('test info');
        logger.debug('test debug');
        
        expect(consoleStubs.error.calledOnce).to.be.true;
        expect(consoleStubs.warn.calledOnce).to.be.true;
        expect(consoleStubs.info.calledOnce).to.be.true;
        expect(consoleStubs.debug.calledOnce).to.be.true;
      });
    });

    it('should handle invalid log level by defaulting to "warn"', () => {
      const logger = createLogger({ level: 'invalid' });
      
      logger.error('test error');
      logger.warn('test warn');
      logger.info('test info');
      logger.debug('test debug');
      
      expect(consoleStubs.error.calledOnce).to.be.true;
      expect(consoleStubs.warn.calledOnce).to.be.true;
      expect(consoleStubs.info.called).to.be.false;
      expect(consoleStubs.debug.called).to.be.false;
    });

    it('should pass multiple arguments to console methods', () => {
      const logger = createLogger({ level: 'debug' });
      
      const obj = { key: 'value' };
      const arr = [1, 2, 3];
      
      logger.error('error', obj, arr);
      logger.warn('warn', obj, arr);
      logger.info('info', obj, arr);
      logger.debug('debug', obj, arr);
      
      expect(consoleStubs.error.firstCall.args).to.deep.equal(['[Trystero:error]', 'error', obj, arr]);
      expect(consoleStubs.warn.firstCall.args).to.deep.equal(['[Trystero:warn]', 'warn', obj, arr]);
      expect(consoleStubs.info.firstCall.args).to.deep.equal(['[Trystero:info]', 'info', obj, arr]);
      expect(consoleStubs.debug.firstCall.args).to.deep.equal(['[Trystero:debug]', 'debug', obj, arr]);
    });

    it('should handle null and undefined options', () => {
      const logger1 = createLogger(null);
      const logger2 = createLogger(undefined);
      
      expect(logger1).to.have.all.keys('error', 'warn', 'info', 'debug');
      expect(logger2).to.have.all.keys('error', 'warn', 'info', 'debug');
      
      logger1.warn('test');
      logger2.warn('test');
      
      expect(consoleStubs.warn.calledTwice).to.be.true;
    });
  });
});