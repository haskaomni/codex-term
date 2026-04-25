# codex-web

Run Codex CLI in your browser from any local directory.

```bash
cd /path/to/project
codex-web .
```

`codex-web` starts a local-only web terminal, opens your browser, and launches `codex` in the directory you pass in.

## Requirements

- Node.js 20+
- The Codex CLI available on your `PATH`

## Install

```bash
npm install -g codex-web
```

Or run from a local checkout:

```bash
pnpm install
pnpm dev
```

## Usage

```bash
codex-web [directory]
```

Examples:

```bash
codex-web .
codex-web ~/src/my-project
codex-web /absolute/path/to/project
```

The server binds to `127.0.0.1` by default and chooses a random available port. Keep the terminal process running while using Codex Web; press `Ctrl+C` to stop it.

## Options

```bash
codex-web --help
codex-web . --no-open
```

Environment variables:

- `HOST` - host to bind, defaults to `127.0.0.1`
- `PORT` - port to bind, defaults to `0` for a random available port

## Security

This tool runs Codex with the same local permissions as your shell. It is designed for local use and binds to `127.0.0.1` by default. Do not expose it to the public internet without authentication and isolation.

## License

Apache-2.0
