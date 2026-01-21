import { createSupabaseClient } from "@notesbrain/shared";

import { getSupabaseEnv } from "../env";

const { url, anonKey } = getSupabaseEnv();

export const supabase = createSupabaseClient(url, anonKey);

