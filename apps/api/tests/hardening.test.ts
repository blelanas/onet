import { describe, expect, it } from "vitest";
import { parseFormDate, toDateTimeInput, zonedTimeToDate } from "@onet/shared";
import { zs } from "@api/lib/actions";
import { isStrongPassword, verifyDummyPassword } from "@api/lib/auth/password";
import { mockPaymentsAllowed } from "@api/lib/services/payments";
import { sniff } from "@api/lib/uploads";

describe("form dates (Africa/Tunis wall time)", () => {
  it("parses offset-less datetime-local values as Tunisian time, whatever the server zone", () => {
    expect(parseFormDate("2026-10-03T14:00").toISOString()).toBe("2026-10-03T13:00:00.000Z");
    expect(parseFormDate("2026-07-01T00:30:15").toISOString()).toBe("2026-06-30T23:30:15.000Z");
    expect(zs.reqDate.parse("2026-01-15T09:05").toISOString()).toBe("2026-01-15T08:05:00.000Z");
  });

  it("keeps explicit offsets and date-only values unchanged", () => {
    expect(parseFormDate("2026-10-03T14:00:00Z").toISOString()).toBe("2026-10-03T14:00:00.000Z");
    expect(parseFormDate("2026-10-03").toISOString()).toBe("2026-10-03T00:00:00.000Z");
    expect(Number.isNaN(parseFormDate("2026-13-03T10:00").getTime())).toBe(true);
  });

  it("round-trips with toDateTimeInput", () => {
    expect(toDateTimeInput(new Date("2026-10-03T13:00:00Z"))).toBe("2026-10-03T14:00");
    expect(toDateTimeInput(parseFormDate("2026-12-31T23:45"))).toBe("2026-12-31T23:45");
    expect(zonedTimeToDate(2026, 3, 1, 23, 59, 59, 999).toISOString()).toBe("2026-03-01T22:59:59.999Z");
  });
});

describe("passwords", () => {
  it("rejects passwords bcrypt would truncate (> 72 UTF-8 bytes)", () => {
    expect(isStrongPassword("abc12345")).toBe(true);
    expect(isStrongPassword("a1" + "x".repeat(70))).toBe(true);
    expect(isStrongPassword("a1" + "x".repeat(71))).toBe(false);
    expect(isStrongPassword("a1" + "é".repeat(36))).toBe(false); // 38 chars, 74 bytes
  });

  it("dummy verification always fails", async () => {
    expect(await verifyDummyPassword("whatever1")).toBe(false);
  });
});

describe("mock payments", () => {
  it("are refused in production unless explicitly allowed", () => {
    expect(mockPaymentsAllowed({ NODE_ENV: "development" })).toBe(true);
    expect(mockPaymentsAllowed({ NODE_ENV: "production" })).toBe(false);
    expect(mockPaymentsAllowed({ NODE_ENV: "production", ALLOW_MOCK_PAYMENTS: "1" })).toBe(false);
    expect(mockPaymentsAllowed({ NODE_ENV: "production", ALLOW_MOCK_PAYMENTS: "true" })).toBe(true);
  });
});

describe("upload sniffing", () => {
  const bytes = (...parts: (string | number[])[]) => Buffer.concat(parts.map((p) => (typeof p === "string" ? Buffer.from(p, "latin1") : Buffer.from(p))));
  it("accepts real media signatures", () => {
    expect(sniff(bytes("ID3", [4, 0]), "audio/mpeg")).toBe(true);
    expect(sniff(bytes([0xff, 0xfb, 0x90]), "audio/mp3")).toBe(true);
    expect(sniff(bytes("OggS", [0]), "audio/ogg")).toBe(true);
    expect(sniff(bytes("RIFF", [0, 0, 0, 0], "WAVE"), "audio/wav")).toBe(true);
    expect(sniff(bytes([0, 0, 0, 0x20], "ftypM4A "), "audio/x-m4a")).toBe(true);
    expect(sniff(bytes([0, 0, 0, 0x18], "ftypmp42"), "video/mp4")).toBe(true);
    expect(sniff(bytes([0x1a, 0x45, 0xdf, 0xa3]), "video/webm")).toBe(true);
  });
  it("rejects other content claiming a media type", () => {
    expect(sniff(bytes("MZ", [0x90, 0]), "audio/mpeg")).toBe(false);
    expect(sniff(bytes("RIFF", [0, 0, 0, 0], "WEBP"), "audio/wav")).toBe(false);
    expect(sniff(bytes("<html>"), "video/mp4")).toBe(false);
    expect(sniff(bytes(""), "video/webm")).toBe(false);
    expect(sniff(bytes("anything"), "application/x-unknown")).toBe(false);
  });
});
