#!/usr/bin/env pwsh
# Test Player Sphere Rendering

Write-Host ""
Write-Host "🔵 Player Sphere Rendering Test" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

$testPage = Join-Path $PSScriptRoot "public\demos\test-sphere-player.html"
$demoPage = Join-Path $PSScriptRoot "public\demos\core-loop-mvp.html"

Write-Host "✅ Player now renders as a simple sphere!" -ForegroundColor Green
Write-Host "✅ Skeleton system kept intact (use ?advanced=1)" -ForegroundColor Green
Write-Host ""

Write-Host "Choose rendering mode:" -ForegroundColor Yellow
Write-Host "  1) Sphere (default) - Simple blue sphere" -ForegroundColor White
Write-Host "  2) Advanced - Full procedural skeleton" -ForegroundColor White
Write-Host "  3) Debug - Skeleton debug view" -ForegroundColor White
Write-Host "  4) Compare - Side by side" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter choice (1-4)"

function Open-Browser {
    param($url)
    
    # Try Chrome incognito first
    $chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
    if (Test-Path $chromePath) {
        Start-Process $chromePath -ArgumentList "--incognito", $url
        return
    }
    
    # Fallback to default browser
    Start-Process $url
}

function Get-FileUri {
    param($path)
    return "file:///$($path.Replace('\', '/'))"
}

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🔵 Opening sphere rendering (default)..." -ForegroundColor Cyan
        $uri = Get-FileUri $testPage
        Open-Browser $uri
        Write-Host ""
        Write-Host "✅ Look for:" -ForegroundColor Green
        Write-Host "   • Blue gradient sphere (15px)" -ForegroundColor White
        Write-Host "   • White arrow showing direction" -ForegroundColor White
        Write-Host "   • Red glow when attacking" -ForegroundColor White
        Write-Host "   • Orange ring when blocking" -ForegroundColor White
        Write-Host "   • Motion blur when rolling" -ForegroundColor White
    }
    "2" {
        Write-Host ""
        Write-Host "🦴 Opening advanced skeleton rendering..." -ForegroundColor Cyan
        $uri = Get-FileUri $testPage + "?advanced=1"
        Open-Browser $uri
        Write-Host ""
        Write-Host "✅ Look for:" -ForegroundColor Green
        Write-Host "   • Full procedural skeleton" -ForegroundColor White
        Write-Host "   • Foot IK (legs follow terrain)" -ForegroundColor White
        Write-Host "   • Spine bending during movement" -ForegroundColor White
        Write-Host "   • Arm IK for combat" -ForegroundColor White
    }
    "3" {
        Write-Host ""
        Write-Host "🐛 Opening debug skeleton view..." -ForegroundColor Cyan
        $uri = Get-FileUri $testPage + "?skeleton=1"
        Open-Browser $uri
        Write-Host ""
        Write-Host "✅ Look for:" -ForegroundColor Green
        Write-Host "   • Skeleton joints as circles" -ForegroundColor White
        Write-Host "   • Bones as lines" -ForegroundColor White
        Write-Host "   • Joint labels/IDs" -ForegroundColor White
    }
    "4" {
        Write-Host ""
        Write-Host "👥 Opening side-by-side comparison..." -ForegroundColor Cyan
        
        # Open sphere in Chrome
        $uri1 = Get-FileUri $testPage
        Open-Browser $uri1
        Start-Sleep -Seconds 1
        
        # Open advanced in Edge
        $uri2 = Get-FileUri $testPage + "?advanced=1"
        $edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
        if (-not (Test-Path $edgePath)) {
            $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
        }
        if (Test-Path $edgePath) {
            Start-Process $edgePath -ArgumentList "-inprivate", $uri2
        } else {
            Start-Process $uri2
        }
        
        Write-Host ""
        Write-Host "✅ Opened both modes!" -ForegroundColor Green
        Write-Host "   Left: Sphere rendering" -ForegroundColor White
        Write-Host "   Right: Advanced skeleton" -ForegroundColor White
    }
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📝 Features:" -ForegroundColor Yellow
Write-Host "   • Simple sphere (default)" -ForegroundColor White
Write-Host "   • Direction arrow (shows velocity)" -ForegroundColor White
Write-Host "   • State indicators (attack/block/roll)" -ForegroundColor White
Write-Host "   • Skeleton preserved (use ?advanced=1)" -ForegroundColor White
Write-Host ""
Write-Host "🎮 Controls:" -ForegroundColor Yellow
Write-Host "   WASD   - Move" -ForegroundColor White
Write-Host "   J      - Light Attack" -ForegroundColor White
Write-Host "   Shift  - Block" -ForegroundColor White
Write-Host "   Space  - Roll" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tip: Add ?advanced=1 to any URL to use skeleton rendering!" -ForegroundColor Cyan
Write-Host ""

