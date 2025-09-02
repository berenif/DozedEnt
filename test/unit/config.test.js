import { expect } from 'chai';
import { normalizeConfig } from '../../src/config.js';

describe('Config Module', () => {
  describe('normalizeConfig', () => {
    it('should throw error when config is not provided', () => {
      expect(() => normalizeConfig()).to.throw('requires a config map as the first argument');
      expect(() => normalizeConfig(null)).to.throw('requires a config map as the first argument');
      expect(() => normalizeConfig(undefined)).to.throw('requires a config map as the first argument');
    });

    it('should return a normalized config with logger', () => {
      const config = { appId: 'test-app' };
      const normalized = normalizeConfig(config);
      
      expect(normalized).to.have.property('appId', 'test-app');
      expect(normalized).to.have.property('logger');
      expect(normalized.logger).to.have.property('error');
      expect(normalized.logger).to.have.property('warn');
      expect(normalized.logger).to.have.property('info');
      expect(normalized.logger).to.have.property('debug');
    });

    it('should preserve existing config properties', () => {
      const config = {
        appId: 'test-app',
        customProp: 'custom-value',
        nested: { prop: 'value' }
      };
      const normalized = normalizeConfig(config);
      
      expect(normalized).to.have.property('appId', 'test-app');
      expect(normalized).to.have.property('customProp', 'custom-value');
      expect(normalized).to.have.property('nested');
      expect(normalized.nested).to.deep.equal({ prop: 'value' });
    });

    it('should add rtcConfig if not present', () => {
      const config = { appId: 'test-app' };
      const normalized = normalizeConfig(config);
      
      expect(normalized).to.have.property('rtcConfig');
      expect(normalized.rtcConfig).to.deep.equal({});
    });

    it('should preserve existing rtcConfig', () => {
      const rtcConfig = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      };
      const config = { appId: 'test-app', rtcConfig };
      const normalized = normalizeConfig(config);
      
      expect(normalized).to.have.property('rtcConfig');
      expect(normalized.rtcConfig).to.deep.equal(rtcConfig);
    });

    it('should handle logger configuration', () => {
      const config = {
        appId: 'test-app',
        logger: { level: 'debug', prefix: 'CustomPrefix' }
      };
      const normalized = normalizeConfig(config);
      
      expect(normalized).to.have.property('logger');
      expect(normalized.logger).to.have.property('error');
      expect(normalized.logger).to.have.property('warn');
      expect(normalized.logger).to.have.property('info');
      expect(normalized.logger).to.have.property('debug');
    });

    it('should not mutate original config', () => {
      const config = { appId: 'test-app' };
      const normalized = normalizeConfig(config);
      
      expect(config).to.not.have.property('logger');
      expect(config).to.not.have.property('rtcConfig');
      expect(normalized).to.not.equal(config);
    });
  });
});