import { describe, expect, it } from "vitest";
import { ageFrom, fromMillimes, slugify, toCsv, toMillimes } from "@onet/shared";

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

  it("neutralises spreadsheet formulas in text cells, not numbers", () => {
    const row = (v: string | number) => toCsv([[v]]).slice(1);
    expect(row("=HYPERLINK(\"http://x\",\"a\")")).toBe(`"'=HYPERLINK(""http://x"",""a"")"`);
    expect(row("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0");
    expect(row("-2+3")).toBe("'-2+3");
    expect(row("@SUM(A1:A9)")).toBe("'@SUM(A1:A9)");
    expect(row("\t=1")).toBe("'\t=1");
    expect(row("\r=1")).toBe(`"'\r=1"`);
    // Values stay values: numbers, signed numbers formatted as text, ordinary text.
    expect(row(-12.5)).toBe("-12.5");
    expect(row("-12.500")).toBe("-12.500");
    expect(row("Ben Ali")).toBe("Ben Ali");
    expect(row("a=b")).toBe("a=b");
    // A phone typed with "+" is kept as text (Excel shows it without the quote).
    expect(row("+216 22 345 678")).toBe("'+216 22 345 678");
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
