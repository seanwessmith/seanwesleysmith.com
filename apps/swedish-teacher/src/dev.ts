import { spawn } from "node:child_process";

const children = [
  spawn("bun", ["--watch", "src/server.ts"], {
    env: { ...process.env, PORT: process.env.PORT ?? "8787" },
    stdio: "inherit",
  }),
  spawn("bun", ["./index.html", "--host=127.0.0.1", "--port=5173"], {
    stdio: "inherit",
  }),
];

let shuttingDown = false;

function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => shutdown(signal));
}

for (const child of children) {
  child.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      shutdown("SIGTERM");
      process.exit(code ?? 1);
    }
  });
}
