import React from "react";
import { TextInput } from "react-native";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Lens } from "@notesbrain/shared";

const { backMock, lensesMock, publishMock, publishMutationMock, searchParamsMock } = vi.hoisted(() => ({
  backMock: vi.fn(),
  lensesMock: vi.fn(),
  publishMock: vi.fn(),
  publishMutationMock: vi.fn(),
  searchParamsMock: vi.fn(),
}));

vi.mock("expo-router", () => ({
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => searchParamsMock(),
  useRouter: () => ({ back: backMock }),
}));

vi.mock("../../hooks/useLenses", () => ({
  useLenses: () => ({
    data: lensesMock(),
    isLoading: false,
  }),
}));

vi.mock("../../hooks/useCommunityLenses", () => ({
  useCommunityLenses: () => ({
    publish: publishMutationMock(),
  }),
}));

import CommunityLensPublishScreen from "../../app/(app)/community-lens-publish";
import { testIds } from "../../lib/testIds";

const baseLens: Lens = {
  id: "lens-1",
  user_id: "user-1",
  name: "Weekly Health Check",
  prompt: "Summarize health notes and identify patterns in sleep, exercise, and mood.",
  schedule_type: "weekly",
  schedule_time: "08:00",
  schedule_day: 1,
  lookback_hours: 168,
  categories: ["health"],
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
};

function renderScreen() {
  let tree!: ReturnType<typeof create>;

  act(() => {
    tree = create(<CommunityLensPublishScreen />);
  });

  return tree;
}

function changeText(tree: ReturnType<typeof create>, testID: string, value: string) {
  act(() => {
    tree.root.findByProps({ testID }).props.onChangeText(value);
  });
}

async function pressPublish(tree: ReturnType<typeof create>) {
  await act(async () => {
    tree.root.findByProps({ testID: testIds.lens.communityLensPublish.confirmButton }).props.onPress();
    await Promise.resolve();
  });
}

describe("community lens publish screen", () => {
  beforeEach(() => {
    backMock.mockReset();
    lensesMock.mockReturnValue([baseLens]);
    publishMock.mockReset();
    publishMock.mockResolvedValue({ id: "template-1" });
    publishMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: publishMock,
    });
    searchParamsMock.mockReturnValue({ lensId: "lens-1" });
  });

  it("renders public fields, privacy warning, and accessible controls", () => {
    const tree = renderScreen();

    expect(tree.root.findByProps({ children: "Weekly Health Check" })).toBeTruthy();
    expect(tree.root.findByProps({ children: baseLens.prompt })).toBeTruthy();
    expect(tree.root.findByProps({ children: "Weekly on Monday at 08:00" })).toBeTruthy();
    expect(tree.root.findByProps({ children: "7 days" })).toBeTruthy();
    expect(tree.root.findAllByProps({ children: "Health" }).length).toBeGreaterThan(0);
    expect(tree.root.findByProps({ testID: testIds.lens.communityLensPublish.privacyWarning })).toBeTruthy();
    expect(tree.root.findByProps({ accessibilityLabel: "author display name" })).toBeTruthy();
    expect(tree.root.findByProps({ accessibilityLabel: "Community lens description" })).toBeTruthy();
    expect(tree.root.findByProps({ accessibilityLabel: "Publish community lens" })).toBeTruthy();
    expect(tree.root.findByProps({ accessibilityLabel: "Cancel publishing" })).toBeTruthy();
  });

  it("publishes a valid lens and trims listing fields", async () => {
    const tree = renderScreen();

    changeText(tree, testIds.lens.communityLensPublish.authorDisplayNameInput, "  Ben  ");
    changeText(tree, testIds.lens.communityLensPublish.descriptionInput, "  A weekly health pattern review.  ");

    await act(async () => {
      tree.root.findByProps({
        testID: testIds.lens.communityLensPublish.categoryOption("projects"),
      }).props.onPress();
    });
    await pressPublish(tree);

    expect(publishMock).toHaveBeenCalledWith({
      lensId: "lens-1",
      authorDisplayName: "Ben",
      description: "A weekly health pattern review.",
      category: "projects",
    });
    expect(backMock).toHaveBeenCalled();
  });

  it.each([
    ["", "Enter an author display name."],
    ["A", "Author display name must be at least 2 characters."],
    ["ben@example.com", "Use a public display name, not an email address."],
    ["Notes Brain", "Choose a different author display name."],
  ])("rejects invalid display name %s", async (displayName, expectedError) => {
    const tree = renderScreen();

    changeText(tree, testIds.lens.communityLensPublish.authorDisplayNameInput, displayName);
    changeText(tree, testIds.lens.communityLensPublish.descriptionInput, "A useful public lens.");
    await pressPublish(tree);

    expect(publishMock).not.toHaveBeenCalled();
    expect(tree.root.findByProps({ testID: testIds.lens.communityLensPublish.errorMessage }).props.children)
      .toBe(expectedError);
  });

  it("rejects missing description", async () => {
    const tree = renderScreen();

    changeText(tree, testIds.lens.communityLensPublish.authorDisplayNameInput, "Ben");
    await pressPublish(tree);

    expect(publishMock).not.toHaveBeenCalled();
    expect(tree.root.findByProps({ testID: testIds.lens.communityLensPublish.errorMessage }).props.children)
      .toBe("Describe what this lens helps people understand.");
  });

  it("shows mutation error messaging", async () => {
    publishMock.mockRejectedValueOnce(new Error("Rate limit reached"));
    const tree = renderScreen();

    changeText(tree, testIds.lens.communityLensPublish.authorDisplayNameInput, "Ben");
    changeText(tree, testIds.lens.communityLensPublish.descriptionInput, "A useful public lens.");
    await pressPublish(tree);

    expect(tree.root.findByProps({ testID: testIds.lens.communityLensPublish.errorMessage }).props.children)
      .toBe("Rate limit reached");
  });

  it("blocks installed copies from being republished", async () => {
    lensesMock.mockReturnValue([{ ...baseLens, source_template_id: "template-1" }]);
    const tree = renderScreen();
    const publishButton = tree.root.findByProps({
      testID: testIds.lens.communityLensPublish.confirmButton,
    });

    expect(publishButton.props.disabled).toBe(true);
    expect(tree.root.findAllByType(TextInput).every((input) => input.props.editable === false)).toBe(true);
  });
});
