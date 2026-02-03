import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { AppProviders } from "./AppProviders";
import { QueryErrorBoundary } from "./components/ErrorBoundary";

import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <QueryErrorBoundary>
        <App />
      </QueryErrorBoundary>
    </AppProviders>
  </StrictMode>
);
