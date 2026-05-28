# Security Model

WX-Codex is local-first. Users can and should use real AppIDs for their own mini program preview and upload workflows.

## Local By Default

The bridge executes local commands and returns local command output to the connected AI tool. It reads AppID and project settings from the user's local `project.config.json`.

It does not send source code, AppID, preview QR codes, or credentials to a hosted service.

## Normal User Projects

Real AppIDs are normal in user projects. A project that needs preview or upload should use the AppID assigned by WeChat.

Users should still treat these values and files carefully when sharing a repository publicly:

- AppID
- private key files
- upload keys
- project source code
- preview QR codes
- developer account identity

## Public Repositories

Before publishing a fork, demo, tutorial, npm package, or public repository, remove local test artifacts:

- real AppIDs from demo config files
- `project.private.config.json`
- preview QR code files
- upload keys or private key paths

Public examples should use placeholders such as `touristappid` or `your-mini-program-appid`. Local development projects can use real AppIDs.

## Product Direction

Paid or hosted features should be opt-in and should clearly explain what leaves the machine. A future desktop app should store credentials using the operating system keychain.
