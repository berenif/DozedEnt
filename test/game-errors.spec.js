import './setup.js';
import { test, expect } from '@playwright/test';

test('check for game console errors', async ({ page }) => {
  const errors = [];
  const failed404s = [];
  
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  
  // Listen for failed requests
  page.on('requestfailed', request => {
    failed404s.push(request.url());
  });
  
  // Navigate to the game
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
  
  // Wait a bit for any async errors
  await page.waitForTimeout(2000);
  
  // Log any errors found
  if (errors.length > 0) {
    console.log('Console errors found:');
    errors.forEach(err => console.log('  - ' + err));
  } else {
    console.log('No console errors found');
  }
  
  // Log failed requests
  if (failed404s.length > 0) {
    console.log('Failed requests (404s):');
    failed404s.forEach(url => console.log('  - ' + url));
  }
  
  // Check if game canvas exists
  const canvas = await page.locator('#gameCanvas');
  await expect(canvas).toBeVisible();
  
  // Check if critical game elements exist
  const viewport = await page.locator('#viewport');
  await expect(viewport).toBeVisible();
  
  // Report errors
  expect(errors).toHaveLength(0);
});
