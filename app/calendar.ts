export function calendarText(
  plan: {
    id: string;
    title: string;
    start: string;
    minutes: number;
    demo: boolean;
  },
  origin: string,
) {
  const escape = (s: string) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const dt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = new Date(plan.start);
  const end = new Date(start.getTime() + plan.minutes * 60000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Happen//Learning together//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${plan.id}@happen`,
    `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(start)}`,
    `DTEND:${dt(end)}`,
    `SUMMARY:${escape(plan.title)}`,
    `DESCRIPTION:${escape("Session Happen. " + (plan.demo ? "Événement de démonstration." : ""))}`,
    `URL:${origin}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Ta session Happen commence dans 15 minutes.",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const fold = (s: string) => {
    let out = "",
      line = "";
    for (const c of s) {
      if (new TextEncoder().encode(line + c).length > 74) {
        out += line + "\r\n";
        line = " " + c;
      } else line += c;
    }
    return out + line;
  };
  return lines.map(fold).join("\r\n") + "\r\n";
}
