import { NextResponse } from "next/server";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { getSession } from "@/lib/auth";

// File writes need the Node runtime (not edge).
export const runtime = "nodejs";
// No upload size cap — admins post full-resolution photos and raw video.
export const maxDuration = 300;

const EXT: Record<string, string> = {
  // images
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/tiff": "tiff",
  // video
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
  "video/x-matroska": "mkv",
  "video/x-msvideo": "avi",
  "video/mpeg": "mpeg",
  "video/ogg": "ogv",
};

/**
 * Admin media upload. Saves the file under public/uploads (which lives on the
 * server's bind-mounted volume, so uploads survive `unzip -o` redeploys) and
 * returns a site-relative URL to store on the artwork.
 *
 * Accepts images and video at any size — the file is streamed to disk rather
 * than buffered, so a large video does not have to fit in memory twice.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // fall back to the file's own extension for the odd container the browser
  // reports with a generic mime type (e.g. application/octet-stream)
  const ext =
    EXT[file.type] ??
    (file.type.startsWith("image/") || file.type.startsWith("video/")
      ? path.extname(file.name).slice(1).toLowerCase()
      : undefined);
  if (!ext) {
    return NextResponse.json(
      { error: "Unsupported file type — images and video only" },
      { status: 415 }
    );
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });

  const name = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  await pipeline(
    Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]),
    createWriteStream(path.join(dir, name))
  );

  return NextResponse.json({ url: `/uploads/${name}` });
}
