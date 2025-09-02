import { expect } from 'chai';
import {
  OFFER_POOL_SIZE,
  ANNOUNCE_INTERVAL_MS,
  OFFER_TTL_MS,
  ICE_TIMEOUT_MS,
  DATA_BUFFERED_LOW_THRESHOLD
} from '../../src/constants.js';

describe('Constants Module', () => {
  it('should export OFFER_POOL_SIZE with correct value', () => {
    expect(OFFER_POOL_SIZE).to.be.a('number');
    expect(OFFER_POOL_SIZE).to.equal(20);
    expect(OFFER_POOL_SIZE).to.be.greaterThan(0);
  });

  it('should export ANNOUNCE_INTERVAL_MS with correct value', () => {
    expect(ANNOUNCE_INTERVAL_MS).to.be.a('number');
    expect(ANNOUNCE_INTERVAL_MS).to.equal(5333);
    expect(ANNOUNCE_INTERVAL_MS).to.be.greaterThan(0);
  });

  it('should export OFFER_TTL_MS with correct value', () => {
    expect(OFFER_TTL_MS).to.be.a('number');
    expect(OFFER_TTL_MS).to.equal(57333);
    expect(OFFER_TTL_MS).to.be.greaterThan(0);
    expect(OFFER_TTL_MS).to.be.greaterThan(ANNOUNCE_INTERVAL_MS);
  });

  it('should export ICE_TIMEOUT_MS with correct value', () => {
    expect(ICE_TIMEOUT_MS).to.be.a('number');
    expect(ICE_TIMEOUT_MS).to.equal(5000);
    expect(ICE_TIMEOUT_MS).to.be.greaterThan(0);
  });

  it('should export DATA_BUFFERED_LOW_THRESHOLD with correct value', () => {
    expect(DATA_BUFFERED_LOW_THRESHOLD).to.be.a('number');
    expect(DATA_BUFFERED_LOW_THRESHOLD).to.equal(0xffff);
    expect(DATA_BUFFERED_LOW_THRESHOLD).to.equal(65535);
    expect(DATA_BUFFERED_LOW_THRESHOLD).to.be.greaterThan(0);
  });

  it('should have consistent timing relationships', () => {
    // OFFER_TTL_MS should be significantly longer than ANNOUNCE_INTERVAL_MS
    expect(OFFER_TTL_MS).to.be.greaterThan(ANNOUNCE_INTERVAL_MS * 5);
    
    // ICE_TIMEOUT_MS should be reasonable for network operations
    expect(ICE_TIMEOUT_MS).to.be.at.least(1000);
    expect(ICE_TIMEOUT_MS).to.be.at.most(30000);
  });

  it('should have valid buffer threshold', () => {
    // DATA_BUFFERED_LOW_THRESHOLD should be within uint16 range
    expect(DATA_BUFFERED_LOW_THRESHOLD).to.be.at.least(0);
    expect(DATA_BUFFERED_LOW_THRESHOLD).to.be.at.most(0xffff);
  });
});