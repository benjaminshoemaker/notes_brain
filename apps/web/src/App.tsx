import { Route, Routes } from "react-router-dom";

import { AuthGuard } from "./components/AuthGuard";
import LoginPage from "./pages/Login";
import NotesPage from "./pages/Notes";
import SignupPage from "./pages/Signup";

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
            <NotesPage />
          </AuthGuard>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
