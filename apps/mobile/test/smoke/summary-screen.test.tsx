import React from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { pushMock, setOptionsMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  setOptionsMock: vi.fn()
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: pushMock })
}));

vi.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ setOptions: setOptionsMock })
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() })
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } })
}));

vi.mock("../../hooks/useLensResults", () => ({
  useLensResults: () => ({
    data: [],
    isLoading: false,
    isRefetching: false,
    refetch: vi.fn(),
    error: null
  })
}));

vi.mock("../../components/LoadingSpinner", () => ({
  LoadingSpinner: ({ label }: { label: string }) => React.createElement("Text", null, label)
}));

vi.mock("../../components/LensResultCard", () => ({
  LensResultCard: () => React.createElement("Text", null, "Lens Result")
}));

import SummaryScreen from "../../app/(app)/summary";
import { testIds } from "../../lib/testIds";

describe("summary lens create routing", () => {
  beforeEach(() => {
    pushMock.mockReset();
    setOptionsMock.mockReset();
  });

  it("routes the Summary empty state CTA to lens-create", async () => {
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(<SummaryScreen />);
      await Promise.resolve();
    });

    await act(async () => {
      tree.root.findByProps({ testID: testIds.summary.createButton }).props.onPress();
    });

    expect(pushMock).toHaveBeenCalledWith("/(app)/lens-create");
  });

  it("routes the Summary header create action to lens-create", async () => {
    await act(async () => {
      create(<SummaryScreen />);
      await Promise.resolve();
    });

    const headerRight = setOptionsMock.mock.calls.at(-1)?.[0].headerRight;
    let headerTree!: ReactTestRenderer;
    await act(async () => {
      headerTree = create(headerRight());
      await Promise.resolve();
    });
    const createButton = headerTree.root.find(
      (item) => item.props.accessibilityLabel === "Create lens"
    );

    await act(async () => {
      createButton.props.onPress();
    });

    expect(pushMock).toHaveBeenCalledWith("/(app)/lens-create");
  });
});
