import React from "react";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn()
}));

vi.mock("expo-router", () => ({
  Stack: {
    Screen: (props: { options?: { title?: string } }) =>
      React.createElement("StackScreen", props)
  },
  useRouter: () => ({ push: pushMock })
}));

vi.mock("../../hooks/useLensLibrary", () => ({
  useLensLibrary: () => ({
    templates: [
      {
        template: {
          template_id: "weekly-project-pulse",
          name: "Weekly Project Pulse",
          description: "What moved, what stalled, what needs a next step",
          schedule_type: "weekly",
          category: "projects"
        },
        installState: "Installed",
        installedLens: { id: "lens-1" }
      }
    ]
  })
}));

vi.mock("../../hooks/useCommunityLenses", () => ({
  useCommunityLenses: () => ({
    templates: [],
    search: "",
    setSearch: vi.fn(),
    category: null,
    setCategory: vi.fn(),
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

import LensLibraryScreen from "../../app/(app)/lens-library";
import { testIds } from "../../lib/testIds";

describe("lens library screen", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it("renders seeded templates with install state and routes to preview", async () => {
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<LensLibraryScreen />);
      await Promise.resolve();
    });

    expect(tree.root.find((node) => String(node.type) === "StackScreen").props.options.title).toBe("Browse Lens Library");
    expect(tree.root.findByProps({ children: "Weekly Project Pulse" })).toBeTruthy();
    expect(tree.root.findByProps({ children: "Installed" })).toBeTruthy();

    await act(async () => {
      tree.root.findByProps({
        testID: testIds.lens.library.card("weekly-project-pulse")
      }).props.onPress();
    });

    expect(pushMock).toHaveBeenCalledWith({
      pathname: "/(app)/lens-library-preview",
      params: { templateId: "weekly-project-pulse" }
    });
  });
});
