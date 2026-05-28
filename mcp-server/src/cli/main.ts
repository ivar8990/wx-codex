#!/usr/bin/env node
import type { CommandResult } from "../lib/types.js";
import { deployCloudFunctions, getRemoteCloudFunctionInfo, listCloudEnvironments, listRemoteCloudFunctions } from "../lib/cloudbase.js";
import { detectDevTools, openProject, previewProject } from "../lib/devtools.js";
import { formatDoctorReport, runDoctor } from "../lib/doctor.js";
import { createCloudFunction, createComponent, createPage, formatGenerateResult } from "../lib/project-generate.js";
import {
  formatCloudFunctions,
  formatComponents,
  formatPages,
  formatProjectInspection,
  inspectProject,
  listProjectCloudFunctions,
  listProjectComponents,
  listProjectPages,
} from "../lib/project-inspect.js";

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case undefined:
  case "help":
  case "--help":
  case "-h":
    printHelp();
    break;
  case "server":
    await import("../index.js");
    break;
  case "doctor":
    await runDoctorCommand(args);
    break;
  case "detect":
  case "detect-devtools":
    await runDetectCommand(args);
    break;
  case "preview":
    await runPreviewCommand(args);
    break;
  case "open":
    await runOpenCommand(args);
    break;
  case "inspect":
    await runInspectCommand(args);
    break;
  case "pages":
    await runPagesCommand(args);
    break;
  case "components":
    await runComponentsCommand(args);
    break;
  case "cloud":
    await runCloudCommand(args);
    break;
  case "create":
    await runCreateCommand(args);
    break;
  default:
    process.stderr.write(`Unknown command: ${command}\n\n`);
    printHelp();
    process.exitCode = 1;
}

function printHelp(): void {
  process.stdout.write(`WX-Codex

Usage:
  wx-codex server
  wx-codex doctor [--project <path>] [--cli-path <path>] [--probe-ide] [--json]
  wx-codex detect [--cli-path <path>] [--json]
  wx-codex inspect --project <path> [--json]
  wx-codex pages --project <path> [--json]
  wx-codex components --project <path> [--json]
  wx-codex cloud list --project <path> [--json]
  wx-codex cloud envs --project <path> [--json] [--verbose]
  wx-codex cloud remote-list --project <path> --env <env-id> [--json] [--verbose]
  wx-codex cloud info --project <path> --env <env-id> --names <name...> [--json] [--verbose]
  wx-codex cloud deploy --project <path> --env <env-id> --names <name...> [--remote-npm-install] [--json] [--verbose]
  wx-codex create page --project <path> --path <page-path> [--title <title>] [--json]
  wx-codex create component --project <path> --path <component-path> [--json]
  wx-codex create cloud-function --project <path> --name <function-name> [--json]
  wx-codex open --project <path> [--cli-path <path>] [--json] [--verbose]
  wx-codex preview --project <path> [--qr-format image|terminal|base64] [--qr-output <path>] [--info-output <path>] [--cli-path <path>] [--json] [--verbose]

Commands:
  server            Start the MCP server over stdio.
  doctor            Check the local environment.
  detect            Detect the WeChat DevTools CLI.
  inspect           Inspect pages, components, and cloud functions.
  pages             List app.json pages.
  components        List custom components.
  cloud list        List local WeChat Cloud Development cloud functions.
  cloud envs        List remote Cloud Development environments.
  cloud remote-list List deployed cloud functions in an environment.
  cloud info        Show deployed cloud function information.
  cloud deploy      Deploy explicitly named cloud functions.
  create            Create pages, components, or cloud function templates.
  open              Open a mini program project in WeChat DevTools.
  preview           Trigger a WeChat DevTools preview build.
  help              Show this help message.
`);
}

