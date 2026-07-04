import { spawn } from "node:child_process";
import WebSocket from "ws";

const port = Number(process.env.SMOKE_PORT ?? 8797);
const roomId = "smoke";
const env = Object.fromEntries(Object.entries(process.env).filter((entry) => entry[1] !== undefined));
const server = spawn(process.execPath, ["node_modules/tsx/dist/cli.mjs", "apps/server/src/index.ts"], {
  env: {
    ...env,
    PORT: String(port)
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let stdout = "";
let stderr = "";

server.stdout.on("data", (chunk) => {
  stdout += chunk.toString("utf8");
});

server.stderr.on("data", (chunk) => {
  stderr += chunk.toString("utf8");
});

try {
  await waitFor(() => stdout.includes(`ws://localhost:${port}`), 10_000, "server ready");
  const first = await connectClient("Smoke A");
  const second = await connectClient("Smoke B");

  first.ws.send(JSON.stringify({ type: "input", seq: 1, input: input({ thrust: true, shoot: true }) }));
  second.ws.send(JSON.stringify({ type: "input", seq: 1, input: input({ right: true, thrust: true }) }));

  await waitFor(
    () =>
      Boolean(first.snapshot) &&
      Boolean(second.snapshot) &&
      first.snapshot.players.length >= 2 &&
      second.snapshot.players.length >= 2 &&
      first.snapshot.asteroids.length > 0 &&
      second.snapshot.scoreboard.length >= 2,
    10_000,
    "shared snapshot"
  );

  first.ws.close();
  second.ws.close();
  console.log("smoke:ws ok");
} finally {
  server.kill("SIGTERM");
}

async function connectClient(nickname) {
  const ws = new WebSocket(`ws://localhost:${port}`);
  const client = {
    ws,
    playerId: undefined,
    snapshot: undefined
  };

  ws.on("message", (data) => {
    const message = JSON.parse(data.toString("utf8"));
    if (message.type === "joinedRoom") client.playerId = message.playerId;
    if (message.type === "snapshot") client.snapshot = message.snapshot;
  });

  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });

  ws.send(JSON.stringify({ type: "joinRoom", roomId, nickname }));
  await waitFor(() => Boolean(client.playerId) && Boolean(client.snapshot), 10_000, `${nickname} joined`);
  return client;
}

function input(overrides = {}) {
  return {
    left: false,
    right: false,
    thrust: false,
    shoot: false,
    ...overrides
  };
}

function waitFor(predicate, timeoutMs, label) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer);
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        clearInterval(timer);
        reject(new Error(`Timed out waiting for ${label}\nstdout:\n${stdout}\nstderr:\n${stderr}`));
      }
    }, 50);
  });
}
