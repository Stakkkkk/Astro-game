import { spawn } from "node:child_process";

const port = Number(process.env.SMOKE_WORKER_PORT ?? 8788);
const healthUrl = `http://127.0.0.1:${port}/health`;
const wsUrl = `ws://127.0.0.1:${port}/ws`;
const env = {
  ...Object.fromEntries(Object.entries(process.env).filter((entry) => entry[1] !== undefined)),
  CI: "1",
  NO_COLOR: "1",
  WRANGLER_SEND_METRICS: "false"
};

const worker = spawn(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "dev",
    "--config",
    "apps/worker/wrangler.jsonc",
    "--ip",
    "127.0.0.1",
    "--port",
    String(port),
    "--local",
    "--log-level",
    "warn"
  ],
  {
    env,
    stdio: ["ignore", "pipe", "pipe"]
  }
);

let stdout = "";
let stderr = "";

worker.stdout.on("data", (chunk) => {
  stdout += chunk.toString("utf8");
});

worker.stderr.on("data", (chunk) => {
  stderr += chunk.toString("utf8");
});

try {
  await waitForHealth(30_000);
  await runNode(["scripts/smoke-ws.mjs"], {
    ...env,
    SMOKE_WS_URL: wsUrl
  });
  console.log("smoke:worker ok");
} finally {
  worker.kill("SIGTERM");
}

async function waitForHealth(timeoutMs) {
  const startedAt = Date.now();
  let lastError = "";

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for ${healthUrl}\nlast error: ${lastError}\nstdout:\n${stdout}\nstderr:\n${stderr}`);
}

function runNode(args, childEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      env: childEnv,
      stdio: ["ignore", "inherit", "inherit"]
    });

    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`node ${args.join(" ")} exited with code ${code}`));
    });

    child.on("error", reject);
  });
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
