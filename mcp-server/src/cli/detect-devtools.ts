#!/usr/bin/env node
import { detectDevTools } from "../lib/devtools.js";

const explicitCliPath = process.argv[2];
const detection = await detectDevTools(explicitCliPath);

process.stdout.write(`${JSON.stringify(detection, null, 2)}\n`);
