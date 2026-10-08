import { describe, expect, it } from "vitest";
import { isFinished, libraryHref, matchesLibrary, readingPosition, type LibraryMembership } from "./library";
const book = (fields: Partial<LibraryMembership> = {}): LibraryMembership => ({ title: "Paper Moons", author: "Maya Chen", chapter_index: 1, chapter_count: 4, page_index: 2, page_count: 4, completed_chapter_count: null, purchased: false, collection_ids: [], ...fields });
describe("library reading state", () => {
  it("uses page position, preserves legacy bookmarks and clamps stale indices", () => {
    expect(readingPosition(book())).toBe(37);
    expect(readingPosition(book({ page_count: null }))).toBe(25);
    expect(readingPosition(book({ chapter_index: 20, page_index: 50 }))).toBe(93);
    expect(readingPosition(book({ chapter_count: 0 }))).toBe(0);
    expect(readingPosition(book({ chapter_index: null }))).toBe(0);
  });
  it("does not finish on opening the last page; new chapters reopen finished books", () => {
    expect(isFinished(book({ chapter_index: 3, page_index: 3 }))).toBe(false);
    const finished = book({ completed_chapter_count: 4 });
    expect(isFinished(finished)).toBe(true);
    expect(readingPosition(finished)).toBe(100);
    expect(isFinished({ ...finished, chapter_count: 5 })).toBe(false);
    expect(matchesLibrary({ ...finished, chapter_count: 5 }, "reading")).toBe(true);
  });
  it("restores the saved page without an explicit chapter override", () => {
    expect(libraryHref({ id: "id", slug: "paper-moons", chapter_index: 2 })).toBe("/stories/paper-moons#reading-room");
    expect(libraryHref({ id: "id", slug: null, chapter_index: null })).toBe("/stories/id");
  });
});
describe("library shelves", () => {
  it("separates unread collections, in-progress, completed and purchases", () => {
    const saved = book({ chapter_index: null, collection_ids: ["mine"] });
    expect(matchesLibrary(saved, "all")).toBe(true);
    expect(matchesLibrary(saved, "reading")).toBe(false);
    expect(matchesLibrary(saved, "collections", " CHEN ", "mine")).toBe(true);
    expect(matchesLibrary(saved, "collections", "", "other")).toBe(false);
    expect(matchesLibrary(book({ purchased: true }), "purchased", "moons")).toBe(true);
    expect(matchesLibrary(book(), "purchased")).toBe(false);
    expect(matchesLibrary(book({ completed_chapter_count: 4 }), "finished")).toBe(true);
    expect(matchesLibrary(book({ completed_chapter_count: 4 }), "reading")).toBe(false);
  });
});
