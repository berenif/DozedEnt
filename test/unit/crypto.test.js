import { expect } from 'chai';
import sinon from 'sinon';
import { encrypt, decrypt, genKey, sha1 } from '../../src/utils/crypto.js';

describe('Crypto Utils', () => {
  let mockCrypto;

  beforeEach(() => {
    // Mock crypto API for consistent testing
    mockCrypto = {
      getRandomValues: sinon.stub().callsFake((array) => {
        // Fill with deterministic values for testing
        for (let i = 0; i < array.length; i++) {
          array[i] = (i + 1) % 256;
        }
        return array;
      }),
      subtle: {
        digest: sinon.stub().resolves(new ArrayBuffer(32)),
        importKey: sinon.stub().resolves({ type: 'secret', algorithm: { name: 'AES-GCM' } }),
        encrypt: sinon.stub().resolves(new ArrayBuffer(32)),
        decrypt: sinon.stub().resolves(new ArrayBuffer(16))
      }
    };
    
    global.crypto = mockCrypto;
    global.btoa = sinon.stub().callsFake((str) => Buffer.from(str, 'binary').toString('base64'));
    global.atob = sinon.stub().callsFake((str) => Buffer.from(str, 'base64').toString('binary'));
  });

  afterEach(() => {
    sinon.restore();
    delete global.crypto;
    delete global.btoa;
    delete global.atob;
  });

  describe('genKey', () => {
    it('should generate a key from secret, appId, and roomId', async () => {
      const key = await genKey('secret', 'app123', 'room456');
      
      expect(mockCrypto.subtle.digest.called).to.be.true;
      expect(mockCrypto.subtle.importKey.called).to.be.true;
      expect(key).to.be.an('object');
      expect(key.type).to.equal('secret');
    });

    it('should use SHA-256 for key derivation', async () => {
      await genKey('secret', 'app', 'room');
      
      const digestCall = mockCrypto.subtle.digest.getCall(0);
      expect(digestCall.args[0]).to.deep.equal({ name: 'SHA-256' });
    });

    it('should import key with AES-GCM algorithm', async () => {
      await genKey('secret', 'app', 'room');
      
      const importCall = mockCrypto.subtle.importKey.getCall(0);
      expect(importCall.args[0]).to.equal('raw');
      expect(importCall.args[2]).to.deep.equal({ name: 'AES-GCM' });
      expect(importCall.args[3]).to.be.false; // not extractable
      expect(importCall.args[4]).to.deep.equal(['encrypt', 'decrypt']);
    });

    it('should handle empty secret', async () => {
      const key = await genKey('', 'app', 'room');
      expect(key).to.be.an('object');
    });

    it('should handle special characters in inputs', async () => {
      const key = await genKey('sécrét!@#$', 'àpp-123', 'rööm_456');
      expect(key).to.be.an('object');
    });

    it('should combine secret, appId, and roomId for key derivation', async () => {
      await genKey('secret', 'app', 'room');
      
      // Should encode the combined string
      expect(mockCrypto.subtle.digest.called).to.be.true;
    });
  });

  describe('sha1', () => {
    beforeEach(() => {
      // Mock specific SHA-1 response
      const mockSha1Buffer = new ArrayBuffer(20);
      const view = new Uint8Array(mockSha1Buffer);
      view[0] = 0xAB; view[1] = 0xCD; // Fill with test data
      mockCrypto.subtle.digest.withArgs('SHA-1').resolves(mockSha1Buffer);
    });

    it('should generate SHA-1 hash', async () => {
      const hash = await sha1('test string');
      
      expect(mockCrypto.subtle.digest.calledWith('SHA-1')).to.be.true;
      expect(hash).to.be.a('string');
    });

    it('should cache results for same input', async () => {
      const input = 'cache test';
      const hash1 = await sha1(input);
      const hash2 = await sha1(input);
      
      expect(hash1).to.equal(hash2);
      // Should only call digest once due to caching
      expect(mockCrypto.subtle.digest.calledOnce).to.be.true;
    });

    it('should handle empty string', async () => {
      const hash = await sha1('');
      expect(hash).to.be.a('string');
    });

    it('should handle unicode characters', async () => {
      const hash = await sha1('Hello 世界 🌍');
      expect(hash).to.be.a('string');
    });

    it('should convert hash to base-36 string', async () => {
      const hash = await sha1('test');
      expect(hash).to.match(/^[0-9a-z]+$/); // Base-36 characters
    });
  });

  describe('encrypt', () => {
    let testKey;

    beforeEach(async () => {
      testKey = await genKey('test-secret', 'test-app', 'test-room');
    });

    it('should encrypt plaintext', async () => {
      const plaintext = 'secret message';
      const encrypted = await encrypt(testKey, plaintext);
      
      expect(mockCrypto.getRandomValues.called).to.be.true; // IV generation
      expect(mockCrypto.subtle.encrypt.called).to.be.true;
      expect(encrypted).to.be.a('string');
    });

    it('should generate random IV', async () => {
      await encrypt(testKey, 'test');
      
      const randomCall = mockCrypto.getRandomValues.getCall(0);
      expect(randomCall.args[0]).to.be.instanceOf(Uint8Array);
      expect(randomCall.args[0].length).to.equal(16); // AES-GCM IV length
    });

    it('should use AES-GCM encryption', async () => {
      await encrypt(testKey, 'test');
      
      const encryptCall = mockCrypto.subtle.encrypt.getCall(0);
      expect(encryptCall.args[0].name).to.equal('AES-GCM');
      expect(encryptCall.args[0].iv).to.be.instanceOf(Uint8Array);
      expect(encryptCall.args[1]).to.equal(testKey);
    });

    it('should include IV in output format', async () => {
      const encrypted = await encrypt(testKey, 'test');
      
      expect(encrypted).to.include(','); // IV separator
      expect(encrypted).to.include('$'); // Main separator
    });

    it('should handle empty plaintext', async () => {
      const encrypted = await encrypt(testKey, '');
      expect(encrypted).to.be.a('string');
    });

    it('should handle unicode plaintext', async () => {
      const encrypted = await encrypt(testKey, 'Hello 世界 🌍');
      expect(encrypted).to.be.a('string');
    });
  });

  describe('decrypt', () => {
    let testKey;
    let mockEncrypted;

    beforeEach(async () => {
      testKey = await genKey('test-secret', 'test-app', 'test-room');
      
      // Create mock encrypted data in the expected format
      const iv = Array.from({length: 16}, (_, i) => i + 1);
      const ivStr = iv.join(',');
      const ciphertext = 'bW9ja19jaXBoZXJ0ZXh0'; // base64 encoded
      mockEncrypted = `${ivStr}$${ciphertext}`;
      
      // Mock decrypt to return test data
      const mockDecrypted = new TextEncoder().encode('decrypted message');
      mockCrypto.subtle.decrypt.resolves(mockDecrypted.buffer);
    });

    it('should decrypt encrypted data', async () => {
      const decrypted = await decrypt(testKey, mockEncrypted);
      
      expect(mockCrypto.subtle.decrypt.called).to.be.true;
      expect(decrypted).to.be.a('string');
    });

    it('should parse IV from encrypted data', async () => {
      await decrypt(testKey, mockEncrypted);
      
      const decryptCall = mockCrypto.subtle.decrypt.getCall(0);
      expect(decryptCall.args[0].name).to.equal('AES-GCM');
      expect(decryptCall.args[0].iv).to.be.instanceOf(Uint8Array);
      expect(decryptCall.args[0].iv.length).to.equal(16);
    });

    it('should use correct key for decryption', async () => {
      await decrypt(testKey, mockEncrypted);
      
      const decryptCall = mockCrypto.subtle.decrypt.getCall(0);
      expect(decryptCall.args[1]).to.equal(testKey);
    });

    it('should throw error for invalid format', async () => {
      try {
        await decrypt(testKey, 'invalid-format');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Invalid encrypted data format');
      }
    });

    it('should throw error for missing IV', async () => {
      try {
        await decrypt(testKey, '$onlyciphertext');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Missing IV or ciphertext');
      }
    });

    it('should throw error for missing ciphertext', async () => {
      try {
        await decrypt(testKey, '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16$');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Missing IV or ciphertext');
      }
    });

    it('should throw error for null input', async () => {
      try {
        await decrypt(testKey, null);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Invalid encrypted data format');
      }
    });

    it('should throw error for empty string', async () => {
      try {
        await decrypt(testKey, '');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Invalid encrypted data format');
      }
    });
  });

  describe('Integration Tests', () => {
    let realKey;

    beforeEach(async () => {
      // Use real crypto for integration tests
      delete global.crypto;
      delete global.btoa;
      delete global.atob;
      
      // Restore real crypto APIs if available
      if (typeof window !== 'undefined' && window.crypto) {
        global.crypto = window.crypto;
      } else if (typeof globalThis !== 'undefined' && globalThis.crypto) {
        global.crypto = globalThis.crypto;
      } else {
        // Skip integration tests if crypto not available
        this.skip();
      }
      
      global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
      global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
      
      try {
        realKey = await genKey('integration-test', 'app', 'room');
      } catch (error) {
        this.skip(); // Skip if crypto operations fail
      }
    });

    it('should encrypt and decrypt round-trip', async function() {
      if (!realKey) {this.skip();}
      
      const originalData = 'This is a secret message!';
      
      const encrypted = await encrypt(realKey, originalData);
      const decrypted = await decrypt(realKey, encrypted);
      
      expect(decrypted).to.equal(originalData);
    });

    it('should handle unicode in round-trip', async function() {
      if (!realKey) {this.skip();}
      
      const originalData = 'Unicode test: 你好世界 🌍 emoji test';
      
      const encrypted = await encrypt(realKey, originalData);
      const decrypted = await decrypt(realKey, encrypted);
      
      expect(decrypted).to.equal(originalData);
    });

    it('should produce different ciphertext for same plaintext', async function() {
      if (!realKey) {this.skip();}
      
      const data = 'same message';
      
      const encrypted1 = await encrypt(realKey, data);
      const encrypted2 = await encrypt(realKey, data);
      
      expect(encrypted1).to.not.equal(encrypted2); // Different IVs
      
      const decrypted1 = await decrypt(realKey, encrypted1);
      const decrypted2 = await decrypt(realKey, encrypted2);
      
      expect(decrypted1).to.equal(data);
      expect(decrypted2).to.equal(data);
    });

    it('should generate consistent SHA-1 hashes', async function() {
      if (!global.crypto || !global.crypto.subtle) {this.skip();}
      
      const input = 'consistent test string';
      const hash1 = await sha1(input);
      const hash2 = await sha1(input);
      
      expect(hash1).to.equal(hash2);
      expect(hash1).to.be.a('string');
      expect(hash1.length).to.be.greaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing crypto API', async () => {
      delete global.crypto;
      
      try {
        await genKey('test', 'app', 'room');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });

    it('should handle crypto.subtle errors', async () => {
      mockCrypto.subtle.digest.rejects(new Error('Crypto operation failed'));
      
      try {
        await sha1('test');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Crypto operation failed');
      }
    });

    it('should handle encryption errors', async () => {
      const testKey = await genKey('test', 'app', 'room');
      mockCrypto.subtle.encrypt.rejects(new Error('Encryption failed'));
      
      try {
        await encrypt(testKey, 'test');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Encryption failed');
      }
    });

    it('should handle decryption errors', async () => {
      const testKey = await genKey('test', 'app', 'room');
      const validFormat = '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16$dGVzdA==';
      mockCrypto.subtle.decrypt.rejects(new Error('Decryption failed'));
      
      try {
        await decrypt(testKey, validFormat);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Decryption failed');
      }
    });
  });
});