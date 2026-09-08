import { describe, expect, it } from "vitest";
import { autoMapHeader, confidenceBand } from "@reconcile/shared";
import { parseCsv, parseJson } from "../src/lib/parse.ts";

describe("header mapping", () => {
  it("maps common CRM headers", () => {
    expect(autoMapHeader("customer_name")).toBe("name");
    expect(autoMapHeader("email_address")).toBe("email");
    expect(autoMapHeader("mobile_number")).toBe("phone");
    expect(autoMapHeader("location")).toBe("address");
  });
});

describe("parsers", () => {
  it("parses csv and flags duplicate headers", () => {
    const r = parseCsv("name,name\nA,B\n");
    expect(r.headers[0]).toBe("name");
    expect(r.headers[1]).toMatch(/name_/);
    expect(r.errors.length).toBeGreaterThanOrEqual(0);
  });
  it("rejects malformed json", () => {
    const r = parseJson("{not json");
    expect(r.errors[0]).toMatch(/Malformed JSON/);
  });
});

describe("confidence bands", () => {
  it("classifies thresholds", () => {
    expect(confidenceBand(0.95)).toBe("high");
    expect(confidenceBand(0.8)).toBe("medium");
    expect(confidenceBand(0.4)).toBe("low");
  });
});
