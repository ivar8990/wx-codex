#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { deployCloudFunctions, getRemoteCloudFunctionInfo, listCloudEnvironments, listRemoteCloudFunctions } from "./lib/cloudbase.js";
import { detectDevTools, openProject, previewProject } from "./lib/devtools.js";
import { runDoctor } from "./lib/doctor.js";
import { jsonText } from "./lib/mcp-response.js";
import { createCloudFunction, createComponent, createPage } from "./lib/project-generate.js";
import { inspectProject, listProjectCloudFunctions, listProjectComponents, listProjectPages } from "./lib/project-inspect.js";
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
  "inspect_project",
  "Inspect a WeChat mini program project structure, including pages, components, cloud functions, and common warnings.",
  {
    projectPath: z.string().describe("Absolute path to the mini program project root."),
  },
  async ({ projectPath }) => jsonText(await inspectProject(projectPath)),
);

server.tool(
  "list_pages",
  "List pages declared by a WeChat mini program app.json file.",
  {
    projectPath: z.string().describe("Absolute path to the mini program project root."),
  },
  async ({ projectPath }) => jsonText(await listProjectPages(projectPath)),
);

server.tool(
  "list_components",
  "List custom components declared or discovered in a WeChat mini program project.",
  {
    projectPath: z.string().describe("Absolute path to the mini program project root."),
  },
  async ({ projectPath }) => jsonText(await listProjectComponents(projectPath)),
);

server.tool(
  "list_cloud_functions",
  "List cloud functions in a WeChat Cloud Development mini program project.",
  {
    projectPath: z.string().describe("Absolute path to the mini program project root."),
  },
  async ({ projectPath }) => jsonText(await listProjectCloudFunctions(projectPath)),
);

server.tool(
  "create_page",
  "Create a WeChat mini program page file set and add it to app.json.",
  {
    projectPath: z.string().describe("Absolute path to the mini program project root."),
    pagePath: z.string().describe("Project-relative page path, for example pages/profile/index."),
    title: z.string().optional().describe("Optional navigation bar title and starter page title."),
  },
  async (params) => jsonText(await createPage(params)),
);

server.tool(
  "create_component",
  "Create a WeChat mini program custom component file set.",
  {
    projectPath: z.string().describe("Absolute path to the mini program project root."),
    componentPath: z.string().describe("Project-relative component path, for example components/user-card/index."),
  },
  async (params) => jsonText(await createComponent(params)),
);

server.tool(
  "create_cloud_function",
  "Create a WeChat Cloud Development cloud function template.",
  {
    projectPath: z.string().describe("Absolute path to the mini program project root."),
    functionName: z.string().describe("Cloud function directory name."),
  },
  async (params) => jsonText(await createCloudFunction(params)),
);

server.tool(
  "list_cloud_environments",
  "List WeChat Cloud Development environments through the local WeChat DevTools CLI.",
  {
    projectPath: z.string().describe("Absolute path to the mini program project root."),
    cliPath: z.string().optional().describe("Optional explicit WeChat DevTools CLI path."),
    timeoutMs: z.number().int().positive().optional().describe("Command timeout in milliseconds."),
  },
  async (params) => jsonText(await listCloudEnvironments(params)),
);

server.tool(
  "list_remote_cloud_functions",
  "List deployed cloud functions in a WeChat Cloud Development environment.",
  {
    projectPath: z.string().describe("Absolute path to the mini program project root."),
    envId: z.string().describe("WeChat Cloud Development environment ID."),
    cliPath: z.string().optional().describe("Optional explicit WeChat DevTools CLI path."),
    timeoutMs: z.number().int().positive().optional().describe("Command timeout in milliseconds."),
  },
  async (params) => jsonText(await listRemoteCloudFunctions(params)),
);

server.tool(
  "get_remote_cloud_function_info",
  "Get deployed cloud function information from a WeChat Cloud Development environment.",
  {
    projectPath: z.string().describe("Absolute path to the mini program project root."),
    envId: z.string().describe("WeChat Cloud Development environment ID."),
    names: z.array(z.string()).min(1).describe("Cloud function names."),
    cliPath: z.string().optional().describe("Optional explicit WeChat DevTools CLI path."),
    timeoutMs: z.number().int().positive().optional().describe("Command timeout in milliseconds."),
  },
  async (params) => jsonText(await getRemoteCloudFunctionInfo(params)),
);

server.tool(
  "deploy_cloud_functions",
  "Deploy explicitly named cloud functions to a WeChat Cloud Development environment through WeChat DevTools CLI.",
  {
    projectPath: z.string().describe("Absolute path to the mini program project root."),
    envId: z.string().describe("WeChat Cloud Development environment ID."),
    names: z.array(z.string()).min(1).describe("Cloud function names to deploy."),
    remoteNpmInstall: z.boolean().optional().describe("Install npm dependencies in the cloud instead of uploading local node_modules."),
    cliPath: z.string().optional().describe("Optional explicit WeChat DevTools CLI path."),
    timeoutMs: z.number().int().positive().optional().describe("Command timeout in milliseconds."),
  },
  async (params) => jsonText(await deployCloudFunctions(params)),
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
