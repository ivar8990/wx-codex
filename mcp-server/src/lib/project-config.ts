import { readFile } from "node:fs/promises";
import path from "node:path";

export type MiniProgramProjectConfig = {
  appid?: string;
  projectname?: string;
  miniprogramRoot?: string;
  cloudfunctionRoot?: string;
  compileType?: string;
  setting?: Record<string, unknown>;
  [key: string]: unknown;
};

export async function readProjectConfig(projectPath: string): Promise<{
  projectPath: string;
  configPath: string;
  config: MiniProgramProjectConfig;
}> {
  const configPath = path.join(projectPath, "project.config.json");
  const raw = await readFile(configPath, "utf8");
  const normalized = raw.replace(/^\uFEFF/, "");
  const config = JSON.parse(normalized) as MiniProgramProjectConfig;

  return {
    projectPath,
    configPath,
    config,
  };
}
