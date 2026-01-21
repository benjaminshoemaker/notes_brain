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

export async function searchNotes(searchQuery: string): Promise<NoteWithAttachments[]> {
  const query = searchQuery.trim();
  if (!query) {
    return [];
  }

  const { data, error } = await supabase
    .from("notes")
    .select("*, attachments(*)")
    .textSearch("search_vector", query)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as NoteWithAttachments[];
}
