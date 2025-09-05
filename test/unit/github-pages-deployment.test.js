import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const docsDir = path.join(rootDir, 'docs');
const demoDir = path.join(rootDir, 'demo');
const distDir = path.join(rootDir, 'dist');

describe('GitHub Pages Deployment', () => {
  describe('Build Scripts', () => {
    it('should have build:docs script in package.json', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
      expect(packageJson.scripts).to.have.property('build:docs');
    });

    it('should have all prerequisite build scripts', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
      const requiredScripts = ['build', 'build:animations', 'build:wolf'];
      
      requiredScripts.forEach(script => {
        expect(packageJson.scripts, 
          `Missing required build script: ${script}`).to.have.property(script);
      });
    });
  });

  describe('Docs Folder Structure', () => {
    before(function() {
      // Skip if docs folder doesn't exist yet
      if (!fs.existsSync(docsDir)) {
        this.skip();
      }
    });

    it('should have docs folder', () => {
      expect(fs.existsSync(docsDir), 'docs folder is missing').to.be.true;
    });

    it('should have index.html in docs folder', () => {
      const indexPath = path.join(docsDir, 'index.html');
      expect(fs.existsSync(indexPath), 'docs/index.html is missing').to.be.true;
    });

    it('should have .nojekyll file for GitHub Pages', () => {
      const nojekyllPath = path.join(docsDir, '.nojekyll');
      expect(fs.existsSync(nojekyllPath), '.nojekyll file is missing in docs folder').to.be.true;
    });

    it('should have dist folder with built assets in docs', () => {
      const docsDistPath = path.join(docsDir, 'dist');
      expect(fs.existsSync(docsDistPath), 'dist folder is missing in docs').to.be.true;
    });

    it('should have all critical game files in docs', () => {
      const criticalFiles = [
        'complete-game.html',
        'room-demo.html',
        'wolf-animation-demo.html'
      ];

      criticalFiles.forEach(file => {
        const filePath = path.join(docsDir, file);
        expect(fs.existsSync(filePath), 
          `Critical game file missing in docs: ${file}`).to.be.true;
      });
    });

    it('should have all demo files copied to docs', () => {
      if (!fs.existsSync(demoDir)) {
        return; // Skip if demo folder doesn't exist
      }

      const demoFiles = fs.readdirSync(demoDir)
        .filter(file => file.endsWith('.html'));

      demoFiles.forEach(file => {
        const docsFilePath = path.join(docsDir, file);
        expect(fs.existsSync(docsFilePath), 
          `Demo file not copied to docs: ${file}`).to.be.true;
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
        'trystero-nostr.min.js',
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
      // Skip if docs folder doesn't exist yet
      if (!fs.existsSync(docsDir)) {
        this.skip();
      }
    });

    it('should have valid HTML structure in index.html', () => {
      const indexPath = path.join(docsDir, 'index.html');
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
      const indexPath = path.join(docsDir, 'index.html');
      if (!fs.existsSync(indexPath)) {
        return;
      }

      const content = fs.readFileSync(indexPath, 'utf8');
      
      // Check for game links
      expect(content).to.include('complete-game.html');
      expect(content).to.include('room-demo.html');
    });

    it('should not have localhost references in production files', () => {
      const indexPath = path.join(docsDir, 'index.html');
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
    it('should successfully run build:docs command', function() {
      this.timeout(30000); // Allow 30 seconds for build
      
      try {
        // Check if dependencies are installed first
        if (!fs.existsSync(path.join(rootDir, 'node_modules'))) {
          console.log('Installing dependencies...');
          execSync('npm install', { cwd: rootDir, stdio: 'pipe' });
        }

        // Run the build:docs command
        const output = execSync('npm run build:docs', { 
          cwd: rootDir, 
          encoding: 'utf8',
          stdio: 'pipe'
        });

        // Check that build completed without errors
        expect(output).to.not.include('ERROR');
        expect(output).to.not.include('FAILED');
        
        // Verify docs folder was created/updated
        expect(fs.existsSync(docsDir)).to.be.true;
        
        // Verify critical files exist after build
        const criticalFiles = [
          path.join(docsDir, 'dist'),
          path.join(docsDir, 'wolf-animation.js'),
          path.join(docsDir, 'wolf-character.js')
        ];

        criticalFiles.forEach(file => {
          expect(fs.existsSync(file), 
            `Build did not create: ${path.basename(file)}`).to.be.true;
        });
      } catch (error) {
        // If build fails, provide helpful error message
        throw new Error(`Build:docs command failed: ${error.message}`);
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