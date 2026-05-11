// Local filesystem upload storage — dev-only. Files land under
// `<project root>/uploads/` and the storage key is a UUID + extension so
// uploads never collide and never expose user-controlled filenames in
// paths. For production deployments swap the read/write functions for an
// S3/R2 client; the rest of the app only knows about `key` + `name`.

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type UploadResult = { key: string; name: string; mimeType: string };

async function ensureDir() {
  await mkdir(UPLOADS_DIR, { recursive: true });
}

function sanitiseExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  // Allow only common safe extensions. Block anything else.
  if ([".pdf", ".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return ext;
  return ".bin";
}

export async function saveUpload(file: File): Promise<UploadResult> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `File too large. Max ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error(
      "Unsupported file type. Allowed: PDF, JPEG, PNG, WebP."
    );
  }

  await ensureDir();

  const ext = sanitiseExtension(file.name);
  const key = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOADS_DIR, key), buffer);

  return { key, name: file.name, mimeType: file.type };
}

export async function readUpload(key: string): Promise<Buffer> {
  // Defence in depth — keys come from the database but reject anything
  // that could path-traverse out of the uploads directory.
  if (key.includes("/") || key.includes("\\") || key.includes("..")) {
    throw new Error("Invalid upload key");
  }
  return readFile(path.join(UPLOADS_DIR, key));
}

export function contentTypeFromKey(key: string): string {
  const ext = path.extname(key).toLowerCase();
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}