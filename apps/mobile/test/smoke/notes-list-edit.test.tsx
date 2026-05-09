import React from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestInstance, ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NoteWithAttachments } from "@notesbrain/shared";

vi.mock("../../components/MobileNoteCard", () => ({
  MobileNoteCard: (props: {
    note: NoteWithAttachments;
    isEditing: boolean;
    isEditDisabled: boolean;
    remoteState: string;
    onStartEdit?: (note: NoteWithAttachments) => void;
  }) => React.createElement(
    "Pressable",
    {
      testID: `mock-note-card-${props.note.id}`,
      onPress: () => props.onStartEdit?.(props.note),
      isEditing: props.isEditing,
      isEditDisabled: props.isEditDisabled,
      remoteState: props.remoteState,
    },
    React.createElement(
      "Text",
      null,
      `${props.note.id}:${String(props.isEditing)}:${String(props.isEditDisabled)}:${props.remoteState}`
    )
  )
}));

import { NotesList } from "../../components/NotesList";

function makeNote(id: string, category: NoteWithAttachments["category"]): NoteWithAttachments {
  return {
    id,
    user_id: "user-1",
    created_at: `2026-05-01T00:0${id.slice(-1)}:00.000Z`,
    updated_at: `2026-05-01T00:0${id.slice(-1)}:00.000Z`,
    type: "text",
    content: `Note ${id}`,
    category,
    classification_status: "completed",
    classification_confidence: 0.9,
    attachments: [],
  };
}

function textContent(tree: ReactTestRenderer) {
  return tree.root
    .findAll((node: ReactTestInstance) => String(node.type) === "Text")
    .map((node) => node.children.join(""))
    .join("\n");
}

describe("NotesList edit coordination", () => {
  const notes = [
    makeNote("note-1", "ideas"),
    makeNote("note-2", "projects"),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes active edit state and disables other note cards", async () => {
    let tree!: ReactTestRenderer;

    await act(async () => {
      tree = create(
        <NotesList
          notes={notes}
          isLoading={false}
          isRefetching={false}
          onRefresh={vi.fn()}
          selectedCategory="all"
          activeEditState={{
            noteId: "note-1",
            baseUpdatedAt: notes[0].updated_at,
            remoteState: "clean",
          }}
          onStartEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onSaveEdit={vi.fn()}
        />
      );
      await Promise.resolve();
    });

    expect(textContent(tree)).toContain("note-1:true:false:clean");
    expect(textContent(tree)).toContain("note-2:false:true:clean");
  });

  it("omits pull-to-refresh while editing and restores it afterward", async () => {
    const onRefresh = vi.fn();
    let tree!: ReactTestRenderer;

    await act(async () => {
      tree = create(
        <NotesList
          notes={notes}
          isLoading={false}
          isRefetching={false}
          onRefresh={onRefresh}
          selectedCategory="all"
          activeEditState={{
            noteId: "note-1",
            baseUpdatedAt: notes[0].updated_at,
            remoteState: "clean",
          }}
          onStartEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onSaveEdit={vi.fn()}
        />
      );
      await Promise.resolve();
    });

    expect(tree.root.find((node) => String(node.type) === "FlatList").props.refreshControl).toBeUndefined();

    await act(async () => {
      tree.update(
        <NotesList
          notes={notes}
          isLoading={false}
          isRefetching={false}
          onRefresh={onRefresh}
          selectedCategory="all"
          activeEditState={null}
          onStartEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onSaveEdit={vi.fn()}
        />
      );
      await Promise.resolve();
    });

    expect(tree.root.find((node) => String(node.type) === "FlatList").props.refreshControl).toBeTruthy();
  });

  it("reflects category changes when the notes array updates", async () => {
    let tree!: ReactTestRenderer;

    await act(async () => {
      tree = create(
        <NotesList
          notes={notes}
          isLoading={false}
          isRefetching={false}
          onRefresh={vi.fn()}
          selectedCategory="projects"
          activeEditState={null}
          onStartEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onSaveEdit={vi.fn()}
        />
      );
      await Promise.resolve();
    });

    expect(textContent(tree)).not.toContain("note-1:false:false:clean");
    expect(textContent(tree)).toContain("note-2:false:false:clean");

    await act(async () => {
      tree.update(
        <NotesList
          notes={[{ ...notes[0], category: "projects" }, notes[1]]}
          isLoading={false}
          isRefetching={false}
          onRefresh={vi.fn()}
          selectedCategory="projects"
          activeEditState={null}
          onStartEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onSaveEdit={vi.fn()}
        />
      );
      await Promise.resolve();
    });

    expect(textContent(tree)).toContain("note-1:false:false:clean");
    expect(textContent(tree)).toContain("note-2:false:false:clean");
  });
});
