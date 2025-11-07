import { expect } from 'chai';
import { DeterministicIdGenerator } from '../../public/src/utils/deterministic-id-generator.js';

describe('DeterministicIdGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new DeterministicIdGenerator('test-seed');
  });

  describe('Constructor', () => {
    it('should create generator with seed', () => {
      expect(generator.seed).to.equal('test-seed');
      expect(generator.counter).to.equal(0);
    });

    it('should create generator with default seed', () => {
      const defaultGenerator = new DeterministicIdGenerator();
      expect(defaultGenerator.seed).to.exist;
      expect(typeof defaultGenerator.seed).to.equal('string');
    });

    it('should initialize counter to zero', () => {
      expect(generator.counter).to.equal(0);
    });
  });

  describe('generateId', () => {
    it('should generate deterministic IDs', () => {
      const id1 = generator.generateId();
      const id2 = generator.generateId();
      
      expect(id1).to.not.equal(id2);
      expect(typeof id1).to.equal('string');
      expect(typeof id2).to.equal('string');
    });

    it('should generate same IDs with same seed and counter', () => {
      const gen1 = new DeterministicIdGenerator('test-seed');
      const gen2 = new DeterministicIdGenerator('test-seed');
      
      const id1 = gen1.generateId();
      const id2 = gen2.generateId();
      
      expect(id1).to.equal(id2);
    });

    it('should generate different IDs with different seeds', () => {
      const gen1 = new DeterministicIdGenerator('seed1');
      const gen2 = new DeterministicIdGenerator('seed2');
      
      const id1 = gen1.generateId();
      const id2 = gen2.generateId();
      
      expect(id1).to.not.equal(id2);
    });

    it('should increment counter after each generation', () => {
      const initialCounter = generator.counter;
      generator.generateId();
      expect(generator.counter).to.equal(initialCounter + 1);
      
      generator.generateId();
      expect(generator.counter).to.equal(initialCounter + 2);
    });

    it('should generate IDs of correct length', () => {
      const id = generator.generateId();
      expect(id).to.have.lengthOf(20); // Default length
    });

    it('should generate IDs with custom length', () => {
      const id = generator.generateId(32);
      expect(id).to.have.lengthOf(32);
    });

    it('should generate alphanumeric IDs', () => {
      const id = generator.generateId();
      expect(id).to.match(/^[a-zA-Z0-9]+$/);
    });
  });

  describe('generateIdWithPrefix', () => {
    it('should generate IDs with prefix', () => {
      const id = generator.generateIdWithPrefix('user_');
      expect(id).to.match(/^user_[a-zA-Z0-9]+$/);
    });

    it('should generate different IDs with same prefix', () => {
      const id1 = generator.generateIdWithPrefix('user_');
      const id2 = generator.generateIdWithPrefix('user_');
      
      expect(id1).to.not.equal(id2);
      expect(id1).to.match(/^user_[a-zA-Z0-9]+$/);
      expect(id2).to.match(/^user_[a-zA-Z0-9]+$/);
    });

    it('should generate deterministic IDs with prefix', () => {
      const gen1 = new DeterministicIdGenerator('test-seed');
      const gen2 = new DeterministicIdGenerator('test-seed');
      
      const id1 = gen1.generateIdWithPrefix('user_');
      const id2 = gen2.generateIdWithPrefix('user_');
      
      expect(id1).to.equal(id2);
    });

    it('should handle empty prefix', () => {
      const id = generator.generateIdWithPrefix('');
      expect(id).to.match(/^[a-zA-Z0-9]+$/);
    });

    it('should handle special characters in prefix', () => {
      const id = generator.generateIdWithPrefix('user-123_');
      expect(id).to.match(/^user-123_[a-zA-Z0-9]+$/);
    });
  });

  describe('generateIdWithSuffix', () => {
    it('should generate IDs with suffix', () => {
      const id = generator.generateIdWithSuffix('_end');
      expect(id).to.match(/^[a-zA-Z0-9]+_end$/);
    });

    it('should generate different IDs with same suffix', () => {
      const id1 = generator.generateIdWithSuffix('_end');
      const id2 = generator.generateIdWithSuffix('_end');
      
      expect(id1).to.not.equal(id2);
      expect(id1).to.match(/^[a-zA-Z0-9]+_end$/);
      expect(id2).to.match(/^[a-zA-Z0-9]+_end$/);
    });

    it('should generate deterministic IDs with suffix', () => {
      const gen1 = new DeterministicIdGenerator('test-seed');
      const gen2 = new DeterministicIdGenerator('test-seed');
      
      const id1 = gen1.generateIdWithSuffix('_end');
      const id2 = gen2.generateIdWithSuffix('_end');
      
      expect(id1).to.equal(id2);
    });

    it('should handle empty suffix', () => {
      const id = generator.generateIdWithSuffix('');
      expect(id).to.match(/^[a-zA-Z0-9]+$/);
    });
  });

  describe('generateIdWithPrefixAndSuffix', () => {
    it('should generate IDs with both prefix and suffix', () => {
      const id = generator.generateIdWithPrefixAndSuffix('user_', '_end');
      expect(id).to.match(/^user_[a-zA-Z0-9]+_end$/);
    });

    it('should generate different IDs with same prefix and suffix', () => {
      const id1 = generator.generateIdWithPrefixAndSuffix('user_', '_end');
      const id2 = generator.generateIdWithPrefixAndSuffix('user_', '_end');
      
      expect(id1).to.not.equal(id2);
      expect(id1).to.match(/^user_[a-zA-Z0-9]+_end$/);
      expect(id2).to.match(/^user_[a-zA-Z0-9]+_end$/);
    });

    it('should generate deterministic IDs with prefix and suffix', () => {
      const gen1 = new DeterministicIdGenerator('test-seed');
      const gen2 = new DeterministicIdGenerator('test-seed');
      
      const id1 = gen1.generateIdWithPrefixAndSuffix('user_', '_end');
      const id2 = gen2.generateIdWithPrefixAndSuffix('user_', '_end');
      
      expect(id1).to.equal(id2);
    });
  });

  describe('reset', () => {
    it('should reset counter to zero', () => {
      generator.generateId();
      generator.generateId();
      expect(generator.counter).to.equal(2);
      
      generator.reset();
      expect(generator.counter).to.equal(0);
    });

    it('should generate same IDs after reset', () => {
      const id1 = generator.generateId();
      generator.reset();
      const id2 = generator.generateId();
      
      expect(id1).to.equal(id2);
    });
  });

  describe('setCounter', () => {
    it('should set counter to specific value', () => {
      generator.setCounter(5);
      expect(generator.counter).to.equal(5);
    });

    it('should generate IDs from new counter position', () => {
      generator.setCounter(10);
      const id = generator.generateId();
      expect(generator.counter).to.equal(11);
    });

    it('should handle negative counter', () => {
      generator.setCounter(-1);
      expect(generator.counter).to.equal(-1);
    });
  });

  describe('getCounter', () => {
    it('should return current counter value', () => {
      expect(generator.getCounter()).to.equal(0);
      
      generator.generateId();
      expect(generator.getCounter()).to.equal(1);
    });
  });

  describe('setSeed', () => {
    it('should change seed', () => {
      generator.setSeed('new-seed');
      expect(generator.seed).to.equal('new-seed');
    });

    it('should generate different IDs with new seed', () => {
      const id1 = generator.generateId();
      generator.setSeed('new-seed');
      const id2 = generator.generateId();
      
      expect(id1).to.not.equal(id2);
    });
  });

  describe('getSeed', () => {
    it('should return current seed', () => {
      expect(generator.getSeed()).to.equal('test-seed');
      
      generator.setSeed('new-seed');
      expect(generator.getSeed()).to.equal('new-seed');
    });
  });

  describe('clone', () => {
    it('should create identical generator', () => {
      generator.generateId();
      generator.generateId();
      
      const clone = generator.clone();
      
      expect(clone.seed).to.equal(generator.seed);
      expect(clone.counter).to.equal(generator.counter);
    });

    it('should generate same IDs as original', () => {
      generator.generateId();
      generator.generateId();
      
      const clone = generator.clone();
      
      const originalId = generator.generateId();
      const cloneId = clone.generateId();
      
      expect(originalId).to.equal(cloneId);
    });

    it('should be independent after cloning', () => {
      const clone = generator.clone();
      
      generator.generateId();
      clone.generateId();
      
      expect(generator.counter).to.equal(1);
      expect(clone.counter).to.equal(1);
    });
  });

  describe('Determinism', () => {
    it('should produce identical sequences with same seed', () => {
      const gen1 = new DeterministicIdGenerator('test-seed');
      const gen2 = new DeterministicIdGenerator('test-seed');
      
      const ids1 = [];
      const ids2 = [];
      
      for (let i = 0; i < 10; i++) {
        ids1.push(gen1.generateId());
        ids2.push(gen2.generateId());
      }
      
      expect(ids1).to.deep.equal(ids2);
    });

    it('should produce different sequences with different seeds', () => {
      const gen1 = new DeterministicIdGenerator('seed1');
      const gen2 = new DeterministicIdGenerator('seed2');
      
      const ids1 = [];
      const ids2 = [];
      
      for (let i = 0; i < 10; i++) {
        ids1.push(gen1.generateId());
        ids2.push(gen2.generateId());
      }
      
      expect(ids1).to.not.deep.equal(ids2);
    });

    it('should maintain determinism across different operations', () => {
      const gen1 = new DeterministicIdGenerator('test-seed');
      const gen2 = new DeterministicIdGenerator('test-seed');
      
      const operations1 = [];
      const operations2 = [];
      
      for (let i = 0; i < 5; i++) {
        operations1.push(gen1.generateId());
        operations1.push(gen1.generateIdWithPrefix('user_'));
        operations1.push(gen1.generateIdWithSuffix('_end'));
        
        operations2.push(gen2.generateId());
        operations2.push(gen2.generateIdWithPrefix('user_'));
        operations2.push(gen2.generateIdWithSuffix('_end'));
      }
      
      expect(operations1).to.deep.equal(operations2);
    });
  });

  describe('Performance', () => {
    it('should generate IDs efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        generator.generateId();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 10,000 ID generations in less than 100ms
      expect(duration).to.be.lessThan(100);
    });

    it('should handle large counter values efficiently', () => {
      generator.setCounter(1000000);
      
      const startTime = performance.now();
      const id = generator.generateId();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      // Should complete ID generation in less than 1ms
      expect(duration).to.be.lessThan(1);
      expect(id).to.be.a('string');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty seed', () => {
      const gen = new DeterministicIdGenerator('');
      const id = gen.generateId();
      expect(id).to.be.a('string');
    });

    it('should handle very long seed', () => {
      const longSeed = 'a'.repeat(1000);
      const gen = new DeterministicIdGenerator(longSeed);
      const id = gen.generateId();
      expect(id).to.be.a('string');
    });

    it('should handle special characters in seed', () => {
      const specialSeed = '!@#$%^&*()';
      const gen = new DeterministicIdGenerator(specialSeed);
      const id = gen.generateId();
      expect(id).to.be.a('string');
    });

    it('should handle unicode characters in seed', () => {
      const unicodeSeed = '你好世界';
      const gen = new DeterministicIdGenerator(unicodeSeed);
      const id = gen.generateId();
      expect(id).to.be.a('string');
    });

    it('should handle very large counter values', () => {
      generator.setCounter(Number.MAX_SAFE_INTEGER);
      const id = generator.generateId();
      expect(id).to.be.a('string');
    });

    it('should handle zero length IDs', () => {
      const id = generator.generateId(0);
      expect(id).to.equal('');
    });

    it('should handle very long IDs', () => {
      const id = generator.generateId(1000);
      expect(id).to.have.lengthOf(1000);
    });
  });

  describe('Uniqueness', () => {
    it('should generate unique IDs in sequence', () => {
      const ids = new Set();
      
      for (let i = 0; i < 1000; i++) {
        const id = generator.generateId();
        expect(ids.has(id)).to.be.false;
        ids.add(id);
      }
    });

    it('should generate unique IDs with different prefixes', () => {
      const ids = new Set();
      
      for (let i = 0; i < 100; i++) {
        const id1 = generator.generateIdWithPrefix('user_');
        const id2 = generator.generateIdWithPrefix('item_');
        
        expect(ids.has(id1)).to.be.false;
        expect(ids.has(id2)).to.be.false;
        
        ids.add(id1);
        ids.add(id2);
      }
    });
  });
});
