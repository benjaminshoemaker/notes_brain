import React from "react";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  communityHookMock,
  pushMock,
  setCategoryMock,
  setSearchMock,
} = vi.hoisted(() => ({
  communityHookMock: vi.fn(),
  pushMock: vi.fn(),
  setCategoryMock: vi.fn(),
  setSearchMock: vi.fn(),
}));

vi.mock("expo-router", () => ({
  Stack: {
    Screen: (props: { options?: { title?: string } }) =>
      React.createElement("StackScreen", props),
  },
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("../../hooks/useLensLibrary", () => ({
  useLensLibrary: () => ({
    templates: [
      {
        template: {
          template_id: "weekly-project-pulse",
          name: "Weekly Project Pulse",
          description: "What moved and what stalled",
          schedule_type: "weekly",
          category: "projects",
        },
        installState: "Installed",
        installedLens: { id: "lens-1" },
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("../../hooks/useCommunityLenses", () => ({
  useCommunityLenses: () => communityHookMock(),
}));

import LensLibraryScreen from "../../app/(app)/lens-library";
import { testIds } from "../../lib/testIds";

function createCommunityState(overrides: Record<string, unknown> = {}) {
  return {
    templates: [
      {
        row: {
          id: "template-1",
          author_display_name: "Alex",
          install_count: 12,
        },
        template: {
          template_id: "template-1",
          name: "Project Pulse",
          description: "Find project movement.",
          schedule_type: "weekly",
          category: "projects",
        },
        installState: "Installed",
        installedLens: { id: "lens-2" },
      },
    ],
    search: "",
    setSearch: setSearchMock,
    category: null,
    setCategory: setCategoryMock,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

describe("lens library community mode", () => {
  async function switchToCommunity(tree: ReturnType<typeof create>) {
    await act(async () => {
      tree.root.findByProps({ testID: testIds.lens.library.modeCommunityButton }).props.onPress();
      await Promise.resolve();
    });
  }

  beforeEach(() => {
    pushMock.mockReset();
    setSearchMock.mockReset();
    setCategoryMock.mockReset();
    communityHookMock.mockReturnValue(createCommunityState());
  });

  it("renders community metadata and routes with source=community", async () => {
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<LensLibraryScreen />);
      await Promise.resolve();
    });

    await switchToCommunity(tree);

    expect(tree.root.findByProps({ children: "Project Pulse" })).toBeTruthy();
    const authorRows = tree.root.findAll((node) => {
      const { children } = node.props;
      if (typeof children === "string") {
        return children.includes("Alex");
      }
      if (Array.isArray(children)) {
        return children.join("").includes("Alex");
      }
      return false;
    });
    expect(authorRows.length).toBeGreaterThan(0);
    expect(tree.root.findByProps({ children: "12 installs" })).toBeTruthy();
    expect(tree.root.findByProps({ children: "Installed" })).toBeTruthy();

    await act(async () => {
      tree.root.findByProps({
        testID: testIds.lens.library.communityCard("template-1"),
      }).props.onPress();
    });

    expect(pushMock).toHaveBeenCalledWith({
      pathname: "/(app)/lens-library-preview",
      params: { templateId: "template-1", source: "community" },
    });
  });

  it("supports community search and category filters with accessibility state", async () => {
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<LensLibraryScreen />);
      await Promise.resolve();
    });

    await switchToCommunity(tree);

    const allButton = tree.root.findByProps({ testID: testIds.lens.library.communityCategoryAll });
    expect(allButton.props.accessibilityState.selected).toBe(true);

    await act(async () => {
      tree.root.findByProps({ testID: testIds.lens.library.communitySearchInput }).props.onChangeText("pulse");
    });
    expect(setSearchMock).toHaveBeenCalledWith("pulse");

    await act(async () => {
      tree.root.findByProps({
        testID: testIds.lens.library.communityCategoryOption("projects"),
      }).props.onPress();
    });
    expect(setCategoryMock).toHaveBeenCalledWith("projects");

    communityHookMock.mockReturnValue(createCommunityState({ category: "projects" }));
    await act(async () => {
      tree = create(<LensLibraryScreen />);
      await Promise.resolve();
    });
    await switchToCommunity(tree);

    const categoryButton = tree.root.findByProps({
      testID: testIds.lens.library.communityCategoryOption("projects"),
    });
    expect(categoryButton.props.accessibilityState.selected).toBe(true);
  });

  it("renders community empty and error states", async () => {
    communityHookMock.mockReturnValue(createCommunityState({ templates: [] }));
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<LensLibraryScreen />);
      await Promise.resolve();
    });
    await switchToCommunity(tree);
    expect(tree.root.findByProps({ testID: testIds.lens.library.communityEmptyState })).toBeTruthy();

    communityHookMock.mockReturnValue(createCommunityState({ error: new Error("boom") }));
    await act(async () => {
      tree = create(<LensLibraryScreen />);
      await Promise.resolve();
    });
    await act(async () => {
      tree.root.findByProps({ testID: testIds.lens.library.modeCommunityButton }).props.onPress();
    });
    expect(tree.root.findByProps({ testID: testIds.lens.library.communityErrorState })).toBeTruthy();
  });

  it("avoids leaderboard copy", async () => {
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<LensLibraryScreen />);
      await Promise.resolve();
    });
    await switchToCommunity(tree);

    const allText = tree.root.findAll(
      (node) => typeof node.props.children === "string"
    ).map((node) => String(node.props.children).toLowerCase());

    expect(allText.some((value) => value.includes("leaderboard"))).toBe(false);
    expect(allText.some((value) => value.includes("trending"))).toBe(false);
    expect(allText.some((value) => value.includes("top creator"))).toBe(false);
  });
});
