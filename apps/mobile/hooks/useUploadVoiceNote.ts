import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system";
import type { NoteWithAttachments, Attachment } from "@notesbrain/shared";

import { supabase } from "../lib/supabaseClient";

type UploadVoiceNoteInput = {
  uri: string;
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

async function uploadVoiceNote(input: UploadVoiceNoteInput): Promise<NoteWithAttachments> {
  const { uri } = input;

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
      type: "voice",
      content: null, // Will be populated after transcription
      classification_status: "pending",
      category: "uncategorized",
    })
    .select()
    .single<NoteRow>();

  if (noteError || !note) {
    throw noteError || new Error("Failed to create note");
  }

  // Read the file as base64
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Convert base64 to Uint8Array for upload
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Upload to Supabase Storage
  const filename = `voice_${Date.now()}.m4a`;
  const storagePath = `${user.id}/attachments/${note.id}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(storagePath, bytes, {
      contentType: "audio/mp4",
      upsert: false,
    });

  if (uploadError) {
    // Clean up the note if upload fails
    await supabase.from("notes").delete().eq("id", note.id);
    throw uploadError;
  }

  // Get file info for size
  const fileInfo = await FileSystem.getInfoAsync(uri);
  const fileSize = fileInfo.exists && "size" in fileInfo ? fileInfo.size : 0;

  // Create attachment record
  const { data: attachment, error: attachmentError } = await supabase
    .from("attachments")
    .insert({
      note_id: note.id,
      filename,
      mime_type: "audio/mp4",
      storage_path: storagePath,
      size_bytes: fileSize,
    })
    .select()
    .single<Attachment>();

  if (attachmentError) {
    console.error("Failed to create attachment record:", attachmentError);
  }

  // Clean up local file
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Ignore cleanup errors
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

export function useUploadVoiceNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadVoiceNote,
    onSuccess: (newNote) => {
      queryClient.setQueryData<NoteWithAttachments[]>(["notes"], (old) => {
        return old ? [newNote, ...old] : [newNote];
      });
    },
  });
}
