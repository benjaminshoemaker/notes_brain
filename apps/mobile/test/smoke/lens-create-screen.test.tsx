import React from "react";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn()
}));

vi.mock("expo-router", () => ({
  Stack: {
    Screen: () => null
  },
  useRouter: () => ({ push: pushMock })
}));

import LensCreateScreen from "../../app/(app)/lens-create";
import { testIds } from "../../lib/testIds";

describe("lens create choice screen", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it("renders both creation choices and routes correctly", async () => {
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<LensCreateScreen />);
      await Promise.resolve();
    });

    expect(tree.root.findByProps({ children: "Create your own" })).toBeTruthy();
    expect(tree.root.findByProps({ children: "Browse Lens Library" })).toBeTruthy();

    await act(async () => {
      tree.root.findByProps({ testID: testIds.lens.create.customButton }).props.onPress();
    });
    expect(pushMock).toHaveBeenCalledWith("/(app)/lens-form");

    await act(async () => {
      tree.root.findByProps({ testID: testIds.lens.create.libraryButton }).props.onPress();
    });
    expect(pushMock).toHaveBeenCalledWith("/(app)/lens-library");
  });
});
