import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, AreaChart, Area,
} from "recharts";
import {
  TrendingUp, Landmark, Coins, Percent, Ship, ChevronRight, BookOpen, Target,
  RotateCcw, Users, Factory, Banknote, BarChart3, X, Crown, ScrollText, AlertTriangle,
  Flag, Swords, Shield, Flame, Gauge, Skull, Star, Save, Plus, Globe, Sparkles,
  MapPin, Building2, Sprout, Mountain, History, Lightbulb, Lock, Check, Zap,
  Trophy, Wand2, Info,
} from "lucide-react";
import { COUNTRIES, ARCHETYPES, HISTORICAL_SCENARIOS, TECH_TREE } from "./countries.js";
import {
  ACHIEVEMENTS, checkAchievements, updateCounters, loadUnlocks, saveUnlocks,
  WORLD_GDP_2026, advanceWorld, buildRanking,
  getStatTip, CHEAT_CODE, CHEATS,
  UPDATES_LOG,
} from "./extras.js";
import { WORLD_COUNTRIES, COUNTRY_BY_ISO, WORLD_TOPOJSON_URL } from "./worldMap.js";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

// ============================================================
// DIFFICULTIES
// ============================================================

const DIFFICULTIES = {
  advisor: { key: "advisor", name: "Advisor", tagline: "Friendly", color: "#7a9960", icon: Shield,
    description: "Generous bands, gentle shocks. Designed for first-time players.",
    bandMultiplier: 2.0, crisisChance: 0.04, startingDebtMult: 0.5,
    startingApproval: 78, winStreak: 4, trend: 0.028, drift: 0.003 },
  minister: { key: "minister", name: "Minister", tagline: "Standard", color: "#d4a94a", icon: Flag,
    description: "Comfortable bands, occasional crises. The normal way to play.",
    bandMultiplier: 1.3, crisisChance: 0.10, startingDebtMult: 0.9,
    startingApproval: 65, winStreak: 6, trend: 0.026, drift: 0.006 },
  chancellor: { key: "chancellor", name: "Chancellor", tagline: "Tight", color: "#c77a3f", icon: Swords,
    description: "Narrower windows, more frequent shocks.",
    bandMultiplier: 0.9, crisisChance: 0.15, startingDebtMult: 1.3,
    startingApproval: 55, winStreak: 8, trend: 0.023, drift: 0.010 },
  autocrat: { key: "autocrat", name: "Autocrat", tagline: "Brutal", color: "#a83838", icon: Flame,
    description: "Unforgiving. For players who want mastery.",
    bandMultiplier: 0.65, crisisChance: 0.22, startingDebtMult: 1.8,
    startingApproval: 45, winStreak: 10, trend: 0.021, drift: 0.014 },
};

const BASE_TARGETS = {
  growth: { center: 0.03, halfWidth: 0.01 },
  unemployment: { center: 0.045, halfWidth: 0.012 },
  inflation: { center: 0.0225, halfWidth: 0.008 },
};

function getTargets(diff) {
  const m = DIFFICULTIES[diff].bandMultiplier;
  return {
    growth: { min: BASE_TARGETS.growth.center - BASE_TARGETS.growth.halfWidth * m,
              max: BASE_TARGETS.growth.center + BASE_TARGETS.growth.halfWidth * m },
    unemployment: { min: Math.max(0.015, BASE_TARGETS.unemployment.center - BASE_TARGETS.unemployment.halfWidth * m),
                    max: BASE_TARGETS.unemployment.center + BASE_TARGETS.unemployment.halfWidth * m },
    inflation: { min: BASE_TARGETS.inflation.center - BASE_TARGETS.inflation.halfWidth * m,
                 max: BASE_TARGETS.inflation.center + BASE_TARGETS.inflation.halfWidth * m },
  };
}

// ============================================================
// SUBSIDIES & EVENTS
// ============================================================

const SUBSIDY_OPTIONS = [
  { key: "none", label: "No Subsidy", symbol: "∅", description: "Let markets clear." },
  { key: "agriculture", label: "Agriculture", symbol: "🌾", description: "Boost farm output." },
  { key: "manufacturing", label: "Manufacturing", symbol: "⚙️", description: "Support industry." },
  { key: "trade", label: "Export & Shipping", symbol: "⚓", description: "Subsidize exporters." },
  { key: "mining", label: "Mining & Energy", symbol: "⛏️", description: "Lower energy costs." },
  { key: "services", label: "Services", symbol: "💼", description: "Support finance & tech." },
];

const SCHEDULED_EVENTS = {
  10: { id: "silverbank", title: "Banking Crisis",
    warningHeadline: "Major bank showing signs of stress",
    headline: "A major bank collapses",
    body: "A regional bank has failed. Credit is freezing.",
    options: [
      { label: "Emergency bailout", blurb: "Restore confidence.",
        effect: { debtAdd: 60, approvalDelta: 6, growthDrag: -0.004 },
        lesson: { title: "Lender of last resort", body: "A government bailout halts panic by guaranteeing deposits." } },
      { label: "Let the bank fail", blurb: "Market discipline.",
        effect: { growthDrag: -0.012, unemploymentBump: 0.01, approvalDelta: -8 },
        lesson: { title: "Financial contagion", body: "Letting a bank fail risks spreading panic." } },
      { label: "Nationalize it", blurb: "Radical.",
        effect: { debtAdd: 40, approvalDelta: -3, prodBump: 0.01 },
        lesson: { title: "Public ownership", body: "Absorbing a failing bank prevents contagion." } },
    ] },
  18: { id: "great_recession", title: "Major Recession",
    warningHeadline: "Global markets showing severe stress",
    headline: "Global recession",
    body: "Trading partners are in free fall.",
    options: [
      { label: "Keynesian stimulus", blurb: "Deficit spend.",
        effect: { spendBump: 0.04, taxBump: -0.015, approvalDelta: 4 },
        lesson: { title: "Keynesian countercyclical policy", body: "Expansionary fiscal policy shifts AD rightward." } },
      { label: "Austerity", blurb: "Protect the debt.",
        effect: { growthDrag: -0.02, unemploymentBump: 0.015, approvalDelta: -7 },
        lesson: { title: "Pro-cyclical austerity", body: "Cutting spending during a downturn deepens it." } },
      { label: "Aggressive rate cut", blurb: "Near zero bound.",
        effect: { rateBump: -0.02, moneyBump: 0.025, approvalDelta: 2 },
        lesson: { title: "Monetary policy at the lower bound", body: "Rates near zero lose traction." } },
    ] },
  26: { id: "energy_shock", title: "Energy Shock",
    warningHeadline: "Oil futures spiking",
    headline: "Oil prices quadruple",
    body: "A supply shock is driving costs through every sector.",
    options: [
      { label: "Sharp rate hike", blurb: "Volcker therapy.",
        effect: { rateBump: 0.02, growthDrag: -0.015, inflationBump: -0.012 },
        lesson: { title: "Volcker disinflation", body: "Breaking inflation with tightening at the cost of recession." } },
      { label: "Energy tax cut", blurb: "Ease consumer pain.",
        effect: { taxBump: -0.025, inflationBump: 0.004, approvalDelta: 3 },
        lesson: { title: "Subsidizing through a supply shock", body: "Supports AD but doesn't fix supply." } },
      { label: "Price controls", blurb: "Shortages result.",
        effect: { inflationBump: -0.008, growthDrag: -0.008, approvalDelta: -2 },
        lesson: { title: "Price ceilings", body: "A ceiling below market creates shortages." } },
    ] },
  34: { id: "debt_crisis", title: "Debt Crisis",
    warningHeadline: "Bond spreads widening",
    headline: "Bond markets revolt",
    body: "Investors no longer trust the debt service.",
    options: [
      { label: "Spending cuts", blurb: "Regain credibility.",
        effect: { spendBump: -0.04, approvalDelta: -8, growthDrag: -0.012 },
        lesson: { title: "Fiscal credibility", body: "Credible austerity can lower yields." } },
      { label: "Restructuring", blurb: "Partial default.",
        effect: { debtAdd: -200, approvalDelta: -5, prodBump: -0.015 },
        lesson: { title: "Sovereign default", body: "Writing down debt locks out capital markets." } },
      { label: "Foreign bailout", blurb: "Conditions attached.",
        effect: { debtAdd: -100, approvalDelta: -5, taxBump: 0.025 },
        lesson: { title: "Conditional lending", body: "IMF-style funds in exchange for austerity." } },
    ] },
  42: { id: "pandemic", title: "Pandemic",
    warningHeadline: "Respiratory outbreak spreading",
    headline: "Pandemic forces shutdown",
    body: "Both a supply and a demand shock.",
    options: [
      { label: "Massive stimulus", blurb: "Pandemic scale.",
        effect: { spendBump: 0.06, rateBump: -0.015, debtAdd: 180, approvalDelta: 7 },
        lesson: { title: "Combined AD and AS shocks", body: "Massive fiscal support prevents demand collapse." } },
      { label: "Wage subsidies", blurb: "Keep workers attached.",
        effect: { spendBump: 0.025, unemploymentBump: -0.012, debtAdd: 70 },
        lesson: { title: "Preserving labor attachment", body: "Paying firms to retain workers prevents scarring." } },
      { label: "Minimal intervention", blurb: "Brutal short run.",
        effect: { unemploymentBump: 0.03, growthDrag: -0.025, approvalDelta: -10 },
        lesson: { title: "Creative destruction vs scarring", body: "Mass unemployment creates permanent scars." } },
    ] },
  50: { id: "trade_war", title: "Trade War",
    warningHeadline: "Diplomatic tensions",
    headline: "Retaliatory tariffs",
    body: "Tit-for-tat protectionism has broken out.",
    options: [
      { label: "Match tariffs", blurb: "Escalate.",
        effect: { tariffBump: 0.06, inflationBump: 0.008, growthDrag: -0.01 },
        lesson: { title: "Tariff retaliation spiral", body: "Reciprocal tariffs impose deadweight losses." } },
      { label: "Negotiate", blurb: "Diplomatic cost.",
        effect: { approvalDelta: -5, tariffBump: -0.015, growthDrag: 0.006 },
        lesson: { title: "Gains from trade", body: "De-escalation preserves comparative advantage." } },
      { label: "Open unilaterally", blurb: "Bold.",
        effect: { tariffBump: -0.03, growthDrag: -0.004, prodBump: 0.012, approvalDelta: -3 },
        lesson: { title: "Unilateral free trade", body: "Dropping tariffs maximizes consumer welfare." } },
    ] },
};

const RANDOM_CRISES = [
  { headline: "Energy prices spike", effect: { inflationBump: 0.012, growthDrag: -0.003 },
    lesson: { title: "Minor supply shock", body: "Input cost pressure shifts SRAS leftward." } },
  { headline: "Trade partner enters recession", effect: { growthDrag: -0.007, unemploymentBump: 0.004 },
    lesson: { title: "Net exports channel", body: "Foreign demand falls, shifting AD leftward." } },
  { headline: "Productivity surge in tech", effect: { growthDrag: 0.01, inflationBump: -0.004, prodBump: 0.012 },
    lesson: { title: "Positive supply shock", body: "A productivity jump shifts LRAS rightward." } },
  { headline: "Currency speculators test the peg", effect: { inflationBump: 0.008, growthDrag: -0.004 },
    lesson: { title: "Currency pressure", body: "Speculative pressure can force rate hikes." } },
  { headline: "Housing bubble concerns mount", effect: { inflationBump: 0.006, approvalDelta: -2 },
    lesson: { title: "Asset price bubbles", body: "Asset prices can outpace fundamentals when credit is cheap." } },
  { headline: "Consumer confidence dips", effect: { growthDrag: -0.006, approvalDelta: -3 },
    lesson: { title: "Animal spirits", body: "Confidence shocks reduce spending without fundamental changes." } },
  { headline: "Natural disaster in breadbasket", effect: { growthDrag: -0.005, inflationBump: 0.005 },
    lesson: { title: "Supply disruption", body: "A physical shock shifts SRAS leftward." } },
  { headline: "Major resource discovery", effect: { growthDrag: 0.007, prodBump: 0.008 },
    lesson: { title: "Terms of trade improvement", body: "A new export raises real income." } },
  { headline: "FDI surges", effect: { growthDrag: 0.005, prodBump: 0.006 },
    lesson: { title: "Capital inflows", body: "Inbound investment raises the capital stock." } },
];

const DECISION_EVENTS = [
  { headline: "Monopoly pricing accusation", body: "A dominant firm is charging above marginal cost.",
    options: [
      { label: "Break it up", blurb: "Welfare gain.",
        effect: { growthDrag: -0.005, approvalDelta: 4, prodBump: 0.005 },
        lesson: { title: "Deadweight loss of monopoly", body: "Monopolies restrict output to raise price." } },
      { label: "Leave it alone", blurb: "Higher prices.",
        effect: { inflationBump: 0.003, approvalDelta: -2 },
        lesson: { title: "Allocative inefficiency", body: "Market power leads to pricing above marginal cost." } },
    ] },
  { headline: "Industrial runoff in the river", body: "Factories dumping untreated waste.",
    options: [
      { label: "Pigouvian tax", blurb: "Price the externality.",
        effect: { growthDrag: -0.003, approvalDelta: 3 },
        lesson: { title: "Pigouvian tax", body: "A tax equal to marginal external cost forces internalization." } },
      { label: "Ignore it", blurb: "Accumulates.",
        effect: { approvalDelta: -4, prodBump: -0.006 },
        lesson: { title: "Market failure", body: "Unpriced externalities diverge private from social costs." } },
    ] },
  { headline: "Strike threat", body: "Unions demand higher wages.",
    options: [
      { label: "Raise minimum wage", blurb: "Calm unrest.",
        effect: { minWageBump: 0.03, approvalDelta: 2 },
        lesson: { title: "Price floors in labor", body: "A minimum wage above equilibrium creates a labor surplus." } },
      { label: "Hold firm", blurb: "Protect employment.",
        effect: { approvalDelta: -3, growthDrag: -0.003 },
        lesson: { title: "Labor market frictions", body: "Strikes reduce output in the short run." } },
    ] },
  { headline: "Immigration reform", body: "Labor shortages slowing output.",
    options: [
      { label: "Open immigration", blurb: "Boost labor supply.",
        effect: { growthDrag: 0.006, prodBump: 0.008, approvalDelta: -4 },
        lesson: { title: "Labor supply shifts", body: "Expanding labor force raises potential output." } },
      { label: "Maintain quotas", blurb: "Political safety.",
        effect: { approvalDelta: 3, growthDrag: -0.002 },
        lesson: { title: "Factor constraints", body: "Potential output is bounded by labor, capital, and technology." } },
    ] },
  { headline: "Infrastructure proposal", body: "Ten-year public works program.",
    options: [
      { label: "Approve", blurb: "Productivity later.",
        effect: { spendBump: 0.015, prodBump: 0.015, debtAdd: 80 },
        lesson: { title: "Public capital and growth", body: "Infrastructure raises productive capacity." } },
      { label: "Reject", blurb: "Fiscal discipline.",
        effect: { approvalDelta: -2 },
        lesson: { title: "Opportunity cost of austerity", body: "Declining to invest has long-run costs." } },
    ] },
];

// ============================================================
// HELPERS
// ============================================================

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmtPct = (v, d = 1) => `${(v * 100).toFixed(d)}%`;
const fmtMoney = (v) => v >= 1000 ? `$${(v / 1000).toFixed(1)}T` : `$${v.toFixed(0)}B`;

function getInitialState(difficulty, country, scenario) {
  const d = DIFFICULTIES[difficulty];
  const baseDebt = (country.contextDebt || country.startingGdp * 0.5) * d.startingDebtMult;
  const base = {
    difficulty, countryKey: country.key, scenarioKey: scenario?.key || null,
    turn: 0, year: scenario?.startYear || 2026, quarter: 1,
    gdp: country.startingGdp, gdpGrowth: country.baseTrend,
    unemployment: country.startingUnemp || 0.05, inflation: 0.02,
    interestRate: country.contextRate || 0.03, moneyGrowth: 0.03,
    taxRate: country.contextTaxRate || 0.25, govSpendingRate: 0.2,
    tariff: 0.03, minWage: 0.42, subsidy: "none", productivity: 1.0,
    debt: baseDebt + (country.startingDebtBonus || 0),
    approval: d.startingApproval,
    inTargetStreak: 0, bestStreak: 0,
    gameOver: false, victory: false,
    lastEvent: null, pendingEvent: null, upcomingWarning: null,
    techPoints: 0, unlockedTech: [],
  };
  if (scenario?.startOverrides) Object.assign(base, scenario.startOverrides);
  return base;
}

function rollRandomCrisis(state) {
  if (state.turn < 4) return null;
  const chance = DIFFICULTIES[state.difficulty].crisisChance;
  if (Math.random() > chance) return null;
  return RANDOM_CRISES[Math.floor(Math.random() * RANDOM_CRISES.length)];
}

function rollDecisionEvent(state) {
  if (state.turn < 4) return null;
  if (state.pendingEvent) return null;
  if (Math.random() > 0.12) return null;
  return DECISION_EVENTS[Math.floor(Math.random() * DECISION_EVENTS.length)];
}

const getScheduledForTurn = (t) => SCHEDULED_EVENTS[t] || null;
function getUpcomingScheduled(turn) {
  for (let t = turn + 1; t <= turn + 3; t++) if (SCHEDULED_EVENTS[t]) return { event: SCHEDULED_EVENTS[t], turnsAway: t - turn };
  return null;
}

function techEffect(state, key, defaultVal = 0) {
  const unlocked = state.unlockedTech || [];
  let v = defaultVal;
  for (const k of unlocked) { const t = TECH_TREE[k]; if (t?.effect?.[key] !== undefined) v = t.effect[key]; }
  return v;
}

