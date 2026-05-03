# OOH Listing Scraper

This repo includes a standalone scraper for public out-of-home advertising
inventory pages:

```powershell
npm run scrape:ooh -- --max-pages 1 --max-listings 50
```

Outputs are written to `data/ooh-listings/` as JSON and CSV. The folder is
ignored by Git because exports can get large and may contain volatile market
data.

## What It Collects

The normalized records include:

- Listing title and source URL
- Media type, such as billboard, digital billboard, transit, kiosk, or mural
- Price text and parsed price when visible
- City, region, country, street when visible
- Latitude and longitude when exposed by the listing page
- Dimensions and image URL when visible
- A confidence score for downstream filtering

## Source Model

The scraper is adapter-based. It currently has:

- `outdoorbillboard`: extracts public listing cards and map metadata from
  OutdoorBillboard.com pages.
- `generic_ooh`: a fallback link extractor for OOH-related public pages.
- `openstreetmap_overpass`: fetches worldwide public `advertising=*` map
  objects inside a bounding box. These are location signals, not guaranteed
  buyable inventory.

Default seed URLs target several OutdoorBillboard city rent pages. For a wider
or worldwide crawl, provide your own seed file:

```text
# docs/ooh-seeds.txt
https://www.outdoorbillboard.com/billboards-for-rent/georgia/atlanta
https://example-marketplace.com/outdoor-advertising/london
https://example-marketplace.com/bus-shelter-ads/singapore
```

Then run:

```powershell
npm run scrape:ooh -- --seed-file docs/ooh-seeds.txt --max-pages 3 --format csv
```

For worldwide public OOH location discovery, use a bounding box:

```powershell
# Singapore approximate bounding box: south,west,north,east
npm run scrape:ooh -- --bbox 1.22,103.60,1.48,104.05 --format json
```

## Options

```text
--url <url>             Seed URL to scrape. Repeatable or comma-separated.
--seed-file <path>      Text/JSON file with seed URLs.
--bbox <s,w,n,e>        Fetch OSM advertising objects in a bounding box.
--max-pages <n>         Pages to follow per seed via rel=next. Default: 2.
--max-listings <n>      Stop after this many unique listings.
--overpass-limit <n>    Max OSM objects per bbox. Default: 500.
--overpass-url <url>    Overpass API endpoint.
--delay-ms <n>          Minimum delay per host. Default: 1200.
--output-dir <path>     Output folder. Default: data/ooh-listings.
--format <json|csv|both>
--include-details       Fetch each listing page for description metadata.
--no-robots             Skip robots.txt checks. Not recommended.
```

## Scraping Notes

Keep the scraper analytics-oriented:

- Use public pages only.
- Respect robots.txt and site terms.
- Keep `--delay-ms` conservative for large runs.
- Prefer official APIs or partner feeds when a marketplace offers them.
- Treat prices and availability as snapshots, not booking guarantees.

## Demo Dataset

For a larger demo dataset, generate synthetic commercial records from real
source-backed anchors:

```powershell
npm run demo:ooh -- --count 5000
```

This reads the latest scraper JSON from `data/ooh-listings/` and writes JSON
and CSV to `data/ooh-demo/`. Every row keeps a real `source_url` from the input
anchor, but generated fields are explicitly marked:

- `synthetic: true`
- `record_type: synthetic_demo_inventory`
- `synthetic_fields: [...]`
- `provenance_note`

Use this for analytics demos, simulations, and UI testing. Do not present the
generated price, impression, availability, or coordinate-jitter fields as
scraped marketplace facts.

## Frontend Map Fetching

Do not fetch the full demo JSON in the browser. The 100k-row JSON export can be
hundreds of MB because it contains provenance, synthetic fields, and rich
metadata.

Build a compact point index instead:

```powershell
npm run build:ooh-map
```

This creates `data/ooh-map/ooh-map-points.json`, using compact array rows:

```text
[id,lng,lat,mediaTypeCode,priceAmount,weeklyImpressions,visibilityScore,sourceUrlIndex]
```

The frontend can then fetch only points inside the current viewport:

```ts
const bbox = [west, south, east, north].join(',')
const res = await fetch(`/api/ooh-map?bbox=${bbox}&limit=5000`)
const data = await res.json()
```

Use `includeSourceUrls=true` only when a detail panel needs source links:

```ts
fetch(`/api/ooh-map?bbox=${bbox}&limit=5000&includeSourceUrls=true`)
```

This keeps the initial map path small and lets the UI progressively request
more data as users pan or zoom.
