export function parseDate(value: string): Date {
  const [d] = value.split("T");
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

export const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const local = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-BR", opts);

export const formatFull = (d: Date) =>
  cap(
    local({
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d),
  );

export const formatLong = (d: Date) =>
  local({ day: "2-digit", month: "long", year: "numeric" }).format(d);

export const formatShort = (d: Date) =>
  local({ day: "2-digit", month: "short", year: "numeric" }).format(d);

export const formatDayMonth = (d: Date) =>
  cap(local({ weekday: "long", day: "2-digit", month: "long" }).format(d));

export const formatWeekdayShort = (d: Date) =>
  local({ weekday: "short", day: "2-digit", month: "2-digit" }).format(d);

export const formatMonthYear = (d: Date) =>
  cap(local({ month: "long", year: "numeric" }).format(d));

export const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const isToday = (d: Date) => toKey(d) === toKey(new Date());

export const isSameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
export const addMonths = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);

export function monthGrid(base: Date): { offset: number; days: Date[] } {
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  const days: Date[] = [];
  for (let i = 1; i <= last.getDate(); i++)
    days.push(new Date(base.getFullYear(), base.getMonth(), i));
  return { offset: first.getDay(), days };
}

export function scheduledAt(date: Date, time: string): string {
  return `${toKey(date)} ${time}:00`;
}

export function maskTime(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

export function isValidTime(t: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  return !!m && Number(m[1]) < 24 && Number(m[2]) < 60;
}

export function maskDate(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export function toIsoDate(masked: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(masked);
  if (!m) return "";
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (d.getMonth() !== Number(mm) - 1 || d.getDate() !== Number(dd)) return "";
  return `${yyyy}-${mm}-${dd}`;
}

export const fromIsoDate = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
};

export function hasStarted(
  date: string,
  time: string,
  now: Date = new Date(),
): boolean {
  const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return `${date} ${time}` <= `${toKey(now)} ${clock}`;
}

export type DraftSlot = { weekday: string; time: string };

export type ScheduleDraft = {
  schedule_type: "regular" | "extra";
  slots: DraftSlot[];
  single_date: string;
  single_time: string;
};

export function scheduleError(form: ScheduleDraft): string | undefined {
  if (form.schedule_type === "regular") {
    if (form.slots.length === 0) return undefined;

    const invalid = form.slots.filter((slot) => !isValidTime(slot.time));
    if (invalid.length > 0)
      return "Informe um horário válido (HH:MM) para cada dia marcado.";

    const days = form.slots.map((slot) => slot.weekday);
    if (new Set(days).size !== days.length) return "Há dia da semana repetido.";

    return undefined;
  }

  if (!form.single_date && !form.single_time) return undefined;
  if (!toIsoDate(form.single_date))
    return "Informe uma data válida (DD/MM/AAAA).";
  if (!isValidTime(form.single_time))
    return "Informe um horário válido (HH:MM).";
  return undefined;
}
