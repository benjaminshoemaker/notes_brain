import { expect, test } from "@playwright/test";

import { clearE2EUserData, ensureE2EUser } from "../../utils/e2eData.mjs";
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

test("updates timezone from settings and persists the selection", async ({ page }) => {
  await login(page);

  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);

  const timezoneSelect = page.locator("select");
  await expect(timezoneSelect).toBeVisible();

  const currentTimezone = await timezoneSelect.inputValue();
  const timezoneValues = await timezoneSelect.locator("option").evaluateAll((options) =>
    options
      .map((option) => option.getAttribute("value"))
      .filter((value) => Boolean(value))
  );

  const targetTimezone = timezoneValues.find((value) => value !== currentTimezone) ?? currentTimezone;

  await timezoneSelect.selectOption(targetTimezone);
  if (targetTimezone !== currentTimezone) {
    await expect(page.getByText("Timezone updated.")).toBeVisible();
  }

  const { data, error } = await adminClient
    .from("users")
    .select("timezone")
    .eq("id", e2eUser.id)
    .single();

  expect(error).toBeNull();
  expect(data?.timezone).toBe(targetTimezone);
});
