import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Category, NoteWithAttachments } from "@notesbrain/shared";

import { useToast } from "./useToast";
import { updateNoteCategory } from "../lib/notesApi";

type Payload = {
  noteId: string;
  category: Category;
};

type Context = {
  previousNotes: NoteWithAttachments[] | undefined;
};

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ noteId, category }: Payload) => {
      return updateNoteCategory(noteId, category);
    },
    onMutate: async ({ noteId, category }) => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });
      const previousNotes = queryClient.getQueryData<NoteWithAttachments[]>(["notes"]);

      queryClient.setQueryData<NoteWithAttachments[]>(["notes"], (current) => {
        const notes = current ?? [];
        return notes.map((note) =>
          note.id === noteId
            ? {
                ...note,
                category,
                classification_status: "manual",
                classification_confidence: null
              }
            : note
        );
      });

      return { previousNotes } satisfies Context;
    },
    onError: (_error, _payload, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(["notes"], context.previousNotes);
      }
      showToast("Failed to update category.", "error");
    },
    onSuccess: (updatedNote, { noteId }) => {
      queryClient.setQueryData<NoteWithAttachments[]>(["notes"], (current) => {
        const notes = current ?? [];
        return notes.map((note) =>
          note.id === noteId ? { ...note, ...(updatedNote as object) } : note
        );
      });
    }
  });
}

