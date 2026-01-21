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

export function createServiceRoleClient<TClient>({
  createClient,
  supabaseUrl,
  serviceRoleKey
}: CreateServiceRoleClientInput<TClient>) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

