import { test } from "node:test";
import assert from "node:assert/strict";

import {
  getLocalIntervalSlotKey,
  parseLocalIntervalHours,
  shouldRunLensForLocalInterval
} from "../scripts/lib/local-lens-interval.mjs";

const BASE_LENS = {
  id: "lens-1",
  name: "Nightly check",
  schedule_type: "daily",
  schedule_time: "20:00:00",
  is_active: true,
  users: {
    timezone: "America/Los_Angeles"
  }
};

test("should parse positive local interval hour overrides", () => {
  assert.equal(parseLocalIntervalHours("4"), 4);
  assert.equal(parseLocalIntervalHours("0.5"), 0.5);
  assert.equal(parseLocalIntervalHours(""), null);
  assert.throws(() => parseLocalIntervalHours("0"), /positive hour value/);
});

test("should anchor local override slots at schedule_time", () => {
  assert.equal(
    getLocalIntervalSlotKey({
      date: new Date("2026-05-09T03:30:00.000Z"),
      timezone: "America/Los_Angeles",
      scheduleTime: "20:00:00",
      intervalHours: 4
    }),
    "2026-05-08T20:00:00"
  );

  assert.equal(
    getLocalIntervalSlotKey({
      date: new Date("2026-05-09T07:15:00.000Z"),
      timezone: "America/Los_Angeles",
      scheduleTime: "20:00:00",
      intervalHours: 4
    }),
    "2026-05-09T00:00:00"
  );
});

test("should not run local override before a lens has run once", () => {
  assert.equal(
    shouldRunLensForLocalInterval({
      lens: { ...BASE_LENS, last_run_at: null },
      now: new Date("2026-05-09T07:15:00.000Z"),
      intervalHours: 4
    }),
    false
  );
});

test("should run local override when the current 4h slot has not run yet", () => {
  assert.equal(
    shouldRunLensForLocalInterval({
      lens: { ...BASE_LENS, last_run_at: "2026-05-09T03:00:11.735Z" },
      now: new Date("2026-05-09T07:15:00.000Z"),
      intervalHours: 4
    }),
    true
  );
});

test("should not run local override twice in the same 4h slot", () => {
  assert.equal(
    shouldRunLensForLocalInterval({
      lens: { ...BASE_LENS, last_run_at: "2026-05-09T07:02:00.000Z" },
      now: new Date("2026-05-09T07:15:00.000Z"),
      intervalHours: 4
    }),
    false
  );
});
