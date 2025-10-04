import { test, expect } from '@playwright/test';

test('wasm loader initializes exports', async ({ page }) => {
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle' });

  await page.waitForFunction(() => window.wasmApi && window.wasmApi.exports);

  const loaderMode = await page.evaluate(() => window.wasmApi.loaderInfo.mode);
  expect(loaderMode).toBeTruthy();
});
