import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { NoteWithAttachments } from "@notesbrain/shared";
import { upsertNoteWithAttachments } from "@notesbrain/shared";

import { uploadNoteAttachment } from "../lib/uploadNoteAttachment";

type UploadVoiceNoteInput = {
  uri: string;
};

async function uploadVoiceNote(input: UploadVoiceNoteInput): Promise<NoteWithAttachments> {
  const { uri } = input;

  return uploadNoteAttachment({
    noteType: "voice",
    content: null,
    classificationStatus: "pending",
    category: "uncategorized",
    fileUri: uri,
    mimeType: "audio/mp4",
    resolveAttachmentFileName: (noteId) => `${noteId}.m4a`,
    // Path must match what transcribe-voice expects: {user_id}/voice/{note_id}.m4a
    resolveStoragePath: (userId, _noteId, attachmentFileName) =>
      `${userId}/voice/${attachmentFileName}`,
    cleanupLocalFile: true,
  });
}

export function useUploadVoiceNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadVoiceNote,
    onSuccess: (newNote) => {
      queryClient.setQueryData<NoteWithAttachments[]>(["notes"], (old) => {
        return upsertNoteWithAttachments(old, newNote, "start");
      });
    },
  });
}
