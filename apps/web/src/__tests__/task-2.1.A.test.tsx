import fs from "node:fs/promises";
import path from "node:path";

import { render } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { AppProviders } from "../AppProviders";
import { getSupabaseEnv } from "../env";

const WEB_ROOT = path.resolve(__dirname, "../..");

async function readJson(filePath: string) {
  const contents = await fs.readFile(filePath, "utf8");
  return JSON.parse(contents) as Record<string, unknown>;
}

describe("Task 2.1.A", () => {
  it("should include required dependencies when web package.json is read", async () => {
    const packageJson = await readJson(path.join(WEB_ROOT, "package.json"));

    const dependencies = packageJson.dependencies as Record<string, string>;

    expect(dependencies.react).toBeTruthy();
    expect(dependencies["react-dom"]).toBeTruthy();
    expect(dependencies["@tanstack/react-query"]).toBeTruthy();
    expect(dependencies["@supabase/supabase-js"]).toBeTruthy();
    expect(dependencies["react-router-dom"]).toBeTruthy();
  });

  it("should use @notesbrain/shared from workspace when Vite config is loaded", async () => {
    const packageJson = await readJson(path.join(WEB_ROOT, "package.json"));

    const dependencies = packageJson.dependencies as Record<string, string>;
    expect(dependencies["@notesbrain/shared"]).toBeTruthy();

    const sharedPackageJson = await readJson(
      path.resolve(WEB_ROOT, "../../packages/shared/package.json")
    );
    expect(dependencies["@notesbrain/shared"]).toBe(sharedPackageJson.version);

    const viteConfigContents = await fs.readFile(path.join(WEB_ROOT, "vite.config.ts"), "utf8");
    expect(viteConfigContents).toContain("@notesbrain/shared");
  });

  it("should provide a React Query client when AppProviders wraps children", () => {
    function Probe() {
      const client = useQueryClient();
      return <p>{client ? "ok" : "missing"}</p>;
    }

    const { getByText } = render(
      <AppProviders>
        <Probe />
      </AppProviders>
    );

    expect(getByText("ok")).toBeInTheDocument();
  });

  it("should render without errors when AppProviders wraps a simple app", () => {
    const { getByText } = render(
      <AppProviders>
        <h1>NotesBrain</h1>
      </AppProviders>
    );

    expect(getByText("NotesBrain")).toBeInTheDocument();
  });

  it("should read Supabase URL and anon key when VITE env vars are set", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon_key");

    expect(getSupabaseEnv()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon_key"
    });
  });
});
