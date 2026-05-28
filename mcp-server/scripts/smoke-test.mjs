import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "mcp-server", "dist", "cli", "main.js");
const sourceDemo = path.join(repoRoot, "examples", "demo-miniprogram");
const testRoot = await mkdtemp(path.join(tmpdir(), "wx-codex-smoke-"));
const testProject = path.join(testRoot, "demo-miniprogram");

try {
  await cp(sourceDemo, testProject, { recursive: true });

  await runCli("inspect", "--project", testProject);
  const before = JSON.parse(await runCli("inspect", "--project", testProject, "--json"));
  await runCli("pages", "--project", testProject);
  await runCli("components", "--project", testProject);
  await runCli("cloud", "list", "--project", testProject);
  await runCli("create", "page", "--project", testProject, "--path", "pages/profile/index", "--title", "Profile");
  await runCli("create", "component", "--project", testProject, "--path", "components/user-card/index");
  await runCli("create", "cloud-function", "--project", testProject, "--name", "getOpenId");

  const inspect = JSON.parse(await runCli("inspect", "--project", testProject, "--json"));
  assertEqual(inspect.pages.length, before.pages.length + 1, "expected smoke project to add one page");
  assertEqual(inspect.components.length, before.components.length + 1, "expected smoke project to add one component");
  assertEqual(inspect.cloudFunctions.length, before.cloudFunctions.length + 1, "expected smoke project to add one cloud function");

  const appJson = JSON.parse(await readFile(path.join(testProject, "miniprogram", "app.json"), "utf8"));
  if (!appJson.pages.includes("pages/profile/index")) {
    throw new Error("created page was not added to app.json");
  }

  console.log("WX-Codex smoke test passed.");
} finally {
  await rm(testRoot, { recursive: true, force: true });
}

async function runCli(...args) {
  const { stdout } = await execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    windowsHide: true,
  });
  return stdout;
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: got ${actual}, expected ${expected}`);
  }
}
