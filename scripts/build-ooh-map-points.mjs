#!/usr/bin/env node

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_OPTIONS = {
  inputDir: "data/ooh-demo",
  outputDir: "data/ooh-map",
};

const MEDIA_TYPE_CODES = {
  billboard: "bb",
  bus_shelter: "bs",
  digital_billboard: "db",
  digital_screen: "ds",
  mural: "mu",
  street_furniture: "sf",
  transit: "tr",
};

function printHelp() {
  console.log(`Build compact OOH map point data.

Usage:
  npm run build:ooh-map -- [options]
  node scripts/build-ooh-map-points.mjs [options]

Options:
  --input <path>       Source demo JSON. Defaults to latest data/ooh-demo/*.json.
  --input-dir <path>   Folder to search for latest demo JSON. Default: data/ooh-demo.
  --output-dir <path>  Output folder. Default: data/ooh-map.
  --help               Show this help.
`);
}

function parseArgs(argv) {
  const options = { ...DEFAULT_OPTIONS };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--input") {
      requireValue(arg, next);
      options.input = next;
      i += 1;
    } else if (arg === "--input-dir") {
      requireValue(arg, next);
      options.inputDir = next;
      i += 1;
    } else if (arg === "--output-dir") {
      requireValue(arg, next);
      options.outputDir = next;
      i += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function requireValue(arg, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${arg} requires a value`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const inputPath = options.input
    ? path.resolve(process.cwd(), options.input)
    : await findLatestExport(options.inputDir);
  const source = JSON.parse(await readFile(inputPath, "utf8"));
  const listings = source.listings ?? [];
  const builtAt = new Date().toISOString();
  const sourceUrls = [...new Set(listings.map((listing) => listing.source_url).filter(Boolean))];
  const sourceUrlIndexes = new Map(
    sourceUrls.map((sourceUrl, index) => [sourceUrl, index]),
  );

  const points = listings
    .map((listing) => toMapPoint(listing, sourceUrlIndexes))
    .filter(Boolean)
    .sort((a, b) => a[1] - b[1] || a[2] - b[2]);

  const output = {
    metadata: {
      built_at: builtAt,
      source_input: inputPath,
      count: points.length,
      schema:
        "[id,lng,lat,mediaTypeCode,priceAmount,weeklyImpressions,visibilityScore,sourceUrlIndex]",
      media_type_codes: MEDIA_TYPE_CODES,
      source_url_count: sourceUrls.length,
    },
    source_urls: sourceUrls,
    points,
  };

  const outputDir = path.resolve(process.cwd(), options.outputDir);
  await mkdir(outputDir, { recursive: true });
  await writeFile(
    path.join(outputDir, "ooh-map-points.json"),
    `${JSON.stringify(output)}\n`,
    "utf8",
  );

  console.log(`Built ${points.length} compact map points from ${listings.length} records.`);
}

async function findLatestExport(inputDir) {
  const resolvedDir = path.resolve(process.cwd(), inputDir);
  const files = await readdir(resolvedDir, { withFileTypes: true });
  const jsonFiles = files
    .filter((file) => file.isFile() && /^ooh-demo-.+\.json$/.test(file.name))
    .map((file) => file.name)
    .sort()
    .reverse();

  if (jsonFiles.length === 0) {
    throw new Error(`No demo JSON exports found in ${resolvedDir}`);
  }

  return path.join(resolvedDir, jsonFiles[0]);
}

function toMapPoint(listing, sourceUrlIndexes) {
  if (!Number.isFinite(listing.longitude) || !Number.isFinite(listing.latitude)) {
    return null;
  }

  return [
    listing.id,
    roundCoordinate(listing.longitude),
    roundCoordinate(listing.latitude),
    MEDIA_TYPE_CODES[listing.media_type] ?? "oo",
    Math.round(listing.price_amount ?? 0),
    Math.round(listing.weekly_impressions_estimate ?? 0),
    Math.round((listing.visibility_score ?? 0) * 100),
    listing.source_url ? sourceUrlIndexes.get(listing.source_url) ?? -1 : -1,
  ];
}

function roundCoordinate(value) {
  return Number(value.toFixed(6));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
