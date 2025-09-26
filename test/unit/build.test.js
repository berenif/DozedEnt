import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const distDir = path.join(rootDir, 'dist');

describe('Build System', () => {
  describe('Dependencies', () => {
    it('should have rollup installed', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
      expect(packageJson.devDependencies).to.have.property('rollup');
    });

    it('should have all required rollup plugins', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
      const requiredPlugins = [
        '@rollup/plugin-commonjs',
        '@rollup/plugin-node-resolve',
        '@rollup/plugin-replace',
        '@rollup/plugin-terser'
      ];
      
      requiredPlugins.forEach(plugin => {
        expect(packageJson.devDependencies, 
          `Missing required rollup plugin: ${plugin}`).to.have.property(plugin);
      });
    });

    it('should have node_modules directory with rollup', () => {
      const rollupPath = path.join(rootDir, 'node_modules', 'rollup');
      expect(fs.existsSync(rollupPath)).to.be.true;
    });
  });

  describe('Build Configuration', () => {
    it('should have rollup.config.js file', () => {
      const configPath = path.join(rootDir, 'rollup.config.js');
      expect(fs.existsSync(configPath)).to.be.true;
    });

    it('should have rollup.config.animations.js file', () => {
      const configPath = path.join(rootDir, 'rollup.config.animations.js');
      expect(fs.existsSync(configPath)).to.be.true;
    });

    it('should have rollup.config.wolf.js file', () => {
      const configPath = path.join(rootDir, 'rollup.config.wolf.js');
      expect(fs.existsSync(configPath)).to.be.true;
    });

    it('should have valid build scripts in package.json', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
      expect(packageJson.scripts).to.have.property('build');
      expect(packageJson.scripts).to.have.property('build:animations');
      expect(packageJson.scripts).to.have.property('build:wolf');
      expect(packageJson.scripts).to.have.property('build:all');
    });
  });

  describe('Build Output', () => {
    before(function() {
      // Run build before testing outputs
      // Increase timeout for build process
      this.timeout(120000);
      
      try {
        // Check if dependencies are installed
        if (!fs.existsSync(path.join(rootDir, 'node_modules'))) {
          console.log('Installing dependencies...');
          execSync('npm install', { cwd: rootDir, stdio: 'pipe' });
        }
        
        // Run the build
        console.log('Running build...');
        execSync('npm run build', { cwd: rootDir, stdio: 'pipe' });
      } catch (error) {
        throw new Error(`Build failed: ${error.message}`);
      }
    });

    it('should create dist directory', () => {
      expect(fs.existsSync(distDir)).to.be.true;
    });

    it('should generate firebase bundle', () => {
      const filePath = path.join(distDir, 'core', 'trystero-firebase.min.js');
      expect(fs.existsSync(filePath)).to.be.true;
      
      const stats = fs.statSync(filePath);
      expect(stats.size).to.be.greaterThan(0, 'Firebase bundle should not be empty');
    });

    it('should generate ipfs bundle', () => {
      const filePath = path.join(distDir, 'core', 'trystero-ipfs.min.js');
      expect(fs.existsSync(filePath)).to.be.true;
      
      const stats = fs.statSync(filePath);
      expect(stats.size).to.be.greaterThan(0, 'IPFS bundle should not be empty');
    });

    it('should generate mqtt bundle', () => {
      const filePath = path.join(distDir, 'core', 'trystero-mqtt.min.js');
      expect(fs.existsSync(filePath)).to.be.true;
      
      const stats = fs.statSync(filePath);
      expect(stats.size).to.be.greaterThan(0, 'MQTT bundle should not be empty');
    });


    it('should generate supabase bundle', () => {
      const filePath = path.join(distDir, 'core', 'trystero-supabase.min.js');
      expect(fs.existsSync(filePath)).to.be.true;
      
      const stats = fs.statSync(filePath);
      expect(stats.size).to.be.greaterThan(0, 'Supabase bundle should not be empty');
    });

    it('should generate torrent bundle', () => {
      const filePath = path.join(distDir, 'core', 'trystero-torrent.min.js');
      expect(fs.existsSync(filePath)).to.be.true;
      
      const stats = fs.statSync(filePath);
      expect(stats.size).to.be.greaterThan(0, 'Torrent bundle should not be empty');
    });

    it('should generate wasm bundle', () => {
      const filePath = path.join(distDir, 'core', 'trystero-wasm.min.js');
      expect(fs.existsSync(filePath)).to.be.true;
      
      const stats = fs.statSync(filePath);
      expect(stats.size).to.be.greaterThan(0, 'WASM bundle should not be empty');
    });

    it('should generate minified bundles', () => {
      // Check that bundles are actually minified by checking for typical minification patterns
      const firebaseBundle = fs.readFileSync(path.join(distDir, 'core', 'trystero-firebase.min.js'), 'utf8');
      
      // Minified code typically has very long lines
      const lines = firebaseBundle.split('\n');
      const hasLongLines = lines.some(line => line.length > 500);
      expect(hasLongLines).to.be.true;
      
      // Minified code typically doesn't have many spaces
      const spaceRatio = (firebaseBundle.match(/ {2,}/g) || []).length / firebaseBundle.length;
      expect(spaceRatio).to.be.lessThan(0.01, 'Bundle should be minified with minimal spacing');
    });
  });

  describe('Animation Build Output', () => {
    before(function() {
      // Run animation build
      this.timeout(60000);
      
      try {
        console.log('Running animation build...');
        execSync('npm run build:animations', { cwd: rootDir, stdio: 'pipe' });
      } catch (error) {
        throw new Error(`Animation build failed: ${error.message}`);
      }
    });

    it('should generate player-animator bundles', () => {
      const files = [
        'player-animator.js',
        'player-animator.min.js',
        'player-animator.umd.js'
      ];
      
      files.forEach(file => {
        const filePath = path.join(distDir, 'animations', file);
        expect(fs.existsSync(filePath)).to.be.true;
        
        const stats = fs.statSync(filePath);
        expect(stats.size).to.be.greaterThan(0, `${file} should not be empty`);
      });
    });
  });

  describe('Wolf Build Output', () => {
    before(function() {
      // Run wolf build
      this.timeout(60000);
      
      try {
        console.log('Running wolf build...');
        execSync('npm run build:wolf', { cwd: rootDir, stdio: 'pipe' });
      } catch (error) {
        throw new Error(`Wolf build failed: ${error.message}`);
      }
    });

    it('should generate wolf-animation bundles', () => {
      const files = [
        'wolf-animation.js',
        'wolf-animation.min.js',
        'wolf-animation.umd.js'
      ];
      
      files.forEach(file => {
        const filePath = path.join(distDir, 'animations', file);
        expect(fs.existsSync(filePath)).to.be.true;
        
        const stats = fs.statSync(filePath);
        expect(stats.size).to.be.greaterThan(0, `${file} should not be empty`);
      });
    });
  });

  describe('Build Error Prevention', () => {
    it('should detect missing dependencies before build', () => {
      const checkDependencies = () => {
        const requiredDeps = ['rollup'];
        const missingDeps = [];
        
        requiredDeps.forEach(dep => {
          const depPath = path.join(rootDir, 'node_modules', dep);
          if (!fs.existsSync(depPath)) {
            missingDeps.push(dep);
          }
        });
        
        return missingDeps;
      };
      
      const missing = checkDependencies();
      expect(missing).to.have.lengthOf(0, `Missing dependencies: ${missing.join(', ')}`);
    });

    it('should validate source files exist', () => {
      const sourceFiles = [
        'src/netcode/firebase.js',
        'src/netcode/ipfs.js',
        'src/netcode/mqtt.js',
        'src/netcode/supabase.js',
        'src/netcode/torrent.js',
        'src/utils/wasm.js',
        'src/animation/player/procedural/player-animator.js',
        'src/animation/enemy/wolf-animation.js'
      ];
      
      sourceFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        expect(fs.existsSync(filePath)).to.be.true;
      });
    });

    it('should have proper package.json structure', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
      
      // Check required fields
      expect(packageJson).to.have.property('name');
      expect(packageJson).to.have.property('version');
      expect(packageJson).to.have.property('scripts');
      expect(packageJson).to.have.property('devDependencies');
      
      // Check module type
      expect(packageJson).to.have.property('type', 'module');
      
      // Check exports
      expect(packageJson).to.have.property('exports');
      expect(packageJson.exports).to.have.property('.');
      expect(packageJson.exports).to.have.property('./firebase');
      expect(packageJson.exports).to.have.property('./ipfs');
      expect(packageJson.exports).to.have.property('./mqtt');
      expect(packageJson.exports).to.have.property('./supabase');
      expect(packageJson.exports).to.have.property('./torrent');
      expect(packageJson.exports).to.have.property('./wasm');
    });
  });
});