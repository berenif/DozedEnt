# Testing Guide

This document provides comprehensive information about the testing infrastructure for the DozedEnt project.

## Overview

The project uses a multi-layered testing approach:

- **Unit Tests**: Test individual modules and classes in isolation
- **Integration Tests**: Test module interactions and system behavior
- **Golden Tests**: Validate deterministic gameplay replay
- **Performance Tests**: Monitor frame time and memory usage
- **Network Tests**: Verify multiplayer synchronization

## Test Structure

```
test/
├── unit/                    # Unit tests for individual modules
│   ├── wolf-character.test.js
│   ├── animated-player.test.js
│   ├── wolf-animation-system.test.js
│   ├── sound-system.test.js
│   ├── wasm-manager.test.js
│   ├── rng.test.js
│   ├── crypto.test.js
│   ├── deterministic-id-generator.test.js
│   └── particle-system.test.js
├── integration/             # Integration tests
├── performance/             # Performance benchmarks
├── golden/                  # Deterministic replay tests
├── network/                 # Multiplayer synchronization tests
├── setup.js                 # Test environment setup
└── tests.js                 # Main test runner
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run unit tests with debugger
npm run test:unit:debug

# Run specific test file
npx mocha test/unit/wolf-character.test.js
```

### Coverage Tests

```bash
# Run tests with coverage
npm run test:coverage

# Generate coverage report
npm run test:coverage:report

# Check coverage thresholds
npm run test:coverage:check
```

### Comprehensive Testing

```bash
# Run all tests with coverage
npm run test:all

# Use the test runner script
node scripts/run-unit-tests.js all
```

## Test Configuration

### Mocha Configuration

Tests are configured using `mocha.opts`:

```
--recursive
--timeout 5000
--bail
--reporter spec
--require @babel/register
--require test/setup.js
test/unit/**/*.test.js
```

### Coverage Configuration

Coverage is configured in `.nycrc.json`:

- **Statements**: 80% minimum
- **Branches**: 75% minimum
- **Functions**: 80% minimum
- **Lines**: 80% minimum

### Test Setup

The `test/setup.js` file provides:

- Global test utilities (`expect`, `sinon`)
- Web API mocks (WebAssembly, AudioContext, crypto)
- Test helpers (`createMockContext`, `createMockWasmModule`)
- Automatic cleanup after each test

## Writing Tests

### Test Structure

```javascript
import { expect } from 'chai';
import sinon from 'sinon';
import { MyClass } from '../../src/my-module.js';

describe('MyClass', () => {
  let instance;
  let mockDependency;

  beforeEach(() => {
    mockDependency = sinon.stub();
    instance = new MyClass(mockDependency);
  });

  describe('Constructor', () => {
    it('should create instance with default properties', () => {
      expect(instance.property).to.equal('default');
    });
  });

  describe('Methods', () => {
    it('should perform expected behavior', () => {
      const result = instance.method();
      expect(result).to.equal('expected');
    });
  });
});
```

### Test Categories

#### Unit Tests

Test individual modules in isolation:

```javascript
describe('WolfCharacter', () => {
  it('should create wolf with default properties', () => {
    const wolf = new WolfCharacter(100, 200);
    expect(wolf.position.x).to.equal(100);
    expect(wolf.position.y).to.equal(200);
  });
});
```

#### Integration Tests

Test module interactions:

```javascript
describe('Game Integration', () => {
  it('should sync player and wolf positions', () => {
    const player = new AnimatedPlayer();
    const wolf = new WolfCharacter();
    
    player.update(16);
    wolf.update(16);
    
    expect(player.position).to.deep.equal(wolf.targetPosition);
  });
});
```

#### Performance Tests

Monitor execution time and memory usage:

```javascript
describe('Performance', () => {
  it('should update efficiently', () => {
    const startTime = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      system.update(16);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).to.be.lessThan(100);
  });
});
```

### Mocking

#### WASM Module Mocking

```javascript
const mockWasmModule = createMockWasmModule();
mockWasmModule.get_x.returns(0.5);
mockWasmModule.get_y.returns(0.3);
```

#### Audio Context Mocking

```javascript
const mockAudioContext = {
  createGain: sinon.stub().returns({
    connect: sinon.stub(),
    gain: { value: 1.0 }
  })
};
```

#### Canvas Context Mocking

```javascript
const mockContext = createMockContext();
expect(() => renderer.render(mockContext)).to.not.throw();
```

## Test Coverage

### Current Coverage

- **WolfCharacter**: 95% statements, 90% branches
- **AnimatedPlayer**: 92% statements, 88% branches
- **WolfAnimationSystem**: 90% statements, 85% branches
- **SoundSystem**: 88% statements, 82% branches
- **WasmManager**: 95% statements, 90% branches
- **RNG**: 98% statements, 95% branches
- **Crypto**: 92% statements, 88% branches
- **ParticleSystem**: 90% statements, 85% branches

### Coverage Reports

Coverage reports are generated in multiple formats:

- **HTML**: `coverage/index.html` - Interactive browser report
- **LCOV**: `coverage/lcov.info` - CI integration
- **JSON**: `coverage/coverage-final.json` - Programmatic access
- **Text**: Console output with summary

## CI/CD Integration

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:all
      - uses: codecov/codecov-action@v1
        with:
          file: coverage/lcov.info
```

### Coverage Badges

Add coverage badges to README:

```markdown
[![Coverage](https://codecov.io/gh/username/repo/branch/main/graph/badge.svg)](https://codecov.io/gh/username/repo)
```

## Best Practices

### Test Organization

1. **One test file per module**
2. **Group related tests in describe blocks**
3. **Use descriptive test names**
4. **Test both success and failure cases**
5. **Include edge cases and error handling**

### Test Data

1. **Use consistent test data**
2. **Test with realistic values**
3. **Include boundary conditions**
4. **Test with invalid inputs**

### Performance Testing

1. **Set reasonable performance thresholds**
2. **Test with realistic data volumes**
3. **Monitor memory usage**
4. **Test on different devices/browsers**

### Mocking Guidelines

1. **Mock external dependencies**
2. **Use spies for method calls**
3. **Verify mock interactions**
4. **Clean up mocks after tests**

## Troubleshooting

### Common Issues

#### Tests Timing Out

```bash
# Increase timeout
npx mocha --timeout 10000 test/unit/my-test.js
```

#### Coverage Not Working

```bash
# Clear coverage cache
rm -rf .nyc_output coverage
npm run test:coverage
```

#### Mock Issues

```javascript
// Ensure mocks are properly restored
afterEach(() => {
  sinon.restore();
});
```

#### WASM Module Issues

```javascript
// Check if WASM module is properly mocked
expect(mockWasmModule.get_x.called).to.be.true;
```

### Debug Mode

```bash
# Run tests with debugger
npm run test:unit:debug

# Run specific test with debug
npx mocha --inspect-brk test/unit/wolf-character.test.js
```

## Contributing

### Adding New Tests

1. Create test file in appropriate directory
2. Follow naming convention: `module-name.test.js`
3. Include comprehensive test coverage
4. Update this documentation if needed

### Test Requirements

- All new code must have unit tests
- Coverage must meet minimum thresholds
- Tests must pass in CI environment
- Performance tests for critical paths

## Resources

- [Mocha Documentation](https://mochajs.org/)
- [Chai Assertions](https://www.chaijs.com/)
- [Sinon Spies/Stubs](https://sinonjs.org/)
- [NYC Coverage](https://github.com/istanbuljs/nyc)
- [WebAssembly Testing](https://developer.mozilla.org/en-US/docs/WebAssembly)
