#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const USER_AGENT =
  "SightlineOOHAnalyticsBot/0.1 (+https://github.com/analytics; contact: analytics@example.com)";

const DEFAULT_SEED_URLS = [
  // Northeast
  "https://www.outdoorbillboard.com/billboards-for-rent/new-york/new-york",
  "https://www.outdoorbillboard.com/billboards-for-rent/massachusetts/boston",
  "https://www.outdoorbillboard.com/billboards-for-rent/pennsylvania/philadelphia",
  "https://www.outdoorbillboard.com/billboards-for-rent/maryland/baltimore",
  "https://www.outdoorbillboard.com/billboards-for-rent/virginia/washington",
  // Southeast
  "https://www.outdoorbillboard.com/billboards-for-rent/georgia/atlanta",
  "https://www.outdoorbillboard.com/billboards-for-rent/florida/miami",
  "https://www.outdoorbillboard.com/billboards-for-rent/florida/orlando",
  "https://www.outdoorbillboard.com/billboards-for-rent/florida/tampa",
  "https://www.outdoorbillboard.com/billboards-for-rent/north-carolina/charlotte",
  "https://www.outdoorbillboard.com/billboards-for-rent/tennessee/nashville",
  // Midwest
  "https://www.outdoorbillboard.com/billboards-for-rent/illinois/chicago",
  "https://www.outdoorbillboard.com/billboards-for-rent/michigan/detroit",
  "https://www.outdoorbillboard.com/billboards-for-rent/minnesota/minneapolis",
  "https://www.outdoorbillboard.com/billboards-for-rent/ohio/columbus",
  "https://www.outdoorbillboard.com/billboards-for-rent/missouri/kansas-city",
  "https://www.outdoorbillboard.com/billboards-for-rent/indiana/indianapolis",
  // South / Southwest
  "https://www.outdoorbillboard.com/billboards-for-rent/texas/dallas",
  "https://www.outdoorbillboard.com/billboards-for-rent/texas/houston",
  "https://www.outdoorbillboard.com/billboards-for-rent/texas/san-antonio",
  "https://www.outdoorbillboard.com/billboards-for-rent/texas/austin",
  "https://www.outdoorbillboard.com/billboards-for-rent/arizona/phoenix",
  "https://www.outdoorbillboard.com/billboards-for-rent/nevada/las-vegas",
  "https://www.outdoorbillboard.com/billboards-for-rent/colorado/denver",
  // West
  "https://www.outdoorbillboard.com/billboards-for-rent/california/los-angeles",
  "https://www.outdoorbillboard.com/billboards-for-rent/california/san-diego",
  "https://www.outdoorbillboard.com/billboards-for-rent/california/san-francisco",
  "https://www.outdoorbillboard.com/billboards-for-rent/california/san-jose",
  "https://www.outdoorbillboard.com/billboards-for-rent/california/sacramento",
  "https://www.outdoorbillboard.com/billboards-for-rent/washington/seattle",
  "https://www.outdoorbillboard.com/billboards-for-rent/oregon/portland",
];

const DEFAULT_OPTIONS = {
  delayMs: 1200,
  format: "both",
  includeDetails: false,
  maxListings: Number.POSITIVE_INFINITY,
  maxPages: 2,
  overpassLimit: 500,
  overpassUrl: "https://overpass-api.de/api/interpreter",
  outputDir: "data/ooh-listings",
  respectRobots: true,
};

const robotsCache = new Map();
const lastFetchByHost = new Map();

function printHelp() {
  console.log(`OOH listing scraper

Usage:
  npm run scrape:ooh -- [options]
  node scripts/scrape-ooh-listings.mjs [options]

Options:
  --url <url>             Seed URL to scrape. Repeatable or comma-separated.
  --seed-file <path>      Text/JSON file with seed URLs.
  --bbox <s,w,n,e>        Fetch OSM advertising objects in a bounding box.
  --bbox-file <path>      JSON file with array of {south,west,north,east,label?} objects.
  --max-pages <n>         Pages to follow per seed via rel=next. Default: 2.
  --max-listings <n>      Stop after this many unique listings.
  --overpass-limit <n>    Max OSM objects per bbox. Default: 500.
  --overpass-url <url>    Overpass API endpoint.
  --delay-ms <n>          Minimum delay per host. Default: 1200.
  --output-dir <path>     Output folder. Default: data/ooh-listings.
  --format <json|csv|both>
  --include-details       Fetch each listing page for description metadata.
  --no-robots             Skip robots.txt checks. Not recommended.
  --help                  Show this help.

Examples:
  npm run scrape:ooh -- --max-pages 1 --max-listings 50
  npm run scrape:ooh -- --url https://www.outdoorbillboard.com/billboards-for-rent/georgia/atlanta
  npm run scrape:ooh -- --bbox 1.22,103.60,1.48,104.05 --format json
  npm run scrape:ooh -- --seed-file docs/ooh-seeds.txt --format csv
  npm run scrape:global
`);
}

