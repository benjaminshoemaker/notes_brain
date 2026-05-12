import React from "react";
import { Alert } from "react-native";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  communityInstallMock,
  communityReportMock,
  replaceMock,
  searchParamsMock,
  templatesMock,
} = vi.hoisted(() => ({
  communityInstallMock: vi.fn(),
  communityReportMock: vi.fn(),
  replaceMock: vi.fn(),
  searchParamsMock: vi.fn(),
  templatesMock: vi.fn(),
}));

vi.mock("expo-router", () => ({
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => searchParamsMock(),
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("../../hooks/useLensLibrary", () => ({
  useLensLibrary: () => ({
    templates: [],
    install: vi.fn(),
    installMutation: { isPending: false },
  }),
}));

vi.mock("../../hooks/useCommunityLenses", () => ({
  useCommunityLenses: () => ({
    templates: templatesMock(),
    install: { isPending: false, mutateAsync: communityInstallMock },
    report: { isPending: false, mutateAsync: communityReportMock },
  }),
}));

import LensLibraryPreviewScreen from "../../app/(app)/lens-library-preview";
import { testIds } from "../../lib/testIds";

function createCommunityItem(overrides: Record<string, unknown> = {}) {
  return {
    row: {
      id: "template-1",
      author_display_name: "Alex",
      install_count: 12,
    },
    template: {
      template_id: "template-1",
      name: "Project Pulse",
      description: "Find project movement.",
      focus: "Find signals in project notes.",
      prompt: "Summarize what moved, stalled, and needs a next step.",
      schedule_type: "weekly",
      schedule_time: "16:00",
      schedule_day: 5,
      lookback_hours: 168,
      category: "projects",
      categories: ["projects"],
    },
    installState: "Not installed",
    installedLens: null,
    ...overrides,
  };
}

describe("community lens library preview", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    communityInstallMock.mockReset();
    communityInstallMock.mockResolvedValue({ id: "lens-1" });
    communityReportMock.mockReset();
    communityReportMock.mockResolvedValue({ id: "report-1" });
    searchParamsMock.mockReturnValue({ templateId: "template-1", source: "community" });
    templatesMock.mockReturnValue([createCommunityItem()]);
    vi.mocked(Alert.alert).mockClear();
  });

  it("renders community metadata, prompt details, and installs through RPC hook", async () => {
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<LensLibraryPreviewScreen />);
      await Promise.resolve();
    });

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
    expect(tree.root.findByProps({ children: "7 days" })).toBeTruthy();
    expect(tree.root.findByProps({ children: "weekly" })).toBeTruthy();

    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: "Show prompt details" }).props.onPress();
      await Promise.resolve();
    });
    expect(tree.root.findByProps({ children: "Summarize what moved, stalled, and needs a next step." })).toBeTruthy();

    await act(async () => {
      tree.root.findByProps({ testID: testIds.lens.preview.installButton }).props.onPress();
      await Promise.resolve();
    });

    expect(communityInstallMock).toHaveBeenCalledWith("template-1");
    expect(Alert.alert).toHaveBeenCalledWith(
      "Added to My Lenses",
      "You can edit it anytime.",
      expect.any(Array)
    );
  });

  it("shows installed state and community unavailable state", async () => {
    templatesMock.mockReturnValue([createCommunityItem({ installState: "Installed", installedLens: { id: "lens-1" } })]);

    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<LensLibraryPreviewScreen />);
      await Promise.resolve();
    });

    expect(tree.root.findAllByProps({ children: "Installed" }).length).toBeGreaterThan(0);

    templatesMock.mockReturnValue([]);
    await act(async () => {
      tree = create(<LensLibraryPreviewScreen />);
      await Promise.resolve();
    });

    expect(tree.root.findByProps({ testID: testIds.lens.preview.unavailableState })).toBeTruthy();
    expect(tree.root.findByProps({ children: "Community lens unavailable" })).toBeTruthy();
  });

  it("submits reports with selected reason and optional note limit", async () => {
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<LensLibraryPreviewScreen />);
      await Promise.resolve();
    });

    expect(tree.root.findByProps({ children: "Reports are anonymous to the author." })).toBeTruthy();

    await act(async () => {
      tree.root.findByProps({ testID: testIds.lens.preview.reportButton }).props.onPress();
      await Promise.resolve();
    });

    const noteInput = tree.root.findByProps({ testID: testIds.lens.preview.reportNoteInput });
    expect(noteInput.props.maxLength).toBe(280);

    await act(async () => {
      tree.root.findByProps({
        testID: testIds.lens.preview.reportReasonOption("misleading"),
      }).props.onPress();
      await Promise.resolve();
    });
    await act(async () => {
      noteInput.props.onChangeText("This description does not match the prompt.");
      await Promise.resolve();
    });
    await act(async () => {
      tree.root.findByProps({ testID: testIds.lens.preview.reportSubmitButton }).props.onPress();
      await Promise.resolve();
    });

    expect(communityReportMock).toHaveBeenCalledWith({
      templateId: "template-1",
      reason: "misleading",
      note: "This description does not match the prompt.",
    });
    expect(tree.root.findByProps({ children: "Thanks. Your report was submitted." })).toBeTruthy();
  });

  it("handles duplicate active report responses without changing reason or note", async () => {
    communityReportMock.mockResolvedValue({
      id: "report-1",
      reason: "spam",
      note: "original note",
    });

    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<LensLibraryPreviewScreen />);
      await Promise.resolve();
    });

    await act(async () => {
      tree.root.findByProps({ testID: testIds.lens.preview.reportButton }).props.onPress();
      await Promise.resolve();
    });

    await act(async () => {
      tree.root.findByProps({ testID: testIds.lens.preview.reportSubmitButton }).props.onPress();
      await Promise.resolve();
    });

    expect(tree.root.findByProps({ children: "Thanks. Your report was submitted." })).toBeTruthy();
  });
});
