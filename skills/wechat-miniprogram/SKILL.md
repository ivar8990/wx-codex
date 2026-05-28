---
name: wechat-miniprogram
description: Use when developing WeChat mini programs through WX-Codex, including opening projects, triggering previews, reading project config, and feeding DevTools output back into Codex.
---

# WeChat Mini Program Bridge

Use the local MCP tools from WX-Codex when a user asks Codex to work with a WeChat mini program project.

## Workflow

1. Read or create mini program files in the project directory.
2. Call `doctor` when setting up or debugging a local environment.
3. Call `detect_devtools` to find the WeChat DevTools CLI.
4. Call `read_project_config` to confirm the project root and AppID.
5. Call `open_project` when the project should be opened in WeChat DevTools.
6. Call `preview_project` when the user wants a preview build.
7. Use returned CLI output to diagnose and fix project errors.

## Safety

Real AppIDs are expected in local user projects. Do not send AppIDs, keys, source code, or preview QR codes to remote services without user consent. For public examples, replace personal AppIDs with placeholders.
