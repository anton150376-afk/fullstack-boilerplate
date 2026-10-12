import { File, UploadType } from "expo-file-system";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
  defaultFileUploadLabels,
  resolveLabels,
  type FileUploadLabels,
} from "@boilerplate/ui-core";

export interface FileUploadTicket {
  fileId: string;
  url: string;
  fields: Record<string, string>;
}

export interface FileUploadResult {
  id: string;
  size: number;
  contentType: string;
}

export type PickedFile = File;

export interface FileUploadProps {
  /** MIME-тип(ы) для File.pickFileAsync — тот же формат, что HTML accept. */
  accept?: string;
  /** Контракт отдаёт талон — apps/mobile передаёт api.files.createUploadTicket. */
  requestTicket: (file: PickedFile) => Promise<FileUploadTicket>;
  /** apps/mobile передаёт api.files.confirm. */
  confirmUpload: (fileId: string) => Promise<FileUploadResult>;
  onUploaded?: (result: FileUploadResult) => void;
  /** Подписи; незаданные остаются русскими (docs/packages/ui.md). */
  labels?: Partial<FileUploadLabels>;
}

type Status = "idle" | "uploading" | "confirming" | "error";

// Классовый API expo-file-system (раздел "Фаза 7" задания, пункт 7):
// File.pickFileAsync — системный пикер, file.upload — подписанная форма
// POST напрямую в хранилище, без псевдо-Blob из {uri,type,name} и без
// чтения в base64 (утраивает память на крупных файлах). Старый
// FileSystem.uploadAsync не используется — он устарел.
export function FileUpload({
  accept,
  requestTicket,
  confirmUpload,
  onUploaded,
  labels,
}: FileUploadProps) {
  const text = resolveLabels(defaultFileUploadLabels, labels);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | undefined>(undefined);

  async function pickAndUpload(): Promise<void> {
    const picked = await File.pickFileAsync({ mimeTypes: accept ?? "*/*" });
    if (picked.canceled) {
      return;
    }

    const file = picked.result;
    setStatus("uploading");
    setError(undefined);
    setProgress(0);

    try {
      const ticket = await requestTicket(file);
      await file.upload(ticket.url, {
        uploadType: UploadType.MULTIPART,
        fieldName: "file",
        parameters: ticket.fields,
        onProgress: ({ bytesSent, totalBytes }) => {
          if (totalBytes > 0) {
            setProgress(Math.round((bytesSent / totalBytes) * 100));
          }
        },
      });
      setStatus("confirming");
      const result = await confirmUpload(ticket.fileId);
      setStatus("idle");
      setProgress(0);
      onUploaded?.(result);
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : text.uploadFailed);
    }
  }

  const busy = status === "uploading" || status === "confirming";

  return (
    <View className="flex flex-col gap-2">
      <Pressable
        className="rounded-md border border-border bg-background px-4 py-2 disabled:opacity-50"
        disabled={busy}
        accessibilityRole="button"
        onPress={() => void pickAndUpload()}
      >
        <Text className="text-foreground">{text.pickFile}</Text>
      </Pressable>
      {status === "uploading" && <Text accessibilityLabel={text.progress}>{progress}%</Text>}
      {status === "confirming" && <Text className="text-muted-foreground">{text.confirming}</Text>}
      {status === "error" && error && (
        <Text accessibilityRole="alert" className="text-destructive">
          {error}
        </Text>
      )}
    </View>
  );
}
