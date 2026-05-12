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
  prompt?: string;
  schedule_type?: LensScheduleType;
  schedule_time?: string;
  schedule_day?: number | null;
  lookback_hours?: number;
  categories?: string[] | null;
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

export type LensTemplateStatus = "public" | "unpublished" | "hidden" | "delisted";

export type LensTemplateReportReason =
  | "spam"
  | "unsafe_prompt"
  | "misleading"
  | "private_information"
  | "impersonation"
  | "other";

export interface CommunityLensTemplatePublic {
  id: string;
  name: string;
  description: string;
  prompt: string;
  schedule_type: LensScheduleType;
  schedule_time: string;
  schedule_day: number | null;
  lookback_hours: number;
  categories: string[] | null;
  category: Category;
  version: number;
  author_display_name: string;
  install_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommunityLensTemplate extends CommunityLensTemplatePublic {
  source_lens_id: string;
  author_user_id: string;
  status: LensTemplateStatus;
}

export interface LensTemplateVersion {
  id: string;
  template_id: string;
  version: number;
  snapshot: LensTemplateSnapshot;
  created_at: string;
}

export interface LensTemplateInstall {
  id: string;
  template_id: string;
  template_version: number;
  installed_lens_id: string;
  user_id: string;
  created_at: string;
}

export interface LensTemplateReport {
  id: string;
  template_id: string;
  reporter_user_id: string;
  reason: LensTemplateReportReason;
  note: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface PublishLensTemplate {
  Args: {
    p_lens_id: string;
    p_author_display_name: string;
    p_description: string;
    p_category?: Category;
  };
  Returns: CommunityLensTemplate;
}

export interface UnpublishLensTemplate {
  Args: {
    p_lens_id: string;
  };
  Returns: CommunityLensTemplate;
}

export interface InstallLensTemplate {
  Args: {
    p_template_id: string;
  };
  Returns: Lens;
}

export interface ReportLensTemplate {
  Args: {
    p_template_id: string;
    p_reason: LensTemplateReportReason;
    p_note?: string | null;
  };
  Returns: LensTemplateReport;
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
