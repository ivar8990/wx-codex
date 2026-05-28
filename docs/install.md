# Install

## 1. Install Dependencies

```bash
npm install
npm run build
```

## 2. Confirm WeChat DevTools CLI

Run the doctor first:

```bash
npm run doctor
```

To probe the WeChat DevTools service port and login state, run:

```bash
npm run cli -- doctor --probe-ide
```

This calls the local WeChat DevTools CLI `islogin` command.

Then detect DevTools directly:

```bash
npm run devtools:detect
```

If Codex cannot find the CLI automatically, pass the CLI path when calling bridge tools.

On Windows, if auto-detection fails, set `WECHAT_DEVTOOLS_CLI` to the full `cli.bat` path.

Doctor checks:

- Node.js version
- WeChat DevTools CLI path
- mini program project root
- `project.config.json`
- whether the demo uses a real AppID

## 3. Add The MCP Server

During development, point Codex at `.mcp.json` from this repository.

The server command is:

```bash
node ./mcp-server/dist/index.js
```

## 4. Test With The Demo Project

Use:

```text
examples/demo-miniprogram
```

This folder is the mini program project root because it contains `project.config.json`.

Do not open the repository root in WeChat DevTools. The repository root contains the Codex plugin and MCP server, not a mini program project.

The demo project has a placeholder `appid`. Replace it with your own AppID when using real preview or upload flows. This is expected for normal local development.

When publishing your own fork, tutorial, or plugin package, replace personal AppIDs with placeholders. Do not commit `project.private.config.json` or generated preview QR codes.

`touristappid` can be useful for basic opening tests, but WeChat DevTools CLI preview requires a valid AppID. If preview returns `AppID 不合法` or `invalid appid`, edit:

```text
examples/demo-miniprogram/project.config.json
```

and replace `touristappid` with a real mini program AppID.

Then preview with:

```bash
wx-codex open --project /absolute/path/to/examples/demo-miniprogram
wx-codex preview --project /absolute/path/to/examples/demo-miniprogram
```
