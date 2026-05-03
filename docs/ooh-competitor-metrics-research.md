# OOH Competitor Metrics Research

Research date: April 26, 2026  
Project: Sightline  
Purpose: Shared business/product research for agents working on Sightline.

## Working Thesis

OOH buyers do not only want "more data." They want confidence before they spend, proof after they spend, and a simple way to explain the decision to a client or finance team.

Sightline should not try to replace Geopath, AdQuick, billups, Talon, JCDecaux, or Veridooh at launch. The strongest wedge is pre-flight visibility and creative QA:

> Before buying an OOH placement, Sightline shows whether the ad is visible, readable, contextually strong, and worth testing.

## Metrics Buyers Actually Want

### 1. Visibility And Viewability

These are the first metrics because no downstream attribution matters if the ad is not physically seen.

- Sightline Score: overall pre-flight score for a location plus creative.
- Line-of-sight visibility: whether a pedestrian or driver can see the unit from likely approach paths.
- Obstruction risk: buildings, trees, poles, street furniture, competing signage, parked vehicles, construction, or greenery blocking the view.
- Viewing angle: whether the unit faces the actual traffic/pedestrian flow or sits at an awkward angle.
- Effective viewing distance: how far away the ad becomes legible.
- Exposure window: approximate seconds in view for pedestrians, vehicles, transit riders, or mall visitors.
- Dwell context: whether people are waiting, walking, driving, queueing, or passing quickly.
- Clutter score: how visually crowded the surrounding environment is.

Why this matters: Geopath, Route/Ipsos, JCDecaux, billups, and MRC-style OOH measurement all distinguish raw opportunity-to-see from likelihood-to-see or attention-quality metrics.

### 2. Creative Readability

This is likely the most valuable early product area because it is understandable, demoable, and independent of proprietary inventory data.

- Readability score by distance and speed.
- Copy length warning.
- Font size / logo size adequacy.
- Contrast ratio against the physical environment.
- CTA clarity.
- QR-code scan feasibility by distance and dwell time.
- Brand recognition probability.
- Day/night visibility risk.
- Motion/animation risk for DOOH: whether animation is too fast, too subtle, or too text-heavy.
- Safe-zone / format compliance for billboard, bus shelter, mall screen, airport screen, or wallscape.

Why this matters: OOH creative often fails because it is too wordy, low contrast, or unreadable in motion. OUTFRONT's creative guidance stresses concise copy, visibility from varying distances, visual hierarchy, and contrast.

### 3. Attention Quality

Buyers increasingly care about whether people notice an ad, not just whether traffic passed it.

- Attention-weighted impressions: modeled impressions adjusted by visibility, dwell, angle, clutter, creative contrast, and relevance.
- Attention duration: expected seconds of meaningful attention.
- Attention heatmap: where people are most likely to notice the ad.
- Creative element attention: which parts of the ad draw attention first, such as headline, logo, product, face, offer, or CTA.
- Contextual fit: whether the message fits the location, time, audience, and nearby points of interest.
- Competing media penalty: nearby screens, signs, road complexity, and environmental distractions.

Why this matters: billups is already pushing attention as a real OOH metric using computer vision, viewsheds, mobile data, and attention scoring. Talon also uses eye tracking for creative analysis.

### 4. Audience Fit

This is important, but harder for Sightline unless it integrates third-party or open mobility/demographic data.

- Estimated reach.
- Estimated frequency.
- Audience demographics.
- Audience intent or persona fit.
- Nearby POI fit: gyms, malls, offices, schools, hospitals, nightlife, tourist zones, transit hubs.
- Competitor proximity.
- Trade-area match.
- Time-of-day audience variation.

Why this matters: Geopath, JCDecaux, Talon, Kinetic, and AdQuick all compete heavily on audience planning. Sightline should not overclaim this until it has real data sources.

### 5. Campaign Outcome Metrics

These are post-flight metrics. They are valuable but not the right first wedge unless Sightline has integrations and enough campaign volume.

