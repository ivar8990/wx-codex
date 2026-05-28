# WX-Codex

Local MCP server and CLI bridge from Codex to WeChat DevTools.

## CLI

```bash
npx wx-codex help
npx wx-codex doctor
npx wx-codex doctor --probe-ide
npx wx-codex detect
npx wx-codex open --project /path/to/miniprogram
npx wx-codex preview --project /path/to/miniprogram
npx wx-codex server
```

## MCP Server

Use the server command for MCP clients:

```bash
wx-codex server
```

The bridge runs locally and calls the local WeChat DevTools CLI.

## Requirements

- Node.js 20+
- WeChat DevTools installed locally
- WeChat DevTools service port enabled for CLI usage

## License

Apache-2.0
