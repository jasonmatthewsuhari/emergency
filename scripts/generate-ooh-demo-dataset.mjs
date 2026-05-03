#!/usr/bin/env node

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_OPTIONS = {
  count: 2500,
  inputDir: "data/ooh-listings",
  outputDir: "data/ooh-demo",
  seed: 20260426,
};

const MEDIA_FORMATS = [
  {
    media_type: "billboard",
    label: "Static billboard",
    dimensions: { width_ft: 48, height_ft: 14, text: "48 ft x 14 ft" },
    priceRange: [1200, 12000],
    weeklyImpressionsRange: [35000, 900000],
    dwellRange: [2.1, 7.5],
  },
  {
    media_type: "digital_billboard",
    label: "Digital billboard",
    dimensions: { width_ft: 48, height_ft: 14, text: "48 ft x 14 ft" },
    priceRange: [2500, 25000],
    weeklyImpressionsRange: [60000, 1200000],
    dwellRange: [1.6, 5.8],
  },
  {
    media_type: "bus_shelter",
    label: "Bus shelter poster",
    dimensions: { width_ft: 4, height_ft: 6, text: "4 ft x 6 ft" },
    priceRange: [450, 4500],
    weeklyImpressionsRange: [8000, 180000],
    dwellRange: [5, 24],
  },
  {
    media_type: "street_furniture",
    label: "Street furniture panel",
    dimensions: { width_ft: 4, height_ft: 6, text: "4 ft x 6 ft" },
    priceRange: [350, 3800],
    weeklyImpressionsRange: [6000, 160000],
    dwellRange: [4, 18],
  },
  {
    media_type: "transit",
    label: "Transit media panel",
    dimensions: { width_ft: 10, height_ft: 2.5, text: "10 ft x 2.5 ft" },
    priceRange: [800, 9000],
    weeklyImpressionsRange: [18000, 450000],
    dwellRange: [8, 35],
  },
  {
    media_type: "mural",
    label: "Wallscape / mural",
    dimensions: { width_ft: 60, height_ft: 30, text: "60 ft x 30 ft" },
    priceRange: [8000, 60000],
    weeklyImpressionsRange: [50000, 950000],
    dwellRange: [3, 12],
  },
  {
    media_type: "digital_screen",
    label: "Place-based digital screen",
    dimensions: { width_ft: 6, height_ft: 3.5, text: "6 ft x 3.5 ft" },
    priceRange: [650, 7500],
    weeklyImpressionsRange: [10000, 260000],
    dwellRange: [6, 45],
  },
];

const ENVIRONMENTS = [
  "arterial road",
  "downtown core",
  "highway approach",
  "retail corridor",
  "airport access",
  "transit hub",
  "campus district",
  "entertainment district",
  "commuter corridor",
  "shopping street",
];

const AVAILABILITY = [
  "available_now",
  "available_next_30_days",
  "rfp_required",
  "limited_availability",
  "hold_recommended",
];

const SYNTHETIC_FIELDS = [
  "id",
  "title",
  "media_type",
  "latitude",
  "longitude",
  "dimensions",
  "price_text",
  "price_amount",
  "price_period",
  "availability",
  "weekly_impressions_estimate",
  "cpm_estimate",
  "visibility_score",
  "dwell_seconds_avg",
  "environment",
  "audience_segments",
  "creative_restrictions",
];

