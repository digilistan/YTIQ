const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // run sequentially with 1 worker
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  globalTeardown: require.resolve('./tests/setup/globalTeardown.js'),
  webServer: [
    {
      command: 'npm run dev --workspace=client -- --port 5173',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    {
      command: 'npm run start --workspace=server',
      url: 'http://localhost:5000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      env: {
        PORT: '5000',
        YOUTUBE_API_KEY: 'mock_youtube_key',
        AI_API_KEY: 'mock_ai_key',
        YOUTUBE_API_BASE_URL: 'http://localhost:5050/youtube',
        AI_API_BASE_URL: 'http://localhost:5050/ai/v1',
        NODE_ENV: 'test',
      }
    },
    {
      command: 'node tests/mocks/mockApiServer.js',
      url: 'http://localhost:5050/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: {
        MOCK_PORT: '5050'
      }
    }
  ],
});
