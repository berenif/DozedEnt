import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const publicDir = rootDir; // Deploy to root instead of public folder
const demoDir = path.join(rootDir, 'demo');
const distDir = path.join(rootDir, 'dist');

describe('GitHub Pages Deployment', () => {
  describe('Build Scripts', () => {

    it('should have all prerequisite build scripts', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
      const requiredScripts = ['build', 'build:animations', 'build:wolf'];
      
      requiredScripts.forEach(script => {
        expect(packageJson.scripts, 
          `Missing required build script: ${script}`).to.have.property(script);
      });
    });
  });

  describe('Root Deployment Structure', () => {
    before(function() {
      // Skip if root directory doesn't exist yet
      if (!fs.existsSync(publicDir)) {
        this.skip();
      }
    });

    it('should have root directory', () => {
      expect(fs.existsSync(publicDir), 'root directory is missing').to.be.true;
    });

    it('should have index.html in root', () => {
      const indexPath = path.join(publicDir, 'index.html');
      expect(fs.existsSync(indexPath), 'index.html is missing').to.be.true;
    });

    it('should have .nojekyll file for GitHub Pages', () => {
      const nojekyllPath = path.join(publicDir, '.nojekyll');
      expect(fs.existsSync(nojekyllPath), '.nojekyll file is missing in root folder').to.be.true;
    });

    it('should have dist folder with built assets in root', () => {
      const publicDistPath = path.join(publicDir, 'dist');
      expect(fs.existsSync(publicDistPath), 'dist folder is missing in root').to.be.true;
    });

    it('should have essential project files in root', () => {
      const essentialFiles = [
        'game.wasm',
        'API.md',
        'GETTING_STARTED.md'
      ];

      essentialFiles.forEach(file => {
        const filePath = path.join(publicDir, file);
        expect(fs.existsSync(filePath), 
          `Essential project file missing: ${file}`).to.be.true;
      });
    });

  });

  describe('Build Output Validation', () => {
    before(function() {
      // Skip if dist folder doesn't exist yet
      if (!fs.existsSync(distDir)) {
        this.skip();
      }
    });

    it('should generate minified JavaScript bundles', () => {
      const expectedBundles = [
        'trystero-firebase.min.js',
        'trystero-ipfs.min.js',
        'trystero-mqtt.min.js',
        'trystero-supabase.min.js',
        'trystero-torrent.min.js',
        'trystero-wasm.min.js'
      ];

      expectedBundles.forEach(bundle => {
        const bundlePath = path.join(distDir, bundle);
        expect(fs.existsSync(bundlePath), 
          `Missing bundle: ${bundle}`).to.be.true;
      });
    });

    it('should generate animation bundles', () => {
      const animationBundles = [
        'player-animator.js',
        'player-animator.min.js',
        'player-animator.umd.js'
      ];

      animationBundles.forEach(bundle => {
        const bundlePath = path.join(distDir, bundle);
        expect(fs.existsSync(bundlePath), 
          `Missing animation bundle: ${bundle}`).to.be.true;
      });
    });

    it('should generate wolf animation bundles', () => {
      const wolfBundles = [
        'wolf-animation.js',
        'wolf-animation.min.js',
        'wolf-animation.umd.js'
      ];

      wolfBundles.forEach(bundle => {
        const bundlePath = path.join(distDir, bundle);
        expect(fs.existsSync(bundlePath), 
          `Missing wolf bundle: ${bundle}`).to.be.true;
      });
    });
  });

  describe('HTML Content Validation', () => {
    before(function() {
      // Skip if public folder doesn't exist yet
      if (!fs.existsSync(publicDir)) {
        this.skip();
      }
    });

    it('should have valid HTML structure in index.html', () => {
      const indexPath = path.join(publicDir, 'index.html');
      if (!fs.existsSync(indexPath)) {
        return;
      }

      const content = fs.readFileSync(indexPath, 'utf8');
      
      // Check for essential HTML elements
      expect(content).to.include('<!DOCTYPE html>');
      expect(content).to.include('<html');
      expect(content).to.include('<head>');
      expect(content).to.include('<title>');
      expect(content).to.include('<body>');
      expect(content).to.include('</html>');
    });

    it('should have game links in index.html', () => {
      const indexPath = path.join(publicDir, 'index.html');
      if (!fs.existsSync(indexPath)) {
        return;
      }

      const content = fs.readFileSync(indexPath, 'utf8');
      
      // Check for game links
      expect(content).to.include('complete-game.html');
      expect(content).to.include('room-demo.html');
    });

    it('should not have localhost references in production files', () => {
      const indexPath = path.join(publicDir, 'index.html');
      if (!fs.existsSync(indexPath)) {
        return;
      }

      const content = fs.readFileSync(indexPath, 'utf8');
      
      // Check that there are no localhost references
      expect(content).to.not.include('localhost:8080');
      expect(content).to.not.include('localhost:3000');
      expect(content).to.not.include('127.0.0.1');
    });
  });

  describe('Dependencies Check', () => {
    it('should have all required dependencies installed', () => {
      const nodeModulesPath = path.join(rootDir, 'node_modules');
      expect(fs.existsSync(nodeModulesPath), 
        'node_modules folder is missing - run npm install').to.be.true;
    });

    it('should have package-lock.json', () => {
      const lockPath = path.join(rootDir, 'package-lock.json');
      expect(fs.existsSync(lockPath), 
        'package-lock.json is missing').to.be.true;
    });
  });

  describe('Build Process Integration', () => {
    it('should successfully run build:public command', function() {
      this.timeout(30000); // Allow 30 seconds for build
      
      try {
        // Check if dependencies are installed first
        if (!fs.existsSync(path.join(rootDir, 'node_modules'))) {
          console.log('Installing dependencies...');
          execSync('npm install', { cwd: rootDir, stdio: 'pipe' });
        }

        // Run the build:public command
        const output = execSync('npm run build:public', { 
          cwd: rootDir, 
          encoding: 'utf8',
          stdio: 'pipe'
        });

        // Check that build completed without errors
        expect(output).to.not.include('ERROR');
        expect(output).to.not.include('FAILED');
        
        // Verify public folder was created/updated
        expect(fs.existsSync(publicDir)).to.be.true;
        
        // Verify critical files exist after build
        const criticalFiles = [
          path.join(publicDir, 'dist'),
          path.join(publicDir, 'wolf-animation.js'),
          path.join(publicDir, 'wolf-character.js')
        ];

        criticalFiles.forEach(file => {
          expect(fs.existsSync(file), 
            `Build did not create: ${path.basename(file)}`).to.be.true;
        });
      } catch (error) {
        // If build fails, provide helpful error message
        throw new Error(`Build:public command failed: ${error.message}`);
      }
    });
  });

  describe('GitHub Actions Configuration', () => {
    it('should have GitHub Actions workflow for deployment', () => {
      const workflowPath = path.join(rootDir, '.github', 'workflows', 'deploy.yml');
      // This is optional but recommended
      if (fs.existsSync(workflowPath)) {
        const content = fs.readFileSync(workflowPath, 'utf8');
        expect(content).to.include('github-pages');
      }
    });
  });
});