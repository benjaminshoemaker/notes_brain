import type { Attachment } from "@notesbrain/shared";

import { useAttachmentUrl } from "../hooks/useAttachmentUrl";

type Props = {
  attachment: Attachment;
};

function getExtension(filename: string) {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1) ?? "" : "";
}

function isImageAttachment(attachment: Attachment) {
  if (attachment.mime_type.startsWith("image/")) return true;
  const ext = getExtension(attachment.filename);
  return ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);
}

function isPdfAttachment(attachment: Attachment) {
  return attachment.mime_type === "application/pdf" || getExtension(attachment.filename) === "pdf";
}

export function AttachmentPreview({ attachment }: Props) {
  const { data: url, isLoading } = useAttachmentUrl(attachment.storage_path);

  if (isLoading) {
    return <span>Loading…</span>;
  }

  if (!url) {
    return <span>Unavailable</span>;
  }

  if (isImageAttachment(attachment)) {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img
          src={url}
          alt={attachment.filename}
          style={{
            width: 72,
            height: 72,
            objectFit: "cover",
            borderRadius: 8,
            border: "1px solid #ddd"
          }}
        />
      </a>
    );
  }

  if (isPdfAttachment(attachment)) {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <span style={{ fontWeight: 600, marginRight: 6 }}>PDF</span>
        {attachment.filename}
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer">
      {attachment.filename}
    </a>
  );
}

