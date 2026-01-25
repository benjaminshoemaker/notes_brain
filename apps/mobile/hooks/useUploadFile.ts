import { useMutation, useQueryClient } from "@tanstack/react-query";
import { File } from "expo-file-system";
import type { NoteWithAttachments, Attachment } from "@notesbrain/shared";
import { upsertNoteWithAttachments } from "@notesbrain/shared";

import { supabase } from "../lib/supabaseClient";

type UploadFileInput = {
  uri: string;
  mimeType: string;
  fileName: string;
};

type NoteRow = {
  id: string;
  user_id: string;
  type: string;
  content: string | null;
  classification_status: string;
  category: string;
  created_at: string;
  updated_at: string;
};

async function uploadFile(input: UploadFileInput): Promise<NoteWithAttachments> {
  const { uri, mimeType, fileName } = input;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Create the note first
  const { data: note, error: noteError } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      type: "file",
      content: fileName, // Use filename as content for file notes
      classification_status: "pending",
      category: "uncategorized",
    })
    .select()
    .single<NoteRow>();

  if (noteError || !note) {
    throw noteError || new Error("Failed to create note");
  }

  const file = new File(uri);
  const bytes = await file.bytes();

  // Determine file extension from mime type or use original
  const extension = getExtensionFromMimeType(mimeType) || fileName.split(".").pop() || "bin";
  const safeFileName = `${Date.now()}_${sanitizeFileName(fileName)}`;
  const storagePath = `${user.id}/attachments/${note.id}/${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(storagePath, bytes, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    // Clean up the note if upload fails
    await supabase.from("notes").delete().eq("id", note.id);
    throw uploadError;
  }

  const fileSize = file.size;

  // Create attachment record
  const { data: attachment, error: attachmentError } = await supabase
    .from("attachments")
    .insert({
      note_id: note.id,
      filename: fileName,
      mime_type: mimeType,
      storage_path: storagePath,
      size_bytes: fileSize,
    })
    .select()
    .single<Attachment>();

  if (attachmentError) {
    console.error("Failed to create attachment record:", attachmentError);
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

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getExtensionFromMimeType(mimeType: string): string | null {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "application/pdf": "pdf",
    "text/plain": "txt",
    "text/html": "html",
  };
  return mimeToExt[mimeType] || null;
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadFile,
    onSuccess: (newNote) => {
      queryClient.setQueryData<NoteWithAttachments[]>(["notes"], (old) => {
        return upsertNoteWithAttachments(old, newNote, "start");
      });
    },
  });
}
