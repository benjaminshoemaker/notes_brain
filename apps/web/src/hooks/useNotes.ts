import { useQuery } from "@tanstack/react-query";

import { fetchNotes } from "../lib/notesApi";

export function useNotes() {
  return useQuery({
    queryKey: ["notes"],
    queryFn: fetchNotes
  });
}

