import { File } from "expo-file-system";
import type {
  Attachment,
  Category,
  ClassificationStatus,
  NoteType,
  NoteWithAttachments,
} from "@notesbrain/shared";

import { supabase } from "./supabaseClient";

type NoteRow = {
  id: string;
  user_id: string;
  type: NoteType;
  content: string | null;
  classification_status: ClassificationStatus;
  category: Category;
  created_at: string;
  updated_at: string;
};

type UploadNoteAttachmentInput = {
  noteType: NoteType;
  content: string | null;
  classificationStatus: ClassificationStatus;
  category: Category;
  fileUri: string;
  mimeType: string;
  resolveAttachmentFileName: (noteId: string) => string;
  resolveStoragePath: (userId: string, noteId: string, attachmentFileName: string) => string;
  cleanupLocalFile?: boolean;
};

export async function uploadNoteAttachment(
  input: UploadNoteAttachmentInput
): Promise<NoteWithAttachments> {
  const {
    noteType,
    content,
    classificationStatus,
    category,
    fileUri,
    mimeType,
    resolveAttachmentFileName,
    resolveStoragePath,
    cleanupLocalFile,
  } = input;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: note, error: noteError } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      type: noteType,
      content,
      classification_status: classificationStatus,
      category,
    })
    .select()
    .single<NoteRow>();

  if (noteError || !note) {
    throw noteError || new Error("Failed to create note");
  }

  const file = new File(fileUri);
  const bytes = await file.bytes();
  const attachmentFileName = resolveAttachmentFileName(note.id);
  const storagePath = resolveStoragePath(user.id, note.id, attachmentFileName);

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(storagePath, bytes, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    await supabase.from("notes").delete().eq("id", note.id);
    throw uploadError;
  }

  const fileSize = file.size;

  const { data: attachment, error: attachmentError } = await supabase
    .from("attachments")
    .insert({
      note_id: note.id,
      filename: attachmentFileName,
      mime_type: mimeType,
      storage_path: storagePath,
      size_bytes: fileSize,
    })
    .select()
    .single<Attachment>();

  if (attachmentError) {
    console.error("Failed to create attachment record:", attachmentError);
  }

  if (cleanupLocalFile) {
    try {
      file.delete();
    } catch {
      // Ignore cleanup errors
    }
  }

  return {
    id: note.id,
    user_id: note.user_id,
    created_at: note.created_at,
    updated_at: note.updated_at,
    content: note.content,
    category: note.category as NoteWithAttachments["category"],
    type: note.type as NoteWithAttachments["type"],
    classification_status: note.classification_status as NoteWithAttachments["classification_status"],
    classification_confidence: null,
    attachments: attachment ? [attachment] : [],
  };
}
