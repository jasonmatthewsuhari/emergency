# OOH Market Research And Product Ideation

Research date: May 3, 2026  
Project: Sightline

## Executive Summary

The physical advertising and out-of-home (OOH) market is large, growing, and still operationally fragmented. The strongest product opportunity is not a generic billboard marketplace or programmatic DOOH exchange. Those layers already have mature and consolidating players.

The more interesting product direction is a futuristic pre-flight testing layer for physical ads: simulate, score, and improve creative and placements before brands spend money on real inventory.

Recommended product thesis:

> Sightline is a synthetic wind tunnel for physical ads. Brands can A/B test outdoor creative inside realistic 3D city environments using simulated pedestrian and driver agents before buying media.

## Market Snapshot

- U.S. OOH revenue reached a record $9.46B in 2025, up 3.6% year over year, according to OAAA.
- Digital out-of-home (DOOH) represented 36.3% of U.S. OOH revenue in 2025 and grew 10.5% year over year.
- Transit was the fastest-growing U.S. OOH segment in 2025, growing 9.2% annually.
- Global OOH is roughly a $50B+ market, with digital formats driving much of the growth.
- The market is not just roadside billboards. It includes billboards, transit, street furniture, airports, malls, retail/place-based media, gyms, offices, campuses, taxis/rideshare, vehicle wraps, and digital screens.

Key implication: this is a real market, but the software opportunity is not just "help people buy billboards." The market needs better planning, creative testing, trust, proof, and measurement.

## Market Structure

### Sellers

- Large OOH media owners: JCDecaux, Lamar, OUTFRONT, Clear Channel Outdoor.
- Transit authorities and transit media franchise holders.
- Airport, mall, retail, gym, office, campus, and place-based screen networks.
- Independent local billboard and static OOH operators.
- Landlords and property owners who lease surfaces or locations to media operators.

### Buyers

- National brands.
- Local services and SMBs.
- Multi-location retail, restaurants, QSR, gyms, healthcare, real estate, legal, financial services, telecom, entertainment, travel, and political advertisers.
- Agencies and OOH specialists.
- Digitally native brands looking for offline reach and brand salience.

### Intermediaries And Infrastructure

- OOH specialist agencies: Kinetic, Talon, Billups.
- Buyer-side platforms and marketplaces: AdQuick, OneScreen.ai, Blip, BillboardsIn.
- Programmatic DOOH platforms: Vistar, Broadsign, Hivestack, VIOOH, Place Exchange.
- Measurement and attribution vendors: Geopath, Ipsos, Veridooh, StreetMetrics, Reveal Mobile, InMarket.
- Media-owner software: Broadsign, Apparatix, Signkick, SignBird, BillboardPlanet.

## Workflow Pain Points

### Planning

OOH buying is still hard to compare across formats, locations, audience estimates, pricing, and campaign goals. Buyers want OOH to behave like part of an omnichannel plan, but the market still has inconsistent data and fragmented workflows.

Product opportunity:

- AI-assisted OOH planning from a business goal.
- Store-radius and competitor-based planning.
- Scenario comparison by city, audience, time of day, and creative strategy.

### Inventory Discovery

Inventory data is scattered across operators, PDFs, spreadsheets, marketplaces, maps, and programmatic pipes. Even when inventory exists, quality and availability can be unclear.

Product opportunity:

- Normalized inventory graph.
- Confidence-scored placements.
- Location quality and visibility scoring.
- API for inventory metadata, photos, specs, restrictions, rates, and availability.

### Booking And RFPs

Traditional OOH still uses RFPs, availability checks, manual proposals, contracts, insertion orders, creative deadlines, and posting instructions.

Product opportunity:

- Transaction layer for quote, hold, negotiate, approve, contract, pay, and track.
- Agency RFP copilot.
- Proposal automation for independent media owners.

### Creative Approval

OOH creative often fails because it is unreadable, too wordy, low contrast, wrong size, or non-compliant with venue/operator rules. Creative approval can slow campaign launch.

Product opportunity:

- Creative pre-flight checker.
- Readability scoring by distance, speed, viewing angle, and dwell time.
- Spec validation and automatic resizing.
- AI-generated creative improvements.

### Proof Of Performance

Buyers want proof that physical ads actually ran, were installed correctly, stayed visible, and were not obstructed or damaged.

