export function taka(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  return `৳${value}`;
}

export function priceSpan(from: string | null, to: string | null) {
  if (!from || !to) {
    return "No selling price yet";
  }
  if (from === to) {
    return `৳${from}`;
  }
  return `৳${from} – ৳${to}`;
}

export function prettyDate(iso: string | null) {
  if (!iso) {
    return "—";
  }
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) {
    return iso;
  }
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
