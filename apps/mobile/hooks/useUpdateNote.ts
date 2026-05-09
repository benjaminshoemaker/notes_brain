import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Category, NoteWithAttachments } from "@notesbrain/shared";

import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./useAuth";

export type UpdateNoteInput = {
  id: string;
  content?: string | null;
  category?: Category;
  expectedUpdatedAt: string;
};

export type UpdateNoteErrorCode = "not_authenticated" | "conflict" | "not_found" | "supabase_error";

export class UpdateNoteError extends Error {
  code: UpdateNoteErrorCode;

  constructor(code: UpdateNoteErrorCode, message: string) {
    super(message);
    this.name = "UpdateNoteError";
    this.code = code;
  }
}

export function requireUpdateNoteUser(user: { id: string } | null | undefined) {
  if (!user) {
    throw new UpdateNoteError("not_authenticated", "You must be signed in to edit notes.");
  }

  return user.id;
}

export function toUpdatePayload(input: UpdateNoteInput) {
  const payload: Pick<UpdateNoteInput, "content" | "category"> = {};

  if ("content" in input) {
    payload.content = input.content;
  }

  if ("category" in input) {
    payload.category = input.category;
  }

  return payload;
}

function mergeReturnedNote(
  updatedNote: NoteWithAttachments,
  existingNote: NoteWithAttachments
): NoteWithAttachments {
  return {
    ...existingNote,
    ...updatedNote,
    attachments: Array.isArray(updatedNote.attachments)
      ? updatedNote.attachments
      : existingNote.attachments,
  };
}

export function applyUpdatedNoteToCache(
  old: NoteWithAttachments[] | undefined,
  updatedNote: NoteWithAttachments
) {
  if (!old) return old;

  return old.map((note) => {
    if (note.id !== updatedNote.id) return note;
    return mergeReturnedNote(updatedNote, note);
  });
}

export async function updateNoteForUser(input: UpdateNoteInput, userId: string): Promise<NoteWithAttachments> {
  const payload = toUpdatePayload(input);

  const { data, error } = await supabase
    .from("notes")
    .update(payload)
    .eq("id", input.id)
    .eq("user_id", userId)
    .eq("updated_at", input.expectedUpdatedAt)
    .select("*, attachments(*)")
    .maybeSingle();

  if (error) {
    throw new UpdateNoteError("supabase_error", error.message);
  }

  if (data) {
    return data as NoteWithAttachments;
  }

  const { data: existing, error: lookupError } = await supabase
    .from("notes")
    .select("id, updated_at")
    .eq("id", input.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) {
    throw new UpdateNoteError("supabase_error", lookupError.message);
  }

  if (existing) {
    throw new UpdateNoteError("conflict", "Note was updated before this edit could be saved.");
  }

  throw new UpdateNoteError("not_found", "Note was not found.");
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateNoteInput) => {
      return updateNoteForUser(input, requireUpdateNoteUser(user));
    },
    onSuccess: (updatedNote) => {
      queryClient.setQueryData<NoteWithAttachments[]>(["notes"], (old) => {
        return applyUpdatedNoteToCache(old, updatedNote);
      });
    },
  });
}
