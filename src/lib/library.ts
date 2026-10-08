export type LibraryProgress = {
  chapter_index: number | null;
  chapter_count: number;
  page_index: number | null;
  page_count: number | null;
  completed_chapter_count: number | null;
};
export type LibraryMembership = LibraryProgress & { purchased: boolean; collection_ids: string[]; title: string; author: string | null };
export type LibraryFilter = "all" | "reading" | "finished" | "purchased" | "collections";
export function isFinished(story: LibraryProgress) {
  return story.chapter_index !== null && story.chapter_count > 0 && story.completed_chapter_count !== null && story.completed_chapter_count >= story.chapter_count;
}
export function readingPosition(story: LibraryProgress) {
  if (isFinished(story)) return 100;
  if (story.chapter_index === null || story.chapter_count <= 0) return 0;
  const chapter = Math.max(0, Math.min(story.chapter_index, story.chapter_count - 1));
  const pages = story.page_count && story.page_count > 0 ? story.page_count : 1;
  const page = Math.max(0, Math.min(story.page_index ?? 0, pages - 1));
  // Each chapter has equal weight. This is a saved position, not words read.
  return Math.min(99, Math.floor((chapter + page / pages) / story.chapter_count * 100));
}
export function matchesLibrary(story: LibraryMembership, filter: LibraryFilter, search = "", collection = "") {
  const belongs = filter === "all" || (filter === "reading" && story.chapter_index !== null && !isFinished(story)) || (filter === "finished" && isFinished(story)) || (filter === "purchased" && story.purchased) || (filter === "collections" && story.collection_ids.length > 0);
  return belongs && (!collection || story.collection_ids.includes(collection)) && `${story.title} ${story.author ?? ""}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
}
export function libraryHref(story: { id: string; slug: string | null; chapter_index: number | null }) {
  return `/stories/${story.slug ?? story.id}${story.chapter_index !== null ? "#reading-room" : ""}`;
}