async function runCreateCommand(args: string[]): Promise<void> {
  const [subcommand] = args;
  const projectPath = requireProjectPath(args);
  if (!projectPath) {
    return;
  }

  switch (subcommand) {
    case "page": {
      const pagePath = readOption(args, "--path");
      if (!pagePath) {
        process.stderr.write("Missing required option: --path <page-path>\n");
        process.exitCode = 1;
        return;
      }

      const result = await createPage({ projectPath, pagePath, title: readOption(args, "--title") });
      process.stdout.write(args.includes("--json") ? `${JSON.stringify(result, null, 2)}\n` : formatGenerateResult(result));
      break;
    }
    case "component": {
      const componentPath = readOption(args, "--path");
      if (!componentPath) {
        process.stderr.write("Missing required option: --path <component-path>\n");
        process.exitCode = 1;
        return;
      }

      const result = await createComponent({ projectPath, componentPath });
      process.stdout.write(args.includes("--json") ? `${JSON.stringify(result, null, 2)}\n` : formatGenerateResult(result));
      break;
    }
    case "cloud-function": {
      const functionName = readOption(args, "--name");
      if (!functionName) {
        process.stderr.write("Missing required option: --name <function-name>\n");
        process.exitCode = 1;
        return;
      }

      const result = await createCloudFunction({ projectPath, functionName });
      process.stdout.write(args.includes("--json") ? `${JSON.stringify(result, null, 2)}\n` : formatGenerateResult(result));
      break;
    }
    default:
      process.stderr.write("Missing or unknown create subcommand. Use page, component, or cloud-function.\n");
      process.exitCode = 1;
  }
}

async function runInspectCommand(args: string[]): Promise<void> {
  const projectPath = requireProjectPath(args);
  if (!projectPath) {
    return;
  }

  const inspection = await inspectProject(projectPath);
  process.stdout.write(args.includes("--json") ? `${JSON.stringify(inspection, null, 2)}\n` : `${formatProjectInspection(inspection)}\n`);
  process.exitCode = inspection.warnings.length > 0 ? 1 : 0;
}

async function runPagesCommand(args: string[]): Promise<void> {
  const projectPath = requireProjectPath(args);
  if (!projectPath) {
    return;
  }

  const pages = await listProjectPages(projectPath);
  process.stdout.write(args.includes("--json") ? `${JSON.stringify(pages, null, 2)}\n` : formatPages(pages));
}

async function runComponentsCommand(args: string[]): Promise<void> {
  const projectPath = requireProjectPath(args);
  if (!projectPath) {
    return;
  }

  const components = await listProjectComponents(projectPath);
  process.stdout.write(args.includes("--json") ? `${JSON.stringify(components, null, 2)}\n` : formatComponents(components));
}

async function runCloudCommand(args: string[]): Promise<void> {
  const [subcommand] = args;
  const projectPath = requireProjectPath(args);
  if (!projectPath) {
    return;
  }

  switch (subcommand) {
    case "list": {
      const functions = await listProjectCloudFunctions(projectPath);
      process.stdout.write(args.includes("--json") ? `${JSON.stringify(functions, null, 2)}\n` : formatCloudFunctions(functions));
      break;
    }
    case "envs": {
      await writeCloudCommandResult(
        await listCloudEnvironments({
          projectPath,
          cliPath: readOption(args, "--cli-path"),
        }),
        args,
        "WX-Codex Cloud Environments",
      );
      break;
    }
    case "remote-list": {
      const envId = requireOption(args, "--env", "Missing required option: --env <env-id>");
      if (!envId) {
        return;
      }

      await writeCloudCommandResult(
        await listRemoteCloudFunctions({
          projectPath,
          envId,
          cliPath: readOption(args, "--cli-path"),
        }),
        args,
        "WX-Codex Remote Cloud Functions",
      );
      break;
    }
    case "info": {
      const envId = requireOption(args, "--env", "Missing required option: --env <env-id>");
      const names = readVariadicOption(args, "--names");
      if (!envId || names.length === 0) {
        if (names.length === 0) {
          process.stderr.write("Missing required option: --names <name...>\n");
          process.exitCode = 1;
        }
        return;
      }

      await writeCloudCommandResult(
        await getRemoteCloudFunctionInfo({
          projectPath,
          envId,
          names,
          cliPath: readOption(args, "--cli-path"),
        }),
        args,
        "WX-Codex Cloud Function Info",
      );
      break;
    }
    case "deploy": {
      const envId = requireOption(args, "--env", "Missing required option: --env <env-id>");
      const names = readVariadicOption(args, "--names");
      if (!envId || names.length === 0) {
        if (names.length === 0) {
          process.stderr.write("Missing required option: --names <name...>\n");
          process.exitCode = 1;
        }
        return;
      }

      await writeCloudCommandResult(
        await deployCloudFunctions({
          projectPath,
          envId,
          names,
          remoteNpmInstall: args.includes("--remote-npm-install"),
          cliPath: readOption(args, "--cli-path"),
        }),
        args,
        "WX-Codex Deploy Cloud Functions",
      );
      break;
    }
    default:
      process.stderr.write("Missing or unknown cloud subcommand. Use list, envs, remote-list, info, or deploy.\n");
      process.exitCode = 1;
  }
}

