# HeatWatch frontend design references: climate / heatwave dashboard design and tooling (late 2026)

Research date: 2026-11-02. Package versions were read directly from the npm registry `/<pkg>/latest` endpoint on that date (for example https://registry.npmjs.org/recharts/latest). Several primary pages were unreachable or unreadable (IMD PDF is compressed, Climate Pulse is JS-rendered, showyourstripes FAQ returned 404). Those gaps are marked below.

## 1. Reference products: layout patterns, KPI cards, map treatments, typography, color

### Takeaway
The strongest public climate tools (Copernicus Climate Pulse, show-your-stripes, Windy/Ventusky) share one pattern: a single dominant visual (a map or one hero chart), a short headline that states variable, baseline and source, a few toggles (variable / absolute vs anomaly / time scale), and one continuous color legend placed next to the map. For HeatWatch, that means a map-first overview page with a slim KPI strip, not a grid of a dozen equal-weight cards.

### Cited Findings
- Climate Pulse (C3S/ECMWF) is a free web app that shows global surface air and sea-surface temperature in near real time, derived from ERA5 reanalysis. It shows absolute values and anomalies as maps or graphs, lets users compare years and regions, and has an archive of daily, monthly and annual maps — [PreventionWeb / C3S](https://www.preventionweb.net/news/climate-pulse-c3ss-new-tool-monitor-state-our-climate-glance); [C3S announcement](https://climate.copernicus.eu/climate-pulse-c3ss-new-tool-monitor-state-our-climate-glance)
- Climate Pulse controls as rendered in 2026: Air temperature / Sea temperature variable toggles; an Absolute / Anomalies toggle for each variable; Daily (from 2023), Monthly (from 1979) and Annual (1979–2025) time-scale selectors. The main area is a globe map with a title ("Surface air temperature anomaly"), baseline ("1991-2020"), source ("ERA5"), the date, and a horizontal color-scale legend below it. Top navigation is minimal (About, FAQs, Credits, Changelog) — [pulse.climate.copernicus.eu](https://pulse.climate.copernicus.eu/)
- Climate Pulse's daily global temperature chart puts the current year against the prior year, with the 1940–2022 range drawn in grey. Preliminary data points are labeled as preliminary (for example 21 July 2024, the record day) — [Sofia Globe reporting C3S](https://sofiaglobe.com/2024/07/23/copernicus-climate-change-service-new-record-daily-global-average-temperature-reached-in-july-2024/)
- Climate Pulse was designed for a broad audience and for journalists, with easy downloads of the latest data — [PreventionWeb](https://preventionweb.net/quick/83568); [ECMWF](https://www.ecmwf.int/node/29011)
- Climate Pulse is listed in the Information is Beautiful Awards showcase — [IIB Awards](https://www.informationisbeautifulawards.com/showcase/7204-climate-pulse)
- Derivative dashboards built on the same ERA5 data (The Climate Brink) use climate-stripes charts of daily temperature anomalies against preindustrial levels — [C3S: data powers new dashboard](https://climate.copernicus.eu/c3s-data-powers-new-global-temperature-dashboard)
- Datawrapper (Lisa Charlotte Muth) guidance: colors in a gradient should communicate that a value is a bit higher or lower than its neighbor, and sequential palettes suit low-to-high data and should darken in even steps — [Datawrapper colorguide](https://www.datawrapper.de/blog/colorguide); [Datawrapper palette tool docs](https://www.datawrapper.de/docs/how-to-use-the-color-palette-tool)
- Datawrapper has a dedicated post on choosing a data-vis background color, relevant to the "light neutral background" spec — [Datawrapper blog](https://blog.datawrapper.de/background-color-of-data-visualizations)
- Datawrapper's style-guide post covers sequential/diverging gradients, categories, greys and map elements — [Colors for data vis style guides](https://www.datawrapper.de/blog/colors-for-data-vis-style-guides)

### Inferences
- These points come from general product familiarity, not from a page fetched in this session. Treat them as design observations, not citations. Windy.com and Ventusky use a full-bleed map with floating translucent control panels, a timeline scrubber along the bottom, and a vertical or horizontal legend docked to an edge. That works for a "map is the app" mode, but on a light theme HeatWatch should borrow only the timeline scrubber (for the history explorer and day selection) and the docked legend.
- Recommended HeatWatch overview layout, based on the Climate Pulse pattern:
  - Header line: "Daily max temperature · IMD gridded 1°/0.25° · 14 May 2024 · baseline 1991–2020". Use the grid resolution of the dataset actually used.
  - KPI strip of 4 cards: hottest station (value + name + band chip), number of stations in Heatwave/Severe, largest departure from normal, data freshness. Each card has the value in large tabular numerals, a small delta vs yesterday, and a 7-day sparkline.
  - A map that takes about 60% of the width, with a ranked station list beside it, and a trend chart below.
- Typography (inference): one neutral grotesk for the UI (Inter, Geist, or IBM Plex Sans), with `font-variant-numeric: tabular-nums` on every number so tickers and tables don't jitter. Optionally use a monospace (Geist Mono or IBM Plex Mono) for coordinates and timestamps. Bundle fonts locally (for example with `@fontsource/*`) to meet the offline requirement.
- To read as distinctive, add one or two signature visuals that generic admin templates lack: a warming-stripes band for each station (Climate Brink / show-your-stripes idiom), and a "this year vs range of past years" grey-envelope chart (Climate Pulse idiom).

### Gaps
- Climate Pulse is JS-rendered, so its fonts, exact palette and KPI styling could not be extracted.
- No Dribbble, Behance or Awwwards pages were fetched (budget limit), so no specific concept shots can be cited.
- No IMD heat portal UI was inspected. NASA Worldview, Open-Meteo, Climate Reanalyzer and Our World in Data were not fetched this session.

## 2. Heat color ramps, warning bands, accessibility, and IMD criteria for band labels

### Takeaway
Use two separate color systems. (a) A continuous, perceptually uniform sequential ramp (YlOrRd, inferno/magma, or cmocean thermal) for temperature values on the map and heatmaps. (b) A small discrete set of band colors tied to IMD's official categories, always shown with a text label and an icon or pattern. The IMD thresholds, from the official IMD definition PDF as quoted in search results: heatwave at ≥40 °C plains (≥30 °C hills, ≥37 °C coastal), departure +4.5 to +6.4 °C, severe above +6.4 °C, or actual max ≥45 °C (heatwave) and ≥47 °C (severe).

### Cited Findings
- IMD heatwave definition (official PDF, quoted via search):
  - A heatwave is considered when a station's max reaches at least 40 °C in the plains or at least 30 °C in hilly regions.
  - Departure-based: Heat Wave if the departure from normal is 4.5 to 6.4 °C; Severe Heat Wave if it is above 6.4 °C.
  - Actual-max-based: Heat Wave if the max is ≥45 °C; Severe if ≥47 °C.
  - Coastal: Heat Wave may be described if the departure is ≥4.5 °C and the actual max is ≥37 °C.
  - Declaration: the criteria must be met at ≥2 stations in a meteorological sub-division for at least two consecutive days, and the heatwave is declared on the second day.
  - Source: [IMD Definition.pdf](https://mausam.imd.gov.in/pdfs/heatcolduser/Definition.pdf). The PDF text itself could not be decompressed in this session; the quotes come from the search engine's extraction of it.
- Secondary sources disagree on the severe cutoff. Some state ">6.4 °C" ([Officers Pulse](https://officerspulse.com/?p=29813)), others "≥6.5 °C" ([Ananta IAS](https://anantamias.com/heat-wave-india/?pdf=1)). These are the same boundary at 0.1 °C rounding. Use IMD's ">6.4 °C" wording. The brief's "+6.5" is effectively equivalent.
- One secondary source claims a three-day persistence rule ([IAS Gyan](https://www.iasgyan.in/daily-current-affairs/heatwave)). Other sources, and IMD, say two days.
- IMD/NDMA impact-based color warnings run Green → Yellow → Orange → Red:
  - Green: normal, no action.
  - Yellow: heat alert / watch; heatwave in isolated pockets.
  - Orange: severe heat alert / be prepared; issued when severe heatwave persists for 2 days, or a heatwave persists for 4+ days.
  - Red: extreme heat alert / take action; issued when severe heatwave persists for more than 2 days, or total heat/severe-heat days exceed 6.
  - A 2019 report used "amber" instead of orange. Day-count thresholds vary between articles.
  - Sources: [OneIndia explainer](https://www.oneindia.com/india/explained-when-is-a-heatwave-declared-and-what-do-imd-s-colour-warnings-mean-3402305.html); [Citizen Matters](https://citizenmatters.in/explainer-imd-heat-wave-data-alerts-wet-bulb-temperatures); [Outlook India](https://www.outlookindia.com/national/mercury-soars-over-46-degrees-all-you-want-to-know-about-heatwaves)
- IMD heat products use only temperature, not wet-bulb temperature — [Citizen Matters](https://citizenmatters.in/explainer-imd-heat-wave-data-alerts-wet-bulb-temperatures)
- Matplotlib: "a perceptually uniform colormap is the best choice; i.e. a colormap in which equal steps in data are perceived as equal steps in the color space". Lightness changes are perceived as data changes much better than hue changes, so monotonically increasing L* is preferred. Its perceptually uniform sequential set is viridis, plasma, inferno, magma, cividis. Monotonic-L* maps print reasonably in grayscale. The most common color-vision deficiency is red–green, so "avoiding colormaps with both red and green will avoid many problems" — [Matplotlib: Choosing colormaps](https://matplotlib.org/stable/users/explain/colors/colormaps.html)
- cmocean `thermal` is sequential: "dark blue representing lower, cooler values and transitioning through reds to yellow representing increased warmer values". cmocean maps were "adjusted using the viscm tool to be perceptually uniform" and chosen to be intuitive for the variable they represent. cmocean's `haline` is documented as grayscale-friendly and colorblind-viewable, but the same evaluation is not shown for `thermal` on that page — [cmocean docs](https://matplotlib.org/cmocean/)
- Datawrapper: a sequential gradient should darken in even steps — [Datawrapper docs](https://www.datawrapper.de/docs/how-to-use-the-color-palette-tool)

### Inferences
- Recommended band scheme for HeatWatch. It is derived from the IMD criteria above; the band names are a project design choice, not IMD's.
  | Band (label shown in UI) | Rule (daily Tmax, plains station) | Suggested color (ColorBrewer YlOrRd-derived) | Icon |
  |---|---|---|---|
  | Normal | Tmax < 40 °C, or departure < 4.5 | neutral slate/teal-grey (not green, which keeps the red–green clash out of the heat ramp) | `circle-check` |
  | Watch | Tmax ≥ 40 °C but departure < 4.5 (hot, not yet heatwave) | yellow-amber, e.g. `#FED976` fill with dark text | `eye` |
  | Heatwave | departure 4.5–6.4 °C, or Tmax ≥ 45 °C | orange `#FD8D3C` / `#F97316` | `thermometer-sun` |
  | Severe heatwave | departure > 6.4 °C, or Tmax ≥ 47 °C | red `#E31A1C` | `flame` / `triangle-alert` |
  | (optional) Extreme | ≥ 2 consecutive Severe days | deep red `#800026` with white text | `siren` |
  - The hex values are the standard ColorBrewer 9-class YlOrRd stops (#ffffcc #ffeda0 #fed976 #feb24c #fd8d3c #fc4e2a #e31a1c #bd0026 #800026) from [colorbrewer2.org](https://colorbrewer2.org/#type=sequential&scheme=YlOrRd&n=9). Re-verify them on the site, which was not fetched this session.
  - Add a "Coastal" or "Hill" rule variant if any of the 15 stations are coastal (37 °C threshold) or hilly (30 °C threshold).
- Never encode band by color alone. Use a chip that has an icon, the label text ("Severe heatwave") and the value. On the map, also vary the marker: a larger radius or a double ring for higher bands, so the bands survive grayscale and CVD viewing. Simulate deuteranopia and protanopia in Chrome DevTools (Rendering → Emulate vision deficiencies).
- Use the continuous ramp (YlOrRd or `d3.interpolateInferno` / `interpolateMagma` from d3-scale-chromatic) only for continuous encodings: calendar heatmap cells, IDW/grid shading, stripes. Use a diverging blue–white–red ramp (ColorBrewer RdBu reversed) for departure-from-normal and warming stripes, because anomalies have a meaningful zero.
- Keep the teal primary for chrome only (nav, buttons, focus rings, selected state), so it never competes with the heat colors.
- Check that text on band chips meets WCAG 2.x 4.5:1 contrast. Dark text works on yellow and orange; white text on red or deep red.

### Gaps
- The IMD PDF text could not be read directly (compressed streams, no poppler). The thresholds come from the search engine's extraction of the official PDF, cross-checked against several secondary sources.
- The official IMD hex values for Green/Yellow/Orange/Red were not found.
- The show-your-stripes methodology (palette source, number of colors, licence) could not be retrieved: the FAQ returned 404 and the homepage was JS-only.
- The ColorBrewer site and the cmocean license (GitHub repo) were not fetched.

## 3. Map library for an offline India map (~15 markers + graph edges)

### Takeaway
For roughly 15 points, edges and a hot-region hull, a custom SVG map built with d3-geo projecting a bundled TopoJSON/GeoJSON India outline is the best fit. It is fully offline, has no tile server, works natively with React 19, is fully stylable with Tailwind/CSS tokens, makes edges and connected-component highlighting trivial, and is small. MapLibre GL 6 + PMTiles is the "real map" alternative if zoomable detail is wanted, but it is heavier and complicates offline packaging. react-leaflet 5 requires React 19 and works offline only with a GeoJSON layer and no tiles.

### Cited Findings
- Current versions (npm registry, 2026-11-02): leaflet 1.9.4; react-leaflet 5.0.0 (peerDeps react ^19.0.0, react-dom ^19.0.0, leaflet ^1.9.0); maplibre-gl 6.16.0; react-map-gl 8.1.3; pmtiles 4.5.0; deck.gl 9.4.1; d3-geo 3.1.1; topojson-client 3.1.0 — [npm registry](https://registry.npmjs.org/react-leaflet/latest)
- react-leaflet is described as the lighter, simpler option with a gentle learning curve. Offline is not built in; community projects pair it with the Leaflet.Offline plugin to cache tiles — [pkgpulse comparison 2026](https://www.pkgpulse.com/guides/mapbox-vs-leaflet-vs-maplibre-interactive-maps-2026); [offline-map-react on npm](https://npmjs.com/package/offline-map-react)
- MapLibre GL is strong for vector tiles and custom styling, and is free for commercial use without usage pricing. Offline support needs extra work or third-party tooling — [pkgpulse](https://www.pkgpulse.com/guides/mapbox-vs-leaflet-vs-maplibre-interactive-maps-2026); [DigitalThrive comparison](https://www.digitalthriveai.com/en-us/resources/web-development/react-map-library-comparison/). Both are secondary guides.
- PMTiles + MapLibre:
  - `npm install pmtiles`; the library includes a MapLibre plugin using `addProtocol`.
  - Register `maplibregl.addProtocol("pmtiles", protocol.tile)` once (in React, in a root effect with cleanup).
  - Point the source at `pmtiles://https://.../file.pmtiles`; min and max zoom are derived automatically.
  - Protomaps is released under BSD and ODbL licenses.
  - The docs page fetched does not explicitly cover serving the file from a local static path.
  - Source: [Protomaps PMTiles for MapLibre](https://docs.protomaps.com/pmtiles/maplibre)
- India boundary data:
  - Survey of India published official external boundaries of India for public download in 2018 ([thejeshgn](https://thejeshgn.com/2018/11/15/download-official-external-boundaries-of-india-by-survey-of-india/)).
  - SOI's vector-format note describes a free 1:15M outline with a disclaimer, but no explicit licence ([SOI ibd-vectorformat.pdf](https://Surveyofindia.gov.in/documents/ibd-vectorformat.pdf)).
  - DataMeet threads discuss SOI boundaries including updated J&K and Ladakh UTs ([DataMeet group](https://groups.google.com/g/datameet/c/gRRSDXDiEeY/m/awjOutaEAgAJ); [DataMeet group 2](https://groups.google.com/g/datameet/c/1o1Avz434Ck/m/Zx6M9-lEAwAJ)).
  - Community GeoJSON collections: [india-geodata](https://yashveeeeeer.github.io/india-geodata) lists SOI, OSM and composite national polygon variants; [Tanmay53/india-state-boundries-geojson](https://github.com/Tanmay53/india-state-boundries-geojson); [udit-001/india-maps-data](https://github-redirect.dependabot.com/udit-001/india-maps-data); [datta07/INDIAN-SHAPEFILES](https://github.com/datta07/INDIAN-SHAPEFILES).
  - The Esri India Living Atlas also serves admin boundaries ([Esri IND_AdminBoundary](https://livingatlas.esri.in/server/rest/services/LivingAtlas/IND_AdminBoundary/MapServer)).

### Inferences
- Why d3-geo SVG wins for HeatWatch:
  1. It is fully offline. One bundled `india.topo.json` (about 50–200 KB after simplification with mapshaper) and no tiles.
  2. Stations, k-nearest or distance-threshold edges (`<line>` or geodesic `<path>`) and connected-component hulls (`d3-polygon` `polygonHull`, or a padded convex hull) are plain SVG elements controlled by React state, so hover, selection and animation are easy.
  3. Use `geoMercator().fitSize()` or `geoConicConformal` with India-appropriate parallels.
  4. Optional IDW or grid shading underneath can be a `<canvas>` or `<image>` layer.
  5. Styling uses CSS variables, so light and dark themes come for free.
  6. Add zoom with `d3-zoom` if needed.
- Use a boundary that matches the Government of India's official depiction, such as a SOI-derived or DataMeet composite file. Faculty in India may notice an international-boundary depiction from Natural Earth or default OSM. Add an attribution and disclaimer line in the footer.
- MapLibre 6 + PMTiles is the stretch option:
  - Serve an India-extract `.pmtiles` from Vite's `public/` and reference it as `pmtiles://` plus the absolute local URL.
  - Glyphs/fonts and sprites must also be bundled locally, or labels fail offline.
  - Bundle cost is about 800 KB+ of JS. Dataset licence: ODbL (OSM attribution required).
- deck.gl 9.4 is overkill for 15 points. Use it only if the IMD grid needs GPU rendering as a heatmap.
- react-leaflet 5 is fine if the team knows Leaflet: use `<MapContainer>` with no `<TileLayer>`, `<GeoJSON>` for the India outline, `<CircleMarker>` for stations and `<Polyline>` for edges. Leaflet's default chrome looks dated unless restyled, though.

### Gaps
- Leaflet 2.0's status (alpha/beta vs stable) in late 2026 was not checked; npm `latest` is still 1.9.4.
- The SOI download licence terms remain unclear; no explicit licence was found.
- Local-file PMTiles offline usage is not explicitly documented on the fetched page.

## 4. Chart library choice

### Takeaway
Recharts 3 (via shadcn/ui's Chart component) is the pragmatic default for line, area, bar and distribution charts in a Tailwind/shadcn stack: React 19 compatible and themed through CSS variables. Add a small custom SVG/d3-scale component for warming stripes and the calendar heatmap; both are trivial rects. ECharts 6 (via echarts-for-react) is the richest single library for calendar heatmaps, large time series and dataZoom brushing, but it is canvas-themed and harder to make look "shadcn-native".

### Cited Findings
- Versions and peer dependencies (npm registry, 2026-11-02):
  - recharts 3.10.1 (peer react ^16.8 through ^19, react-is, react-dom)
  - @visx/xychart 4.0.0 (peer react ^18 or ^19, @react-spring/web ^9.7.5 or ^10)
  - echarts 6.1.0
  - echarts-for-react 3.0.6 (peer echarts ^3–^6, react >=16)
  - @nivo/core 0.99.0 (peer react ^16.14 through ^19)
  - @observablehq/plot 0.6.17
  - Source: [npm registry](https://registry.npmjs.org/recharts/latest)
- shadcn/ui Chart:
  - "We use Recharts under the hood", and "The chart component now uses Recharts v3".
  - Colors come from CSS variables `--chart-1…` defined in `:root` and `.dark` (oklch examples), referenced as `var(--chart-1)`, not `hsl(var(--chart-1))`.
  - Keep a height, `min-h-*` or `aspect-*` on `ChartContainer`.
  - `accessibilityLayer` adds keyboard and screen-reader support.
  - Source: [ui.shadcn.com/docs/components/chart](https://ui.shadcn.com/docs/components/chart)
- ECharts 6 changed the default color scheme and theme design ("many optimizations in color schemes and theme design"), moved the default legend to the bottom, and enables axis-label overlap prevention by default — [ECharts v6 upgrade guide](https://echarts.apache.org/handbook/en/basics/release-note/v6-upgrade-guide/)
- shadcn chart example galleries and Recharts-based blocks — [shadcn.io chart examples](https://www.shadcn.io/chart-examples); [ReUI chart patterns](https://reui.io/patterns/chart)

### Inferences
- Suggested mapping:
  - Trend charts (station Tmax vs normal, ± band): Recharts `ComposedChart` with an `Area` for the normal range, a `Line` for the observed value, `ReferenceLine` at 40/45/47 °C labeled with band names, and `ReferenceArea` shading heatwave days.
  - Prediction: Recharts `Area` for the prediction interval plus a dashed `Line` for the forecast, with a "Forecast" label and a vertical "today" `ReferenceLine`.
  - Warming stripes and calendar heatmap: custom SVG with `d3-scale` and `d3-scale-chromatic` (`scaleSequential(interpolateYlOrRd)` / `scaleDiverging(interpolateRdBu)`). That is under 100 lines, fully themable, and accessible with `<title>` per cell.
  - Distribution: a Recharts histogram (`BarChart`), or Observable Plot `Plot.rectY(Plot.binX())` if a box or violin plot is wanted. Plot renders to plain SVG, so it can be wrapped in a `useEffect` ref.
- Choose ECharts instead if the team wants a single library for everything, including calendar heatmap, `dataZoom` brushing on long histories and visualMap legends. Cost: about 1 MB unminified unless you use modular imports (`echarts/core`).
- Nivo (0.99, still pre-1.0) has a good `@nivo/calendar`, but its theming is separate from Tailwind. visx 4 is lowest-level and most custom; choose it only if the team is comfortable with d3.

### Gaps
- The ECharts 6 "New Features" page (calendar/matrix coordinate, dark mode details) and the release date were not fetched.
- The Recharts 3 migration-guide specifics were not fetched.

## 5. Dashboard UI kits and templates

### Takeaway
Use shadcn/ui (copy-in components on Radix primitives, Tailwind v4, CSS-variable theming) as the base, and borrow Tremor's dashboard block patterns (KPI cards, bar lists, trackers), which are now free and MIT under Vercel. Avoid the `@tremor/react` npm package, which still declares React 18 only.

### Cited Findings
- Vercel acquired Tremor in January 2025. All Tremor products, including Blocks, are now free and open source under MIT. Tremor is built on React, Tailwind CSS and Radix — [Vercel blog](https://vercel.com/blog/vercel-acquires-tremor)
- `@tremor/react` latest is 3.18.7 with peerDependency `react ^18.0.0`, which is not React 19 — [npm registry](https://registry.npmjs.org/@tremor/react/latest)
- Tremor's install guide relies on a `cx` helper using tailwind-merge. No official Tremor statement on Tailwind v4 was found — [Tremor docs](https://www.tremor.so/docs/getting-started/installation/next)
- Other versions (npm, 2026-11-02): tailwindcss 4.3.3; react 19.3.1; lucide-react 1.66.0; motion 14.9.0; @number-flow/react 0.6.2 — [npm registry](https://registry.npmjs.org/tailwindcss/latest)
- Creative Tim offers 103+ shadcn admin blocks (KPI/stat cards, Recharts charts, data tables, sidebars) installable via the shadcn CLI — [Creative Tim blocks](https://www.creative-tim.com/ui/blocks/application-admin)

### Inferences
- Concrete shadcn pieces for the spec:
  - `Sidebar` (collapsible to an icon rail on desktop; becomes a `Sheet` drawer on mobile, matching the "compact sidebar / collapsible nav" requirement)
  - `Card`, `Badge` (band chips), `Tabs`, `Select`, `Calendar` and `Popover` (date picker for the history explorer)
  - `Tooltip`, `Skeleton`, `Sonner` toasts (alerts), `Table` (alerts and history)
- The shadcn "dashboard-01" block is the obvious starting layout: a sidebar, a 4-card KPI row, an interactive area chart, and a data table. Restyle it with the teal primary.
- Copy patterns from Tremor Blocks (source on GitHub, MIT) rather than the package: KPI card with a sparkline, `Tracker` (one colored bar per day, which works as a "last 30 days band history" strip per station), and `BarList` (ranked hottest stations).
- Theme tokens (Tailwind v4 `@theme`): `--background` warm neutral (e.g. oklch ~0.985 0.003 90), `--primary` deep teal (e.g. oklch ~0.45 0.08 195, close to #0F766E Tailwind teal-700), `--band-normal/watch/heatwave/severe/extreme`, `--chart-1..5` with teal and slate for non-heat series.

### Gaps
- shadcn's own Tailwind v4 / React 19 upgrade notes and the current dashboard block list were not fetched directly.

## 6. Microinteractions and motion

### Takeaway
Premium-feeling but quiet motion means: animated number transitions on KPI values, skeletons that match final layout during data load, a clear data-freshness/stale badge, gentle map-marker pulse only for Severe stations, and respecting `prefers-reduced-motion`.

### Cited Findings
- `@number-flow/react` 0.6.2 (animated number transitions) and `motion` 14.9.0 (formerly Framer Motion) are current on npm — [npm registry](https://registry.npmjs.org/@number-flow/react/latest)
- shadcn includes `Skeleton`, and charts must keep explicit height/aspect on `ChartContainer` to size on first render. Fixed-height containers also prevent layout shift — [shadcn chart docs](https://ui.shadcn.com/docs/components/chart)
- Climate Pulse explicitly labels preliminary data (for example "data for 21 July 2024 is preliminary"), a precedent for data-status badges — [Sofia Globe / C3S](https://sofiaglobe.com/2024/07/23/copernicus-climate-change-service-new-record-daily-global-average-temperature-reached-in-july-2024/)

### Inferences
- Microinteraction list (durations 150–300 ms, ease-out):
  1. KPI values animate with NumberFlow or a 600 ms count-up on first load and day change, using tabular numerals.
  2. Skeleton cards and a map placeholder (India outline in grey) while JSON loads.
  3. A data-freshness badge in the header, e.g. "Data through 14 May 2024 · IMD gridded". Turn it amber with a clock icon and the text "Stale: 3 days old" when the latest date lags. In offline mode show "Offline · cached data".
  4. A soft 2 s pulsing ring only on Severe/Extreme station markers, disabled under `prefers-reduced-motion`.
  5. Hover on a station highlights its edges and component, dims the others to about 30% opacity, and syncs the highlight with the list row and the chart line (linked brushing).
  6. A date scrubber (slider) in the history explorer that smoothly recolors markers via CSS transitions on `fill`.
  7. Band changes trigger a Sonner toast, e.g. "Delhi entered Severe heatwave (47.2 °C)", with an icon and text, never color alone.
  8. View transitions between routes: `motion` layout animations, or the browser View Transitions API.
- Avoid continuous looping animations, parallax, and animated gradients. They read as template-y and distract from data.

### Gaps
- No primary design-system source (Material/Carbon motion specs) was fetched this session to cite specific duration guidance; the durations above are conventional values.
