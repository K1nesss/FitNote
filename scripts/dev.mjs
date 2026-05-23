import { spawn } from "node:child_process"

const isWindows = process.platform === "win32"
const npx = isWindows ? "npx.cmd" : "npx"

const processes = [
  spawn(npx, ["wrangler", "dev", "--config", "wrangler.test.toml", "--port", "8787", "--ip", "127.0.0.1"], {
    stdio: "inherit",
    shell: false,
  }),
  spawn(npx, ["vite", "--host", "127.0.0.1", "--port", "5173"], {
    stdio: "inherit",
    shell: false,
  }),
]

let shuttingDown = false

function shutdown(code = 0) {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  for (const process of processes) {
    if (!process.killed) {
      process.kill()
    }
  }
  setTimeout(() => globalThis.process.exit(code), 120)
}

for (const child of processes) {
  child.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      shutdown(code ?? 1)
    }
  })
}

globalThis.process.on("SIGINT", () => shutdown(0))
globalThis.process.on("SIGTERM", () => shutdown(0))
