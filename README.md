# WX-Codex

Bridge Codex to WeChat DevTools so AI-assisted mini program development can happen outside WeChat DevTools while WeChat DevTools still handles preview, platform runtime, and QR code generation.

## What It Does

WX-Codex is a local MCP-based developer tool for WeChat mini program workflows.

The MVP supports:

- detecting the local WeChat DevTools CLI
- checking the local setup with `doctor`
- reading `project.config.json`
- opening a mini program project in WeChat DevTools
- triggering preview builds
- generating preview QR codes
- returning CLI output and common error states to Codex

The core loop is:

```text
Codex edits code
  -> WX-Codex calls WeChat DevTools CLI
  -> WeChat DevTools opens or previews the mini program
  -> CLI output returns to Codex
```

## How It Works

```text
Codex / MCP client
  -> local MCP server
  -> WeChat DevTools CLI
  -> local mini program project
  -> preview QR code / CLI output
```

This project does not replace WeChat DevTools. It uses WeChat DevTools as the official preview and runtime channel.

## Requirements

- Node.js 20+
- WeChat DevTools installed locally
- WeChat DevTools service port enabled
- A WeChat mini program project containing `project.config.json`

On macOS, the WeChat DevTools CLI is usually:

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli
```

On Windows, common CLI locations include:

```text
C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat
C:\Program Files\Tencent\微信web开发者工具\cli.bat
C:\Users\<you>\AppData\Local\微信开发者工具\cli.bat
```

If auto-detection fails, set:

```text
WECHAT_DEVTOOLS_CLI=C:\path\to\cli.bat
```

## Quick Start

Install dependencies and build:

```bash
npm install
npm run build
```

Check the local environment:

```bash
npm run doctor
```

To also probe WeChat DevTools service port and login state:

```bash
npm run cli -- doctor --probe-ide
```

Expected output looks like:

```text
WX-Codex Doctor

[OK] Node.js: Detected Node.js v20+. Node.js 20+ is required.
[OK] WeChat DevTools CLI: Found executable CLI at /Applications/wechatwebdevtools.app/Contents/MacOS/cli
[OK] Mini program project root: Found project root at .../examples/demo-miniprogram
[OK] project.config.json: Found project.config.json for wx-codex-demo.
[WARN] AppID: Using touristappid or missing AppID. Opening can work, but CLI preview needs a real AppID.

Result: ready
```

Detect WeChat DevTools directly:

```bash
npm run devtools:detect
```

## Demo Mini Program

The demo mini program lives here:

```text
examples/demo-miniprogram
```

Open this folder in WeChat DevTools. It is the mini program project root because it contains `project.config.json`.

Do not open the repository root in WeChat DevTools:

```text
wx-codex
```

The repository root contains the Codex plugin and MCP server, not the mini program project.

## Preview With WeChat DevTools CLI

For basic opening tests, the demo uses:

```json
"appid": "touristappid"
```

For real preview and upload workflows, replace it with your own mini program AppID in:

```text
examples/demo-miniprogram/project.config.json
```

Then run:

```bash
wx-codex open --project "/absolute/path/to/wx-codex/examples/demo-miniprogram"
wx-codex preview --project "/absolute/path/to/wx-codex/examples/demo-miniprogram"
```

By default, `wx-codex preview` uses `--qr-format image` and writes the QR code to:

```text
<projectPath>/preview-qrcode.jpg
```

You can override the output:

```bash
wx-codex preview \
  --project "/absolute/path/to/wx-codex/examples/demo-miniprogram" \
  --qr-format image \
  --qr-output "/absolute/path/to/preview-qrcode.jpg"
```

Use `--verbose` or `--json` when you need the full WeChat DevTools CLI output.

The MCP `preview_project` tool uses the same default QR output behavior when called with `qrFormat: "image"` and no `qrOutput`.

## MCP Tools

The server currently exposes:

- `doctor`: check local Node.js, WeChat DevTools CLI, project root, config, and AppID state
- `detect_devtools`: detect the WeChat DevTools CLI path
- `read_project_config`: read a mini program `project.config.json`
- `open_project`: open a mini program project in WeChat DevTools
- `preview_project`: trigger a WeChat DevTools preview build and optionally save QR output

## Use With Codex

This repository includes:

```text
.mcp.json
.codex-plugin/plugin.json
skills/wechat-miniprogram/SKILL.md
```

The local MCP server command is:

```bash
node ./mcp-server/dist/index.js
```

The npm CLI entry point is:

```bash
wx-codex server
wx-codex doctor
wx-codex detect
wx-codex open --project /path/to/miniprogram
wx-codex preview --project /path/to/miniprogram
```

During development, point Codex at this repository's `.mcp.json` after running:

```bash
npm install
npm run build
```

## Development Commands

```bash
npm run check
npm run build
npm run cli -- help
npm run doctor
npm run devtools:detect
```

## Troubleshooting

### Windows cannot find WeChat DevTools CLI

Set `WECHAT_DEVTOOLS_CLI` to the full `cli.bat` path, then rerun:

```bash
wx-codex doctor
```

Paths with spaces or Chinese characters are supported when quoted in your shell:

```bash
wx-codex open --project "C:\Users\you\Desktop\mini program"
```

### WeChat DevTools says the project failed to open

Make sure you opened the mini program project root:

```text
examples/demo-miniprogram
```

The correct folder contains `project.config.json`.

### CLI says service port is disabled

Open WeChat DevTools and enable:

```text
Settings -> Security Settings -> Service Port
```

The CLI may also prompt:

```text
Enable IDE Service (y/N)
```

Confirming with `y` enables CLI access for WeChat DevTools.

You can check this from WX-Codex with:

```bash
npm run cli -- doctor --probe-ide
```

### Preview says `AppID 不合法` or `invalid appid`

The demo is still using `touristappid`. Replace it with a real mini program AppID in `project.config.json`.

### Preview says login is required

Log in to WeChat DevTools again, then rerun preview.

### QR output is terminal text instead of an image

Use:

```bash
wx-codex preview --project /path/to/miniprogram --qr-format image
```

## Local-First Security

Real AppIDs are expected in normal local mini program projects. The bridge reads AppID and project settings from your local `project.config.json`.

The bridge runs locally and does not send source code, AppID, preview QR codes, or credentials to a hosted service.

When publishing a fork, demo, tutorial, npm package, or public repository, replace personal AppIDs with placeholders and remove:

- `project.private.config.json`
- preview QR codes
- upload keys
- private key paths

## Roadmap

- Better CLI error summaries
- `doctor` exposed with more service-port diagnostics
- Windows path detection
- `miniprogram-ci` support
- upload and experience-version workflows
- project templates
- optional desktop helper for setup and credential storage

## License

Apache-2.0. See [LICENSE](./LICENSE).
