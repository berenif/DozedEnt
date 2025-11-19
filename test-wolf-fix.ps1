#!/usr/bin/env pwsh
# Test Wolf Attack Fix - Launch with cache disabled

Write-Host "🐺 Wolf Attack Fix Tester" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

$testPagePath = Join-Path $PSScriptRoot "public\demos\test-wolf-damage.html"
$demoPagePath = Join-Path $PSScriptRoot "public\demos\core-loop-mvp.html"

if (-not (Test-Path $testPagePath)) {
    Write-Host "❌ Test page not found: $testPagePath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Test page found" -ForegroundColor Green
Write-Host "✅ WASM rebuilt: $(Get-Date (Get-Item "$PSScriptRoot\public\wasm\game.wasm").LastWriteTime -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Green
Write-Host ""

Write-Host "Choose test option:" -ForegroundColor Yellow
Write-Host "  1) Quick Test Page (automated)" -ForegroundColor White
Write-Host "  2) Full Demo (core-loop-mvp.html)" -ForegroundColor White
Write-Host "  3) Both" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter choice (1-3)"

function Open-WithCache {
    param($path, $browser)
    
    $uri = "file:///$($path.Replace('\', '/'))"
    
    # Try to open with cache disabled
    if ($browser -eq "chrome") {
        $chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
        if (Test-Path $chromePath) {
            Write-Host "🌐 Opening in Chrome (Incognito)..." -ForegroundColor Cyan
            Start-Process $chromePath -ArgumentList "--incognito", $uri
            return $true
        }
    }
    elseif ($browser -eq "edge") {
        $edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
        if (-not (Test-Path $edgePath)) {
            $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
        }
        if (Test-Path $edgePath) {
            Write-Host "🌐 Opening in Edge (InPrivate)..." -ForegroundColor Cyan
            Start-Process $edgePath -ArgumentList "-inprivate", $uri
            return $true
        }
    }
    
    # Fallback to default browser
    Write-Host "🌐 Opening in default browser..." -ForegroundColor Cyan
    Start-Process $uri
    return $true
}

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🧪 Opening test page..." -ForegroundColor Cyan
        Open-WithCache $testPagePath "chrome"
        Write-Host ""
        Write-Host "Watch for:" -ForegroundColor Yellow
        Write-Host "  ✅ TEST PASSED: Wolf successfully dealt damage!" -ForegroundColor Green
        Write-Host "  💥 Player took damage! HP: 1.0 → 0.9xx" -ForegroundColor Green
    }
    "2" {
        Write-Host ""
        Write-Host "🎮 Opening demo..." -ForegroundColor Cyan
        Open-WithCache $demoPagePath "chrome"
        Write-Host ""
        Write-Host "Watch for:" -ForegroundColor Yellow
        Write-Host "  • HP bar (top left) decreases when wolves attack" -ForegroundColor White
        Write-Host "  • Wolf enters 'Attack' state before damage" -ForegroundColor White
        Write-Host "  • Console shows: [Roguelike] 🔄 WASM build timestamp" -ForegroundColor White
    }
    "3" {
        Write-Host ""
        Write-Host "🧪 Opening test page..." -ForegroundColor Cyan
        Open-WithCache $testPagePath "chrome"
        Start-Sleep -Seconds 2
        Write-Host "🎮 Opening demo..." -ForegroundColor Cyan
        Open-WithCache $demoPagePath "edge"
        Write-Host ""
        Write-Host "Both pages opened!" -ForegroundColor Green
    }
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📝 Important: Press Ctrl+Shift+R in browser to force reload!" -ForegroundColor Yellow
Write-Host ""
Write-Host "If still no damage:" -ForegroundColor Red
Write-Host "  1. Close ALL browser tabs" -ForegroundColor White
Write-Host "  2. Open DevTools (F12)" -ForegroundColor White
Write-Host "  3. Right-click refresh → 'Empty Cache and Hard Reload'" -ForegroundColor White
Write-Host ""

