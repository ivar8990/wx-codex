# Demo Mini Program

Open this folder in WeChat DevTools:

```text
examples/demo-miniprogram
```

This is the mini program project root. It contains:

- `project.config.json`
- `miniprogram/app.json`
- `miniprogram/pages/index/index.wxml`

Do not open the repository root:

```text
wx-codex
```

That folder is the Codex plugin and MCP server project, not the mini program project.

## Preview

Use a real mini program AppID in `project.config.json` before running CLI preview.

Using a real AppID is expected for normal local development.

When publishing a public example, do not commit personal AppIDs, `project.private.config.json`, preview QR codes, or upload keys.

For public examples, keep `project.config.json` on `touristappid` or copy `project.config.example.json` and replace the placeholder locally.
