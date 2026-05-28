import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { readProjectConfig } from "./project-config.js";

type AppConfig = {
  pages?: string[];
  usingComponents?: Record<string, string>;
  [key: string]: unknown;
};

export type GeneratedFile = {
  path: string;
  action: "created" | "updated" | "skipped";
};

export type GenerateResult = {
  projectPath: string;
  kind: "page" | "component" | "cloud_function";
  name: string;
  files: GeneratedFile[];
  warnings: string[];
};

export async function createPage(options: { projectPath: string; pagePath: string; title?: string }): Promise<GenerateResult> {
  const context = await readProjectContext(options.projectPath);
  const normalizedPagePath = normalizeRelativePath(options.pagePath);
  const title = options.title ?? titleFromPath(normalizedPagePath);
  const files: GeneratedFile[] = [];
  const warnings: string[] = [];

  files.push(await writeNewFile(path.join(context.miniprogramPath, `${normalizedPagePath}.wxml`), `<view class="page">\n  <view class="title">{{title}}</view>\n</view>\n`));
  files.push(
    await writeNewFile(
      path.join(context.miniprogramPath, `${normalizedPagePath}.wxss`),
      ".page {\n  min-height: 100vh;\n  padding: 48rpx 32rpx;\n  background: #f8fafc;\n  color: #111827;\n}\n\n.title {\n  font-size: 40rpx;\n  font-weight: 600;\n}\n",
    ),
  );
  files.push(await writeNewFile(path.join(context.miniprogramPath, `${normalizedPagePath}.js`), `Page({\n  data: {\n    title: ${JSON.stringify(title)},\n  },\n});\n`));
  files.push(
    await writeNewFile(
      path.join(context.miniprogramPath, `${normalizedPagePath}.json`),
      `${JSON.stringify({ navigationBarTitleText: title }, null, 2)}\n`,
    ),
  );

  const appConfig = await readJsonFile<AppConfig>(context.appConfigPath);
  const pages = appConfig.pages ?? [];
  if (!pages.includes(normalizedPagePath)) {
    appConfig.pages = [...pages, normalizedPagePath];
    await writeJsonFile(context.appConfigPath, appConfig);
    files.push({ path: context.appConfigPath, action: "updated" });
  } else {
    files.push({ path: context.appConfigPath, action: "skipped" });
    warnings.push(`Page is already declared in app.json: ${normalizedPagePath}`);
  }

  return {
    projectPath: context.projectPath,
    kind: "page",
    name: normalizedPagePath,
    files,
    warnings,
  };
}

export async function createComponent(options: { projectPath: string; componentPath: string }): Promise<GenerateResult> {
  const context = await readProjectContext(options.projectPath);
  const normalizedComponentPath = normalizeRelativePath(options.componentPath);
  const componentName = path.posix.basename(normalizedComponentPath);
  const files: GeneratedFile[] = [];

  files.push(await writeNewFile(path.join(context.miniprogramPath, `${normalizedComponentPath}.wxml`), `<view class="${componentName}">\n  <slot></slot>\n</view>\n`));
  files.push(
    await writeNewFile(
      path.join(context.miniprogramPath, `${normalizedComponentPath}.wxss`),
      `.${componentName} {\n  display: block;\n}\n`,
    ),
  );
  files.push(await writeNewFile(path.join(context.miniprogramPath, `${normalizedComponentPath}.js`), "Component({\n  properties: {},\n  data: {},\n  methods: {},\n});\n"));
  files.push(await writeNewFile(path.join(context.miniprogramPath, `${normalizedComponentPath}.json`), `${JSON.stringify({ component: true }, null, 2)}\n`));

  return {
    projectPath: context.projectPath,
    kind: "component",
    name: normalizedComponentPath,
    files,
    warnings: [],
  };
}

export async function createCloudFunction(options: { projectPath: string; functionName: string }): Promise<GenerateResult> {
  const context = await readProjectContext(options.projectPath);
  const functionName = normalizeName(options.functionName);
  const files: GeneratedFile[] = [];
  const warnings: string[] = [];

  if (!context.cloudfunctionPath) {
    warnings.push("project.config.json does not define cloudfunctionRoot. Using cloudfunctions/ for the generated template.");
  }

  const cloudRoot = context.cloudfunctionPath ?? path.join(context.projectPath, "cloudfunctions");
  const functionPath = path.join(cloudRoot, functionName);
  files.push(
    await writeNewFile(
      path.join(functionPath, "index.js"),
      'const cloud = require("wx-server-sdk");\n\ncloud.init({\n  env: cloud.DYNAMIC_CURRENT_ENV,\n});\n\nexports.main = async (event) => ({\n  event,\n  message: "Hello from WX-Codex.",\n});\n',
    ),
  );
  files.push(
    await writeNewFile(
      path.join(functionPath, "package.json"),
      `${JSON.stringify(
        {
          name: functionName,
          version: "1.0.0",
          main: "index.js",
          dependencies: {
            "wx-server-sdk": "latest",
          },
        },
        null,
        2,
      )}\n`,
    ),
  );

  return {
    projectPath: context.projectPath,
    kind: "cloud_function",
    name: functionName,
    files,
    warnings,
  };
}

export function formatGenerateResult(result: GenerateResult): string {
  const lines = [`WX-Codex Create ${result.kind.replace("_", " ")}`, ""];
  lines.push(`Name: ${result.name}`);
  lines.push("");
  lines.push("Files:");
  for (const file of result.files) {
    lines.push(`- [${file.action}] ${file.path}`);
  }

  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const warning of result.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

async function readProjectContext(projectPath: string): Promise<{
  projectPath: string;
  miniprogramPath: string;
  appConfigPath: string;
  cloudfunctionPath?: string;
}> {
  const absoluteProjectPath = path.resolve(projectPath);
  const { config } = await readProjectConfig(absoluteProjectPath);
  const miniprogramRoot = normalizeRelativePath(config.miniprogramRoot ?? "miniprogram");
  const cloudfunctionRoot = config.cloudfunctionRoot ? normalizeRelativePath(config.cloudfunctionRoot) : undefined;
  const miniprogramPath = path.join(absoluteProjectPath, miniprogramRoot);
  const appConfigPath = path.join(miniprogramPath, "app.json");

  if (!existsSync(appConfigPath)) {
    throw new Error(`Missing app.json: ${appConfigPath}`);
  }

  return {
    projectPath: absoluteProjectPath,
    miniprogramPath,
    appConfigPath,
    cloudfunctionPath: cloudfunctionRoot ? path.join(absoluteProjectPath, cloudfunctionRoot) : undefined,
  };
}

async function writeNewFile(filePath: string, content: string): Promise<GeneratedFile> {
  if (existsSync(filePath)) {
    return { path: filePath, action: "skipped" };
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  return { path: filePath, action: "created" };
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, "")) as T;
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeRelativePath(value: string): string {
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
  if (!normalized || normalized.includes("..")) {
    throw new Error(`Invalid project-relative path: ${value}`);
  }

  return normalized;
}

function normalizeName(value: string): string {
  const normalized = normalizeRelativePath(value);
  if (normalized.includes("/")) {
    throw new Error(`Expected a single name, got path: ${value}`);
  }

  return normalized;
}

function titleFromPath(pagePath: string): string {
  return pagePath
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? "Page";
}
