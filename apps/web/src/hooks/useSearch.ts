import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { searchNotes } from "../lib/notesApi";

export function useSearch(searchQuery: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handle);
    };
  }, [searchQuery]);

  const trimmedQuery = debouncedQuery.trim();

  return useQuery({
    queryKey: ["search", trimmedQuery],
    queryFn: () => searchNotes(trimmedQuery),
    enabled: trimmedQuery.length > 0
  });
}
