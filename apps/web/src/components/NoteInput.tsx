import { useEffect, useRef, useState } from "react";

import { useCreateNote } from "../hooks/useCreateNote";

export function NoteInput() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState("");
  const createNote = useCreateNote();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function submit() {
    const content = value.trim();
    if (!content) return;

    try {
      await createNote.mutateAsync(content);
      setValue("");
    } catch {
      // Toast is handled in the mutation.
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <textarea
        ref={textareaRef}
        aria-label="New note"
        placeholder="Type a note…"
        rows={3}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void submit();
          }
        }}
      />
      <div>
        <button type="button" onClick={submit} disabled={createNote.isPending}>
          {createNote.isPending ? "Saving..." : "Add note"}
        </button>
      </div>
    </div>
  );
}
