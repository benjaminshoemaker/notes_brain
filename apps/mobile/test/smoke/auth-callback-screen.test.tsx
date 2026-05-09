import React from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  exchangeCodeForSessionMock,
  getLinkingURLMock,
  routerReplaceMock,
  setSessionMock,
  updateUserMock,
  useLinkingURLMock
} = vi.hoisted(() => ({
  exchangeCodeForSessionMock: vi.fn(),
  getLinkingURLMock: vi.fn(),
  routerReplaceMock: vi.fn(),
  setSessionMock: vi.fn(),
  updateUserMock: vi.fn(),
  useLinkingURLMock: vi.fn(),
}));

vi.mock("expo-linking", () => ({
  createURL: vi.fn((path: string) => `echo://${path}`),
  getLinkingURL: getLinkingURLMock,
  useLinkingURL: useLinkingURLMock,
}));

vi.mock("expo-router", () => ({
  Stack: {
    Screen: (props: Record<string, unknown>) => React.createElement("StackScreen", props),
  },
  useRouter: () => ({
    replace: routerReplaceMock,
  }),
}));

vi.mock("@expo/vector-icons", () => ({
  Ionicons: (props: Record<string, unknown>) => React.createElement("Ionicons", props),
}));

vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
      setSession: setSessionMock,
      updateUser: updateUserMock,
    },
  },
}));

import AuthCallbackScreen from "../../app/auth/callback";
import { testIds } from "../../lib/testIds";

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function findByTestID(tree: ReactTestRenderer, testID: string) {
  return tree.root.findByProps({ testID });
}

describe("mobile auth callback screen", () => {
  beforeEach(() => {
    exchangeCodeForSessionMock.mockReset();
    getLinkingURLMock.mockReset();
    routerReplaceMock.mockReset();
    setSessionMock.mockReset();
    updateUserMock.mockReset();
    useLinkingURLMock.mockReset();

    getLinkingURLMock.mockReturnValue(null);
    setSessionMock.mockResolvedValue({ error: null });
    updateUserMock.mockResolvedValue({ error: null });
  });

  it("sets a recovery session and lets the user update their password", async () => {
    useLinkingURLMock.mockReturnValue(
      "echo://auth/callback#access_token=access-token&refresh_token=refresh-token&type=recovery"
    );

    let tree!: ReactTestRenderer;

    await act(async () => {
      tree = create(<AuthCallbackScreen />);
      await flushPromises();
    });

    expect(setSessionMock).toHaveBeenCalledWith({
      access_token: "access-token",
      refresh_token: "refresh-token",
    });
    expect(findByTestID(tree, testIds.auth.passwordResetInput)).toBeTruthy();

    await act(async () => {
      findByTestID(tree, testIds.auth.passwordResetInput).props.onChangeText("new-password");
      findByTestID(tree, testIds.auth.passwordResetConfirmInput).props.onChangeText("new-password");
    });

    await act(async () => {
      await findByTestID(tree, testIds.auth.passwordResetSubmitButton).props.onPress();
    });

    expect(updateUserMock).toHaveBeenCalledWith({ password: "new-password" });
    expect(routerReplaceMock).toHaveBeenCalledWith("/(app)");
  });

  it("opens the app for non-recovery auth links", async () => {
    useLinkingURLMock.mockReturnValue(
      "echo://auth/callback#access_token=access-token&refresh_token=refresh-token&type=magiclink"
    );

    await act(async () => {
      create(<AuthCallbackScreen />);
      await flushPromises();
    });

    expect(setSessionMock).toHaveBeenCalledWith({
      access_token: "access-token",
      refresh_token: "refresh-token",
    });
    expect(routerReplaceMock).toHaveBeenCalledWith("/(app)");
  });
});