Product opportunity:

- GPS/timestamped proof-of-posting.
- Computer vision for obstruction and condition checks.
- Client-ready proof reports.
- Delivery reconciliation and makegood detection.

### Measurement

OOH measurement is improving but still not fully standardized. Advertisers want transparent, comparable, and CFO-friendly reporting.

Product opportunity:

- Geo-holdout and incrementality planner.
- Footfall lift and store-visit reporting.
- QR, vanity URL, call tracking, search lift, and POS/GA4 integrations.
- Measurement designed before campaign launch, not just dashboards after the fact.

## Competitive Landscape

### Programmatic DOOH Platforms

Examples:

- Vistar Media
- Broadsign
- Place Exchange
- Hivestack
- VIOOH

These players handle programmatic pipes, DSP/SSP integrations, targeting, ad serving, delivery, reporting, and digital screen monetization. This layer is increasingly a scale and consolidation game.

Strategic read: do not compete head-on here at launch.

### OOH Marketplaces And Managed Buying

Examples:

- AdQuick
- OneScreen.ai
- Billups
- Blip
- BillboardsIn

These platforms help buyers plan, buy, and measure OOH campaigns. Some target enterprise and agencies, while others focus on self-serve local billboard buying.

Strategic read: a new generic marketplace is too hard because it needs supply liquidity, pricing, trust, and demand.

### Measurement And Verification

Examples:

- Geopath
- Ipsos
- Veridooh
- StreetMetrics
- Reveal Mobile
- InMarket

Measurement is crowded but still not solved. The gap is not "another analytics dashboard"; it is simple, explainable, pre-flight and post-flight decision support.

Strategic read: Sightline should make measurement visual, intuitive, and synthetic rather than claim perfect real-world attribution.

### Media-Owner Operating Software

Examples:

- Broadsign
- Apparatix
- Signkick
- SignBird
- BillboardPlanet

These tools support inventory, sales, proposals, booking, CMS, proof, and billing. Long-tail operators remain under-digitized.

Strategic read: viable business wedge, but less exciting as an initial demo than simulation and creative testing.

## Product Opportunities

### 1. Mass-Agent OOH Simulator

Simulate thousands of pedestrians, drivers, commuters, tourists, students, and shoppers moving through a 3D environment. Test how different ads perform based on visibility, attention, context, dwell time, and agent relevance.

Core outputs:

- Viewable impressions.
- Attention-weighted impressions.
- Average exposure duration.
- Recall likelihood.
- CTA readability.
- QR scan propensity.
- Heatmap of where agents noticed the ad.
- Winner explanation for A/B creative tests.

Why it is a strong product direction:

- Highly visual.
- Innovative.
- Does not require real media-owner integrations.
- Clear value proposition.
- Connects directly to a real industry pain: physical ads are expensive and hard to test before launch.

### 2. Billboard Vision Auditor

Upload a street image or 3D scene and score a billboard or poster location for real-world visibility.

Scoring factors:

- Distance.
- Viewing angle.
- Obstruction.
- Clutter.
- Contrast.
- Dwell context.
- Pedestrian or vehicle speed.
- Competing signage.

Output:

- Sightline Score.
- Visibility heatmap.
- Creative improvement recommendations.
- Before/after creative mockup.

### 3. Creative QA And Readability Engine

Upload OOH creative and test whether it will work in a physical environment.

Checks:

- Copy length.
- Font size.
- Contrast.
- CTA clarity.
- Logo visibility.
- Distance readability.
- Driver vs pedestrian readability.
- Format compliance.
- Dwell-time fit.

### 4. OOH Measurement Planner

Before campaign launch, design a measurement plan based on the campaign objective.

Capabilities:

- Test/control geography recommendation.
- QR and landing-page setup.
- Call tracking and promo code tracking.
- Store-radius planning.
- Post-campaign narrative generation.

### 5. Independent Media Owner Revenue OS

More practical SaaS direction for a future phase.

Capabilities:

- Inventory CRM.
- Availability calendar.
- Rate cards.
- Proposal builder.
- Contracts.
- Proof-of-posting.
- Billing and QuickBooks sync.
- Marketplace syndication.

## Recommended Product Concept

Build:

> A mass-agent OOH simulator for A/B testing physical advertisements in real city-based 3D environments.

Positioning:

