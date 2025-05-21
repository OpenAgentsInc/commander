import {
  test,
  expect,
  _electron as electron,
  ElectronApplication,
  Page,
} from "@playwright/test";
import { findLatestBuild, parseElectronApp } from "electron-playwright-helpers";

// Helper to detect CI environment
const isCI = () =>
  !!process.env.CI || !!process.env.GITHUB_ACTIONS || !!process.env.CIRCLECI;

/*
 * Using Playwright with Electron:
 * https://www.electronjs.org/pt/docs/latest/tutorial/automated-testing#using-playwright
 */

let electronApp: ElectronApplication;

test.beforeAll(async () => {
  const latestBuild = findLatestBuild();
  const appInfo = parseElectronApp(latestBuild);
  process.env.CI = "e2e";

  // Define args based on environment
  const electronArgs = [appInfo.main];

  // Add special flags in CI to address WebGL issues
  if (isCI()) {
    electronArgs.push(
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--use-gl=swiftshader",
      "--enable-unsafe-swiftshader",
    );

    // Additional environment variables for CI
    process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
  }

  electronApp = await electron.launch({
    args: electronArgs,
    env: {
      ...process.env,
      // Force software rendering
      ELECTRON_DISABLE_GPU: "1",
    },
  });
  electronApp.on("window", async (page) => {
    const filename = page.url()?.split("/").pop();
    console.log(`Window opened: ${filename}`);

    page.on("pageerror", (error) => {
      console.error(error);
    });
    page.on("console", (msg) => {
      console.log(msg.text());
    });
  });
});

test("renders the first page", async () => {
  const page: Page = await electronApp.firstWindow();
  // Wait longer for UI to stabilize
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // More resilient selector with longer timeout
  const title = await page.waitForSelector("h1", { timeout: 20000 });
  const text = await title.textContent();
  expect(text).toBe("electron-shadcn");
});

test("renders page name", async () => {
  const page: Page = await electronApp.firstWindow();
  // Wait longer for UI to stabilize
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // More resilient selector with longer timeout
  await page.waitForSelector("h1", { timeout: 20000 });
  const pageName = await page.getByTestId("pageTitle");
  const text = await pageName.textContent();
  expect(text).toBe("Home Page");
});

test.afterAll(async () => {
  await electronApp.close();
});
