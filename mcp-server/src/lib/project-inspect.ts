import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { readProjectConfig } from "./project-config.js";

type AppConfig = {
  pages?: string[];
  subpackages?: Array<{
    root?: string;
    pages?: string[];
  }>;
  subPackages?: Array<{
    root?: string;
    pages?: string[];
  }>;
  usingComponents?: Record<string, string>;
  tabBar?: {
    list?: Array<{
      pagePath?: string;
      text?: string;
    }>;
  };
  [key: string]: unknown;
};

type PageInfo = {
  path: string;
  files: {
    js: boolean;
    json: boolean;
    wxml: boolean;
    wxss: boolean;
  };
  usingComponents: Record<string, string>;
};

type ComponentInfo = {
  name: string;
  path: string;
  source: "declared" | "directory";
  files: {
    js: boolean;
    json: boolean;
    wxml: boolean;
    wxss: boolean;
  };
};

type CloudFunctionInfo = {
  name: string;
  path: string;
  entry: string | null;
  hasPackageJson: boolean;
  dependencies: string[];
};

export type ProjectInspection = {
  projectPath: string;
  projectName?: string;
  appid?: string;
  miniprogramRoot: string;
  miniprogramPath: string;
  appConfigPath: string;
  cloudfunctionRoot?: string;
  cloudfunctionPath?: string;
  pages: PageInfo[];
  components: ComponentInfo[];
  cloudFunctions: CloudFunctionInfo[];
  warnings: string[];
};

export async function inspectProject(projectPath: string): Promise<ProjectInspection> {
  const absoluteProjectPath = path.resolve(projectPath);
  const { config } = await readProjectConfig(absoluteProjectPath);
  const miniprogramRoot = normalizeRoot(config.miniprogramRoot ?? "miniprogram");
  const miniprogramPath = path.join(absoluteProjectPath, miniprogramRoot);
  const appConfigPath = path.join(miniprogramPath, "app.json");
  const warnings: string[] = [];

  if (!existsSync(miniprogramPath)) {
    warnings.push(`Mini program root not found: ${miniprogramPath}`);
  }

  const appConfig = existsSync(appConfigPath) ? await readJsonFile<AppConfig>(appConfigPath) : {};
  if (!existsSync(appConfigPath)) {
    warnings.push(`Missing app.json: ${appConfigPath}`);
  }

  const pages = await listPagesFromAppConfig(miniprogramPath, appConfig, warnings);
  const components = await listComponents(miniprogramPath, appConfig, pages);

  const cloudfunctionRoot = config.cloudfunctionRoot ? normalizeRoot(config.cloudfunctionRoot) : undefined;
  const cloudfunctionPath = cloudfunctionRoot ? path.join(absoluteProjectPath, cloudfunctionRoot) : undefined;
  const cloudFunctions = cloudfunctionPath ? await listCloudFunctionsFromRoot(cloudfunctionPath, warnings) : [];

  if (cloudfunctionRoot && cloudfunctionPath && !existsSync(cloudfunctionPath)) {
    warnings.push(`Cloud function root configured but not found: ${cloudfunctionPath}`);
  }

  return {
    projectPath: absoluteProjectPath,
    projectName: config.projectname,
    appid: config.appid,
    miniprogramRoot,
    miniprogramPath,
    appConfigPath,
    cloudfunctionRoot,
    cloudfunctionPath,
    pages,
    components,
    cloudFunctions,
    warnings,
  };
}

export async function listProjectPages(projectPath: string): Promise<PageInfo[]> {
  return (await inspectProject(projectPath)).pages;
}

export async function listProjectComponents(projectPath: string): Promise<ComponentInfo[]> {
  return (await inspectProject(projectPath)).components;
}

export async function listProjectCloudFunctions(projectPath: string): Promise<CloudFunctionInfo[]> {
  return (await inspectProject(projectPath)).cloudFunctions;
}

