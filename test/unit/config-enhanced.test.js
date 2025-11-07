import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { normalizeConfig } from '../../public/src/utils/config.js';

describe('Config Utils', function() {
  let consoleWarnStub;
  let consoleErrorStub;

  beforeEach(function() {
    consoleWarnStub = sinon.stub(console, 'warn');
    consoleErrorStub = sinon.stub(console, 'error');
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('normalizeConfig', function() {
    it('should return default configuration for empty input', function() {
      const config = normalizeConfig({});
      
      expect(config).to.have.property('appId');
      expect(config).to.have.property('logger');
      expect(config).to.have.property('rtcConfig');
      expect(config.logger).to.be.a('function');
    });

    it('should preserve provided configuration values', function() {
      const inputConfig = {
        appId: 'custom-app-id',
        password: 'secret-password',
        rtcConfig: {
          iceServers: [{ urls: 'stun:custom.server.com:3478' }]
        }
      };
      
      const config = normalizeConfig(inputConfig);
      
      expect(config.appId).to.equal('custom-app-id');
      expect(config.password).to.equal('secret-password');
      expect(config.rtcConfig.iceServers[0].urls).to.equal('stun:custom.server.com:3478');
    });

    it('should merge rtcConfig with defaults', function() {
      const inputConfig = {
        rtcConfig: {
          iceServers: [{ urls: 'stun:custom.server.com:3478' }],
          customProperty: 'custom-value'
        }
      };
      
      const config = normalizeConfig(inputConfig);
      
      expect(config.rtcConfig).to.have.property('iceServers');
      expect(config.rtcConfig).to.have.property('customProperty', 'custom-value');
      expect(config.rtcConfig).to.have.property('sdpSemantics'); // Default property
    });

    it('should set default logger when none provided', function() {
      const config = normalizeConfig({});
      
      expect(config.logger).to.be.a('function');
      
      // Test logger function
      config.logger('test message');
      // Should not throw error
    });

    it('should preserve custom logger', function() {
      const customLogger = sinon.stub();
      const config = normalizeConfig({ logger: customLogger });
      
      expect(config.logger).to.equal(customLogger);
    });

    it('should handle null input gracefully', function() {
      const config = normalizeConfig(null);
      
      expect(config).to.be.an('object');
      expect(config).to.have.property('appId');
    });

    it('should handle undefined input gracefully', function() {
      const config = normalizeConfig(undefined);
      
      expect(config).to.be.an('object');
      expect(config).to.have.property('appId');
    });

    it('should validate appId format', function() {
      const config = normalizeConfig({ appId: 'valid-app-123' });
      
      expect(config.appId).to.equal('valid-app-123');
      expect(consoleWarnStub.called).to.be.false;
    });

    it('should warn about invalid appId format', function() {
      const config = normalizeConfig({ appId: 'invalid app with spaces!' });
      
      expect(consoleWarnStub.called).to.be.true;
      expect(consoleWarnStub.getCall(0).args[0]).to.include('appId');
    });

    it('should set default ICE servers', function() {
      const config = normalizeConfig({});
      
      expect(config.rtcConfig.iceServers).to.be.an('array');
      expect(config.rtcConfig.iceServers.length).to.be.greaterThan(0);
      
      const stunServer = config.rtcConfig.iceServers.find(server => 
        server.urls.includes('stun:')
      );
      expect(stunServer).to.exist;
    });

    it('should handle invalid rtcConfig gracefully', function() {
      const config = normalizeConfig({ rtcConfig: 'invalid' });
      
      expect(config.rtcConfig).to.be.an('object');
      expect(consoleWarnStub.called).to.be.true;
    });

    it('should validate password strength', function() {
      const weakPassword = '123';
      const config = normalizeConfig({ password: weakPassword });
      
      expect(config.password).to.equal(weakPassword);
      expect(consoleWarnStub.called).to.be.true;
      expect(consoleWarnStub.getCall(0).args[0]).to.include('password');
    });

    it('should accept strong passwords without warning', function() {
      const strongPassword = 'very-secure-password-123!';
      const config = normalizeConfig({ password: strongPassword });
      
      expect(config.password).to.equal(strongPassword);
      expect(consoleWarnStub.called).to.be.false;
    });

    it('should set default connection timeout', function() {
      const config = normalizeConfig({});
      
      expect(config.connectionTimeout).to.be.a('number');
      expect(config.connectionTimeout).to.be.greaterThan(0);
    });

    it('should respect custom connection timeout', function() {
      const customTimeout = 15000;
      const config = normalizeConfig({ connectionTimeout: customTimeout });
      
      expect(config.connectionTimeout).to.equal(customTimeout);
    });

    it('should validate connection timeout range', function() {
      const tooShort = normalizeConfig({ connectionTimeout: 500 });
      const tooLong = normalizeConfig({ connectionTimeout: 120000 });
      
      expect(consoleWarnStub.calledTwice).to.be.true;
      expect(tooShort.connectionTimeout).to.be.greaterThan(500);
      expect(tooLong.connectionTimeout).to.be.lessThan(120000);
    });

    it('should set default max peers', function() {
      const config = normalizeConfig({});
      
      expect(config.maxPeers).to.be.a('number');
      expect(config.maxPeers).to.be.greaterThan(0);
    });

    it('should validate max peers range', function() {
      const tooFew = normalizeConfig({ maxPeers: 0 });
      const tooMany = normalizeConfig({ maxPeers: 1000 });
      
      expect(consoleWarnStub.calledTwice).to.be.true;
      expect(tooFew.maxPeers).to.be.greaterThan(0);
      expect(tooMany.maxPeers).to.be.lessThan(1000);
    });

    it('should handle boolean flags correctly', function() {
      const config = normalizeConfig({
        enableLogging: true,
        enableStats: false,
        enableHeartbeat: undefined
      });
      
      expect(config.enableLogging).to.be.true;
      expect(config.enableStats).to.be.false;
      expect(config.enableHeartbeat).to.be.a('boolean'); // Default value
    });

    it('should validate and normalize relay configuration', function() {
      const config = normalizeConfig({
        relays: {
          firebase: { apiKey: 'test-key' },
          supabase: { url: 'https://test.supabase.co' }
        }
      });
      
      expect(config.relays).to.be.an('object');
      expect(config.relays.firebase).to.have.property('apiKey', 'test-key');
      expect(config.relays.supabase).to.have.property('url', 'https://test.supabase.co');
    });

    it('should warn about missing required relay config', function() {
      const config = normalizeConfig({
        relays: {
          firebase: {}, // Missing apiKey
          supabase: { url: 'invalid-url' } // Invalid URL
        }
      });
      
      expect(consoleWarnStub.called).to.be.true;
    });

    it('should set default data channel configuration', function() {
      const config = normalizeConfig({});
      
      expect(config.dataChannelConfig).to.be.an('object');
      expect(config.dataChannelConfig).to.have.property('ordered');
      expect(config.dataChannelConfig).to.have.property('maxRetransmits');
    });

    it('should merge custom data channel configuration', function() {
      const customDataConfig = {
        ordered: false,
        maxRetransmits: 5,
        customProperty: 'custom-value'
      };
      
      const config = normalizeConfig({ dataChannelConfig: customDataConfig });
      
      expect(config.dataChannelConfig.ordered).to.be.false;
      expect(config.dataChannelConfig.maxRetransmits).to.equal(5);
      expect(config.dataChannelConfig.customProperty).to.equal('custom-value');
    });

    it('should handle deep nested configuration', function() {
      const nestedConfig = {
        advanced: {
          networking: {
            retryAttempts: 3,
            backoffStrategy: 'exponential'
          },
          security: {
            encryptionAlgorithm: 'AES-256-GCM',
            keyRotationInterval: 3600
          }
        }
      };
      
      const config = normalizeConfig(nestedConfig);
      
      expect(config.advanced.networking.retryAttempts).to.equal(3);
      expect(config.advanced.security.encryptionAlgorithm).to.equal('AES-256-GCM');
    });

    it('should clone input configuration to avoid mutation', function() {
      const originalConfig = {
        appId: 'original-id',
        nested: { value: 'original' }
      };
      
      const config = normalizeConfig(originalConfig);
      config.appId = 'modified-id';
      config.nested.value = 'modified';
      
      expect(originalConfig.appId).to.equal('original-id');
      expect(originalConfig.nested.value).to.equal('original');
    });

    it('should validate environment-specific settings', function() {
      // Mock environment detection
      const originalEnv = process.env.NODE_ENV;
      
      try {
        process.env.NODE_ENV = 'development';
        const devConfig = normalizeConfig({});
        expect(devConfig.enableDebugLogging).to.be.true;
        
        process.env.NODE_ENV = 'production';
        const prodConfig = normalizeConfig({});
        expect(prodConfig.enableDebugLogging).to.be.false;
        
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should handle configuration inheritance', function() {
      const baseConfig = {
        appId: 'base-app',
        maxPeers: 4,
        rtcConfig: { iceServers: [{ urls: 'stun:base.com' }] }
      };
      
      const extendedConfig = {
        ...baseConfig,
        maxPeers: 8, // Override
        customProperty: 'extended-value' // Addition
      };
      
      const config = normalizeConfig(extendedConfig);
      
      expect(config.appId).to.equal('base-app'); // Inherited
      expect(config.maxPeers).to.equal(8); // Overridden
      expect(config.customProperty).to.equal('extended-value'); // Added
    });

    it('should validate array configurations', function() {
      const config = normalizeConfig({
        allowedOrigins: ['https://example.com', 'https://test.com'],
        blockedPeers: ['peer-1', 'peer-2']
      });
      
      expect(config.allowedOrigins).to.be.an('array');
      expect(config.allowedOrigins).to.have.length(2);
      expect(config.blockedPeers).to.include('peer-1');
    });

    it('should sanitize potentially dangerous configurations', function() {
      const dangerousConfig = {
        appId: '<script>alert("xss")</script>',
        password: 'password\n\r\0',
        customScript: 'eval("malicious code")'
      };
      
      const config = normalizeConfig(dangerousConfig);
      
      expect(config.appId).to.not.include('<script>');
      expect(config.password).to.not.include('\n');
      expect(consoleWarnStub.called).to.be.true;
    });

    it('should provide helpful error messages for common mistakes', function() {
      normalizeConfig({
        appid: 'wrong-case', // Should be appId
        maxpeers: 5, // Should be maxPeers
        rtcconfig: {} // Should be rtcConfig
      });
      
      expect(consoleWarnStub.called).to.be.true;
      const warnings = consoleWarnStub.getCalls().map(call => call.args[0]);
      expect(warnings.some(w => w.includes('appId'))).to.be.true;
    });
  });

  describe('Configuration Validation Edge Cases', function() {
    it('should handle circular references', function() {
      const circularConfig = { appId: 'test' };
      circularConfig.self = circularConfig;
      
      const config = normalizeConfig(circularConfig);
      
      expect(config.appId).to.equal('test');
      // Should not cause infinite recursion
    });

    it('should handle very large configurations', function() {
      const largeConfig = { appId: 'large-test' };
      
      // Add many properties
      for (let i = 0; i < 1000; i++) {
        largeConfig[`property${i}`] = `value${i}`;
      }
      
      const config = normalizeConfig(largeConfig);
      
      expect(config.appId).to.equal('large-test');
      expect(Object.keys(config).length).to.be.greaterThan(1000);
    });

    it('should handle special JavaScript values', function() {
      const specialConfig = {
        appId: 'special-test',
        undefinedValue: undefined,
        nullValue: null,
        nanValue: NaN,
        infinityValue: Infinity,
        dateValue: new Date(),
        regexValue: /test/g,
        functionValue: () => 'test'
      };
      
      const config = normalizeConfig(specialConfig);
      
      expect(config.appId).to.equal('special-test');
      // Should handle special values gracefully
    });

    it('should validate configuration schema if provided', function() {
      const schema = {
        required: ['appId'],
        properties: {
          appId: { type: 'string', minLength: 3 },
          maxPeers: { type: 'number', minimum: 1, maximum: 100 }
        }
      };
      
      const validConfig = normalizeConfig({ appId: 'valid' }, schema);
      const invalidConfig = normalizeConfig({ appId: 'ab' }, schema); // Too short
      
      expect(validConfig.appId).to.equal('valid');
      expect(consoleWarnStub.called).to.be.true; // Warning for invalid config
    });
  });

  describe('Performance', function() {
    it('should normalize configuration efficiently', function() {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        normalizeConfig({
          appId: `test-${i}`,
          maxPeers: i % 10 + 1,
          rtcConfig: { iceServers: [{ urls: 'stun:test.com' }] }
        });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).to.be.lessThan(1000); // Should complete in under 1 second
    });

    it('should cache default configurations', function() {
      const config1 = normalizeConfig({});
      const config2 = normalizeConfig({});
      
      // Default parts should be equivalent (but not same object)
      expect(config1.rtcConfig.iceServers).to.deep.equal(config2.rtcConfig.iceServers);
    });
  });

  describe('Backward Compatibility', function() {
    it('should support legacy configuration format', function() {
      const legacyConfig = {
        app: 'legacy-app-id', // Old format
        peers: 6, // Old format
        ice: [{ urls: 'stun:legacy.com' }] // Old format
      };
      
      const config = normalizeConfig(legacyConfig);
      
      expect(config.appId).to.equal('legacy-app-id');
      expect(config.maxPeers).to.equal(6);
      expect(config.rtcConfig.iceServers[0].urls).to.equal('stun:legacy.com');
    });

    it('should warn about deprecated configuration options', function() {
      normalizeConfig({
        deprecatedOption: 'value',
        oldStyleConfig: true
      });
      
      expect(consoleWarnStub.called).to.be.true;
      const warnings = consoleWarnStub.getCalls().map(call => call.args[0]);
      expect(warnings.some(w => w.includes('deprecated'))).to.be.true;
    });
  });
});
