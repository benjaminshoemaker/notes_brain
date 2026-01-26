import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { NoteWithAttachments } from "@notesbrain/shared";

import { useAuth } from "./useAuth";
import { useToast } from "./useToast";
import { createTextNote } from "../lib/notesApi";

type Context = {
  previousNotes: NoteWithAttachments[] | undefined;
  optimisticId: string;
};

export function useCreateNote() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) {
        throw new Error("Not authenticated");
      }

      return createTextNote(user.id, content);
    },
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });

      const previousNotes = queryClient.getQueryData<NoteWithAttachments[]>(["notes"]);

      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticNote: NoteWithAttachments = {
        id: optimisticId,
        user_id: user?.id ?? "unknown",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        type: "text",
        content,
        category: "uncategorized",
        classification_confidence: null,
        classification_status: "pending",
        attachments: []
      };

      queryClient.setQueryData<NoteWithAttachments[]>(["notes"], (current) => [
        optimisticNote,
        ...(current ?? [])
      ]);

      return { previousNotes, optimisticId } satisfies Context;
    },
    onError: (_error, content, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(["notes"], context.previousNotes);
      }

      showToast("Failed to create note.", "error", {
        label: "Retry",
        onClick: () => {
          mutation.mutate(content);
        }
      });
    },
    onSuccess: (savedNote, _content, context) => {
      queryClient.setQueryData<NoteWithAttachments[]>(["notes"], (current) => {
        const notes = current ?? [];
        return notes.map((note) => (note.id === context?.optimisticId ? savedNote : note));
      });
    }
  });

  return mutation;
}
