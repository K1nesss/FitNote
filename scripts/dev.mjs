import { spawn } from "node:child_process"

// Ports can be overridden so FitNote can run next to other local projects.
const apiPort = process.env.FITNOTE_API_PORT ?? "8787"
const webPort = process.env.FITNOTE_WEB_PORT ?? "5173"

const processes = [
  spawn(`npx wrangler dev --config wrangler.test.toml --port ${apiPort} --ip 127.0.0.1`, {
    stdio: "inherit",
    shell: true,
  }),
  spawn(`npx vite --host 127.0.0.1 --port ${webPort} --strictPort`, {
    stdio: "inherit",
    shell: true,
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
