import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { fileUploadLabels } from "@boilerplate/i18n";
import { FileUpload, type FileUploadResult, type FileUploadTicket } from "@boilerplate/ui-native";

import { api } from "../lib/api.js";

// Тот же contract/api-client, что apps/web/src/routes/files.tsx — общий
// слой между платформами, не код экрана (раздел "Фаза 7" задания).
export default function FilesScreen() {
  const { t } = useTranslation("files");
  const { t: tUi } = useTranslation("ui");
  const [uploaded, setUploaded] = useState<FileUploadResult[]>([]);

  async function requestTicket(file: { name: string; type: string }): Promise<FileUploadTicket> {
    const ticket = await api.files.createUploadTicket.call({
      contentType: file.type || "application/octet-stream",
      filename: file.name,
    });
    return { fileId: ticket.fileId, url: ticket.url, fields: ticket.fields };
  }

  async function confirmUpload(fileId: string): Promise<FileUploadResult> {
    return api.files.confirm.call({ id: fileId });
  }

  return (
    <View className="flex-1 gap-4 bg-background p-6">
      <Text className="text-2xl font-semibold text-foreground">{t("title")}</Text>
      <FileUpload
        labels={fileUploadLabels(tUi)}
        requestTicket={requestTicket}
        confirmUpload={confirmUpload}
        onUploaded={(result) => {
          setUploaded((previous) => [...previous, result]);
        }}
      />
      <View className="gap-1" testID="uploaded-files">
        {uploaded.map((file) => (
          <View key={file.id} className="rounded-md border border-border bg-card p-3">
            <Text className="text-foreground">
              {file.id} — {file.contentType}, {t("bytes", { count: file.size })}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
