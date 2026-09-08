export type NormalizedFields = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: string;
  date_of_birth?: string;
  company?: string;
  payment_status?: string;
  customer_id?: string;
  salary?: string;
  city?: string;
  country?: string;
};

const ADDR_ABBREV: Record<string, string> = {
  st: "street",
  rd: "road",
  ave: "avenue",
  av: "avenue",
  blvd: "boulevard",
  ln: "lane",
  dr: "drive",
  ct: "court",
  pl: "place",
  apt: "apartment",
  ste: "suite",
  hwy: "highway",
  n: "north",
  s: "south",
  e: "east",
  w: "west",
};

export function normalizeName(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isPlausibleEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

export function normalizePhone(raw: string, defaultCountryCode = "+1"): string {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const cc = defaultCountryCode.replace(/\D/g, "") || "1";
  if (digits.length === 10) digits = cc + digits;
  if (digits.length === 11 && digits.startsWith("0")) digits = cc + digits.slice(1);
  if (digits.length === 12 && digits.startsWith("91")) {
    /* keep IN country code as-is */
  }
  return digits;
}

export function isPlausiblePhone(normalized: string): boolean {
  return normalized.length >= 10 && normalized.length <= 15;
}

export function normalizeAddress(raw: string): string {
  const tokens = raw
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((t) => ADDR_ABBREV[t.replace(/s$/, "")] ?? ADDR_ABBREV[t] ?? t);
  return tokens.join(" ");
}

export function normalizeDate(raw: string): string {
  const t = raw.trim();
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const mdY = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (mdY) {
    const a = Number(mdY[1]);
    const b = Number(mdY[2]);
    let y = Number(mdY[3]);
    if (y < 100) y += y > 30 ? 1900 : 2000;
    const month = a > 12 ? b : a;
    const day = a > 12 ? a : b;
    return `${String(y).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const parsed = Date.parse(t);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return t.toLowerCase();
}

export function normalizeNumber(raw: string): string {
  const n = raw.replace(/[^0-9.-]/g, "");
  const num = Number(n);
  return Number.isFinite(num) ? String(num) : raw.trim();
}

export function normalizeStatus(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (["active", "act", "enabled", "open", "yes", "true", "1"].includes(s)) return "active";
  if (["inactive", "disabled", "closed", "no", "false", "0"].includes(s)) return "inactive";
  if (["paid", "complete", "settled"].includes(s)) return "paid";
  if (["unpaid", "due", "pending", "overdue"].includes(s)) return "unpaid";
  return s;
}

export function normalizeField(field: string, raw: unknown, defaultCountryCode = "+1"): { raw: string; normalized: string } {
  if (raw === null || raw === undefined) return { raw: "", normalized: "" };
  const text = String(raw).trim();
  if (!text) return { raw: "", normalized: "" };
  switch (field) {
    case "name":
      return { raw: text, normalized: normalizeName(text) };
    case "email":
      return { raw: text, normalized: normalizeEmail(text) };
    case "phone":
      return { raw: text, normalized: normalizePhone(text, defaultCountryCode) };
    case "address":
    case "city":
    case "country":
      return { raw: text, normalized: normalizeAddress(text) };
    case "date_of_birth":
      return { raw: text, normalized: normalizeDate(text) };
    case "salary":
      return { raw: text, normalized: normalizeNumber(text) };
    case "status":
    case "payment_status":
      return { raw: text, normalized: normalizeStatus(text) };
    case "company":
      return { raw: text, normalized: normalizeName(text) };
    case "customer_id":
      return { raw: text, normalized: text.trim().toLowerCase() };
    default:
      return { raw: text, normalized: text.trim().toLowerCase() };
  }
}

export function normalizeMappedRow(
  mapped: Record<string, unknown>,
  defaultCountryCode = "+1",
): { raw: Record<string, string>; normalized: NormalizedFields } {
  const raw: Record<string, string> = {};
  const normalized: NormalizedFields = {};
  for (const [field, value] of Object.entries(mapped)) {
    const n = normalizeField(field, value, defaultCountryCode);
    raw[field] = n.raw;
    if (n.normalized) (normalized as Record<string, string>)[field] = n.normalized;
  }
  return { raw, normalized };
}
