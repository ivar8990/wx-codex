import { spawn } from "node:child_process";

import type { CommandResult } from "./types.js";

export function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; timeoutMs?: number } = {},
): Promise<CommandResult> {
  const timeoutMs = options.timeoutMs ?? 120_000;
  const useShell = process.platform === "win32" && /\.(bat|cmd)$/i.test(command);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      shell: useShell,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      resolve({
        command,
        args,
        exitCode,
        signal,
        stdout,
        stderr,
        timedOut,
      });
    });
  });
}
