import { describe, expect, it } from "vitest";
import {
  clusterRecords,
  detectFieldConflict,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  recommendValue,
  trainLogistic,
} from "../src/index";

describe("normalization", () => {
  it("makes name variants comparable", () => {
    expect(normalizeName("Raj Kumar")).toBe("raj kumar");
    expect(normalizeName("RAJ KUMAR")).toBe("raj kumar");
    expect(normalizeName("Raj Kumar ")).toBe("raj kumar");
    expect(normalizeName("Rajkumar").replace(" ", "")).toBe("rajkumar");
  });
  it("normalizes email and phone", () => {
    expect(normalizeEmail("  Raj@Gmail.com ")).toBe("raj@gmail.com");
    expect(normalizePhone("98765 43210", "+91")).toBe("919876543210");
  });
});

describe("entity matching", () => {
  it("clusters Raj Kumar variants as one entity", () => {
    const records = [
      { id: "1", sourceId: "crm", fields: { name: "raj kumar", email: "raj@gmail.com", phone: "919876543210", address: "chennai" } },
      { id: "2", sourceId: "erp", fields: { name: "rajkumar", email: "raj@gmail.com", phone: "919876543210", address: "chennai" } },
      { id: "3", sourceId: "bill", fields: { name: "r kumar", email: "raj@gmail.com", phone: "919876543210", address: "chennai" } },
      { id: "4", sourceId: "crm", fields: { name: "anita sharma", email: "anita@x.com", phone: "911111111111", address: "delhi" } },
    ];
    const { clusters } = clusterRecords(records);
    const raj = clusters.find((c) => c.recordIds.includes("1"));
    expect(raj?.recordIds.sort()).toEqual(["1", "2", "3"]);
    expect(raj!.score).toBeGreaterThan(0.85);
    expect(clusters.some((c) => c.recordIds.includes("4") && c.recordIds.includes("1"))).toBe(false);
  });
});

describe("conflicts and recommend", () => {
  it("does not treat missing as conflict", () => {
    const r = detectFieldConflict("phone", [
      { sourceRecordId: "a", sourceId: "1", sourceName: "CRM", reliability: 90, rawValue: "987", normalizedValue: "987", updatedAt: new Date() },
      { sourceRecordId: "b", sourceId: "2", sourceName: "ERP", reliability: 80, rawValue: "", normalizedValue: "", updatedAt: new Date() },
    ]);
    expect(r.isConflict).toBe(false);
  });

  it("recommends agreed recent CRM phone", () => {
    const now = new Date("2026-09-07");
    const rec = recommendValue(
      "phone",
      [
        {
          sourceRecordId: "a",
          sourceId: "crm",
          sourceName: "CRM",
          reliability: 95,
          rawValue: "9876543210",
          normalizedValue: "9876543210",
          updatedAt: new Date("2026-09-05"),
        },
        {
          sourceRecordId: "b",
          sourceId: "erp",
          sourceName: "ERP",
          reliability: 85,
          rawValue: "9876543210",
          normalizedValue: "9876543210",
          updatedAt: new Date("2026-08-28"),
        },
        {
          sourceRecordId: "c",
          sourceId: "bill",
          sourceName: "Billing",
          reliability: 60,
          rawValue: "9123456780",
          normalizedValue: "9123456780",
          updatedAt: new Date("2025-03-01"),
        },
      ],
      [
        { sourceId: "crm", fieldName: "phone", authorityScore: 95, priorityRank: 1 },
        { sourceId: "erp", fieldName: "phone", authorityScore: 80, priorityRank: 2 },
      ],
      now,
    );
    expect(rec?.value).toBe("9876543210");
    expect(rec!.confidence).toBeGreaterThan(0.8);
    expect(rec!.explanation.toLowerCase()).toMatch(/agree|authority|older/);
  });
});

describe("ml training gate", () => {
  it("does not train below 20 samples", () => {
    expect(trainLogistic([{ features: [1, 0], label: 1 }])).toBeNull();
  });
});
