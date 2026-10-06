import { describe, expect, it } from "vitest";
import { clampChapter, publicChapterReadable, summarizeRatings } from "./story-overview";

describe("public chapter access", () => {
  it("exposes only the first chapter when preview is enabled", () => {
    expect(publicChapterReadable(0, false, true)).toBe(true);
    expect(publicChapterReadable(1, false, true)).toBe(false);
    expect(publicChapterReadable(0, false, false)).toBe(false);
  });
  it("allows free chapters but rejects invalid indices", () => {
    expect(publicChapterReadable(12, true, false)).toBe(true);
    expect(publicChapterReadable(-1, true, true)).toBe(false);
    expect(publicChapterReadable(NaN, true, true)).toBe(false);
  });
  it("clamps stale or malformed chapter destinations", () => {
    expect(clampChapter(200, 3)).toBe(2);
    expect(clampChapter(-2, 3)).toBe(0);
    expect(clampChapter(NaN, 3)).toBe(0);
    expect(clampChapter(3, 0)).toBe(0);
  });
});

describe("rating summaries", () => {
  it("weights grouped scores and bins half-stars without rounding the average first", () => {
    expect(summarizeRatings([{ stars: 4.5, count: 2 }, { stars: 3, count: 1 }, { stars: .5, count: 1 }])).toEqual({count:4,average:3.1,bins:[1,0,1,0,2]});
  });
  it("handles zero ratings and ignores malformed aggregate values", () => {
    expect(summarizeRatings([{stars:NaN,count:5},{stars:6,count:1},{stars:4.3,count:2},{stars:5,count:-1}])).toEqual({count:0,average:null,bins:[0,0,0,0,0]});
  });
});
