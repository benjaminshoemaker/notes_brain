import * as Linking from "expo-linking";

export const AUTH_CALLBACK_PATH = "auth/callback";

export type AuthRedirectParams = {
  accessToken: string | null;
  refreshToken: string | null;
  code: string | null;
  type: string | null;
  error: string | null;
  errorDescription: string | null;
};

export function getAuthCallbackRedirectUrl() {
  return Linking.createURL(AUTH_CALLBACK_PATH);
}

function readParamsFromPart(part: string, params: URLSearchParams) {
  const cleanedPart = part.replace(/^[?#]/, "");
  if (!cleanedPart) {
    return;
  }

  const nextParams = new URLSearchParams(cleanedPart);
  nextParams.forEach((value, key) => {
    params.set(key, value);
  });
}

export function parseAuthRedirectUrl(url: string): AuthRedirectParams {
  const params = new URLSearchParams();
  const queryStart = url.indexOf("?");
  const hashStart = url.indexOf("#");

  if (queryStart >= 0) {
    const queryEnd = hashStart >= 0 && hashStart > queryStart ? hashStart : undefined;
    readParamsFromPart(url.slice(queryStart + 1, queryEnd), params);
  }

  if (hashStart >= 0) {
    readParamsFromPart(url.slice(hashStart + 1), params);
  }

  return {
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
    code: params.get("code"),
    type: params.get("type"),
    error: params.get("error") ?? params.get("error_code"),
    errorDescription: params.get("error_description"),
  };
}
