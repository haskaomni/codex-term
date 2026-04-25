import { createServer } from "http";
import { parse } from "url";
import { spawnSync, spawn } from "child_process";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import * as pty from "node-pty";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "127.0.0.1";
const requestedPort = Number.parseInt(process.env.PORT || "0", 10);
const targetDir = process.env.CODEX_WEB_CWD || process.cwd();
const shouldOpen = process.env.CODEX_WEB_NO_OPEN !== "1";

const app = next({ dev, hostname, port: requestedPort || 3000, dir: process.cwd(), turbopack: dev });
const handle = app.getRequestHandler();

function cleanEnv() {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }
  env.TERM = env.TERM || "xterm-256color";
  return env;
}

function openBrowser(url) {
  if (!shouldOpen) return;
  const candidates = process.platform === "darwin" ? [["open", [url]]] : process.platform === "win32" ? [["cmd", ["/c", "start", "", url]]] : [["xdg-open", [url]]];
  for (const [cmd, args] of candidates) {
    const check = process.platform === "win32" ? { status: 0 } : spawnSync("command", ["-v", cmd], { shell: true, stdio: "ignore" });
    if (check.status === 0) {
      const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
      child.unref();
      return;
    }
  }
}

function handlePTYConnection(ws) {
  let ptyProcess;
  try {
    ptyProcess = pty.spawn("codex", [], {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd: targetDir,
      env: cleanEnv(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to spawn Codex: ${message}`);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(`\r\n\x1b[31mFailed to spawn Codex: ${message}\x1b[0m\r\n`);
      ws.close();
    }
    return;
  }

  ptyProcess.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  });

  ptyProcess.onExit(() => {
    if (ws.readyState === WebSocket.OPEN) ws.close();
  });

  ws.on("message", (msg) => {
    const input = typeof msg === "string" ? msg : msg.toString("utf-8");
    if (input.startsWith("\x1b[RESIZE:")) {
      const match = input.match(/\x1b\[RESIZE:(\d+);(\d+)\]/);
      if (match) {
        ptyProcess.resize(Number.parseInt(match[1], 10), Number.parseInt(match[2], 10));
        return;
      }
    }
    ptyProcess.write(input);
  });

  ws.on("close", () => {
    ptyProcess.kill();
  });
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || "/", true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = parse(req.url || "/", true);
    if (pathname === "/api/terminal") {
      wss.handleUpgrade(req, socket, head, (ws) => handlePTYConnection(ws));
    } else {
      app.getUpgradeHandler()(req, socket, head);
    }
  });

  server.listen(requestedPort, hostname, () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : requestedPort;
    const url = `http://${hostname}:${port}`;
    console.log("\nCodex Web is running");
    console.log(`  directory: ${targetDir}`);
    console.log(`  url:       ${url}`);
    console.log("\nKeep this terminal open. Press Ctrl+C to stop.\n");
    openBrowser(url);
  });
});
