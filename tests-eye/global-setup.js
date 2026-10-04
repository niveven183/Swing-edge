// tests-eye/global-setup.js — fixtures are generated once per run, in Chromium (see fixtures.js).
import { chromium } from "@playwright/test";
import { generateFixtures } from "./fixtures.js";

export default async function globalSetup() {
  const browser = await chromium.launch(process.env.EYE_CHROMIUM ? { executablePath: process.env.EYE_CHROMIUM } : {});
  try {
    await generateFixtures(browser);
  } finally {
    await browser.close();
  }
}