export function formatProjectInspection(inspection: ProjectInspection): string {
  const lines = ["WX-Codex Project Inspect", ""];
  lines.push(`Project: ${inspection.projectName ?? "unnamed"}`);
  lines.push(`Path: ${inspection.projectPath}`);
  lines.push(`AppID: ${inspection.appid ?? "missing"}`);
  lines.push(`Mini program root: ${inspection.miniprogramRoot}`);
  lines.push(`Pages: ${inspection.pages.length}`);
  lines.push(`Components: ${inspection.components.length}`);
  lines.push(`Cloud functions: ${inspection.cloudFunctions.length}`);

  if (inspection.cloudfunctionRoot) {
    lines.push(`Cloud function root: ${inspection.cloudfunctionRoot}`);
  }

  if (inspection.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const warning of inspection.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  lines.push("");
  lines.push("Use --json for full structured details.");
  return lines.join("\n");
}

export function formatPages(pages: PageInfo[]): string {
  const lines = ["WX-Codex Pages", ""];
  if (pages.length === 0) {
    lines.push("No pages found.");
    return `${lines.join("\n")}\n`;
  }

  for (const page of pages) {
    const missing = missingPageFiles(page.files);
    lines.push(`- ${page.path}${missing.length > 0 ? ` (missing: ${missing.join(", ")})` : ""}`);
  }

  return `${lines.join("\n")}\n`;
}

export function formatComponents(components: ComponentInfo[]): string {
  const lines = ["WX-Codex Components", ""];
  if (components.length === 0) {
    lines.push("No custom components found.");
    return `${lines.join("\n")}\n`;
  }

  for (const component of components) {
    const missing = missingPageFiles(component.files);
    lines.push(`- ${component.name}: ${component.path} [${component.source}]${missing.length > 0 ? ` (missing: ${missing.join(", ")})` : ""}`);
  }

  return `${lines.join("\n")}\n`;
}

export function formatCloudFunctions(functions: CloudFunctionInfo[]): string {
  const lines = ["WX-Codex Cloud Functions", ""];
  if (functions.length === 0) {
    lines.push("No cloud functions found.");
    return `${lines.join("\n")}\n`;
  }

  for (const fn of functions) {
    lines.push(`- ${fn.name}`);
    lines.push(`  path: ${fn.path}`);
    lines.push(`  entry: ${fn.entry ?? "missing"}`);
    lines.push(`  dependencies: ${fn.dependencies.length > 0 ? fn.dependencies.join(", ") : "none"}`);
  }

  return `${lines.join("\n")}\n`;
}

async function listPagesFromAppConfig(miniprogramPath: string, appConfig: AppConfig, warnings: string[]): Promise<PageInfo[]> {
  const pagePaths = new Set<string>();
  for (const page of appConfig.pages ?? []) {
    pagePaths.add(page);
  }

  for (const subpackage of [...(appConfig.subpackages ?? []), ...(appConfig.subPackages ?? [])]) {
    const root = trimSlashes(subpackage.root ?? "");
    for (const page of subpackage.pages ?? []) {
      pagePaths.add([root, trimSlashes(page)].filter(Boolean).join("/"));
    }
  }

  if (pagePaths.size === 0) {
    warnings.push("No pages declared in app.json.");
  }

  const pages: PageInfo[] = [];
  for (const pagePath of pagePaths) {
    const pageJsonPath = path.join(miniprogramPath, `${pagePath}.json`);
    const pageConfig = existsSync(pageJsonPath) ? await readJsonFile<AppConfig>(pageJsonPath) : {};
    pages.push({
      path: pagePath,
      files: fileSet(miniprogramPath, pagePath),
      usingComponents: pageConfig.usingComponents ?? {},
    });
  }

  return pages;
}

async function listComponents(miniprogramPath: string, appConfig: AppConfig, pages: PageInfo[]): Promise<ComponentInfo[]> {
  const declared = new Map<string, string>();
  for (const [name, componentPath] of Object.entries(appConfig.usingComponents ?? {})) {
    declared.set(name, componentPath);
  }

  for (const page of pages) {
    for (const [name, componentPath] of Object.entries(page.usingComponents)) {
      declared.set(name, componentPath);
    }
  }

  const components: ComponentInfo[] = [];
  for (const [name, componentPath] of declared) {
    const normalized = normalizeComponentPath(componentPath);
    components.push({
      name,
      path: normalized,
      source: "declared",
      files: fileSet(miniprogramPath, normalized),
    });
  }

  const componentRoot = path.join(miniprogramPath, "components");
  if (existsSync(componentRoot)) {
    for (const componentPath of await discoverComponentPaths(miniprogramPath, componentRoot)) {
      if (!components.some((component) => component.path === componentPath)) {
        components.push({
          name: componentNameFromPath(componentPath),
          path: componentPath,
          source: "directory",
          files: fileSet(miniprogramPath, componentPath),
        });
      }
    }
  }

  return components;
}

async function discoverComponentPaths(miniprogramPath: string, componentRoot: string): Promise<string[]> {
  const jsonFiles = await listJsonFiles(componentRoot);
  const componentPaths: string[] = [];

  for (const jsonFile of jsonFiles) {
    const config = await readJsonFile<{ component?: boolean }>(jsonFile);
    if (config.component) {
      componentPaths.push(trimSlashes(path.relative(miniprogramPath, jsonFile).replace(/\.json$/, "")));
    }
  }

  return componentPaths.sort((a, b) => a.localeCompare(b));
}

async function listCloudFunctionsFromRoot(cloudfunctionPath: string, warnings: string[]): Promise<CloudFunctionInfo[]> {
  if (!existsSync(cloudfunctionPath)) {
    return [];
  }

  const functions: CloudFunctionInfo[] = [];
  for (const name of await listDirectories(cloudfunctionPath)) {
    const functionPath = path.join(cloudfunctionPath, name);
    const packageJsonPath = path.join(functionPath, "package.json");
    const packageJson = existsSync(packageJsonPath)
      ? await readJsonFile<{ main?: string; dependencies?: Record<string, string> }>(packageJsonPath)
      : undefined;
    const entryName = packageJson?.main ?? "index.js";
    const entryPath = path.join(functionPath, entryName);

    if (!existsSync(entryPath)) {
      warnings.push(`Cloud function ${name} is missing entry file: ${entryPath}`);
    }

    functions.push({
      name,
      path: functionPath,
      entry: existsSync(entryPath) ? entryPath : null,
      hasPackageJson: existsSync(packageJsonPath),
      dependencies: Object.keys(packageJson?.dependencies ?? {}),
    });
  }

  return functions;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, "")) as T;
}

