# Release Checklist

Use this checklist before publishing a GitHub release, npm package, or shared Codex plugin package.

## Version

- [ ] Decide release version, for example `v0.1.0-alpha.1`.
- [ ] Update `CHANGELOG.md`.
- [ ] Confirm `mcp-server/package.json` version.
- [ ] Confirm `.codex-plugin/plugin.json` version.
- [ ] Keep Codex cachebuster versions out of public release tags unless intentionally testing local plugin reinstall behavior.

## Build And Validation

- [ ] Run `npm install`.
- [ ] Run `npm run check`.
- [ ] Run `npm run build`.
- [ ] Run `npm run doctor`.
- [ ] Run `npm run pack:dry-run`.
- [ ] Run Codex plugin validation:

```bash
python3 /Users/ivaryang/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py .
```

## Local CLI Smoke Tests

- [ ] Run `npm run cli -- help`.
- [ ] Run `npm run cli -- doctor`.
- [ ] Run `npm run cli -- doctor --probe-ide` on a machine with WeChat DevTools installed.
- [ ] Run `npm run cli -- open --project ./examples/demo-miniprogram`.
- [ ] Run `npm run cli -- preview --project ./examples/demo-miniprogram` and confirm the expected placeholder AppID warning.

## Privacy And Local Artifacts

- [ ] Confirm demo AppID is `touristappid` or a placeholder.
- [ ] Confirm no personal AppID is committed.
- [ ] Confirm no `project.private.config.json` files are committed.
- [ ] Confirm no preview QR code files are committed.
- [ ] Confirm no upload keys or private key paths are committed.
- [ ] Run a sensitive-value scan, for example:

```bash
rg -n "wx[a-f0-9]{16}|project.private.config.json|preview-qrcode|privateKey|uploadKey" \
  -g '!node_modules/**' \
  -g '!mcp-server/dist/**'
```

## npm Package

- [ ] Confirm package name is `wx-codex`.
- [ ] Confirm `npm run pack:dry-run` includes only expected files.
- [ ] Confirm the package does not include demo projects, private config, QR codes, or source files unless intentionally included.
- [ ] Confirm `wx-codex help` works from the packed package.

## Codex Plugin

- [ ] Confirm `.codex-plugin/plugin.json` validates.
- [ ] Confirm `.mcp.json` points to the expected MCP server entry.
- [ ] Confirm personal marketplace install works for local testing:

```bash
codex plugin add wx-codex@personal
```

- [ ] Start a new Codex thread after reinstalling the plugin.

## Release Notes

- [ ] Mention supported OS coverage. Current MVP is macOS-tested.
- [ ] Mention WeChat DevTools service port requirement.
- [ ] Mention real AppID requirement for preview.
- [ ] Mention that the project is local-first and does not upload source code or credentials to a hosted service.
