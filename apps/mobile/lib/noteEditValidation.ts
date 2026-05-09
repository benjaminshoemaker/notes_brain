import type { Category } from "@notesbrain/shared";

export type NoteEditDraft = {
  originalContent: string | null;
  originalCategory: Category;
  draftContent: string;
  draftCategory: Category;
};

export type NoteEditValidation = {
  bodyEditable: boolean;
  trimmedContent: string;
  bodyChanged: boolean;
  categoryChanged: boolean;
  hasChanges: boolean;
  canSave: boolean;
  error: "empty_body" | "no_changes" | null;
};

export function validateNoteEditDraft(input: NoteEditDraft): NoteEditValidation {
  const originalTrimmed = input.originalContent?.trim() ?? "";
  const trimmedContent = input.draftContent.trim();
  const bodyEditable = input.originalContent !== null && originalTrimmed.length > 0;
  const bodyChanged = bodyEditable && trimmedContent !== originalTrimmed;
  const categoryChanged = input.draftCategory !== input.originalCategory;
  const hasChanges = bodyChanged || categoryChanged;

  if (bodyEditable && trimmedContent.length === 0) {
    return {
      bodyEditable,
      trimmedContent,
      bodyChanged,
      categoryChanged,
      hasChanges,
      canSave: false,
      error: "empty_body",
    };
  }

  if (!hasChanges) {
    return {
      bodyEditable,
      trimmedContent,
      bodyChanged,
      categoryChanged,
      hasChanges,
      canSave: false,
      error: "no_changes",
    };
  }

  return {
    bodyEditable,
    trimmedContent,
    bodyChanged,
    categoryChanged,
    hasChanges,
    canSave: true,
    error: null,
  };
}
