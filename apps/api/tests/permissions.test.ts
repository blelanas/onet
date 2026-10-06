import { describe, expect, it } from "vitest";
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, ROLE_KEYS } from "@onet/shared";

describe("default role grants", () => {
  it("super admin has every permission", () => {
    expect(new Set(DEFAULT_ROLE_PERMISSIONS.super_admin)).toEqual(new Set(ALL_PERMISSIONS));
  });

  it("only references known permissions", () => {
    for (const r of ROLE_KEYS) for (const p of DEFAULT_ROLE_PERMISSIONS[r]) expect(ALL_PERMISSIONS).toContain(p);
  });

  it("never gives kids financial, messaging or people-directory access", () => {
    const kid = DEFAULT_ROLE_PERMISSIONS.kid;
    for (const p of ["finance.read", "invoices.pay", "messages.use", "members.read", "members.read_all", "documents.read"]) expect(kid).not.toContain(p);
  });

  it("keeps the accountant out of unrelated administration", () => {
    const acc = DEFAULT_ROLE_PERMISSIONS.accountant;
    for (const p of ["users.manage", "roles.manage", "settings.manage", "members.manage", "events.manage", "trips.manage"]) expect(acc).not.toContain(p);
    expect(acc).toContain("finance.manage");
  });

  it("parents can pay and register but not manage", () => {
    const parent = DEFAULT_ROLE_PERMISSIONS.parent;
    expect(parent).toEqual(expect.arrayContaining(["invoices.pay", "events.register", "trips.register"]));
    expect(parent.some((p) => p.endsWith(".manage"))).toBe(false);
    expect(parent).not.toContain("members.read_all");
  });

  it("admin cannot edit roles or post accounting entries", () => {
    expect(DEFAULT_ROLE_PERMISSIONS.admin).not.toContain("roles.manage");
    expect(DEFAULT_ROLE_PERMISSIONS.admin).not.toContain("finance.manage");
  });
});
