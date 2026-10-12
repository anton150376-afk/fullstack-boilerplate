import react from "@boilerplate/eslint-config/react";
import test from "@boilerplate/eslint-config/test";

export default [
  // routeTree.gen.ts — сгенерированный плагином маршрутизатора файл, не
  // наш исходник (раздел "Фаза 6" задания: "исключить из линтера и
  // форматтера"). server-entry.mjs лежит вне src/ и allowDefaultProject
  // (base.js) не покрывает произвольные .mjs-имена, только *.config.*;
  // расширять allowDefaultProject под один файл одной апки — лишний
  // риск для всех остальных потребителей base.js, файл простой (10 строк).
  { ignores: [".output/**", "src/routeTree.gen.ts", "server-entry.mjs"] },
  ...react,
  ...test,
];
