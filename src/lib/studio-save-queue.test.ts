import { describe, expect, it } from "vitest";
import { createStudioSaveQueue } from "./studio-save-queue";

describe("studio save ordering", () => {
  it("waits for draft creation before publishing against its returned id", async () => {
    const enqueue = createStudioSaveQueue();
    let finish!: () => void;
    const gate = new Promise<void>(resolve => { finish = resolve; });
    let draftId: string | null = null;
    const writes: string[] = [];
    const autoSave = enqueue(async () => { writes.push("create draft"); await gate; draftId = "saved-draft"; });
    const publish = enqueue(async () => { writes.push(`publish ${draftId}`); });
    await Promise.resolve();
    expect(writes).toEqual(["create draft"]);
    finish(); await Promise.all([autoSave,publish]);
    expect(writes).toEqual(["create draft","publish saved-draft"]);
  });
  it("allows an explicit retry after a failed autosave", async () => {
    const enqueue = createStudioSaveQueue();
    await expect(enqueue(async () => { throw new Error("offline"); })).rejects.toThrow("offline");
    await expect(enqueue(async () => "saved")).resolves.toBe("saved");
  });
});