function buildLessons(prev, next, policies, crisis) {
  const lessons = [];
  const taxDelta = policies.taxRate - prev.taxRate;
  const spendDelta = policies.govSpendingRate - prev.govSpendingRate;
  const rateDelta = policies.interestRate - prev.interestRate;
  if (crisis) lessons.push(crisis.lesson);
  if (next.unemployment < 0.03 && next.inflation > 0.035)
    lessons.push({ title: "Phillips curve in action", body: "Unemployment below the natural rate accelerates inflation." });
  if (next.inflation > 0.06)
    lessons.push({ title: "Runaway inflation", body: "Above 6% risks unanchoring expectations." });
  if (next.unemployment > 0.08 && rateDelta > 0)
    lessons.push({ title: "Contractionary policy in a slump", body: "Raising rates in a downturn deepens it." });
  if (taxDelta > 0.02 && next.gdpGrowth < 0.01)
    lessons.push({ title: "Fiscal drag", body: "Sharp tax hikes shift AD left." });
  if (policies.tariff > 0.15)
    lessons.push({ title: "Deadweight loss of tariffs", body: "High tariffs shrink trade volume." });
  if (next.debt / next.gdp > 1.2)
    lessons.push({ title: "Debt in danger zone", body: "Interest payments eat revenue." });
  if (policies.moneyGrowth > 0.07 && next.inflation > 0.04)
    lessons.push({ title: "Quantity theory of money", body: "MV = PY." });
  return lessons.slice(0, 2);
}

function simulate(state, policies) {
  const d = DIFFICULTIES[state.difficulty];
  const scheduled = getScheduledForTurn(state.turn + 1);
  const crisis = scheduled ? null : rollRandomCrisis(state);

  const taxDelta = policies.taxRate - state.taxRate;
  const spendDelta = policies.govSpendingRate - state.govSpendingRate;
  const rateDelta = policies.interestRate - state.interestRate;

  const inflationDriftMult = techEffect(state, "inflationDriftMult", 1.0);
  const recessionBuffer = techEffect(state, "recessionBuffer", 0);
  const productivityBonus = techEffect(state, "productivityBonus", 0);
  const tariffDragMult = techEffect(state, "tariffDragMult", 1.0);
  const inflationReversion = techEffect(state, "inflationReversion", 0);
  const approvalBoost = techEffect(state, "approvalBoost", 0);

  const fiscalEffect = spendDelta * 1.8 - taxDelta * 1.4;
  const monetaryEffect = -rateDelta * 2.2;
  const tariffDrag = -policies.tariff * 0.25 * tariffDragMult;
  const minWageDrag = -Math.max(0, policies.minWage - 0.45) * 0.4;
  const subsidyBoost = policies.subsidy !== "none" ? 0.004 : 0;
  const moneyBoost = (policies.moneyGrowth - 0.03) * 0.3;
  const confidence = (state.approval - 50) / 800;
  const shock = (Math.random() - 0.5) * d.drift * 2;
  let crisisGrowth = crisis?.effect.growthDrag ?? 0;
  if (crisis && recessionBuffer > 0 && crisisGrowth < 0) crisisGrowth *= (1 - recessionBuffer);
  const revert = 0.55 * d.trend + 0.4 * state.gdpGrowth;

  let growth = revert + fiscalEffect + monetaryEffect + tariffDrag + minWageDrag +
    subsidyBoost + moneyBoost + confidence + shock + crisisGrowth + productivityBonus;
  growth = clamp(growth, -0.08, 0.10);

  const productivity = clamp(state.productivity + (crisis?.effect.prodBump ?? 0), 0.80, 1.30);
  const newGdp = state.gdp * (1 + growth / 4) * (productivity / state.productivity);

  let unemp = state.unemployment - 0.45 * (growth - d.trend) +
    Math.max(0, policies.minWage - 0.45) * 0.12 + (crisis?.effect.unemploymentBump ?? 0);
  unemp = clamp(unemp, 0.018, 0.24);

  const phillips = -0.35 * (unemp - 0.045);
  const tariffInflation = policies.tariff * 0.25;
  const rateDamping = (policies.interestRate - 0.03) * -0.6;
  const moneyInflation = (policies.moneyGrowth - 0.03) * 0.4;
  const subsidyInflation = policies.subsidy !== "none" ? 0.003 : 0;
  const baselineCreep = d.drift * 0.5 * inflationDriftMult;
  const inflationBump = crisis?.effect.inflationBump ?? 0;
  let inflation = 0.55 * state.inflation + 0.02 + phillips + tariffInflation +
    rateDamping + moneyInflation + subsidyInflation + baselineCreep + inflationBump;
  if (inflationReversion > 0) inflation = inflation + (0.02 - inflation) * inflationReversion;
  inflation = clamp(inflation, -0.03, 0.25);

  const subsidyCost = policies.subsidy !== "none" ? 0.01 * newGdp : 0;
  const deficit = (policies.govSpendingRate - policies.taxRate) * newGdp + subsidyCost;
  const debt = state.debt * (1 + policies.interestRate / 4) + deficit / 4;

  const unempPenalty = Math.max(0, (unemp - 0.05) * 400);
  const inflationPenalty = Math.max(0, Math.abs(inflation - 0.02) * 250);
  const growthBonus = growth * 250;
  const taxPenalty = Math.max(0, (policies.taxRate - 0.3) * 180);
  let approval = state.approval + growthBonus - unempPenalty - inflationPenalty - taxPenalty + approvalBoost * 0.1 + (Math.random() - 0.5) * 2;
  approval = clamp(approval, 0, 100);

  const targets = getTargets(state.difficulty);
  const hitsTargets =
    growth >= targets.growth.min && growth <= targets.growth.max &&
    unemp >= targets.unemployment.min && unemp <= targets.unemployment.max &&
    inflation >= targets.inflation.min && inflation <= targets.inflation.max;
  const inTargetStreak = hitsTargets ? state.inTargetStreak + 1 : 0;
  const bestStreak = Math.max(state.bestStreak, inTargetStreak);

  let techPoints = state.techPoints || 0;
  if (hitsTargets && (state.turn + 1) % 3 === 0) techPoints += 1;

  let quarter = state.quarter + 1, year = state.year;
  if (quarter > 4) { quarter = 1; year += 1; }

  const victory = inTargetStreak >= d.winStreak;
  const gameOver = victory || approval <= 5 || unemp >= 0.18 || inflation >= 0.18 || debt / newGdp > 2.0;
  const upcomingWarning = getUpcomingScheduled(state.turn + 1);

  const next = {
    ...state, ...policies,
    turn: state.turn + 1, year, quarter,
    gdp: newGdp, gdpGrowth: growth, unemployment: unemp, inflation,
    productivity, debt, approval, inTargetStreak, bestStreak, victory, gameOver,
    lastEvent: crisis ? { headline: crisis.headline } : null,
    upcomingWarning, techPoints,
    unlockedTech: state.unlockedTech || [],
  };
  const lessons = buildLessons(state, next, policies, crisis);
  if (scheduled) next.pendingEvent = { ...scheduled, isMajor: true };
  else { const decision = rollDecisionEvent(next); if (decision) next.pendingEvent = { ...decision, isMajor: false }; }
  return { next, lessons, crisis, scheduled, warningTriggered: upcomingWarning && upcomingWarning.turnsAway === 3 };
}

// ============================================================
// SAVE / LOAD
// ============================================================

const SAVE_KEY = "aurelia_save_v3";
function saveGame(d) { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...d, savedAt: Date.now() })); return true; } catch { return false; } }
function loadGame() { try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch {} }

// ============================================================
// MAP BACKDROPS (ocean, neighbors, rivers per country)
// ============================================================

// MapBackdrop is split into two layers via the `layer` prop.
// "base" draws oceans, neighbor landmasses, rivers — everything that sits BEHIND regions.
// "labels" draws ocean/sea names — these render AFTER regions so they are never covered.
// Splitting the rendering pass fixes the v0.5 bug where region shapes overlapped sea names.
function MapBackdrop({ countryKey, layer = "base" }) {
  const commonDefs = (
    <defs>
      <linearGradient id="ocean-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2c4661" />
        <stop offset="100%" stopColor="#1e3247" />
      </linearGradient>
      <pattern id="wave-pattern" x="0" y="0" width="40" height="10" patternUnits="userSpaceOnUse">
        <path d="M 0 5 Q 10 0 20 5 Q 30 10 40 5" stroke="#4a6580" strokeWidth="0.6" fill="none" opacity="0.5"/>
      </pattern>
      <linearGradient id="neighbor-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6b5840" />
        <stop offset="100%" stopColor="#4d3f2a" />
      </linearGradient>
    </defs>
  );

  // Small helper: render an ocean/sea label with a soft parchment-tone halo
  // so it stays legible even when it sits near a region edge.
  const SeaLabel = ({ x, y, anchor = "start", children, fontSize = 11 }) => (
    <g style={{ pointerEvents: "none" }}>
      <text x={x} y={y} fontFamily="Fraunces, serif" fontSize={fontSize + 2} fontStyle="italic"
        fill="#0f1319" opacity="0.5" textAnchor={anchor} stroke="#0f1319" strokeWidth="3"
        strokeLinejoin="round" paintOrder="stroke">{children}</text>
      <text x={x} y={y} fontFamily="Fraunces, serif" fontSize={fontSize} fontStyle="italic"
        fill="#a8c3d8" opacity="0.85" textAnchor={anchor}>{children}</text>
    </g>
  );

  const NeighborLabel = ({ x, y, anchor = "middle", children, fontSize = 10 }) => (
    <text x={x} y={y} fontFamily="Fraunces, serif" fontSize={fontSize} fontStyle="italic"
      fill="#f5ecd5" opacity="0.7" textAnchor={anchor}
      style={{ pointerEvents: "none", paintOrder: "stroke", stroke: "#2a1810", strokeWidth: 2.5, strokeLinejoin: "round" }}>
      {children}
    </text>
  );

  if (countryKey === "usa2026") {
    if (layer === "base") return (
      <g>{commonDefs}
        <rect x="0" y="0" width="680" height="380" fill="url(#ocean-grad)" />
        <rect x="0" y="0" width="680" height="380" fill="url(#wave-pattern)" opacity="0.3" />
        <path d="M 0 0 L 680 0 L 680 95 L 640 95 L 540 110 L 420 95 L 280 90 L 150 85 L 50 100 L 0 95 Z" fill="url(#neighbor-grad)" opacity="0.7" />
        <path d="M 40 380 L 85 375 L 135 340 L 240 310 L 340 330 L 450 355 L 570 340 L 600 360 L 600 380 Z" fill="url(#neighbor-grad)" opacity="0.7" />
        <ellipse cx="495" cy="125" rx="30" ry="10" fill="#2c4661" stroke="#1a1510" strokeWidth="0.5"/>
        <ellipse cx="540" cy="140" rx="18" ry="6" fill="#2c4661" stroke="#1a1510" strokeWidth="0.5"/>
        <path d="M 440 140 Q 430 200 420 260 Q 400 290 380 320" stroke="#4a6580" strokeWidth="1.5" fill="none" opacity="0.7"/>
      </g>
    );
    return (
      <g>
        <NeighborLabel x={340} y={50} fontSize={14}>CANADA</NeighborLabel>
        <NeighborLabel x={270} y={372} fontSize={12}>MEXICO</NeighborLabel>
        <SeaLabel x={30} y={260}>PACIFIC</SeaLabel>
        <SeaLabel x={650} y={260} anchor="end">ATLANTIC</SeaLabel>
      </g>
    );
  }

  if (countryKey === "uk2026") {
    if (layer === "base") return (
      <g>{commonDefs}
        <rect x="0" y="0" width="300" height="400" fill="url(#ocean-grad)" />
        <rect x="0" y="0" width="300" height="400" fill="url(#wave-pattern)" opacity="0.3" />
        <path d="M 180 360 L 300 360 L 300 400 L 120 400 L 140 380 Z" fill="url(#neighbor-grad)" opacity="0.65" />
        <path d="M 140 305 Q 180 310 220 308 Q 250 306 280 308" stroke="#4a6580" strokeWidth="1.2" fill="none" opacity="0.7"/>
      </g>
    );
    return (
      <g>
        <NeighborLabel x={240} y={390} fontSize={11}>FRANCE</NeighborLabel>
        <SeaLabel x={20} y={180}>ATLANTIC</SeaLabel>
        <SeaLabel x={278} y={180} anchor="end">NORTH SEA</SeaLabel>
      </g>
    );
  }

  if (countryKey === "germany2026") {
    if (layer === "base") return (
      <g>{commonDefs}
        <rect x="0" y="0" width="520" height="400" fill="#2d3a48" />
        <path d="M 200 0 L 360 0 L 360 60 L 200 60 Z" fill="url(#neighbor-grad)" opacity="0.6"/>
        <path d="M 455 185 L 520 180 L 520 400 L 460 400 L 460 230 Z" fill="url(#neighbor-grad)" opacity="0.6"/>
        <path d="M 0 0 L 100 150 L 0 200 Z" fill="url(#neighbor-grad)" opacity="0.55"/>
        <path d="M 170 310 L 430 340 L 430 400 L 170 400 Z" fill="url(#neighbor-grad)" opacity="0.6"/>
        <path d="M 0 0 L 200 0 L 200 60 L 100 150 L 0 200 Z" fill="url(#ocean-grad)"/>
        <path d="M 150 145 Q 170 200 200 260 Q 220 320 170 370" stroke="#4a6580" strokeWidth="1.3" fill="none" opacity="0.7"/>
      </g>
    );
    return (
      <g>
        <NeighborLabel x={280} y={30}>DENMARK</NeighborLabel>
        <NeighborLabel x={490} y={280}>POLAND</NeighborLabel>
        <NeighborLabel x={300} y={385}>AUSTRIA</NeighborLabel>
        <SeaLabel x={60} y={55}>NORTH SEA</SeaLabel>
      </g>
    );
  }

  if (countryKey === "france2026") {
    if (layer === "base") return (
      <g>{commonDefs}
        <rect x="0" y="0" width="480" height="400" fill="url(#ocean-grad)" />
        <path d="M 100 0 L 300 0 L 280 50 L 120 40 Z" fill="url(#neighbor-grad)" opacity="0.55"/>
        <path d="M 440 80 L 480 80 L 480 300 L 445 200 Z" fill="url(#neighbor-grad)" opacity="0.6"/>
        <path d="M 420 230 L 480 240 L 480 380 L 410 370 Z" fill="url(#neighbor-grad)" opacity="0.6"/>
        <path d="M 0 360 L 300 380 L 300 400 L 0 400 Z" fill="url(#neighbor-grad)" opacity="0.6"/>
        <path d="M 240 180 Q 260 150 285 130 Q 310 115 335 95" stroke="#4a6580" strokeWidth="1.2" fill="none" opacity="0.7"/>
        <path d="M 340 210 Q 360 260 370 310 Q 375 340 380 365" stroke="#4a6580" strokeWidth="1.2" fill="none" opacity="0.7"/>
      </g>
    );
    return (
      <g>
        <NeighborLabel x={200} y={25}>UK</NeighborLabel>
        <NeighborLabel x={150} y={393}>SPAIN</NeighborLabel>
        <SeaLabel x={40} y={280}>ATLANTIC</SeaLabel>
      </g>
    );
  }

  if (countryKey === "japan2026") {
    if (layer === "base") return (
      <g>{commonDefs}
        <rect x="0" y="0" width="620" height="400" fill="url(#ocean-grad)"/>
        <rect x="0" y="0" width="620" height="400" fill="url(#wave-pattern)" opacity="0.3"/>
        <path d="M 0 200 L 30 190 L 50 240 L 40 310 L 20 340 L 0 330 Z" fill="url(#neighbor-grad)" opacity="0.6"/>
        <path d="M 380 0 L 620 0 L 620 65 L 570 75 L 450 70 L 380 50 Z" fill="url(#neighbor-grad)" opacity="0.55"/>
      </g>
    );
    return (
      <g>
        <NeighborLabel x={20} y={275} fontSize={9}>KR</NeighborLabel>
        <NeighborLabel x={500} y={35}>RUSSIA</NeighborLabel>
        <SeaLabel x={540} y={260}>PACIFIC</SeaLabel>
      </g>
    );
  }

  if (countryKey === "canada2026") {
    if (layer === "base") return (
      <g>{commonDefs}
        <rect x="0" y="0" width="620" height="360" fill="url(#ocean-grad)"/>
        <rect x="0" y="300" width="620" height="60" fill="url(#neighbor-grad)" opacity="0.65"/>
        <ellipse cx="410" cy="285" rx="40" ry="10" fill="#2c4661" stroke="#1a1510" strokeWidth="0.5"/>
        <ellipse cx="470" cy="295" rx="22" ry="7" fill="#2c4661" stroke="#1a1510" strokeWidth="0.5"/>
      </g>
    );
    return (
      <g>
        <NeighborLabel x={310} y={340} fontSize={13}>UNITED STATES</NeighborLabel>
        <SeaLabel x={50} y={25}>ARCTIC OCEAN</SeaLabel>
      </g>
    );
  }

  if (countryKey === "italy2026") {
    if (layer === "base") return (
      <g>{commonDefs}
        <rect x="0" y="0" width="500" height="470" fill="url(#ocean-grad)"/>
        <rect x="0" y="0" width="500" height="470" fill="url(#wave-pattern)" opacity="0.3"/>
        <path d="M 0 0 L 85 0 L 85 110 L 0 110 Z" fill="url(#neighbor-grad)" opacity="0.55"/>
        <path d="M 85 0 L 400 0 L 400 70 L 85 70 Z" fill="url(#neighbor-grad)" opacity="0.55"/>
        <path d="M 335 70 L 500 70 L 500 300 L 345 150 Z" fill="url(#neighbor-grad)" opacity="0.55"/>
        <path d="M 90 145 Q 180 150 280 155 Q 330 155 335 155" stroke="#4a6580" strokeWidth="1.2" fill="none" opacity="0.7"/>
      </g>
    );
    return (
      <g>
        <NeighborLabel x={240} y={35}>ALPS · CH · AT</NeighborLabel>
        <SeaLabel x={450} y={335} anchor="end">ADRIATIC</SeaLabel>
        <SeaLabel x={60} y={300}>TYRRHENIAN</SeaLabel>
      </g>
    );
  }

  // TURKEY — new in v0.7 historical scenario
  if (countryKey === "turkey2023") {
    if (layer === "base") return (
      <g>{commonDefs}
        <rect x="0" y="0" width="680" height="380" fill="url(#ocean-grad)"/>
        <rect x="0" y="0" width="680" height="380" fill="url(#wave-pattern)" opacity="0.3"/>
        {/* Greece/Bulgaria/Balkans sliver at top-left */}
        <path d="M 0 0 L 140 0 L 145 80 L 70 120 L 0 110 Z" fill="url(#neighbor-grad)" opacity="0.55"/>
        {/* Russia/Caucasus to the northeast */}
        <path d="M 560 0 L 680 0 L 680 140 L 600 150 L 555 100 Z" fill="url(#neighbor-grad)" opacity="0.55"/>
        {/* Syria/Iraq to the south */}
        <path d="M 200 340 L 600 340 L 620 380 L 180 380 Z" fill="url(#neighbor-grad)" opacity="0.6"/>
        {/* Bosphorus strait suggestion */}
        <path d="M 145 95 Q 160 110 180 125" stroke="#4a6580" strokeWidth="1.2" fill="none" opacity="0.7"/>
      </g>
    );
    return (
      <g>
        <NeighborLabel x={70} y={50}>BALKANS</NeighborLabel>
        <NeighborLabel x={620} y={60}>CAUCASUS</NeighborLabel>
        <NeighborLabel x={400} y={370}>SYRIA · IRAQ</NeighborLabel>
        <SeaLabel x={30} y={200}>AEGEAN</SeaLabel>
        <SeaLabel x={330} y={60}>BLACK SEA</SeaLabel>
        <SeaLabel x={650} y={280} anchor="end">MEDITERRANEAN</SeaLabel>
      </g>
    );
  }

  if (countryKey === "aurelia" || countryKey === "custom") {
    if (layer === "base") return (
      <g>{commonDefs}
        <rect x="0" y="0" width="640" height="450" fill="url(#ocean-grad)"/>
        <rect x="0" y="0" width="640" height="450" fill="url(#wave-pattern)" opacity="0.3"/>
        <path d="M 555 145 L 640 130 L 640 320 L 580 235 Z" fill="url(#neighbor-grad)" opacity="0.6"/>
        <path d="M 60 40 L 580 40 L 555 145 L 445 115 L 275 105 L 180 95 L 95 135 L 60 130 Z" fill="url(#neighbor-grad)" opacity="0.55"/>
        <path d="M 130 395 L 475 410 L 500 430 L 130 430 Z" fill="url(#neighbor-grad)" opacity="0.55"/>
        <path d="M 300 220 Q 310 280 300 330 Q 295 370 270 420" stroke="#4a6580" strokeWidth="1.3" fill="none" opacity="0.7"/>
      </g>
    );
    return (
      <g>
        <NeighborLabel x={610} y={220} fontSize={9}>TALARAN</NeighborLabel>
        <NeighborLabel x={320} y={85}>NORTHERN MARCHES</NeighborLabel>
        <NeighborLabel x={300} y={425}>DUCHY OF MORAVELLE</NeighborLabel>
        <SeaLabel x={25} y={265}>OPEN SEA</SeaLabel>
      </g>
    );
  }

  if (layer === "base") return <rect x="0" y="0" width="640" height="450" fill="#1e2a36"/>;
  return null;
}

