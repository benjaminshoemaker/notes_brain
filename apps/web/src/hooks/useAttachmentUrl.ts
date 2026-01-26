import { useQuery } from "@tanstack/react-query";

import { isNetworkError } from "../lib/errors";
import { supabase } from "../lib/supabaseClient";

export function useAttachmentUrl(storagePath: string) {
  return useQuery({
    queryKey: ["attachmentUrl", storagePath],
    enabled: Boolean(storagePath),
    useErrorBoundary: (error) => !isNetworkError(error),
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("attachments")
        .createSignedUrl(storagePath, 60 * 5);

      if (error) {
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error("Failed to create signed URL");
      }

      return data.signedUrl;
    }
  });
}
