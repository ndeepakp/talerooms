"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { validateStory, type Chapter } from "@/lib/story-validation";
import { DEFAULT_CURRENCY, TIERS, type Tier } from "@/lib/pricing";
import type { CoverStyle } from "@/lib/cover-style";
import { createStudioSaveQueue } from "@/lib/studio-save-queue";
import { newChapter, type EditStory, type PriceMap, type StudioChapter } from "./types";

type Match = { id: string; title: string; author: string | null; similarity: number };
function toDrafts(chapters: Chapter[]): StudioChapter[] {
  return chapters.map(c => ({ ...c, id: crypto.randomUUID(), title: c.title ?? "", prices: { ...(c.prices ?? {}) }, questions: c.questions ?? [], prompts: c.prompts ?? [] }));
}

export function useStoryStudio(story?: EditStory) {
  const router = useRouter();
  const [title, setTitle] = useState(story?.title ?? "");
  const [summary, setSummary] = useState(story?.summary ?? "");
  const [chapters, setChapters] = useState(() => toDrafts(story?.chapters ?? []));
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const initial = story?.chapters ?? [];
  const [format, setFormat] = useState<"single" | "chapters">(initial.length === 1 && !initial[0].title ? "single" : "chapters");
  const [selected, setSelected] = useState(story?.genreIds ?? []);
  const [chaptersPublic, setChaptersPublic] = useState(story?.chaptersPublic ?? false);
  const [previewPublic, setPreviewPublic] = useState(story?.previewPublic ?? false);
  const [offeredDurations, setOfferedDurations] = useState<Tier[]>(story?.offeredDurations ?? []);
  const [offerWhole, setOfferWhole] = useState(Object.keys(story?.wholePrices ?? {}).length > 0);
  const [wholePrices, setWholePrices] = useState<PriceMap>(story?.wholePrices ?? {});
  const [currency, setCurrency] = useState(story?.currency ?? DEFAULT_CURRENCY);
  const [coverUrl, setCoverUrl] = useState<string | null>(story?.coverUrl ?? null);
  const [coverStyle, setCoverStyle] = useState<CoverStyle | null>(story ? story.coverStyle : { palette: 0 });
  const [coverUploading, setCoverUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [confirmation, setConfirmation] = useState<{ title: string; message: string; label: string; action: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<null | "draft" | "publish">(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [autoStatus, setAutoStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveCycle, setSaveCycle] = useState(0);
  const [queue] = useState(() => createStudioSaveQueue());
  const savingRef = useRef(false);
  const manualRef = useRef(false);
  const leavingRef = useRef(false);
  const originId = story?.originId ?? null;
  const publishedEdit = !!originId;
  const publishId = originId ?? story?.id ?? null;
  const draftIdRef = useRef<string | null>(publishedEdit ? story?.status === "draft" ? story.id : null : story?.id ?? null);

  // This snapshot covers EVERY persisted field, including cover and currency.
  const payload = {
    title, summary,
    chapters: chapters.map(c => ({ title: c.title.trim() || null, body: c.body, prices: chaptersPublic ? {} : c.prices, questions: c.questions, prompts: c.prompts })),
    genreIds: selected, chaptersPublic, previewPublic: !chaptersPublic && previewPublic,
    offeredDurations: chaptersPublic ? [] : offeredDurations,
    wholePrices: chaptersPublic || !offerWhole ? {} : wholePrices,
    currency, coverUrl, coverStyle: coverUrl ? null : coverStyle,
  };
  const snapshot = JSON.stringify(payload);
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot);
  const dirty = snapshot !== savedSnapshot;

  useEffect(() => {
    function guard(e: BeforeUnloadEvent) {
      if (!dirty || leavingRef.current) return;
      e.preventDefault(); e.returnValue = "";
    }
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  // Protect navigation from the shared app header as well as Exit studio.
  useEffect(() => {
    function guardLink(e: MouseEvent) {
      if (!dirty || leavingRef.current || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault(); e.stopPropagation();
      setConfirmation({ title: "Leave your writing room?", message: "Your latest changes haven’t been saved. Save your draft first, or leave without saving them.", label: "Leave without saving", action: () => { leavingRef.current = true; router.push(url.pathname + url.search + url.hash); } });
    }
    document.addEventListener("click", guardLink, true);
    return () => document.removeEventListener("click", guardLink, true);
  }, [dirty, router]);

  function leave(href: string) {
    const action = () => { leavingRef.current = true; router.push(href); };
    if (dirty) { setConfirmation({ title: "Leave your writing room?", message: "Your latest changes haven’t been saved. Save your draft first, or leave without saving them.", label: "Leave without saving", action }); return; }
    action();
  }

  async function writeDraft(snap: string) {
    const data = JSON.parse(snap) as typeof payload;
    const invalid = validateStory(data.title, data.summary, data.chapters, data.genreIds, false, { draft: true });
    if (invalid) throw new Error(invalid);
    const target = draftIdRef.current;
    const res = await fetch(target ? `/api/stories/${target}` : "/api/stories", {
      method: target ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, status: "draft", ...(!target && publishedEdit ? { draftOf: publishId } : {}) }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.error ?? "Could not save your draft.");
    const id = result.id ?? target;
    if (!id) throw new Error("The draft could not be confirmed. Please try saving again.");
    draftIdRef.current = id;
    // Preserve the newly created draft on reload without remounting the editor.
    if (!target) window.history.replaceState(null, "", `/stories/${id}/edit`);
    setSavedSnapshot(snap); setSavedAt(new Date()); setAutoStatus("saved");
    return id as string;
  }

  // A save finishing retriggers the debounce when typing continued during it.
  // Manual saves/publishing pause autosave and share its request queue.
  useEffect(() => {
    if (!dirty || !title.trim() || loading || matches || importing || coverUploading || autoStatus === "error") return;
    const timer = setTimeout(() => {
      if (savingRef.current || manualRef.current) return;
      savingRef.current = true; setAutoStatus("saving");
      void queue(() => writeDraft(snapshot)).catch(() => setAutoStatus("error")).finally(() => {
        savingRef.current = false; setSaveCycle(c => c + 1);
      });
    }, 1500);
    return () => clearTimeout(timer);
    // writeDraft reads stable refs for save destinations; snapshot is the input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, dirty, title, loading, matches, importing, coverUploading, saveCycle, queue, autoStatus]);

  async function saveDraft() {
    if (manualRef.current || importing || coverUploading) return;
    manualRef.current = true; setLoading("draft"); setError(null);
    try { await queue(() => writeDraft(snapshot)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save your draft."); setAutoStatus("error"); }
    finally { manualRef.current = false; setLoading(null); setSaveCycle(c => c + 1); }
  }

  async function publish(decision?: "inspired" | "discard", inspiredById?: string) {
    if (manualRef.current || importing || coverUploading) return;
    const invalid = validateStory(title, summary, payload.chapters, selected, accepted);
    if (invalid) { setError(invalid); return; }
    manualRef.current = true; setLoading("publish"); setError(null);
    try {
      await queue(async () => {
        const target = publishId ?? draftIdRef.current;
        const res = await fetch(target ? `/api/stories/${target}` : "/api/stories", {
          method: target ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, accepted, status: "published", decision, inspiredById }),
        });
        const result = await res.json().catch(() => ({}));
        if (res.status === 409) { setMatches(result.matches as Match[]); return; }
        if (!res.ok) throw new Error(result.error ?? "Could not publish your story.");
        const finalId = result.id ?? target;
        if (!finalId) throw new Error("Publication could not be confirmed. Please try again.");
        if (publishedEdit && draftIdRef.current && draftIdRef.current !== finalId) {
          // Existing working-copy behaviour: remove the copy only after the live
          // update succeeded. A cleanup failure cannot undo successful publishing.
          await fetch(`/api/stories/${draftIdRef.current}`, { method: "DELETE" }).catch(() => {});
        }
        leavingRef.current = true; setSavedSnapshot(snapshot);
        router.push(`/stories/${finalId}`); router.refresh();
      });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not publish your story."); }
    finally { manualRef.current = false; setLoading(null); setSaveCycle(c => c + 1); }
  }

  function updateChapter(id: string, patch: Partial<StudioChapter>) {
    setChapters(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }
  function addChapter() {
    const chapter = newChapter(); setChapters(prev => [...prev, chapter]); setActiveChapterId(chapter.id);
  }
  function removeChapter(id: string) {
    const chapter = chapters.find(c => c.id === id);
    const action = () => setChapters(prev => prev.filter(c => c.id !== id));
    if (chapter && (chapter.body || chapter.title || chapter.questions.length || chapter.prompts.length)) {
      setConfirmation({ title: "Remove this chapter?", message: "Its text, quiz, prompts, and chapter prices will be removed from this draft.", label: "Remove chapter", action }); return;
    }
    action();
  }
  function moveChapter(index: number, direction: -1 | 1) {
    if (!activeChapterId && chapters[0]) setActiveChapterId(chapters[0].id);
    setChapters(prev => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev]; [next[index], next[target]] = [next[target], next[index]]; return next;
    });
  }
  function chooseFormat(next: "single" | "chapters") {
    if (next === format) return;
    const action = () => {
      if (next === "single") {
        const first = chapters[0] ?? newChapter();
        setChapters([{ ...first, title: "", body: chapters.map(c => c.body).filter(Boolean).join("\n"), questions: chapters.flatMap(c => c.questions), prompts: chapters.flatMap(c => c.prompts) }]);
        setActiveChapterId(first.id);
      }
      setFormat(next);
    };
    if (next === "single" && chapters.length > 1) {
      setConfirmation({ title: "Combine into a short story?", message: "All chapter text, quizzes, and prompts will be combined. Chapter titles are removed, and the first chapter’s prices are used.", label: "Combine chapters", action }); return;
    }
    action();
  }
  function toggleTier(t: Tier) { setOfferedDurations(prev => TIERS.filter(tier => tier === t ? !prev.includes(tier) : prev.includes(tier))); }
  function setChapterPrice(id: string, tier: Tier, price: number) {
    setChapters(prev => prev.map(c => c.id === id ? { ...c, prices: { ...c.prices, [tier]: price } } : c));
  }

  async function onCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    setCoverUploading(true); setError(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/uploads/cover", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not upload the cover image.");
      setCoverUrl(data.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not upload the cover image."); }
    finally { setCoverUploading(false); }
  }
  async function importDoc(file: File) {
    setImporting(true); setImportError(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/import/docx", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not import that document.");
      const imported = toDrafts(data.chapters ?? []);
      if (!imported.length) throw new Error("No readable content was found in that document.");
      if (!title.trim() && typeof data.title === "string") setTitle(data.title);
      if (!summary.trim() && typeof data.summary === "string") setSummary(data.summary);
      if (!chapters.length) {
        setChapters(imported); setFormat(imported.length === 1 && !imported[0].title ? "single" : "chapters");
      } else { setChapters(prev => [...prev, ...imported]); setFormat("chapters"); }
      setActiveChapterId(imported[0].id);
    } catch (e) { setImportError(e instanceof Error ? e.message : "Could not import that document."); }
    finally { setImporting(false); }
  }

  return { title, setTitle, summary, setSummary, chapters, activeChapterId, setActiveChapterId, format, chooseFormat,
    selected, setSelected, chaptersPublic, setChaptersPublic, previewPublic, setPreviewPublic,
    offeredDurations, setOfferedDurations, toggleTier, offerWhole, setOfferWhole, wholePrices, setWholePrices,
    currency, setCurrency, coverUrl, setCoverUrl, coverStyle, setCoverStyle, onCoverChange, coverUploading,
    importing, importDoc, importError, setImportError, accepted, setAccepted, error, setError, loading,
    confirmation, setConfirmation, matches, setMatches, autoStatus, savedAt, dirty, publishedEdit, leave, saveDraft, publish,
    addChapter, removeChapter, moveChapter, updateChapter, setChapterPrice };
}
export type StoryStudio = ReturnType<typeof useStoryStudio>;
