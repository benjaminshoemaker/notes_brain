import { expect, test } from "@playwright/test";

import {
  clearE2EUserData,
  ensureE2EUser,
  seedCategorizedNotes
} from "../../utils/e2eData.mjs";
import { ensureRequiredE2EEnv } from "../../utils/e2eEnv.mjs";
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

test("captures a text note and renders it immediately in the feed", async ({ page }) => {
  const noteText = `web capture e2e ${Date.now().toString(36)}`;

  await login(page);
  await page.getByLabel("New note").fill(noteText);
  await page.getByRole("button", { name: "Add note" }).click();

  await expect(page.getByTestId("note-card").first().getByText(noteText)).toBeVisible();
  await expect(page.getByRole("button", { name: "uncategorized" }).first()).toBeVisible();
});

test("filters by category and supports full-text search", async ({ page }) => {
  const { ideasContent, projectsContent } = await seedCategorizedNotes(adminClient, e2eUser.id);

  await login(page);

  await page.locator("button[aria-pressed]", { hasText: "Projects" }).click();
  await expect(page.getByText(projectsContent)).toBeVisible();
  await expect(page.getByText(ideasContent)).toHaveCount(0);

  await page.locator("button[aria-pressed]", { hasText: "All" }).click();
  await page.getByLabel("Search").fill("ideas");
  await expect(page.getByText(ideasContent)).toBeVisible();
  await expect(page.getByText(projectsContent)).toHaveCount(0);
});