- Footfall lift.
- Store visits from exposed vs control audiences.
- Web or app visitation lift.
- Branded search lift.
- QR scans.
- SMS / vanity URL / call tracking.
- Sales lift / matchback.
- Brand lift: awareness, recall, favorability, purchase intent.
- Geo-holdout / incrementality results.
- Cost per incremental visit, lead, or sale.

Why this matters: AdQuick and Talon are strong here. AdQuick uses exposure data, treatment/control groups, online/offline attribution, lift studies, and integrations. Talon uses brand studies, footfall, web conversion, and benchmarks.

### 6. Delivery And Proof Metrics

This is important for DOOH and static OOH accountability, but Veridooh is already deeply specialized here.

- Proof-of-play.
- Play count.
- Share of voice.
- Loop position.
- Exposure time.
- Campaign date/time compliance.
- Creative execution verification.
- Bonus or missed panels.
- Proof-of-posting photos for static.
- Condition / damage / obstruction after launch.

Why this matters: Veridooh's core wedge is independent verification. Sightline can later complement this, but should not lead with delivery verification.

## Competitor Research Methods

### Geopath

Uses audited OOH inventory, GIS/GPS unit data, traffic and pedestrian circulation, transit ridership, trip generation, demographic modeling, visibility research, and reach/frequency models. It provides a trusted planning currency rather than a creative testing workflow.

### Ipsos / Route

Uses travel surveys, independent count data, inventory systems, and visibility adjustment to estimate OOH audiences. Strong for industry-grade audience measurement, not fast creative pre-flight simulation.

### AdQuick

Uses marketplace inventory, anonymized opt-in location data, exposure modeling, treatment/control lift studies, online/offline attribution, footfall, app/web events, QR/SMS, brand surveys, and sales matchback. Strong for plan-buy-measure workflows, especially after or during campaigns.

### billups

Closest strategic competitor to Sightline's best wedge. billups Analytics and Attention products use creative optimization, attention dashboards, mobile device data, computer vision, viewsheds, dwell time, reach/frequency, audience demographics, and attribution studies. This validates the opportunity but raises the bar.

### Talon

Uses Route data, primary research, campaign effectiveness studies, On Device Research brand studies, location-data footfall, web conversion, eye tracking via Trax, and benchmark databases. Strong agency/service layer with proprietary planning and effectiveness tools.

### Veridooh

Uses SmartCreative for independent OOH verification. Focuses on whether campaigns ran as planned: play count, exposure time, creative execution, and hundreds of delivery metrics. This is proof and verification, not pre-buy visibility/creative QA.

### JCDecaux Singapore

Uses audience mobility patterns, Airport Audience Measurement, Hourly Impression Measurement from mall traffic sensors, programmatic audience data, research on audience reaction after exposure, and campaign KPIs such as impressions, unique audience, reach, and frequency. Strong local media-owner data, but mostly tied to JCDecaux inventory.

### Kinetic / Xaxis Sightline

Important naming conflict: Kinetic already uses "Sightline" for a global DOOH/programmatic offering. It focuses on planning, executing, and measuring programmatic DOOH in omnichannel campaigns.

## How Sightline Solves This

Sightline can be strongest where competitors are either expensive, service-heavy, post-campaign-focused, or locked to owned inventory.

Current/future product advantages:

- Pre-buy visual audit instead of post-campaign explanation.
- Street View and 3D map-first workflow.
- Creative readability scoring before production or media booking.
- Location QA using obstruction, angle, clutter, and dwell context.
- A/B creative comparison in the actual placement context.
- Explainable scoring that clients can understand quickly.
- Self-serve workflow for agencies, SMBs, and independent planners.
- Client-ready report that helps justify why one placement or creative is better.

## What Sightline Does Not Solve Yet

Do not claim these until the product has real data or integrations:

