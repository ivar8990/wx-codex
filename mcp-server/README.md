# WX-Codex

Local MCP server and CLI bridge from Codex to WeChat DevTools.

## CLI

```bash
npx wx-codex help
npx wx-codex doctor
npx wx-codex doctor --probe-ide
npx wx-codex detect
npx wx-codex inspect --project /path/to/miniprogram
npx wx-codex pages --project /path/to/miniprogram
npx wx-codex components --project /path/to/miniprogram
npx wx-codex cloud list --project /path/to/miniprogram
npx wx-codex cloud envs --project /path/to/miniprogram
npx wx-codex cloud remote-list --project /path/to/miniprogram --env <env-id>
npx wx-codex cloud deploy --project /path/to/miniprogram --env <env-id> --names getOpenId --remote-npm-install
npx wx-codex create page --project /path/to/miniprogram --path pages/profile/index --title Profile
npx wx-codex create component --project /path/to/miniprogram --path components/user-card/index
npx wx-codex create cloud-function --project /path/to/miniprogram --name getOpenId
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
