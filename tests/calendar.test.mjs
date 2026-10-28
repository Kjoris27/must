import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const js = ts.transpileModule(
  readFileSync(new URL("../app/calendar.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const { calendarText } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const text = calendarText(
  {
    id: "test-event",
    title: "Cloud, code; démo\n" + "Événement très intéressant ".repeat(7),
    start: "2026-11-01T19:00:00Z",
    minutes: 45,
    demo: true,
  },
  "https://example.test",
);
assert.ok(text.startsWith("BEGIN:VCALENDAR\r\n"));
assert.ok(text.endsWith("END:VCALENDAR\r\n"));
assert.ok(text.includes("DTSTART:20261101T190000Z"));
assert.ok(text.includes("DTEND:20261101T194500Z"));
assert.ok(text.includes("TRIGGER:-PT15M"));
assert.ok(text.includes("SUMMARY:Cloud\\, code\\; démo\\n"));
assert.ok(text.split("\r\n").every((l) => Buffer.byteLength(l) <= 75));
assert.equal((text.match(/BEGIN:VEVENT/g) || []).length, 1);
assert.equal((text.match(/BEGIN:VALARM/g) || []).length, 1);
console.log(
  "PASS: calendar times, duration, 15-minute alarm, text escaping, UTF-8 line folding and complete ICS structure.",
);
