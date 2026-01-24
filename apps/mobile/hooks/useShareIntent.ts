import { useEffect, useCallback, useState } from "react";
import { useShareIntent as useShareIntentLib, ShareIntent } from "expo-share-intent";

import { useCreateNote } from "./useCreateNote";
import { useUploadFile } from "./useUploadFile";

type ShareIntentState = {
  isProcessing: boolean;
  error: string | null;
  lastProcessedIntent: ShareIntent | null;
};

type UseShareIntentResult = {
  state: ShareIntentState;
  hasShareIntent: boolean;
  shareIntent: ShareIntent | null;
  processShareIntent: () => Promise<void>;
  resetShareIntent: () => void;
};

export function useShareIntent(): UseShareIntentResult {
  const { hasShareIntent, shareIntent, resetShareIntent, error: shareError } = useShareIntentLib();
  const createNote = useCreateNote();
  const uploadFile = useUploadFile();

  const [state, setState] = useState<ShareIntentState>({
    isProcessing: false,
    error: null,
    lastProcessedIntent: null,
  });

  const processShareIntent = useCallback(async () => {
    if (!shareIntent) return;

    setState((prev) => ({ ...prev, isProcessing: true, error: null }));

    try {
      // Handle text content
      if (shareIntent.text) {
        await createNote.mutateAsync({
          content: shareIntent.text,
          type: "text",
        });
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          lastProcessedIntent: shareIntent,
        }));
        resetShareIntent();
        return;
      }

      // Handle file attachments
      if (shareIntent.files && shareIntent.files.length > 0) {
        for (const file of shareIntent.files) {
          await uploadFile.mutateAsync({
            uri: file.path,
            mimeType: file.mimeType,
            fileName: file.fileName || `shared_${Date.now()}`,
          });
        }
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          lastProcessedIntent: shareIntent,
        }));
        resetShareIntent();
        return;
      }

      // Handle web URL (from share intent)
      if (shareIntent.webUrl) {
        await createNote.mutateAsync({
          content: shareIntent.webUrl,
          type: "text",
        });
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          lastProcessedIntent: shareIntent,
        }));
        resetShareIntent();
        return;
      }

      // No content to process
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: "No content found in shared data",
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process shared content";
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: message,
      }));
    }
  }, [shareIntent, createNote, uploadFile, resetShareIntent]);

  // Auto-process text shares immediately
  useEffect(() => {
    if (hasShareIntent && shareIntent?.text && !state.isProcessing) {
      processShareIntent();
    }
  }, [hasShareIntent, shareIntent?.text, state.isProcessing, processShareIntent]);

  // Combine library error with state error
  const combinedError = shareError || state.error;

  return {
    state: { ...state, error: combinedError },
    hasShareIntent,
    shareIntent,
    processShareIntent,
    resetShareIntent,
  };
}
