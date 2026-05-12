import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type {
  Category,
  CommunityLensTemplate,
  CommunityLensTemplatePublic,
  Lens,
  LensTemplateReport,
  LensTemplateReportReason
} from "@notesbrain/shared";

import {
  communityTemplateToLensTemplate,
  getTemplateInstallState,
  type LensLibraryInstallState
} from "../lib/lensLibrary";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./useAuth";
import { useLenses } from "./useLenses";

export type CommunityLensItem = {
  row: CommunityLensTemplatePublic;
  template: ReturnType<typeof communityTemplateToLensTemplate>;
  installState: LensLibraryInstallState;
  installedLens: Lens | null;
};

export type PublishCommunityLensInput = {
  lensId: string;
  authorDisplayName: string;
  description: string;
  category?: Category;
};

export type ReportCommunityLensInput = {
  templateId: string;
  reason: LensTemplateReportReason;
  note?: string | null;
};

export type CommunityLensFilters = {
  search?: string;
  category?: Category | null;
};

export const communityLensQueryKeys = {
  publicTemplates: (filters: CommunityLensFilters) => [
    "community-lens-templates",
    {
      search: filters.search?.trim() ?? "",
      category: filters.category ?? null
    }
  ],
  authoredTemplates: (userId: string | undefined) => [
    "authored-community-lens-templates",
    userId ?? null
  ],
  lenses: (userId: string | undefined) => ["lenses", userId] as const
};

function escapeIlike(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

export async function fetchCommunityTemplates(
  filters: CommunityLensFilters = {}
): Promise<CommunityLensTemplatePublic[]> {
  const search = filters.search?.trim();
  let query = (supabase as any)
    .from('community_lens_templates_public')
    .select("*")
    .order('install_count', { ascending: false })
    .order("updated_at", { ascending: false });

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if (search) {
    const pattern = `%${escapeIlike(search)}%`;
    query = query.or(
      `name.ilike.${pattern},description.ilike.${pattern},author_display_name.ilike.${pattern}`
    );
  }

  const { data, error } = await query.limit(100);

  if (error) {
    throw error;
  }

  return (data ?? []) as CommunityLensTemplatePublic[];
}

export async function fetchAuthoredCommunityTemplates(): Promise<CommunityLensTemplate[]> {
  const { data, error } = await (supabase as any)
    .from("lens_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as CommunityLensTemplate[];
}

export function createCommunityLensItems(
  rows: CommunityLensTemplatePublic[],
  lenses: Lens[]
): CommunityLensItem[] {
  return rows.map((row) => {
    const template = communityTemplateToLensTemplate(row);

    return {
      row,
      template,
      ...getTemplateInstallState(template, lenses)
    };
  });
}

export async function publishCommunityLens(input: PublishCommunityLensInput) {
  const { data, error } = await (supabase as any).rpc('publish_lens_template', {
    p_lens_id: input.lensId,
    p_author_display_name: input.authorDisplayName,
    p_description: input.description,
    p_category: input.category ?? "uncategorized"
  });

  if (error) {
    throw error;
  }

  return data as CommunityLensTemplate;
}

export async function unpublishCommunityLens(lensId: string) {
  const { data, error } = await (supabase as any).rpc('unpublish_lens_template', {
    p_lens_id: lensId
  });

  if (error) {
    throw error;
  }

  return data as CommunityLensTemplate;
}

export async function installCommunityLens(templateId: string): Promise<Lens> {
  const { data, error } = await (supabase as any).rpc('install_lens_template', {
    p_template_id: templateId
  });

  if (error) {
    throw error;
  }

  return data as Lens;
}

export async function reportCommunityLens(input: ReportCommunityLensInput): Promise<LensTemplateReport> {
  const { data, error } = await (supabase as any).rpc('report_lens_template', {
    p_template_id: input.templateId,
    p_reason: input.reason,
    p_note: input.note ?? null
  });

  if (error) {
    throw error;
  }

  return data as LensTemplateReport;
}

export async function invalidateCommunityLensQueries(
  queryClient: QueryClient,
  userId: string | undefined
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["community-lens-templates"] }),
    queryClient.invalidateQueries({ queryKey: communityLensQueryKeys.authoredTemplates(userId) }),
    queryClient.invalidateQueries({ queryKey: communityLensQueryKeys.lenses(userId) })
  ]);
}

export function useCommunityLenses(initialFilters: CommunityLensFilters = {}) {
  const { user } = useAuth();
  const { data: lenses = [] } = useLenses();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const [search, setSearch] = useState(initialFilters.search ?? "");
  const [category, setCategory] = useState<Category | null>(initialFilters.category ?? null);
  const filters = { search, category };

  const publicTemplatesQuery = useQuery({
    queryKey: communityLensQueryKeys.publicTemplates(filters),
    queryFn: () => fetchCommunityTemplates(filters),
    staleTime: 1000 * 60 * 5
  });

  const authoredTemplatesQuery = useQuery({
    queryKey: communityLensQueryKeys.authoredTemplates(userId),
    queryFn: fetchAuthoredCommunityTemplates,
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5
  });

  const templates = useMemo(
    () => createCommunityLensItems(publicTemplatesQuery.data ?? [], lenses),
    [publicTemplatesQuery.data, lenses]
  );

  const onCommunityMutationSuccess = async () => {
    await invalidateCommunityLensQueries(queryClient, userId);
  };

  const publish = useMutation({
    mutationFn: publishCommunityLens,
    onSuccess: onCommunityMutationSuccess
  });

  const unpublish = useMutation({
    mutationFn: unpublishCommunityLens,
    onSuccess: onCommunityMutationSuccess
  });

  const install = useMutation({
    mutationFn: installCommunityLens,
    onSuccess: onCommunityMutationSuccess
  });

  const report = useMutation({
    mutationFn: reportCommunityLens,
    onSuccess: onCommunityMutationSuccess
  });

  return {
    templates,
    authoredTemplates: authoredTemplatesQuery.data ?? [],
    search,
    setSearch,
    category,
    setCategory,
    sort: "most-installed" as const,
    isLoading: publicTemplatesQuery.isLoading || authoredTemplatesQuery.isLoading,
    error: publicTemplatesQuery.error ?? authoredTemplatesQuery.error,
    refetch: publicTemplatesQuery.refetch,
    publish,
    unpublish,
    install,
    report
  };
}
