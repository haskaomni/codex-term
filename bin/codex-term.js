#!/usr/bin/env node
import { createRequire } from "module";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync, copyFileSync } from "fs";
import { spawn } from "child_process";

const require = createRequire(import.meta.url);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  console.log(`Usage: codex-term [directory] [--no-open]\n\nStart a local browser terminal that runs Codex in the given directory.\n\nExamples:\n  codex-term .\n  codex-term ~/src/my-project`);
}

const args = process.argv.slice(2);
if (args.includes("-h") || args.includes("--help")) {
  usage();
  process.exit(0);
}

const noOpen = args.includes("--no-open");
const dirArg = args.find((arg) => !arg.startsWith("-")) ?? ".";
const targetDir = resolve(process.cwd(), dirArg);

if (!existsSync(targetDir)) {
  console.error(`codex-term: directory not found: ${targetDir}`);
  process.exit(1);
}

try {
  const wasmSource = require.resolve("@wterm/core/wasm");
  const publicDir = resolve(packageRoot, "public");
  mkdirSync(publicDir, { recursive: true });
  copyFileSync(wasmSource, resolve(publicDir, "wterm.wasm"));
} catch (error) {
  console.error("codex-term: failed to prepare wterm.wasm");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const port = process.env.PORT || "0";
const host = process.env.HOST || "127.0.0.1";
const env = {
  ...process.env,
  CODEX_TERM_CWD: targetDir,
  CODEX_TERM_NO_OPEN: noOpen ? "1" : "0",
  PORT: port,
  HOST: host,
};

const server = spawn(process.execPath, [resolve(packageRoot, "server.js")], {
  cwd: packageRoot,
  env,
  stdio: "inherit",
});

server.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
