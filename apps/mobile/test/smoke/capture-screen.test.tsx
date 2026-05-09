import React from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestInstance, ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

const { createNoteMutateAsyncMock, uploadVoiceMutateAsyncMock } = vi.hoisted(() => ({
  createNoteMutateAsyncMock: vi.fn(),
  uploadVoiceMutateAsyncMock: vi.fn()
}));

vi.mock("expo-router", () => ({
  useFocusEffect: () => {}
}));

vi.mock("../../hooks/useCreateNote", () => ({
  useCreateNote: () => ({
    mutateAsync: createNoteMutateAsyncMock,
    isPending: false
  })
}));

vi.mock("../../hooks/useUploadVoiceNote", () => ({
  useUploadVoiceNote: () => ({
    mutateAsync: uploadVoiceMutateAsyncMock,
    isPending: false
  })
}));

vi.mock("../../components/CaptureInput", () => ({
  CaptureInput: () => React.createElement("Text", null, "Capture Input")
}));

vi.mock("../../components/Toast", () => ({
  Toast: ({ message }: { message: string }) => React.createElement("Text", null, message)
}));

import CaptureScreen from "../../app/(app)/index";

function collectText(node: ReactTestRenderer) {
  return node.root
    .findAll((item: ReactTestInstance) => String(item.type) === "Text")
    .map((item: ReactTestInstance) => item.children.join(""))
    .filter(Boolean);
}

describe("mobile capture screen smoke", () => {
  it("should render the single capture composer", async () => {
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(<CaptureScreen />);
      await Promise.resolve();
    });
    const text = collectText(tree);

    expect(text).toContain("What should Echo remember?");
    expect(text).toContain("Type a thought or tap the microphone to capture it out loud.");
    expect(text).toContain("Capture Input");
  });
});
