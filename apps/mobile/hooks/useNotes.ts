import { useQuery } from "@tanstack/react-query";
import type { NoteWithAttachments } from "@notesbrain/shared";

import { supabase } from "../lib/supabaseClient";

async function fetchNotes(): Promise<NoteWithAttachments[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*, attachments(*)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as NoteWithAttachments[];
}

export function useNotes() {
  return useQuery({
    queryKey: ["notes"],
    queryFn: fetchNotes,
  });
}
