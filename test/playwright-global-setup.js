export default async function globalSetup() {
  console.log('[Playwright] Running global setup');
  await import('./setup.js');
}
