import assert from "node:assert/strict";

import {
  formatMonthYear,
  fromIsoDate,
  isValidTime,
  maskDate,
  maskTime,
  monthGrid,
  parseDate,
  scheduledAt,
  toIsoDate,
  toKey,
} from "./date.ts";

assert.equal(toKey(parseDate("2026-08-25")), "2026-08-25");
assert.equal(toKey(parseDate("2026-01-01T14:30:00Z")), "2026-01-01");

assert.equal(maskTime("1430"), "14:30");
assert.equal(maskTime("14:3"), "14:3");
assert.equal(maskTime("149999"), "14:99");
assert.ok(isValidTime("14:30"));
assert.ok(!isValidTime("24:00"));
assert.ok(!isValidTime("14:60"));
assert.ok(!isValidTime("1430"));

assert.equal(maskDate("25082026"), "25/08/2026");
assert.equal(toIsoDate("25/08/2026"), "2026-08-25");
assert.equal(toIsoDate("31/02/2026"), "");
assert.equal(toIsoDate("25/08"), "");
assert.equal(fromIsoDate("2026-08-25"), "25/08/2026");

assert.equal(
  scheduledAt(parseDate("2026-08-25"), "14:30"),
  "2026-08-25 14:30:00",
);

const grid = monthGrid(parseDate("2026-08-10"));
assert.equal(grid.offset, 6);
assert.equal(grid.days.length, 31);

assert.equal(formatMonthYear(parseDate("2026-08-01")), "Agosto de 2026");

console.log("date.ts OK");
