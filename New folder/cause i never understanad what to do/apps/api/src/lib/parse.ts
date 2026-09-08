import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ParsedTable = { headers: string[]; rows: Record<string, unknown>[]; errors: string[] };

function uniqueHeaders(headers: string[]): { headers: string[]; errors: string[] } {
  const errors: string[] = [];
  const seen = new Map<string, number>();
  const out = headers.map((h, i) => {
    const base = (h || `column_${i + 1}`).trim() || `column_${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    if (n > 1) {
      errors.push(`Duplicate header "${base}" renamed to "${base}_${n}"`);
      return `${base}_${n}`;
    }
    return base;
  });
  return { headers: out, errors };
}

export function parseCsv(text: string): ParsedTable {
  const errors: string[] = [];
  const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: "greedy" });
  if (parsed.errors.length) {
    for (const e of parsed.errors.slice(0, 20)) errors.push(`CSV row ${e.row}: ${e.message}`);
  }
  const fields = parsed.meta.fields ?? [];
  if (!fields.length) return { headers: [], rows: [], errors: ["No columns detected. File may be empty or invalid CSV."] };
  const { headers, errors: hErr } = uniqueHeaders(fields);
  const rows = parsed.data.map((row) => {
    const o: Record<string, unknown> = {};
    fields.forEach((f, i) => {
      o[headers[i]!] = row[f];
    });
    return o;
  });
  return { headers, rows, errors: [...hErr, ...errors] };
}

export function parseJson(text: string): ParsedTable {
  try {
    const data = JSON.parse(text) as unknown;
    const arr = Array.isArray(data) ? data : data && typeof data === "object" && Array.isArray((data as { records?: unknown }).records)
      ? (data as { records: unknown[] }).records
      : null;
    if (!arr) return { headers: [], rows: [], errors: ["JSON must be an array of objects."] };
    const rows = arr.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
    const headerSet = new Set<string>();
    for (const r of rows) Object.keys(r).forEach((k) => headerSet.add(k));
    const { headers, errors } = uniqueHeaders([...headerSet]);
    return { headers, rows, errors };
  } catch (e) {
    return { headers: [], rows: [], errors: [`Malformed JSON: ${(e as Error).message}`] };
  }
}

export function parseXlsx(buf: Buffer): ParsedTable {
  try {
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return { headers: [], rows: [], errors: ["Workbook has no sheets."] };
    const sheet = wb.Sheets[sheetName]!;
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const headerSet = new Set<string>();
    for (const r of json) Object.keys(r).forEach((k) => headerSet.add(k));
    const { headers, errors } = uniqueHeaders([...headerSet]);
    if (!headers.length) return { headers: [], rows: [], errors: ["No columns detected in spreadsheet."] };
    return { headers, rows: json, errors };
  } catch (e) {
    return { headers: [], rows: [], errors: [`Invalid XLSX: ${(e as Error).message}`] };
  }
}

export function parseUpload(filename: string, buf: Buffer): ParsedTable {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) return parseCsv(buf.toString("utf8"));
  if (lower.endsWith(".json")) return parseJson(buf.toString("utf8"));
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return parseXlsx(buf);
  return { headers: [], rows: [], errors: ["Unsupported file type. Use CSV, XLSX, or JSON."] };
}