- True audience measurement.
- Official reach and frequency.
- Demographic composition.
- Mobile-device exposure attribution.
- Footfall lift.
- Sales lift.
- Brand lift surveys.
- Proof-of-play.
- Media-owner availability.
- Real pricing.
- Vendor negotiation.
- Campaign delivery verification.
- Industry-standard measurement currency.

## Recommended MVP Metrics

Build these first because they are valuable, visible, and feasible without proprietary media-owner integrations:

1. Sightline Score
2. Visibility percentage from sampled approach points
3. Obstruction risk
4. Viewing angle quality
5. Effective readable distance
6. Exposure seconds estimate
7. Dwell context
8. Clutter score
9. Creative readability score
10. Contrast score
11. Copy length warning
12. Logo/CTA visibility score
13. QR scan feasibility
14. Attention-weighted impression proxy
15. A/B creative winner explanation

## Technical Acquisition Plan

This section explains how to get each metric technically. Use this as the product/engineering handoff.

### Existing Repo Inputs

Sightline already has several useful building blocks:

- Mapbox GL / Mapbox Standard for 3D map context, terrain, and camera interaction.
- Mapbox terrain elevation via `map.queryTerrainElevation`.
- Overpass / OpenStreetMap building lookup in `src/lib/overpass.ts`.
- Overpass / OpenStreetMap vegetation lookup in `src/lib/overpass.ts`.
- Google Street View picker and panorama matching in `src/components/StreetViewExplorer.tsx`.
- A synthetic billboard preview layer in `src/layers/BillboardPreviewLayer.ts`.

These are enough for an MVP pre-flight score. They are not enough for official audience measurement, attribution, or campaign ROI.

### Metric-by-Metric Implementation

| Metric | MVP data source | MVP method | Later upgrade |
|---|---|---|---|
| Sightline Score | All derived metrics below | Weighted score across visibility, obstruction, angle, exposure, clutter, readability, and CTA/QR feasibility | Calibrate weights from real campaign outcomes and agency feedback |
| Visibility percentage | OSM roads/paths, billboard plane, OSM buildings, vegetation, terrain | Sample viewer points along likely approach paths; raycast from each point to billboard center/corners; mark visible/blocked | Use city 3D tiles, lidar, media-owner survey photos, or real viewshed datasets |
| Obstruction risk | OSM buildings/vegetation, Street View image | Geometry blockers from building footprints and estimated heights; vegetation buffers; optional CV segmentation on Street View | Use segmentation models, lidar, recent street imagery, and human verification |
| Viewing angle quality | Billboard normal vector, viewer path direction | Dot product between ad face normal and viewer movement direction; penalize shallow side angles | Use real road lane direction, pedestrian route data, and unit orientation from inventory |
| Effective readable distance | Uploaded creative, physical billboard dimensions | Detect/estimate text size in pixels; convert to physical letter height; estimate max readable distance; simulate blur/downscale | Calibrate with eye-tracking or controlled readability tests |
| Exposure seconds | Visible route length, assumed speed | Sum visible path length and divide by speed class: pedestrian, vehicle, transit, queue/dwell | Use traffic speed, dwell sensors, transit schedules, mall/airport movement data |
| Dwell context | OSM POIs, crossings, transit stops, traffic lights, mall/airport context | Classify nearby context; add dwell boost for bus stops, traffic lights, queues, platforms, entrances | Use venue sensors, mobile dwell data, media-owner impression models |
| Clutter score | Street View image, OSM POI/signage density | Computer vision edge/object density; count nearby signs/screens/POIs; penalize visual noise | Use trained clutter/attention model on real OOH images |
| Creative readability score | Uploaded image/video frame | OCR text count, font-size estimate, contrast ratio, logo/CTA size, hierarchy, safe-zone checks | Use multimodal model plus agency-approved creative rules |
| Contrast score | Uploaded creative and sampled Street View background | Use WCAG-style relative luminance contrast for text/background; compare ad against environmental background colors | Use perceptual contrast/APCA and day/night lighting simulation |
| Copy length warning | OCR output | Count words/characters; flag long headlines and multiple messages | Tune by format: highway, street furniture, mall, airport, transit |
| Logo/CTA visibility | Uploaded creative | Detect marked logo/CTA region or ask user to identify; score size, contrast, and placement | Train/detect brand assets and CTAs automatically |
| QR scan feasibility | Uploaded creative, physical dimensions, exposure seconds | Detect QR region; estimate physical size and distance; require close range plus enough dwell time | Validate against real scan tests by distance and device |
| Attention-weighted impression proxy | Visibility, angle, exposure, clutter, creative contrast, dwell | Heuristic score, not official impressions: visible passers x quality factors | Integrate Geopath/Route/JCDecaux/AdQuick-style audience data |
| A/B winner explanation | Scores for Creative A/B | Compare metric deltas and produce a human-readable reason: e.g. "B wins because CTA is readable 18m farther and contrast is higher" | Add statistical confidence once calibrated with real outcomes |