function parseArgs(argv) {
  const options = { ...DEFAULT_OPTIONS, bboxList: [], seedUrls: [] };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--include-details") {
      options.includeDetails = true;
    } else if (arg === "--no-robots") {
      options.respectRobots = false;
    } else if (arg === "--url") {
      requireValue(arg, next);
      options.seedUrls.push(...splitUrlList(next));
      i += 1;
    } else if (arg === "--seed-file") {
      requireValue(arg, next);
      options.seedFile = next;
      i += 1;
    } else if (arg === "--bbox") {
      requireValue(arg, next);
      options.bboxList.push(parseBbox(next));
      i += 1;
    } else if (arg === "--bbox-file") {
      requireValue(arg, next);
      options.bboxFile = next;
      i += 1;
    } else if (arg === "--max-pages") {
      requireValue(arg, next);
      options.maxPages = parsePositiveInt(arg, next);
      i += 1;
    } else if (arg === "--max-listings") {
      requireValue(arg, next);
      options.maxListings = parsePositiveInt(arg, next);
      i += 1;
    } else if (arg === "--delay-ms") {
      requireValue(arg, next);
      options.delayMs = parsePositiveInt(arg, next);
      i += 1;
    } else if (arg === "--overpass-limit") {
      requireValue(arg, next);
      options.overpassLimit = parsePositiveInt(arg, next);
      i += 1;
    } else if (arg === "--overpass-delay-ms") {
      requireValue(arg, next);
      options.overpassDelayMs = parsePositiveInt(arg, next);
      i += 1;
    } else if (arg === "--overpass-url") {
      requireValue(arg, next);
      options.overpassUrl = normalizeUrl(next);
      i += 1;
    } else if (arg === "--output-dir") {
      requireValue(arg, next);
      options.outputDir = next;
      i += 1;
    } else if (arg === "--format") {
      requireValue(arg, next);
      if (!["json", "csv", "both"].includes(next)) {
        throw new Error("--format must be json, csv, or both");
      }
      options.format = next;
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

function splitUrlList(value) {
  return value
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
}

function parseBbox(value) {
  const parts = value.split(",").map((part) => Number.parseFloat(part.trim()));

  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    throw new Error("--bbox must be south,west,north,east");
  }

  const [south, west, north, east] = parts;
  if (south >= north || west >= east) {
    throw new Error("--bbox must be ordered as south,west,north,east");
  }

  return { south, west, north, east };
}