async function runOpenCommand(args: string[]): Promise<void> {
  const projectPath = readOption(args, "--project");
  const json = args.includes("--json");

  if (!projectPath) {
    process.stderr.write("Missing required option: --project <path>\n");
    process.exitCode = 1;
    return;
  }

  const result = await openProject({
    projectPath,
    cliPath: readOption(args, "--cli-path"),
  });

  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(
      formatCommandResult("WX-Codex Open", result, {
        successMessage: "Project opened in WeChat DevTools.",
        failureMessage: "Open failed.",
        verbose: args.includes("--verbose"),
      }),
    );
  }

  process.exitCode = result.summary?.ok ? 0 : 1;
}

async function runDoctorCommand(args: string[]): Promise<void> {
  const json = args.includes("--json");
  const report = await runDoctor({
    projectPath: readOption(args, "--project"),
    cliPath: readOption(args, "--cli-path"),
    probeIde: args.includes("--probe-ide"),
  });

  process.stdout.write(`${json ? JSON.stringify(report, null, 2) : formatDoctorReport(report)}\n`);
  process.exitCode = report.ok ? 0 : 1;
}

async function runDetectCommand(args: string[]): Promise<void> {
  const detection = await detectDevTools(readOption(args, "--cli-path"));
  process.stdout.write(`${JSON.stringify(detection, null, 2)}\n`);
  process.exitCode = detection.found ? 0 : 1;
}

async function runPreviewCommand(args: string[]): Promise<void> {
  const projectPath = readOption(args, "--project");
  const json = args.includes("--json");

  if (!projectPath) {
    process.stderr.write("Missing required option: --project <path>\n");
    process.exitCode = 1;
    return;
  }

  const result = await previewProject({
    projectPath,
    cliPath: readOption(args, "--cli-path"),
    qrFormat: readQrFormat(args),
    qrOutput: readOption(args, "--qr-output"),
    infoOutput: readOption(args, "--info-output"),
  });

  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(
      formatCommandResult("WX-Codex Preview", result, {
        successMessage: "Preview succeeded.",
        failureMessage: "Preview failed.",
        verbose: args.includes("--verbose"),
      }),
    );
  }

  process.exitCode = result.summary?.ok ? 0 : 1;
}

function readQrFormat(args: string[]): "terminal" | "image" | "base64" {
  const value = readOption(args, "--qr-format");
  if (value === "terminal" || value === "image" || value === "base64") {
    return value;
  }

  return "image";
}

function formatCommandResult(
  title: string,
  result: CommandResult,
  options: {
    failureMessage: string;
    successMessage: string;
    verbose?: boolean;
  },
): string {
  const lines = [title, ""];
  const summary = result.summary;

  if (summary?.ok) {
    lines.push(`[OK] ${options.successMessage}`);
  } else {
    lines.push(`[FAIL] ${options.failureMessage}`);
  }

  if (summary?.errorType) {
    lines.push(`Error: ${summary.errorType}`);
  }

  if (summary?.message) {
    lines.push(summary.message);
  }

  const output = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n");
  if (output) {
    lines.push("");
    if (options.verbose) {
      lines.push("CLI output:");
      lines.push(output);
    } else {
      lines.push("Run with --verbose or --json to inspect full WeChat DevTools CLI output.");
    }
  }

  lines.push("");
  return lines.join("\n");
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function readVariadicOption(args: string[], name: string): string[] {
  const index = args.indexOf(name);
  if (index === -1) {
    return [];
  }

  const values: string[] = [];
  for (const value of args.slice(index + 1)) {
    if (value.startsWith("--")) {
      break;
    }
    values.push(value);
  }

  return values;
}

function requireOption(args: string[], name: string, message: string): string | undefined {
  const value = readOption(args, name);
  if (!value) {
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }

  return value;
}

function requireProjectPath(args: string[]): string | undefined {
  const projectPath = readOption(args, "--project");
  if (!projectPath) {
    process.stderr.write("Missing required option: --project <path>\n");
    process.exitCode = 1;
    return undefined;
  }

  return projectPath;
}

async function writeCloudCommandResult(result: CommandResult, args: string[], title: string): Promise<void> {
  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(
      formatCommandResult(title, result, {
        successMessage: "Command succeeded.",
        failureMessage: "Command failed.",
        verbose: args.includes("--verbose"),
      }),
    );
  }

  process.exitCode = result.summary?.ok ? 0 : 1;
}
