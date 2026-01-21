import { MAX_FILE_SIZE_BYTES } from "@notesbrain/shared";

export const ACCEPTED_ATTACHMENT_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "doc",
  "docx",
  "txt"
] as const;

const ACCEPTED_EXTENSION_SET = new Set<string>(ACCEPTED_ATTACHMENT_EXTENSIONS);

function getFileExtension(filename: string) {
  const parts = filename.toLowerCase().split(".");
  if (parts.length < 2) return "";
  return parts.at(-1) ?? "";
}

export function isAcceptedAttachmentFile(file: File) {
  const ext = getFileExtension(file.name);
  return ACCEPTED_EXTENSION_SET.has(ext);
}

export function validateAttachmentFile(file: File): { ok: true } | { ok: false; error: string } {
  if (!isAcceptedAttachmentFile(file)) {
    return {
      ok: false,
      error: "Unsupported file type. Allowed: PDF, images, DOC/DOCX, TXT."
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: "File too large. Max size is 10MB."
    };
  }

  return { ok: true };
}

