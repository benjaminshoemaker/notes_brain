import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockGetSession = vi.hoisted(() => vi.fn());
const mockOnAuthStateChange = vi.hoisted(() => vi.fn());

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange
    }
  }
}));

import { useAuth } from "../hooks/useAuth";

function Probe() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p>loading</p>;
  return <p>{user?.email ?? "no-user"}</p>;
}

describe("Task 2.2.A (auth state)", () => {
  it("should restore auth state when getSession returns a session", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user_1", email: "me@example.com" } } },
      error: null
    });

    const subscription = { unsubscribe: vi.fn() };
    mockOnAuthStateChange.mockReturnValue({ data: { subscription } });

    const { getByText } = render(<Probe />);

    await waitFor(() => {
      expect(getByText("me@example.com")).toBeInTheDocument();
    });
  });
});

