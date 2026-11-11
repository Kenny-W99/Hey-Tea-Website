import { defineConfig } from "@playwright/test";
const baseURL = process.env.PW_BASE_URL || "http://127.0.0.1:5173";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 2,
  timeout: 75000,
  use: {
    baseURL,
    channel: process.env.PW_CHANNEL || "chrome",
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
    launchOptions: { args: ["--enable-unsafe-swiftshader"] },
  },
  webServer: process.env.PW_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: true,
      },
});
