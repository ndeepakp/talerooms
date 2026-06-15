import { describe, it, expect } from "vitest";
import {
  MAX_TITLE_WORDS,
  MAX_SUMMARY_CHARS,
  wordCount,
  htmlToText,
  normalizeChapters,
  validateStory,
} from "./story-validation";

describe("wordCount", () => {
  it("counts words, ignoring extra whitespace", () => {
    expect(wordCount("one two three")).toBe(3);
    expect(wordCount("  one   two  ")).toBe(2);
    expect(wordCount("line\nbreak\ttab")).toBe(3);
  });
  it("is zero for empty or whitespace-only", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("   \n\t ")).toBe(0);
  });
});

describe("htmlToText", () => {
  it("strips tags", () => {
    expect(htmlToText("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });
  it("turns <br> and block closes into newlines", () => {
    expect(htmlToText("a<br>b")).toBe("a\nb");
    expect(htmlToText("<p>a</p><p>b</p>")).toBe("a\nb");
  });
  it("decodes common entities", () => {
    expect(htmlToText("<p>Tom &amp; Jerry</p>")).toBe("Tom & Jerry");
    expect(htmlToText("<p>1 &lt; 2 &gt; 0</p>")).toBe("1 < 2 > 0");
    expect(htmlToText("<p>it&#39;s &quot;ok&quot;</p>")).toBe('it\'s "ok"');
    expect(htmlToText("<p>a&nbsp;b</p>")).toBe("a b");
  });
  it("trims the result", () => {
    expect(htmlToText("<p>  spaced  </p>")).toBe("spaced");
  });
});

describe("normalizeChapters", () => {
  it("returns [] for non-arrays", () => {
    expect(normalizeChapters(null)).toEqual([]);
    expect(normalizeChapters("nope")).toEqual([]);
  });
  it("drops chapters whose visible body is blank", () => {
    const out = normalizeChapters([
      { title: "A", body: "<p></p>" },
      { title: "B", body: "<p>real text</p>" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("B");
  });
  it("trims titles and maps empty titles to null", () => {
    const out = normalizeChapters([{ title: "  ", body: "<p>x</p>" }]);
    expect(out[0].title).toBeNull();
  });
  it("keeps only offered tiers in per-chapter prices", () => {
    const out = normalizeChapters(
      [{ title: "C", body: "<p>x</p>", prices: { "1h": 5, "1y": 9 } }],
      ["1h"],
    );
    expect(out[0].prices).toEqual({ "1h": 5 });
  });
});

describe("validateStory", () => {
  const ok = {
    title: "A fine title",
    summary: "A short summary.",
    chapters: [{ title: "One", body: "<p>hello</p>", prices: {} }],
    genres: [1, 2],
  };

  it("requires a title", () => {
    expect(validateStory("", ok.summary, ok.chapters, ok.genres, true)).toMatch(/title/i);
  });
  it("rejects an over-long title", () => {
    const longTitle = Array(MAX_TITLE_WORDS + 1).fill("w").join(" ");
    expect(validateStory(longTitle, ok.summary, ok.chapters, ok.genres, true)).toMatch(
      /words/i,
    );
  });
  it("rejects an over-long summary", () => {
    const longSummary = "x".repeat(MAX_SUMMARY_CHARS + 1);
    expect(validateStory(ok.title, longSummary, ok.chapters, ok.genres, true)).toMatch(
      /characters/i,
    );
  });

  it("passes a draft with only a valid title", () => {
    expect(validateStory("Just a title", "", undefined, [], false, { draft: true })).toBeNull();
  });

  it("requires a summary to publish", () => {
    expect(validateStory(ok.title, "", ok.chapters, ok.genres, true)).toMatch(/summary/i);
  });
  it("rejects non-array chapters when publishing", () => {
    expect(validateStory(ok.title, ok.summary, "oops", ok.genres, true)).toMatch(/chapters/i);
  });
  it("requires at least one genre to publish", () => {
    expect(validateStory(ok.title, ok.summary, ok.chapters, [], true)).toMatch(/genre/i);
  });
  it("requires the originality confirmation to publish", () => {
    expect(validateStory(ok.title, ok.summary, ok.chapters, ok.genres, false)).toMatch(
      /responsibility|originality/i,
    );
  });
  it("returns null for a fully valid published story", () => {
    expect(validateStory(ok.title, ok.summary, ok.chapters, ok.genres, true)).toBeNull();
  });
});
