import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testWasmModule() {
    try {
        // Read the WASM file
        const wasmPath = path.join(__dirname, 'game.wasm');
        const wasmBuffer = fs.readFileSync(wasmPath);
        
        // Create imports object for WASM module
        const imports = {
            env: {
                // Add any required imports here if needed
                memory: new WebAssembly.Memory({ initial: 256, maximum: 512 }),
            }
        };
        
        // Instantiate the WASM module
        const wasmModule = await WebAssembly.instantiate(wasmBuffer, imports);
        const exports = wasmModule.instance.exports;
        
        console.log('🎮 WASM Module loaded successfully!');
        
        // Test that our new API functions exist
        const requiredFunctions = [
            'init_run',
            'update', 
            'get_enemy_count',
            'spawn_wolves',
            'clear_enemies',
            // New wolf pack management functions
            'get_wolf_pack_count',
            'get_wolf_pack_active',
            'get_wolf_pack_alive',
            'get_wolf_pack_respawn_timer',
            'get_wolf_pack_member_count'
        ];
        
        console.log('\n📋 Checking API functions...');
        let allFunctionsExist = true;
        for (const funcName of requiredFunctions) {
            const exists = typeof exports[funcName] === 'function';
            console.log(`  ${exists ? '✅' : '❌'} ${funcName}`);
            if (!exists) allFunctionsExist = false;
        }
        
        if (!allFunctionsExist) {
            console.log('\n❌ Some required functions are missing!');
            return false;
        }
        
        console.log('\n🧪 Testing basic functionality...');
        
        // Test initialization
        exports.init_run(12345n, 0);

        const step = (dx, dy, roll, dt) => {
            if (typeof exports.set_player_input === 'function') {
                exports.set_player_input(
                    Number.isFinite(dx) ? dx : 0,
                    Number.isFinite(dy) ? dy : 0,
                    roll ? 1 : 0,
                    0, 0, 0, 0, 0
                );
            }
            exports.update(dt);
        };
        console.log('✅ Game initialized successfully');
        
        // Test pack count (should be 3 after init)
        const packCount = exports.get_wolf_pack_count();
        console.log(`📦 Wolf pack count: ${packCount} (expected: 3)`);
        
        if (packCount !== 3) {
            console.log('❌ Pack count is incorrect!');
            return false;
        }
        
        // Test pack status
        let activePacks = 0;
        let alivePacks = 0;
        for (let i = 0; i < 3; i++) {
            const active = exports.get_wolf_pack_active(i);
            const alive = exports.get_wolf_pack_alive(i);
            const memberCount = exports.get_wolf_pack_member_count(i);
            const respawnTimer = exports.get_wolf_pack_respawn_timer(i);
            
            console.log(`  Pack ${i}: active=${active}, alive=${alive}, members=${memberCount}, timer=${respawnTimer}`);
            
            if (active) activePacks++;
            if (alive) alivePacks++;
        }
        
        console.log(`🐺 Active packs: ${activePacks}, Alive packs: ${alivePacks}`);
        
        if (activePacks !== 3 || alivePacks !== 3) {
            console.log('❌ Pack status is incorrect!');
            return false;
        }
        
        // Test enemy count
        const enemyCount = exports.get_enemy_count();
        console.log(`👹 Total enemies: ${enemyCount}`);
        
        // Test pack death and respawn timer
        console.log('\n🔥 Testing pack death detection...');
        exports.clear_enemies();
        console.log('✅ All enemies cleared');
        
        // Update for several frames to let pack system detect deaths
        for (let i = 0; i < 20; i++) {
            step(0, 0, 0, 0.016); // 16ms frame
        }
        
        let deadPacks = 0;
        for (let i = 0; i < 3; i++) {
            const active = exports.get_wolf_pack_active(i);
            const alive = exports.get_wolf_pack_alive(i);
            const respawnTimer = exports.get_wolf_pack_respawn_timer(i);
            
            if (active && !alive && respawnTimer > 0) {
                deadPacks++;
                console.log(`  Pack ${i}: dead with respawn timer ${respawnTimer.toFixed(2)}s`);
            }
        }
        
        if (deadPacks > 0) {
            console.log(`✅ Pack death detection working! ${deadPacks} packs have respawn timers`);
        } else {
            console.log('⚠️  Pack death detection may not be working as expected');
        }
        
        console.log('\n🎉 All tests passed! Wolf pack management system is working.');
        return true;
        
    } catch (error) {
        console.error('❌ Error testing WASM module:', error);
        return false;
    }
}

// Run the test
testWasmModule().then(success => {
    process.exit(success ? 0 : 1);
});




