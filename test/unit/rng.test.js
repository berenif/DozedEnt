import { expect } from 'chai';
import { RNG, seededRandom, randInt, randFloat, randChoice, shuffleArray, weightedChoice } from '../../public/src/utils/rng.js';

describe('RNG (Random Number Generator)', () => {
  describe('RNG Class', () => {
    let rng;

    beforeEach(() => {
      rng = new RNG(12345);
    });

    it('should create RNG with seed', () => {
      expect(rng.seed).to.equal(12345);
      expect(rng.state).to.equal(12345);
    });

    it('should generate deterministic sequence', () => {
      const values1 = [];
      const values2 = [];
      
      // Generate sequence with same seed
      const rng1 = new RNG(12345);
      const rng2 = new RNG(12345);
      
      for (let i = 0; i < 10; i++) {
        values1.push(rng1.next());
        values2.push(rng2.next());
      }
      
      expect(values1).to.deep.equal(values2);
    });

    it('should generate different sequences with different seeds', () => {
      const rng1 = new RNG(12345);
      const rng2 = new RNG(54321);
      
      const value1 = rng1.next();
      const value2 = rng2.next();
      
      expect(value1).to.not.equal(value2);
    });

    it('should generate integers in range', () => {
      const values = [];
      for (let i = 0; i < 100; i++) {
        values.push(rng.nextInt(1, 10));
      }
      
      values.forEach(value => {
        expect(value).to.be.at.least(1);
        expect(value).to.be.at.most(10);
        expect(Number.isInteger(value)).to.be.true;
      });
    });

    it('should generate floats in range', () => {
      const values = [];
      for (let i = 0; i < 100; i++) {
        values.push(rng.nextFloat(0.5, 1.5));
      }
      
      values.forEach(value => {
        expect(value).to.be.at.least(0.5);
        expect(value).to.be.at.most(1.5);
        expect(Number.isFinite(value)).to.be.true;
      });
    });

    it('should generate boolean values', () => {
      const values = [];
      for (let i = 0; i < 100; i++) {
        values.push(rng.nextBoolean());
      }
      
      values.forEach(value => {
        expect(typeof value).to.equal('boolean');
      });
    });

    it('should choose random element from array', () => {
      const array = [1, 2, 3, 4, 5];
      const values = [];
      
      for (let i = 0; i < 100; i++) {
        values.push(rng.choice(array));
      }
      
      values.forEach(value => {
        expect(array).to.include(value);
      });
    });

    it('should shuffle array', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = rng.shuffle([...original]);
      
      expect(shuffled).to.have.lengthOf(original.length);
      expect(shuffled.sort()).to.deep.equal(original.sort());
    });

    it('should generate weighted choices', () => {
      const items = ['a', 'b', 'c'];
      const weights = [1, 2, 3];
      
      const values = [];
      for (let i = 0; i < 100; i++) {
        values.push(rng.weightedChoice(items, weights));
      }
      
      values.forEach(value => {
        expect(items).to.include(value);
      });
    });

    it('should reset to initial state', () => {
      const firstValue = rng.next();
      rng.next();
      rng.next();
      
      rng.reset();
      const resetValue = rng.next();
      
      expect(resetValue).to.equal(firstValue);
    });

    it('should set new seed', () => {
      const originalValue = rng.next();
      rng.setSeed(54321);
      const newValue = rng.next();
      
      expect(newValue).to.not.equal(originalValue);
    });
  });

  describe('seededRandom function', () => {
    it('should generate deterministic random number', () => {
      const value1 = seededRandom(12345);
      const value2 = seededRandom(12345);
      
      expect(value1).to.equal(value2);
    });

    it('should generate different numbers with different seeds', () => {
      const value1 = seededRandom(12345);
      const value2 = seededRandom(54321);
      
      expect(value1).to.not.equal(value2);
    });

    it('should generate numbers in range [0, 1)', () => {
      for (let i = 0; i < 100; i++) {
        const value = seededRandom(i);
        expect(value).to.be.at.least(0);
        expect(value).to.be.below(1);
      }
    });
  });

  describe('randInt function', () => {
    it('should generate integer in range', () => {
      const values = [];
      for (let i = 0; i < 100; i++) {
        values.push(randInt(1, 10));
      }
      
      values.forEach(value => {
        expect(value).to.be.at.least(1);
        expect(value).to.be.at.most(10);
        expect(Number.isInteger(value)).to.be.true;
      });
    });

    it('should handle single value range', () => {
      const value = randInt(5, 5);
      expect(value).to.equal(5);
    });

    it('should handle negative ranges', () => {
      const value = randInt(-10, -5);
      expect(value).to.be.at.least(-10);
      expect(value).to.be.at.most(-5);
      expect(Number.isInteger(value)).to.be.true;
    });
  });

  describe('randFloat function', () => {
    it('should generate float in range', () => {
      const values = [];
      for (let i = 0; i < 100; i++) {
        values.push(randFloat(0.5, 1.5));
      }
      
      values.forEach(value => {
        expect(value).to.be.at.least(0.5);
        expect(value).to.be.at.most(1.5);
        expect(Number.isFinite(value)).to.be.true;
      });
    });

    it('should handle single value range', () => {
      const value = randFloat(1.5, 1.5);
      expect(value).to.equal(1.5);
    });

    it('should handle negative ranges', () => {
      const value = randFloat(-1.5, -0.5);
      expect(value).to.be.at.least(-1.5);
      expect(value).to.be.at.most(-0.5);
      expect(Number.isFinite(value)).to.be.true;
    });
  });

  describe('randChoice function', () => {
    it('should choose random element from array', () => {
      const array = [1, 2, 3, 4, 5];
      const values = [];
      
      for (let i = 0; i < 100; i++) {
        values.push(randChoice(array));
      }
      
      values.forEach(value => {
        expect(array).to.include(value);
      });
    });

    it('should handle single element array', () => {
      const array = [42];
      const value = randChoice(array);
      expect(value).to.equal(42);
    });

    it('should handle empty array', () => {
      const array = [];
      expect(() => randChoice(array)).to.throw('Cannot choose from empty array');
    });
  });

  describe('shuffleArray function', () => {
    it('should shuffle array without modifying original', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(original);
      
      expect(shuffled).to.not.equal(original);
      expect(shuffled).to.have.lengthOf(original.length);
      expect(shuffled.sort()).to.deep.equal(original.sort());
    });

    it('should handle single element array', () => {
      const array = [42];
      const shuffled = shuffleArray(array);
      expect(shuffled).to.deep.equal(array);
    });

    it('should handle empty array', () => {
      const array = [];
      const shuffled = shuffleArray(array);
      expect(shuffled).to.deep.equal(array);
    });
  });

  describe('weightedChoice function', () => {
    it('should make weighted choices', () => {
      const items = ['a', 'b', 'c'];
      const weights = [1, 2, 3];
      
      const values = [];
      for (let i = 0; i < 100; i++) {
        values.push(weightedChoice(items, weights));
      }
      
      values.forEach(value => {
        expect(items).to.include(value);
      });
    });

    it('should handle single item', () => {
      const items = ['a'];
      const weights = [1];
      const value = weightedChoice(items, weights);
      expect(value).to.equal('a');
    });

    it('should handle mismatched arrays', () => {
      const items = ['a', 'b'];
      const weights = [1];
      expect(() => weightedChoice(items, weights)).to.throw('Items and weights arrays must have same length');
    });

    it('should handle empty arrays', () => {
      const items = [];
      const weights = [];
      expect(() => weightedChoice(items, weights)).to.throw('Cannot choose from empty array');
    });

    it('should handle zero weights', () => {
      const items = ['a', 'b'];
      const weights = [0, 0];
      expect(() => weightedChoice(items, weights)).to.throw('Total weight must be greater than 0');
    });
  });

  describe('Determinism', () => {
    it('should produce identical sequences with same seed', () => {
      const rng1 = new RNG(12345);
      const rng2 = new RNG(12345);
      
      for (let i = 0; i < 100; i++) {
        expect(rng1.next()).to.equal(rng2.next());
      }
    });

    it('should produce different sequences with different seeds', () => {
      const rng1 = new RNG(12345);
      const rng2 = new RNG(54321);
      
      const values1 = [];
      const values2 = [];
      
      for (let i = 0; i < 100; i++) {
        values1.push(rng1.next());
        values2.push(rng2.next());
      }
      
      expect(values1).to.not.deep.equal(values2);
    });

    it('should maintain determinism across different operations', () => {
      const rng1 = new RNG(12345);
      const rng2 = new RNG(12345);
      
      const operations1 = [];
      const operations2 = [];
      
      for (let i = 0; i < 10; i++) {
        operations1.push(rng1.nextInt(1, 10));
        operations1.push(rng1.nextFloat(0, 1));
        operations1.push(rng1.nextBoolean());
        
        operations2.push(rng2.nextInt(1, 10));
        operations2.push(rng2.nextFloat(0, 1));
        operations2.push(rng2.nextBoolean());
      }
      
      expect(operations1).to.deep.equal(operations2);
    });
  });

  describe('Performance', () => {
    it('should generate numbers efficiently', () => {
      const rng = new RNG(12345);
      const startTime = performance.now();
      
      for (let i = 0; i < 100000; i++) {
        rng.next();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 100,000 operations in less than 100ms
      expect(duration).to.be.lessThan(100);
    });

    it('should handle large ranges efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        randInt(0, 1000000);
        randFloat(0, 1000000);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 20,000 operations in less than 50ms
      expect(duration).to.be.lessThan(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero seed', () => {
      const rng = new RNG(0);
      expect(rng.seed).to.equal(0);
      expect(rng.state).to.equal(0);
      
      const value = rng.next();
      expect(typeof value).to.equal('number');
    });

    it('should handle large seeds', () => {
      const rng = new RNG(0xFFFFFFFF);
      expect(rng.seed).to.equal(0xFFFFFFFF);
      
      const value = rng.next();
      expect(typeof value).to.equal('number');
    });

    it('should handle negative seeds', () => {
      const rng = new RNG(-12345);
      expect(rng.seed).to.equal(-12345);
      
      const value = rng.next();
      expect(typeof value).to.equal('number');
    });

    it('should handle very small ranges', () => {
      const value = randFloat(0.5, 0.5001);
      expect(value).to.be.at.least(0.5);
      expect(value).to.be.at.most(0.5001);
    });

    it('should handle very large ranges', () => {
      const value = randInt(0, 1000000);
      expect(value).to.be.at.least(0);
      expect(value).to.be.at.most(1000000);
    });
  });
});