function printHelp() {
  console.log(`Generate a demo-scale OOH dataset from real source-backed anchors.

Usage:
  npm run demo:ooh -- [options]
  node scripts/generate-ooh-demo-dataset.mjs [options]

Options:
  --input <path>       Source scraper JSON. Defaults to latest data/ooh-listings/*.json.
  --input-dir <path>   Folder to search for latest scraper JSON. Default: data/ooh-listings.
  --count <n>          Number of demo records to generate. Default: 2500.
  --seed <n>           Deterministic random seed. Default: 20260426.
  --output-dir <path>  Output folder. Default: data/ooh-demo.
  --help               Show this help.

Important:
  Every demo row keeps a real source URL from the input anchor, but generated
  fields are explicitly marked with synthetic=true and synthetic_fields=[...].
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
    } else if (arg === "--count") {
      requireValue(arg, next);
      options.count = parsePositiveInt(arg, next);
      i += 1;
    } else if (arg === "--seed") {
      requireValue(arg, next);
      options.seed = parsePositiveInt(arg, next);
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

function parsePositiveInt(arg, value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`${arg} must be a positive integer`);
  }
  return parsed;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const inputPaths = options.input
    ? [path.resolve(process.cwd(), options.input)]
    : await findAllScraperExports(options.inputDir);

  const allListings = [];
  const seenUrls = new Set();
  for (const inputPath of inputPaths) {
    const payload = JSON.parse(await readFile(inputPath, "utf8"));
    for (const listing of payload.listings ?? []) {
      const key = listing.listing_url ?? listing.id;
      if (!seenUrls.has(key)) {
        seenUrls.add(key);
        allListings.push(listing);
      }
    }
  }
  const anchors = normalizeAnchors(allListings);
  const inputPath = inputPaths[inputPaths.length - 1];

  if (anchors.length === 0) {
    throw new Error("No usable source-backed anchors found in scraper JSON.");
  }

  const generatedAt = new Date().toISOString();
  const rng = mulberry32(options.seed);
  const listings = Array.from({ length: options.count }, (_, index) =>
    generateDemoListing(index, anchors, rng, generatedAt),
  );

  await writeOutputs(listings, anchors, options, inputPath, generatedAt);

  console.log(
    `Generated ${listings.length} synthetic demo records from ${anchors.length} real source-backed anchors.`,
  );
}

async function findAllScraperExports(inputDir) {
  const resolvedDir = path.resolve(process.cwd(), inputDir);
  const files = await readdir(resolvedDir, { withFileTypes: true });
  const jsonFiles = files
    .filter((file) => file.isFile() && /^ooh-listings-.+\.json$/.test(file.name))
    .map((file) => path.join(resolvedDir, file.name));

  if (jsonFiles.length === 0) {
    throw new Error(`No scraper JSON exports found in ${resolvedDir}`);
  }

  return jsonFiles;
}

function normalizeAnchors(listings) {
  return listings
    .map((listing) => {
      const sourceUrl = listing.listing_url ?? listing.source_url;
      if (!sourceUrl) return null;

      return {
        source_id: listing.id ?? stableId(sourceUrl),
        source: listing.source ?? "unknown",
        source_url: sourceUrl,
        source_title: listing.title ?? "OOH source",
        source_media_type: listing.media_type ?? "ooh",
        source_image_url: listing.image_url ?? null,
        city: cleanValue(listing.city) ?? inferCityFromTitle(listing.title),
        region: cleanValue(listing.region),
        country: cleanValue(listing.country) ?? null,
        street: cleanValue(listing.street),
        latitude: Number.isFinite(listing.latitude) ? listing.latitude : null,
        longitude: Number.isFinite(listing.longitude) ? listing.longitude : null,
        source_price_text: listing.price_text ?? null,
        source_price_amount: Number.isFinite(listing.price_amount) ? listing.price_amount : null,
        source_scraped_at: listing.scraped_at ?? null,
      };
    })
    .filter(
      (anchor) =>
        anchor &&
        anchor.source_url &&
        Number.isFinite(anchor.latitude) &&
        Number.isFinite(anchor.longitude),
    );
}

function generateDemoListing(index, anchors, rng, generatedAt) {
  const anchor = anchors[index % anchors.length];
  const format = weightedFormat(anchor, rng);
  const city = anchor.city ?? "Unknown market";
  const market = [city, anchor.region].filter(Boolean).join(", ");
  const environment = pick(ENVIRONMENTS, rng);
  const hasRealPrice = anchor.source_price_amount > 0;
  const priceAmount = hasRealPrice
    ? anchor.source_price_amount
    : roundToNearest(randomInt(format.priceRange[0], format.priceRange[1], rng), 25);
  const weeklyImpressions = roundToNearest(
    randomInt(format.weeklyImpressionsRange[0], format.weeklyImpressionsRange[1], rng),
    250,
  );
  const cpm = Number(((priceAmount / Math.max(weeklyImpressions * 4, 1)) * 1000).toFixed(2));
  const latLng = jitterLatLng(anchor.latitude, anchor.longitude, rng);

  return {
    id: `demo_ooh_${String(index + 1).padStart(6, "0")}`,
    record_type: "synthetic_demo_inventory",
    synthetic: true,
    synthetic_fields: SYNTHETIC_FIELDS,
    generated_at: generatedAt,
    source: anchor.source,
    source_id: anchor.source_id,
    source_url: anchor.source_url,
    source_title: anchor.source_title,
    source_media_type: anchor.source_media_type,
    source_image_url: anchor.source_image_url,
    source_price_text: anchor.source_price_text,
    source_scraped_at: anchor.source_scraped_at,
    title: `${format.label} - ${market || "OOH market"} #${index + 1}`,
    media_type: format.media_type,
    city,
    region: anchor.region,
    country: anchor.country,
    street: anchor.street,
    latitude: latLng.latitude,
    longitude: latLng.longitude,
    dimensions: format.dimensions,
    price_text: hasRealPrice
      ? anchor.source_price_text
      : `$${priceAmount.toLocaleString("en-US")}/month (synthetic estimate)`,
    price_amount: priceAmount,
    price_period: "month",
    currency: "USD",
    availability: pick(AVAILABILITY, rng),
    weekly_impressions_estimate: weeklyImpressions,
    cpm_estimate: cpm,
    visibility_score: Number(randomFloat(0.52, 0.97, rng).toFixed(2)),
    dwell_seconds_avg: Number(randomFloat(format.dwellRange[0], format.dwellRange[1], rng).toFixed(1)),
    environment,
    audience_segments: pickAudienceSegments(environment, rng),
    creative_restrictions: pickCreativeRestrictions(format.media_type, rng),
    confidence: 0.68,
    provenance_note:
      "Demo row generated from a real source URL. Commercial fields are synthetic estimates for demo analytics.",
  };
}

