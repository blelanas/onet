import { describe, expect, it } from "vitest";
import { fromMillimes, toMillimes } from "@/lib/money";
import { toCsv } from "@/lib/csv";
import { ageFrom, slugify } from "@/lib/utils";

describe("money", () => {
  it("converts TND to integer millimes without float drift", () => {
    expect(toMillimes(35)).toBe(35000);
    expect(toMillimes("12,500")).toBe(12500);
    expect(toMillimes("0.1")).toBe(100);
    expect(toMillimes("abc")).toBe(0);
    expect(fromMillimes(180000)).toBe(180);
  });
});

describe("csv", () => {
  it("escapes separators and quotes and starts with a BOM", () => {
    const csv = toCsv([["a", 'say "hi"', "x,y"], [1, null, "طبلبة"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('a,"say ""hi""","x,y"\r\n1,,طبلبة');
  });
});

describe("utils", () => {
  it("computes ages", () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 10);
    d.setDate(d.getDate() - 1);
    expect(ageFrom(d)).toBe(10);
    expect(ageFrom(null)).toBeNull();
  });
  it("slugifies accented French", () => {
    expect(slugify("Fête de l'enfance — Journée")).toBe("fete-de-l-enfance-journee");
  });
});
