import { describe, expect, it, vi } from "vitest";

const createURLMock = vi.hoisted(() => vi.fn((path: string) => `echo://${path}`));

vi.mock("expo-linking", () => ({
  createURL: createURLMock,
}));

import { AUTH_CALLBACK_PATH, getAuthCallbackRedirectUrl, parseAuthRedirectUrl } from "../../lib/authRedirect";

describe("mobile auth redirect helpers", () => {
  it("builds callback URLs through Expo linking", () => {
    expect(getAuthCallbackRedirectUrl()).toBe("echo://auth/callback");
    expect(createURLMock).toHaveBeenCalledWith(AUTH_CALLBACK_PATH);
  });

  it("parses Supabase implicit recovery tokens from URL fragments", () => {
    const params = parseAuthRedirectUrl(
      "echo://auth/callback#access_token=access-token&refresh_token=refresh-token&type=recovery&expires_in=3600"
    );

    expect(params.accessToken).toBe("access-token");
    expect(params.refreshToken).toBe("refresh-token");
    expect(params.type).toBe("recovery");
    expect(params.code).toBeNull();
    expect(params.error).toBeNull();
  });

  it("parses query-string auth errors", () => {
    const params = parseAuthRedirectUrl(
      "echo://auth/callback?error=access_denied&error_description=Email+link+expired"
    );

    expect(params.error).toBe("access_denied");
    expect(params.errorDescription).toBe("Email link expired");
  });
});
