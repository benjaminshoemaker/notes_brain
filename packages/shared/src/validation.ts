import { z } from "zod";

import { CATEGORIES } from "./constants.js";

export const CategorySchema = z.enum(CATEGORIES);
export const NoteTypeSchema = z.enum(["text", "voice", "file"]);

export const CreateNoteRequestSchema = z.object({
  type: NoteTypeSchema,
  content: z.string().optional(),
  category: CategorySchema.optional()
});

export const ClassificationResultSchema = z.object({
  category: CategorySchema,
  confidence: z.number().min(0).max(1)
});

