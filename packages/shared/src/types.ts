import { CATEGORIES } from "./constants.js";

export type Category = (typeof CATEGORIES)[number];

export type NoteType = "text" | "voice" | "file";

export type ClassificationStatus = "pending" | "completed" | "failed" | "manual";

export interface User {
  id: string;
  email: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  type: NoteType;
  content: string | null;
  category: Category;
  classification_confidence: number | null;
  classification_status: ClassificationStatus;
}

export interface Attachment {
  id: string;
  note_id: string;
  filename: string;
  mime_type: string;
  storage_path: string;
  size_bytes: number;
  created_at: string;
}

export interface NoteWithAttachments extends Note {
  attachments: Attachment[];
}

export interface DailySummaryContent {
  top_actions: string[];
  avoiding: string;
  small_win: string;
}

export interface DailySummary {
  id: string;
  user_id: string;
  summary_date: string;
  content: DailySummaryContent;
  generated_at: string;
  sent_at: string | null;
}

export type DevicePlatform = "android" | "web";

export interface Device {
  id: string;
  user_id: string;
  platform: DevicePlatform;
  push_token: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateNoteRequest {
  type: NoteType;
  content?: string;
  category?: Category;
}

export interface ClassificationResult {
  category: Category;
  confidence: number;
}

