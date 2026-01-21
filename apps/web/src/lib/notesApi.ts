import type { NoteWithAttachments } from "@notesbrain/shared";

import { supabase } from "./supabaseClient";

export async function fetchNotes(): Promise<NoteWithAttachments[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*, attachments(*)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as NoteWithAttachments[];
}