async function loadSeeds(options) {
  const seeds = [...options.seedUrls];

  if (options.seedFile) {
    const raw = await readFile(options.seedFile, "utf8");
    const fileSeeds = options.seedFile.endsWith(".json")
      ? JSON.parse(raw)
      : raw
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith("#"));

    if (!Array.isArray(fileSeeds)) {
      throw new Error("--seed-file JSON must be an array of URLs");
    }

    seeds.push(...fileSeeds);
  }

  if (seeds.length === 0 && (options.bboxList.length > 0 || options.bboxFile)) {
    return [];
  }

  return dedupe(seeds.length > 0 ? seeds : DEFAULT_SEED_URLS).map((url) =>
    normalizeUrl(url),
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const seeds = await loadSeeds(options);
  const scrapedAt = new Date().toISOString();
  const listingsByKey = new Map();
  const skipped = [];

  for (const seed of seeds) {
    if (listingsByKey.size >= options.maxListings) break;

    let pageUrl = seed;
    for (let page = 1; page <= options.maxPages && pageUrl; page += 1) {
      if (listingsByKey.size >= options.maxListings) break;

      const fetchResult = await fetchText(pageUrl, options);
      if (!fetchResult.ok) {
        skipped.push({
          url: pageUrl,
          reason: fetchResult.reason,
          status: fetchResult.status ?? null,
        });
        break;
      }

      const adapter = selectAdapter(pageUrl, fetchResult.text);
      const parsed = adapter.parseListPage(fetchResult.text, pageUrl, scrapedAt);

      for (const listing of parsed.listings) {
        const key = listing.id
          ? `${listing.source}:${listing.id}`
          : listing.listing_url;

        if (!listingsByKey.has(key)) {
          listingsByKey.set(key, listing);
        }

        if (listingsByKey.size >= options.maxListings) break;
      }

      pageUrl = parsed.nextUrl ? normalizeUrl(parsed.nextUrl, pageUrl) : null;
    }
  }

  if (options.bboxFile) {
    const raw = await readFile(path.resolve(process.cwd(), options.bboxFile), "utf8");
    const fileBboxes = JSON.parse(raw);
    if (!Array.isArray(fileBboxes)) {
      throw new Error("--bbox-file JSON must be an array of {south,west,north,east} objects");
    }
    for (const b of fileBboxes) {
      const { south, west, north, east, label } = b;
      if (
        !Number.isFinite(south) || !Number.isFinite(west) ||
        !Number.isFinite(north) || !Number.isFinite(east)
      ) {
        throw new Error(`Invalid bbox in --bbox-file: ${JSON.stringify(b)}`);
      }
      options.bboxList.push({ south, west, north, east, label });
    }
    console.log(`Loaded ${fileBboxes.length} bboxes from ${options.bboxFile}.`);
  }

  let overpassRequestCount = 0;
  for (const bbox of options.bboxList) {
    if (listingsByKey.size >= options.maxListings) break;

    if (overpassRequestCount > 0) {
      await sleep(options.overpassDelayMs ?? 6000);
    }
    overpassRequestCount += 1;

    const remaining = Number.isFinite(options.maxListings)
      ? options.maxListings - listingsByKey.size
      : options.overpassLimit;
    const overpassListings = await fetchOverpassListings(
      bbox,
      Math.min(options.overpassLimit, remaining),
      options,
      scrapedAt,
    );

    for (const listing of overpassListings) {
      const key = `${listing.source}:${listing.id}`;
      if (!listingsByKey.has(key)) {
        listingsByKey.set(key, listing);
      }
    }
  }

  let listings = [...listingsByKey.values()].slice(0, options.maxListings);

  if (options.includeDetails) {
    listings = await enrichListingsWithDetails(listings, options);
  }

  await writeOutputs(listings, skipped, options, scrapedAt);

  console.log(
    `Scraped ${listings.length} unique OOH listings from ${seeds.length} seed URL(s).`,
  );
  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.length} URL(s); see run metadata JSON.`);
  }
}

function selectAdapter(url, html) {
  const hostname = new URL(url).hostname.replace(/^www\./, "");

  if (
    hostname === "outdoorbillboard.com" ||
    html.includes("OutdoorBillboard.com")
  ) {
    return outdoorBillboardAdapter;
  }

  return genericOohAdapter;
}

const outdoorBillboardAdapter = {
  source: "outdoorbillboard",

  parseListPage(html, pageUrl, scrapedAt) {
    const mapListings = parseOutdoorBillboardMapListings(html, pageUrl);
    const cardListings = parseOutdoorBillboardCards(html, pageUrl);
    const byId = new Map();

    for (const listing of mapListings) {
      byId.set(listing.id, listing);
    }

    for (const listing of cardListings) {
      const existing = byId.get(listing.id) ?? {};
      byId.set(listing.id, {
        ...existing,
        ...listing,
        latitude: existing.latitude ?? listing.latitude,
        longitude: existing.longitude ?? listing.longitude,
        raw: {
          ...(existing.raw ?? {}),
          ...(listing.raw ?? {}),
        },
      });
    }

    return {
      listings: [...byId.values()].map((listing) => ({
        source: this.source,
        scraped_at: scrapedAt,
        confidence: scoreListingConfidence(listing),
        ...listing,
      })),
      nextUrl: extractNextUrl(html, pageUrl),
    };
  },

  parseDetailPage(html) {
    return {
      description: cleanText(extractMetaContent(html, "description") ?? ""),
    };
  },
};

function parseOutdoorBillboardMapListings(html, pageUrl) {
  const decoded = decodeHtmlEntities(html);
  const arrayText = extractMapArrayText(decoded);
  if (!arrayText) return [];

  try {
    const rows = JSON.parse(arrayText);
    return rows.map((row) => ({
      id: String(row.id),
      title: cleanText(row.title ?? row.name ?? ""),
      media_type: inferMediaType(row.title),
      listing_url: normalizeUrl(row.url, pageUrl),
      source_url: pageUrl,
      latitude: parseOptionalFloat(row.lat),
      longitude: parseOptionalFloat(row.lng),
      street: cleanText(row.street ?? "") || null,
      status: "for_rent",
      availability: "listed",
      raw: { map: row },
    }));
  } catch {
    return [];
  }
}

function extractMapArrayText(decodedHtml) {
  const marker = "mapForSearchResults(";
  const start = decodedHtml.indexOf(marker);
  if (start === -1) return null;

  const arrayStart = decodedHtml.indexOf("[", start);
  if (arrayStart === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = arrayStart; i < decodedHtml.length; i += 1) {
    const char = decodedHtml[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
    } else if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return decodedHtml.slice(arrayStart, i + 1);
      }
    }
  }

  return null;
}

function parseOutdoorBillboardCards(html, pageUrl) {
  const chunks = html.split(/<div class=['"]col-md-12 col-lg-6['"]>/i);
  const listings = [];

  for (const chunk of chunks) {
    if (!chunk.includes("<div class='item'>") && !chunk.includes("<div class=\"item\">")) {
      continue;
    }

    const href = firstMatch(
      chunk,
      /<a[^>]+href=["']([^"']*\/billboards\/(\d+)[^"']*)["'][^>]*>/i,
    );
    const id = firstMatch(chunk, /\/billboards\/(\d+)/i);
    if (!href || !id) continue;

    const title = cleanText(
      firstMatch(
        chunk,
        /<a[^>]*class=["'][^"']*item-title[^"']*["'][^>]*>([\s\S]*?)<\/a>/i,
      ) ?? "",
    );
    const priceText = cleanText(
      firstMatch(
        chunk,
        /<div class=['"]item-price['"]>([\s\S]*?)<\/div>/i,
      ) ?? "",
    );
    const location = cleanText(
      firstMatch(
        chunk,
        /<div class=['"]item-location['"]>([\s\S]*?)<\/div>/i,
      ) ?? "",
    );
    const imageUrl = firstMatch(chunk, /<img[^>]+src=["']([^"']+)["']/i);
    const imageAlt = cleanText(firstMatch(chunk, /<img[^>]+alt=["']([^"']*)["']/i) ?? "");
    const detailsText = cleanText(
      firstMatch(
        chunk,
        /<div class=['"]item-details-i['"]>([\s\S]*?)<\/div>/i,
      ) ?? "",
    );

    const price = parsePrice(priceText);
    const locationParts = parseCityRegion(location);

    listings.push({
      id,
      title: normalizeTitle(title, imageAlt),
      media_type: inferMediaType(`${title} ${detailsText} ${imageAlt}`),
      listing_url: normalizeUrl(href, pageUrl),
      source_url: pageUrl,
      image_url: imageUrl ? normalizeUrl(imageUrl, pageUrl) : null,
      price_text: priceText || null,
      price_amount: price.amount,
      price_period: price.period,
      currency: price.currency,
      city: locationParts.city,
      region: locationParts.region,
      country: "US",
      dimensions: parseDimensions(detailsText),
      status: "for_rent",
      availability: "listed",
      raw: {
        card_details_text: detailsText || null,
        card_location_text: location || null,
        image_alt: imageAlt || null,
      },
    });
  }

  return listings;
}

const genericOohAdapter = {
  source: "generic_ooh",

  parseListPage(html, pageUrl, scrapedAt) {
    const links = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
      .map((match) => ({
        href: normalizeUrl(match[1], pageUrl),
        text: cleanText(match[2]),
      }))
      .filter((link) =>
        /\b(billboard|bus shelter|transit|street furniture|outdoor|ooh|dooh|screen|kiosk|mural)\b/i.test(
          `${link.href} ${link.text}`,
        ),
      );

    const listings = dedupeBy(links, (link) => link.href).map((link, index) => ({
      id: stableId(link.href),
      source: this.source,
      title: link.text || "OOH placement",
      media_type: inferMediaType(`${link.href} ${link.text}`),
      listing_url: link.href,
      source_url: pageUrl,
      scraped_at: scrapedAt,
      confidence: 0.35,
      raw: { generic_link_index: index },
    }));

    return {
      listings,
      nextUrl: extractNextUrl(html, pageUrl),
    };
  },

  parseDetailPage(html) {
    return {
      description: cleanText(extractMetaContent(html, "description") ?? ""),
    };
  },
};

async function enrichListingsWithDetails(listings, options) {
  const enriched = [];

  for (const listing of listings) {
    const fetchResult = await fetchText(listing.listing_url, options);
    if (!fetchResult.ok) {
      enriched.push({
        ...listing,
        detail_error: fetchResult.reason,
      });
      continue;
    }

    const adapter = selectAdapter(listing.listing_url, fetchResult.text);
    const details = adapter.parseDetailPage(fetchResult.text);
    enriched.push({
      ...listing,
      ...removeEmptyFields(details),
    });
  }

  return enriched;
}

async function fetchOverpassListings(bbox, limit, options, scrapedAt) {
  if (limit <= 0) return [];

  const query = `
