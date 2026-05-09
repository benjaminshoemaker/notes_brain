import { describe, expect, it } from "vitest";

import { validateNoteEditDraft } from "../../lib/noteEditValidation";

describe("note edit validation", () => {
  it("allows changed body text for editable notes", () => {
    const result = validateNoteEditDraft({
      originalContent: "Original note",
      originalCategory: "ideas",
      draftContent: "Updated note",
      draftCategory: "ideas",
    });

    expect(result).toMatchObject({
      bodyEditable: true,
      trimmedContent: "Updated note",
      bodyChanged: true,
      categoryChanged: false,
      hasChanges: true,
      canSave: true,
      error: null,
    });
  });

  it("allows changed category for editable notes", () => {
    const result = validateNoteEditDraft({
      originalContent: "Original note",
      originalCategory: "ideas",
      draftContent: "Original note",
      draftCategory: "projects",
    });

    expect(result).toMatchObject({
      bodyEditable: true,
      bodyChanged: false,
      categoryChanged: true,
      hasChanges: true,
      canSave: true,
      error: null,
    });
  });

  it("rejects no-change saves", () => {
    const result = validateNoteEditDraft({
      originalContent: "Original note",
      originalCategory: "ideas",
      draftContent: "Original note",
      draftCategory: "ideas",
    });

    expect(result).toMatchObject({
      bodyEditable: true,
      bodyChanged: false,
      categoryChanged: false,
      hasChanges: false,
      canSave: false,
      error: "no_changes",
    });
  });

  it("rejects blank body saves for editable notes", () => {
    const result = validateNoteEditDraft({
      originalContent: "Original note",
      originalCategory: "ideas",
      draftContent: "   ",
      draftCategory: "projects",
    });

    expect(result).toMatchObject({
      bodyEditable: true,
      trimmedContent: "",
      bodyChanged: true,
      categoryChanged: true,
      hasChanges: true,
      canSave: false,
      error: "empty_body",
    });
  });

  it("allows category-only saves for null original content", () => {
    const result = validateNoteEditDraft({
      originalContent: null,
      originalCategory: "uncategorized",
      draftContent: "",
      draftCategory: "admin",
    });

    expect(result).toMatchObject({
      bodyEditable: false,
      bodyChanged: false,
      categoryChanged: true,
      hasChanges: true,
      canSave: true,
      error: null,
    });
  });

  it("allows category-only saves for empty original content", () => {
    const result = validateNoteEditDraft({
      originalContent: "  ",
      originalCategory: "uncategorized",
      draftContent: "",
      draftCategory: "health",
    });

    expect(result).toMatchObject({
      bodyEditable: false,
      bodyChanged: false,
      categoryChanged: true,
      hasChanges: true,
      canSave: true,
      error: null,
    });
  });

  it("rejects no-change saves for null original content", () => {
    const result = validateNoteEditDraft({
      originalContent: null,
      originalCategory: "uncategorized",
      draftContent: "Draft text is ignored while body is unavailable",
      draftCategory: "uncategorized",
    });

    expect(result).toMatchObject({
      bodyEditable: false,
      bodyChanged: false,
      categoryChanged: false,
      hasChanges: false,
      canSave: false,
      error: "no_changes",
    });
  });
});
