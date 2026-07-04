import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(Object.entries(process.env).filter((entry) => entry[1] !== undefined));
const tsxCli = resolve(rootDir, "node_modules/tsx/dist/cli.mjs");
const viteCli = resolve(rootDir, "node_modules/vite/bin/vite.js");

const children = [
  spawn(process.execPath, [tsxCli, "apps/server/src/index.ts"], {
    cwd: rootDir,
    env,
    stdio: "inherit",
    windowsHide: true
  }),
  spawn(process.execPath, [viteCli, "--host", "0.0.0.0", "--port", process.env.CLIENT_PORT ?? "5174"], {
    cwd: resolve(rootDir, "apps/client"),
    env,
    stdio: "inherit",
    windowsHide: true
  })
];

let shuttingDown = false;

function stopAll(signal = "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

for (const child of children) {
  child.on("exit", (code, signal) => {
    if (!shuttingDown && code !== 0) {
      stopAll(signal ?? "SIGTERM");
      process.exitCode = code ?? 1;
    }
  });
}

process.on("SIGINT", () => stopAll("SIGINT"));
process.on("SIGTERM", () => stopAll("SIGTERM"));
