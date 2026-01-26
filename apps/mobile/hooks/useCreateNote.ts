import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { NoteWithAttachments } from "@notesbrain/shared";
import { upsertNoteWithAttachments } from "@notesbrain/shared";

import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./useAuth";

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

type Context = {
  previousNotes: NoteWithAttachments[] | undefined;
  optimisticId: string;
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
  const { user } = useAuth();

  const mutation = useMutation({
    mutationFn: createNote,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });

      const previousNotes = queryClient.getQueryData<NoteWithAttachments[]>(["notes"]);
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticNote: NoteWithAttachments = {
        id: optimisticId,
        user_id: user?.id ?? "unknown",
        content: input.content,
        type: input.type ?? "text",
        category: "uncategorized",
        classification_status: "pending",
        classification_confidence: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        attachments: [],
      };

      queryClient.setQueryData<NoteWithAttachments[]>(["notes"], (old) => {
        return upsertNoteWithAttachments(old, optimisticNote, "start");
      });

      return { previousNotes, optimisticId } satisfies Context;
    },
    onError: (_error, _input, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(["notes"], context.previousNotes);
      }
    },
    onSuccess: (newNote, _input, context) => {
      queryClient.setQueryData<NoteWithAttachments[]>(["notes"], (old) => {
        const noteWithAttachments: NoteWithAttachments = {
          ...newNote,
          category: newNote.category as NoteWithAttachments["category"],
          type: newNote.type as NoteWithAttachments["type"],
          classification_status: newNote.classification_status as NoteWithAttachments["classification_status"],
          classification_confidence: null,
          attachments: [],
        };

        const current = old ?? [];
        if (context?.optimisticId) {
          return current.map((note) =>
            note.id === context.optimisticId ? noteWithAttachments : note
          );
        }

        return upsertNoteWithAttachments(current, noteWithAttachments, "start");
      });
    },
  });

  return mutation;
}
