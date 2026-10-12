import node from "@boilerplate/eslint-config/node";

// Линтует только scripts/ — у корня нет собственного прикладного кода.
// Каждый пакет и приложение подключает свой вариант конфига отдельно.
export default [
  ...node,
  { ignores: ["**/*.config.js", "**/*.config.mjs", "scripts/block-network.mjs"] },
];
