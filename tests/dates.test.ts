// Time zone must be set before any Date is created in this process
// (node --test runs each file in its own process).
process.env.TZ = "Africa/Johannesburg"; // UTC+2, no DST

import { test } from "node:test";
import assert from "node:assert/strict";
import { dayKey } from "../src/lib/dates.ts";
import { computeStreak } from "../src/lib/progress.ts";

test("the time zone override is in effect", () => {
  assert.equal(new Date("2026-11-24T12:00:00Z").getTimezoneOffset(), -120);
});

test("dayKey uses the local calendar day", () => {
  // 01:30 on 24 Nov in Johannesburg is 23:30 on 23 Nov UTC.
  assert.equal(dayKey(new Date(2026, 10, 24, 1, 30)), "2026-11-24");
});

test("practice at 01:00 local time counts toward today's streak", () => {
  const now = new Date(2026, 10, 24, 1, 0);
  assert.equal(computeStreak(["2026-11-22", "2026-11-23", "2026-11-24"], now), 3);
});

test("the streak survives a day with no activity yet", () => {
  const now = new Date(2026, 10, 24, 23, 0);
  assert.equal(computeStreak(["2026-11-22", "2026-11-23"], now), 2);
});
