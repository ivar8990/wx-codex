import path from "node:path";

import { runCommand } from "./command.js";
import { requireDevToolsCli } from "./devtools.js";
import type { CommandResult } from "./types.js";

export async function listCloudEnvironments(params: {
  projectPath: string;
  cliPath?: string;
  timeoutMs?: number;
}): Promise<CommandResult> {
  return runCloudCommand(params.cliPath, ["cloud", "env", "list", "--project", path.resolve(params.projectPath)], params.timeoutMs);
}

export async function listRemoteCloudFunctions(params: {
  projectPath: string;
  envId: string;
  cliPath?: string;
  timeoutMs?: number;
}): Promise<CommandResult> {
  return runCloudCommand(
    params.cliPath,
    ["cloud", "functions", "list", "--env", params.envId, "--project", path.resolve(params.projectPath)],
    params.timeoutMs,
  );
}

export async function getRemoteCloudFunctionInfo(params: {
  projectPath: string;
  envId: string;
  names: string[];
  cliPath?: string;
  timeoutMs?: number;
}): Promise<CommandResult> {
  return runCloudCommand(
    params.cliPath,
    ["cloud", "functions", "info", "--env", params.envId, "--names", ...params.names, "--project", path.resolve(params.projectPath)],
    params.timeoutMs,
  );
}

export async function deployCloudFunctions(params: {
  projectPath: string;
  envId: string;
  names: string[];
  cliPath?: string;
  remoteNpmInstall?: boolean;
  timeoutMs?: number;
}): Promise<CommandResult> {
  const args = ["cloud", "functions", "deploy", "--env", params.envId, "--names", ...params.names, "--project", path.resolve(params.projectPath)];
  if (params.remoteNpmInstall) {
    args.push("--remote-npm-install");
  }

  return runCloudCommand(params.cliPath, args, params.timeoutMs ?? 300_000);
}

async function runCloudCommand(cliPath: string | undefined, args: string[], timeoutMs = 180_000): Promise<CommandResult> {
  const command = await requireDevToolsCli(cliPath);
  const result = await runCommand(command, args, { timeoutMs });
  return withCloudSummary(result);
}

function withCloudSummary(result: CommandResult): CommandResult {
  const combinedOutput = `${result.stdout}\n${result.stderr}`;

  if (combinedOutput.includes("需要重新登录") || combinedOutput.includes("\"login\":false")) {
    return {
      ...result,
      summary: {
        ok: false,
        errorType: "auth_required",
        message: "WeChat DevTools requires login before CloudBase operations.",
      },
    };
  }

  if (combinedOutput.includes("Env ID") && combinedOutput.includes("required")) {
    return {
      ...result,
      summary: {
        ok: false,
        errorType: "missing_env_id",
        message: "CloudBase operation requires an envId.",
      },
    };
  }

  if (combinedOutput.includes("cloudfunctionRoot") && combinedOutput.includes("project.config.json")) {
    return {
      ...result,
      summary: {
        ok: false,
        errorType: "missing_cloudfunction_root",
        message: "project.config.json must define cloudfunctionRoot for cloud function operations.",
      },
    };
  }

  if (combinedOutput.includes("Base resp abnormal") || combinedOutput.includes("system error")) {
    return {
      ...result,
      summary: {
        ok: false,
        errorType: "cloudbase_system_error",
        message:
          "WeChat DevTools reached CloudBase but the cloud service returned a system error. Check the AppID, Cloud Development availability, selected account, and DevTools Cloud Development console.",
      },
    };
  }

  return {
    ...result,
    summary: {
      ok: result.exitCode === 0 && !result.timedOut && !combinedOutput.includes("[error]"),
    },
  };
}
