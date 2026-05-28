---
name: wechat-miniprogram
description: Use when developing WeChat mini programs through WX-Codex, including inspecting project structure, listing pages/components/cloud functions, creating page/component/cloud function templates, opening projects, triggering previews, reading project config, and feeding DevTools output back into Codex.
---

# WeChat Mini Program Bridge

Use the local MCP tools from WX-Codex when a user asks Codex to work with a WeChat mini program project.

## Workflow

1. Read or create mini program files in the project directory.
2. Call `doctor` when setting up or debugging a local environment.
3. Call `detect_devtools` to find the WeChat DevTools CLI.
4. Call `read_project_config` to confirm the project root and AppID.
5. Call `inspect_project` before larger edits so Codex can understand pages, components, and cloud functions.
6. Call `list_pages`, `list_components`, or `list_cloud_functions` when the user asks about project structure.
7. Call `create_page`, `create_component`, or `create_cloud_function` when the user asks for new mini program building blocks.
8. Call `open_project` when the project should be opened in WeChat DevTools.
9. Call `preview_project` when the user wants a preview build.
10. Use returned CLI output to diagnose and fix project errors.

## Cloud Development

Use `list_cloud_functions` to inspect local WeChat Cloud Development function directories. Use `create_cloud_function` for local cloud function templates. Use `list_cloud_environments`, `list_remote_cloud_functions`, and `get_remote_cloud_function_info` for read-only remote CloudBase inspection. Use `deploy_cloud_functions` only when the user explicitly asks to deploy named cloud functions to a specific envId.

## Safety

Real AppIDs are expected in local user projects. Do not send AppIDs, keys, source code, or preview QR codes to remote services without user consent. For public examples, replace personal AppIDs with placeholders.
