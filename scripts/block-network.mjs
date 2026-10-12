// Блокирует исходящие сетевые соединения процесса Node (кроме петли
// 127.0.0.0/8, ::1 и localhost). Подключается как
// NODE_OPTIONS="--import file:///…/scripts/block-network.mjs", тогда действует
// и на дочерние процессы Node: pnpm, tsx, ESLint, воркеры Vitest и Jest.
// Используется scripts/offline-gate.sh, чтобы подтвердить, что гейт не ходит
// в сеть (docs/BACKLOG.md, B-261008-gate-network-by-design).
//
// Каждая попытка выхода наружу получает ошибку ENETUNREACH (DNS — ENOTFOUND)
// и дописывается строкой «pid вид адрес» в файл BLOCK_NET_LOG, если он задан.
import dns from "node:dns";
import { appendFileSync } from "node:fs";
import net from "node:net";

const LOG_FILE = process.env["BLOCK_NET_LOG"];

/** @param {unknown} host */
function isLoopback(host) {
  if (typeof host !== "string" || host === "") return true;
  return (
    host === "localhost" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host === "::" ||
    /^127\./.test(host)
  );
}

/**
 * @param {string} kind
 * @param {string} target
 */
function record(kind, target) {
  if (LOG_FILE) appendFileSync(LOG_FILE, `${String(process.pid)} ${kind} ${target}\n`);
}

const originalConnect = net.Socket.prototype.connect;
/** @type {typeof net.Socket.prototype.connect} */
function blockedConnect(...args) {
  // net.connect(port, host) передаёт в Socket.connect уже нормализованный
  // массив [options, callback]; прямой вызов socket.connect(options) — объект.
  const raw = /** @type {unknown} */ (args[0]);
  const first = Array.isArray(raw) ? /** @type {unknown} */ (raw[0]) : raw;
  let host;
  let port;
  let path;
  if (typeof first === "object" && first !== null) {
    ({ host, port, path } = /** @type {{ host?: string; port?: number; path?: string }} */ (first));
  } else if (typeof first === "number" || (typeof first === "string" && /^\d+$/.test(first))) {
    port = Number(first);
    host = typeof args[1] === "string" ? args[1] : undefined;
  } else if (typeof first === "string") {
    path = first;
  }
  if (path === undefined && !isLoopback(host)) {
    const target = `${String(host)}:${String(port)}`;
    record("connect", target);
    const error = Object.assign(new Error(`connect ENETUNREACH ${target} (сеть заблокирована)`), {
      code: "ENETUNREACH",
    });
    process.nextTick(() => {
      this.destroy(error);
    });
    return this;
  }
  return Reflect.apply(originalConnect, this, args);
}
net.Socket.prototype.connect = blockedConnect;

const originalLookup = dns.lookup;
/** @param {string} hostname @param {...unknown} rest */
function blockedLookup(hostname, ...rest) {
  if (isLoopback(hostname)) return Reflect.apply(originalLookup, dns, [hostname, ...rest]);
  record("lookup", hostname);
  const callback = rest.find((item) => typeof item === "function");
  const error = Object.assign(new Error(`getaddrinfo ENOTFOUND ${hostname} (сеть заблокирована)`), {
    code: "ENOTFOUND",
    hostname,
  });
  if (typeof callback === "function") process.nextTick(() => callback(error));
  return undefined;
}
// @ts-expect-error — у dns.lookup перегрузки с утилитой promisify.custom; нам нужна только обратная связь
dns.lookup = blockedLookup;

const originalPromisesLookup = dns.promises.lookup;
dns.promises.lookup = (hostname, ...rest) => {
  if (isLoopback(hostname))
    return Reflect.apply(originalPromisesLookup, dns.promises, [hostname, ...rest]);
  record("lookup", hostname);
  return Promise.reject(
    Object.assign(new Error(`getaddrinfo ENOTFOUND ${hostname} (сеть заблокирована)`), {
      code: "ENOTFOUND",
      hostname,
    }),
  );
};
