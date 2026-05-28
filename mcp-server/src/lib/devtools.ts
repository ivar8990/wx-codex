import { constants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";

import { runCommand } from "./command.js";
import type { CommandResult, DevToolsDetection } from "./types.js";

const MACOS_CLI_PATHS = [
  "/Applications/wechatwebdevtools.app/Contents/MacOS/cli",
  "/Applications/微信开发者工具.app/Contents/MacOS/cli",
];

const WINDOWS_CLI_PATHS = [
  "C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat",
  "C:\\Program Files\\Tencent\\微信web开发者工具\\cli.bat",
  "C:\\Program Files (x86)\\Tencent\\微信开发者工具\\cli.bat",
  "C:\\Program Files\\Tencent\\微信开发者工具\\cli.bat",
];

function pathCandidates(explicitCliPath?: string): string[] {
  const home = process.env.USERPROFILE;
  const windowsUserCandidates = home
    ? [
        path.join(home, "AppData", "Local", "微信开发者工具", "cli.bat"),
        path.join(home, "AppData", "Local", "微信web开发者工具", "cli.bat"),
        path.join(home, "AppData", "Local", "Programs", "微信开发者工具", "cli.bat"),
        path.join(home, "AppData", "Local", "Programs", "微信web开发者工具", "cli.bat"),
      ]
    : [];
  const fromPath = (process.env.PATH ?? "")
    .split(path.delimiter)
    .filter(Boolean)
    .flatMap((directory) => [
      path.join(directory, process.platform === "win32" ? "cli.bat" : "cli"),
      path.join(directory, process.platform === "win32" ? "cli.cmd" : "cli"),
      path.join(directory, process.platform === "win32" ? "wechatdevtools-cli.bat" : "wechatdevtools-cli"),
      path.join(directory, process.platform === "win32" ? "wechatdevtools-cli.cmd" : "wechatdevtools-cli"),
    ]);

  return [
    explicitCliPath,
    process.env.WECHAT_DEVTOOLS_CLI,
    ...MACOS_CLI_PATHS,
    ...WINDOWS_CLI_PATHS,
    ...windowsUserCandidates,
    ...fromPath,
  ].filter((value): value is string => Boolean(value));
}

async function inspectCandidate(candidatePath: string) {
  let exists = false;
  let executable = false;

  try {
    await access(candidatePath, constants.F_OK);
    exists = true;
  } catch {
    return { path: candidatePath, exists, executable };
  }

  try {
    await access(candidatePath, constants.X_OK);
    executable = true;
  } catch {
    executable = process.platform === "win32" && /\.(bat|cmd|exe)$/i.test(candidatePath);
  }

  return { path: candidatePath, exists, executable };
}

export async function detectDevTools(explicitCliPath?: string): Promise<DevToolsDetection> {
  const uniqueCandidates = [...new Set(pathCandidates(explicitCliPath))];
  const candidates = await Promise.all(uniqueCandidates.map(inspectCandidate));
  const match = candidates.find((candidate) => candidate.exists && candidate.executable);

  return {
    found: Boolean(match),
    cliPath: match?.path,
    source: match
      ? match.path === explicitCliPath
        ? "explicit"
        : match.path === process.env.WECHAT_DEVTOOLS_CLI
          ? "WECHAT_DEVTOOLS_CLI"
          : "auto"
      : undefined,
    candidates,
  };
}

export async function requireDevToolsCli(explicitCliPath?: string): Promise<string> {
  const detection = await detectDevTools(explicitCliPath);
  if (!detection.cliPath) {
    throw new Error("WeChat DevTools CLI was not found. Provide cliPath or set WECHAT_DEVTOOLS_CLI.");
  }

  return detection.cliPath;
}

export async function openProject(params: {
  projectPath: string;
  cliPath?: string;
  timeoutMs?: number;
}): Promise<CommandResult> {
  const cliPath = await requireDevToolsCli(params.cliPath);
  return runCommand(cliPath, ["open", "--project", path.resolve(params.projectPath)], {
    timeoutMs: params.timeoutMs,
  }).then(withDevToolsSummary);
}

export async function probeIde(params: {
  cliPath?: string;
  timeoutMs?: number;
}): Promise<CommandResult> {
  const cliPath = await requireDevToolsCli(params.cliPath);
  return runCommand(cliPath, ["islogin"], {
    timeoutMs: params.timeoutMs ?? 30_000,
  }).then(withDevToolsSummary);
}

export async function previewProject(params: {
  projectPath: string;
  cliPath?: string;
  qrFormat?: "terminal" | "image" | "base64";
  qrOutput?: string;
  infoOutput?: string;
  timeoutMs?: number;
}): Promise<CommandResult> {
  const cliPath = await requireDevToolsCli(params.cliPath);
  const projectPath = path.resolve(params.projectPath);
  const qrOutput =
    params.qrOutput ??
    (params.qrFormat === "image" ? path.join(projectPath, "preview-qrcode.jpg") : undefined);
  const args = ["preview", "--project", projectPath];

  if (params.qrFormat) {
    args.push("--qr-format", params.qrFormat);
  }

  if (qrOutput) {
    args.push("--qr-output", qrOutput);
  }

  if (params.infoOutput) {
    args.push("--info-output", params.infoOutput);
  }

  return runCommand(cliPath, args, {
    timeoutMs: params.timeoutMs ?? 180_000,
  }).then((result) => withDevToolsSummary(result, { qrOutput }));
}

function withDevToolsSummary(result: CommandResult, options: { qrOutput?: string } = {}): CommandResult {
  const combinedOutput = `${result.stdout}\n${result.stderr}`;

  if (
    combinedOutput.includes("IDE service port disabled") ||
    combinedOutput.includes("服务端口已关闭")
  ) {
    return {
      ...result,
      summary: {
        ok: false,
        errorType: "service_port_disabled",
        message:
          "WeChat DevTools service port is disabled. Enable Settings -> Security Settings -> Service Port, or confirm the CLI prompt with y.",
      },
    };
  }

  if (combinedOutput.includes("需要重新登录")) {
    return {
      ...result,
      summary: {
        ok: false,
        errorType: "auth_required",
        message: "WeChat DevTools requires the user to log in again.",
      },
    };
  }

  if (combinedOutput.includes("AppID 不合法") || combinedOutput.includes("invalid appid")) {
    return {
      ...result,
      summary: {
        ok: false,
        errorType: "invalid_appid",
        message: "The mini program AppID is invalid. Use a real AppID for preview.",
      },
    };
  }

  if (
    combinedOutput.includes("project.config.json") &&
    (combinedOutput.includes("not found") ||
      combinedOutput.includes("no such file") ||
      combinedOutput.includes("ENOENT"))
  ) {
    return {
      ...result,
      summary: {
        ok: false,
        errorType: "missing_project_config",
        message:
          "Missing project.config.json. Open the mini program project root, not the repository root.",
      },
    };
  }

  if (
    combinedOutput.includes("PROJECT_CONFIG_JSON_NOT_VALID_OR_NOT_EXIST") ||
    combinedOutput.includes("请检查 project.config.json 是否存在及是否有效")
  ) {
    return {
      ...result,
      summary: {
        ok: false,
        errorType: "invalid_project_config",
        message:
          "WeChat DevTools could not read a valid project.config.json. Check that --project points to the mini program project root.",
      },
    };
  }

  if (combinedOutput.includes("\"login\":false") || combinedOutput.includes("'login':false")) {
    return {
      ...result,
      summary: {
        ok: false,
        errorType: "auth_required",
        message: "WeChat DevTools is not logged in.",
      },
    };
  }

  return {
    ...result,
    summary: {
      ok: result.exitCode === 0 && !result.timedOut && !combinedOutput.includes("[error]"),
      message: options.qrOutput ? `Preview QR output: ${options.qrOutput}` : undefined,
    },
  };
}