// ============================================================
// COUNTRY MAP
// ============================================================

function CountryMap({ state, country, onSelectRegion, selectedRegion }) {
  const [hoverId, setHoverId] = useState(null);

  const regionalStatus = useMemo(() => {
    const map = {};
    for (const r of country.regions) {
      const rateEffect = r.sensitivity.rate * (state.interestRate - 0.03);
      const tariffEffect = r.sensitivity.tariff * state.tariff;
      const minWageEffect = r.sensitivity.minWage * Math.max(0, state.minWage - 0.45);
      const subsidy = state.subsidy === r.sensitivity.subsidyKey ? 0.03 : 0;
      const base = state.gdpGrowth - 0.025;
      map[r.id] = base + rateEffect + tariffEffect + minWageEffect + subsidy;
    }
    return map;
  }, [state, country]);

  const colorFor = (delta) => {
    if (delta > 0.02) return "#7a9960";
    if (delta > 0.005) return "#a69866";
    if (delta > -0.01) return "#94856a";
    if (delta > -0.025) return "#96654a";
    return "#7a4236";
  };

  const labelFor = (name) => name.length > 18 ? name.replace(/\s*\([^)]+\)/, "").slice(0, 16) : name;

  return (
    <svg viewBox={country.mapViewBox} className="w-full h-full block">
      <defs>
        <pattern id="paper-tx" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#e8dcc0" />
          <circle cx="1" cy="1" r="0.3" fill="#c9b890" opacity="0.4" />
        </pattern>
        <radialGradient id="map-vignette" cx="50%" cy="50%" r="70%">
          <stop offset="55%" stopColor="transparent" />
          <stop offset="100%" stopColor="#1a1510" stopOpacity="0.45" />
        </radialGradient>
        <filter id="region-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.45"/>
        </filter>
      </defs>

      <MapBackdrop countryKey={country.key} layer="base" />

      {country.regions.map((r) => {
        const delta = regionalStatus[r.id];
        const fill = colorFor(delta);
        const isSel = selectedRegion === r.id;
        const isHover = hoverId === r.id;
        const scale = isHover ? 1.045 : 1;
        const translate = isHover ? -3 : 0;
        return (
          <g key={r.id}
            style={{
              transformOrigin: `${r.labelX}px ${r.labelY}px`,
              transformBox: "fill-box",
              transform: `translate(0, ${translate}px) scale(${scale})`,
              transition: "transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease",
              filter: isHover || isSel ? "url(#region-shadow) brightness(1.08)" : "none",
              cursor: "pointer",
            }}
            onClick={() => onSelectRegion(r.id)}
            onMouseEnter={() => setHoverId(r.id)}
            onMouseLeave={() => setHoverId(null)}>
            <path d={r.path} fill={fill} fillOpacity={isHover ? 0.92 : 1}
              stroke={isSel ? "#1a1510" : "#2a2117"} strokeWidth={isSel ? "2.2" : "1.1"} />
            <path d={r.path} fill="url(#paper-tx)" opacity="0.12" style={{ pointerEvents: "none" }} />
            <g style={{ pointerEvents: "none" }}>
              {/* Label background: expanded in v0.7 to cover BOTH the region name
                  AND the industry subtitle below it, so text doesn't bleed onto
                  the region color underneath. */}
              <rect x={r.labelX - 46} y={r.labelY - 9} width="92" height="22"
                fill="#f5ecd5" opacity="0.78" rx="3"/>
              <text x={r.labelX} y={r.labelY} textAnchor="middle"
                fontFamily="Fraunces, serif" fontSize="8.5" fontStyle="italic"
                fill="#1a1510" opacity="0.95">{labelFor(r.name)}</text>
              <text x={r.labelX} y={r.labelY + 9} textAnchor="middle"
                fontFamily="IBM Plex Sans, sans-serif" fontSize="6"
                fill="#3a2f1f" opacity="0.75" letterSpacing="0.6">{r.industry.toUpperCase()}</text>
            </g>
          </g>
        );
      })}

      {/* Labels layer (sea names, neighbor country names) renders AFTER regions
          so it is never covered by a region polygon. Fixes v0.6 overlap bug. */}
      <MapBackdrop countryKey={country.key} layer="labels" />

      <rect x="0" y="0" width="100%" height="100%" fill="url(#map-vignette)" style={{ pointerEvents: "none" }} />
      <g transform="translate(28 28)" style={{ pointerEvents: "none" }}>
        <text fontFamily="Fraunces, serif" fontSize="12" fontStyle="italic" fill="#c9a961" opacity="0.9">{country.kind === "fiction" ? "Domains of" : "Regions of"}</text>
        <text y="17" fontFamily="Fraunces, serif" fontSize="17" fill="#e8dcc0" letterSpacing="1.4">{country.name.toUpperCase()}</text>
      </g>
    </svg>
  );
}

// ============================================================
// MENU BACKDROP (enhanced)
// ============================================================

function MenuBackdrop() {
  return (
    <svg viewBox="0 0 1440 900" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="m-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#162039" />
          <stop offset="45%" stopColor="#2d2518" />
          <stop offset="100%" stopColor="#3a2a1a" />
        </linearGradient>
        <radialGradient id="m-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e8a85c" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#e8a85c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="m-smoke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a4630" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#4a3a28" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="cloud-soft" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c9a961" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#c9a961" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="aurora" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4a7fa8" stopOpacity="0" />
          <stop offset="50%" stopColor="#6a9fc8" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#4a7fa8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1440" height="900" fill="url(#m-sky)" />
      <ellipse cx="720" cy="180" rx="900" ry="70" fill="url(#aurora)">
        <animate attributeName="cx" values="600;840;600" dur="30s" repeatCount="indefinite"/>
        <animate attributeName="ry" values="70;90;70" dur="20s" repeatCount="indefinite"/>
      </ellipse>
      <g opacity="0.75">
        <ellipse cx="300" cy="200" rx="300" ry="55" fill="url(#cloud-soft)">
          <animate attributeName="cx" values="-300;300;1740" dur="60s" repeatCount="indefinite"/>
        </ellipse>
        <ellipse cx="900" cy="150" rx="340" ry="65" fill="url(#cloud-soft)">
          <animate attributeName="cx" values="1740;900;-340" dur="80s" repeatCount="indefinite"/>
        </ellipse>
        <ellipse cx="1200" cy="260" rx="250" ry="50" fill="url(#cloud-soft)">
          <animate attributeName="cx" values="-250;1200;1740" dur="90s" repeatCount="indefinite"/>
        </ellipse>
      </g>
      <g fill="#e8dcc0">
        {[
          [120, 100, 1.6, 3], [300, 60, 1.2, 4], [520, 130, 1.4, 5], [680, 80, 1, 3.5],
          [920, 110, 1.5, 4.5], [1100, 75, 1.1, 3], [1280, 140, 1.3, 5], [1350, 60, 1, 4],
          [200, 180, 0.9, 6], [420, 210, 1.2, 4], [760, 220, 1, 5], [1040, 240, 1.4, 3.5],
          [1200, 200, 0.9, 5.5], [80, 240, 1, 4.5], [600, 45, 1.3, 3.8],
        ].map(([x, y, r, dur], i) => (
          <circle key={i} cx={x} cy={y} r={r}>
            <animate attributeName="opacity" values="0.3;1;0.3" dur={`${dur}s`} repeatCount="indefinite" begin={`${i * 0.35}s`} />
          </circle>
        ))}
      </g>
      <circle cx="1080" cy="340" r="230" fill="url(#m-sun)">
        <animate attributeName="r" values="220;260;220" dur="9s" repeatCount="indefinite" />
      </circle>
      <circle cx="1080" cy="340" r="62" fill="#e8a85c" opacity="0.55">
        <animate attributeName="opacity" values="0.5;0.75;0.5" dur="5s" repeatCount="indefinite" />
      </circle>
      <path d="M 0 520 L 120 440 L 260 500 L 380 420 L 520 480 L 680 410 L 820 470 L 980 430 L 1120 480 L 1280 440 L 1440 490 L 1440 900 L 0 900 Z" fill="#2a2418" opacity="0.85" />
      <path d="M 0 620 L 150 560 L 320 600 L 480 550 L 640 610 L 800 570 L 960 620 L 1120 580 L 1280 615 L 1440 580 L 1440 900 L 0 900 Z" fill="#1e1a14" opacity="0.92" />
      <g opacity="0.65">
        <path d="M 0 0 Q 3 -4 6 0 Q 9 -4 12 0" stroke="#1a1510" strokeWidth="1.1" fill="none">
          <animateTransform attributeName="transform" type="translate" values="-40 380; 1500 320; 1500 320" dur="35s" repeatCount="indefinite" />
        </path>
        <path d="M 0 0 Q 3 -3 6 0 Q 9 -3 12 0" stroke="#1a1510" strokeWidth="0.9" fill="none">
          <animateTransform attributeName="transform" type="translate" values="-60 410; 1520 360; 1520 360" dur="45s" repeatCount="indefinite" begin="8s" />
        </path>
      </g>
      <g fill="#0f0c08" opacity="0.95">
        <rect x="80" y="580" width="60" height="120" /><rect x="150" y="560" width="20" height="140" />
        <rect x="180" y="600" width="50" height="100" /><rect x="240" y="570" width="18" height="130" />
        <rect x="280" y="590" width="70" height="110" /><rect x="370" y="550" width="25" height="150" />
        <rect x="410" y="580" width="80" height="120" /><rect x="510" y="600" width="40" height="100" />
        <rect x="570" y="575" width="22" height="125" /><rect x="610" y="585" width="90" height="115" />
        <rect x="720" y="560" width="28" height="140" /><rect x="820" y="595" width="70" height="105" />
        <rect x="910" y="575" width="22" height="125" /><rect x="950" y="605" width="60" height="95" />
        <rect x="1050" y="590" width="75" height="110" /><rect x="1140" y="575" width="22" height="125" />
        <rect x="1180" y="600" width="55" height="100" /><rect x="1270" y="585" width="40" height="115"/>
      </g>
      <g fill="#e8a85c" opacity="0.8">
        {Array.from({ length: 40 }).map((_, i) => {
          const x = 85 + (i * 30) % 1200;
          const y = 605 + (i * 13) % 60;
          return (
            <rect key={i} x={x} y={y} width="3" height="3">
              <animate attributeName="opacity" values="0.2;0.9;0.2" dur={`${3 + (i % 5)}s`} repeatCount="indefinite" begin={`${i * 0.2}s`}/>
            </rect>
          );
        })}
      </g>
      <g opacity="0.6">
        {[
          [160, 500, 40, 80, 10], [250, 490, 35, 70, 12], [380, 470, 45, 90, 11],
          [580, 485, 40, 75, 9], [730, 470, 42, 85, 13], [850, 490, 38, 78, 11.5],
          [970, 485, 36, 72, 10.5], [1100, 480, 40, 80, 12], [1260, 475, 38, 75, 11]
        ].map(([cx, cy, rx, ry, dur], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#m-smoke)">
            <animate attributeName="cy" values={`${cy};${cy - 45};${cy}`} dur={`${dur}s`} repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.6;0.3;0.6" dur={`${dur}s`} repeatCount="indefinite"/>
          </ellipse>
        ))}
      </g>
      <g fill="#e8a85c">
        {[
          [180, 650, 7], [380, 680, 9], [560, 660, 8], [720, 690, 10], [880, 670, 8.5],
          [1040, 685, 9.5], [1220, 665, 8], [280, 700, 7.5], [460, 695, 9], [650, 705, 10.5],
        ].map(([x, y, dur], i) => (
          <circle key={i} cx={x} cy={y} r={1.4}>
            <animate attributeName="cy" values={`${y};${y - 90};${y}`} dur={`${dur}s`} repeatCount="indefinite" begin={`${i * 0.5}s`}/>
            <animate attributeName="opacity" values="0;0.95;0" dur={`${dur}s`} repeatCount="indefinite" begin={`${i * 0.5}s`}/>
          </circle>
        ))}
      </g>
      <rect x="0" y="0" width="1440" height="900" fill="#0f0c08" opacity="0.4" />
    </svg>
  );
}

// ============================================================
// CUSTOM CURSOR
// ============================================================

