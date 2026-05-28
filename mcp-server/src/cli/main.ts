#!/usr/bin/env node
import type { CommandResult } from "../lib/types.js";
import { detectDevTools, openProject, previewProject } from "../lib/devtools.js";
import { formatDoctorReport, runDoctor } from "../lib/doctor.js";

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
  wx-codex open --project <path> [--cli-path <path>] [--json] [--verbose]
  wx-codex preview --project <path> [--qr-format image|terminal|base64] [--qr-output <path>] [--info-output <path>] [--cli-path <path>] [--json] [--verbose]

Commands:
  server            Start the MCP server over stdio.
  doctor            Check the local environment.
  detect            Detect the WeChat DevTools CLI.
  open              Open a mini program project in WeChat DevTools.
  preview           Trigger a WeChat DevTools preview build.
  help              Show this help message.
`);
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
