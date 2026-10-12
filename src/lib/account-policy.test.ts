import { describe, expect, it } from "vitest";
import { accountIsActive, normalizeEmail } from "./account-policy";
const now = new Date("2026-10-11T00:00:00Z");
describe("account activation", () => {
  it("keeps new, unverified users inactive", () => expect(accountIsActive({ emailVerified: false }, now)).toBe(false));
  it("allows verified users without a grace window", () => expect(accountIsActive({ emailVerified: true }, now)).toBe(true));
  it("allows existing accounts only during their transition", () => {
    expect(accountIsActive({ emailVerified: false, verificationGraceUntil: "2026-10-12T00:00:00Z" }, now)).toBe(true);
    expect(accountIsActive({ emailVerified: false, verificationGraceUntil: now }, now)).toBe(false);
    expect(accountIsActive({ emailVerified: false, verificationGraceUntil: "invalid" }, now)).toBe(false);
  });
  it("normalizes email consistently", () => expect(normalizeEmail(" Reader@Example.Test ")).toBe("reader@example.test"));
});