function CustomCursor() {
  const [ripples, setRipples] = useState([]);
  const idRef = useRef(0);
  useEffect(() => {
    const onClick = (e) => {
      const id = idRef.current++;
      setRipples((r) => [...r, { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 600);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      {ripples.map((r) => (
        <div key={r.id} className="absolute" style={{ left: r.x, top: r.y, transform: "translate(-50%, -50%)" }}>
          <div className="w-6 h-6 rounded-full border-2 border-amber-400 animate-[ripplePop_0.6s_ease-out_forwards]" />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// UI PRIMITIVES
// ============================================================

function StatPill({ icon: Icon, symbol, label, value, inTarget, onClick }) {
  const tone = inTarget === true ? "text-emerald-300" : inTarget === false ? "text-rose-300" : "text-amber-50";
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 border border-amber-900/30 bg-stone-900/50 rounded-xl transition-all hover:bg-stone-900/80 hover:scale-[1.05] hover:-translate-y-0.5 hover:border-amber-500/60 cursor-pointer">
      {symbol ? <span className="text-[15px]">{symbol}</span>
        : <Icon size={14} className="text-amber-200/80" strokeWidth={1.8} />}
      <div className="flex flex-col leading-tight items-start">
        <span className="text-[9px] uppercase tracking-[0.18em] text-amber-200/60">{label}</span>
        <span className={`font-[Fraunces] text-[15px] ${tone}`}>{value}</span>
      </div>
    </button>
  );
}

function MinistryButton({ icon: Icon, symbol, label, onClick, active, alert, badge }) {
  return (
    <button onClick={onClick}
      className={`group relative px-4 py-3 rounded-xl border flex flex-col items-center gap-1 min-w-[94px] transition-all duration-200 ${
        active ? "border-amber-400 bg-amber-950/60 scale-[1.05]"
        : "border-amber-900/30 bg-stone-900/60 hover:border-amber-500/60 hover:bg-stone-900 hover:-translate-y-1 hover:scale-[1.04]"
      }`}>
      {symbol ? <span className="text-[20px] leading-none transition-transform group-hover:scale-110 group-hover:-rotate-3">{symbol}</span>
        : <Icon size={20} className="text-amber-200 transition-transform group-hover:scale-110 group-hover:rotate-3" strokeWidth={1.6} />}
      <span className="text-[10px] uppercase tracking-[0.18em] text-amber-100/90">{label}</span>
      {alert && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />}
      {alert && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full" />}
      {badge && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-emerald-500 rounded-full text-[10px] text-stone-900 font-[Fraunces] flex items-center justify-center px-1">{badge}</span>}
    </button>
  );
}

function PolicySlider({ label, icon: Icon, value, onChange, min, max, step, format, desc }) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon size={13} strokeWidth={1.8} style={{ color: "#44403c" }} />
          <span className="text-[11.5px] uppercase tracking-[0.14em]" style={{ color: "#44403c" }}>{label}</span>
        </div>
        <span className="font-[Fraunces] text-[15px]" style={{ color: "#1c1917" }}>{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-amber-700" />
      <div className="text-[10.5px] mt-1 leading-snug italic" style={{ color: "#78716c" }}>{desc}</div>
    </div>
  );
}

function PanelFrame({ title, subtitle, onClose, children, wide, hideClose, tone }) {
  const headerBg = tone === "major" ? "#2a1810" : "#f5ecd5";
  const headerFg = tone ? "#f2ead7" : "#1c1917";
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
      style={{ backgroundColor: "rgba(8, 10, 14, 0.85)", backdropFilter: "blur(4px)" }}>
      <div className={`${wide ? "max-w-[960px]" : "max-w-[620px]"} w-full rounded-2xl border-2 border-amber-900/40 shadow-2xl relative animate-[popIn_0.25s_ease-out] max-h-[90vh] overflow-y-auto`}
        style={{ backgroundColor: "#f5ecd5", boxShadow: "0 0 0 1px #c9a96166, 0 20px 60px rgba(0,0,0,0.7)", color: "#1c1917" }}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b-2 border-amber-900/30 rounded-t-2xl"
          style={{ backgroundColor: headerBg, color: headerFg }}>
          <div>
            <div className="font-[Fraunces] text-[22px] tracking-tight" style={{ color: headerFg }}>{title}</div>
            {subtitle && <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: tone ? "#c9a961" : "#78716c" }}>{subtitle}</div>}
          </div>
          {!hideClose && <button onClick={onClose} style={{ color: tone ? "#c9a961" : "#78716c" }} className="hover:opacity-70 hover:scale-110 transition-transform"><X size={18} /></button>}
        </div>
        <div className="p-5" style={{ color: "#292524" }}>{children}</div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN MENU, PANELS, FLOW SCREENS
// ============================================================

function MainMenu({ onNewGame, onContinue, onHow, onRanking, onAchievements, onUpdatesLog, hasSave, cheatsActive, onCheatActivated }) {
  const bufferRef = useRef("");
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.length === 1) {
        bufferRef.current = (bufferRef.current + e.key).slice(-CHEAT_CODE.length);
        if (bufferRef.current === CHEAT_CODE) { onCheatActivated(); bufferRef.current = ""; }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCheatActivated]);

  return (
    <div className="fixed inset-0 bg-[#0f0c08] overflow-hidden">
      <MenuBackdrop />
      <div className="relative z-10 h-full flex flex-col items-center justify-center animate-[fadeIn_0.8s_ease-out]">
        <div className="text-center mb-10">
          <div className="text-[11px] uppercase tracking-[0.5em] mb-3 animate-[slideDown_0.6s_ease-out]" style={{ color: "#c9a961" }}>An Economic Chronicle</div>
          <h1 className="font-[Fraunces] text-[120px] leading-none tracking-[0.02em] mb-2 animate-[slideDown_0.7s_ease-out]" style={{ color: "#f2ead7", textShadow: "0 2px 30px rgba(201, 169, 97, 0.35)" }}>AURELIA</h1>
          <div className="w-36 h-px mx-auto mb-4 animate-[slideDown_0.8s_ease-out]" style={{ background: "linear-gradient(to right, transparent, #c9a961, transparent)" }} />
          <div className="text-[13px] tracking-[0.2em] italic animate-[slideDown_0.9s_ease-out]" style={{ color: "#a89068" }}>Learn Economics by Running an Economy</div>
        </div>
        <div className="flex flex-col gap-3 w-[320px] animate-[slideUp_0.6s_ease-out_0.4s_both]">
          {hasSave && (
            <button onClick={onContinue}
              className="group rounded-xl border-2 border-emerald-600/50 bg-emerald-950/30 hover:bg-emerald-950/60 hover:border-emerald-400 hover:scale-[1.04] hover:-translate-y-1 py-4 transition-all duration-200">
              <div className="flex items-center justify-center gap-3">
                <Save size={16} style={{ color: "#7a9960" }} />
                <span className="font-[Fraunces] text-[17px] tracking-[0.18em] uppercase" style={{ color: "#f2ead7" }}>Continue</span>
                <ChevronRight size={14} style={{ color: "#7a9960" }} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )}
          <button onClick={onNewGame}
            className="group rounded-xl border-2 border-amber-600/60 bg-stone-950/60 hover:bg-amber-950/60 hover:border-amber-400 hover:scale-[1.04] hover:-translate-y-1 py-4 transition-all duration-200">
            <div className="flex items-center justify-center gap-3">
              <Crown size={16} style={{ color: "#c9a961" }} />
              <span className="font-[Fraunces] text-[17px] tracking-[0.18em] uppercase" style={{ color: "#f2ead7" }}>New Campaign</span>
              <ChevronRight size={14} style={{ color: "#c9a961" }} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={onRanking}
              className="rounded-xl border border-amber-900/40 bg-stone-950/40 hover:bg-stone-900/60 hover:scale-[1.04] py-3 transition-all">
              <div className="flex flex-col items-center gap-1">
                <Globe size={14} style={{ color: "#a89068" }} />
                <span className="font-[Fraunces] text-[11px] tracking-[0.14em] uppercase" style={{ color: "#d4c090" }}>World GDP</span>
              </div>
            </button>
            <button onClick={onAchievements}
              className="rounded-xl border border-amber-900/40 bg-stone-950/40 hover:bg-stone-900/60 hover:scale-[1.04] py-3 transition-all">
              <div className="flex flex-col items-center gap-1">
                <Trophy size={14} style={{ color: "#a89068" }} />
                <span className="font-[Fraunces] text-[11px] tracking-[0.14em] uppercase" style={{ color: "#d4c090" }}>Trophies</span>
              </div>
            </button>
            <button onClick={onHow}
              className="rounded-xl border border-amber-900/40 bg-stone-950/40 hover:bg-stone-900/60 hover:scale-[1.04] py-3 transition-all">
              <div className="flex flex-col items-center gap-1">
                <BookOpen size={14} style={{ color: "#a89068" }} />
                <span className="font-[Fraunces] text-[11px] tracking-[0.14em] uppercase" style={{ color: "#d4c090" }}>How to</span>
              </div>
            </button>
          </div>
        </div>
        {cheatsActive && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.25em] uppercase flex items-center gap-2 animate-[fadeIn_0.4s_ease-out]" style={{ color: "#c77a3f" }}>
            <Wand2 size={12} /> Cheats Active
          </div>
        )}
        {/* Updates log: low-profile button in the bottom-left. Intentionally small
            and muted so it reads as a footer link rather than a feature. */}
        <button onClick={onUpdatesLog}
          className="absolute bottom-5 left-5 text-[10px] tracking-[0.22em] uppercase flex items-center gap-1.5 hover:text-amber-100 transition-colors"
          style={{ color: "#6a5840" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#a89068")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6a5840")}>
          <ScrollText size={11} strokeWidth={1.6} />
          <span>Release Notes</span>
        </button>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.3em] uppercase" style={{ color: "#6a5840" }}>
          Version 0.7.1 &middot; A prototype
        </div>
      </div>
    </div>
  );
}

function GdpRanking({ ranking, onClose }) {
  return (
    <PanelFrame title="Global GDP Ranking" subtitle="Nominal GDP in billions USD" onClose={onClose}>
      <div className="text-[12px] mb-3" style={{ color: "#44403c" }}>
        The top 30 world economies with your nation included. Other countries grow while you play; higher difficulty makes them grow faster.
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-[12.5px]">
        {ranking.slice(0, 32).map((c, idx) => {
          const rank = idx + 1;
          const isUser = c.isUser;
          return (
            <div key={`${c.name}-${idx}`} className="flex items-center gap-2 py-1 px-2 rounded-md"
              style={isUser ? { backgroundColor: "#c9a96133", border: "1px solid #c9a961" } : {}}>
              <div className={`w-7 text-right font-[Fraunces] ${rank <= 3 ? "text-[15px]" : ""}`}
                style={{ color: rank === 1 ? "#c9a961" : rank === 2 ? "#a8a29e" : rank === 3 ? "#b87240" : "#78716c" }}>
                {rank}
              </div>
              <div className="text-[17px] leading-none">{c.flag}</div>
              <div className={`flex-1 ${isUser ? "font-[Fraunces]" : ""}`} style={{ color: isUser ? "#1c1917" : "#292524" }}>
                {c.name}{isUser && <span className="text-[10px] uppercase ml-1 tracking-[0.15em]" style={{ color: "#c9a961" }}>you</span>}
              </div>
              <div className="font-[Fraunces]" style={{ color: "#1c1917" }}>{fmtMoney(c.gdp)}</div>
            </div>
          );
        })}
      </div>
    </PanelFrame>
  );
}

function AchievementsPanel({ unlocked, onClose }) {
  const total = ACHIEVEMENTS.length;
  const done = unlocked.length;
  const cannyCount = ACHIEVEMENTS.filter(a => a.tier === "canny").length;
  const uncannyCount = ACHIEVEMENTS.filter(a => a.tier === "uncanny").length;
  const cannyDone = unlocked.filter(k => ACHIEVEMENTS.find(a => a.key === k)?.tier === "canny").length;
  const uncannyDone = unlocked.filter(k => ACHIEVEMENTS.find(a => a.key === k)?.tier === "uncanny").length;

  // Tier palettes:
  // - canny: approachable, grassy emerald.
  // - uncanny: stranger, witchier violet.
  const palette = {
    canny: { border: "#4a7c5c", bgEarned: "#dcefe1", bgUnearned: "rgba(236,248,239,0.55)", tagBg: "#4a7c5c", tagFg: "#f5ecd5", label: "Canny" },
    uncanny: { border: "#6b4a8a", bgEarned: "#ecdcf0", bgUnearned: "rgba(240,232,248,0.55)", tagBg: "#6b4a8a", tagFg: "#f5ecd5", label: "Uncanny" },
  };

  return (
    <PanelFrame title="Achievements" subtitle={`${done} of ${total} earned`} onClose={onClose} wide>
      <div className="flex items-center gap-3 mb-4 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: palette.canny.tagBg }} />
          <span style={{ color: "#44403c" }}>Canny: {cannyDone} / {cannyCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: palette.uncanny.tagBg }} />
          <span style={{ color: "#44403c" }}>Uncanny: {uncannyDone} / {uncannyCount}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {ACHIEVEMENTS.map((a) => {
          const got = unlocked.includes(a.key);
          const reveal = got || !a.hidden;
          const p = palette[a.tier] || palette.canny;
          return (
            <div key={a.key} className="rounded-xl border-2 p-3 transition-all relative"
              style={got ? { borderColor: p.border, backgroundColor: p.bgEarned }
                : reveal ? { borderColor: "#d6d3d1", backgroundColor: p.bgUnearned, opacity: 0.85 }
                : { borderColor: "#d6d3d1", backgroundColor: "rgba(240,235,215,0.4)" }}>
              {reveal && (
                <span className="absolute top-1.5 right-1.5 text-[8.5px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded font-[Fraunces]"
                  style={{ backgroundColor: p.tagBg, color: p.tagFg, opacity: got ? 0.95 : 0.6 }}>
                  {p.label}
                </span>
              )}
              <div className="flex items-start gap-3">
                <div className="text-[28px] leading-none" style={{ filter: got ? "none" : "grayscale(1) opacity(0.5)" }}>
                  {reveal ? a.icon : "❓"}
                </div>
                <div className="flex-1 pr-14">
                  <div className="font-[Fraunces] text-[14px]" style={{ color: "#1c1917" }}>
                    {reveal ? a.title : "??? Hidden"}
                  </div>
                  <div className="text-[11.5px] leading-snug mt-1" style={{ color: "#44403c" }}>
                    {reveal ? a.description : "An uncanny milestone, yet to be discovered."}
                  </div>
                </div>
                {got && <Check size={16} style={{ color: p.border }} className="absolute bottom-2 right-2" />}
              </div>
            </div>
          );
        })}
      </div>
    </PanelFrame>
  );
}

function StatDetailModal({ statKey, state, history, difficulty, onClose }) {
  const targets = getTargets(difficulty);
  const meta = {
    growth: { title: "GDP Growth", symbol: "📈", unit: "%", dataKey: "gdpGrowth", color: "#1c1917", range: [targets.growth.min * 100, targets.growth.max * 100] },
    unemployment: { title: "Unemployment", symbol: "👥", unit: "%", dataKey: "unemployment", color: "#9f1239", range: [targets.unemployment.min * 100, targets.unemployment.max * 100] },
    inflation: { title: "Inflation", symbol: "💸", unit: "%", dataKey: "inflation", color: "#a16207", range: [targets.inflation.min * 100, targets.inflation.max * 100] },
    debt: { title: "Debt to GDP", symbol: "🏛️", unit: "%", dataKey: null, color: "#7a4236", range: null },
    approval: { title: "Public Approval", symbol: "❤️", unit: "%", dataKey: null, color: "#a83838", range: null },
    gdp: { title: "Total GDP", symbol: "💰", unit: "", dataKey: null, color: "#7a9960", range: null },
  };
  const m = meta[statKey];
  if (!m) return null;
  const tip = getStatTip(statKey, state, targets, difficulty);

  let chartData = [];
  if (m.dataKey) chartData = history.map(h => ({ label: h.label, v: h[m.dataKey] }));
  else if (statKey === "approval") chartData = [{ label: "now", v: state.approval }];
  else if (statKey === "debt") chartData = [{ label: "now", v: (state.debt / state.gdp) * 100 }];
  else if (statKey === "gdp") chartData = [{ label: "now", v: state.gdp }];

  return (
    <PanelFrame title={`${m.symbol}  ${m.title}`} subtitle="Detail & guidance" onClose={onClose} wide>
      {chartData.length > 1 ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 15, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="statfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={m.color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={m.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#57534e" }} stroke="#a8a29e" />
            <YAxis tick={{ fontSize: 10, fill: "#57534e" }} stroke="#a8a29e" unit={m.unit} />
            <Tooltip contentStyle={{ background: "#f5ecd5", border: "1px solid #8a6d3b", fontSize: 12, borderRadius: 8 }} formatter={(v) => `${v}${m.unit}`} />
            {m.range && (<>
              <ReferenceLine y={m.range[0]} stroke="#7a9960" strokeDasharray="3 3" />
              <ReferenceLine y={m.range[1]} stroke="#7a9960" strokeDasharray="3 3" />
            </>)}
            <Area type="monotone" dataKey="v" stroke={m.color} strokeWidth={2} fill="url(#statfill)" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-8 text-[12px] italic" style={{ color: "#78716c" }}>Quarterly history will populate here as you play.</div>
      )}
      <div className="mt-4 pt-4 border-t" style={{ borderColor: "#d6d3d1" }}>
        <div className="flex items-center gap-2 mb-2">
          <Info size={13} style={{ color: "#b87240" }}/>
          <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "#44403c" }}>Adviser's note</span>
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: "#1c1917" }}>{tip}</p>
      </div>
    </PanelFrame>
  );
}

