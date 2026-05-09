import React from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NoteWithAttachments } from "@notesbrain/shared";
import type { UpdateNoteInput } from "../../hooks/useUpdateNote";

const {
  useAuthMock,
  useNotesMock,
  useRealtimeNotesMock,
  updateNoteMutateAsyncMock,
  focusCleanupRef,
  notesListPropsRef,
  categoryFilterPropsRef,
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useNotesMock: vi.fn(),
  useRealtimeNotesMock: vi.fn(),
  updateNoteMutateAsyncMock: vi.fn(),
  focusCleanupRef: { current: undefined as undefined | (() => void) },
  notesListPropsRef: { current: undefined as undefined | Record<string, unknown> },
  categoryFilterPropsRef: { current: undefined as undefined | Record<string, unknown> },
}));

vi.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    focusCleanupRef.current = callback() ?? undefined;
  },
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("../../hooks/useNotes", () => ({
  useNotes: () => useNotesMock(),
}));

vi.mock("../../hooks/useRealtimeNotes", () => ({
  useRealtimeNotes: (userId: string | undefined, callbacks?: unknown) => useRealtimeNotesMock(userId, callbacks),
}));

vi.mock("../../hooks/useUpdateNote", () => ({
  useUpdateNote: () => ({
    mutateAsync: updateNoteMutateAsyncMock,
  }),
}));

vi.mock("../../components/MobileCategoryFilter", () => ({
  MobileCategoryFilter: (props: Record<string, unknown>) => {
    categoryFilterPropsRef.current = props;
    return React.createElement("Text", null, `Category Filter disabled:${String(props.disabled)}`);
  },
}));

vi.mock("../../components/NotesList", () => ({
  NotesList: (props: Record<string, unknown>) => {
    notesListPropsRef.current = props;
    return React.createElement("Text", null, `Active:${JSON.stringify(props.activeEditState)}`);
  },
}));

import NotesScreen from "../../app/(app)/notes";

function makeNote(overrides: Partial<NoteWithAttachments>): NoteWithAttachments {
  return {
    id: "note-1",
    user_id: "user-1",
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
    type: "text",
    content: "Original",
    category: "ideas",
    classification_status: "completed",
    classification_confidence: 0.9,
    attachments: [],
    ...overrides,
  };
}

describe("NotesScreen edit state", () => {
  const refetchMock = vi.fn();
  const note = makeNote({});

  beforeEach(() => {
    vi.clearAllMocks();
    focusCleanupRef.current = undefined;
    notesListPropsRef.current = undefined;
    categoryFilterPropsRef.current = undefined;
    useAuthMock.mockReturnValue({ user: { id: "user-1" } });
    useNotesMock.mockReturnValue({
      data: [note],
      isLoading: false,
      isRefetching: false,
      refetch: refetchMock,
      error: null,
    });
    updateNoteMutateAsyncMock.mockResolvedValue(note);
  });

  it("clears active draft state on Notes tab focus loss", async () => {
    await renderScreen();

    await act(async () => {
      (notesListPropsRef.current!.onStartEdit as (selected: NoteWithAttachments) => void)(note);
      await Promise.resolve();
    });
    expect(notesListPropsRef.current!.activeEditState).toMatchObject({ noteId: note.id });
    expect(categoryFilterPropsRef.current!.disabled).toBe(true);

    await act(async () => {
      focusCleanupRef.current?.();
      await Promise.resolve();
    });

    expect(notesListPropsRef.current!.activeEditState).toBeNull();
    expect(categoryFilterPropsRef.current!.disabled).toBe(false);
  });

  it("clears active draft state on sign out", async () => {
    const { tree } = await renderScreen();

    await act(async () => {
      (notesListPropsRef.current!.onStartEdit as (selected: NoteWithAttachments) => void)(note);
      await Promise.resolve();
    });
    expect(notesListPropsRef.current!.activeEditState).toMatchObject({ noteId: note.id });

    useAuthMock.mockReturnValue({ user: null });
    await act(async () => {
      tree.update(<NotesScreen />);
      await Promise.resolve();
    });

    expect(notesListPropsRef.current!.activeEditState).toBeNull();
  });

  it("marks active note as remotely updated and refetches on cancel", async () => {
    await renderScreen();

    await act(async () => {
      (notesListPropsRef.current!.onStartEdit as (selected: NoteWithAttachments) => void)(note);
      await Promise.resolve();
    });

    const callbacks = useRealtimeNotesMock.mock.calls.at(-1)![1] as {
      onRemoteUpdate: (noteId: string) => boolean;
    };

    await act(async () => {
      expect(callbacks.onRemoteUpdate(note.id)).toBe(true);
      await Promise.resolve();
    });

    expect(notesListPropsRef.current!.activeEditState).toMatchObject({ remoteState: "updated" });

    await act(async () => {
      (notesListPropsRef.current!.onCancelEdit as (noteId: string) => void)(note.id);
      await Promise.resolve();
    });

    expect(refetchMock).toHaveBeenCalled();
    expect(notesListPropsRef.current!.activeEditState).toBeNull();
  });

  it("marks active note as remotely deleted and refetches on cancel", async () => {
    await renderScreen();

    await act(async () => {
      (notesListPropsRef.current!.onStartEdit as (selected: NoteWithAttachments) => void)(note);
      await Promise.resolve();
    });

    const callbacks = useRealtimeNotesMock.mock.calls.at(-1)![1] as {
      onRemoteDelete: (noteId: string) => boolean;
    };

    await act(async () => {
      expect(callbacks.onRemoteDelete(note.id)).toBe(true);
      await Promise.resolve();
    });

    expect(notesListPropsRef.current!.activeEditState).toMatchObject({ remoteState: "deleted" });

    await act(async () => {
      (notesListPropsRef.current!.onCancelEdit as (noteId: string) => void)(note.id);
      await Promise.resolve();
    });

    expect(refetchMock).toHaveBeenCalled();
    expect(notesListPropsRef.current!.activeEditState).toBeNull();
  });

  it("saves through the update hook and exits edit mode", async () => {
    await renderScreen();
    const input: UpdateNoteInput = {
      id: note.id,
      content: "Updated",
      expectedUpdatedAt: note.updated_at,
    };

    await act(async () => {
      (notesListPropsRef.current!.onStartEdit as (selected: NoteWithAttachments) => void)(note);
      await (notesListPropsRef.current!.onSaveEdit as (saveInput: UpdateNoteInput) => Promise<void>)(input);
    });

    expect(updateNoteMutateAsyncMock).toHaveBeenCalledWith(input);
    expect(notesListPropsRef.current!.activeEditState).toBeNull();
  });
});

async function renderScreen() {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<NotesScreen />);
    await Promise.resolve();
  });
  return { tree };
}
