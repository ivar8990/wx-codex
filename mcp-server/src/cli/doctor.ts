#!/usr/bin/env node
import { formatDoctorReport, runDoctor } from "../lib/doctor.js";

const args = process.argv.slice(2);
const projectPath = readOption(args, "--project");
const cliPath = readOption(args, "--cli-path");
const json = args.includes("--json");
const probeIde = args.includes("--probe-ide");

const report = await runDoctor({
  projectPath,
  cliPath,
  probeIde,
});

process.stdout.write(`${json ? JSON.stringify(report, null, 2) : formatDoctorReport(report)}\n`);
process.exitCode = report.ok ? 0 : 1;

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}
