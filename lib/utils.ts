/* ---------- Class names ---------- */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ---------- Dates ----------
   Dates are stored as local "YYYY-MM-DD" strings and times as "HH:MM" (24h),
   so the calendar never shifts because of time zones. */

/** The current time, read when the app loads. */
export const NOW = new Date();
export const TODAY = toKey(NOW);

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function toKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
export function fromKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(key: string, n: number) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}
/** Monday of the week containing `key`. */
export function weekStart(key: string) {
  const d = fromKey(key);
  const offset = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - offset);
  return toKey(d);
}
/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(key: string) {
  return (fromKey(key).getDay() + 6) % 7;
}
export function daysBetween(a: string, b: string) {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000);
}

export const fmt = {
  /** "Thu" */
  dow: (key: string) => DAY_SHORT[fromKey(key).getDay()],
  /** "Thursday" */
  dowLong: (key: string) => DAY_LONG[fromKey(key).getDay()],
  /** "29" */
  dayNum: (key: string) => String(fromKey(key).getDate()),
  /** "Thu 29 Oct" */
  short: (key: string) => {
    const d = fromKey(key);
    return `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
  },
  /** "29 Oct" */
  dayMonth: (key: string) => {
    const d = fromKey(key);
    return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
  },
  /** "Thursday, 29 October" */
  long: (key: string) => {
    const d = fromKey(key);
    return `${DAY_LONG[d.getDay()]}, ${d.getDate()} ${MONTH_LONG[d.getMonth()]}`;
  },
  /** "15 March 2027" */
  full: (key: string) => {
    const d = fromKey(key);
    return `${d.getDate()} ${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
  },
  /** "15 Mar 2027" */
  medium: (key: string) => {
    const d = fromKey(key);
    return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  },
  monthYear: (key: string) => {
    const d = fromKey(key);
    return `${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
  },
  /** "26 Oct – 1 Nov 2026" */
  weekRange: (startKey: string, withYear = true) => {
    const a = fromKey(startKey);
    const b = fromKey(addDays(startKey, 6));
    const left = a.getMonth() === b.getMonth() ? `${a.getDate()}` : `${a.getDate()} ${MONTH_SHORT[a.getMonth()]}`;
    return `${left} – ${b.getDate()} ${MONTH_SHORT[b.getMonth()]}${withYear ? ` ${b.getFullYear()}` : ""}`;
  },
  /** "20:00" → "8:00 PM" */
  time: (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
  },
  /** "20:00" → "8 PM" */
  hour: (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
  },
  /** "8:00 – 9:00 PM" style range */
  range: (start: string, minutes: number) => {
    const end = addMinutes(start, minutes);
    const s = fmt.time(start);
    const e = fmt.time(end);
    const sameHalf = s.slice(-2) === e.slice(-2);
    return sameHalf ? `${s.slice(0, -3)} – ${e}` : `${s} – ${e}`;
  },
  /** Compact range used in calendar blocks: "9:00 – 4:30" */
  rangeCompact: (start: string, end: string) => `${fmt.time(start).slice(0, -3)} – ${fmt.time(end).slice(0, -3)}`,
  duration: (minutes: number) => (minutes % 60 === 0 && minutes >= 60 ? `${minutes / 60} h` : `${minutes} min`),
};

export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
export function fromMinutes(total: number) {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
export function addMinutes(hhmm: string, minutes: number) {
  return fromMinutes(toMinutes(hhmm) + minutes);
}

export function greeting(d: Date = NOW) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Simulated network delay for the mock API. */
export function wait(ms = 700) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
