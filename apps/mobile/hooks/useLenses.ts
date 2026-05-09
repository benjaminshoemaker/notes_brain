import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Lens, LensTemplateSnapshot } from "@notesbrain/shared";

import { ensureUserProfile } from "../lib/ensureUserProfile";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./useAuth";

type EditableLensInput = {
  name: string;
  prompt: string;
  schedule_type?: "daily" | "weekly";
  schedule_time?: string;
  schedule_day?: number | null;
  lookback_hours?: number;
  categories?: string[] | null;
};

export type CreateLensInput = EditableLensInput & {
  source_template_id?: string | null;
  source_template_version?: number | null;
  installed_from_library_at?: string | null;
  template_snapshot?: LensTemplateSnapshot | null;
};

type UpdateLensInput = {
  id: string;
} & Partial<EditableLensInput> & {
  is_active?: boolean;
};

type ToggleLensActiveInput = {
  id: string;
  is_active: boolean;
};

async function fetchLenses(
  userId: string,
  userEmail: string | null | undefined
): Promise<Lens[]> {
  await ensureUserProfile({
    id: userId,
    email: userEmail
  });

  const { data, error } = await (supabase as any)
    .from("lenses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Lens[];
}

async function createLens(
  userId: string,
  userEmail: string | null | undefined,
  input: CreateLensInput
): Promise<Lens> {
  await ensureUserProfile({
    id: userId,
    email: userEmail
  });

  const { data, error } = await (supabase as any)
    .from("lenses")
    .insert({
      user_id: userId,
      name: input.name,
      prompt: input.prompt,
      schedule_type: input.schedule_type,
      schedule_time: input.schedule_time,
      schedule_day: input.schedule_day,
      lookback_hours: input.lookback_hours,
      categories: input.categories,
      source_template_id: input.source_template_id,
      source_template_version: input.source_template_version,
      installed_from_library_at: input.installed_from_library_at,
      template_snapshot: input.template_snapshot
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Lens;
}

async function updateLens(userId: string, input: UpdateLensInput): Promise<Lens> {
  const { id, ...updates } = input;

  const { data, error } = await (supabase as any)
    .from("lenses")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Lens;
}

async function deleteLens(userId: string, id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("lenses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

async function toggleLensActive(
  userId: string,
  input: ToggleLensActiveInput
): Promise<Lens> {
  const { data, error } = await (supabase as any)
    .from("lenses")
    .update({ is_active: input.is_active })
    .eq("id", input.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Lens;
}

export function useLenses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const userEmail = user?.email;
  const lensesQueryKey = ["lenses", userId] as const;

  const lensesQuery = useQuery({
    queryKey: lensesQueryKey,
    queryFn: () => {
      if (!userId) {
        return [];
      }

      return fetchLenses(userId, userEmail);
    },
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateLensInput) => {
      if (!userId) {
        throw new Error("Not authenticated");
      }

      return createLens(userId, userEmail, input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: lensesQueryKey });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateLensInput) => {
      if (!userId) {
        throw new Error("Not authenticated");
      }

      return updateLens(userId, input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: lensesQueryKey });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!userId) {
        throw new Error("Not authenticated");
      }

      return deleteLens(userId, id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: lensesQueryKey });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: (input: ToggleLensActiveInput) => {
      if (!userId) {
        throw new Error("Not authenticated");
      }

      return toggleLensActive(userId, input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: lensesQueryKey });
    }
  });

  return {
    data: lensesQuery.data,
    isLoading: lensesQuery.isLoading,
    error: lensesQuery.error,
    refetch: lensesQuery.refetch,
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation,
    toggleActive: toggleMutation,
  };
}
