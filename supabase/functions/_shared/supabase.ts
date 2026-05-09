export type CreateClientFn<TClient> = (
  supabaseUrl: string,
  key: string,
  options?: unknown
) => TClient;

type CreateServiceRoleClientInput<TClient> = {
  createClient: CreateClientFn<TClient>;
  supabaseUrl: string;
  serviceRoleKey: string;
};

function getJwtExpirySeconds(key: string): number | null {
  const [, payload] = key.split(".");
  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof parsed.exp === "number" ? parsed.exp : null;
  } catch {
    return null;
  }
}

function isExpiredJwt(key: string, nowSeconds: number): boolean {
  const expiresAt = getJwtExpirySeconds(key);
  return expiresAt !== null && expiresAt <= nowSeconds;
}

export function selectServiceRoleKey(
  candidates: Array<string | null | undefined>,
  nowSeconds = Math.floor(Date.now() / 1000)
): string {
  for (const candidate of candidates) {
    const key = candidate?.trim();
    if (key && !isExpiredJwt(key, nowSeconds)) {
      return key;
    }
  }

  return "";
}

export function getServiceRoleKeyFromEnv(): string {
  return selectServiceRoleKey([
    Deno.env.get("SECRET_KEY"),
    Deno.env.get("SERVICE_ROLE_KEY"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ]);
}

export function createServiceRoleClient<TClient>({
  createClient,
  supabaseUrl,
  serviceRoleKey
}: CreateServiceRoleClientInput<TClient>) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
}
