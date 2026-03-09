import { expect, test } from "@playwright/test";

import { clearE2EUserData, ensureE2EUser } from "../../utils/e2eData.mjs";
import { getE2EEnv, ensureRequiredE2EEnv } from "../../utils/e2eEnv.mjs";
import { createAdminClient } from "../../utils/e2eSupabase.mjs";
import { login } from "./helpers.mjs";

ensureRequiredE2EEnv();

const adminClient = createAdminClient();
let e2eUser = null;

test.beforeAll(async () => {
  e2eUser = await ensureE2EUser(adminClient);
});

test.beforeEach(async () => {
  await clearE2EUserData(adminClient, e2eUser.id);
});

test.afterAll(async () => {
  if (!e2eUser) return;
  await clearE2EUserData(adminClient, e2eUser.id);
});

test("email and password sign-in routes to authenticated notes", async ({ page }) => {
  await login(page);
});

test("magic-link request shows user-facing status feedback", async ({ page }) => {
  const { testEmail } = getE2EEnv();

  await page.goto("/login");
  await page.getByLabel("Email").fill(testEmail);
  await page.getByRole("button", { name: /sign in with magic link/i }).click();

  await expect(
    page.getByText(/Magic link sent\. Check your email\.|Unable to send magic link\. Please try again\./i)
  ).toBeVisible();
});
