import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const useAuthMock = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useAuth", () => ({
  useAuth: useAuthMock
}));

const signInWithPasswordMock = vi.hoisted(() => vi.fn());
const signUpWithPasswordMock = vi.hoisted(() => vi.fn());
const sendMagicLinkMock = vi.hoisted(() => vi.fn());
const signOutUserMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/authApi", () => ({
  signInWithPassword: signInWithPasswordMock,
  signUpWithPassword: signUpWithPasswordMock,
  sendMagicLink: sendMagicLinkMock,
  signOutUser: signOutUserMock
}));

async function renderAppAt(pathname: string) {
  const { AppProviders } = await import("../AppProviders");
  const App = (await import("../App")).default;

  window.history.pushState({}, "", pathname);

  return render(
    <AppProviders>
      <App />
    </AppProviders>
  );
}

describe("Task 2.2.A (UI)", () => {
  it("should render email and password fields when visiting /login", async () => {
    useAuthMock.mockReturnValue({ user: null, session: null, isLoading: false });

    const { getByLabelText } = await renderAppAt("/login");

    expect(getByLabelText(/email/i)).toBeInTheDocument();
    expect(getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("should render email and password fields when visiting /signup", async () => {
    useAuthMock.mockReturnValue({ user: null, session: null, isLoading: false });

    const { getByLabelText } = await renderAppAt("/signup");

    expect(getByLabelText(/email/i)).toBeInTheDocument();
    expect(getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("should send a magic link when clicking the magic link button", async () => {
    useAuthMock.mockReturnValue({ user: null, session: null, isLoading: false });
    sendMagicLinkMock.mockResolvedValue({ error: null });

    const user = userEvent.setup();
    const { getByLabelText, getByRole } = await renderAppAt("/login");

    await user.type(getByLabelText(/email/i), "me@example.com");
    await user.click(getByRole("button", { name: /magic link/i }));

    expect(sendMagicLinkMock).toHaveBeenCalledWith("me@example.com", expect.any(String));
  });

  it("should redirect to / when sign-in succeeds", async () => {
    useAuthMock.mockReturnValue({
      user: { id: "user_1", email: "me@example.com" },
      session: { user: { id: "user_1", email: "me@example.com" } },
      isLoading: false
    });
    signInWithPasswordMock.mockResolvedValue({ error: null });

    const user = userEvent.setup();
    const { getByLabelText, getByRole } = await renderAppAt("/login");

    await user.type(getByLabelText(/email/i), "me@example.com");
    await user.type(getByLabelText(/password/i), "password");
    await user.click(getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
    });
  });

  it("should sign out and redirect to /login when logout is clicked", async () => {
    useAuthMock.mockReturnValue({
      user: { id: "user_1", email: "me@example.com" },
      session: { user: { id: "user_1", email: "me@example.com" } },
      isLoading: false
    });
    signOutUserMock.mockResolvedValue({ error: null });

    const user = userEvent.setup();
    const { getByRole } = await renderAppAt("/");

    await user.click(getByRole("button", { name: /logout/i }));

    expect(signOutUserMock).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(window.location.pathname).toBe("/login");
    });
  });
});
