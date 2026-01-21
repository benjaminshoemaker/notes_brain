import { useEffect, useRef, useState } from "react";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  onFilesDropped: (files: File[]) => void;
};

export function FileDropZone({ children, onFilesDropped }: Props) {
  const dragDepth = useRef(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    function isFileDrag(event: DragEvent) {
      return event.dataTransfer?.types?.includes("Files") ?? false;
    }

    function onDragEnter(event: DragEvent) {
      if (!isFileDrag(event)) return;
      dragDepth.current += 1;
      setIsActive(true);
    }

    function onDragLeave(event: DragEvent) {
      if (!isFileDrag(event)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) {
        setIsActive(false);
      }
    }

    function onDragOver(event: DragEvent) {
      if (!isFileDrag(event)) return;
      event.preventDefault();
    }

    function onDrop(event: DragEvent) {
      if (!isFileDrag(event)) return;
      event.preventDefault();

      dragDepth.current = 0;
      setIsActive(false);

      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length > 0) {
        onFilesDropped(files);
      }
    }

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);

    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [onFilesDropped]);

  return (
    <div style={{ position: "relative" }}>
      {children}
      {isActive ? (
        <div
          data-testid="file-drop-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.08)",
            display: "grid",
            placeItems: "center",
            zIndex: 40
          }}
        >
          <div
            style={{
              background: "white",
              border: "1px dashed #999",
              padding: 24,
              borderRadius: 12
            }}
          >
            Drop files to upload
          </div>
        </div>
      ) : null}
    </div>
  );
}

