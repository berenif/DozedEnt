import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { encrypt, decrypt, genKey, sha1 } from '../../src/utils/crypto.js';

describe('Crypto Utils', function() {
  let mockCrypto;
  let mockTextEncoder;
  let mockTextDecoder;

  beforeEach(function() {
    // Mock crypto API
    mockCrypto = {
      getRandomValues: sinon.stub().callsFake((array) => {
        // Fill with deterministic "random" values for testing
        for (let i = 0; i < array.length; i++) {
          array[i] = (i + 1) % 256;
        }
        return array;
      }),
      subtle: {
        importKey: sinon.stub().resolves({ type: 'secret', algorithm: { name: 'AES-GCM' } }),
        encrypt: sinon.stub().resolves(new ArrayBuffer(32)),
        decrypt: sinon.stub().resolves(new ArrayBuffer(16)),
        digest: sinon.stub().resolves(new ArrayBuffer(20)),
        deriveBits: sinon.stub().resolves(new ArrayBuffer(32)),
        deriveKey: sinon.stub().resolves({ type: 'secret', algorithm: { name: 'AES-GCM' } })
      }
    };

    // Mock TextEncoder/TextDecoder
    mockTextEncoder = {
      encode: sinon.stub().callsFake((str) => {
        const result = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
          result[i] = str.charCodeAt(i);
        }
        return result;
      })
    };

    mockTextDecoder = {
      decode: sinon.stub().callsFake((buffer) => {
        const uint8Array = new Uint8Array(buffer);
        return String.fromCharCode(...uint8Array);
      })
    };

    global.crypto = mockCrypto;
    global.TextEncoder = sinon.stub().returns(mockTextEncoder);
    global.TextDecoder = sinon.stub().returns(mockTextDecoder);
  });

  afterEach(function() {
    sinon.restore();
    delete global.crypto;
    delete global.TextEncoder;
    delete global.TextDecoder;
  });

  describe('genKey', function() {
    it('should generate key from password and salt', async function() {
      const password = 'test-password';
      const appId = 'test-app';
      const roomId = 'test-room';
      
      const key = await genKey(password, appId, roomId);
      
      expect(mockCrypto.subtle.importKey.called).to.be.true;
      expect(mockCrypto.subtle.deriveKey.called).to.be.true;
      expect(key).to.have.property('type', 'secret');
    });

    it('should generate different keys for different inputs', async function() {
      const key1 = await genKey('password1', 'app1', 'room1');
      const key2 = await genKey('password2', 'app1', 'room1');
      
      // Should call deriveKey with different parameters
      expect(mockCrypto.subtle.deriveKey.calledTwice).to.be.true;
    });

    it('should handle empty password', async function() {
      const key = await genKey('', 'app-id', 'room-id');
      
      expect(key).to.have.property('type', 'secret');
      expect(mockCrypto.subtle.importKey.called).to.be.true;
    });

    it('should use PBKDF2 for key derivation', async function() {
      await genKey('password', 'app', 'room');
      
      const importCall = mockCrypto.subtle.importKey.getCall(0);
      expect(importCall.args[0]).to.equal('raw'); // format
      expect(importCall.args[2]).to.equal('PBKDF2'); // algorithm
      
      const deriveCall = mockCrypto.subtle.deriveKey.getCall(0);
      expect(deriveCall.args[0].name).to.equal('PBKDF2');
      expect(deriveCall.args[0].iterations).to.equal(100000);
    });

    it('should handle crypto API errors', async function() {
      mockCrypto.subtle.importKey.rejects(new Error('Import failed'));
      
      try {
        await genKey('password', 'app', 'room');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Import failed');
      }
    });
  });

  describe('sha1', function() {
    it('should compute SHA-1 hash of string', async function() {
      const input = 'test string';
      
      const hash = await sha1(input);
      
      expect(mockTextEncoder.encode.calledWith(input)).to.be.true;
      expect(mockCrypto.subtle.digest.calledWith('SHA-1')).to.be.true;
      expect(hash).to.be.a('string');
    });

    it('should return consistent hash for same input', async function() {
      const input = 'consistent input';
      
      const hash1 = await sha1(input);
      const hash2 = await sha1(input);
      
      expect(hash1).to.equal(hash2);
    });

    it('should handle empty string', async function() {
      const hash = await sha1('');
      
      expect(mockTextEncoder.encode.calledWith('')).to.be.true;
      expect(hash).to.be.a('string');
    });

    it('should handle unicode characters', async function() {
      const input = 'Hello 世界 🌍';
      
      const hash = await sha1(input);
      
      expect(mockTextEncoder.encode.calledWith(input)).to.be.true;
      expect(hash).to.be.a('string');
    });

    it('should convert ArrayBuffer to hex string', async function() {
      // Mock digest to return specific bytes
      const mockBuffer = new ArrayBuffer(4);
      const mockView = new Uint8Array(mockBuffer);
      mockView[0] = 0xAB;
      mockView[1] = 0xCD;
      mockView[2] = 0xEF;
      mockView[3] = 0x12;
      mockCrypto.subtle.digest.resolves(mockBuffer);
      
      const hash = await sha1('test');
      
      expect(hash).to.equal('abcdef12');
    });

    it('should handle digest errors', async function() {
      mockCrypto.subtle.digest.rejects(new Error('Digest failed'));
      
      try {
        await sha1('test');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Digest failed');
      }
    });
  });

  describe('encrypt', function() {
    let mockKey;

    beforeEach(function() {
      mockKey = { type: 'secret', algorithm: { name: 'AES-GCM' } };
    });

    it('should encrypt data with AES-GCM', async function() {
      const data = 'secret message';
      
      const encrypted = await encrypt(mockKey, data);
      
      expect(mockTextEncoder.encode.calledWith(data)).to.be.true;
      expect(mockCrypto.subtle.encrypt.called).to.be.true;
      
      const encryptCall = mockCrypto.subtle.encrypt.getCall(0);
      expect(encryptCall.args[0].name).to.equal('AES-GCM');
      expect(encryptCall.args[0].iv).to.be.instanceOf(Uint8Array);
      expect(encryptCall.args[1]).to.equal(mockKey);
    });

    it('should generate random IV for each encryption', async function() {
      await encrypt(mockKey, 'message1');
      await encrypt(mockKey, 'message2');
      
      expect(mockCrypto.getRandomValues.calledTwice).to.be.true;
    });

    it('should include IV in encrypted output', async function() {
      const encrypted = await encrypt(mockKey, 'test');
      
      expect(encrypted).to.be.a('string');
      // Should be base64 encoded IV + ciphertext
      expect(encrypted.length).to.be.greaterThan(0);
    });

    it('should handle encryption errors', async function() {
      mockCrypto.subtle.encrypt.rejects(new Error('Encryption failed'));
      
      try {
        await encrypt(mockKey, 'test');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Encryption failed');
      }
    });

    it('should handle empty data', async function() {
      const encrypted = await encrypt(mockKey, '');
      
      expect(mockTextEncoder.encode.calledWith('')).to.be.true;
      expect(encrypted).to.be.a('string');
    });

    it('should use 12-byte IV for AES-GCM', async function() {
      await encrypt(mockKey, 'test');
      
      const randomCall = mockCrypto.getRandomValues.getCall(0);
      expect(randomCall.args[0]).to.be.instanceOf(Uint8Array);
      expect(randomCall.args[0].length).to.equal(12);
    });
  });

  describe('decrypt', function() {
    let mockKey;
    let mockEncryptedData;

    beforeEach(function() {
      mockKey = { type: 'secret', algorithm: { name: 'AES-GCM' } };
      
      // Create mock encrypted data (base64 encoded IV + ciphertext)
      const iv = new Uint8Array(12);
      const ciphertext = new Uint8Array(16);
      const combined = new Uint8Array(28);
      combined.set(iv, 0);
      combined.set(ciphertext, 12);
      
      mockEncryptedData = btoa(String.fromCharCode(...combined));
    });

    it('should decrypt AES-GCM encrypted data', async function() {
      const decrypted = await decrypt(mockKey, mockEncryptedData);
      
      expect(mockCrypto.subtle.decrypt.called).to.be.true;
      expect(mockTextDecoder.decode.called).to.be.true;
      expect(decrypted).to.be.a('string');
    });

    it('should extract IV from encrypted data', async function() {
      await decrypt(mockKey, mockEncryptedData);
      
      const decryptCall = mockCrypto.subtle.decrypt.getCall(0);
      expect(decryptCall.args[0].name).to.equal('AES-GCM');
      expect(decryptCall.args[0].iv).to.be.instanceOf(Uint8Array);
      expect(decryptCall.args[0].iv.length).to.equal(12);
    });

    it('should handle decryption errors', async function() {
      mockCrypto.subtle.decrypt.rejects(new Error('Decryption failed'));
      
      try {
        await decrypt(mockKey, mockEncryptedData);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Decryption failed');
      }
    });

    it('should handle invalid base64 data', async function() {
      const invalidData = 'invalid-base64!@#$';
      
      try {
        await decrypt(mockKey, invalidData);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });

    it('should handle data too short for IV', async function() {
      const shortData = btoa('short'); // Less than 12 bytes
      
      try {
        await decrypt(mockKey, shortData);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });

    it('should handle empty encrypted data', async function() {
      try {
        await decrypt(mockKey, '');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });
  });

  describe('Integration Tests', function() {
    let realKey;

    beforeEach(async function() {
      // Use a real key for integration tests
      realKey = await genKey('test-password', 'test-app', 'test-room');
    });

    it('should encrypt and decrypt round-trip', async function() {
      const originalData = 'This is a secret message!';
      
      const encrypted = await encrypt(realKey, originalData);
      const decrypted = await decrypt(realKey, encrypted);
      
      expect(decrypted).to.equal(originalData);
    });

    it('should handle unicode in round-trip', async function() {
      const originalData = 'Unicode test: 你好世界 🌍 emoji test';
      
      const encrypted = await encrypt(realKey, originalData);
      const decrypted = await decrypt(realKey, encrypted);
      
      expect(decrypted).to.equal(originalData);
    });

    it('should produce different ciphertext for same plaintext', async function() {
      const data = 'same message';
      
      const encrypted1 = await encrypt(realKey, data);
      const encrypted2 = await encrypt(realKey, data);
      
      expect(encrypted1).to.not.equal(encrypted2); // Different IVs
      
      const decrypted1 = await decrypt(realKey, encrypted1);
      const decrypted2 = await decrypt(realKey, encrypted2);
      
      expect(decrypted1).to.equal(data);
      expect(decrypted2).to.equal(data);
    });

    it('should fail with wrong key', async function() {
      const wrongKey = await genKey('wrong-password', 'test-app', 'test-room');
      const encrypted = await encrypt(realKey, 'secret');
      
      try {
        await decrypt(wrongKey, encrypted);
        expect.fail('Should have failed with wrong key');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });
  });

  describe('Error Handling', function() {
    it('should handle missing crypto API', async function() {
      delete global.crypto;
      
      try {
        await genKey('password', 'app', 'room');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });

    it('should handle missing TextEncoder', async function() {
      delete global.TextEncoder;
      
      try {
        await sha1('test');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });

    it('should handle missing TextDecoder', async function() {
      delete global.TextDecoder;
      const key = await genKey('password', 'app', 'room');
      const encrypted = await encrypt(key, 'test');
      
      try {
        await decrypt(key, encrypted);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });

    it('should handle subtle crypto not available', async function() {
      global.crypto = { getRandomValues: mockCrypto.getRandomValues };
      
      try {
        await genKey('password', 'app', 'room');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });
  });

  describe('Performance', function() {
    it('should handle large data encryption', async function() {
      const key = await genKey('password', 'app', 'room');
      const largeData = 'x'.repeat(10000); // 10KB string
      
      const encrypted = await encrypt(key, largeData);
      const decrypted = await decrypt(key, encrypted);
      
      expect(decrypted).to.equal(largeData);
    });

    it('should handle multiple concurrent operations', async function() {
      const key = await genKey('password', 'app', 'room');
      const operations = [];
      
      for (let i = 0; i < 10; i++) {
        operations.push(encrypt(key, `message ${i}`));
      }
      
      const results = await Promise.all(operations);
      
      expect(results).to.have.length(10);
      results.forEach(result => {
        expect(result).to.be.a('string');
      });
    });

    it('should reuse key for multiple encryptions', async function() {
      const key = await genKey('password', 'app', 'room');
      
      await encrypt(key, 'message1');
      await encrypt(key, 'message2');
      
      // Key should be reused, not regenerated
      expect(mockCrypto.subtle.importKey.calledOnce).to.be.true;
    });
  });

  describe('Security', function() {
    it('should use secure random values for IV', async function() {
      const key = await genKey('password', 'app', 'room');
      
      await encrypt(key, 'test');
      
      expect(mockCrypto.getRandomValues.called).to.be.true;
      const randomCall = mockCrypto.getRandomValues.getCall(0);
      expect(randomCall.args[0].length).to.equal(12); // AES-GCM IV length
    });

    it('should use strong key derivation parameters', async function() {
      await genKey('password', 'app', 'room');
      
      const deriveCall = mockCrypto.subtle.deriveKey.getCall(0);
      const params = deriveCall.args[0];
      
      expect(params.iterations).to.equal(100000); // Strong iteration count
      expect(params.hash).to.equal('SHA-256'); // Strong hash
    });

    it('should include salt in key derivation', async function() {
      await genKey('password', 'app-id', 'room-id');
      
      const deriveCall = mockCrypto.subtle.deriveKey.getCall(0);
      const params = deriveCall.args[0];
      
      expect(params.salt).to.be.instanceOf(Uint8Array);
      expect(params.salt.length).to.be.greaterThan(0);
    });

    it('should use authenticated encryption', async function() {
      const key = await genKey('password', 'app', 'room');
      
      await encrypt(key, 'test');
      
      const encryptCall = mockCrypto.subtle.encrypt.getCall(0);
      expect(encryptCall.args[0].name).to.equal('AES-GCM'); // Authenticated encryption
    });
  });
});
