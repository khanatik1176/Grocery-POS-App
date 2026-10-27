/** Formats a taka string from the API ("1234.50") as "৳1,234.50". */
export function taka(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "—";
  }
  const sign = amount < 0 ? "-" : "";
  const [whole, fraction] = Math.abs(amount).toFixed(2).split(".");
  return `${sign}৳${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction}`;
}

/** Whole-taka form for compact tiles and chart labels. */
export function takaShort(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  if (Math.abs(amount) >= 100000) {
    return `৳${(amount / 100000).toFixed(1)}L`;
  }
  if (Math.abs(amount) >= 1000) {
    return `৳${(amount / 1000).toFixed(1)}k`;
  }
  return `৳${Math.round(amount)}`;
}

export function priceSpan(from: string | null, to: string | null) {
  if (!from || !to) {
    return "No price yet";
  }
  if (from === to) {
    return taka(from);
  }
  return `${taka(from)} – ${taka(to)}`;
}

export function fromIso(iso: string | null | undefined) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return null;
  }
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toIso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayIso() {
  return toIso(new Date());
}

export function addDays(iso: string, days: number) {
  const date = fromIso(iso) ?? new Date();
  date.setDate(date.getDate() + days);
  return toIso(date);
}

export function prettyDate(iso: string | null | undefined) {
  const date = fromIso(iso);
  if (!date) {
    return "—";
  }
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function shortDate(iso: string) {
  const date = fromIso(iso);
  if (!date) {
    return iso;
  }
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function prettyTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Whole days from today until the given date; negative when it has passed. */
export function daysUntil(iso: string) {
  const target = fromIso(iso);
  if (!target) {
    return 0;
  }
  const today = fromIso(todayIso())!;
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** A Bangladeshi mobile as 01XXXXXXXXX, accepting +880/880 prefixes, spaces, and dashes; null if invalid. */
export function normalizeMobile(raw: string) {
  let digits = raw.replace(/[\s-]/g, "");
  if (digits.startsWith("+880")) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith("880")) digits = `0${digits.slice(3)}`;
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null;
}

export function isEmail(raw: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim());
}

export const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
};
