export type RatingGroup = { stars: number; count: number };

/** Keep half-star scores explicit rather than presenting a 4.5 as a 5-star vote. */
export function summarizeRatings(groups: RatingGroup[]) {
  const bins = [0, 0, 0, 0, 0];
  let total = 0, weighted = 0;
  for (const { stars, count } of groups) {
    if (!Number.isFinite(stars) || stars < .5 || stars > 5 || !Number.isInteger(stars * 2) || !Number.isInteger(count) || count < 1) continue;
    bins[Math.ceil(stars) - 1] += count;
    total += count;
    weighted += stars * count;
  }
  return { count: total, average: total ? Math.round(weighted / total * 10) / 10 : null, bins };
}

export function publicChapterReadable(index: number, chaptersPublic: boolean, previewPublic: boolean) {
  return Number.isInteger(index) && index >= 0 && (chaptersPublic || (index === 0 && previewPublic));
}

export function clampChapter(index: number, count: number) {
  return Number.isFinite(index) ? Math.min(Math.max(0, Math.floor(index)), Math.max(0, count - 1)) : 0;
}