### Geometry Pipeline

For the MVP, use a simple local coordinate system around the selected point:

1. Convert lat/lng to local meters using an equirectangular approximation.
2. Represent the billboard as a 3D rectangle with:
   - center point
   - width and height in meters
   - height above ground
   - normal/facing angle
3. Pull nearby OSM buildings and vegetation.
4. Estimate building height from OSM `height` or `building:levels`; fallback to a default height per level.
5. Approximate vegetation as cylinders or buffered polygons with a default height.
6. Sample viewer points along roads, footpaths, transit edges, and manually selected paths.
7. Cast rays from viewer eye height to billboard center and corners.
8. Mark a sample visible if enough rays reach the billboard without intersecting blockers.
9. Aggregate visible samples into visibility percentage, exposure length, and heatmap.

This is not a perfect physical simulation, but it is good enough for pre-flight QA and relative comparison.

### Creative Analysis Pipeline

For static creative:

1. User uploads an image.
2. Normalize to the target OOH aspect ratio.
3. Run OCR to extract text and estimate text boxes.
4. Count words and characters.
5. Estimate headline, logo, CTA, and QR-code regions.
6. Compute contrast between text and local background.
7. Simulate distance by downscaling and blurring the creative.
8. Score whether the main message remains readable at the expected viewing distance and exposure seconds.
9. Generate specific fixes: fewer words, larger CTA, higher contrast, bigger logo, move QR, simplify layout.

For DOOH/video creative:

1. Sample representative frames.
2. Run the same static checks per frame.
3. Penalize if critical text appears for too short a time.
4. Penalize rapid motion, low contrast, or multiple competing messages.

### Street View / Image Pipeline

Use Street View for a more intuitive audit:

1. Use Google Street View metadata to confirm pano availability and matched panorama location.
2. Capture or request Street View imagery for the chosen point and heading.
3. Ask the user to place the billboard/screen rectangle, or detect it later with CV.
4. Estimate visible billboard area, background clutter, environmental colors, competing signage, and obstruction.
5. Overlay A/B creative onto the rectangle.
6. Run readability and contrast checks in-context.

For the demo, manual rectangle placement is acceptable and probably better than spending too much time on detection.

### Attention Proxy Formula

Use an explainable formula rather than pretending to have official audience measurement:

```text
attention_proxy =
  visibility_rate
  * angle_quality
  * distance_readability
  * exposure_seconds_factor
  * creative_contrast
  * dwell_factor
  * clutter_penalty
  * obstruction_penalty
  * contextual_fit
```

Then scale to 0-100 for the Sightline Score.

### Data Sources By Maturity

Immediate / free or already in repo:

- Mapbox terrain and 3D map context.
- Overpass / OpenStreetMap buildings, roads, footpaths, transit stops, traffic signals, crossings, POIs, parks, trees, and greenery.
- Google Street View panorama lookup and imagery where available.
- User-uploaded creative.
- User-entered billboard dimensions and orientation.

Near-term paid/API:

- Mapbox or Google routing for likely approach paths.
- Traffic speed / road class data.
- Places APIs for richer POI context.
- OCR and vision APIs for faster creative analysis.
- Generated creative variants.

