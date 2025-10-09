# PowerShell script to build WASM modules with proper environment setup
# Usage: .\scripts\build-wasm.ps1 [dev|prod|host|all]

param(
    [Parameter(Position=0)]
    [ValidateSet('dev', 'prod', 'prod-safe', 'host', 'all', '')]
    [string]$BuildType = 'prod'
)

Write-Host "WASM Build Script for DozedEnt Game" -ForegroundColor Cyan
Write-Host "Build type: $BuildType" -ForegroundColor Yellow

# Initialize Emscripten environment (vendored in ./emsdk)
Write-Host "Setting up Emscripten environment..." -ForegroundColor Green
try {
    $emsdkEnv = Join-Path -Path (Get-Location) -ChildPath "emsdk/emsdk_env.ps1"
    if (-not (Test-Path $emsdkEnv)) {
        throw "emsdk_env.ps1 not found at $emsdkEnv"
    }
    . $emsdkEnv

    # Ensure EM_CONFIG points to our vendored config (emsdk/.emscripten)
    $expectedConfig = (Resolve-Path "./emsdk/.emscripten").Path
    if (-not $env:EM_CONFIG -or -not (Test-Path $env:EM_CONFIG) -or -not ($env:EM_CONFIG -ieq $expectedConfig)) {
        $env:EM_CONFIG = $expectedConfig
    }

    Write-Host "Emscripten environment initialized" -ForegroundColor Green
    Write-Host "EM_CONFIG: $($env:EM_CONFIG)" -ForegroundColor DarkGray
} catch {
    Write-Host "Failed to initialize Emscripten environment" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "Make sure emsdk is properly installed in the emsdk/ directory" -ForegroundColor Yellow
    exit 1
}

# Verify em++ is available
try {
    $emVersion = em++ --version 2>&1 | Select-String "emcc"
    if (-not $emVersion) { throw "em++ did not report version" }
    Write-Host "Emscripten compiler available: $emVersion" -ForegroundColor Green
} catch {
    Write-Host "em++ compiler not found" -ForegroundColor Red
    Write-Host "PATH: $($env:PATH)" -ForegroundColor DarkGray
    exit 1
}

# Clean previous builds
Write-Host "Cleaning previous WASM builds..." -ForegroundColor Yellow
Remove-Item -Path "*.wasm" -Force -ErrorAction SilentlyContinue

# Generate balance header from data files
Write-Host "Generating balance data header..." -ForegroundColor Yellow
try {
    node ./tools/scripts/generate-balance.cjs | Write-Host
    Write-Host "Balance data generated" -ForegroundColor Green
} catch {
    Write-Host "Balance generation failed: $_" -ForegroundColor Red
    exit 1
}

