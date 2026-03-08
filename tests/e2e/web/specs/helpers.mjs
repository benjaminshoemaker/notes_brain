import { expect } from "@playwright/test";

import { getE2EEnv } from "../../utils/e2eEnv.mjs";

export async function login(page) {
  const { testEmail, testPassword } = getE2EEnv();

  await page.goto("/login");
  await page.getByLabel("Email").fill(testEmail);
  await page.getByLabel("Password").fill(testPassword);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Notes" })).toBeVisible();
}