Later enterprise/partner:

- Official OOH inventory feeds.
- Media-owner availability and pricing.
- Geopath/Route/JCDecaux-style audience estimates.
- Mobile-location exposure data.
- Footfall and sales attribution.
- Proof-of-play and proof-of-posting integrations.

### What To Build First

The first technical milestone should be a deterministic scoring engine:

1. Define a `Placement` object: location, dimensions, height, heading, format.
2. Define a `CreativeAnalysis` object: OCR text, contrast, copy length, logo/CTA/QR regions.
3. Define a `ContextAnalysis` object: buildings, greenery, roads, POIs, Street View metadata.
4. Define a `SightlineScore` object with component scores and explanations.
5. Render component scores in the UI and produce a report-ready JSON response.

This keeps the product credible because every score can be explained and debugged.

## Personas And Demographics To Simulate

For OOH simulation, personas should be based first on movement behavior and dwell context, then on demographics. A 24-year-old office worker driving at 60 km/h and a 24-year-old office worker waiting at a bus stop behave very differently for visibility, readability, and QR scan probability.

### Core Simulation Attributes

Each simulated persona should have:

- Movement mode: walking, driving, ride-hail/passenger, cycling, transit waiting, mall browsing, queueing.
- Speed range: meters per second or km/h.
- Dwell probability: chance of stopping or waiting near the placement.
- Field of view: broad for pedestrians, narrower for drivers.
- Attention availability: high, medium, low.
- Phone distraction: low, medium, high.
- Ad tolerance: ignores most ads vs actively scans surroundings.
- CTA likelihood: chance to scan QR, search brand, remember offer, enter store, or share.
- Category affinity: fitness, food, retail, finance, travel, entertainment, healthcare, education, luxury.
- Time-of-day pattern: commute, lunch, evening, weekend, late night.
- Context fit: office, transit, mall, school, airport, residential, nightlife, highway.

### Priority Personas

| Persona | Why buyers care | Typical movement | What to simulate |
|---|---|---|---|
| Office commuter | High-value audience for finance, gyms, food, B2B, telco, retail | Fast walking, transit, ride-hail, driving | Morning/evening peaks, low dwell, repeated exposure, medium distraction |
| Transit rider | Strong for repeated exposure and local action | Waiting, walking through station, bus shelter dwell | High dwell, high QR feasibility, high frequency, route-based repetition |
| Driver | Important for roadside billboards, but limited readability time | 30-90 km/h depending road | Short exposure, narrow attention, no QR scan, huge text requirement |
| Ride-hail/taxi passenger | More attention than driver, valuable urban audience | Vehicle passenger, slower in dense areas | Side-window visibility, medium dwell in congestion, medium brand recall |
| Pedestrian shopper | Strong for retail, F&B, beauty, entertainment | Slow walking, browsing, stopping | High local conversion potential, high CTA/QR feasibility, high context sensitivity |
| Mall visitor | Strong for retail media and purchase intent | Slow walking, queueing, browsing | High dwell, high clutter, strong category/POI fit, impulse action |
| Tourist | Valuable for attractions, travel, luxury, F&B, payments | Slow walking, map/phone use, photos | High exploration but high phone distraction; language and landmark context matter |
| Student / young adult | Useful for education, tech, gaming, fashion, food, events | Campus walking, transit, mall, nightlife | High phone distraction, high social/QR response, price/promo sensitivity |
| Parent / family group | Useful for retail, groceries, healthcare, education, family entertainment | Slower walking, mall, school, car parks | Group movement, medium dwell, safety/clarity bias, lower QR urgency |
| Nightlife visitor | Useful for alcohol, events, ride-hail, food delivery, entertainment | Evening walking, ride-hail, queues | Low light, high dwell near venues, different creative tone, safety/compliance checks |
| Airport traveler | High value for travel, finance, luxury, telco, tourism | Queueing, wayfinding, long dwell | High dwell, luggage distraction, international demographics, premium inventory |
| Local resident | Useful for services, healthcare, groceries, real estate, political | Repeated neighborhood routes | Frequency, trust, local relevance, store-radius proximity |