function Build-GameWasm {
    param([string]$Mode)
    
    Write-Host "Building game.wasm in $Mode mode..." -ForegroundColor Cyan
    
    if ($Mode -eq "dev") {
        $flags = "-O1 -g -s ASSERTIONS=1"
        Write-Host "Development build with debug symbols and assertions" -ForegroundColor Yellow
    } elseif ($Mode -eq "prod-safe") {
        $flags = "-O2"
        Write-Host "Production build with safe optimization (O2)" -ForegroundColor Yellow
    } else {
        $flags = "-O3"
        Write-Host "Production build with maximum optimization" -ForegroundColor Yellow
    }
    
    # Collect all C++ source files
    $sourceFiles = @(
        "public/src/wasm/game_refactored.cpp",
        "public/src/wasm/GameGlobals.cpp",
        "public/src/wasm/managers/CombatManager.cpp",
        "public/src/wasm/managers/GameStateManager.cpp",
        "public/src/wasm/managers/InputManager.cpp",
        "public/src/wasm/managers/PlayerManager.cpp",
        "public/src/wasm/managers/WolfManager.cpp",
        "public/src/wasm/coordinators/GameCoordinator.cpp",
        "public/src/wasm/physics/PhysicsManager.cpp",
        "public/src/wasm/progression/AbilityUpgradeSystem.cpp",
        "public/src/wasm/progression/UpgradeTree.cpp",
        "public/src/entities/PhysicsBarrel.cpp"
    )
    
    # Export specific functions including barrel physics functions
    $exportedFunctions = @(
        "_spawn_barrel", "_throw_barrel", "_get_barrel_count", "_get_barrel_x", "_get_barrel_y", 
        "_get_barrel_vel_x", "_get_barrel_vel_y", "_clear_all_barrels",
        "_get_physics_player_x", "_get_physics_player_y", "_get_physics_player_vel_x", "_get_physics_player_vel_y", "_get_physics_perf_ms",
        "_physics_get_event_count", "_physics_get_events_ptr", "_physics_clear_events",
        "_set_body_collision_filter", "_get_collision_pairs_checked", "_get_collisions_resolved",
        "_init_run", "_start", "_update", "_set_player_input"
    )
    $exportedFunctionsJson = '["' + ($exportedFunctions -join '","') + '"]'
    $cmd = "em++ $($sourceFiles -join ' ') $flags -Ipublic/src/wasm -Ipublic/src/wasm/managers -Ipublic/src/wasm/coordinators -Ipublic/src/wasm/physics -Ipublic/src/wasm/progression -Ipublic/src/entities -s STANDALONE_WASM=1 -s WASM_BIGINT=1 -s ALLOW_MEMORY_GROWTH=1 -s EXPORTED_FUNCTIONS=`"$exportedFunctionsJson`" -o ./public/wasm/game.wasm"
    Write-Host "Command: $cmd" -ForegroundColor Gray
    
    try {
        Invoke-Expression $cmd
        if ($LASTEXITCODE -eq 0) {
            $sizeBytes = (Get-Item "public/wasm/game.wasm").Length
            $sizeKB = [math]::Round($sizeBytes / 1KB, 1)
            Write-Host "game.wasm built successfully ($sizeKB KB)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "game.wasm build failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Build command failed: $_" -ForegroundColor Red
        return $false
    }
}

function Build-HostWasm {
    Write-Host "Building game-host.wasm..." -ForegroundColor Cyan
    
    $cmd = 'em++ public/src/wasm/game-host.cpp -O3 -s STANDALONE_WASM=1 -s EXPORTED_FUNCTIONS=''["_game_init","_game_create_state","_game_update","_game_handle_input","_game_get_state","_game_get_state_size","_game_apply_state","_game_destroy","_malloc","_free"]'' -s EXPORTED_RUNTIME_METHODS=''["ccall","cwrap"]'' -s ALLOW_MEMORY_GROWTH=1 -s WASM_BIGINT=1 -o ./game-host.wasm'
    Write-Host "Command: $cmd" -ForegroundColor Gray
    
    try {
        Invoke-Expression $cmd
        if ($LASTEXITCODE -eq 0) {
            $sizeBytes = (Get-Item "game-host.wasm").Length
            $sizeKB = [math]::Round($sizeBytes / 1KB, 1)
            Write-Host "game-host.wasm built successfully ($sizeKB KB)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "game-host.wasm build failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Build command failed: $_" -ForegroundColor Red
        return $false
    }
}

# Execute builds based on type
$success = $true

switch ($BuildType) {
    'dev' {
        $success = Build-GameWasm -Mode "dev"
    }
    'prod' {
        $success = Build-GameWasm -Mode "prod"
    }
    'prod-safe' {
        $success = Build-GameWasm -Mode "prod-safe"
    }
    'host' {
        $success = Build-HostWasm
    }
    'all' {
        Write-Host "Building all WASM modules..." -ForegroundColor Cyan
        $success = (Build-GameWasm -Mode "prod") -and (Build-HostWasm)
    }
    default {
        $success = Build-GameWasm -Mode "prod"
    }
}

if ($success) {
    Write-Host "WASM build completed successfully!" -ForegroundColor Green
    
    # Show build artifacts
    Write-Host ""
    Write-Host "Build artifacts:" -ForegroundColor Cyan
    Get-Item "public/wasm/*.wasm" -ErrorAction SilentlyContinue | ForEach-Object {
        $sizeBytes = $_.Length
        $sizeKB = [math]::Round($sizeBytes / 1KB, 1)
        Write-Host "  $($_.Name) - $sizeKB KB" -ForegroundColor White
    }
    Get-Item "*.wasm" -ErrorAction SilentlyContinue | ForEach-Object {
        $sizeBytes = $_.Length
        $sizeKB = [math]::Round($sizeBytes / 1KB, 1)
        Write-Host "  $($_.Name) - $sizeKB KB (legacy location)" -ForegroundColor DarkGray
    }
    
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Cyan
    Write-Host "  npm run wasm:build      - Build production game.wasm" -ForegroundColor White
    Write-Host "  npm run wasm:build:dev  - Build development game.wasm" -ForegroundColor White
    Write-Host "  npm run wasm:build:host - Build game-host.wasm" -ForegroundColor White
    Write-Host "  npm run wasm:build:all  - Build all WASM modules" -ForegroundColor White

    # Generate export manifest for CI/auditing
    Write-Host ""; Write-Host "Generating WASM export manifest..." -ForegroundColor Cyan
    try {
        node ./tools/scripts/generate-wasm-exports.js --out ./WASM_EXPORTS.json | Write-Host
        if (Test-Path "./WASM_EXPORTS.json") {
            $json = Get-Content ./WASM_EXPORTS.json -Raw | ConvertFrom-Json
            $moduleSummaries = $json.modules | ForEach-Object { "  $($_.file): $($_.exportCount) exports" }
            Write-Host "Manifest created with:" -ForegroundColor Green
            $moduleSummaries | ForEach-Object { Write-Host $_ -ForegroundColor White }
        }
    } catch {
        Write-Host "Failed to generate export manifest: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "WASM build failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check that all C++ header files are properly defined" -ForegroundColor White
    Write-Host "  2. Ensure all enum values and struct members exist" -ForegroundColor White
    Write-Host "  3. Verify function declarations match their usage" -ForegroundColor White
    Write-Host "  4. Run: npm run wasm:build:dev for debug build with more info" -ForegroundColor White
    exit 1
}
