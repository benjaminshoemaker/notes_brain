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

export type LensScheduleType = "daily" | "weekly";

export type LensTemplateAuthorType = "curated" | "community";

export interface LensTemplateSnapshot {
  template_id: string;
  version: number;
  name: string;
  description: string;
  category: string;
  author_type: LensTemplateAuthorType;
  author_name: string;
}

export interface LensTemplate {
  template_id: string;
  version: number;
  name: string;
  description: string;
  focus: string;
  prompt: string;
  schedule_type: LensScheduleType;
  schedule_time: string;
  schedule_day: number | null;
  lookback_hours: number;
  categories: string[] | null;
  category: string;
  author_type: LensTemplateAuthorType;
  author_name: string;
  updated_at: string;
  changelog: string[];
  example_output?: string;
}

export interface Lens {
  id: string;
  user_id: string;
  name: string;
  prompt: string;
  schedule_type: LensScheduleType;
  schedule_time: string;
  schedule_day: number | null;
  lookback_hours: number;
  categories: string[] | null;
  is_active: boolean;
  is_default: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  consecutive_failures: number;
  last_error: string | null;
  last_error_at: string | null;
  source_template_id: string | null;
  source_template_version: number | null;
  installed_from_library_at: string | null;
  template_snapshot: LensTemplateSnapshot | null;
  created_at: string;
  updated_at: string;
}

export interface LensResult {
  id: string;
  lens_id: string;
  user_id: string;
  content: string;
  notes_analyzed: number;
  generated_at: string;
  sent_at: string | null;
}

export interface LensResultWithLens extends LensResult {
  lens: Pick<Lens, "name" | "schedule_type" | "schedule_time" | "schedule_day">;
}

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
