import { Route, Routes, useNavigate } from "react-router-dom";

import { AuthGuard } from "./components/AuthGuard";
import { signOutUser } from "./lib/authApi";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";

function NotesHomePage() {
  const navigate = useNavigate();

  async function handleLogout() {
    await signOutUser();
    navigate("/login", { replace: true });
  }

  return (
    <div>
      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>NotesBrain</h1>
        <div style={{ marginLeft: "auto" }}>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main>
        <p>Notes coming soon.</p>
      </main>
    </div>
  );
}

function NotFoundPage() {
  return <p>Not found</p>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/"
        element={
          <AuthGuard>
            <NotesHomePage />
          </AuthGuard>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

