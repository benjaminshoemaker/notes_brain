type SupabaseEnv = {
  url: string;
  anonKey: string;
};

function readViteEnv(name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_ANON_KEY") {
  const value = import.meta.env?.[name] ?? process.env[name];
  return typeof value === "string" ? value : "";
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = readViteEnv("VITE_SUPABASE_URL");
  const anonKey = readViteEnv("VITE_SUPABASE_ANON_KEY");

  if (!url || !anonKey) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  }

  return { url, anonKey };
}

