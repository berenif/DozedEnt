# PowerShell script to build WASM modules with proper environment setup
# Usage: .\scripts\build-wasm.ps1 [dev|prod|host|all]

param(
    [Parameter(Position=0)]
    [ValidateSet('dev', 'prod', 'prod-safe', 'host', 'all', '')]
    [string]$BuildType = 'prod'
)

Write-Host "WASM Build Script for DozedEnt Game" -ForegroundColor Cyan
Write-Host "Build type: $BuildType" -ForegroundColor Yellow

# Initialize Emscripten environment
Write-Host "Setting up Emscripten environment..." -ForegroundColor Green
try {
    . .\emsdk\emsdk_env.ps1
    Write-Host "Emscripten environment initialized" -ForegroundColor Green
} catch {
    Write-Host "Failed to initialize Emscripten environment" -ForegroundColor Red
    Write-Host "Make sure emsdk is properly installed in the emsdk/ directory" -ForegroundColor Yellow
    exit 1
}

# Verify em++ is available
try {
    $emVersion = em++ --version | Select-String "emcc"
    Write-Host "Emscripten compiler available: $emVersion" -ForegroundColor Green
} catch {
    Write-Host "em++ compiler not found" -ForegroundColor Red
    exit 1
}

# Clean previous builds
Write-Host "Cleaning previous WASM builds..." -ForegroundColor Yellow
Remove-Item -Path "*.wasm" -Force -ErrorAction SilentlyContinue

# Generate balance header from data files
Write-Host "Generating balance data header..." -ForegroundColor Yellow
try {
    node .\tools\scripts\generate-balance.cjs | Write-Host
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
    
    $cmd = "em++ src/wasm/game.cpp $flags -s STANDALONE_WASM=1 -s WASM_BIGINT=1 -s EXPORT_ALL=0 -s ALLOW_MEMORY_GROWTH=1 -o ./game.wasm"
    Write-Host "Command: $cmd" -ForegroundColor Gray
    
    try {
        Invoke-Expression $cmd
        if ($LASTEXITCODE -eq 0) {
            $sizeBytes = (Get-Item "game.wasm").Length
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
    
    $cmd = 'em++ src/wasm/game-host.cpp -O3 -s STANDALONE_WASM=1 -s EXPORTED_FUNCTIONS=''["_game_init","_game_create_state","_game_update","_game_handle_input","_game_get_state","_game_get_state_size","_game_apply_state","_game_destroy","_malloc","_free"]'' -s EXPORTED_RUNTIME_METHODS=''["ccall","cwrap"]'' -s ALLOW_MEMORY_GROWTH=1 -s WASM_BIGINT=1 -o ./game-host.wasm'
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
    Get-Item "*.wasm" -ErrorAction SilentlyContinue | ForEach-Object {
        $sizeBytes = $_.Length
        $sizeKB = [math]::Round($sizeBytes / 1KB, 1)
        Write-Host "  $($_.Name) - $sizeKB KB" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Cyan
    Write-Host "  npm run wasm:build      - Build production game.wasm" -ForegroundColor White
    Write-Host "  npm run wasm:build:dev  - Build development game.wasm" -ForegroundColor White
    Write-Host "  npm run wasm:build:host - Build game-host.wasm" -ForegroundColor White
    Write-Host "  npm run wasm:build:all  - Build all WASM modules" -ForegroundColor White
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