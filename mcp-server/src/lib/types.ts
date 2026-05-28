export type CommandResult = {
  command: string;
  args: string[];
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  summary?: {
    ok: boolean;
    errorType?: string;
    message?: string;
  };
};

export type DevToolsDetection = {
  found: boolean;
  cliPath?: string;
  source?: string;
  candidates: Array<{
    path: string;
    exists: boolean;
    executable: boolean;
  }>;
};
