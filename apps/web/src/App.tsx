import { Route, Routes } from "react-router-dom";

function HomePage() {
  return <h1>NotesBrain</h1>;
}

function NotFoundPage() {
  return <p>Not found</p>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

