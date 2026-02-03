import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { NoteWithAttachments } from "@notesbrain/shared";
import { upsertNoteWithAttachments } from "@notesbrain/shared";

import { uploadNoteAttachment } from "../lib/uploadNoteAttachment";

type UploadFileInput = {
  uri: string;
  mimeType: string;
  fileName: string;
};

async function uploadFile(input: UploadFileInput): Promise<NoteWithAttachments> {
  const { uri, mimeType, fileName } = input;

  const safeFileName = `${Date.now()}_${sanitizeFileName(fileName)}`;

  return uploadNoteAttachment({
    noteType: "file",
    content: fileName,
    classificationStatus: "pending",
    category: "uncategorized",
    fileUri: uri,
    mimeType,
    resolveAttachmentFileName: () => fileName,
    resolveStoragePath: (userId, noteId) => `${userId}/attachments/${noteId}/${safeFileName}`,
  });
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadFile,
    onSuccess: (newNote) => {
      queryClient.setQueryData<NoteWithAttachments[]>(["notes"], (old) => {
        return upsertNoteWithAttachments(old, newNote, "start");
      });
    },
  });
}
