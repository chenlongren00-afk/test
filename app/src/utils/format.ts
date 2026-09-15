export function money(value: number | string | undefined) {
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) return "$0";
  return `$${Math.round(amount ?? 0).toLocaleString("en-AU")}`;
}

export function compactDate(date: string | undefined, time?: string) {
  const cleaned = [date, time].filter(Boolean).join(" ");
  return cleaned.trim() || "Flexible";
}

export function taskStatusLabel(status: string | undefined) {
  return String(status || "open")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

export function initials(name: string | undefined) {
  const parts = String(name || "AH")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "AH";
}