function CheatsPanel({ onApply, onClose }) {
  return (
    <PanelFrame title="Cheats" subtitle="No mortals were harmed" onClose={onClose} wide>
      <div className="text-[12px] mb-4 italic" style={{ color: "#44403c" }}>
        You found the secret code. Use these freely — the economic gods are watching.
      </div>
      <div className="grid grid-cols-2 gap-3">
        {CHEATS.map((c) => (
          <button key={c.key} onClick={() => onApply(c)}
            className="text-left rounded-xl border-2 p-3 transition-all hover:scale-[1.03] hover:-translate-y-0.5"
            style={{ borderColor: "#c77a3f", backgroundColor: "rgba(199, 122, 63, 0.08)", color: "#1c1917" }}>
            <div className="flex items-start gap-3">
              <div className="text-[26px] leading-none">{c.icon}</div>
              <div>
                <div className="font-[Fraunces] text-[14px]">{c.label}</div>
                <div className="text-[11px] leading-snug mt-0.5">{c.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </PanelFrame>
  );
}

// Minimalist release-notes viewer. Entries are typed "fix" / "add" / "tune"
// and rendered as a plain timeline so players can skim what changed between versions.
function UpdatesLog({ onClose }) {
  const typeStyle = {
    fix: { label: "Fix", color: "#9a3b2a" },
    add: { label: "New", color: "#446a32" },
    tune: { label: "Tune", color: "#9a7a2a" },
  };
  return (
    <PanelFrame title="Release Notes" subtitle="A running log of changes" onClose={onClose}>
      <div className="space-y-5">
        {UPDATES_LOG.map((v) => (
          <div key={v.version} className="pb-4 border-b last:border-b-0" style={{ borderColor: "#d6d3d1" }}>
            <div className="flex items-baseline gap-3 mb-2">
              <div className="font-[Fraunces] text-[20px]" style={{ color: "#1c1917" }}>v{v.version}</div>
              <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: "#78716c" }}>{v.date}</div>
            </div>
            <ul className="space-y-1.5">
              {v.entries.map((e, i) => {
                const t = typeStyle[e.type] || typeStyle.add;
                return (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed" style={{ color: "#292524" }}>
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-[0.15em] font-[Fraunces] flex-shrink-0"
                      style={{ backgroundColor: `${t.color}22`, color: t.color, minWidth: "36px", textAlign: "center" }}>
                      {t.label}
                    </span>
                    <span>{e.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </PanelFrame>
  );
}

function ModeSelect({ onPick, onBack }) {
  return (
    <div className="fixed inset-0 bg-[#0f0c08] overflow-y-auto">
      <MenuBackdrop />
      <div className="relative z-10 min-h-full flex flex-col items-center justify-center p-6 animate-[fadeIn_0.4s_ease-out]">
        <div className="text-center mb-8">
          <div className="text-[11px] uppercase tracking-[0.4em] mb-2" style={{ color: "#c9a961" }}>Choose your path</div>
          <h2 className="font-[Fraunces] text-[42px]" style={{ color: "#f2ead7" }}>Campaign Mode</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[1100px] w-full">
          {[
            { key: "fiction", icon: Sparkles, title: "Fictional", color: "#c9a961", desc: "Govern Aurelia or build your own nation from scratch." },
            { key: "nonfiction", icon: Globe, title: "Real World", color: "#7a9960", desc: "Pick any of the world's top 30 economies from a global map." },
            { key: "historical", icon: History, title: "Historical", color: "#b87240", desc: "Take on famous economic crises from history." },
          ].map((opt) => {
            const Icon = opt.icon;
            return (
              <button key={opt.key} onClick={() => onPick(opt.key)}
                className="group text-left rounded-2xl border-2 p-6 bg-stone-950/70 hover:bg-stone-900 hover:scale-[1.04] hover:-translate-y-2 transition-all duration-200"
                style={{ borderColor: `${opt.color}55` }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = opt.color}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = `${opt.color}55`}>
                <Icon size={32} style={{ color: opt.color }} strokeWidth={1.5} className="mb-4 transition-transform group-hover:scale-110 group-hover:rotate-6" />
                <div className="font-[Fraunces] text-[24px] mb-2" style={{ color: "#f2ead7" }}>{opt.title}</div>
                <div className="text-[12.5px] leading-relaxed" style={{ color: "#d4c090" }}>{opt.desc}</div>
              </button>
            );
          })}
        </div>
        <button onClick={onBack} className="mt-8 text-[11px] uppercase tracking-[0.2em] hover:text-amber-100 transition-colors" style={{ color: "#a89068" }}>&larr; Back</button>
      </div>
    </div>
  );
}

// ============================================================
// WORLD MAP — v0.7a
// ============================================================
// A hand-drawn SVG world map used as the entry point for picking a real-world
// country. Continents are rendered as parchment-toned silhouettes; each of
// the top-30 countries gets a marker at its geographic centroid. Playable
// countries are highlighted in gold; info-only countries sit in a dimmer
// stone tone so they still feel present but clearly distinct.
//
// Clicking a marker opens a Victoria-3-style side panel with GDP, growth,
// and a one-line economic summary. Playable countries get a primary action
// button; info-only countries get a tasteful "not yet playable" note.

// ============================================================
// World map — real GeoJSON via react-simple-maps + world-atlas
// ============================================================
//
// Renders accurate country borders sourced from world-atlas (Natural Earth
// 110m resolution, ~110KB) loaded over jsdelivr's CDN. Each of the top 30
// economies is matched by ISO 3166-1 numeric code and styled distinctly:
// - Playable countries: warm gold (the campaign-ready 8)
// - Info-only countries: muted brass (data exists but not yet playable)
// - Other nations: parchment beige (visible but not interactive)
//
// On top of the geography we overlay flag markers at each country's
// centroid, mainly so smaller countries (Belgium, Switzerland, Israel)
// stay clickable even at this resolution.
//
// The projection is geoNaturalEarth1, which preserves shape well at the
// continental scale and fits cleanly inside a 16:9 viewBox.

function WorldMap({ onSelectCountry, highlightedKey }) {
  const [hoverIso, setHoverIso] = useState(null);

  // Helper: world-atlas TopoJSON sometimes returns numeric `id`, sometimes
  // a zero-padded string. Normalize to a 3-char zero-padded string so it
  // matches our COUNTRY_BY_ISO keys.
  const normalizeIso = (id) => String(id).padStart(3, "0");

  // Style a country geography based on whether we have data for it.
  const styleFor = (iso) => {
    const c = COUNTRY_BY_ISO[iso];
    const isHover = hoverIso === iso;
    const isSelected = c && highlightedKey === (c.internalKey || c.name);

    if (!c) {
      // Country we don't track. Plain parchment, no interaction.
      return {
        default: { fill: "#a89572", stroke: "#5a4a34", strokeWidth: 0.4, outline: "none" },
        hover:   { fill: "#a89572", stroke: "#5a4a34", strokeWidth: 0.4, outline: "none", cursor: "default" },
        pressed: { fill: "#a89572", stroke: "#5a4a34", strokeWidth: 0.4, outline: "none" },
      };
    }
    if (c.playable) {
      const baseFill = isSelected ? "#e8c25a" : "#d4a94a";
      const hoverFill = "#e8c25a";
      return {
        default: { fill: baseFill, stroke: "#6a4f1a", strokeWidth: 0.7, outline: "none" },
        hover:   { fill: hoverFill, stroke: "#6a4f1a", strokeWidth: 0.9, outline: "none", cursor: "pointer" },
        pressed: { fill: hoverFill, stroke: "#6a4f1a", strokeWidth: 0.9, outline: "none" },
      };
    }
    // Info-only country: muted brass tone.
    const baseFill = isSelected ? "#9c8456" : "#7d6a4a";
    return {
      default: { fill: baseFill, stroke: "#3a2f1f", strokeWidth: 0.5, outline: "none" },
      hover:   { fill: "#9c8456", stroke: "#3a2f1f", strokeWidth: 0.7, outline: "none", cursor: "pointer" },
      pressed: { fill: "#9c8456", stroke: "#3a2f1f", strokeWidth: 0.7, outline: "none" },
    };
  };

  return (
    <div className="relative w-full" style={{ background: "linear-gradient(180deg, #1c2a3a 0%, #0f1a26 100%)" }}>
      {/* Wave overlay — subtle, sits between the sea fill and the map */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="wm2-waves" x="0" y="0" width="60" height="14" patternUnits="userSpaceOnUse">
            <path d="M 0 7 Q 15 0 30 7 Q 45 14 60 7" stroke="#2e4358" strokeWidth="0.5" fill="none" opacity="0.45"/>
          </pattern>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="url(#wm2-waves)" />
      </svg>

      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 200, center: [10, 12] }}
        width={1400}
        height={700}
        style={{ width: "100%", height: "auto", display: "block" }}>
        <Geographies geography={WORLD_TOPOJSON_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const iso = normalizeIso(geo.id);
              const c = COUNTRY_BY_ISO[iso];
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={styleFor(iso)}
                  onMouseEnter={() => c && setHoverIso(iso)}
                  onMouseLeave={() => setHoverIso(null)}
                  onClick={() => c && onSelectCountry(c)}
                />
              );
            })
          }
        </Geographies>

        {/* Flag markers for the 30 tracked countries — supplements the geography
            so tiny states (Belgium, Switzerland, Israel) stay obvious and
            clickable. */}
        {WORLD_COUNTRIES.map((c) => {
          const isHover = hoverIso === c.iso;
          const isSelected = highlightedKey === (c.internalKey || c.name);
          const showLabel = isHover || isSelected;
          return (
            <Marker
              key={c.iso}
              coordinates={[c.lng, c.lat]}
              onMouseEnter={() => setHoverIso(c.iso)}
              onMouseLeave={() => setHoverIso(null)}
              onClick={() => onSelectCountry(c)}
              style={{ default: { cursor: "pointer" } }}>
              <g>
                <circle r={isHover || isSelected ? 9 : 6}
                  fill={c.playable ? "#1a1510" : "#1a1510"}
                  stroke={c.playable ? "#e8c25a" : "#a89068"}
                  strokeWidth={1.4}
                  opacity={0.9} />
                <text textAnchor="middle" y={4} fontSize={isHover || isSelected ? 11 : 8} style={{ pointerEvents: "none" }}>
                  {c.flag}
                </text>
                {showLabel && (
                  <g style={{ pointerEvents: "none" }}>
                    <rect x={-58} y={12} width={116} height={18} rx={3}
                      fill="#1a1510" opacity={0.94}
                      stroke={c.playable ? "#e8c25a" : "#a89068"} strokeWidth={0.6} />
                    <text textAnchor="middle" y={24} fontFamily="Fraunces, serif"
                      fontSize={10.5} fill="#f2ead7">{c.name}</text>
                  </g>
                )}
              </g>
            </Marker>
          );
        })}
      </ComposableMap>

      {/* Vignette overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(11,20,29,0.55) 100%)" }} />
    </div>
  );
}

// Victoria-3-inspired side panel describing a country the player has clicked
// on the world map. Shows GDP, growth, a one-line summary, and a primary
// action (Play, or "Not yet playable" for countries without full region data).
function CountryInfoPanel({ country, onPlay, onClose }) {
  if (!country) return null;
  const { name, flag, gdp, growth, summary, playable } = country;
  return (
    <div className="absolute top-6 right-6 w-[340px] z-20 animate-[slideInRight_0.3s_ease-out]">
      <div className="rounded-2xl border-2 p-5 shadow-2xl"
        style={{ backgroundColor: "rgba(26, 21, 16, 0.96)", borderColor: playable ? "#c9a961" : "#5a4a34",
                 boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
        <div className="flex items-start gap-3 mb-3">
          <div className="text-[42px] leading-none">{flag}</div>
          <div className="flex-1">
            <div className="font-[Fraunces] text-[22px] leading-tight" style={{ color: "#f2ead7" }}>{name}</div>
            <div className="text-[10px] uppercase tracking-[0.22em] mt-0.5"
              style={{ color: playable ? "#c9a961" : "#a89068" }}>
              {playable ? "Playable · 2026" : "Info only"}
            </div>
          </div>
          <button onClick={onClose} className="text-amber-200/50 hover:text-amber-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 my-4">
          <div className="rounded-lg border p-2" style={{ borderColor: "#3a2f1f" }}>
            <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "#a89068" }}>Nominal GDP</div>
            <div className="font-[Fraunces] text-[16px]" style={{ color: "#f2ead7" }}>
              {gdp >= 1000 ? `$${(gdp / 1000).toFixed(1)}T` : `$${gdp}B`}
            </div>
          </div>
          <div className="rounded-lg border p-2" style={{ borderColor: "#3a2f1f" }}>
            <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "#a89068" }}>Trend growth</div>
            <div className="font-[Fraunces] text-[16px]" style={{ color: "#f2ead7" }}>
              {(growth * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <p className="text-[12px] leading-relaxed italic mb-4" style={{ color: "#d4c090" }}>
          {summary}
        </p>

        {playable ? (
          <button onClick={() => onPlay(country)}
            className="w-full rounded-xl py-3 border-2 transition-all hover:scale-[1.02] hover:-translate-y-0.5 flex items-center justify-center gap-2"
            style={{ borderColor: "#c9a961", backgroundColor: "#c9a96122", color: "#f2ead7" }}>
            <Crown size={14} style={{ color: "#c9a961" }} />
            <span className="font-[Fraunces] text-[13px] tracking-[0.2em] uppercase">Play as {name}</span>
          </button>
        ) : (
          <div className="rounded-xl border-2 border-dashed p-3 text-center"
            style={{ borderColor: "#5a4a34" }}>
            <div className="text-[10.5px] uppercase tracking-[0.18em] mb-1" style={{ color: "#a89068" }}>Coming in a future update</div>
            <div className="text-[11px] italic" style={{ color: "#8a7860" }}>
              Region data still being authored for this country.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CountryPicker({ mode, onSelect, onBack, onCustom }) {
  const fictional = [COUNTRIES.aurelia];
  // Filter out scenario-only countries (e.g., Turkey in v0.7) so they don't
  // appear in the real-world picker; they live only inside the scenario flow.
  const nonfictional = Object.values(COUNTRIES).filter(c => c.kind === "nonfiction" && !c.scenarioOnly);

  // --------------------- Real-world world-map path ---------------------
  const [selectedWorldCountry, setSelectedWorldCountry] = useState(null);
  if (mode === "nonfiction") {
    const handleWorldClick = (country) => {
      setSelectedWorldCountry(country);
    };
    const handlePlay = (country) => {
      if (country.playable && country.internalKey) onSelect(country.internalKey);
    };
    return (
      <div className="fixed inset-0 bg-[#0f0c08] overflow-hidden">
        <MenuBackdrop />
        <div className="relative z-10 h-full flex flex-col items-center p-6 animate-[fadeIn_0.4s_ease-out]">
          <div className="text-center mb-4">
            <div className="text-[11px] uppercase tracking-[0.4em] mb-2" style={{ color: "#c9a961" }}>Select a nation</div>
            <h2 className="font-[Fraunces] text-[34px]" style={{ color: "#f2ead7" }}>Real World · 2026</h2>
            <div className="text-[11px] italic mt-1" style={{ color: "#a89068" }}>
              The world's top 30 economies. Gold markers are playable today; stone markers are info-only for now.
            </div>
          </div>
          <div className="relative w-full max-w-[1400px] flex-1 flex items-center justify-center">
            <div className="w-full relative">
              <div className="rounded-2xl border-2 border-amber-900/40 overflow-hidden"
                style={{ boxShadow: "0 0 0 1px #c9a96133 inset, 0 20px 60px rgba(0,0,0,0.6)" }}>
                <WorldMap onSelectCountry={handleWorldClick}
                  highlightedKey={selectedWorldCountry?.internalKey || selectedWorldCountry?.name} />
              </div>
              {selectedWorldCountry && (
                <CountryInfoPanel country={selectedWorldCountry}
                  onPlay={handlePlay}
                  onClose={() => setSelectedWorldCountry(null)} />
              )}
            </div>
          </div>
          <div className="flex items-center justify-between w-full max-w-[1400px] mt-3">
            <button onClick={onBack} className="text-[11px] uppercase tracking-[0.2em] hover:text-amber-100 transition-colors" style={{ color: "#a89068" }}>&larr; Back</button>
            <div className="text-[10px] flex items-center gap-4" style={{ color: "#a89068" }}>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#d4a94a", border: "1px solid #6a4f1a" }} />
                Playable
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#7d6a4a", border: "1px solid #3a2f1f" }} />
                Info only
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#a89572", border: "1px solid #5a4a34" }} />
                Other nations
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------- Fiction path (unchanged) ---------------------
  const visible = fictional;
  return (
    <div className="fixed inset-0 bg-[#0f0c08] overflow-y-auto">
      <MenuBackdrop />
      <div className="relative z-10 min-h-full flex flex-col items-center justify-center p-6 py-12 animate-[fadeIn_0.4s_ease-out]">
        <div className="text-center mb-6">
          <div className="text-[11px] uppercase tracking-[0.4em] mb-2" style={{ color: "#c9a961" }}>Select a nation</div>
          <h2 className="font-[Fraunces] text-[38px]" style={{ color: "#f2ead7" }}>Fictional Nations</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 max-w-[1100px] w-full">
          {visible.map((c) => (
            <button key={c.key} onClick={() => onSelect(c.key)}
              className="group text-left rounded-2xl border-2 p-5 bg-stone-950/70 hover:bg-stone-900 hover:scale-[1.03] hover:-translate-y-1 transition-all duration-200"
              style={{ borderColor: "#c9a96155" }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "#c9a961"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "#c9a96155"}>
              <div className="flex items-start gap-3 mb-3">
                {c.flagEmoji ? <div className="text-[28px] leading-none">{c.flagEmoji}</div>
                  : <Sparkles size={26} style={{ color: "#c9a961" }} strokeWidth={1.5} />}
                <div>
                  <div className="font-[Fraunces] text-[20px]" style={{ color: "#f2ead7" }}>{c.name}</div>
                  <div className="text-[10.5px] uppercase tracking-[0.18em] italic" style={{ color: "#c9a961" }}>{c.subtitle}</div>
                </div>
              </div>
              <div className="text-[11.5px] leading-relaxed mb-3" style={{ color: "#d4c090" }}>{c.flavor}</div>
              <div className="pt-2 border-t text-[10.5px] flex items-center gap-2 flex-wrap" style={{ borderColor: "#3a2f1f", color: "#a89068" }}>
                <span><MapPin size={10} className="inline mr-1" />{c.regions.length} regions</span>
                <span>&middot;</span>
                <span>{fmtMoney(c.startingGdp)} GDP</span>
              </div>
            </button>
          ))}
          <button onClick={onCustom}
            className="group text-left rounded-2xl border-2 border-dashed p-5 bg-stone-950/40 hover:bg-stone-900/60 hover:scale-[1.03] hover:-translate-y-1 transition-all duration-200"
            style={{ borderColor: "#c9a96144" }}>
            <div className="flex items-start gap-3 mb-3">
              <Plus size={26} style={{ color: "#c9a961" }} strokeWidth={1.5} />
              <div>
                <div className="font-[Fraunces] text-[20px]" style={{ color: "#f2ead7" }}>Create Your Own</div>
                <div className="text-[10.5px] uppercase tracking-[0.18em] italic" style={{ color: "#c9a961" }}>Custom fictional nation</div>
              </div>
            </div>
            <div className="text-[11.5px] leading-relaxed" style={{ color: "#d4c090" }}>Name your country and pick an archetype.</div>
          </button>
        </div>
        <button onClick={onBack} className="mt-8 text-[11px] uppercase tracking-[0.2em]" style={{ color: "#a89068" }}>&larr; Back</button>
      </div>
    </div>
  );
}

function ScenarioPicker({ onSelect, onBack }) {
  const scenarios = Object.values(HISTORICAL_SCENARIOS);
  return (
    <div className="fixed inset-0 bg-[#0f0c08] overflow-y-auto">
      <MenuBackdrop />
      <div className="relative z-10 min-h-full flex flex-col items-center justify-center p-6 py-12 animate-[fadeIn_0.4s_ease-out]">
        <div className="text-center mb-6">
          <div className="text-[11px] uppercase tracking-[0.4em] mb-2" style={{ color: "#c9a961" }}>Chronicles</div>
          <h2 className="font-[Fraunces] text-[38px]" style={{ color: "#f2ead7" }}>Historical Scenarios</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[1000px] w-full">
          {scenarios.map((s) => (
            <button key={s.key} onClick={() => onSelect(s.key)}
              className="group text-left rounded-2xl border-2 p-5 bg-stone-950/70 hover:bg-stone-900 hover:scale-[1.03] hover:-translate-y-1 transition-all duration-200"
              style={{ borderColor: "#b8724055" }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "#b87240"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "#b8724055"}>
              <div className="flex items-start gap-3 mb-3">
                <History size={26} style={{ color: "#b87240" }} strokeWidth={1.5} />
                <div>
                  <div className="font-[Fraunces] text-[20px]" style={{ color: "#f2ead7" }}>{s.name}</div>
                  <div className="text-[10.5px] uppercase tracking-[0.18em] italic" style={{ color: "#b87240" }}>{s.period}</div>
                </div>
              </div>
              <div className="text-[11.5px] leading-relaxed mb-3" style={{ color: "#d4c090" }}>{s.flavor}</div>
              <div className="pt-2 border-t text-[10.5px]" style={{ borderColor: "#3a2f1f", color: "#a89068" }}>
                <div><span style={{ color: "#c9a961" }}>Objective: </span>{s.winConditionText}</div>
              </div>
            </button>
          ))}
        </div>
        <button onClick={onBack} className="mt-8 text-[11px] uppercase tracking-[0.2em]" style={{ color: "#a89068" }}>&larr; Back</button>
      </div>
    </div>
  );
}

function CustomBuilder({ onDone, onBack }) {
  const [name, setName] = useState("");
  const [archetype, setArchetype] = useState("developed");
  const create = () => {
    if (!name.trim()) return;
    const arch = ARCHETYPES[archetype];
    onDone({
      key: "custom", name: name.trim(), kind: "fiction",
      subtitle: arch.name, regions: arch.regions, mapViewBox: "0 0 640 450",
      startingGdp: arch.startingGdp, baseTrend: arch.baseTrend,
      startingDebtBonus: arch.startingDebtBonus, startingUnemp: arch.startingUnemp,
      flavor: arch.description,
    });
  };
  return (
    <div className="fixed inset-0 bg-[#0f0c08] overflow-y-auto">
      <MenuBackdrop />
      <div className="relative z-10 min-h-full flex flex-col items-center justify-center p-6 animate-[fadeIn_0.4s_ease-out]">
        <div className="text-center mb-6">
          <div className="text-[11px] uppercase tracking-[0.4em] mb-2" style={{ color: "#c9a961" }}>Forge a nation</div>
          <h2 className="font-[Fraunces] text-[40px]" style={{ color: "#f2ead7" }}>Custom Country</h2>
        </div>
        <div className="w-full max-w-[720px] rounded-2xl border-2 border-amber-900/50 bg-stone-950/70 p-6 mb-6">
          <label className="text-[11px] uppercase tracking-[0.2em] block mb-2" style={{ color: "#c9a961" }}>Name your country</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30}
            placeholder="Republic of..."
            className="w-full bg-stone-900/70 border border-amber-900/40 rounded-lg px-4 py-3 font-[Fraunces] text-[22px] text-amber-100 placeholder:text-stone-600 focus:border-amber-500 focus:outline-none transition-colors" />
        </div>
        <div className="w-full max-w-[900px]">
          <div className="text-[11px] uppercase tracking-[0.2em] mb-3 text-center" style={{ color: "#c9a961" }}>Choose an archetype</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.values(ARCHETYPES).map((a) => {
              const active = archetype === a.key;
              const icons = { developed: Building2, developing: Sprout, resource: Mountain, postcrisis: Flame };
              const Icon = icons[a.key];
              return (
                <button key={a.key} onClick={() => setArchetype(a.key)}
                  className={`rounded-xl border-2 p-4 text-left transition-all duration-200 ${active ? "scale-[1.05] -translate-y-1" : "hover:scale-[1.03] hover:-translate-y-1"}`}
                  style={{ backgroundColor: active ? "#1a1510" : "#0f0c08", borderColor: active ? "#c9a961" : "#3a2f1f" }}>
                  <Icon size={22} style={{ color: active ? "#c9a961" : "#a89068" }} strokeWidth={1.5} className="mb-2" />
                  <div className="font-[Fraunces] text-[15px] mb-1" style={{ color: active ? "#f2ead7" : "#d4c090" }}>{a.name}</div>
                  <div className="text-[10.5px] leading-snug" style={{ color: active ? "#d4c090" : "#a89068" }}>{a.description}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-8">
          <button onClick={onBack} className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "#a89068" }}>&larr; Back</button>
          <button onClick={create} disabled={!name.trim()}
            className="group rounded-xl px-6 py-3 border-2 hover:scale-[1.04] hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-40"
            style={{ borderColor: "#c9a961", color: "#f2ead7", backgroundColor: "#1a1510" }}>
            <span className="font-[Fraunces] text-[14px] tracking-[0.22em] uppercase">Continue</span>
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DifficultySelect({ onSelect, onBack }) {
  return (
    <div className="fixed inset-0 bg-[#0f0c08] overflow-y-auto">
      <MenuBackdrop />
      <div className="relative z-10 min-h-full flex flex-col items-center justify-center p-6 animate-[fadeIn_0.4s_ease-out]">
        <div className="text-center mb-8">
          <div className="text-[11px] uppercase tracking-[0.4em] mb-2" style={{ color: "#c9a961" }}>Choose your mandate</div>
          <h2 className="font-[Fraunces] text-[40px]" style={{ color: "#f2ead7" }}>Difficulty</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-[1100px] w-full">
          {Object.values(DIFFICULTIES).map((d) => {
            const Icon = d.icon;
            return (
              <button key={d.key} onClick={() => onSelect(d.key)}
                className="group text-left rounded-2xl border-2 p-5 bg-stone-950/70 hover:bg-stone-900 hover:scale-[1.05] hover:-translate-y-1 transition-all duration-200"
                style={{ borderColor: `${d.color}55` }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = d.color}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = `${d.color}55`}>
                <Icon size={28} style={{ color: d.color }} strokeWidth={1.5} className="mb-3 transition-transform group-hover:scale-110 group-hover:rotate-6" />
                <div className="font-[Fraunces] text-[22px] mb-1" style={{ color: "#f2ead7" }}>{d.name}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] italic mb-3" style={{ color: d.color }}>{d.tagline}</div>
                <div className="text-[11.5px] leading-snug mb-4" style={{ color: "#d4c090" }}>{d.description}</div>
                <div className="pt-3 border-t" style={{ borderColor: "#3a2f1f" }}>
                  <div className="text-[10px] space-y-0.5" style={{ color: "#a89068" }}>
                    <div className="flex justify-between"><span>Win streak:</span><span className="font-[Fraunces]" style={{ color: "#f2ead7" }}>{d.winStreak}Q</span></div>
                    <div className="flex justify-between"><span>Approval:</span><span className="font-[Fraunces]" style={{ color: "#f2ead7" }}>{d.startingApproval}%</span></div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={onBack} className="mt-6 text-[11px] uppercase tracking-[0.2em]" style={{ color: "#a89068" }}>&larr; Back</button>
      </div>
    </div>
  );
}

function Briefing({ difficulty, country, scenario, onBegin, onBack }) {
  const d = DIFFICULTIES[difficulty];
  const targets = getTargets(difficulty);
  return (
    <div className="fixed inset-0 bg-[#0f0c08] overflow-y-auto">
      <MenuBackdrop />
      <div className="relative z-10 min-h-full flex items-center justify-center p-6 animate-[fadeIn_0.4s_ease-out]">
        <div className="max-w-[780px] w-full rounded-2xl bg-stone-950/85 border-2 p-8" style={{ borderColor: d.color }}>
          <div className="text-[11px] uppercase tracking-[0.4em] mb-2" style={{ color: d.color }}>{scenario ? "Historical scenario" : "Your mandate begins"}</div>
          <h2 className="font-[Fraunces] text-[38px] mb-1" style={{ color: "#f2ead7" }}>{scenario?.name || country.name}</h2>
          <div className="text-[13px] italic mb-6" style={{ color: "#a89068" }}>{scenario?.period || country.subtitle} &middot; {d.name}</div>
          <div className="space-y-4 text-[13px] leading-relaxed" style={{ color: "#d4c090" }}>
            <p>{scenario?.flavor || country.flavor}</p>
            {scenario?.primaryLesson && (
              <div className="border-l-4 rounded-r-lg pl-4 py-2 my-3" style={{ borderColor: "#c9a961", backgroundColor: "#c9a96110" }}>
                <div className="font-[Fraunces] text-[14px] mb-1" style={{ color: "#f2ead7" }}>Historical lesson</div>
                <div className="text-[11.5px] italic">{scenario.primaryLesson}</div>
              </div>
            )}
            <div className="border-l-4 rounded-r-lg pl-4 py-2 my-5" style={{ borderColor: d.color, backgroundColor: `${d.color}10` }}>
              <div className="font-[Fraunces] text-[16px] mb-2" style={{ color: "#f2ead7" }}>Primary Objective</div>
              <div className="text-[12.5px]">{scenario?.winConditionText || `Keep all three indicators in target for ${d.winStreak} consecutive quarters.`}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-lg border p-2" style={{ borderColor: "#3a2f1f" }}>
                  <div className="uppercase tracking-[0.16em] text-[9px]" style={{ color: "#a89068" }}>Growth</div>
                  <div className="font-[Fraunces] text-[14px]" style={{ color: "#f2ead7" }}>{fmtPct(targets.growth.min, 1)}–{fmtPct(targets.growth.max, 1)}</div>
                </div>
                <div className="rounded-lg border p-2" style={{ borderColor: "#3a2f1f" }}>
                  <div className="uppercase tracking-[0.16em] text-[9px]" style={{ color: "#a89068" }}>Unemp</div>
                  <div className="font-[Fraunces] text-[14px]" style={{ color: "#f2ead7" }}>{fmtPct(targets.unemployment.min, 1)}–{fmtPct(targets.unemployment.max, 1)}</div>
                </div>
                <div className="rounded-lg border p-2" style={{ borderColor: "#3a2f1f" }}>
                  <div className="uppercase tracking-[0.16em] text-[9px]" style={{ color: "#a89068" }}>Inflation</div>
                  <div className="font-[Fraunces] text-[14px]" style={{ color: "#f2ead7" }}>{fmtPct(targets.inflation.min, 1)}–{fmtPct(targets.inflation.max, 1)}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-8 pt-5 border-t" style={{ borderColor: "#3a2f1f" }}>
            <button onClick={onBack} className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "#a89068" }}>&larr; Back</button>
            <button onClick={onBegin}
              className="group rounded-xl px-8 py-3 border-2 hover:bg-amber-950/60 hover:scale-[1.04] hover:-translate-y-0.5 transition-all flex items-center gap-3"
              style={{ borderColor: d.color, color: "#f2ead7" }}>
              <span className="font-[Fraunces] text-[14px] tracking-[0.22em] uppercase">Accept</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HowToPlay({ onBack }) {
  return (
    <div className="fixed inset-0 bg-[#0f0c08] overflow-y-auto">
      <MenuBackdrop />
      <div className="relative z-10 min-h-full flex items-center justify-center p-6 animate-[fadeIn_0.4s_ease-out]">
        <div className="max-w-[720px] w-full rounded-2xl bg-stone-950/85 border-2 border-amber-900/50 p-8">
          <div className="text-[11px] uppercase tracking-[0.4em] mb-2" style={{ color: "#c9a961" }}>A primer</div>
          <h2 className="font-[Fraunces] text-[36px] mb-5" style={{ color: "#f2ead7" }}>How to Play</h2>
          <div className="space-y-3 text-[13px] leading-relaxed" style={{ color: "#d4c090" }}>
            <p>Each turn is one quarter. You adjust policy, advance time, and watch the economy respond.</p>
            <p><span className="font-[Fraunces]" style={{ color: "#c9a961" }}>The ministries</span> along the bottom are your tools.</p>
            <p><span className="font-[Fraunces]" style={{ color: "#c9a961" }}>Click any stat at the top</span> to see its quarterly history and get an adviser's note tailored to your difficulty.</p>
            <p><span className="font-[Fraunces]" style={{ color: "#c9a961" }}>Hover over regions</span> on the map to pop them up and see health coloring.</p>
            <p><span className="font-[Fraunces]" style={{ color: "#c9a961" }}>Achievements</span> unlock as you play, with a trophy icon in the header. Some are hidden until discovered.</p>
            <p><span className="font-[Fraunces]" style={{ color: "#c9a961" }}>Your game saves automatically</span> after every turn.</p>
          </div>
          <button onClick={onBack} className="mt-6 text-[11px] uppercase tracking-[0.2em]" style={{ color: "#a89068" }}>&larr; Back</button>
        </div>
      </div>
    </div>
  );
}

function EndScreen({ victory, state, country, onMenu, onReplay }) {
  const d = DIFFICULTIES[state.difficulty];
  return (
    <div className="fixed inset-0 bg-[#0f0c08] overflow-hidden">
      <MenuBackdrop />
      <div className="relative z-10 h-full flex items-center justify-center p-6 animate-[fadeIn_0.4s_ease-out]">
        <div className="max-w-[620px] w-full rounded-2xl bg-stone-950/90 border-2 p-10 text-center animate-[popIn_0.5s_ease-out]"
          style={{ borderColor: victory ? "#7a9960" : "#a83838" }}>
          {victory ? <Star size={52} style={{ color: "#c9a961" }} strokeWidth={1.5} className="mx-auto mb-4 animate-[spin_12s_linear_infinite]" />
                   : <Skull size={52} style={{ color: "#a83838" }} strokeWidth={1.5} className="mx-auto mb-4" />}
          <div className="text-[11px] uppercase tracking-[0.4em] mb-2" style={{ color: victory ? "#7a9960" : "#a83838" }}>
            {victory ? "Legacy Secured" : "The Nation Falls"}
          </div>
          <h1 className="font-[Fraunces] text-[46px] mb-4" style={{ color: "#f2ead7" }}>{victory ? "Victory" : "Collapse"}</h1>
          <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: "#d4c090" }}>
            {victory ? `You steered ${country.name} through ${state.turn} quarters on ${d.name}.`
                     : `${country.name} has collapsed after ${state.turn} quarters on ${d.name}.`}
          </p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-lg border p-2" style={{ borderColor: "#3a2f1f" }}>
              <div className="uppercase tracking-[0.16em] text-[9px]" style={{ color: "#a89068" }}>Final GDP</div>
              <div className="font-[Fraunces] text-[16px]" style={{ color: "#f2ead7" }}>{fmtMoney(state.gdp)}</div>
            </div>
            <div className="rounded-lg border p-2" style={{ borderColor: "#3a2f1f" }}>
              <div className="uppercase tracking-[0.16em] text-[9px]" style={{ color: "#a89068" }}>Best streak</div>
              <div className="font-[Fraunces] text-[16px]" style={{ color: "#f2ead7" }}>{state.bestStreak}</div>
            </div>
            <div className="rounded-lg border p-2" style={{ borderColor: "#3a2f1f" }}>
              <div className="uppercase tracking-[0.16em] text-[9px]" style={{ color: "#a89068" }}>Approval</div>
              <div className="font-[Fraunces] text-[16px]" style={{ color: "#f2ead7" }}>{state.approval.toFixed(0)}%</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button onClick={onReplay} className="rounded-xl px-5 py-2.5 border hover:bg-amber-950/60 hover:scale-[1.04] transition-all text-[12px] uppercase tracking-[0.22em]" style={{ borderColor: "#c9a961", color: "#f2ead7" }}>Play Again</button>
            <button onClick={onMenu} className="rounded-xl px-5 py-2.5 border hover:bg-stone-900 hover:scale-[1.04] transition-all text-[12px] uppercase tracking-[0.22em]" style={{ borderColor: "#3a2f1f", color: "#a89068" }}>Main Menu</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GAME SCREEN
// ============================================================

function GameScreen({ initialDifficulty, country, scenario, restored, onExit, cheatsActive, unlockedAch, setUnlockedAch }) {
  const [state, setState] = useState(restored?.state || getInitialState(initialDifficulty, country, scenario));
  const [policies, setPolicies] = useState(restored?.policies || {
    taxRate: state.taxRate, govSpendingRate: state.govSpendingRate,
    interestRate: state.interestRate, moneyGrowth: state.moneyGrowth,
    tariff: state.tariff, minWage: state.minWage, subsidy: state.subsidy,
  });
  const [history, setHistory] = useState(restored?.history || [{
    t: 0, label: `Q${state.quarter} '${String(state.year).slice(-2)}`,
    gdpGrowth: +(state.gdpGrowth * 100).toFixed(2),
    unemployment: +(state.unemployment * 100).toFixed(2),
    inflation: +(state.inflation * 100).toFixed(2),
  }]);
  const [log, setLog] = useState(restored?.log || [
    { type: "system", text: `Your mandate begins. Hit all target bands for ${DIFFICULTIES[initialDifficulty].winStreak} consecutive quarters.` },
  ]);
  const [activePanel, setActivePanel] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [statModal, setStatModal] = useState(null);
  const [counters, setCounters] = useState(restored?.counters || {});
  const [worldSnapshot, setWorldSnapshot] = useState(restored?.worldSnapshot || WORLD_GDP_2026);
  const [newAchTicker, setNewAchTicker] = useState(null);

  useEffect(() => {
    if (!state.gameOver) {
      saveGame({
        state, policies, history, log, counters, worldSnapshot,
        country: country.key === "custom" ? country : { key: country.key },
        scenario: scenario?.key || null,
        difficulty: initialDifficulty,
      });
    } else clearSave();
  }, [state, policies, history, log, counters, worldSnapshot, country, initialDifficulty, scenario]);

  const targets = getTargets(state.difficulty);

  const advance = () => {
    if (state.gameOver || state.pendingEvent) return;
    const { next, lessons, crisis, scheduled, warningTriggered } = simulate(state, policies);
    setState(next);
    setPolicies({
      taxRate: next.taxRate, govSpendingRate: next.govSpendingRate,
      interestRate: next.interestRate, moneyGrowth: next.moneyGrowth,
      tariff: next.tariff, minWage: next.minWage, subsidy: next.subsidy,
    });
    const newHist = [...history, {
      t: next.turn, label: `Q${next.quarter} '${String(next.year).slice(-2)}`,
      gdpGrowth: +(next.gdpGrowth * 100).toFixed(2),
      unemployment: +(next.unemployment * 100).toFixed(2),
      inflation: +(next.inflation * 100).toFixed(2),
    }];
    setHistory(newHist);

    // world growth (skip in historical scenarios)
    if (!scenario) setWorldSnapshot((w) => advanceWorld(w, state.difficulty));

    // update counters + check achievements
    const newCounters = updateCounters(counters, next, policies);
    setCounters(newCounters);
    const newly = checkAchievements(next, state, newHist, log, newCounters, unlockedAch);
    if (newly.length) {
      const merged = [...unlockedAch, ...newly];
      setUnlockedAch(merged);
      saveUnlocks(merged);
      const first = ACHIEVEMENTS.find(a => a.key === newly[0]);
      if (first) { setNewAchTicker(first); setTimeout(() => setNewAchTicker(null), 4000); }
    }

    const entries = [];
    if (warningTriggered && next.upcomingWarning)
      entries.push({ type: "warning", text: `${next.upcomingWarning.event.warningHeadline}. In ${next.upcomingWarning.turnsAway}Q.` });
    if (scheduled) entries.push({ type: "major", text: scheduled.headline });
    if (crisis) entries.push({ type: "event", text: crisis.headline });
    if (next.techPoints > state.techPoints) entries.push({ type: "tech", text: `Earned a tech point. Spend it in Institutions.` });
    newly.forEach(k => {
      const a = ACHIEVEMENTS.find(x => x.key === k);
      if (a) entries.push({ type: "achievement", text: `${a.icon} ${a.title}` });
    });
    lessons.forEach((l) => entries.push({ type: "lesson", title: l.title, text: l.body }));
    if (entries.length) setLog((lg) => [...entries, ...lg].slice(0, 50));
  };

  const resolveEvent = (option) => {
    const e = state.pendingEvent;
    if (!e) return;
    const eff = option.effect;
    setState((s) => ({
      ...s,
      gdpGrowth: clamp(s.gdpGrowth + (eff.growthDrag ?? 0), -0.08, 0.10),
      inflation: clamp(s.inflation + (eff.inflationBump ?? 0), -0.03, 0.25),
      unemployment: clamp(s.unemployment + (eff.unemploymentBump ?? 0), 0.018, 0.24),
      productivity: clamp(s.productivity + (eff.prodBump ?? 0), 0.80, 1.30),
      approval: clamp(s.approval + (eff.approvalDelta ?? 0), 0, 100),
      debt: s.debt + (eff.debtAdd ?? 0),
      minWage: eff.minWageBump ? clamp(s.minWage + eff.minWageBump, 0.2, 0.8) : s.minWage,
      taxRate: eff.taxBump ? clamp(s.taxRate + eff.taxBump, 0.15, 0.4) : s.taxRate,
      govSpendingRate: eff.spendBump ? clamp(s.govSpendingRate + eff.spendBump, 0.1, 0.35) : s.govSpendingRate,
      interestRate: eff.rateBump ? clamp(s.interestRate + eff.rateBump, 0, 0.1) : s.interestRate,
      moneyGrowth: eff.moneyBump ? clamp(s.moneyGrowth + eff.moneyBump, 0, 0.12) : s.moneyGrowth,
      tariff: eff.tariffBump ? clamp(s.tariff + eff.tariffBump, 0, 0.25) : s.tariff,
      pendingEvent: null,
    }));
    setPolicies((p) => ({
      ...p,
      taxRate: eff.taxBump ? clamp(p.taxRate + eff.taxBump, 0.15, 0.4) : p.taxRate,
      govSpendingRate: eff.spendBump ? clamp(p.govSpendingRate + eff.spendBump, 0.1, 0.35) : p.govSpendingRate,
      interestRate: eff.rateBump ? clamp(p.interestRate + eff.rateBump, 0, 0.1) : p.interestRate,
      moneyGrowth: eff.moneyBump ? clamp(p.moneyGrowth + eff.moneyBump, 0, 0.12) : p.moneyGrowth,
      tariff: eff.tariffBump ? clamp(p.tariff + eff.tariffBump, 0, 0.25) : p.tariff,
      minWage: eff.minWageBump ? clamp(p.minWage + eff.minWageBump, 0.2, 0.8) : p.minWage,
    }));
    setLog((lg) => [
      { type: e.isMajor ? "majorDecision" : "decision", text: `${e.headline || e.title} — ${option.label}` },
      { type: "lesson", title: option.lesson.title, text: option.lesson.body },
      ...lg,
    ].slice(0, 50));
  };

  const unlockTech = (key) => {
    const t = TECH_TREE[key];
    if (!t || state.unlockedTech.includes(key) || state.techPoints < t.cost) return;
    const missing = t.requires.filter(r => !state.unlockedTech.includes(r));
    if (missing.length) return;
    setState((s) => ({ ...s, techPoints: s.techPoints - t.cost, unlockedTech: [...s.unlockedTech, key] }));
    setLog((lg) => [
      { type: "tech", text: `Unlocked: ${t.name}` },
      { type: "lesson", title: t.name, text: t.lesson },
      ...lg,
    ].slice(0, 50));
  };

  const applyCheat = (cheat) => {
    setState((s) => cheat.apply(s));
    setLog((lg) => [{ type: "tech", text: `Cheat: ${cheat.label}` }, ...lg].slice(0, 50));
    setActivePanel(null);
  };

  // IMPORTANT: All hooks must run BEFORE any early return (Rules of Hooks).
  // Previously useMemo sat after the gameOver early return, which caused a
  // blank white screen because React saw a different hook count between renders.
  const ranking = useMemo(
    () => buildRanking(worldSnapshot, country.name, state.gdp, country.flagEmoji),
    [worldSnapshot, country, state.gdp]
  );
  const userRank = ranking.findIndex(c => c.isUser) + 1;

  if (state.gameOver) {
    return <EndScreen victory={state.victory} state={state} country={country}
      onMenu={() => { clearSave(); onExit(); }}
      onReplay={() => {
        const s = getInitialState(state.difficulty, country, scenario);
        setState(s);
        setPolicies({ taxRate: s.taxRate, govSpendingRate: s.govSpendingRate, interestRate: s.interestRate, moneyGrowth: s.moneyGrowth, tariff: s.tariff, minWage: s.minWage, subsidy: s.subsidy });
        setHistory([{ t: 0, label: `Q${s.quarter} '${String(s.year).slice(-2)}`, gdpGrowth: s.gdpGrowth * 100, unemployment: s.unemployment * 100, inflation: s.inflation * 100 }]);
        setLog([{ type: "system", text: `Your mandate begins again.` }]);
        setCounters({});
      }} />;
  }

  const growthInTarget = state.gdpGrowth >= targets.growth.min && state.gdpGrowth <= targets.growth.max;
  const unempInTarget = state.unemployment >= targets.unemployment.min && state.unemployment <= targets.unemployment.max;
  const inflationInTarget = state.inflation >= targets.inflation.min && state.inflation <= targets.inflation.max;
  const debtRatio = state.debt / state.gdp;
  const selectedRegionData = selectedRegion ? country.regions.find((r) => r.id === selectedRegion) : null;
  const d = DIFFICULTIES[state.difficulty];

  return (
    <div className="min-h-screen w-full bg-[#0f1319] text-amber-50 font-[IBM_Plex_Sans] relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: "radial-gradient(#c9a961 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

      {/* Top bar */}
      <div className="relative z-10 border-b border-amber-900/40 bg-gradient-to-b from-stone-950 to-stone-900/90 shadow-lg">
        <div className="max-w-[1340px] mx-auto px-5 py-2 flex items-center gap-3">
          <div className="flex items-center gap-3 pr-3 border-r border-amber-900/30">
            <div className="w-10 h-10 rounded-xl border flex items-center justify-center transition-all hover:scale-110 hover:rotate-6" style={{ background: `${d.color}33`, borderColor: d.color }}>
              {country.flagEmoji ? <div className="text-[20px]">{country.flagEmoji}</div> : <Crown size={17} style={{ color: d.color }} />}
            </div>
            <div className="leading-tight">
              <div className="font-[Fraunces] text-[16px] text-amber-100 tracking-wide">{country.name}</div>
              <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: `${d.color}cc` }}>{d.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1 overflow-x-auto">
            <StatPill symbol="📈" label="Growth" value={fmtPct(state.gdpGrowth, 2)} inTarget={growthInTarget} onClick={() => setStatModal("growth")} />
            <StatPill symbol="👥" label="Unemp" value={fmtPct(state.unemployment, 1)} inTarget={unempInTarget} onClick={() => setStatModal("unemployment")} />
            <StatPill symbol="💸" label="Inflation" value={fmtPct(state.inflation, 2)} inTarget={inflationInTarget} onClick={() => setStatModal("inflation")} />
            <StatPill symbol="🏛️" label="Debt/GDP" value={fmtPct(debtRatio, 0)} inTarget={debtRatio < 1.0 ? true : debtRatio > 1.4 ? false : null} onClick={() => setStatModal("debt")} />
            <StatPill symbol="💰" label="GDP" value={fmtMoney(state.gdp)} onClick={() => setStatModal("gdp")} />
            <StatPill symbol="❤️" label="Approval" value={`${state.approval.toFixed(0)}%`} inTarget={state.approval > 55 ? true : state.approval < 30 ? false : null} onClick={() => setStatModal("approval")} />
          </div>
          <div className="flex items-center gap-2 pl-2 border-l border-amber-900/30">
            <button onClick={() => setActivePanel("achievements")} title="Achievements"
              className="w-9 h-9 rounded-lg border border-amber-900/40 bg-stone-950/60 hover:bg-amber-950/40 hover:scale-[1.08] transition-all flex items-center justify-center">
              <Trophy size={14} style={{ color: "#c9a961" }} />
            </button>
            {!scenario && (
              <button onClick={() => setActivePanel("ranking")} title="World GDP"
                className="w-9 h-9 rounded-lg border border-amber-900/40 bg-stone-950/60 hover:bg-amber-950/40 hover:scale-[1.08] transition-all flex flex-col items-center justify-center gap-0">
                <Globe size={12} style={{ color: "#7a9960" }} />
                <span className="text-[8px] font-[Fraunces]" style={{ color: "#7a9960" }}>#{userRank}</span>
              </button>
            )}
            {cheatsActive && (
              <button onClick={() => setActivePanel("cheats")} title="Cheats"
                className="w-9 h-9 rounded-lg border-2 bg-stone-950/60 hover:scale-[1.08] transition-all flex items-center justify-center" style={{ borderColor: "#c77a3f" }}>
                <Wand2 size={14} style={{ color: "#c77a3f" }} />
              </button>
            )}
            <div className="text-right leading-tight ml-1">
              <div className="font-[Fraunces] text-[16px] text-amber-100">Q{state.quarter} {state.year}</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-amber-200/50">Turn {state.turn}</div>
            </div>
            <button onClick={onExit} className="text-amber-200/60 hover:text-amber-100 hover:scale-110 text-[10px] uppercase tracking-[0.18em] flex items-center gap-1 transition-all ml-1">
              <RotateCcw size={11} /> Menu
            </button>
          </div>
        </div>
      </div>

      {/* Achievement ticker */}
      {newAchTicker && (
        <div className="fixed top-20 right-5 z-50 rounded-xl border-2 p-3 bg-stone-950/95 animate-[slideInRight_0.4s_ease-out] shadow-xl flex items-center gap-3 max-w-[300px]"
          style={{ borderColor: "#7a9960" }}>
          <div className="text-[32px]">{newAchTicker.icon}</div>
          <div>
            <div className="text-[9px] uppercase tracking-[0.22em]" style={{ color: "#7a9960" }}>Achievement Unlocked</div>
            <div className="font-[Fraunces] text-[14px] text-amber-100">{newAchTicker.title}</div>
            <div className="text-[10.5px] mt-0.5 leading-snug" style={{ color: "#d4c090" }}>{newAchTicker.description}</div>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="relative z-10 max-w-[1340px] mx-auto px-5 pt-4 pb-[130px] grid grid-cols-[1fr_320px] gap-4">
        <div className="relative rounded-2xl border-2 border-amber-900/40 bg-[#1a1510] overflow-hidden" style={{ boxShadow: "0 0 0 1px #c9a96144 inset" }}>
          <CountryMap state={state} country={country} onSelectRegion={(id) => { setSelectedRegion(id); setActivePanel("region"); }} selectedRegion={selectedRegion} />
          <div className="absolute bottom-3 left-3 bg-stone-950/80 border border-amber-900/40 rounded-lg px-3 py-2 flex items-center gap-3 text-[10px] text-amber-100/90">
            <span className="uppercase tracking-[0.18em] text-amber-200/60 mr-1">Health</span>
            {[["#7a9960", "Booming"], ["#a69866", "Healthy"], ["#94856a", "Neutral"], ["#96654a", "Slow"], ["#7a4236", "Falling"]].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1"><span className="w-2.5 h-2.5 inline-block rounded-sm" style={{ background: c }} /> {l}</span>
            ))}
          </div>
          <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
            <div className="bg-stone-950/85 border border-amber-900/40 rounded-lg px-3 py-2 flex items-center gap-2 text-[11px] text-amber-100/90">
              <Target size={12} className="text-amber-300" />
              <span className="uppercase tracking-[0.16em] text-amber-200/60">Streak</span>
              <span className="font-[Fraunces] text-amber-200 text-[15px]">{state.inTargetStreak} / {d.winStreak}</span>
            </div>
            {state.upcomingWarning && (
              <div className="bg-stone-950/90 border rounded-lg px-3 py-2 max-w-[260px] text-[10.5px] flex items-start gap-2 animate-[pulse_2s_infinite]" style={{ borderColor: "#a83838" }}>
                <AlertTriangle size={12} style={{ color: "#e05555" }} className="mt-0.5 flex-shrink-0" />
                <div>
                  <div className="uppercase tracking-[0.16em] text-[9px]" style={{ color: "#e05555" }}>Incoming in {state.upcomingWarning.turnsAway}Q</div>
                  <div className="font-[Fraunces] text-[12px] text-amber-100 leading-tight">{state.upcomingWarning.event.title}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Journal */}
        <div className="rounded-2xl bg-[#f5ecd5] border-2 border-amber-900/50 relative max-h-[620px] overflow-y-auto" style={{ boxShadow: "0 0 0 1px #c9a96144 inset" }}>
          <div className="sticky top-0 bg-[#f5ecd5] border-b-2 border-amber-900/30 px-4 py-2 flex items-center gap-2 z-10 rounded-t-2xl">
            <ScrollText size={14} style={{ color: "#44403c" }} />
            <div className="font-[Fraunces] text-[16px]" style={{ color: "#1c1917" }}>Journal</div>
          </div>
          <div className="p-3 space-y-2.5">
            {log.map((entry, i) => {
              if (entry.type === "system") return <div key={i} className="text-[11.5px] border-l-2 pl-2.5 py-0.5 italic" style={{ color: "#57534e", borderColor: "#a8a29e" }}>{entry.text}</div>;
              if (entry.type === "warning") return (<div key={i} className="border-l-2 pl-2.5 py-0.5" style={{ borderColor: "#a83838" }}>
                <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: "#a83838" }}>Warning</div>
                <div className="text-[12px]" style={{ color: "#1c1917" }}>{entry.text}</div></div>);
              if (entry.type === "major") return (<div key={i} className="border-l-2 pl-2.5 py-0.5" style={{ borderColor: "#b45309" }}>
                <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: "#b45309" }}>Major Crisis</div>
                <div className="text-[13px] font-[Fraunces]" style={{ color: "#1c1917" }}>{entry.text}</div></div>);
              if (entry.type === "event") return (<div key={i} className="border-l-2 pl-2.5 py-0.5" style={{ borderColor: "#a16207" }}>
                <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: "#a16207" }}>Dispatch</div>
                <div className="text-[12.5px] font-[Fraunces]" style={{ color: "#1c1917" }}>{entry.text}</div></div>);
              if (entry.type === "tech") return (<div key={i} className="border-l-2 pl-2.5 py-0.5" style={{ borderColor: "#7a9960" }}>
                <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: "#446a32" }}>Institution</div>
                <div className="text-[12px] font-[Fraunces]" style={{ color: "#1c1917" }}>{entry.text}</div></div>);
              if (entry.type === "achievement") return (<div key={i} className="border-l-2 pl-2.5 py-0.5" style={{ borderColor: "#c9a961" }}>
                <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: "#a16207" }}>Achievement</div>
                <div className="text-[13px] font-[Fraunces]" style={{ color: "#1c1917" }}>{entry.text}</div></div>);
              if (entry.type === "decision" || entry.type === "majorDecision") return (<div key={i} className="border-l-2 pl-2.5 py-0.5" style={{ borderColor: entry.type === "majorDecision" ? "#b45309" : "#0369a1" }}>
                <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: entry.type === "majorDecision" ? "#b45309" : "#075985" }}>{entry.type === "majorDecision" ? "Pivotal" : "Decision"}</div>
                <div className="text-[12px]" style={{ color: "#1c1917" }}>{entry.text}</div></div>);
              if (entry.type === "lesson") return (<div key={i} className="border-l-2 pl-2.5 py-0.5" style={{ borderColor: "#1c1917" }}>
                <div className="text-[9px] uppercase tracking-[0.18em] flex items-center gap-1" style={{ color: "#44403c" }}><BookOpen size={9} /> Concept</div>
                <div className="text-[12.5px] font-[Fraunces]" style={{ color: "#1c1917" }}>{entry.title}</div>
                <div className="text-[11px] leading-snug mt-0.5" style={{ color: "#44403c" }}>{entry.text}</div></div>);
              return null;
            })}
          </div>
        </div>
      </div>

      {/* Bottom ministry bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-amber-900/40 bg-gradient-to-t from-stone-950 via-stone-950 to-stone-900/95 shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
        <div className="max-w-[1340px] mx-auto px-5 py-3 flex items-center gap-2">
          <div className="flex items-center gap-2">
            <MinistryButton symbol="💰" label="Treasury" onClick={() => setActivePanel("treasury")} active={activePanel === "treasury"} />
            <MinistryButton symbol="🏦" label="Central Bank" onClick={() => setActivePanel("cb")} active={activePanel === "cb"} />
            <MinistryButton symbol="⚓" label="Trade" onClick={() => setActivePanel("trade")} active={activePanel === "trade"} />
            <MinistryButton symbol="🏭" label="Industry" onClick={() => setActivePanel("industry")} active={activePanel === "industry"} />
            <MinistryButton symbol="💡" label="Institutions" onClick={() => setActivePanel("tech")} active={activePanel === "tech"} badge={state.techPoints > 0 ? state.techPoints : null} />
            <MinistryButton symbol="📊" label="Records" onClick={() => setActivePanel("charts")} active={activePanel === "charts"} />
          </div>
          <div className="ml-auto flex items-center gap-3">
            {state.pendingEvent && <div className="rounded-lg text-[11px] uppercase tracking-[0.18em] text-amber-300 border border-amber-400 px-3 py-2 animate-pulse">Awaiting decision</div>}
            <button onClick={advance} disabled={state.gameOver || !!state.pendingEvent}
              className="group rounded-xl bg-amber-600 hover:bg-amber-500 hover:scale-[1.04] hover:-translate-y-0.5 text-stone-950 px-7 py-3 flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] font-semibold transition-all duration-200 disabled:bg-stone-700 disabled:text-stone-500 disabled:scale-100 border-2 border-amber-400/50 shadow-lg">
              Advance Quarter
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Panels */}
      {activePanel === "treasury" && (
        <PanelFrame title="Treasury" subtitle="Fiscal policy" onClose={() => setActivePanel(null)}>
          <div className="grid grid-cols-2 gap-x-6">
            <PolicySlider label="Tax rate" icon={Coins} value={policies.taxRate} onChange={(v) => setPolicies({ ...policies, taxRate: v })} min={0.15} max={0.4} step={0.005} format={(v) => fmtPct(v, 1)} desc="Higher taxes cool demand, fund spending." />
            <PolicySlider label="Government spending" icon={Landmark} value={policies.govSpendingRate} onChange={(v) => setPolicies({ ...policies, govSpendingRate: v })} min={0.1} max={0.35} step={0.005} format={(v) => fmtPct(v, 1)} desc="Expansionary fiscal policy lifts AD." />
          </div>
          <div className="mt-3 pt-3 border-t text-[12px]" style={{ borderColor: "#d6d3d1", color: "#44403c" }}>
            <span className="font-[Fraunces] text-[14px]" style={{ color: "#1c1917" }}>Primary balance: </span>
            {((policies.taxRate - policies.govSpendingRate) * 100).toFixed(1)}% of GDP.
          </div>
        </PanelFrame>
      )}

      {activePanel === "cb" && (
        <PanelFrame title="Central Bank" subtitle="Monetary policy" onClose={() => setActivePanel(null)}>
          <div className="grid grid-cols-2 gap-x-6">
            <PolicySlider label="Policy rate" icon={Percent} value={policies.interestRate} onChange={(v) => setPolicies({ ...policies, interestRate: v })} min={0} max={0.1} step={0.0025} format={(v) => fmtPct(v, 2)} desc="Lower rates encourage investment." />
            <PolicySlider label="Money supply growth" icon={Banknote} value={policies.moneyGrowth} onChange={(v) => setPolicies({ ...policies, moneyGrowth: v })} min={0} max={0.12} step={0.0025} format={(v) => fmtPct(v, 2)} desc="Money growth above output feeds inflation." />
          </div>
        </PanelFrame>
      )}

      {activePanel === "trade" && (
        <PanelFrame title="Trade Ministry" subtitle="International economics" onClose={() => setActivePanel(null)}>
          <PolicySlider label="Average tariff" icon={Ship} value={policies.tariff} onChange={(v) => setPolicies({ ...policies, tariff: v })} min={0} max={0.25} step={0.005} format={(v) => fmtPct(v, 1)} desc="Protects producers, raises consumer prices." />
        </PanelFrame>
      )}

      {activePanel === "industry" && (
        <PanelFrame title="Industry & Labor" subtitle="Microeconomic levers" onClose={() => setActivePanel(null)} wide>
          <PolicySlider label="Minimum wage" icon={Users} value={policies.minWage} onChange={(v) => setPolicies({ ...policies, minWage: v })} min={0.25} max={0.75} step={0.01} format={(v) => `${(v * 100).toFixed(0)}% of avg`} desc="A price floor above market creates labor surplus." />
          <div className="mt-5 pt-4 border-t" style={{ borderColor: "#d6d3d1" }}>
            <div className="flex items-center gap-2 mb-3">
              <Factory size={13} style={{ color: "#44403c" }} />
              <span className="text-[11.5px] uppercase tracking-[0.14em]" style={{ color: "#44403c" }}>Industrial subsidy</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SUBSIDY_OPTIONS.map((opt) => (
                <button key={opt.key} onClick={() => setPolicies({ ...policies, subsidy: opt.key })}
                  className="text-left rounded-lg p-2.5 border transition-all hover:scale-[1.03]"
                  style={policies.subsidy === opt.key ? { borderColor: "#1c1917", backgroundColor: "#1c1917", color: "#f2ead7" } : { borderColor: "#a8a29e", backgroundColor: "rgba(255,255,255,0.5)", color: "#1c1917" }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[14px]">{opt.symbol}</span>
                    <div className="text-[11.5px] font-[Fraunces]">{opt.label}</div>
                  </div>
                  <div className="text-[10px] mt-0.5 leading-snug" style={policies.subsidy === opt.key ? { color: "#d4c090" } : { color: "#57534e" }}>{opt.description}</div>
                </button>
              ))}
            </div>
          </div>
        </PanelFrame>
      )}

      {activePanel === "tech" && (
        <PanelFrame title="Economic Institutions" subtitle="Permanent upgrades" onClose={() => setActivePanel(null)} wide>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[12.5px]" style={{ color: "#44403c" }}>
              Unlock lasting institutional improvements. Earn tech points by hitting targets.
            </div>
            <div className="rounded-lg bg-amber-900/10 border border-amber-700/50 px-3 py-2 flex items-center gap-2">
              <Zap size={14} style={{ color: "#a16207" }} />
              <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "#44403c" }}>Points:</span>
              <span className="font-[Fraunces] text-[18px]" style={{ color: "#1c1917" }}>{state.techPoints}</span>
            </div>
          </div>
          {[1, 2, 3].map((tier) => (
            <div key={tier} className="mb-4">
              <div className="text-[10px] uppercase tracking-[0.22em] mb-2 flex items-center gap-2" style={{ color: "#78716c" }}>
                <span>Tier {tier}</span>
                <div className="flex-1 h-px" style={{ backgroundColor: "#d6d3d1" }} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(TECH_TREE).filter(t => t.tier === tier).map((t) => {
                  const unlocked = state.unlockedTech.includes(t.key);
                  const missing = t.requires.filter(r => !state.unlockedTech.includes(r));
                  const canAfford = state.techPoints >= t.cost;
                  const locked = missing.length > 0;
                  const available = !locked && canAfford && !unlocked;
                  return (
                    <button key={t.key} onClick={() => available && unlockTech(t.key)} disabled={!available || unlocked}
                      className="text-left rounded-lg p-3 border-2 transition-all relative"
                      style={unlocked ? { borderColor: "#7a9960", backgroundColor: "#e5f0da", color: "#1c1917" }
                        : available ? { borderColor: "#c9a961", backgroundColor: "rgba(255,255,255,0.6)", color: "#1c1917" }
                        : { borderColor: "#d6d3d1", backgroundColor: "rgba(240,240,240,0.5)", color: "#78716c", opacity: 0.7 }}>
                      <div className="flex items-start justify-between mb-1">
                        <div className="font-[Fraunces] text-[13px]">{t.name}</div>
                        {unlocked ? <Check size={14} style={{ color: "#446a32" }} />
                          : locked ? <Lock size={12} style={{ color: "#a8a29e" }} />
                          : <span className="text-[10px] font-[Fraunces] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#c9a961", color: "#1c1917" }}>{t.cost} pt</span>}
                      </div>
                      <div className="text-[10.5px] leading-snug">{t.description}</div>
                      {locked && missing.length > 0 && (
                        <div className="text-[9px] mt-1 italic" style={{ color: "#a83838" }}>
                          Needs: {missing.map(m => TECH_TREE[m].name).join(", ")}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </PanelFrame>
      )}

      {activePanel === "charts" && (
        <PanelFrame title="Economic Records" subtitle="Time series" onClose={() => setActivePanel(null)} wide>
          <div className="flex items-center gap-4 text-[11px] mb-2" style={{ color: "#44403c" }}>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-stone-900 inline-block rounded-sm" /> Growth</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-700 inline-block rounded-sm" /> Unemployment</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-700 inline-block rounded-sm" /> Inflation</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={history} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#57534e" }} stroke="#a8a29e" />
              <YAxis tick={{ fontSize: 10, fill: "#57534e" }} stroke="#a8a29e" />
              <Tooltip contentStyle={{ background: "#f5ecd5", border: "1px solid #8a6d3b", fontSize: 12, borderRadius: 8 }} formatter={(v) => `${v}%`} />
              <ReferenceLine y={0} stroke="#d6d3d1" />
              <Line type="monotone" dataKey="gdpGrowth" stroke="#1c1917" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="unemployment" stroke="#9f1239" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="inflation" stroke="#a16207" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </PanelFrame>
      )}

      {activePanel === "region" && selectedRegionData && (
        <PanelFrame title={selectedRegionData.name} subtitle={selectedRegionData.industry}
          onClose={() => { setActivePanel(null); setSelectedRegion(null); }}>
          <div className="text-[13px] leading-relaxed space-y-3" style={{ color: "#1c1917" }}>
            <div><span className="font-[Fraunces]">Share of output:</span> {(selectedRegionData.share * 100).toFixed(0)}%</div>
            <div>
              <span className="font-[Fraunces]">Sensitivities:</span>
              <ul className="mt-1 pl-4 text-[12px] space-y-0.5" style={{ color: "#44403c" }}>
                <li>Tariffs: {selectedRegionData.sensitivity.tariff > 0 ? "benefits from protection" : "hurt by protection"}</li>
                <li>Minimum wage: {selectedRegionData.sensitivity.minWage < -0.4 ? "highly sensitive" : "moderate"}</li>
                <li>Interest rate: {selectedRegionData.sensitivity.rate < -0.8 ? "highly rate-sensitive" : "moderate"}</li>
                <li>Subsidy match: {selectedRegionData.sensitivity.subsidyKey !== "none" ? selectedRegionData.sensitivity.subsidyKey : "none"}</li>
              </ul>
            </div>
          </div>
        </PanelFrame>
      )}

      {activePanel === "ranking" && (
        <GdpRanking ranking={ranking} onClose={() => setActivePanel(null)} />
      )}

      {activePanel === "achievements" && (
        <AchievementsPanel unlocked={unlockedAch} onClose={() => setActivePanel(null)} />
      )}

      {activePanel === "cheats" && (
        <CheatsPanel onApply={applyCheat} onClose={() => setActivePanel(null)} />
      )}

      {statModal && (
        <StatDetailModal statKey={statModal} state={state} history={history} difficulty={state.difficulty} onClose={() => setStatModal(null)} />
      )}

      {state.pendingEvent && (
        <PanelFrame title={state.pendingEvent.title || state.pendingEvent.headline}
          subtitle={state.pendingEvent.isMajor ? "Pivotal decision" : "Decision required"}
          onClose={() => {}} wide hideClose tone={state.pendingEvent.isMajor ? "major" : null}>
          {state.pendingEvent.isMajor && <div className="mb-3 text-[12px] uppercase tracking-[0.2em] font-[Fraunces]" style={{ color: "#b45309" }}>{state.pendingEvent.headline}</div>}
          <div className="text-[13px] mb-4" style={{ color: "#292524" }}>{state.pendingEvent.body}</div>
          <div className={`grid ${state.pendingEvent.options.length === 3 ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
            {state.pendingEvent.options.map((opt, i) => (
              <button key={i} onClick={() => resolveEvent(opt)}
                className="text-left rounded-xl p-4 border-2 transition-all group"
                style={{ borderColor: "#a8a29e", backgroundColor: "rgba(255,255,255,0.6)", color: "#1c1917" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1c1917"; e.currentTarget.style.color = "#f2ead7"; e.currentTarget.style.borderColor = "#1c1917"; e.currentTarget.style.transform = "scale(1.03) translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.6)"; e.currentTarget.style.color = "#1c1917"; e.currentTarget.style.borderColor = "#a8a29e"; e.currentTarget.style.transform = ""; }}>
                <div className="font-[Fraunces] text-[16px] mb-1">{opt.label}</div>
                <div className="text-[11.5px] italic opacity-80">{opt.blurb}</div>
              </button>
            ))}
          </div>
        </PanelFrame>
      )}
    </div>
  );
}

// ============================================================
// ROOT APP
// ============================================================

export default function App() {
  const [screen, setScreen] = useState("menu");
  const [mode, setMode] = useState(null);
  const [countryKey, setCountryKey] = useState(null);
  const [customCountry, setCustomCountry] = useState(null);
  const [scenarioKey, setScenarioKey] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [restored, setRestored] = useState(null);
  const [hasSave, setHasSave] = useState(false);
  const [menuPanel, setMenuPanel] = useState(null);
  const [cheatsActive, setCheatsActive] = useState(false);
  const [unlockedAch, setUnlockedAch] = useState([]);

  useEffect(() => {
    const s = loadGame();
    if (s && s.state && !s.state.gameOver) setHasSave(true);
    setUnlockedAch(loadUnlocks());
  }, []);

  const startContinue = () => {
    const s = loadGame();
    if (!s || !s.state) return;
    setRestored({ state: s.state, policies: s.policies, history: s.history, log: s.log, counters: s.counters, worldSnapshot: s.worldSnapshot });
    setDifficulty(s.difficulty);
    if (s.scenario) setScenarioKey(s.scenario);
    if (s.country.key === "custom") { setCustomCountry(s.country); setCountryKey("custom"); }
    else setCountryKey(s.country.key);
    setScreen("game");
  };

  const activeCountry = countryKey === "custom" ? customCountry
    : scenarioKey ? COUNTRIES[HISTORICAL_SCENARIOS[scenarioKey].countryKey]
    : COUNTRIES[countryKey];
  const activeScenario = scenarioKey ? HISTORICAL_SCENARIOS[scenarioKey] : null;

  // Menu-level GDP ranking uses a fresh world snapshot
  const menuRanking = useMemo(() => buildRanking(WORLD_GDP_2026, "Your Nation", 1000, "🏛️"), []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        body { font-family: 'IBM Plex Sans', system-ui, sans-serif; margin: 0; background: #0f0c08; cursor: default; }
        button, a, [role="button"] { cursor: pointer; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes ripplePop {
          0% { opacity: 0.9; transform: scale(0.3); }
          100% { opacity: 0; transform: scale(2.5); }
        }
      `}</style>

      <CustomCursor />

      {screen === "menu" && <MainMenu hasSave={hasSave} cheatsActive={cheatsActive}
        onCheatActivated={() => setCheatsActive(true)}
        onContinue={startContinue}
        onNewGame={() => { clearSave(); setHasSave(false); setRestored(null); setScreen("mode"); }}
        onHow={() => setScreen("how")}
        onRanking={() => setMenuPanel("ranking")}
        onAchievements={() => setMenuPanel("achievements")}
        onUpdatesLog={() => setMenuPanel("updates")} />}

      {screen === "how" && <HowToPlay onBack={() => setScreen("menu")} />}

      {screen === "mode" && <ModeSelect onPick={(m) => { setMode(m); if (m === "historical") setScreen("scenario"); else setScreen("country"); }} onBack={() => setScreen("menu")} />}

      {screen === "country" && <CountryPicker mode={mode}
        onSelect={(k) => { setCountryKey(k); setCustomCountry(null); setScenarioKey(null); setScreen("difficulty"); }}
        onCustom={() => setScreen("custom")}
        onBack={() => setScreen("mode")} />}

      {screen === "scenario" && <ScenarioPicker
        onSelect={(k) => { setScenarioKey(k); setDifficulty(HISTORICAL_SCENARIOS[k].difficultyTier); setScreen("briefing"); }}
        onBack={() => setScreen("mode")} />}

      {screen === "custom" && <CustomBuilder onDone={(c) => { setCustomCountry(c); setCountryKey("custom"); setScenarioKey(null); setScreen("difficulty"); }} onBack={() => setScreen("country")} />}

      {screen === "difficulty" && <DifficultySelect onSelect={(d) => { setDifficulty(d); setScreen("briefing"); }} onBack={() => setScreen("country")} />}

      {screen === "briefing" && <Briefing difficulty={difficulty} country={activeCountry} scenario={activeScenario}
        onBegin={() => { setRestored(null); setScreen("game"); }}
        onBack={() => setScreen(scenarioKey ? "scenario" : "difficulty")} />}

      {screen === "game" && <GameScreen initialDifficulty={difficulty} country={activeCountry} scenario={activeScenario} restored={restored}
        cheatsActive={cheatsActive}
        unlockedAch={unlockedAch}
        setUnlockedAch={setUnlockedAch}
        onExit={() => { setScreen("menu"); setRestored(null); setScenarioKey(null); setHasSave(!!loadGame()); }} />}

      {/* Menu-level panels */}
      {menuPanel === "ranking" && <GdpRanking ranking={menuRanking} onClose={() => setMenuPanel(null)} />}
      {menuPanel === "achievements" && <AchievementsPanel unlocked={unlockedAch} onClose={() => setMenuPanel(null)} />}
      {menuPanel === "updates" && <UpdatesLog onClose={() => setMenuPanel(null)} />}
    </>
  );
}
