// ============================================================
// WORLD MAP — v0.7a "Pass 2a"
// ============================================================
//
// Hand-drawn world map using SVG paths for continent silhouettes, plus
// per-country markers placed at real lat/lng (roughly) converted to the
// SVG coordinate space. This avoids the weight and styling conflicts
// of react-simple-maps while keeping the parchment aesthetic intact.
//
// COORDINATE SYSTEM
// viewBox is 0 0 1400 700. We treat this as a simple equirectangular
// projection: longitude -180..+180 maps to x=0..1400, latitude +90..-90
// maps to y=0..700. The helper `project` below handles the math, but
// the continent paths below are hand-tuned, not derived.
//
// COUNTRY DATA
// Each country has:
//   - name, flag, gdp, growth: same as WORLD_GDP_2026 in extras.js
//   - lat, lng: center point (approximately geographic centroid)
//   - playable: whether the country has a full region breakdown available
//   - internalKey: if playable, the key into COUNTRIES in countries.js
//   - summary: one-sentence economic flavor for the info panel
// ============================================================

export function project(lat, lng) {
  const x = ((lng + 180) / 360) * 1400;
  const y = ((90 - lat) / 180) * 700;
  return { x, y };
}

// Simplified continent silhouettes. These are deliberately stylized —
// recognizable but not cartographic. Drawn by hand to keep the file small
// and the aesthetic consistent with the country maps.
export const CONTINENT_PATHS = {
  northAmerica:
    "M 110 130 L 260 100 L 340 130 L 380 180 L 360 230 L 310 260 L 290 300 L 270 340 L 250 360 L 230 380 L 215 370 L 210 340 L 220 310 L 195 275 L 165 255 L 140 220 L 125 180 Z " +
    "M 380 250 L 440 260 L 470 290 L 450 320 L 420 340 L 400 330 L 385 310 Z",
  southAmerica:
    "M 360 400 L 410 380 L 450 410 L 470 460 L 460 520 L 430 570 L 400 605 L 370 610 L 350 580 L 345 530 L 360 480 L 355 440 Z",
  europe:
    "M 640 170 L 720 160 L 760 180 L 780 210 L 760 245 L 720 270 L 680 265 L 650 240 L 630 210 Z " +
    "M 700 140 L 740 130 L 745 160 L 720 165 L 705 158 Z",
  africa:
    "M 700 290 L 790 280 L 830 320 L 840 380 L 820 440 L 780 490 L 750 520 L 720 510 L 695 470 L 680 420 L 685 360 Z",
  asia:
    "M 780 130 L 950 100 L 1100 120 L 1200 160 L 1250 210 L 1270 270 L 1240 320 L 1180 340 L 1120 360 L 1050 370 L 990 355 L 940 340 L 890 300 L 850 270 L 820 240 L 800 200 Z",
  southeastAsia:
    "M 1080 370 L 1160 360 L 1200 385 L 1210 420 L 1180 445 L 1130 450 L 1090 425 L 1075 395 Z",
  oceania:
    "M 1180 500 L 1280 490 L 1310 520 L 1290 560 L 1240 570 L 1195 555 L 1180 530 Z",
  middleEast:
    "M 780 260 L 860 255 L 880 290 L 870 325 L 830 340 L 790 335 L 775 305 Z",
  india:
    "M 970 280 L 1030 275 L 1050 310 L 1040 350 L 1010 370 L 985 360 L 970 325 Z",
  japan:
    "M 1230 220 L 1260 215 L 1275 250 L 1265 280 L 1240 275 Z",
  uk:
    "M 605 170 L 625 165 L 630 195 L 615 205 L 600 195 Z",
  indonesia:
    "M 1130 440 L 1220 435 L 1240 460 L 1210 475 L 1150 470 L 1130 460 Z",
};

