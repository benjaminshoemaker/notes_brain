import type { Category, Database, NoteWithAttachments } from "@notesbrain/shared";

import { supabase } from "./supabaseClient";

type NotesRow = Database["public"]["Tables"]["notes"]["Row"];
type AttachmentRow = Database["public"]["Tables"]["attachments"]["Row"];

type UploadInput = {
  userId: string;
  file: File;
  category?: Category;
};

export async function uploadAttachmentFile({
  userId,
  file,
  category
}: UploadInput): Promise<NoteWithAttachments> {
  const { data: note, error: noteError } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      type: "file",
      content: null,
      category: category ?? "uncategorized",
      classification_status: "manual",
      classification_confidence: null
    })
    .select("*")
    .single();

  if (noteError) {
    throw noteError;
  }

  if (!note) {
    throw new Error("Failed to create file note");
  }

  const noteRow = note as unknown as NotesRow;
  const uploadPath = `${userId}/attachments/${noteRow.id}/${file.name}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(uploadPath, file);

  if (uploadError) {
    throw uploadError;
  }

  if (!uploadData) {
    throw new Error("Failed to upload file");
  }

  const { data: attachment, error: attachmentError } = await supabase
    .from("attachments")
    .insert({
      note_id: noteRow.id,
      filename: file.name,
      mime_type: file.type || "application/octet-stream",
      storage_path: uploadData.path,
      size_bytes: file.size
    })
    .select("*")
    .single();

  if (attachmentError) {
    throw attachmentError;
  }

  if (!attachment) {
    throw new Error("Failed to create attachment record");
  }

  const attachmentRow = attachment as unknown as AttachmentRow;

  return {
    ...(noteRow as unknown as NoteWithAttachments),
    attachments: [attachmentRow as NoteWithAttachments["attachments"][number]]
  };
}
