import React, { useState } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestInstance, ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { NoteWithAttachments } from "@notesbrain/shared";

import { MobileNoteCard } from "../../components/MobileNoteCard";
import { testIds } from "../../lib/testIds";
import type { UpdateNoteInput } from "../../hooks/useUpdateNote";

function makeNote(overrides: Partial<NoteWithAttachments>): NoteWithAttachments {
  return {
    id: "note-1",
    user_id: "user-1",
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
    type: "text",
    content: "Original note",
    category: "ideas",
    classification_status: "completed",
    classification_confidence: 0.9,
    attachments: [],
    ...overrides,
  };
}

function textContent(tree: ReactTestRenderer) {
  return tree.root
    .findAll((node: ReactTestInstance) => String(node.type) === "Text")
    .map((node) => node.children.join(""))
    .join("\n");
}

function findByTestId(tree: ReactTestRenderer, testID: string) {
  return tree.root.findByProps({ testID });
}

async function openEditor(tree: ReactTestRenderer, noteId: string) {
  await act(async () => {
    findByTestId(tree, testIds.notes.editButton(noteId)).props.onPress();
    await Promise.resolve();
  });
}

async function pressSave(tree: ReactTestRenderer, noteId: string) {
  await act(async () => {
    await findByTestId(tree, testIds.notes.saveButton(noteId)).props.onPress();
  });
}

function CardHarness({
  initialNote,
  onSaveEdit,
  remoteState = "clean",
  editBaselineUpdatedAt = null,
}: {
  initialNote: NoteWithAttachments;
  onSaveEdit: (input: UpdateNoteInput) => Promise<void>;
  remoteState?: "clean" | "updated" | "deleted";
  editBaselineUpdatedAt?: string | null;
}) {
  const [note, setNote] = useState(initialNote);
  const [isEditing, setIsEditing] = useState(false);

  async function handleSave(input: UpdateNoteInput) {
    await onSaveEdit(input);
    setNote((current) => ({
      ...current,
      content: input.content ?? current.content,
      category: input.category ?? current.category,
    }));
    setIsEditing(false);
  }

  return (
    <MobileNoteCard
      note={note}
      isEditing={isEditing}
      editBaselineUpdatedAt={editBaselineUpdatedAt}
      isEditDisabled={false}
      remoteState={remoteState}
      onStartEdit={() => setIsEditing(true)}
      onCancelEdit={() => setIsEditing(false)}
      onSaveEdit={handleSave}
    />
  );
}

