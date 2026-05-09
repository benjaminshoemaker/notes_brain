const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";

export function shouldInvokeLocalEdgeFunction() {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?($|\/)/.test(supabaseUrl);
}

export async function invokeLocalEdgeFunction(functionName: string, body: unknown) {
  if (!shouldInvokeLocalEdgeFunction()) {
    return;
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Local ${functionName} failed: ${response.status}${detail ? ` ${detail}` : ""}`);
  }
}
