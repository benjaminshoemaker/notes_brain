import { createClient, type SupabaseClient, type SupabaseClientOptions } from "@supabase/supabase-js";

import type {
  Category,
  ClassificationStatus,
  DailySummaryContent,
  DevicePlatform,
  LensTemplateSnapshot,
  LensScheduleType,
  NoteType
} from "./types.js";

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
          type: NoteType;
          content: string | null;
          category: Category;
          classification_confidence: number | null;
          classification_status: ClassificationStatus;
          search_vector: unknown | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NoteType;
          content?: string | null;
          category?: Category;
          classification_confidence?: number | null;
          classification_status?: ClassificationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string | null;
          category?: Category;
          classification_confidence?: number | null;
          classification_status?: ClassificationStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      attachments: {
        Row: {
          id: string;
          note_id: string;
          filename: string;
          mime_type: string;
          storage_path: string;
          size_bytes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          note_id: string;
          filename: string;
          mime_type: string;
          storage_path: string;
          size_bytes: number;
          created_at?: string;
        };
        Update: {
          filename?: string;
          mime_type?: string;
          storage_path?: string;
          size_bytes?: number;
        };
        Relationships: [];
      };
      daily_summaries: {
        Row: {
          id: string;
          user_id: string;
          summary_date: string;
          content: DailySummaryContent;
          generated_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          summary_date: string;
          content: DailySummaryContent;
          generated_at?: string;
          sent_at?: string | null;
        };
        Update: {
          content?: DailySummaryContent;
          sent_at?: string | null;
        };
        Relationships: [];
      };
      devices: {
        Row: {
          id: string;
          user_id: string;
          platform: DevicePlatform;
          push_token: string | null;
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          platform: DevicePlatform;
          push_token?: string | null;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          push_token?: string | null;
          last_seen_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      lenses: {
        Row: {
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
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          prompt: string;
          schedule_type?: LensScheduleType;
          schedule_time?: string;
          schedule_day?: number | null;
          lookback_hours?: number;
          categories?: string[] | null;
          is_active?: boolean;
          is_default?: boolean;
          next_run_at?: string | null;
          source_template_id?: string | null;
          source_template_version?: number | null;
          installed_from_library_at?: string | null;
          template_snapshot?: LensTemplateSnapshot | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          prompt?: string;
          schedule_type?: LensScheduleType;
          schedule_time?: string;
          schedule_day?: number | null;
          lookback_hours?: number;
          categories?: string[] | null;
          is_active?: boolean;
          source_template_id?: string | null;
          source_template_version?: number | null;
          installed_from_library_at?: string | null;
          template_snapshot?: LensTemplateSnapshot | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      lens_results: {
        Row: {
          id: string;
          lens_id: string;
          user_id: string;
          content: string;
          notes_analyzed: number;
          generated_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          lens_id: string;
          user_id: string;
          content: string;
          notes_analyzed?: number;
          generated_at?: string;
          sent_at?: string | null;
        };
        Update: {
          content?: string;
          notes_analyzed?: number;
          sent_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      note_category: Category;
      note_type: NoteType;
      classification_status: ClassificationStatus;
      device_platform: DevicePlatform;
      lens_schedule_type: LensScheduleType;
    };
    CompositeTypes: Record<string, never>;
  };
};

export function createSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  options?: SupabaseClientOptions<"public">
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, options);
}
