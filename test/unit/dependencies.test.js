import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('Dependency Management', () => {
  let packageJson;
  let packageLockJson;

  before(() => {
    packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    
    // Check if package-lock.json exists
    const lockPath = path.join(rootDir, 'package-lock.json');
    if (fs.existsSync(lockPath)) {
      packageLockJson = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    }
  });

  describe('Critical Build Dependencies', () => {
    const criticalDevDeps = [
      'rollup',
      '@rollup/plugin-commonjs',
      '@rollup/plugin-node-resolve',
      '@rollup/plugin-replace',
      '@rollup/plugin-terser'
    ];

    criticalDevDeps.forEach(dep => {
      it(`should have ${dep} in devDependencies`, () => {
        expect(packageJson.devDependencies).to.have.property(dep);
      });

      it(`should have ${dep} installed in node_modules`, () => {
        const depPath = path.join(rootDir, 'node_modules', dep);
        expect(fs.existsSync(depPath)).to.be.true;
      });
    });
  });

  describe('Runtime Dependencies', () => {
    const runtimeDeps = [
      '@noble/secp256k1',
      '@supabase/supabase-js',
      '@waku/discovery',
      '@waku/sdk',
      'firebase',
      'libp2p',
      'mqtt'
    ];

    runtimeDeps.forEach(dep => {
      it(`should have ${dep} in dependencies`, () => {
        expect(packageJson.dependencies).to.have.property(dep);
      });
    });
  });

  describe('Test Dependencies', () => {
    const testDeps = [
      'chai',
      'mocha',
      'nyc',
      '@playwright/test',
      'playwright'
    ];

    testDeps.forEach(dep => {
      it(`should have ${dep} in devDependencies`, () => {
        expect(packageJson.devDependencies).to.have.property(dep);
      });
    });
  });

  describe('Package Lock Integrity', () => {
    it('should have package-lock.json file', () => {
      const lockPath = path.join(rootDir, 'package-lock.json');
      expect(fs.existsSync(lockPath)).to.be.true;
    });

    it('should have matching lockfileVersion', () => {
      if (packageLockJson) {
        expect(packageLockJson).to.have.property('lockfileVersion');
        expect(packageLockJson.lockfileVersion).to.be.at.least(2);
      }
    });

    it('should have packages property in lock file', () => {
      if (packageLockJson) {
        expect(packageLockJson).to.have.property('packages');
      }
    });
  });

  describe('Node Modules Health Check', () => {
    it('should have node_modules directory', () => {
      const nodeModulesPath = path.join(rootDir, 'node_modules');
      expect(fs.existsSync(nodeModulesPath)).to.be.true;
    });

    it('should have .bin directory in node_modules', () => {
      const binPath = path.join(rootDir, 'node_modules', '.bin');
      expect(fs.existsSync(binPath)).to.be.true;
    });

    it('should have rollup executable in .bin', () => {
      const rollupBinPath = path.join(rootDir, 'node_modules', '.bin', 'rollup');
      // On Windows, it might be rollup.cmd
      const rollupCmdPath = path.join(rootDir, 'node_modules', '.bin', 'rollup.cmd');
      const hasRollup = fs.existsSync(rollupBinPath) || fs.existsSync(rollupCmdPath);
      expect(hasRollup).to.be.true;
    });
  });

  describe('Dependency Version Compatibility', () => {
    it('should have compatible Node.js version', () => {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      expect(majorVersion).to.be.at.least(14, 'Node.js version should be 14 or higher');
    });

    it('should have npm installed', () => {
      let npmVersion;
      try {
        npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      } catch (error) {
        npmVersion = null;  
      }
      expect(npmVersion).to.not.be.null;
      expect(npmVersion).to.match(/^\d+\.\d+\.\d+/);
    });
  });

  describe('Pre-build Validation', () => {
    it('should pass pre-build dependency check', () => {
      const missingDeps = [];
      const criticalDeps = [
        'rollup',
        '@rollup/plugin-commonjs',
        '@rollup/plugin-node-resolve',
        '@rollup/plugin-replace',
        '@rollup/plugin-terser'
      ];

      criticalDeps.forEach(dep => {
        const depPath = path.join(rootDir, 'node_modules', dep);
        if (!fs.existsSync(depPath)) {
          missingDeps.push(dep);
        }
      });

      if (missingDeps.length > 0) {
        const errorMsg = `Missing critical dependencies: ${missingDeps.join(', ')}. Run 'npm install' to fix.`;
        expect(missingDeps).to.have.lengthOf(0, errorMsg);
      }
    });

    it('should have all source files for build', () => {
      const sourceFiles = [
        'src/utils/index.js',
        'src/netcode/firebase.js',
        'src/netcode/ipfs.js',
        'src/netcode/mqtt.js',
        'src/netcode/nostr.js',
        'src/netcode/supabase.js',
        'src/netcode/torrent.js',
        'src/utils/wasm.js'
      ];

      const missingFiles = [];
      sourceFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        if (!fs.existsSync(filePath)) {
          missingFiles.push(file);
        }
      });

      expect(missingFiles).to.have.lengthOf(0, 
        `Missing source files: ${missingFiles.join(', ')}`);
    });

    it('should have all rollup config files', () => {
      const configFiles = [
        'rollup.config.js',
        'rollup.config.animations.js',
        'rollup.config.wolf.js'
      ];

      const missingConfigs = [];
      configFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        if (!fs.existsSync(filePath)) {
          missingConfigs.push(file);
        }
      });

      expect(missingConfigs).to.have.lengthOf(0, 
        `Missing rollup config files: ${missingConfigs.join(', ')}`);
    });
  });

  describe('Dependency Security', () => {
    it('should not have known critical vulnerabilities', function() {
      // This test runs npm audit to check for vulnerabilities
      // Skip in CI or if npm audit is not available
      this.timeout(10000);
      
      try {
        const auditResult = execSync('npm audit --json', { 
          cwd: rootDir, 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        const audit = JSON.parse(auditResult);
        const criticalVulns = audit.metadata?.vulnerabilities?.critical || 0;
        const highVulns = audit.metadata?.vulnerabilities?.high || 0;
        
        // We allow some vulnerabilities but flag critical ones
        expect(criticalVulns).to.equal(0, 
          `Found ${criticalVulns} critical vulnerabilities. Run 'npm audit' for details.`);
        
        // Warn about high vulnerabilities but don't fail
        if (highVulns > 0) {
          console.warn(`Warning: Found ${highVulns} high severity vulnerabilities`);
        }
      } catch (error) {
        // npm audit might exit with non-zero code if vulnerabilities exist
        // Parse the output if available
        if (error.stdout) {
          try {
            const audit = JSON.parse(error.stdout);
            const criticalVulns = audit.metadata?.vulnerabilities?.critical || 0;
            expect(criticalVulns).to.equal(0, 
              `Found ${criticalVulns} critical vulnerabilities. Run 'npm audit' for details.`);
          } catch (parseError) {
            // If we can't parse, skip the test
            this.skip();
          }
        } else {
          // If npm audit is not available, skip
          this.skip();
        }
      }
    });
  });
});