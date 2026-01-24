import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { NoteWithAttachments } from "@notesbrain/shared";

import { supabase } from "../lib/supabaseClient";

export function useRealtimeNotes(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("notes-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notes",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updatedNote = payload.new as NoteWithAttachments;

          queryClient.setQueryData<NoteWithAttachments[]>(["notes"], (old) => {
            if (!old) return old;

            return old.map((note) => {
              if (note.id === updatedNote.id) {
                return { ...note, ...updatedNote };
              }
              return note;
            });
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notes",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNote = payload.new as NoteWithAttachments;

          queryClient.setQueryData<NoteWithAttachments[]>(["notes"], (old) => {
            if (!old) return [{ ...newNote, attachments: [] }];

            const exists = old.some((note) => note.id === newNote.id);
            if (exists) return old;

            return [{ ...newNote, attachments: [] }, ...old];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notes",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const deletedNote = payload.old as { id: string };

          queryClient.setQueryData<NoteWithAttachments[]>(["notes"], (old) => {
            if (!old) return old;
            return old.filter((note) => note.id !== deletedNote.id);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
