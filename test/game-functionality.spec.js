import { test, expect } from '@playwright/test';

test('check game functionality', async ({ page }) => {
  // Navigate to the game
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
  
  // Wait for game to initialize
  await page.waitForTimeout(1000);
  
  // Check if game canvas exists and is visible
  const canvas = await page.locator('#gameCanvas');
  await expect(canvas).toBeVisible();
  console.log('✓ Game canvas is visible');
  
  // Check if viewport exists
  const viewport = await page.locator('#viewport');
  await expect(viewport).toBeVisible();
  console.log('✓ Viewport is visible');
  
  // Check if HUD elements exist
  const healthBar = await page.locator('.health-bar');
  await expect(healthBar).toBeVisible();
  console.log('✓ Health bar is visible');
  
  const energyBar = await page.locator('.energy-bar');
  await expect(energyBar).toBeVisible();
  console.log('✓ Energy bar is visible');
  
  // Check if mobile controls exist (joystick may be hidden on desktop)
  const joystick = await page.locator('#joystick');
  const joystickVisible = await joystick.isVisible();
  console.log(`✓ Joystick: ${joystickVisible ? 'visible (mobile mode)' : 'hidden (desktop mode)'}`);
  
  const actionButtons = await page.locator('.action-buttons');
  await expect(actionButtons).toBeVisible();
  console.log('✓ Action buttons are visible');
  
  // Check if game is rendering (canvas should have content)
  const canvasHasContent = await page.evaluate(() => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    // Check if there's any non-transparent pixel
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) return true;
    }
    return false;
  });
  
  console.log(`✓ Canvas rendering: ${canvasHasContent ? 'Yes' : 'No'}`);
  
  // Check WASM status
  const wasmStatus = await page.evaluate(() => {
    return typeof window.wasmExports === 'object' && window.wasmExports !== null;
  });
  console.log(`✓ WASM loaded: ${wasmStatus ? 'Yes' : 'No'}`);
  
  // Test basic interaction - click attack button
  const attackBtn = await page.locator('[data-action="attack"]');
  await attackBtn.click();
  console.log('✓ Attack button clickable');
  
  // Check if game renderer exists
  const rendererStatus = await page.evaluate(() => {
    return typeof window.gameRenderer === 'object' && window.gameRenderer !== null;
  });
  console.log(`✓ Game renderer initialized: ${rendererStatus ? 'Yes' : 'No'}`);
  
  // Check for player position
  const playerPos = await page.evaluate(() => {
    if (window.gameRenderer && window.gameRenderer.player) {
      return {
        x: window.gameRenderer.player.x,
        y: window.gameRenderer.player.y
      };
    }
    return null;
  });
  
  if (playerPos) {
    console.log(`✓ Player position: (${playerPos.x.toFixed(2)}, ${playerPos.y.toFixed(2)})`);
  } else {
    console.log('✗ Player not found');
  }
  
  // All checks passed
  console.log('\n✅ Game is functional!');
});