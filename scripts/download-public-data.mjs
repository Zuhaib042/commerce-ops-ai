import { createWriteStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AdmZip = require("adm-zip");

const RAW_DIR = join(process.cwd(), "data", "raw");
const ZIP_PATH = join(RAW_DIR, "online-retail.zip");
const EXTRACT_DIR = join(RAW_DIR, "online-retail");
const DATASET_URL = "https://archive.ics.uci.edu/static/public/352/online+retail.zip";

mkdirSync(RAW_DIR, { recursive: true });
mkdirSync(EXTRACT_DIR, { recursive: true });

const force = process.argv.includes("--force");

if (!existsSync(ZIP_PATH) || force) {
  console.log(`Downloading UCI Online Retail dataset from ${DATASET_URL}`);
  const response = await fetch(DATASET_URL);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download dataset: ${response.status} ${response.statusText}`);
  }
  await pipeline(response.body, createWriteStream(ZIP_PATH));
} else {
  console.log(`Using existing dataset archive at ${ZIP_PATH}`);
}

const zip = new AdmZip(ZIP_PATH);
zip.extractAllTo(EXTRACT_DIR, true);

writeFileSync(
  join(RAW_DIR, "SOURCES.md"),
  [
    "# Raw Data Sources",
    "",
    "## UCI Online Retail",
    "",
    "- Dataset page: https://archive.ics.uci.edu/dataset/352/online+retail",
    "- Download URL: https://archive.ics.uci.edu/static/public/352/online+retail.zip",
    "- License: CC BY 4.0",
    "- Local archive: `data/raw/online-retail.zip`",
    "- Extracted folder: `data/raw/online-retail`",
    "",
  ].join("\n"),
  "utf8",
);

console.log(`Dataset extracted to ${EXTRACT_DIR}`);