> Sightline lets brands test outdoor ads in a simulated city before spending thousands on real placements.

Demo flow:

1. Choose an environment archetype: downtown street, highway, subway platform, mall corridor, university campus, airport concourse, or shopping district.
2. Upload or generate Creative A and Creative B.
3. Place the ads on a billboard, bus shelter, wall mural, kiosk, or digital screen.
4. Spawn thousands of synthetic agents with different routes, speeds, attention spans, and personas.
5. Run the simulation.
6. Show visibility rays, attention heatmaps, and agent movement.
7. Compare A vs B on attention-weighted impressions, exposure time, readability, recall, and CTA comprehension.
8. Use AI to explain why one creative won and generate an improved version of the loser.

## Simulation Model

The model should be explainable rather than pretending to be perfect attribution.

Example scoring formula:

```text
Attention Score =
  visibility_seconds
  x frontal_angle_factor
  x distance_readability_factor
  x creative_contrast_factor
  x clutter_penalty
  x dwell_context_factor
  x agent_relevance_score
  x distraction_penalty
```

Agent attributes:

- Persona: commuter, tourist, student, shopper, driver, nightlife visitor.
- Route.
- Speed.
- Field of view.
- Dwell behavior.
- Phone distraction level.
- Intent category.
- Affinity to advertiser category.
- Probability of noticing high-contrast ads.
- Probability of scanning a QR code if walking slowly.

Environment archetypes:

- Highway.
- Dense downtown intersection.
- Subway or transit platform.
- Shopping street.
- University campus.
- Mall corridor.
- Airport concourse.

## MVP Scope

Avoid full city reconstruction. Use stylized but credible 3D archetypes.

Minimum viable build:

- 3D scene with one or more ad placements.
- Upload or generate two creatives.
- Procedural agent movement.
- Visibility and attention scoring.
- Heatmap visualization.
- A/B result dashboard.
- AI-generated explanation and creative recommendations.

Nice-to-have:

- Weather/time-of-day toggle.
- Persona targeting.
- QR readability estimate.
- Auto-generated improved creative.
- Exportable campaign report.

## Risks And How To Frame Them

Risk: judges may challenge whether the simulator is accurate.

Response:

- Frame it as synthetic pre-flight testing, not guaranteed attribution.
- The product compares relative creative and placement performance.
- It helps teams catch obvious mistakes before spend: unreadable copy, bad contrast, poor placement, short dwell time, bad CTA, or wrong audience context.

Risk: real-world OOH performance depends on proprietary data.

Response:

- The MVP uses explainable heuristics.
- Future versions can ingest real traffic counts, Geopath-style impression estimates, mobile location data, sales data, and media-owner inventory.

Risk: full city simulation is too large.

Response:

- Use environment archetypes first.
- Add real-world city/digital twin support later.

## Business Direction

If the simulator lands well, the commercial path could be:

1. Creative pre-flight tool for agencies and brands.
2. Placement quality scoring API for OOH marketplaces.
3. Campaign planning simulator for multi-location brands.
4. Proof and measurement layer for post-campaign reporting.
5. Inventory intelligence platform combining real OOH supply with synthetic performance testing.

## Source Links

- OAAA annual and quarterly revenue: https://oaaa.org/resources/annual-quarterly-revenue/
- OAAA 2025 OOH display counts PDF: https://oaaa.org/wp-content/uploads/2025/12/OOH-DISPLAYS-YEAR-END-2025.pdf
- IAB DOOH measurement article: https://www.iab.com/blog/cracking-the-code-of-dooh/
- Geopath and OAAA measurement modernization: https://blog.geopath.org/2026/03/31/ooh-industry-advances-effort-to-modernize-audience-measurement-and-selects-ipsos-for-pilot-program/
- Broadsign acquisition of Place Exchange: https://broadsign.com/blog/broadsign-announces-acquisition-of-place-exchange/
- AdQuick platform: https://www.adquick.com/
- AdQuick media-owner tools: https://www.adquick.com/media-owners
- Blip self-serve billboard platform: https://www.blipbillboards.com/
- Vistar programmatic marketplace: https://www.vistarmedia.com/programmatic-marketplace
- Hivestack acquisition by Perion: https://perion.com/press/perion-acquires-hivestack-a-leading-global-full-stack-digital-out-of-home-dooh-platform/
- VIOOH: https://www.viooh.com/