function weightedFormat(anchor, rng) {
  const direct = MEDIA_FORMATS.find((format) => format.media_type === anchor.source_media_type);
  if (direct && rng() < 0.55) return direct;

  const billboardBias = ["billboard", "digital_billboard"].includes(anchor.source_media_type);
  if (billboardBias && rng() < 0.45) {
    return rng() < 0.78
      ? MEDIA_FORMATS.find((format) => format.media_type === "billboard")
      : MEDIA_FORMATS.find((format) => format.media_type === "digital_billboard");
  }

  return pick(MEDIA_FORMATS, rng);
}

function jitterLatLng(latitude, longitude, rng) {
  const meters = randomFloat(50, 4000, rng);
  const angle = randomFloat(0, Math.PI * 2, rng);
  const latOffset = (Math.cos(angle) * meters) / 111_320;
  const lngOffset =
    (Math.sin(angle) * meters) /
    (111_320 * Math.max(Math.cos((latitude * Math.PI) / 180), 0.2));

  return {
    latitude: Number((latitude + latOffset).toFixed(7)),
    longitude: Number((longitude + lngOffset).toFixed(7)),
  };
}

function pickAudienceSegments(environment, rng) {
  const base = {
    "airport access": ["travelers", "business travelers", "rideshare users"],
    "arterial road": ["drivers", "local commuters", "nearby residents"],
    "campus district": ["students", "young adults", "food delivery users"],
    "commuter corridor": ["commuters", "drivers", "professionals"],
    "downtown core": ["office workers", "tourists", "urban shoppers"],
    "entertainment district": ["nightlife visitors", "tourists", "restaurant goers"],
    "highway approach": ["drivers", "regional commuters", "suburban households"],
    "retail corridor": ["shoppers", "families", "local residents"],
    "shopping street": ["pedestrians", "tourists", "retail shoppers"],
    "transit hub": ["commuters", "students", "pedestrians"],
  }[environment] ?? ["general audience"];

  return shuffle([...base], rng).slice(0, 2 + Math.floor(rng() * 2));
}

function pickCreativeRestrictions(mediaType, rng) {
  const common = ["no adult content", "operator approval required"];
  const digital = ["animated creative allowed", "dayparting available", "six-second loop recommended"];
  const staticRules = ["production lead time required", "vinyl print required"];

  const rules = mediaType.includes("digital") ? [...common, ...digital] : [...common, ...staticRules];
  return shuffle(rules, rng).slice(0, 2 + Math.floor(rng() * 2));
}

async function writeOutputs(listings, anchors, options, inputPath, generatedAt) {
  const outputDir = path.resolve(process.cwd(), options.outputDir);
  await mkdir(outputDir, { recursive: true });

  const stamp = generatedAt.replace(/[:.]/g, "-");
  const baseName = `ooh-demo-${stamp}`;
  const metadata = {
    generated_at: generatedAt,
    count: listings.length,
    anchor_count: anchors.length,
    source_input: inputPath,
    synthetic: true,
    synthetic_policy:
      "Each row is generated from a real source URL. Generated commercial/analytics fields are marked in synthetic_fields.",
  };

  await writeFile(
    path.join(outputDir, `${baseName}.json`),
    `${JSON.stringify({ metadata, listings }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(path.join(outputDir, `${baseName}.csv`), toCsv(listings), "utf8");
}

function toCsv(listings) {
  const columns = [
    "id",
    "record_type",
    "synthetic",
    "source",
    "source_id",
    "source_url",
    "source_title",
    "title",
    "media_type",
    "city",
    "region",
    "country",
    "latitude",
    "longitude",
    "price_text",
    "price_amount",
    "price_period",
    "currency",
    "availability",
    "weekly_impressions_estimate",
    "cpm_estimate",
    "visibility_score",
    "dwell_seconds_avg",
    "environment",
    "audience_segments",
    "creative_restrictions",
    "provenance_note",
  ];

  const rows = listings.map((listing) =>
    columns.map((column) => csvEscape(listing[column] ?? "")).join(","),
  );

  return `${columns.join(",")}\n${rows.join("\n")}\n`;
}

function csvEscape(value) {
  const stringValue =
    typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replaceAll("\"", "\"\"")}"`;
  }

  return stringValue;
}

function cleanValue(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).trim();
  return cleaned.length > 0 ? cleaned : null;
}

function inferCityFromTitle(title) {
  const match = String(title ?? "").match(/\b([A-Z][A-Za-z .'-]+),\s*([A-Z]{2,3})\b/);
  return match?.[1]?.trim() ?? null;
}

function pick(values, rng) {
  return values[Math.floor(rng() * values.length)];
}

function shuffle(values, rng) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomInt(min, max, rng) {
  return Math.floor(randomFloat(min, max + 1, rng));
}

function randomFloat(min, max, rng) {
  return min + rng() * (max - min);
}

function roundToNearest(value, nearest) {
  return Math.round(value / nearest) * nearest;
}

function stableId(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

function mulberry32(seed) {
  return function next() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