// Country data. lat/lng are rough geographic centroids. iso is the ISO 3166-1
// numeric country code, used to match against the world-atlas TopoJSON which
// keys its country geometries by that field. All 30 WORLD_GDP_2026 countries
// are included. "playable" matches what we have real region breakdowns for.
// The rest are clickable for info but show a "coming soon" note on selection.
export const WORLD_COUNTRIES = [
  { name: "United States", iso: "840", flag: "🇺🇸", gdp: 28800, growth: 0.022, lat: 39, lng: -98,
    playable: true, internalKey: "usa2026",
    summary: "World's largest economy. Consumer-driven, tech-heavy, with the dollar as global reserve currency." },
  { name: "China", iso: "156", flag: "🇨🇳", gdp: 19400, growth: 0.045, lat: 35, lng: 103,
    playable: false,
    summary: "Second-largest economy. Export-oriented manufacturing, heavy state involvement, aging demographics." },
  { name: "Germany", iso: "276", flag: "🇩🇪", gdp: 4580, growth: 0.009, lat: 51, lng: 10,
    playable: true, internalKey: "germany2026",
    summary: "Europe's industrial engine. Export surplus, automotive and machinery, disciplined fiscal tradition." },
  { name: "Japan", iso: "392", flag: "🇯🇵", gdp: 4200, growth: 0.008, lat: 36, lng: 138,
    playable: true, internalKey: "japan2026",
    summary: "Mature export economy. Low-inflation regime decades long, shrinking labor force, high public debt." },
  { name: "India", iso: "356", flag: "🇮🇳", gdp: 4100, growth: 0.065, lat: 20, lng: 78,
    playable: false,
    summary: "Fastest-growing major economy. Services and tech-led, young demographics, inflation-sensitive." },
  { name: "United Kingdom", iso: "826", flag: "🇬🇧", gdp: 3580, growth: 0.014, lat: 54, lng: -2,
    playable: true, internalKey: "uk2026",
    summary: "Finance-dominated service economy. Post-Brexit trade realignment, London as a global financial hub." },
  { name: "France", iso: "250", flag: "🇫🇷", gdp: 3220, growth: 0.012, lat: 46, lng: 2,
    playable: true, internalKey: "france2026",
    summary: "Dirigiste tradition meets EU integration. Large state sector, nuclear energy base, strong services." },
  { name: "Italy", iso: "380", flag: "🇮🇹", gdp: 2330, growth: 0.007, lat: 42, lng: 13,
    playable: true, internalKey: "italy2026",
    summary: "High public debt, strong manufacturing north, structurally low growth, tourism and luxury exports." },
  { name: "Brazil", iso: "076", flag: "🇧🇷", gdp: 2300, growth: 0.025, lat: -14, lng: -52,
    playable: false,
    summary: "Commodity exporter with industrial base. Inflation-prone, highly unequal, volatile political cycles." },
  { name: "Canada", iso: "124", flag: "🇨🇦", gdp: 2240, growth: 0.017, lat: 56, lng: -106,
    playable: true, internalKey: "canada2026",
    summary: "Resource-rich developed economy. Tied closely to US trade, household debt concerns, commodity cycles." },
  { name: "Russia", iso: "643", flag: "🇷🇺", gdp: 2100, growth: 0.015, lat: 62, lng: 94,
    playable: false,
    summary: "Energy-export economy under sanctions. Ruble volatility, rerouted trade east, structural stagnation." },
  { name: "South Korea", iso: "410", flag: "🇰🇷", gdp: 1870, growth: 0.022, lat: 36, lng: 128,
    playable: false,
    summary: "High-tech export powerhouse. Semiconductors, automotive, chaebol-dominated, shrinking population." },
  { name: "Australia", iso: "036", flag: "🇦🇺", gdp: 1800, growth: 0.020, lat: -25, lng: 134,
    playable: false,
    summary: "Commodity exporter to Asia. Housing-heavy household balance sheets, services economy at home." },
  { name: "Mexico", iso: "484", flag: "🇲🇽", gdp: 1790, growth: 0.022, lat: 23, lng: -102,
    playable: false,
    summary: "Manufacturing hub for North America. Nearshoring beneficiary, remittance flows, trade-dependent." },
  { name: "Spain", iso: "724", flag: "🇪🇸", gdp: 1620, growth: 0.018, lat: 40, lng: -4,
    playable: false,
    summary: "Tourism-heavy economy with strong services. Recovering from debt crisis scars, elevated youth unemployment." },
  { name: "Indonesia", iso: "360", flag: "🇮🇩", gdp: 1520, growth: 0.051, lat: -2, lng: 118,
    playable: false,
    summary: "Largest ASEAN economy. Resource exports, young demographic, capital-city relocation underway." },
  { name: "Turkey", iso: "792", flag: "🇹🇷", gdp: 1430, growth: 0.030, lat: 39, lng: 35,
    playable: false,
    summary: "Bridge economy with chronic inflation struggles. Currency volatility, heterodox monetary experiments." },
  { name: "Netherlands", iso: "528", flag: "🇳🇱", gdp: 1130, growth: 0.013, lat: 52, lng: 5,
    playable: false,
    summary: "Trading nation and EU logistics hub. Services-heavy, export-oriented, fiscally conservative." },
  { name: "Saudi Arabia", iso: "682", flag: "🇸🇦", gdp: 1100, growth: 0.028, lat: 24, lng: 45,
    playable: false,
    summary: "Oil-export economy diversifying under Vision 2030. Sovereign wealth deployment, megaprojects." },
  { name: "Switzerland", iso: "756", flag: "🇨🇭", gdp: 950, growth: 0.011, lat: 47, lng: 8,
    playable: false,
    summary: "Banking and pharma powerhouse. Strong franc, trade surpluses, safe-haven capital flows." },
  { name: "Poland", iso: "616", flag: "🇵🇱", gdp: 880, growth: 0.032, lat: 52, lng: 19,
    playable: false,
    summary: "Fastest-growing large EU economy. Manufacturing inflows, labor shortages, convergence dynamics." },
  { name: "Taiwan", iso: "158", flag: "🇹🇼", gdp: 830, growth: 0.028, lat: 23, lng: 121,
    playable: false,
    summary: "Semiconductor manufacturing center of the world. Export-driven, geopolitically exposed." },
  { name: "Belgium", iso: "056", flag: "🇧🇪", gdp: 710, growth: 0.010, lat: 51, lng: 4,
    playable: false,
    summary: "Small, open, highly integrated EU economy. Chemicals, logistics, EU institutional seat." },
  { name: "Argentina", iso: "032", flag: "🇦🇷", gdp: 680, growth: 0.018, lat: -38, lng: -64,
    playable: false,
    summary: "Commodity exporter with chronic instability. Multiple exchange rates, inflation regimes in flux." },
  { name: "Sweden", iso: "752", flag: "🇸🇪", gdp: 640, growth: 0.013, lat: 62, lng: 15,
    playable: false,
    summary: "Advanced Nordic welfare state. Strong corporates, krona outside the euro, housing market stress." },
  { name: "Ireland", iso: "372", flag: "🇮🇪", gdp: 620, growth: 0.030, lat: 53, lng: -8,
    playable: false,
    summary: "Foreign-direct-investment hub. Multinational tech and pharma inflate GDP, cost-of-living pressures." },
  { name: "Thailand", iso: "764", flag: "🇹🇭", gdp: 580, growth: 0.028, lat: 15, lng: 101,
    playable: false,
    summary: "Tourism-exposed Southeast Asian economy. Automotive manufacturing, aging ahead of its income level." },
  { name: "Israel", iso: "376", flag: "🇮🇱", gdp: 550, growth: 0.020, lat: 31, lng: 35,
    playable: false,
    summary: "Startup nation with a deep tech sector. High productivity, regional security risks, shekel strength." },
  { name: "Norway", iso: "578", flag: "🇳🇴", gdp: 520, growth: 0.011, lat: 61, lng: 9,
    playable: false,
    summary: "Oil and gas wealth converted to a vast sovereign fund. High living standards, stable institutions." },
  { name: "Austria", iso: "040", flag: "🇦🇹", gdp: 510, growth: 0.010, lat: 47, lng: 14,
    playable: false,
    summary: "Diversified alpine economy. Engineering exports to Germany, tourism, conservative fiscal posture." },
];

// Quick lookup: ISO numeric → country object. Used by the world-atlas-driven
// world map to color each country geometry on render.
export const COUNTRY_BY_ISO = WORLD_COUNTRIES.reduce((acc, c) => {
  acc[c.iso] = c;
  return acc;
}, {});

// URL of the world-atlas TopoJSON. 110m resolution is plenty for an overview
// map and stays under ~110KB. Hosted on jsdelivr's CDN with aggressive caching.
export const WORLD_TOPOJSON_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Fictional country slot. Aurelia stays a separate selection path — it doesn't
// appear on the world map because it's not a real place.
export const FICTIONAL_COUNTRIES = [
  { name: "Republic of Aurelia", flag: "🏛️", internalKey: "aurelia",
    summary: "A fictional mature economy, from the v0.1 Aurelia original scenario." },
];
