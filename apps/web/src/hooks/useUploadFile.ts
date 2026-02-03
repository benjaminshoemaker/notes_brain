import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Category } from "@notesbrain/shared";

import { useAuth } from "./useAuth";
import { useToast } from "./useToast";
import { uploadAttachmentFile } from "../lib/uploadApi";

type Payload = {
  file: File;
  category?: Category;
};

export function useUploadFile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: async ({ file, category }: Payload) => {
      if (!user) {
        throw new Error("Not authenticated");
      }
      return uploadAttachmentFile({ userId: user.id, file, category });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (_error, variables) => {
      showToast("Failed to upload file.", "error", {
        label: "Retry",
        onClick: () => {
          mutation.mutate(variables);
        }
      });
    }
  });

  return mutation;
}
