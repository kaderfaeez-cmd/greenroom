// UTC+13 in November (NZDT): the zone where the old picker showed the previous day.
process.env.TZ = "Pacific/Auckland";

import { test } from "node:test";
import assert from "node:assert/strict";
import { fromDateInputValue, toDateInputValue } from "../src/lib/dates.ts";

test("the time zone override is in effect", () => {
  assert.equal(new Date("2026-11-24T12:00:00Z").getTimezoneOffset(), -780);
});

test("a picked interview date shows the same day in the picker", () => {
  const stored = fromDateInputValue("2026-11-24");
  assert.equal(toDateInputValue(stored), "2026-11-24");
});

test("the stored timestamp is 09:00 local time on the picked day", () => {
  const d = new Date(fromDateInputValue("2026-11-24"));
  assert.equal(d.getDate(), 24);
  assert.equal(d.getHours(), 9);
});