function fileSet(root: string, basePath: string): PageInfo["files"] {
  return {
    js: existsSync(path.join(root, `${basePath}.js`)),
    json: existsSync(path.join(root, `${basePath}.json`)),
    wxml: existsSync(path.join(root, `${basePath}.wxml`)),
    wxss: existsSync(path.join(root, `${basePath}.wxss`)),
  };
}

function missingPageFiles(files: PageInfo["files"]): string[] {
  return Object.entries(files)
    .filter(([, exists]) => !exists)
    .map(([extension]) => extension);
}

async function listDirectories(root: string): Promise<string[]> {
  const entries = await readdir(root);
  const directories: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry);
    if ((await stat(entryPath)).isDirectory()) {
      directories.push(entry);
    }
  }

  return directories.sort((a, b) => a.localeCompare(b));
}

async function listJsonFiles(root: string): Promise<string[]> {
  const entries = await readdir(root);
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry);
    const entryStat = await stat(entryPath);
    if (entryStat.isDirectory()) {
      files.push(...(await listJsonFiles(entryPath)));
    } else if (entryPath.endsWith(".json")) {
      files.push(entryPath);
    }
  }

  return files;
}

function normalizeRoot(root: string): string {
  return trimSlashes(root) || ".";
}

function normalizeComponentPath(componentPath: string): string {
  return trimSlashes(componentPath).replace(/^miniprogram\//, "").replace(/\.(js|json|wxml|wxss)$/, "");
}

function componentNameFromPath(componentPath: string): string {
  const parts = trimSlashes(componentPath).split("/");
  const last = parts.at(-1);
  return last === "index" ? (parts.at(-2) ?? last) : (last ?? componentPath);
}

function trimSlashes(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}