describe("MobileNoteCard edit state", () => {
  it("renders body input, category options, Save, and Cancel after tapping Edit", async () => {
    const note = makeNote({});
    let tree!: ReactTestRenderer;

    await act(async () => {
      tree = create(<CardHarness initialNote={note} onSaveEdit={vi.fn()} />);
      await Promise.resolve();
    });

    await act(async () => {
      findByTestId(tree, testIds.notes.editButton(note.id)).props.onPress();
      await Promise.resolve();
    });

    expect(findByTestId(tree, testIds.notes.editInput(note.id))).toBeTruthy();
    expect(findByTestId(tree, testIds.notes.categoryOption(note.id, "projects"))).toBeTruthy();
    expect(findByTestId(tree, testIds.notes.saveButton(note.id))).toBeTruthy();
    expect(findByTestId(tree, testIds.notes.cancelButton(note.id))).toBeTruthy();
  });

  it("saves changed body and category with expectedUpdatedAt then returns to read mode", async () => {
    const note = makeNote({});
    const onSaveEdit = vi.fn().mockResolvedValue(undefined);
    let tree!: ReactTestRenderer;

    await act(async () => {
      tree = create(<CardHarness initialNote={note} onSaveEdit={onSaveEdit} />);
      await Promise.resolve();
    });

    await openEditor(tree, note.id);

    await act(async () => {
      findByTestId(tree, testIds.notes.editInput(note.id)).props.onChangeText("Updated body");
      findByTestId(tree, testIds.notes.categoryOption(note.id, "projects")).props.onPress();
      await Promise.resolve();
    });
    await pressSave(tree, note.id);

    expect(onSaveEdit).toHaveBeenCalledWith({
      id: note.id,
      content: "Updated body",
      category: "projects",
      expectedUpdatedAt: note.updated_at,
    });
    expect(textContent(tree)).toContain("Updated body");
    expect(() => findByTestId(tree, testIds.notes.editInput(note.id))).toThrow();
  });

  it("uses the edit-start updated_at when the current note prop changes before save", async () => {
    const note = makeNote({ updated_at: "2026-05-01T00:05:00.000Z" });
    const editBaselineUpdatedAt = "2026-05-01T00:00:00.000Z";
    const onSaveEdit = vi.fn().mockResolvedValue(undefined);
    let tree!: ReactTestRenderer;

    await act(async () => {
      tree = create(
        <CardHarness
          initialNote={note}
          editBaselineUpdatedAt={editBaselineUpdatedAt}
          onSaveEdit={onSaveEdit}
        />
      );
      await Promise.resolve();
    });

    await openEditor(tree, note.id);

    await act(async () => {
      findByTestId(tree, testIds.notes.editInput(note.id)).props.onChangeText("Updated body");
      await Promise.resolve();
    });
    await pressSave(tree, note.id);

    expect(onSaveEdit).toHaveBeenCalledWith({
      id: note.id,
      content: "Updated body",
      expectedUpdatedAt: editBaselineUpdatedAt,
    });
  });

  it("cancels draft changes and returns to original read-mode content", async () => {
    const note = makeNote({});
    let tree!: ReactTestRenderer;

    await act(async () => {
      tree = create(<CardHarness initialNote={note} onSaveEdit={vi.fn()} />);
      await Promise.resolve();
    });

    await openEditor(tree, note.id);

    await act(async () => {
      findByTestId(tree, testIds.notes.editInput(note.id)).props.onChangeText("Discard me");
      findByTestId(tree, testIds.notes.categoryOption(note.id, "admin")).props.onPress();
      findByTestId(tree, testIds.notes.cancelButton(note.id)).props.onPress();
      await Promise.resolve();
    });

    expect(textContent(tree)).toContain("Original note");
    expect(textContent(tree)).not.toContain("Discard me");
  });

  it("preserves voice and file source indicators plus attachment counts in read mode after save", async () => {
    const fileNote = makeNote({
      id: "file-note",
      type: "file",
      content: "file-name.pdf",
      attachments: [{
        id: "att-1",
        note_id: "file-note",
        filename: "file-name.pdf",
        mime_type: "application/pdf",
        storage_path: "file",
        size_bytes: 100,
        created_at: "2026-05-01T00:00:00.000Z",
      }],
    });
    const voiceNote = makeNote({ id: "voice-note", type: "voice", content: "Voice transcript" });
    let fileTree!: ReactTestRenderer;
    let voiceTree!: ReactTestRenderer;

    await act(async () => {
      fileTree = create(<CardHarness initialNote={fileNote} onSaveEdit={vi.fn().mockResolvedValue(undefined)} />);
      voiceTree = create(<CardHarness initialNote={voiceNote} onSaveEdit={vi.fn().mockResolvedValue(undefined)} />);
      await Promise.resolve();
    });

    await openEditor(fileTree, fileNote.id);
    await act(async () => {
      findByTestId(fileTree, testIds.notes.editInput(fileNote.id)).props.onChangeText("Updated file body");
      await Promise.resolve();
    });
    await pressSave(fileTree, fileNote.id);
    await openEditor(voiceTree, voiceNote.id);
    await act(async () => {
      findByTestId(voiceTree, testIds.notes.editInput(voiceNote.id)).props.onChangeText("Updated transcript");
      await Promise.resolve();
    });
    await pressSave(voiceTree, voiceNote.id);

    expect(fileTree.root.findByProps({ accessibilityLabel: "File attachment" })).toBeTruthy();
    expect(textContent(fileTree)).toContain("1");
    expect(voiceTree.root.findByProps({ accessibilityLabel: "Voice note" })).toBeTruthy();
  });

  it("saves changed body text for text, voice, and file notes with saved content", async () => {
    const notes = [
      makeNote({ id: "text-note", type: "text", content: "Text body" }),
      makeNote({ id: "voice-note", type: "voice", content: "Voice body" }),
      makeNote({ id: "file-note", type: "file", content: "File body" }),
    ];

    for (const note of notes) {
      const onSaveEdit = vi.fn().mockResolvedValue(undefined);
      let tree!: ReactTestRenderer;

      await act(async () => {
        tree = create(<CardHarness initialNote={note} onSaveEdit={onSaveEdit} />);
        await Promise.resolve();
      });

      await openEditor(tree, note.id);
      await act(async () => {
        findByTestId(tree, testIds.notes.editInput(note.id)).props.onChangeText(`${note.type} edited body`);
        await Promise.resolve();
      });
      await pressSave(tree, note.id);

      expect(onSaveEdit).toHaveBeenCalledWith({
        id: note.id,
        content: `${note.type} edited body`,
        expectedUpdatedAt: note.updated_at,
      });
      expect(textContent(tree)).toContain(`${note.type} edited body`);
    }
  });

  it("shows empty-body validation and disables Save for editable notes", async () => {
    const note = makeNote({});
    const onSaveEdit = vi.fn();
    let tree!: ReactTestRenderer;

    await act(async () => {
      tree = create(<CardHarness initialNote={note} onSaveEdit={onSaveEdit} />);
      await Promise.resolve();
    });

    await openEditor(tree, note.id);

    await act(async () => {
      findByTestId(tree, testIds.notes.editInput(note.id)).props.onChangeText("   ");
      await Promise.resolve();
    });

    const saveButton = findByTestId(tree, testIds.notes.saveButton(note.id));
    expect(saveButton.props.disabled).toBe(true);
    expect(saveButton.props.onPress).toBeUndefined();
    expect(textContent(tree)).toContain("Note body cannot be empty.");
    expect(onSaveEdit).not.toHaveBeenCalled();
  });

  it("allows category-only saves for null or empty content notes", async () => {
    const note = makeNote({ content: null, category: "uncategorized" });
    const onSaveEdit = vi.fn().mockResolvedValue(undefined);
    let tree!: ReactTestRenderer;

    await act(async () => {
      tree = create(<CardHarness initialNote={note} onSaveEdit={onSaveEdit} />);
      await Promise.resolve();
    });

    await openEditor(tree, note.id);

    await act(async () => {
      findByTestId(tree, testIds.notes.categoryOption(note.id, "health")).props.onPress();
      await Promise.resolve();
    });
    await pressSave(tree, note.id);

    expect(onSaveEdit).toHaveBeenCalledWith({
      id: note.id,
      category: "health",
      expectedUpdatedAt: note.updated_at,
    });
    expect(textContent(tree)).toContain("No content");
  });

  it("keeps pending notes non-clickable with disabled accessibility state", async () => {
    const note = makeNote({ classification_status: "pending" });
    const onStartEdit = vi.fn();
    let tree!: ReactTestRenderer;

    await act(async () => {
      tree = create(<MobileNoteCard note={note} onStartEdit={onStartEdit} />);
      await Promise.resolve();
    });

    const editButton = findByTestId(tree, testIds.notes.editButton(note.id));
    expect(editButton.props.disabled).toBe(true);
    expect(editButton.props.accessibilityState).toEqual({ disabled: true });
    expect(editButton.props.onPress).toBeUndefined();
    expect(onStartEdit).not.toHaveBeenCalled();
  });

  it("allows failed notes with saved text to enter edit mode", async () => {
    const note = makeNote({
      classification_status: "failed",
      content: "Recovered transcript",
    });
    let tree!: ReactTestRenderer;

    await act(async () => {
      tree = create(<CardHarness initialNote={note} onSaveEdit={vi.fn()} />);
      await Promise.resolve();
    });

    const editButton = findByTestId(tree, testIds.notes.editButton(note.id));
    expect(editButton.props.disabled).toBe(false);

    await openEditor(tree, note.id);

    expect(findByTestId(tree, testIds.notes.editInput(note.id)).props.value).toBe("Recovered transcript");
  });

  it("preserves draft and shows an inline error after save failure", async () => {
    const note = makeNote({});
    const onSaveEdit = vi.fn().mockRejectedValue(new Error("failed"));
    let tree!: ReactTestRenderer;

    await act(async () => {
      tree = create(<CardHarness initialNote={note} onSaveEdit={onSaveEdit} />);
      await Promise.resolve();
    });

    await openEditor(tree, note.id);

    await act(async () => {
      findByTestId(tree, testIds.notes.editInput(note.id)).props.onChangeText("Keep this draft");
      findByTestId(tree, testIds.notes.categoryOption(note.id, "admin")).props.onPress();
      await Promise.resolve();
    });
    await pressSave(tree, note.id);

    expect(findByTestId(tree, testIds.notes.editInput(note.id)).props.value).toBe("Keep this draft");
    expect(findByTestId(tree, testIds.notes.categoryOption(note.id, "admin")).props.accessibilityState).toEqual({
      selected: true,
    });
    expect(textContent(tree)).toContain("Couldn't save changes");
  });

  it("shows remote conflict messages, preserves draft, disables Save, and keeps Cancel available", async () => {
    const note = makeNote({});
    const onCancelEdit = vi.fn();
    let tree!: ReactTestRenderer;

    await act(async () => {
      tree = create(
        <MobileNoteCard
          note={note}
          isEditing
          remoteState="updated"
          onCancelEdit={onCancelEdit}
          onSaveEdit={vi.fn()}
        />
      );
      await Promise.resolve();
    });

    await act(async () => {
      findByTestId(tree, testIds.notes.editInput(note.id)).props.onChangeText("Local draft");
      await Promise.resolve();
    });

    expect(findByTestId(tree, testIds.notes.editInput(note.id)).props.value).toBe("Local draft");
    expect(findByTestId(tree, testIds.notes.saveButton(note.id)).props.disabled).toBe(true);
    expect(textContent(tree)).toContain("This note changed elsewhere");

    await act(async () => {
      findByTestId(tree, testIds.notes.cancelButton(note.id)).props.onPress();
      await Promise.resolve();
    });

    expect(onCancelEdit).toHaveBeenCalledWith(note.id);
  });

  it("shows deleted remote conflict message and disables Save", async () => {
    const note = makeNote({});
    let tree!: ReactTestRenderer;

    await act(async () => {
      tree = create(<MobileNoteCard note={note} isEditing remoteState="deleted" onSaveEdit={vi.fn()} />);
      await Promise.resolve();
    });

    expect(findByTestId(tree, testIds.notes.saveButton(note.id)).props.disabled).toBe(true);
    expect(textContent(tree)).toContain("This note was deleted elsewhere");
  });
});
