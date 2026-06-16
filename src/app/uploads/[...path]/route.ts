import { readFile } from "fs/promises";
import nodePath from "path";

// Serves user-uploaded files (avatars, feed wallpapers, story covers) from the
// uploads volume. Next's standalone server only serves public/ files that
// existed at BUILD time, so runtime uploads 404 without this handler.
const ROOT = nodePath.join(process.cwd(), "public", "uploads");

const TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
};

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segs } = await params;
  const rel = nodePath.normalize(segs.join("/"));
  // Block path traversal — the resolved file must stay inside ROOT.
  const file = nodePath.join(ROOT, rel);
  if (rel.startsWith("..") || !file.startsWith(ROOT + nodePath.sep)) {
    return new Response("Not found", { status: 404 });
  }
  const type = TYPES[nodePath.extname(file).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });

  try {
    const buf = await readFile(file);
    return new Response(new Uint8Array(buf), {
      headers: {
        "content-type": type,
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
