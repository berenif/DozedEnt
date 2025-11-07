import { expect } from 'chai';
import sinon from 'sinon';
import { normalizeConfig } from '../../public/src/utils/config.js';

describe('Config', () => {
  let consoleErrorStub;
  let consoleWarnStub;

  beforeEach(() => {
    consoleErrorStub = sinon.stub(console, 'error');
    consoleWarnStub = sinon.stub(console, 'warn');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should normalize configuration', () => {
    const config = normalizeConfig({
      appId: 'test-app',
      password: 'secret'
    });
    
    expect(config.appId).to.equal('test-app');
    expect(config.password).to.equal('secret');
    expect(config.logger).to.be.a('object');
    expect(config.rtcConfig).to.be.a('object');
  });

  it('should throw error when config is null', () => {
    expect(() => normalizeConfig(null)).to.throw('requires a config map as the first argument');
  });

  it('should throw error when config is undefined', () => {
    expect(() => normalizeConfig()).to.throw('requires a config map as the first argument');
  });

  it('should throw error when config is false', () => {
    expect(() => normalizeConfig(false)).to.throw('requires a config map as the first argument');
  });

  it('should create logger from config', () => {
    const config = normalizeConfig({
      logger: { level: 'debug', prefix: 'TestApp' }
    });
    
    expect(config.logger).to.have.property('error');
    expect(config.logger).to.have.property('warn');
    expect(config.logger).to.have.property('info');
    expect(config.logger).to.have.property('debug');
  });

  it('should create default logger when none provided', () => {
    const config = normalizeConfig({});
    
    expect(config.logger).to.be.an('object');
    expect(config.logger).to.have.property('error');
    expect(config.logger).to.have.property('warn');
  });

  it('should initialize empty rtcConfig when none provided', () => {
    const config = normalizeConfig({});
    
    expect(config.rtcConfig).to.deep.equal({});
  });

  it('should preserve existing rtcConfig', () => {
    const rtcConfig = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };
    const config = normalizeConfig({ rtcConfig });
    
    expect(config.rtcConfig).to.equal(rtcConfig);
  });

  it('should spread all config properties', () => {
    const inputConfig = {
      appId: 'test',
      customProp: 'value',
      nested: { prop: 123 }
    };
    const config = normalizeConfig(inputConfig);
    
    expect(config.appId).to.equal('test');
    expect(config.customProp).to.equal('value');
    expect(config.nested).to.deep.equal({ prop: 123 });
  });

  it('should not mutate original config', () => {
    const originalConfig = { appId: 'original' };
    const config = normalizeConfig(originalConfig);
    config.appId = 'modified';
    
    expect(originalConfig.appId).to.equal('original');
  });

  it('should handle empty config object', () => {
    const config = normalizeConfig({});
    
    expect(config).to.be.an('object');
    expect(config.logger).to.be.an('object');
    expect(config.rtcConfig).to.deep.equal({});
  });

  it('should preserve all custom properties', () => {
    const customConfig = {
      appId: 'custom-app',
      maxPeers: 10,
      timeout: 5000,
      customFlag: true,
      nestedConfig: {
        subProp1: 'value1',
        subProp2: 42
      }
    };
    
    const config = normalizeConfig(customConfig);
    
    expect(config.appId).to.equal('custom-app');
    expect(config.maxPeers).to.equal(10);
    expect(config.timeout).to.equal(5000);
    expect(config.customFlag).to.be.true;
    expect(config.nestedConfig).to.deep.equal({
      subProp1: 'value1',
      subProp2: 42
    });
  });
});