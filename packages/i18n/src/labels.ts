import type { TFunction } from "i18next";

// Перевод каталога в объекты подписей для admin-kit, ui-web и ui-native.
// Эти пакеты не знают про react-i18next и принимают подписи пропсом
// `labels` (docs/guides/i18n.md); сопоставление ключей каталога и полей
// подписей лежит здесь, рядом с каталогами, чтобы веб и мобильное не
// дублировали его. Возвращаемые объекты совпадают по структуре с типами
// подписей пакетов (проверяет tsc в приложениях при передаче в `labels`).

export function adminLabels(t: TFunction<"admin">) {
  return {
    table: {
      empty: t("table.empty"),
      loading: t("table.loading"),
      loadFailed: t("table.loadFailed"),
      previous: t("table.previous"),
      next: t("table.next"),
      page: (page: number, pageCount: number, rowCount: number) =>
        t("table.page", { page, pageCount, rowCount }),
    },
    form: {
      submit: t("form.submit"),
    },
    layout: {
      navigation: t("layout.navigation"),
      systemStatus: t("layout.systemStatus"),
    },
    pages: {
      forbiddenTitle: t("pages.forbiddenTitle"),
      forbiddenMessage: t("pages.forbiddenMessage"),
      notFoundTitle: t("pages.notFoundTitle"),
      loginTitle: t("pages.loginTitle"),
      email: t("pages.email"),
      password: t("pages.password"),
      login: t("pages.login"),
    },
    system: {
      title: t("system.title"),
      buildVersion: (version: string) => t("system.buildVersion", { version }),
      loading: t("system.loading"),
      loadFailed: t("system.loadFailed"),
    },
    audit: {
      when: t("audit.when"),
      actor: t("audit.actor"),
      entity: t("audit.entity"),
      id: t("audit.id"),
      action: t("audit.action"),
      empty: t("audit.empty"),
      locale: t("audit.locale"),
    },
  };
}

export function bugReportLabels(t: TFunction<"ui">) {
  return {
    title: t("bugReport.title"),
    success: t("bugReport.success"),
    description: t("bugReport.description"),
    stepsToReproduce: t("bugReport.stepsToReproduce"),
    expectedBehavior: t("bugReport.expectedBehavior"),
    attachScreenshot: t("bugReport.attachScreenshot"),
    screenshotAttached: t("bugReport.screenshotAttached"),
    screenshotAttachedAuto: t("bugReport.screenshotAttachedAuto"),
    cancel: t("bugReport.cancel"),
    submit: t("bugReport.submit"),
    submitFailed: t("bugReport.submitFailed"),
  };
}

export function fileUploadLabels(t: TFunction<"ui">) {
  return {
    fileInput: t("upload.fileInput"),
    pickFile: t("upload.pickFile"),
    progress: t("upload.progress"),
    confirming: t("upload.confirming"),
    uploadFailed: t("upload.uploadFailed"),
    networkUnavailable: t("upload.networkUnavailable"),
    tooLarge: t("upload.tooLarge"),
    rejected: t("upload.rejected"),
    rejectedWithCode: (status: number) => t("upload.rejectedWithCode", { status }),
  };
}
