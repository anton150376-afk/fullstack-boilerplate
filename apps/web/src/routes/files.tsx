import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { fileUploadLabels } from "@boilerplate/i18n";
import { FileUpload, type FileUploadResult, type FileUploadTicket } from "@boilerplate/ui-web";

import { api } from "../lib/api.js";

// Показательная страница: тот же компонент api.files, что будет
// переиспользован ui-native в Фазе 7. api.<domain>.<procedure>.call —
// прямой вызов клиента оRPC, не через useQuery/useMutation: FileUpload
// запускает его сам, императивно, не в рендере.
export const Route = createFileRoute("/files")({
  component: FilesPage,
});

function FilesPage() {
  const { t } = useTranslation("files");
  const { t: tUi } = useTranslation("ui");
  const [uploaded, setUploaded] = useState<FileUploadResult[]>([]);

  async function requestTicket(file: File): Promise<FileUploadTicket> {
    const ticket = await api.files.createUploadTicket.call({
      contentType: file.type || "application/octet-stream",
      filename: file.name,
    });
    return { fileId: ticket.fileId, url: ticket.url, fields: ticket.fields };
  }

  async function confirmUpload(fileId: string): Promise<FileUploadResult> {
    const result = await api.files.confirm.call({ id: fileId });
    return result;
  }

  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
      <FileUpload
        labels={fileUploadLabels(tUi)}
        requestTicket={requestTicket}
        confirmUpload={confirmUpload}
        onUploaded={(result) => {
          setUploaded((previous) => [...previous, result]);
        }}
      />
      <ul className="space-y-1" data-testid="uploaded-files">
        {uploaded.map((file) => (
          <li key={file.id} className="rounded-md border border-border bg-card p-3">
            {file.id} — {file.contentType}, {t("bytes", { count: file.size })}
          </li>
        ))}
      </ul>
    </main>
  );
}
