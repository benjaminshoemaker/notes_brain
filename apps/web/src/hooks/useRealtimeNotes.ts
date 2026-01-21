import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";
import type { NoteWithAttachments } from "@notesbrain/shared";

import { useAuth } from "./useAuth";
import { supabase } from "../lib/supabaseClient";

type NotesUpdatePayload = {
  new?: {
    id?: string;
    category?: string;
    classification_status?: string;
    classification_confidence?: number | null;
    content?: string | null;
    updated_at?: string;
    type?: string;
  };
};

function applyNoteUpdate(
  notes: NoteWithAttachments[] | undefined,
  update: NotesUpdatePayload["new"]
): NoteWithAttachments[] | undefined {
  const noteId = update?.id;
  if (!notes || !noteId) return notes;

  let didUpdate = false;

  const next = notes.map((note) => {
    if (note.id !== noteId) return note;
    didUpdate = true;
    return {
      ...note,
      category: (update?.category ?? note.category) as NoteWithAttachments["category"],
      classification_status: (update?.classification_status ??
        note.classification_status) as NoteWithAttachments["classification_status"],
      classification_confidence:
        update?.classification_confidence ?? note.classification_confidence,
      content: update?.content ?? note.content,
      updated_at: update?.updated_at ?? note.updated_at,
      type: (update?.type ?? note.type) as NoteWithAttachments["type"]
    };
  });

  return didUpdate ? next : notes;
}

export function useRealtimeNotes() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notes:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notes",
          filter: `user_id=eq.${user.id}`
        },
        (payload: NotesUpdatePayload) => {
          const update = payload?.new;
          if (!update?.id) return;

          queryClient.setQueryData<NoteWithAttachments[]>(["notes"], (current) =>
            applyNoteUpdate(current, update)
          );

          queryClient.setQueriesData<NoteWithAttachments[]>(
            { queryKey: ["search"] },
            (current) => applyNoteUpdate(current, update)
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, user]);
}

