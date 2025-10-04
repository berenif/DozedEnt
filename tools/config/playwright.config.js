import {devices} from '@playwright/test'

export default {
  globalSetup: '../../test/playwright-global-setup.js',
  testDir: '../../test',
  testMatch: ['playwright/**/*.spec.js'],
  timeout: 53_333,
  use: {
    ignoreHTTPSErrors: true,
    headless: true,
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-setuid-sandbox',
        '--no-sandbox'
      ],
      firefoxUserPrefs: {
        'media.navigator.permission.disabled': true,
        'media.navigator.streams.fake': true
      }
    }
  },
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']}
    },
    {
      name: 'firefox',
      use: {...devices['Desktop Firefox']}
    },
    {
      name: 'webkit',
      use: {...devices['Desktop Safari']}
    }
  ],
  webServer: {
    command: 'npx --yes serve public -p 8080',
    url: 'http://localhost:8080/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
}