### Demographic Segments To Keep

Use demographics as campaign filters, not as the main movement model:

- Age bands: 13-17, 18-24, 25-34, 35-44, 45-54, 55+.
- Income / purchasing power: student, mass market, upper-middle, affluent.
- Work status: student, office worker, shift worker, business traveler, homemaker, retiree.
- Household role: single, couple, parent with children, caregiver.
- Visitor status: local resident, domestic visitor, international tourist, business traveler.
- Language/culture context where relevant: especially for Singapore and tourist-heavy zones.

### Persona Metrics To Output

For each persona, output:

- Visible exposure count or proxy.
- Average exposure seconds.
- Attention-weighted exposure.
- Readability pass/fail.
- CTA/QR feasibility.
- Best approach path.
- Biggest blocker or penalty.
- Suggested creative adjustment for that persona.

Example: "Drivers fail CTA feasibility because exposure is 1.8s at 55 km/h; remove QR and increase headline size." This is more useful than generic demographic labels.

### MVP Persona Set

Start with five personas only:

1. Pedestrian commuter
2. Driver
3. Transit rider
4. Shopper / mall visitor
5. Tourist

These cover the biggest behavioral differences: speed, dwell, attention, QR feasibility, and repeated exposure.

## OOH Formats To Consider

The local `data/` folder currently has two levels of OOH format coverage:

- Raw scraped listings in `data/ooh-listings/` are mostly real public billboard listing anchors.
- Synthetic demo inventory in `data/ooh-demo/` expands those anchors into a broader format mix for UI, analytics, and simulation.
- Compact map points in `data/ooh-map/ooh-map-points.json` encode the demo formats as short media type codes.

### Formats Present In Current Data

The latest raw listing snapshot inspected had:

| Source | Format | Count |
|---|---:|---:|
| `data/ooh-listings/ooh-listings-2026-04-26T15-46-29-428Z.csv` | billboard | 103 |
| same | digital_billboard | 5 |
| same | ooh / unknown generic | 39 |

The 5k demo dataset inspected had:

| Demo format | Count | Default dimensions in generator | Simulation meaning |
|---|---:|---|---|
| billboard | 2,857 | 48 ft x 14 ft | Static roadside or large outdoor panel |
| digital_billboard | 595 | 48 ft x 14 ft | Roadside DOOH with shorter exposure and creative rotation |
| digital_screen | 319 | 6 ft x 3.5 ft | Place-based indoor/semi-indoor screen |
| street_furniture | 314 | 4 ft x 6 ft | Sidewalk panel, kiosk, column, small urban display |
| bus_shelter | 306 | 4 ft x 6 ft | Shelter poster or digital shelter panel with dwell |
| transit | 305 | 10 ft x 2.5 ft | Transit station, vehicle, platform, or corridor panel |
| mural | 304 | 60 ft x 30 ft | Wallscape, painted mural, large building face |

The compact map file uses these media type codes:

- `bb`: billboard
- `db`: digital_billboard
- `ds`: digital_screen
- `bs`: bus_shelter
- `sf`: street_furniture
- `tr`: transit
- `mu`: mural

### Recommended Product Taxonomy

Support these first because they map directly to current data:

1. Static billboard
2. Digital billboard
3. Bus shelter
4. Street furniture / kiosk / urban panel
5. Transit media
6. Wallscape / mural
7. Place-based digital screen

Then add later:

- Airport media
- Mall media
- Retail media network screens
- Office/elevator screens
- Campus media
- Taxi/rideshare tops
- Vehicle wraps
- Mobile LED trucks
- Cinema/gym/place-based screens
- Experiential pop-up or projection media

### Format-Specific Metrics

Each format should weight Sightline metrics differently:

| Format | Most important metrics | Less important / caution |
|---|---|---|
| Static billboard | readable distance, viewing angle, exposure seconds, obstruction, driver readability | QR scan usually weak unless pedestrian-facing |
| Digital billboard | readable distance, loop duration, animation legibility, brightness, road safety | Do not assume full creative exposure if screen rotates |
| Bus shelter | dwell, pedestrian visibility, QR feasibility, local POI fit, night lighting | Reach may be lower than roadside but attention quality can be high |
| Street furniture | pedestrian angle, clutter, proximity, CTA/QR feasibility | Small format means text and logo size matter heavily |
| Transit | dwell, frequency, wayfinding flow, crowd obstruction, repeated exposure | Creative may need fast comprehension in moving corridors |
| Wallscape / mural | landmark value, long-distance visibility, photo/share potential, obstruction | Production cost and approval complexity are higher |
| Digital screen | dwell, indoor context, content loop, glare/reflection, contextual fit | Official audience depends heavily on venue data |

### Current Code Gap

The dataset has seven media types, but `src/types/index.ts` currently models live placements as:

```ts
export type BillboardFormat = 'digital' | 'static' | 'poster' | 'wallscape'
```

That is fine for rendering a simple demo, but not precise enough for scoring. The scoring engine should introduce a normalized `OohMediaType` that matches the data:

```ts
type OohMediaType =
  | 'billboard'
  | 'digital_billboard'
  | 'bus_shelter'
  | 'street_furniture'
  | 'transit'
  | 'mural'
  | 'digital_screen'
```

Then map each `OohMediaType` to rendering style, dimensions, expected viewer mode, dwell assumptions, creative rules, and scoring weights.

## Recommended Demo Story

The demo should show that two sites with similar estimated reach can perform differently because one has poor angle, obstruction, visual clutter, or unreadable creative.

Suggested flow:

1. Select a real map/Street View location.
2. Place or detect a billboard/screen.
3. Upload Creative A and Creative B.
4. Run pre-flight analysis.
5. Show sightlines, visibility zones, obstruction warnings, readability distance, and attention score.
6. Explain why one creative/location wins.
7. Generate a client-ready recommendation report.

## Positioning

Best:

> Sightline is pre-flight QA for outdoor advertising. It helps brands and agencies catch bad placements and unreadable creative before they spend media budget.

Avoid:

> Sightline is the definitive ROI measurement platform for OOH.

That is not credible yet because campaign ROI requires post-flight exposure, control groups, attribution, sales, footfall, or survey data.

## Sources

- Geopath methodology: https://support.geopath.io/hc/en-us/articles/360001845811-Methodology
- Geopath measuring OOH audiences: https://support.geopath.io/hc/en-us/articles/360006652652-Geopath-Research-Methodology-Measuring-Out-of-Home-Audiences
- OAAA / Geopath / Ipsos modernization pilot: https://oaaa.org/news/ooh-industry-advances-effort-to-modernize-audience-measurement-and-selects-ipsos-for-pilot-program/
- AdQuick Analytics: https://www.adquick.com/analytics
- billups Analytics: https://www.billups.com/products/analytics
- billups Attention Dashboard: https://www.billups.com/products/billups-analytics/attention-dashboard
- Talon effectiveness and measurement: https://talonooh.com/services/effectiveness/
- Veridooh independent verification: https://www.veridooh.com/independent-verification
- Veridooh SmartCreative overview: https://www.veridooh.com/
- JCDecaux Singapore data-driven OOH: https://www.jcdecaux.com.sg/data-driven-ooh
- JCDecaux ONE Singapore: https://www.jcdecaux.com.sg/jcdecaux-one
- IAB DOOH Measurement Guide: https://www.iab.com/guidelines/dooh-measurement-guide/
- OAAA Measurement and Analytics Guide: https://oaaa.org/resources/ooh-measurement-analytics-guide/
- OUTFRONT creative best practices: https://www.outfront.com/resources/creative-best-practices
- Kinetic Sightline naming conflict: https://kineticww.com/sightline/
