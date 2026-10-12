import { useRef, useState } from "react";

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

export interface FileUploadProps {
  accept?: string;
  /** Контракт отдаёт талон — apps/web передаёт api.files.createUploadTicket. */
  requestTicket: (file: File) => Promise<FileUploadTicket>;
  /** apps/web передаёт api.files.confirm. */
  confirmUpload: (fileId: string) => Promise<FileUploadResult>;
  onUploaded?: (result: FileUploadResult) => void;
  /** Подписи; незаданные остаются русскими (docs/packages/ui.md). */
  labels?: Partial<FileUploadLabels>;
}

type Status = "idle" | "uploading" | "confirming" | "error";

// Компонент не знает про @boilerplate/contract/api-client (правило
// ui.md), обе функции — пропсы: apps/web подключает реальный контракт,
// ui-native (Фаза 7) — тот же контракт через свой file picker. Байты
// идут напрямую в хранилище подписанной формой POST, минуя API (раздел
// "Фаза 6" задания, пункт 8; D16, грабля 30 задания).
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
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File): Promise<void> {
    setStatus("uploading");
    setError(undefined);
    setProgress(0);

    try {
      const ticket = await requestTicket(file);
      await uploadToStorage(ticket, file, setProgress, text);
      setStatus("confirming");
      const result = await confirmUpload(ticket.fileId);
      setStatus("idle");
      setProgress(0);
      onUploaded?.(result);
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : text.uploadFailed);
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  const busy = status === "uploading" || status === "confirming";

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={busy}
        aria-label={text.fileInput}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
        }}
      />
      {status === "uploading" && (
        <progress value={progress} max={100} aria-label={text.progress}>
          {progress}%
        </progress>
      )}
      {status === "confirming" && <p className="text-muted-foreground">{text.confirming}</p>}
      {status === "error" && error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// XMLHttpRequest, не fetch: нужен прогресс загрузки (xhr.upload.onprogress),
// у fetch нет события прогресса для тела запроса.
function uploadToStorage(
  ticket: FileUploadTicket,
  file: File,
  onProgress: (percent: number) => void,
  text: FileUploadLabels,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(ticket.fields)) {
      formData.append(key, value);
    }
    // "file" — последнее поле формы, вне политики подписи (грабля 30
    // задания: все поля, кроме подписи, файла и политики, обязаны быть
    // перечислены в условиях — у нас это делает createUploadTicket).
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(describeStorageError(xhr.status, xhr.responseText, text)));
      }
    });
    xhr.addEventListener("error", () => {
      reject(new Error(text.networkUnavailable));
    });
    xhr.open("POST", ticket.url);
    xhr.send(formData);
  });
}

// Хранилище отвечает своим XML-телом (S3-совместимый API), не телом
// нашего сервера — здесь только внятное сообщение для интерфейса,
// настоящий тип всё равно перепроверяется сервером при confirm()
// (apps/server/src/files/files.service.ts, по сигнатуре файла).
function describeStorageError(
  status: number,
  responseText: string,
  text: FileUploadLabels,
): string {
  if (status === 413 || responseText.includes("EntityTooLarge")) {
    return text.tooLarge;
  }
  if (status === 400) {
    return text.rejected;
  }
  return text.rejectedWithCode(status);
}
