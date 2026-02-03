export { CATEGORIES, MAX_FILE_SIZE_BYTES, MAX_VOICE_SECONDS } from "./constants.js";

export type { Database } from "./supabase.js";
export { createSupabaseClient } from "./supabase.js";

export { signIn, signInWithMagicLink, signOut, signUp } from "./auth.js";
export { createAuthApi } from "./authApi.js";
export { createUseAuth } from "./authHooks.js";

export { upsertById } from "./collections.js";

export type {
  Attachment,
  Category,
  ClassificationResult,
  ClassificationStatus,
  CreateNoteRequest,
  DailySummary,
  DailySummaryContent,
  Device,
  DevicePlatform,
  Note,
  NoteType,
  NoteWithAttachments,
  User
} from "./types.js";

export { mergeNoteWithAttachments, upsertNoteWithAttachments } from "./notes.js";

export {
  CategorySchema,
  ClassificationResultSchema,
  CreateNoteRequestSchema,
  NoteTypeSchema
} from "./validation.js";
