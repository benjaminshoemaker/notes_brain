import React from "react";
import { act, create } from "react-test-renderer";
import { Alert } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { installMock, installMutationMock, replaceMock, searchParamsMock, templatesMock } = vi.hoisted(() => ({
  installMock: vi.fn(),
  installMutationMock: vi.fn(),
  replaceMock: vi.fn(),
  searchParamsMock: vi.fn(),
  templatesMock: vi.fn()
}));

vi.mock("expo-router", () => ({
  Stack: {
    Screen: () => null
  },
  useLocalSearchParams: () => searchParamsMock(),
  useRouter: () => ({ replace: replaceMock })
}));

vi.mock("../../hooks/useLensLibrary", () => ({
  useLensLibrary: () => ({
    templates: templatesMock(),
    install: installMock,
    installMutation: installMutationMock()
  })
}));

import LensLibraryPreviewScreen from "../../app/(app)/lens-library-preview";
import { createLensInputFromTemplate, curatedLensTemplates } from "../../lib/lensLibrary";
import { testIds } from "../../lib/testIds";

describe("lens library preview screen", () => {
  beforeEach(() => {
    installMock.mockReset();
    installMutationMock.mockReset();
    replaceMock.mockReset();
    searchParamsMock.mockReturnValue({ templateId: "morning-briefing" });
    templatesMock.mockReturnValue([
      {
        template: { template_id: "morning-briefing" },
        installState: "Not installed",
        installedLens: null
      }
    ]);
    installMutationMock.mockReturnValue({ isPending: false });
    vi.mocked(Alert.alert).mockClear();
  });

  it("renders template details and installs with source metadata", async () => {
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<LensLibraryPreviewScreen />);
      await Promise.resolve();
    });

    expect(tree.root.findByProps({ children: "Morning Briefing" })).toBeTruthy();
    expect(tree.root.findByProps({ children: "Add to My Lenses" })).toBeTruthy();

    await act(async () => {
      tree.root.findByProps({ testID: testIds.lens.preview.installButton }).props.onPress();
      await Promise.resolve();
    });

    expect(installMock).toHaveBeenCalledWith(curatedLensTemplates[0]);
    const input = createLensInputFromTemplate(curatedLensTemplates[0]);
    expect(input).toMatchObject({
      source_template_id: "morning-briefing",
      source_template_version: curatedLensTemplates[0].version,
      schedule_type: "daily",
      lookback_hours: 48
    });
  });

  it("renders Installed state for an installed library lens", async () => {
    templatesMock.mockReturnValue([
      {
        template: { template_id: "morning-briefing" },
        installState: "Installed",
        installedLens: { id: "lens-1" }
      }
    ]);

    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<LensLibraryPreviewScreen />);
      await Promise.resolve();
    });

    expect(tree.root.findAllByProps({ children: "Installed" }).length).toBeGreaterThan(0);
  });
});
