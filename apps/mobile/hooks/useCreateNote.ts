import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { NoteWithAttachments } from "@notesbrain/shared";
import { upsertNoteWithAttachments } from "@notesbrain/shared";

import { supabase } from "../lib/supabaseClient";

type CreateNoteInput = {
  content: string;
  type?: "text" | "voice" | "file";
};

type CreateNoteResult = {
  id: string;
  user_id: string;
  content: string | null;
  type: "text" | "voice" | "file";
  category: string;
  classification_status: string;
  created_at: string;
  updated_at: string;
};

async function createNote(input: CreateNoteInput): Promise<CreateNoteResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      content: input.content,
      type: input.type ?? "text",
      classification_status: "pending",
      category: "uncategorized",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as CreateNoteResult;
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createNote,
    onSuccess: (newNote) => {
      // Optimistically add the new note to the cache
      queryClient.setQueryData<NoteWithAttachments[]>(["notes"], (old) => {
        const noteWithAttachments: NoteWithAttachments = {
          ...newNote,
          category: newNote.category as NoteWithAttachments["category"],
          type: newNote.type as NoteWithAttachments["type"],
          classification_status: newNote.classification_status as NoteWithAttachments["classification_status"],
          classification_confidence: null,
          attachments: [],
        };
        return upsertNoteWithAttachments(old, noteWithAttachments, "start");
      });
    },
  });
}