[out:json][timeout:25];
(
  node["advertising"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["advertising"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  relation["advertising"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
);
out center ${limit};
`;

  try {
    const response = await fetch(options.overpassUrl, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: new URLSearchParams({ data: query }),
    });

    if (!response.ok) {
      console.warn(`Overpass request failed with HTTP ${response.status}`);
      return [];
    }

    const payload = await response.json();
    return (payload.elements ?? [])
      .map((element) => normalizeOverpassElement(element, options.overpassUrl, scrapedAt, bbox))
      .filter(Boolean);
  } catch (error) {
    console.warn(`Overpass request failed: ${error.message}`);
    return [];
  }
}

function parseBboxLabel(label) {
  if (!label) return { city: null, country: null };
  const parts = label.split(", ");
  return {
    city: parts[0]?.trim() ?? null,
    country: parts[1]?.trim() ?? null,
  };
}

function normalizeOverpassElement(element, sourceUrl, scrapedAt, bbox) {
  const tags = element.tags ?? {};
  const latitude = element.lat ?? element.center?.lat ?? null;
  const longitude = element.lon ?? element.center?.lon ?? null;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const advertisingType = tags.advertising ?? "ooh";
  const displayType = String(advertisingType).replaceAll("_", " ");
  const title = cleanText(tags.name ?? `${displayType} (${element.type}/${element.id})`);
  const bboxMeta = parseBboxLabel(bbox?.label);

  return {
    id: `${element.type}/${element.id}`,
    source: "openstreetmap_overpass",
    title,
    media_type: inferMediaType(`${advertisingType} ${tags.display ?? ""}`),
    listing_url: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    source_url: sourceUrl,
    price_text: null,
    price_amount: null,
    price_period: null,
    currency: null,
    city: cleanText(tags["addr:city"] ?? "") || bboxMeta.city,
    region: cleanText(tags["addr:state"] ?? "") || null,
    country: cleanText(tags["addr:country"] ?? "") || bboxMeta.country,
    street: cleanText(tags["addr:street"] ?? "") || null,
    latitude,
    longitude,
    dimensions: parseOsmDimensions(tags),
    image_url: null,
    status: "public_location",
    availability: "unknown",
    scraped_at: scrapedAt,
    confidence: 0.75,
    raw: {
      osm_type: element.type,
      osm_id: element.id,
      tags,
    },
  };
}

function parseOsmDimensions(tags) {
  const width = parseOptionalFloat(tags.width);
  const height = parseOptionalFloat(tags.height);

  if (!Number.isFinite(width) && !Number.isFinite(height)) {
    return null;
  }

  return {
    width_m: Number.isFinite(width) ? width : null,
    height_m: Number.isFinite(height) ? height : null,
  };
}

async function fetchText(url, options) {
  const parsed = new URL(url);

  if (options.respectRobots) {
    const robots = await getRobots(parsed);
    if (!isAllowedByRobots(parsed, robots)) {
      return { ok: false, reason: "blocked_by_robots_txt" };
    }
  }

  await waitForHost(parsed, options.delayMs);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return {
        ok: false,
        reason: "http_error",
        status: response.status,
      };
    }

    const text = await response.text();
    return { ok: true, text, status: response.status };
  } catch (error) {
    return {
      ok: false,
      reason: `fetch_failed:${error.message}`,
    };
  }
}

async function getRobots(url) {
  const origin = url.origin;
  if (robotsCache.has(origin)) {
    return robotsCache.get(origin);
  }

  const robotsUrl = `${origin}/robots.txt`;
  let robots = { disallow: [], crawlDelayMs: null };

  try {
    await waitForHost(url, 250);
    const response = await fetch(robotsUrl, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (response.ok) {
      robots = parseRobotsTxt(await response.text());
    }
  } catch {
    robots = { disallow: [], crawlDelayMs: null };
  }

  robotsCache.set(origin, robots);
  return robots;
}

function parseRobotsTxt(raw) {
  const groups = [];
  let current = null;

  for (const line of raw.split(/\r?\n/)) {
    const cleaned = line.replace(/#.*/, "").trim();
    if (!cleaned) continue;

    const [rawKey, ...rawValue] = cleaned.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rawValue.join(":").trim();

    if (key === "user-agent") {
      current = { agents: [value.toLowerCase()], disallow: [], crawlDelayMs: null };
      groups.push(current);
    } else if (current && key === "disallow") {
      current.disallow.push(value);
    } else if (current && key === "crawl-delay") {
      const seconds = Number.parseFloat(value);
      if (Number.isFinite(seconds)) {
        current.crawlDelayMs = seconds * 1000;
      }
    }
  }

  const wildcardGroups = groups.filter((group) => group.agents.includes("*"));
  if (wildcardGroups.length === 0) {
    return { disallow: [], crawlDelayMs: null };
  }

  return {
    disallow: wildcardGroups.flatMap((group) => group.disallow),
    crawlDelayMs: Math.max(
      ...wildcardGroups.map((group) => group.crawlDelayMs ?? 0),
    ),
  };
}

function isAllowedByRobots(url, robots) {
  const pathname = url.pathname || "/";
  return !robots.disallow.some((rule) => {
    if (!rule) return false;
    return pathname.startsWith(rule);
  });
}

async function waitForHost(url, configuredDelayMs) {
  const robots = robotsCache.get(url.origin);
  const delayMs = Math.max(configuredDelayMs, robots?.crawlDelayMs ?? 0);
  const now = Date.now();
  const lastFetch = lastFetchByHost.get(url.host) ?? 0;
  const waitMs = lastFetch + delayMs - now;

  if (waitMs > 0) {
    await sleep(waitMs);
  }

  lastFetchByHost.set(url.host, Date.now());
}

function extractNextUrl(html, pageUrl) {
  const href =
    firstMatch(html, /<link[^>]+rel=['"]next['"][^>]+href=['"]([^'"]+)['"]/i) ??
    firstMatch(html, /<link[^>]+href=['"]([^'"]+)['"][^>]+rel=['"]next['"]/i) ??
    firstMatch(
      html,
      /<a[^>]+(?:rel=['"]next['"][^>]+href=['"]([^'"]+)['"]|href=['"]([^'"]+)['"][^>]+rel=['"]next['"])/i,
    );

  return href ? normalizeUrl(href, pageUrl) : null;
}

async function writeOutputs(listings, skipped, options, scrapedAt) {
  const outputDir = path.resolve(process.cwd(), options.outputDir);
  await mkdir(outputDir, { recursive: true });

  const stamp = scrapedAt.replace(/[:.]/g, "-");
  const baseName = `ooh-listings-${stamp}`;
  const metadata = {
    scraped_at: scrapedAt,
    count: listings.length,
    skipped,
    fields: [
      "id",
      "source",
      "title",
      "media_type",
      "listing_url",
      "source_url",
      "price_text",
      "price_amount",
      "price_period",
      "currency",
      "availability",
      "city",
      "region",
      "country",
      "street",
      "latitude",
      "longitude",
      "dimensions",
      "image_url",
      "confidence",
    ],
  };

  if (options.format === "json" || options.format === "both") {
    await writeFile(
      path.join(outputDir, `${baseName}.json`),
      `${JSON.stringify({ metadata, listings }, null, 2)}\n`,
      "utf8",
    );
  }

  if (options.format === "csv" || options.format === "both") {
    await writeFile(
      path.join(outputDir, `${baseName}.csv`),
      toCsv(listings),
      "utf8",
    );
  }
}

function toCsv(listings) {
  const columns = [
    "id",
    "source",
    "title",
    "media_type",
    "listing_url",
    "source_url",
    "price_text",
    "price_amount",
    "price_period",
    "currency",
    "availability",
    "city",
    "region",
    "country",
    "street",
    "latitude",
    "longitude",
    "dimensions",
    "image_url",
    "confidence",
    "scraped_at",
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

function parsePrice(priceText) {
  if (!priceText || /call for price/i.test(priceText)) {
    return { amount: null, period: null, currency: null };
  }

  const match = priceText.match(/([$\u00a3\u20ac])\s*([\d,]+(?:\.\d+)?)(?:\s*\/\s*(\w+))?/);
  if (!match) {
    return { amount: null, period: null, currency: null };
  }

  return {
    amount: Number.parseFloat(match[2].replaceAll(",", "")),
    period: match[3] ?? null,
    currency: currencyFromSymbol(match[1]),
  };
}

function currencyFromSymbol(symbol) {
  return {
    "$": "USD",
    "\u00a3": "GBP",
    "\u20ac": "EUR",
  }[symbol] ?? null;
}

function parseCityRegion(location) {
  const cleaned = cleanText(location);
  const match = cleaned.match(/^(.+?),\s*([A-Z]{2,3})\b/);
  return {
    city: match?.[1]?.trim() ?? null,
    region: match?.[2]?.trim() ?? null,
  };
}

function parseDimensions(text) {
  const cleaned = cleanText(text);
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*ft\s*x\s*(\d+(?:\.\d+)?)\s*ft/i);
  if (!match) return null;

  return {
    width_ft: Number.parseFloat(match[1]),
    height_ft: Number.parseFloat(match[2]),
    text: `${match[1]} ft x ${match[2]} ft`,
  };
}

function inferMediaType(text = "") {
  const value = String(text).toLowerCase();
  if (value.includes("bus shelter")) return "bus_shelter";
  if (value.includes("poster")) return "poster";
  if (value.includes("column")) return "street_furniture";
  if (value.includes("street furniture")) return "street_furniture";
  if (value.includes("transit")) return "transit";
  if (value.includes("mural")) return "mural";
  if (value.includes("digital")) return "digital_billboard";
  if (value.includes("screen")) return "digital_screen";
  if (value.includes("kiosk")) return "kiosk";
  if (value.includes("billboard")) return "billboard";
  return "ooh";
}

function normalizeTitle(title, fallback) {
  const cleaned = cleanText(title);
  if (cleaned && cleaned.toLowerCase() !== "billboard for rent") {
    return cleaned;
  }

  const alt = cleanText(fallback);
  const altMatch = alt.match(/Billboard for Rent:\s*(.+?)(?:,\s*[A-Z][A-Za-z .'-]+,\s*[A-Z]{2})?$/i);
  return cleanText(altMatch?.[1] ?? cleaned ?? "Billboard for rent");
}

function scoreListingConfidence(listing) {
  let score = 0.4;
  if (listing.id) score += 0.1;
  if (listing.title) score += 0.1;
  if (listing.listing_url) score += 0.1;
  if (Number.isFinite(listing.latitude) && Number.isFinite(listing.longitude)) {
    score += 0.15;
  }
  if (listing.price_text) score += 0.05;
  if (listing.city || listing.region) score += 0.05;
  if (listing.image_url) score += 0.05;
  return Math.min(1, Number(score.toFixed(2)));
}

function cleanText(value) {
  return decodeHtmlEntities(String(value ?? ""))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function firstMatch(value, regex) {
  const match = value.match(regex);
  return match?.[1] ?? match?.[2] ?? null;
}

function extractMetaContent(html, name) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of metaTags) {
    const tagName = firstMatch(tag, /\bname=["']([^"']+)["']/i);
    if (tagName?.toLowerCase() !== name.toLowerCase()) continue;

    return firstMatch(tag, /\bcontent=["']([^"']*)["']/i);
  }

  return null;
}

function parseOptionalFloat(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stableId(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

function normalizeUrl(value, baseUrl) {
  return baseUrl ? new URL(value, baseUrl).toString() : new URL(value).toString();
}

function dedupe(values) {
  return [...new Set(values)];
}

function dedupeBy(values, getKey) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const key = getKey(value);
    if (!seen.has(key)) {
      seen.add(key);
      output.push(value);
    }
  }

  return output;
}

function removeEmptyFields(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== null && entryValue !== ""),
  );
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
