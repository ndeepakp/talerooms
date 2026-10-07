import type { Chapter, Question } from "@/lib/story-validation";
import type { CoverStyle } from "@/lib/cover-style";
import type { Tier } from "@/lib/pricing";

export type Genre = { id: number; name: string };
export type PriceMap = Partial<Record<Tier, number>>;
export type StudioChapter = { id: string; title: string; body: string; prices: PriceMap; questions: Question[]; prompts: string[] };
export type EditStory = {
  id: string; title: string; summary: string; chapters: Chapter[]; genreIds: number[];
  status: "draft" | "published"; chaptersPublic: boolean; previewPublic: boolean;
  offeredDurations: Tier[]; wholePrices: PriceMap; currency: string;
  coverUrl: string | null; coverStyle: CoverStyle | null; originId?: string | null;
};
export const STUDIO_STEPS = [
  { label: "Story", title: "Every story starts somewhere.", description: "Give yours a name, a hook, and a cover that feels like you." },
  { label: "Manuscript", title: "Make room for your imagination.", description: "One chapter at a time. Your words take centre stage." },
  { label: "Access", title: "Choose how readers find you.", description: "Set who can read your work and the access options you offer." },
  { label: "Publish", title: "Your story. Ready for its people.", description: "Review the details, confirm originality, and make it yours." },
] as const;
export const ORIGINALITY_NOTE = "I take full responsibility for the originality of this content, and I confirm this story is not available outside TALEROOMS to avoid plagiarism. If it appears anywhere else, it was made available by me.";
export function newChapter(): StudioChapter {
  return { id: crypto.randomUUID(), title: "", body: "", prices: {}, questions: [], prompts: [] };
}
