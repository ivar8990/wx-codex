import { existsSync } from "node:fs";
import path from "node:path";

import { detectDevTools, probeIde } from "./devtools.js";
import { readProjectConfig } from "./project-config.js";

export type DoctorCheck = {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
};

export type DoctorReport = {
  ok: boolean;
  checks: DoctorCheck[];
};

export async function runDoctor(options: {
  projectPath?: string;
  cliPath?: string;
  repoRoot?: string;
  probeIde?: boolean;
} = {}): Promise<DoctorReport> {
  const repoRoot = options.repoRoot ?? process.cwd();
  const projectPath = options.projectPath ?? path.join(repoRoot, "examples", "demo-miniprogram");
  const checks: DoctorCheck[] = [];

  checks.push(checkNodeVersion());

  const detection = await detectDevTools(options.cliPath);
  checks.push({
    name: "WeChat DevTools CLI",
    status: detection.found ? "pass" : "fail",
    message: detection.cliPath
      ? `Found executable CLI at ${detection.cliPath}`
      : "Could not find WeChat DevTools CLI. Install WeChat DevTools or set WECHAT_DEVTOOLS_CLI.",
  });

  if (detection.found && options.probeIde) {
    await addIdeProbeCheck(checks, detection.cliPath);
  } else if (detection.found) {
    checks.push({
      name: "WeChat DevTools service port",
      status: "warn",
      message: "Not probed. Run doctor with --probe-ide to check service port and login state.",
    });
  }

  checks.push({
    name: "Mini program project root",
    status: existsSync(projectPath) ? "pass" : "fail",
    message: existsSync(projectPath)
      ? `Found project root at ${projectPath}`
      : `Project root not found at ${projectPath}`,
  });

  await addProjectConfigChecks(checks, projectPath);

  return {
    ok: checks.every((check) => check.status !== "fail"),
    checks,
  };
}

function checkNodeVersion(): DoctorCheck {
  const major = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);

  return {
    name: "Node.js",
    status: major >= 20 ? "pass" : "fail",
    message: `Detected Node.js ${process.version}. Node.js 20+ is required.`,
  };
}

async function addProjectConfigChecks(checks: DoctorCheck[], projectPath: string): Promise<void> {
  const configPath = path.join(projectPath, "project.config.json");

  if (!existsSync(configPath)) {
    checks.push({
      name: "project.config.json",
      status: "fail",
      message: `Missing ${configPath}. WeChat DevTools must open the folder containing project.config.json.`,
    });
    return;
  }

  try {
    const { config } = await readProjectConfig(projectPath);
    checks.push({
      name: "project.config.json",
      status: "pass",
      message: `Found project.config.json for ${config.projectname ?? "unnamed project"}.`,
    });

    checks.push({
      name: "AppID",
      status: config.appid && config.appid !== "touristappid" ? "pass" : "warn",
      message:
        config.appid && config.appid !== "touristappid"
          ? `Using AppID ${config.appid}.`
          : "Using touristappid or missing AppID. Opening can work, but CLI preview needs a real AppID.",
    });
  } catch (error) {
    checks.push({
      name: "project.config.json",
      status: "fail",
      message: error instanceof Error ? error.message : "Unable to read project.config.json.",
    });
  }
}

async function addIdeProbeCheck(checks: DoctorCheck[], cliPath?: string): Promise<void> {
  try {
    const result = await probeIde({ cliPath, timeoutMs: 30_000 });
    const summary = result.summary;

    if (summary?.errorType === "service_port_disabled") {
      checks.push({
        name: "WeChat DevTools service port",
        status: "fail",
        message: summary.message ?? "Service port is disabled.",
      });
      return;
    }

    if (summary?.errorType === "auth_required") {
      checks.push({
        name: "WeChat DevTools login",
        status: "fail",
        message: summary.message ?? "WeChat DevTools needs login.",
      });
      return;
    }

    checks.push({
      name: "WeChat DevTools service port",
      status: result.exitCode === 0 ? "pass" : "fail",
      message:
        result.exitCode === 0
          ? "IDE server is reachable and CLI calls are accepted."
          : "Unable to reach IDE server with CLI islogin.",
    });

    if (result.stdout.includes("\"login\":true")) {
      checks.push({
        name: "WeChat DevTools login",
        status: "pass",
        message: "WeChat DevTools is logged in.",
      });
    } else if (result.stdout.includes("\"login\":false")) {
      checks.push({
        name: "WeChat DevTools login",
        status: "fail",
        message: "WeChat DevTools is not logged in.",
      });
    }
  } catch (error) {
    checks.push({
      name: "WeChat DevTools service port",
      status: "fail",
      message: error instanceof Error ? error.message : "Unable to probe IDE service port.",
    });
  }
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines = ["WX-Codex Doctor", ""];

  for (const check of report.checks) {
    lines.push(`${statusSymbol(check.status)} ${check.name}: ${check.message}`);
  }

  lines.push("");
  lines.push(report.ok ? "Result: ready" : "Result: action required");

  return lines.join("\n");
}

function statusSymbol(status: DoctorCheck["status"]): string {
  switch (status) {
    case "pass":
      return "[OK]";
    case "warn":
      return "[WARN]";
    case "fail":
      return "[FAIL]";
  }
}
