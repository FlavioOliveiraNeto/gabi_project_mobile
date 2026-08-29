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
  hasStarted,
  scheduleError,
  type ScheduleDraft,
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

const noon = new Date(2026, 7, 25, 12, 0);
assert.equal(hasStarted("2026-08-25", "11:59", noon), true);
assert.equal(hasStarted("2026-08-25", "12:00", noon), true);
assert.equal(hasStarted("2026-08-25", "12:01", noon), false);
assert.equal(hasStarted("2026-08-24", "23:59", noon), true);
assert.equal(hasStarted("2026-11-18", "09:00", noon), false);

const draft: ScheduleDraft = {
  schedule_type: "regular",
  slots: [],
  single_date: "",
  single_time: "",
};

assert.equal(scheduleError(draft), undefined);

assert.equal(
  scheduleError({
    ...draft,
    slots: [
      { weekday: "saturday", time: "08:00" },
      { weekday: "wednesday", time: "19:00" },
    ],
  }),
  undefined,
);
assert.match(
  scheduleError({
    ...draft,
    slots: [
      { weekday: "monday", time: "14:30" },
      { weekday: "friday", time: "99:99" },
    ],
  })!,
  /horário válido/,
);
assert.match(
  scheduleError({
    ...draft,
    slots: [
      { weekday: "monday", time: "10:00" },
      { weekday: "monday", time: "11:00" },
    ],
  })!,
  /repetido/,
);

assert.equal(scheduleError({ ...draft, schedule_type: "extra" }), undefined);
assert.match(
  scheduleError({
    ...draft,
    schedule_type: "extra",
    single_date: "31/02/2026",
  })!,
  /data válida/,
);
assert.match(
  scheduleError({
    ...draft,
    schedule_type: "extra",
    single_date: "25/08/2026",
  })!,
  /horário válido/,
);
assert.equal(
  scheduleError({
    ...draft,
    schedule_type: "extra",
    single_date: "25/08/2026",
    single_time: "14:30",
  }),
  undefined,
);

console.log("date.ts OK");
