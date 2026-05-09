import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { NoteWithAttachments } from "@notesbrain/shared";

import { supabase } from "../lib/supabaseClient";

export type RealtimeNoteCallbacks = {
  onRemoteUpdate?: (noteId: string) => boolean;
  onRemoteDelete?: (noteId: string) => boolean;
};

export function applyRealtimeNoteUpdate(
  old: NoteWithAttachments[] | undefined,
  updatedNote: NoteWithAttachments,
  callbacks?: RealtimeNoteCallbacks
) {
  if (callbacks?.onRemoteUpdate?.(updatedNote.id)) {
    return old;
  }

  if (!old) return old;

  return old.map((note) => {
    if (note.id === updatedNote.id) {
      return {
        ...note,
        ...updatedNote,
        attachments: Array.isArray(updatedNote.attachments)
          ? updatedNote.attachments
          : note.attachments,
      };
    }
    return note;
  });
}

export function applyRealtimeNoteInsert(
  old: NoteWithAttachments[] | undefined,
  newNote: NoteWithAttachments
) {
  const noteWithAttachments = {
    ...newNote,
    attachments: Array.isArray(newNote.attachments) ? newNote.attachments : [],
  };

  if (!old) return [noteWithAttachments];

  const exists = old.some((note) => note.id === newNote.id);
  if (exists) return old;

  return [noteWithAttachments, ...old];
}

export function applyRealtimeNoteDelete(
  old: NoteWithAttachments[] | undefined,
  deletedNote: { id: string },
  callbacks?: RealtimeNoteCallbacks
) {
  if (callbacks?.onRemoteDelete?.(deletedNote.id)) {
    return old;
  }

  if (!old) return old;
  return old.filter((note) => note.id !== deletedNote.id);
}

export function useRealtimeNotes(userId: string | undefined, callbacks?: RealtimeNoteCallbacks) {
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
            return applyRealtimeNoteUpdate(old, updatedNote, callbacks);
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
            return applyRealtimeNoteInsert(old, newNote);
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
            return applyRealtimeNoteDelete(old, deletedNote, callbacks);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, callbacks]);
}
