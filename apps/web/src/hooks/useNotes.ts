import { useQuery } from "@tanstack/react-query";

import { isNetworkError } from "../lib/errors";
import { fetchNotes } from "../lib/notesApi";

export function useNotes() {
  return useQuery({
    queryKey: ["notes"],
    queryFn: fetchNotes,
    useErrorBoundary: (error) => !isNetworkError(error)
  });
}
