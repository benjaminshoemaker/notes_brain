import { useQuery } from "@tanstack/react-query";

import type { NoteWithAttachments } from "@notesbrain/shared";

import { isNetworkError } from "../lib/errors";
import { fetchNotes } from "../lib/notesApi";

export function useNotes() {
  return useQuery<NoteWithAttachments[], Error>({
    queryKey: ["notes"],
    queryFn: fetchNotes,
    throwOnError: (error) => !isNetworkError(error)
  });
}
