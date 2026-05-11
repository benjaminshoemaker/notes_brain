import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { NoteWithAttachments } from "@notesbrain/shared";

import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./useAuth";

export type DeleteNoteInput = {
  id: string;
  expectedUpdatedAt: string;
};

export type DeleteNoteErrorCode = "not_authenticated" | "conflict" | "not_found" | "supabase_error";

export class DeleteNoteError extends Error {
  code: DeleteNoteErrorCode;

  constructor(code: DeleteNoteErrorCode, message: string) {
    super(message);
    this.name = "DeleteNoteError";
    this.code = code;
  }
}

export function requireDeleteNoteUser(user: { id: string } | null | undefined) {
  if (!user) {
    throw new DeleteNoteError("not_authenticated", "You must be signed in to delete notes.");
  }

  return user.id;
}

export function applyDeletedNoteToCache(
  old: NoteWithAttachments[] | undefined,
  deletedNoteId: string
) {
  if (!old) return old;

  return old.filter((note) => note.id !== deletedNoteId);
}

export async function deleteNoteForUser(input: DeleteNoteInput, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("notes")
    .delete()
    .eq("id", input.id)
    .eq("user_id", userId)
    .eq("updated_at", input.expectedUpdatedAt)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new DeleteNoteError("supabase_error", error.message);
  }

  if (data) {
    return data.id;
  }

  const { data: existing, error: lookupError } = await supabase
    .from("notes")
    .select("id, updated_at")
    .eq("id", input.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) {
    throw new DeleteNoteError("supabase_error", lookupError.message);
  }

  if (existing) {
    throw new DeleteNoteError("conflict", "Note was updated before it could be deleted.");
  }

  throw new DeleteNoteError("not_found", "Note was not found.");
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: DeleteNoteInput) => {
      return deleteNoteForUser(input, requireDeleteNoteUser(user));
    },
    onSuccess: (deletedNoteId) => {
      queryClient.setQueryData<NoteWithAttachments[]>(["notes"], (old) => {
        return applyDeletedNoteToCache(old, deletedNoteId);
      });
    },
  });
}
