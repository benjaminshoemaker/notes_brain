import React from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionMock,
  onAuthStateChangeMock,
  unsubscribeMock
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  unsubscribeMock: vi.fn()
}));

vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock
    }
  }
}));

vi.mock("expo-router", () => ({
  Redirect: ({ href }: { href: string }) => React.createElement("Redirect", { href })
}));

import IndexScreen from "../../app/index";

async function renderScreen() {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<IndexScreen />);
    await Promise.resolve();
  });
  return tree;
}

describe("mobile auth entry smoke", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    onAuthStateChangeMock.mockReset();
    unsubscribeMock.mockReset();
    onAuthStateChangeMock.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock
        }
      }
    });
  });

  it("should redirect to app when session exists", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } }
    });

    const tree = await renderScreen();
    const redirect = tree.root.findAll((item: { type: unknown }) => String(item.type) === "Redirect")[0];
    expect(redirect?.props.href).toBe("/(app)");
  });

  it("should redirect to login when no session exists", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: null }
    });

    const tree = await renderScreen();
    const redirect = tree.root.findAll((item: { type: unknown }) => String(item.type) === "Redirect")[0];
    expect(redirect?.props.href).toBe("/(auth)/login");
  });
});
