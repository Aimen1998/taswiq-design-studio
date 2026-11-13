import { defineConfig, devices } from "@playwright/test";

/** Browser tests of the standalone app (built dist/, served by vite preview). */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://127.0.0.1:4410", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: { command: "npx vite preview --port 4410 --strictPort --host 127.0.0.1", url: "http://127.0.0.1:4410/", reuseExistingServer: !process.env.CI },
});
