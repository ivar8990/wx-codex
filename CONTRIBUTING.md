# Contributing

Thanks for helping improve WX-Codex.

This project is still in MVP stage, so contributions that improve setup reliability, CLI compatibility, documentation, and error handling are especially useful.

## Development Setup

```bash
npm install
npm run build
npm run doctor
```

Before opening a pull request, run:

```bash
npm run check
npm run build
```

## Useful Areas

- WeChat DevTools CLI compatibility
- Windows path detection
- service port diagnostics
- clearer preview errors
- `miniprogram-ci` support
- documentation and troubleshooting
- demo mini program improvements

## Privacy And Local Files

Real AppIDs are normal for local mini program development, but do not commit personal or generated local artifacts to this repository.

Before submitting changes, check that you did not include:

- personal AppIDs in public examples
- `project.private.config.json`
- preview QR codes
- upload keys
- private key paths
- local machine paths that are not part of an example

Use placeholders such as:

```text
touristappid
your-mini-program-appid
```

## Pull Requests

Please include:

- what changed
- why it changed
- how you tested it
- any known limitations

For CLI behavior changes, include the WeChat DevTools version and operating system when possible.
