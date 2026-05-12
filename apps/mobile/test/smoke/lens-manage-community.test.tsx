import React from "react";
import { Alert } from "react-native";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommunityLensTemplate, Lens } from "@notesbrain/shared";

const {
  authoredTemplatesMock,
  lensesMock,
  pushMock,
  removeMock,
  runNowMock,
  toggleActiveMock,
  unpublishMock,
} = vi.hoisted(() => ({
  authoredTemplatesMock: vi.fn(),
  lensesMock: vi.fn(),
  pushMock: vi.fn(),
  removeMock: vi.fn(),
  runNowMock: vi.fn(),
  toggleActiveMock: vi.fn(),
  unpublishMock: vi.fn(),
}));

vi.mock("expo-router", () => ({
  Stack: {
    Screen: () => null,
  },
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("../../hooks/useLenses", () => ({
  useLenses: () => ({
    data: lensesMock(),
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    remove: { mutateAsync: removeMock },
    toggleActive: { mutateAsync: toggleActiveMock },
  }),
}));

vi.mock("../../hooks/useRunLensNow", () => ({
  useRunLensNow: () => ({ mutateAsync: runNowMock }),
}));

vi.mock("../../hooks/useCommunityLenses", () => ({
  useCommunityLenses: () => ({
    authoredTemplates: authoredTemplatesMock(),
    unpublish: { mutateAsync: unpublishMock },
  }),
}));

import LensManageScreen from "../../app/(app)/lens-manage";
import { testIds } from "../../lib/testIds";

function makeLens(overrides: Partial<Lens> = {}): Lens {
  return {
    id: "lens-1",
    user_id: "user-1",
    name: "Personal Lens",
    prompt: "Summarize my notes.",
    schedule_type: "daily",
    schedule_time: "08:00",
    schedule_day: null,
    lookback_hours: 48,
    categories: null,
    is_active: true,
    is_default: false,
    next_run_at: null,
    last_run_at: null,
    consecutive_failures: 0,
    last_error: null,
    last_error_at: null,
    source_template_id: null,
    source_template_version: null,
    installed_from_library_at: null,
    template_snapshot: null,
    created_at: "2026-05-12T00:00:00Z",
    updated_at: "2026-05-12T00:00:00Z",
    ...overrides,
  };
}

function makeTemplate(
  sourceLensId: string,
  overrides: Partial<CommunityLensTemplate> = {}
): CommunityLensTemplate {
  return {
    id: `template-${sourceLensId}`,
    name: "Community Lens",
    description: "A community lens.",
    prompt: "Summarize my notes.",
    schedule_type: "daily",
    schedule_time: "08:00",
    schedule_day: null,
    lookback_hours: 48,
    categories: null,
    category: "uncategorized",
    version: 1,
    author_display_name: "Ben",
    install_count: 0,
    source_lens_id: sourceLensId,
    author_user_id: "user-1",
    status: "public",
    created_at: "2026-05-12T00:00:00Z",
    updated_at: "2026-05-12T00:00:00Z",
    ...overrides,
  };
}

function renderScreen() {
  let tree!: ReturnType<typeof create>;

  act(() => {
    tree = create(<LensManageScreen />);
  });

  return tree;
}

async function pressByTestId(tree: ReturnType<typeof create>, testID: string) {
  await act(async () => {
    tree.root.findByProps({ testID }).props.onPress();
    await Promise.resolve();
  });
}

async function pressAlertButton(label: string) {
  const alertCall = vi.mocked(Alert.alert).mock.calls.at(-1);
  const buttons = alertCall?.[2] as Array<{ text: string; onPress?: () => void }> | undefined;
  const button = buttons?.find((item) => item.text === label);

  await act(async () => {
    button?.onPress?.();
    await Promise.resolve();
  });
}

describe("lens management community controls", () => {
  beforeEach(() => {
    authoredTemplatesMock.mockReset();
    authoredTemplatesMock.mockReturnValue([]);
    lensesMock.mockReset();
    lensesMock.mockReturnValue([makeLens()]);
    pushMock.mockReset();
    removeMock.mockReset();
    removeMock.mockResolvedValue(undefined);
    runNowMock.mockReset();
    runNowMock.mockResolvedValue(undefined);
    toggleActiveMock.mockReset();
    toggleActiveMock.mockResolvedValue(makeLens({ is_active: false }));
    unpublishMock.mockReset();
    unpublishMock.mockResolvedValue(makeTemplate("lens-1", { status: "unpublished" }));
    vi.mocked(Alert.alert).mockClear();
  });

  it("routes eligible personal lenses to publish review", async () => {
    const tree = renderScreen();

    await pressByTestId(tree, testIds.lens.manage.publishButton("lens-1"));

    expect(pushMock).toHaveBeenCalledWith({
      pathname: "/(app)/community-lens-publish",
      params: { lensId: "lens-1" },
    });
  });

  it("blocks installed copies from publish controls and shows provenance", () => {
    lensesMock.mockReturnValue([
      makeLens({
        id: "installed-lens",
        name: "Installed Lens",
        source_template_id: "template-1",
      }),
    ]);

    const tree = renderScreen();

    expect(tree.root.findAllByProps({
      testID: testIds.lens.manage.publishButton("installed-lens"),
    })).toHaveLength(0);
    expect(tree.root.findByProps({
      testID: testIds.lens.manage.communityStatus("installed-lens"),
    })).toBeTruthy();
    expect(tree.root.findByProps({ children: "From Library" })).toBeTruthy();
  });

  it("shows public status and unpublishes without removing source lenses", async () => {
    authoredTemplatesMock.mockReturnValue([makeTemplate("lens-1", { status: "public" })]);
    const tree = renderScreen();

    expect(tree.root.findByProps({ children: "Community: Public" })).toBeTruthy();
    expect(tree.root.findByProps({
      accessibilityLabel: "Unpublish Personal Lens from community",
    })).toBeTruthy();

    await pressByTestId(tree, testIds.lens.manage.unpublishButton("lens-1"));
    expect(Alert.alert).toHaveBeenCalledWith(
      "Unpublish Lens?",
      "This removes the public listing but keeps your lens and existing installs.",
      expect.any(Array)
    );

    await pressAlertButton("Unpublish");

    expect(unpublishMock).toHaveBeenCalledWith("lens-1");
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("shows unpublished status and allows republish review", async () => {
    authoredTemplatesMock.mockReturnValue([makeTemplate("lens-1", { status: "unpublished" })]);
    const tree = renderScreen();

    expect(tree.root.findByProps({ children: "Community: Unpublished" })).toBeTruthy();
    expect(tree.root.findByProps({ children: "Publish Again" })).toBeTruthy();

    await pressByTestId(tree, testIds.lens.manage.publishButton("lens-1"));

    expect(pushMock).toHaveBeenCalledWith({
      pathname: "/(app)/community-lens-publish",
      params: { lensId: "lens-1" },
    });
  });

  it.each(["hidden", "delisted"] as const)(
    "shows %s templates as not public with no republish control",
    (status) => {
      authoredTemplatesMock.mockReturnValue([makeTemplate("lens-1", { status })]);
      const tree = renderScreen();

      expect(tree.root.findByProps({ children: "Community: Not public" })).toBeTruthy();
      expect(tree.root.findAllByProps({
        testID: testIds.lens.manage.publishButton("lens-1"),
      })).toHaveLength(0);
      expect(tree.root.findAllByProps({
        testID: testIds.lens.manage.unpublishButton("lens-1"),
      })).toHaveLength(0);
    }
  );

  it("keeps existing edit, pause, run, and delete actions intact", async () => {
    const tree = renderScreen();

    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: "Edit Personal Lens" }).props.onPress();
    });
    expect(pushMock).toHaveBeenCalledWith({
      pathname: "/(app)/lens-form",
      params: { lensId: "lens-1" },
    });

    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: "Pause Personal Lens" }).props.onPress();
      await Promise.resolve();
    });
    expect(toggleActiveMock).toHaveBeenCalledWith({ id: "lens-1", is_active: false });

    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: "Run Personal Lens now" }).props.onPress();
      await Promise.resolve();
    });
    expect(runNowMock).toHaveBeenCalledWith("lens-1");

    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: "Delete Personal Lens" }).props.onPress();
    });
    await pressAlertButton("Delete");

    expect(removeMock).toHaveBeenCalledWith("lens-1");
  });

  it("exposes minimum touch target styles for publish and unpublish controls", () => {
    authoredTemplatesMock.mockReturnValue([makeTemplate("lens-2", { status: "public" })]);
    lensesMock.mockReturnValue([
      makeLens({ id: "lens-1", name: "Draft Lens" }),
      makeLens({ id: "lens-2", name: "Public Lens" }),
    ]);
    const tree = renderScreen();

    expect(tree.root.findByProps({
      testID: testIds.lens.manage.publishButton("lens-1"),
    }).props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ minHeight: 48 }),
    ]));
    expect(tree.root.findByProps({
      testID: testIds.lens.manage.unpublishButton("lens-2"),
    }).props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ minHeight: 48 }),
    ]));
  });
});
