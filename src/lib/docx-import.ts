// Helpers for turning an uploaded .docx into a story. Word "Heading 1" styles
// become chapter boundaries (heading text = chapter title; the content in
// between = that chapter's rich-text body). Any text *before* the first heading
// becomes the story summary.
import { type Question } from "@/lib/story-validation";

export type ImportedChapter = {
  title: string | null;
  body: string;
  questions: Question[];
};

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function questionId(): string {
  return `q-${Math.random().toString(36).slice(2, 10)}`;
}

// Decode the few HTML entities mammoth emits in text.
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Trim plain text to at most `maxWords` words (adds an ellipsis if shortened).
function clampWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(" ") + "…";
}

// Remove anything we don't want to store/render from author-uploaded HTML:
// scripts/styles, embedded images (docx images come through as huge base64),
// and inline event handlers.
export function sanitizeImportedHtml(html: string): string {
  return html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*img[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
}

// True for a chapter's "Q&A" / "Questions" heading text.
function isQnaLabel(text: string): boolean {
  return /^(q\s*&\s*a|q\s*and\s*a|questions?|reader\s*q\s*&\s*a)\s*:?$/i.test(
    text.trim(),
  );
}

// Parse the HTML that follows a chapter's "Q&A" heading into questions. Each
// <p> is a question prompt; a <ul>/<ol> right after it supplies multiple-choice
// options (2+ options → mcq, otherwise the question stays open-ended).
function parseQnaBlock(html: string): Question[] {
  const out: Question[] = [];
  let current: { prompt: string; options: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const isMcq = current.options.length >= 2;
    out.push({
      id: questionId(),
      type: isMcq ? "mcq" : "open",
      prompt: current.prompt.slice(0, 500),
      options: isMcq ? current.options : [],
    });
    current = null;
  };

  const tokenRe = /<(p|ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(html)) !== null) {
    const tag = m[1].toLowerCase();
    if (tag === "p") {
      const prompt = decodeEntities(stripTags(m[2]));
      if (!prompt) continue;
      flush();
      current = { prompt, options: [] };
    } else if (current) {
      const opts: string[] = [];
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let li: RegExpExecArray | null;
      while ((li = liRe.exec(m[2])) !== null) {
        const o = decodeEntities(stripTags(li[1]));
        if (o) opts.push(o);
      }
      current.options = opts.slice(0, 8);
    }
  }
  flush();
  return out.slice(0, 12);
}

// Split a chapter body at its (optional) "Q&A" heading, returning the readable
// body plus any parsed questions.
function extractQuestions(body: string): { body: string; questions: Question[] } {
  const re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    if (isQnaLabel(decodeEntities(stripTags(m[1])))) {
      const clean = body.slice(0, m.index).trim();
      const questions = parseQnaBlock(body.slice(re.lastIndex));
      return { body: clean || "<p></p>", questions };
    }
  }
  return { body, questions: [] };
}

// Parse sanitized docx HTML into a story summary + chapters.
//   - Each top-level <h1> starts a new chapter (heading = title).
//   - Text before the first heading becomes the summary, returned verbatim so
//     the caller can enforce the word limit (and fail the import if exceeded).
//   - If there's no such preamble, a short blurb is derived from the opening of
//     the first chapter so the summary is never empty (this one is pre-trimmed).
//   - With no headings at all, the whole document is a single chapter.
export function parseDocx(html: string): {
  summary: string | null;
  chapters: ImportedChapter[];
} {
  const segments = html
    .split(/(?=<h1[\s>])/i)
    .map((s) => s.trim())
    .filter(Boolean);

  let summary: string | null = null;
  const chapters: ImportedChapter[] = [];

  for (const seg of segments) {
    const m = seg.match(/^<h1[^>]*>([\s\S]*?)<\/h1>([\s\S]*)$/i);
    if (m) {
      const title = decodeEntities(stripTags(m[1])).slice(0, 200) || null;
      const { body, questions } = extractQuestions(m[2].trim());
      chapters.push({ title, body: body || "<p></p>", questions });
    } else {
      // Preamble before the first heading → the story summary. Returned as-is
      // (no truncation) so the caller can validate it against the word limit.
      const text = decodeEntities(stripTags(seg));
      if (text) summary = text;
    }
  }

  if (chapters.length === 0 && stripTags(html)) {
    const { body, questions } = extractQuestions(html);
    chapters.push({ title: null, body, questions });
  }

  // No explicit summary → derive a short one from the first chapter's opening.
  if (!summary && chapters.length > 0) {
    const firstText = decodeEntities(stripTags(chapters[0].body));
    if (firstText) summary = clampWords(firstText, 40);
  }

  return { summary, chapters };
}
