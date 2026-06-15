import { describe, it, expect } from "vitest";
import { RESERVED_HANDLES, isReservedHandle } from "./handles";

describe("isReservedHandle", () => {
  it("flags every reserved word", () => {
    for (const h of RESERVED_HANDLES) expect(isReservedHandle(h)).toBe(true);
  });
  it("is case-insensitive and trims", () => {
    expect(isReservedHandle("FEED")).toBe(true);
    expect(isReservedHandle("  Settings  ")).toBe(true);
  });
  it("allows ordinary handles", () => {
    expect(isReservedHandle("deepak")).toBe(false);
    expect(isReservedHandle("storyteller42")).toBe(false);
  });
});
