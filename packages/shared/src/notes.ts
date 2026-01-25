import type { Attachment, NoteWithAttachments } from "./types.js";
import { upsertById } from "./collections.js";

function mergeAttachmentsById(
  existing: readonly Attachment[],
  incoming: readonly Attachment[]
): Attachment[] {
  const byId = new Map<string, Attachment>();

  for (const attachment of existing) {
    byId.set(attachment.id, attachment);
  }

  for (const attachment of incoming) {
    byId.set(attachment.id, attachment);
  }

  return [...byId.values()];
}

export function mergeNoteWithAttachments(
  existing: NoteWithAttachments,
  incoming: NoteWithAttachments
): NoteWithAttachments {
  return {
    ...incoming,
    ...existing,
    attachments: mergeAttachmentsById(existing.attachments, incoming.attachments),
  };
}

export function upsertNoteWithAttachments(
  list: readonly NoteWithAttachments[] | undefined,
  incoming: NoteWithAttachments,
  position: "start" | "end" = "start"
): NoteWithAttachments[] {
  return upsertById(list, incoming, { position, merge: mergeNoteWithAttachments });
}

