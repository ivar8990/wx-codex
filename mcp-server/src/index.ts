#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { detectDevTools, openProject, previewProject } from "./lib/devtools.js";
import { runDoctor } from "./lib/doctor.js";
import { jsonText } from "./lib/mcp-response.js";
import { readProjectConfig } from "./lib/project-config.js";

const server = new McpServer({
  name: "wx-codex",
  version: "0.1.0",
});

server.tool(
  "doctor",
  "Check the local WX-Codex environment.",
  {
    projectPath: z.string().optional().describe("Optional mini program project root. Defaults to examples/demo-miniprogram."),
    cliPath: z.string().optional().describe("Optional explicit WeChat DevTools CLI path."),
    probeIde: z
      .boolean()
      .optional()
      .describe("Optionally run WeChat DevTools CLI islogin to check service port and login state."),
  },
  async (params) => jsonText(await runDoctor(params)),
);

server.tool(
  "detect_devtools",
  "Detect the local WeChat DevTools CLI path.",
  {
    cliPath: z.string().optional().describe("Optional explicit WeChat DevTools CLI path."),
  },
  async ({ cliPath }) => jsonText(await detectDevTools(cliPath)),
);

server.tool(
  "read_project_config",
  "Read a WeChat mini program project.config.json file.",
  {
    projectPath: z.string().describe("Absolute path to the mini program project root."),
  },
  async ({ projectPath }) => jsonText(await readProjectConfig(projectPath)),
);

server.tool(
  "open_project",
  "Open a WeChat mini program project in WeChat DevTools.",
  {
    projectPath: z.string().describe("Absolute path to the mini program project root."),
    cliPath: z.string().optional().describe("Optional explicit WeChat DevTools CLI path."),
    timeoutMs: z.number().int().positive().optional().describe("Command timeout in milliseconds."),
  },
  async (params) => jsonText(await openProject(params)),
);

server.tool(
  "preview_project",
  "Trigger a WeChat DevTools preview build for a mini program project.",
  {
    projectPath: z.string().describe("Absolute path to the mini program project root."),
    cliPath: z.string().optional().describe("Optional explicit WeChat DevTools CLI path."),
    qrFormat: z
      .enum(["terminal", "image", "base64"])
      .optional()
      .describe("Optional QR code output format. Use image with qrOutput to save a scannable file."),
    qrOutput: z.string().optional().describe("Optional path where WeChat DevTools should save preview QR output."),
    infoOutput: z.string().optional().describe("Optional path where WeChat DevTools should save preview information."),
    timeoutMs: z.number().int().positive().optional().describe("Command timeout in milliseconds."),
  },
  async (params) => jsonText(await previewProject(params)),
);

const transport = new StdioServerTransport();
await server.connect(transport);
