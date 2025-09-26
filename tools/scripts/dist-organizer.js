#!/usr/bin/env node

/**
 * Dist Folder Organizer
 * Organizes the dist/ folder into a logical structure for better maintainability
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

class DistOrganizer {
  constructor() {
    this.distPath = path.join(projectRoot, 'dist');
    this.organizedStructure = {
      'core/': [
        'trystero-firebase.min.js',
        'trystero-ipfs.min.js',
        'trystero-mqtt.min.js',
        'trystero-nostr.min.js',
        'trystero-supabase.min.js',
        'trystero-torrent.min.js',
        'trystero-wasm.min.js'
      ],
      'wasm/': [
        'game.wasm',
        'game-host.wasm'
      ],
      'animations/': [
        'player-animator.js',
        'player-animator.min.js',
        'player-animator.umd.js',
        'wolf-animation.js',
        'wolf-animation.min.js',
        'wolf-animation.umd.js'
      ],
      'sourcemaps/': [
        'player-animator.js.map',
        'player-animator.min.js.map',
        'player-animator.umd.js.map',
        'wolf-animation.js.map',
        'wolf-animation.min.js.map',
        'wolf-animation.umd.js.map'
      ],
      'reports/': [
        'BUILD_REPORT.json',
        'BUILD_REPORT.md',
        'VALIDATION_REPORT.json',
        'VALIDATION_REPORT.md'
      ]
    };
  }

  /**
   * Organize the dist folder structure
   */
  async organize() {
    console.log(chalk.bold.blue('\n📁 Organizing dist/ folder structure...\n'));
    
    try {
      // 1. Create organized directory structure
      await this.createDirectoryStructure();
      
      // 2. Move files to appropriate directories
      await this.moveFilesToDirectories();
      
      // 3. Create index files for easy access
      await this.createIndexFiles();
      
      // 4. Create README for dist folder
      await this.createDistReadme();
      
      // 5. Update build scripts to use new structure
      await this.updateBuildScripts();
      
      console.log(chalk.green.bold('\n✅ Dist folder organized successfully!\n'));
      
      return true;
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Organization failed:'), error.message);
      return false;
    }
  }

  /**
   * Create organized directory structure
   */
  async createDirectoryStructure() {
    console.log(chalk.blue('📂 Creating directory structure...'));
    
    const directories = [
      'core',
      'wasm',
      'animations', 
      'sourcemaps',
      'reports',
      'legacy' // For backward compatibility
    ];

    for (const dir of directories) {
      const dirPath = path.join(this.distPath, dir);
      
      try {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(chalk.green(`  ✓ Created ${dir}/`));
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
        console.log(chalk.yellow(`  ℹ ${dir}/ already exists`));
      }
    }
  }

  /**
   * Move files to appropriate directories
   */
  async moveFilesToDirectories() {
    console.log(chalk.blue('📦 Moving files to organized directories...'));
    
    // Files are already in the correct structure from the build process
    // Just verify they exist and log their locations
    for (const [directory, files] of Object.entries(this.organizedStructure)) {
      const targetDir = path.join(this.distPath, directory);
      
      for (const file of files) {
        const targetPath = path.join(targetDir, file);
        
        try {
          await fs.access(targetPath);
          console.log(chalk.green(`  ✓ Found ${file} in ${directory}`));
        } catch (error) {
          if (error.code === 'ENOENT') {
            console.log(chalk.yellow(`  ⚠ ${file} not found in ${directory} (may not be built yet)`));
          } else {
            throw error;
          }
        }
      }
    }
  }

  /**
   * Create index files for easy access
   */
  async createIndexFiles() {
    console.log(chalk.blue('📄 Creating index files...'));
    
    // Create core/index.js
    const coreIndexContent = `/**
 * Core Modules Index
 * Auto-generated index file for core Trystero modules
 */

export { default as firebase } from './trystero-firebase.min.js';
export { default as ipfs } from './trystero-ipfs.min.js';
export { default as mqtt } from './trystero-mqtt.min.js';
export { default as nostr } from './trystero-nostr.min.js';
export { default as supabase } from './trystero-supabase.min.js';
export { default as torrent } from './trystero-torrent.min.js';
export { default as wasm } from './trystero-wasm.min.js';

// Legacy exports for backward compatibility
export { default as FirebaseStrategy } from './trystero-firebase.min.js';
export { default as IpfsStrategy } from './trystero-ipfs.min.js';
export { default as MqttStrategy } from './trystero-mqtt.min.js';
export { default as NostrStrategy } from './trystero-nostr.min.js';
export { default as SupabaseStrategy } from './trystero-supabase.min.js';
export { default as TorrentStrategy } from './trystero-torrent.min.js';
export { default as WasmStrategy } from './trystero-wasm.min.js';
`;

    await fs.writeFile(path.join(this.distPath, 'core', 'index.js'), coreIndexContent);
    console.log(chalk.green('  ✓ Created core/index.js'));

    // Create animations/index.js
    const animationsIndexContent = `/**
 * Animations Index
 * Auto-generated index file for animation modules
 */

export { default as PlayerAnimator } from './player-animator.min.js';
export { default as WolfAnimation } from './wolf-animation.min.js';

// Development versions
export { default as PlayerAnimatorDev } from './player-animator.js';
export { default as WolfAnimationDev } from './wolf-animation.js';

// UMD versions
export { default as PlayerAnimatorUMD } from './player-animator.umd.js';
export { default as WolfAnimationUMD } from './wolf-animation.umd.js';
`;

    await fs.writeFile(path.join(this.distPath, 'animations', 'index.js'), animationsIndexContent);
    console.log(chalk.green('  ✓ Created animations/index.js'));

    // Create main dist/index.js
    const mainIndexContent = `/**
 * DozedEnt Distribution Index
 * Main entry point for all built modules
 */

// Core networking modules
export * from './core/index.js';

// Animation modules
export * from './animations/index.js';

// Version info
export const VERSION = '${new Date().toISOString().split('T')[0]}';
export const BUILD_DATE = '${new Date().toISOString()}';
`;

    await fs.writeFile(path.join(this.distPath, 'index.js'), mainIndexContent);
    console.log(chalk.green('  ✓ Created dist/index.js'));
  }

  /**
   * Create README for dist folder
   */
  async createDistReadme() {
    console.log(chalk.blue('📖 Creating dist README...'));
    
    const readmeContent = `# DozedEnt Distribution

This directory contains the built and optimized files for the DozedEnt project.

## Structure

\`\`\`
dist/
├── core/                    # Core networking modules
│   ├── trystero-firebase.min.js
│   ├── trystero-ipfs.min.js
│   ├── trystero-mqtt.min.js
│   ├── trystero-nostr.min.js
│   ├── trystero-supabase.min.js
│   ├── trystero-torrent.min.js
│   ├── trystero-wasm.min.js
│   └── index.js            # Core modules index
├── animations/              # Animation modules
│   ├── player-animator.js
│   ├── player-animator.min.js
│   ├── player-animator.umd.js
│   ├── wolf-animation.js
│   ├── wolf-animation.min.js
│   ├── wolf-animation.umd.js
│   └── index.js            # Animations index
├── sourcemaps/             # Source map files
│   ├── player-animator.js.map
│   ├── player-animator.min.js.map
│   ├── player-animator.umd.js.map
│   ├── wolf-animation.js.map
│   ├── wolf-animation.min.js.map
│   └── wolf-animation.umd.js.map
├── reports/                # Build and validation reports
│   ├── BUILD_REPORT.json
│   ├── BUILD_REPORT.md
│   ├── VALIDATION_REPORT.json
│   └── VALIDATION_REPORT.md
├── legacy/                 # Legacy files (backward compatibility)
└── index.js               # Main distribution index
\`\`\`

## Usage

### Core Modules
\`\`\`javascript
import { firebase, ipfs, mqtt } from './dist/core/index.js';
// or
import { FirebaseStrategy, IpfsStrategy } from './dist/core/index.js';
\`\`\`

### Animation Modules
\`\`\`javascript
import { PlayerAnimator, WolfAnimation } from './dist/animations/index.js';
\`\`\`

### All Modules
\`\`\`javascript
import * from './dist/index.js';
\`\`\`

## File Types

- **\`.min.js\`**: Minified production files
- **\`.js\`**: Development files with source maps
- **\`.umd.js\`**: Universal Module Definition files
- **\`.map\`**: Source map files for debugging

## Reports

- **BUILD_REPORT.md**: Human-readable build summary
- **VALIDATION_REPORT.md**: Build validation results
- **\*.json**: Machine-readable reports for CI/CD

## Backward Compatibility

Legacy file paths are maintained in the \`legacy/\` directory for any existing references.

## Building

To rebuild with the new structure:

\`\`\`bash
npm run build
\`\`\`

The build process will automatically organize files into this structure.
`;

    await fs.writeFile(path.join(this.distPath, 'README.md'), readmeContent);
    console.log(chalk.green('  ✓ Created dist/README.md'));
  }

  /**
   * Update build scripts to use new structure
   */
  async updateBuildScripts() {
    console.log(chalk.blue('🔧 Updating build scripts...'));
    
    // Update enhanced-build.js to use new structure
    const enhancedBuildPath = path.join(projectRoot, 'tools/scripts/enhanced-build.js');
    
    try {
      let content = await fs.readFile(enhancedBuildPath, 'utf8');
      
      // Update file paths in validation
      content = content.replace(
        /const expectedFiles = \[[\s\S]*?\];/,
        `const expectedFiles = [
      // Core modules
      'core/trystero-firebase.min.js',
      'core/trystero-ipfs.min.js',
      'core/trystero-mqtt.min.js',
      'core/trystero-nostr.min.js',
      'core/trystero-supabase.min.js',
      'core/trystero-torrent.min.js',
      'core/trystero-wasm.min.js',
      
      // Animation modules
      'animations/player-animator.js',
      'animations/player-animator.min.js',
      'animations/player-animator.umd.js',
      'animations/wolf-animation.js',
      'animations/wolf-animation.min.js',
      'animations/wolf-animation.umd.js',
      
      // Index files
      'core/index.js',
      'animations/index.js',
      'index.js'
    ];`
      );
      
      // Update bundle size thresholds
      content = content.replace(
        /const bundleSizeThresholds = \{[\s\S]*?\};/,
        `const bundleSizeThresholds = {
      'core/trystero-firebase.min.js': 200,
      'core/trystero-ipfs.min.js': 150,
      'core/trystero-mqtt.min.js': 100,
      'core/trystero-nostr.min.js': 50,
      'core/trystero-supabase.min.js': 120,
      'core/trystero-torrent.min.js': 180,
      'core/trystero-wasm.min.js': 50,
      'animations/player-animator.min.js': 300,
      'animations/wolf-animation.min.js': 250
    };`
      );
      
      await fs.writeFile(enhancedBuildPath, content);
      console.log(chalk.green('  ✓ Updated enhanced-build.js'));
      
    } catch (error) {
      console.log(chalk.yellow(`  ⚠ Could not update enhanced-build.js: ${error.message}`));
    }

    // Update build-validator.js to use new structure
    const validatorPath = path.join(projectRoot, 'tools/scripts/build-validator.js');
    
    try {
      let content = await fs.readFile(validatorPath, 'utf8');
      
      // Update bundle size thresholds
      content = content.replace(
        /bundleSizeThresholds: \{[\s\S]*?\}/,
        `bundleSizeThresholds: {
        'core/trystero-firebase.min.js': 200,
        'core/trystero-ipfs.min.js': 150,
        'core/trystero-mqtt.min.js': 100,
        'core/trystero-nostr.min.js': 50,
        'core/trystero-supabase.min.js': 120,
        'core/trystero-torrent.min.js': 180,
        'core/trystero-wasm.min.js': 50,
        'animations/player-animator.min.js': 300,
        'animations/wolf-animation.min.js': 250
      }`
      );
      
      await fs.writeFile(validatorPath, content);
      console.log(chalk.green('  ✓ Updated build-validator.js'));
      
    } catch (error) {
      console.log(chalk.yellow(`  ⚠ Could not update build-validator.js: ${error.message}`));
    }
  }

  /**
   * Create legacy symlinks for backward compatibility
   */
  async createLegacySymlinks() {
    console.log(chalk.blue('🔗 Creating legacy symlinks...'));
    
    const legacyMappings = {
      'trystero-firebase.min.js': 'core/trystero-firebase.min.js',
      'trystero-ipfs.min.js': 'core/trystero-ipfs.min.js',
      'trystero-mqtt.min.js': 'core/trystero-mqtt.min.js',
      'trystero-nostr.min.js': 'core/trystero-nostr.min.js',
      'trystero-supabase.min.js': 'core/trystero-supabase.min.js',
      'trystero-torrent.min.js': 'core/trystero-torrent.min.js',
      'trystero-wasm.min.js': 'core/trystero-wasm.min.js',
      'player-animator.js': 'animations/player-animator.js',
      'player-animator.min.js': 'animations/player-animator.min.js',
      'player-animator.umd.js': 'animations/player-animator.umd.js',
      'wolf-animation.js': 'animations/wolf-animation.js',
      'wolf-animation.min.js': 'animations/wolf-animation.min.js',
      'wolf-animation.umd.js': 'animations/wolf-animation.umd.js'
    };

    for (const [legacyFile, newPath] of Object.entries(legacyMappings)) {
      const legacyPath = path.join(this.distPath, legacyFile);
      const targetPath = path.join(this.distPath, newPath);
      
      try {
        // Check if target exists
        await fs.access(targetPath);
        
        // Create symlink (or copy on Windows)
        try {
          await fs.symlink(targetPath, legacyPath);
          console.log(chalk.green(`  ✓ Created symlink: ${legacyFile} → ${newPath}`));
        } catch (error) {
          // Fallback to copy on Windows or if symlinks fail
          await fs.copyFile(targetPath, legacyPath);
          console.log(chalk.yellow(`  ⚠ Copied file: ${legacyFile} (symlink not supported)`));
        }
      } catch (error) {
        console.log(chalk.yellow(`  ⚠ Skipped ${legacyFile} (target not found)`));
      }
    }
  }
}

// Run organization if called directly
if (process.argv[1] && process.argv[1].endsWith('dist-organizer.js')) {
  const organizer = new DistOrganizer();
  const success = await organizer.organize();
  process.exit(success ? 0 : 1);
}

export { DistOrganizer };
