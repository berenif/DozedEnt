import { expect } from 'chai';
import { inputValidator } from '../../public/src/utils/input-validator.js';

describe('InputValidator suspicious pattern detection', () => {
  it('should consistently detect directory traversal attempts', () => {
    expect(inputValidator.containsSuspiciousPattern('../')).to.be.true;
    expect(inputValidator.containsSuspiciousPattern('../')).to.be.true;
    expect(inputValidator.containsSuspiciousPattern('../')).to.be.true;
  });
});
