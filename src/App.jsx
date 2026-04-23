import React, { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine,
} from "recharts";
import {
  TrendingUp, Landmark, Coins, Percent, Ship, ChevronRight, BookOpen, Target,
  RotateCcw, Users, Factory, Banknote, BarChart3, X, Crown, ScrollText, AlertTriangle,
  Flag, Swords, Shield, Flame, Gauge, Skull, Star, Save, Plus, Globe, Sparkles,
  MapPin, Building2, Sprout, Mountain, History, Lightbulb, Lock, Check, Zap,
} from "lucide-react";
import { COUNTRIES, ARCHETYPES, HISTORICAL_SCENARIOS, TECH_TREE } from "./countries.js";

// ============================================================
// DIFFICULTIES
// ============================================================

const DIFFICULTIES = {
  advisor: { key: "advisor", name: "Advisor", tagline: "Gentle", color: "#7a9960", icon: Shield,
    description: "Forgiving bands, rare shocks. Perfect for learning.",
    bandMultiplier: 1.6, crisisChance: 0.06, startingDebtMult: 0.6,
    startingApproval: 72, winStreak: 6, trend: 0.027, drift: 0.004 },
  minister: { key: "minister", name: "Minister", tagline: "Standard", color: "#d4a94a", icon: Flag,
    description: "Realistic bands. Occasional crises. The normal challenge.",
    bandMultiplier: 1.0, crisisChance: 0.12, startingDebtMult: 1.0,
    startingApproval: 60, winStreak: 8, trend: 0.025, drift: 0.008 },
  chancellor: { key: "chancellor", name: "Chancellor", tagline: "Tight", color: "#c77a3f", icon: Swords,
    description: "Narrow windows, frequent shocks, elevated debt.",
    bandMultiplier: 0.7, crisisChance: 0.18, startingDebtMult: 1.5,
    startingApproval: 52, winStreak: 10, trend: 0.022, drift: 0.012 },
  autocrat: { key: "autocrat", name: "Autocrat", tagline: "Brutal", color: "#a83838", icon: Flame,
    description: "Cascading crises. Victory means mastery.",
    bandMultiplier: 0.5, crisisChance: 0.25, startingDebtMult: 2.0,
    startingApproval: 42, winStreak: 12, trend: 0.020, drift: 0.016 },
};

const BASE_TARGETS = {
  growth: { center: 0.03, halfWidth: 0.01 },
  unemployment: { center: 0.04, halfWidth: 0.01 },
  inflation: { center: 0.0225, halfWidth: 0.0075 },
};

function getTargets(diff) {
  const m = DIFFICULTIES[diff].bandMultiplier;
  return {
    growth: { min: BASE_TARGETS.growth.center - BASE_TARGETS.growth.halfWidth * m,
              max: BASE_TARGETS.growth.center + BASE_TARGETS.growth.halfWidth * m },
    unemployment: { min: BASE_TARGETS.unemployment.center - BASE_TARGETS.unemployment.halfWidth * m,
                    max: BASE_TARGETS.unemployment.center + BASE_TARGETS.unemployment.halfWidth * m },
    inflation: { min: BASE_TARGETS.inflation.center - BASE_TARGETS.inflation.halfWidth * m,
                 max: BASE_TARGETS.inflation.center + BASE_TARGETS.inflation.halfWidth * m },
  };
}

// ============================================================
// SUBSIDIES & EVENTS (condensed)
// ============================================================

const SUBSIDY_OPTIONS = [
  { key: "none", label: "No Subsidy", description: "Let markets clear." },
  { key: "agriculture", label: "Agriculture", description: "Boost farm output." },
  { key: "manufacturing", label: "Manufacturing", description: "Support industry." },
  { key: "trade", label: "Export & Shipping", description: "Subsidize exporters." },
  { key: "mining", label: "Mining & Energy", description: "Lower energy costs." },
  { key: "services", label: "Services", description: "Support finance & tech." },
];

const SCHEDULED_EVENTS = {
  8: { id: "silverbank", title: "Banking Crisis",
    warningHeadline: "Major bank showing signs of stress",
    headline: "A major bank collapses, panic spreads",
    body: "A regional bank has failed. Credit is freezing across the economy.",
    options: [
      { label: "Emergency bailout", blurb: "Restore confidence. Debt rises.",
        effect: { debtAdd: 80, approvalDelta: 6, growthDrag: -0.005 },
        lesson: { title: "Lender of last resort", body: "A government bailout halts panic by guaranteeing deposits. The cost is moral hazard." } },
      { label: "Let the bank fail", blurb: "Market discipline. Contagion risk.",
        effect: { growthDrag: -0.015, unemploymentBump: 0.012, approvalDelta: -10 },
        lesson: { title: "Financial contagion", body: "Letting a bank fail risks spreading panic. Investment contracts sharply." } },
      { label: "Nationalize it", blurb: "Radical. Long term fix.",
        effect: { debtAdd: 50, approvalDelta: -3, prodBump: 0.01 },
        lesson: { title: "Public ownership", body: "Absorbing a failing bank prevents contagion while preserving credit." } },
    ] },
  15: { id: "great_recession", title: "Major Recession",
    warningHeadline: "Global markets showing severe stress",
    headline: "Global recession. Aggregate demand collapses",
    body: "Trading partners are in free fall. Consumer confidence has evaporated.",
    options: [
      { label: "Keynesian stimulus", blurb: "Deficit spend to cushion.",
        effect: { spendBump: 0.05, taxBump: -0.02, approvalDelta: 4 },
        lesson: { title: "Keynesian countercyclical policy", body: "Expansionary fiscal policy shifts AD rightward. The multiplier amplifies spending." } },
      { label: "Austerity", blurb: "Protect the debt. Accept pain.",
        effect: { growthDrag: -0.025, unemploymentBump: 0.02, approvalDelta: -8 },
        lesson: { title: "Pro-cyclical austerity", body: "Cutting spending during a downturn deepens it." } },
      { label: "Aggressive rate cut", blurb: "Near the zero lower bound.",
        effect: { rateBump: -0.02, moneyBump: 0.03, approvalDelta: 2 },
        lesson: { title: "Monetary policy at the lower bound", body: "Rates near zero lose traction in a liquidity trap." } },
    ] },
  22: { id: "energy_shock", title: "Energy Shock",
    warningHeadline: "Oil futures spiking on cartel formation",
    headline: "Oil prices quadruple. Stagflation grips the economy",
    body: "A supply shock is driving costs through every sector.",
    options: [
      { label: "Sharp rate hike", blurb: "Volcker-style shock therapy.",
        effect: { rateBump: 0.025, growthDrag: -0.02, inflationBump: -0.015 },
        lesson: { title: "Volcker disinflation", body: "Breaking inflation with aggressive tightening at the cost of recession." } },
      { label: "Energy tax cut", blurb: "Ease consumer pain.",
        effect: { taxBump: -0.03, inflationBump: 0.005, approvalDelta: 3 },
        lesson: { title: "Subsidizing through a supply shock", body: "Supports AD but doesn't address the supply constraint." } },
      { label: "Impose price controls", blurb: "Populist. Shortages result.",
        effect: { inflationBump: -0.01, growthDrag: -0.01, approvalDelta: -2 },
        lesson: { title: "Price ceilings and shortages", body: "A ceiling below market creates persistent shortages." } },
    ] },
  30: { id: "debt_crisis", title: "Debt Crisis",
    warningHeadline: "Bond spreads widening dangerously",
    headline: "Bond markets revolt, demanding punishing yields",
    body: "Investors no longer trust that the nation can service its debt.",
    options: [
      { label: "Harsh spending cuts", blurb: "Regain credibility.",
        effect: { spendBump: -0.05, approvalDelta: -10, growthDrag: -0.015 },
        lesson: { title: "Fiscal credibility", body: "Credible austerity can lower yields, but the output cost is often larger than expected." } },
      { label: "Debt restructuring", blurb: "Partial default.",
        effect: { debtAdd: -200, approvalDelta: -5, prodBump: -0.02 },
        lesson: { title: "Sovereign default", body: "Writing down debt provides relief but locks a country out of capital markets." } },
      { label: "Accept foreign bailout", blurb: "Conditions attached.",
        effect: { debtAdd: -100, approvalDelta: -6, taxBump: 0.03 },
        lesson: { title: "Conditional lending", body: "IMF-style funds come in exchange for austerity." } },
    ] },
  38: { id: "pandemic", title: "Pandemic",
    warningHeadline: "Respiratory outbreak spreading abroad",
    headline: "Pandemic forces economic shutdown",
    body: "Both a supply shock and a demand shock.",
    options: [
      { label: "Massive emergency spending", blurb: "Pandemic-scale stimulus.",
        effect: { spendBump: 0.08, rateBump: -0.015, debtAdd: 200, approvalDelta: 8 },
        lesson: { title: "Combined AD and AS shocks", body: "Massive fiscal support prevents demand collapse but leaves a long debt tail." } },
      { label: "Targeted wage subsidies", blurb: "Keep workers attached.",
        effect: { spendBump: 0.03, unemploymentBump: -0.015, debtAdd: 80 },
        lesson: { title: "Preserving labor attachment", body: "Paying firms to retain workers prevents scarring." } },
      { label: "Minimal intervention", blurb: "Brutal short run.",
        effect: { unemploymentBump: 0.04, growthDrag: -0.03, approvalDelta: -12 },
        lesson: { title: "Creative destruction vs scarring", body: "Hands-off lets firms exit quickly, but mass unemployment creates permanent scars." } },
    ] },
  45: { id: "trade_war", title: "Trade War",
    warningHeadline: "Diplomatic tensions with trade partners",
    headline: "Partners impose retaliatory tariffs",
    body: "A cycle of tit-for-tat protectionism has broken out.",
    options: [
      { label: "Match their tariffs", blurb: "Escalate.",
        effect: { tariffBump: 0.08, inflationBump: 0.01, growthDrag: -0.012 },
        lesson: { title: "Tariff retaliation spiral", body: "Reciprocal tariffs impose deadweight losses on both sides." } },
      { label: "Negotiate an exit", blurb: "Diplomatic cost.",
        effect: { approvalDelta: -6, tariffBump: -0.02, growthDrag: 0.008 },
        lesson: { title: "Gains from trade", body: "De-escalation preserves comparative advantage." } },
      { label: "Open unilaterally", blurb: "Bold.",
        effect: { tariffBump: -0.04, growthDrag: -0.006, prodBump: 0.015, approvalDelta: -4 },
        lesson: { title: "Unilateral free trade", body: "Dropping tariffs maximizes consumer welfare." } },
    ] },
};

const RANDOM_CRISES = [
  { headline: "Energy prices spike on regional instability", effect: { inflationBump: 0.018, growthDrag: -0.004 },
    lesson: { title: "Minor supply shock", body: "Input cost pressure shifts SRAS leftward." } },
  { headline: "Trade partner enters recession", effect: { growthDrag: -0.010, unemploymentBump: 0.005 },
    lesson: { title: "Net exports channel", body: "Foreign demand falls, shifting AD leftward." } },
  { headline: "Productivity surge in technology sector", effect: { growthDrag: 0.012, inflationBump: -0.005, prodBump: 0.015 },
    lesson: { title: "Positive supply shock", body: "A productivity jump shifts LRAS rightward." } },
  { headline: "Currency speculators target the national currency", effect: { inflationBump: 0.01, growthDrag: -0.005 },
    lesson: { title: "Currency pressure", body: "Speculative pressure can force rate hikes to defend the currency." } },
  { headline: "Housing bubble concerns mount", effect: { inflationBump: 0.008, approvalDelta: -3 },
    lesson: { title: "Asset price bubbles", body: "Rising asset prices can outpace fundamentals when credit is cheap." } },
  { headline: "Consumer confidence collapses on political uncertainty", effect: { growthDrag: -0.008, approvalDelta: -4 },
    lesson: { title: "Animal spirits", body: "Confidence shocks reduce spending without fundamental changes." } },
  { headline: "Natural disaster devastates the breadbasket", effect: { growthDrag: -0.007, inflationBump: 0.006 },
    lesson: { title: "Supply disruption", body: "A physical shock to productive capacity shifts SRAS leftward." } },
  { headline: "Major resource discovery announced", effect: { growthDrag: 0.008, prodBump: 0.01 },
    lesson: { title: "Terms of trade improvement", body: "A new resource export raises real income." } },
  { headline: "Labor force demographics shift", effect: { growthDrag: -0.004, unemploymentBump: -0.008 },
    lesson: { title: "Labor supply contraction", body: "A shrinking labor force reduces both measured unemployment and potential output." } },
  { headline: "Foreign direct investment surges", effect: { growthDrag: 0.006, prodBump: 0.008 },
    lesson: { title: "Capital account inflows", body: "Inbound investment raises the capital stock." } },
  { headline: "Banking regulations tightened", effect: { growthDrag: -0.005, prodBump: 0.005 },
    lesson: { title: "Regulatory tradeoffs", body: "Higher capital requirements reduce lending but improve resilience." } },
  { headline: "Major cyberattack disrupts payment systems", effect: { growthDrag: -0.008, prodBump: -0.005 },
    lesson: { title: "Infrastructure shocks", body: "Disruptions to critical systems reduce productive capacity." } },
];

const DECISION_EVENTS = [
  { headline: "Monopoly pricing accusation", body: "A dominant firm is charging above marginal cost.",
    options: [
      { label: "Break up the monopoly", blurb: "Long term welfare gain.",
        effect: { growthDrag: -0.006, approvalDelta: 4, prodBump: 0.005 },
        lesson: { title: "Deadweight loss of monopoly", body: "Monopolies restrict output to raise price, creating deadweight loss." } },
      { label: "Leave it alone", blurb: "Accept higher prices.",
        effect: { inflationBump: 0.004, approvalDelta: -3 },
        lesson: { title: "Allocative inefficiency", body: "Unregulated market power leads firms to price above marginal cost." } },
    ] },
  { headline: "Industrial runoff poisons a river", body: "Factories are dumping untreated waste.",
    options: [
      { label: "Pigouvian tax", blurb: "Price the externality.",
        effect: { growthDrag: -0.004, approvalDelta: 3 },
        lesson: { title: "Pigouvian tax and externalities", body: "A tax equal to marginal external cost forces internalization." } },
      { label: "Ignore it", blurb: "Externalities accumulate.",
        effect: { approvalDelta: -5, prodBump: -0.008 },
        lesson: { title: "Market failure", body: "Unpriced externalities diverge private from social costs." } },
    ] },
  { headline: "General strike threatens production", body: "Unions demand higher wages.",
    options: [
      { label: "Raise minimum wage", blurb: "Calm unrest.",
        effect: { minWageBump: 0.04, approvalDelta: 2 },
        lesson: { title: "Price floors in labor markets", body: "A minimum wage above equilibrium creates a labor surplus." } },
      { label: "Hold the line", blurb: "Protect employment.",
        effect: { approvalDelta: -4, growthDrag: -0.004 },
        lesson: { title: "Labor market frictions", body: "Strikes reduce output in the short run." } },
    ] },
  { headline: "Immigration reform proposed", body: "Labor shortages are slowing output.",
    options: [
      { label: "Open immigration", blurb: "Boost labor supply.",
        effect: { growthDrag: 0.008, prodBump: 0.01, approvalDelta: -5 },
        lesson: { title: "Labor supply shifts", body: "Expanding labor force raises potential output." } },
      { label: "Maintain quotas", blurb: "Political safety.",
        effect: { approvalDelta: 3, growthDrag: -0.002 },
        lesson: { title: "Factor constraints", body: "Potential output is bounded by labor, capital, and technology." } },
    ] },
  { headline: "Infrastructure proposal", body: "A ten-year public works program would modernize rail and ports.",
    options: [
      { label: "Approve", blurb: "Deficit now, productivity later.",
        effect: { spendBump: 0.02, prodBump: 0.02, debtAdd: 100 },
        lesson: { title: "Public capital and growth", body: "Infrastructure spending raises productive capacity." } },
      { label: "Reject", blurb: "Fiscal discipline.",
        effect: { approvalDelta: -2 },
        lesson: { title: "Opportunity cost of austerity", body: "Declining to invest has long-run costs." } },
    ] },
  { headline: "Rent control demands", body: "Housing costs have become unaffordable.",
    options: [
      { label: "Impose rent controls", blurb: "Housing shortage.",
        effect: { approvalDelta: 6, growthDrag: -0.004, inflationBump: -0.003 },
        lesson: { title: "Price ceilings in housing", body: "Rent controls reduce new construction." } },
      { label: "Subsidize construction", blurb: "Slower relief.",
        effect: { spendBump: 0.01, prodBump: 0.005, approvalDelta: -2 },
        lesson: { title: "Supply-side housing policy", body: "Subsidizing construction increases the housing stock." } },
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
  if (state.turn < 3) return null;
  const chance = DIFFICULTIES[state.difficulty].crisisChance;
  if (Math.random() > chance) return null;
  return RANDOM_CRISES[Math.floor(Math.random() * RANDOM_CRISES.length)];
}

function rollDecisionEvent(state) {
  if (state.turn < 3) return null;
  if (state.pendingEvent) return null;
  if (Math.random() > 0.15) return null;
  return DECISION_EVENTS[Math.floor(Math.random() * DECISION_EVENTS.length)];
}

const getScheduledForTurn = (t) => SCHEDULED_EVENTS[t] || null;
function getUpcomingScheduled(turn) {
  for (let t = turn + 1; t <= turn + 3; t++) {
    if (SCHEDULED_EVENTS[t]) return { event: SCHEDULED_EVENTS[t], turnsAway: t - turn };
  }
  return null;
}

function techEffect(state, key, defaultVal = 0) {
  const unlocked = state.unlockedTech || [];
  let v = defaultVal;
  for (const techKey of unlocked) {
    const t = TECH_TREE[techKey];
    if (t?.effect?.[key] !== undefined) v = t.effect[key];
  }
  return v;
}

function hasTech(state, key) {
  return (state.unlockedTech || []).includes(key);
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
  if (spendDelta > 0.03 && next.inflation > 0.04)
    lessons.push({ title: "Crowding out and overheating", body: "Spending near capacity lifts prices more than output." });
  if (policies.tariff > 0.15)
    lessons.push({ title: "Deadweight loss of tariffs", body: "High tariffs shrink trade volume." });
  if (next.debt / next.gdp > 1.2)
    lessons.push({ title: "Debt to GDP in danger zone", body: "Interest payments eat revenue." });
  if (policies.minWage > 0.55)
    lessons.push({ title: "Minimum wage as price floor", body: "A floor above market creates a labor surplus." });
  if (policies.moneyGrowth > 0.07 && next.inflation > 0.04)
    lessons.push({ title: "Quantity theory of money", body: "MV = PY: money growth above output feeds prices." });
  return lessons.slice(0, 2);
}

function simulate(state, policies) {
  const d = DIFFICULTIES[state.difficulty];
  const scheduled = getScheduledForTurn(state.turn + 1);
  const crisis = scheduled ? null : rollRandomCrisis(state);

  const taxDelta = policies.taxRate - state.taxRate;
  const spendDelta = policies.govSpendingRate - state.govSpendingRate;
  const rateDelta = policies.interestRate - state.interestRate;

  // Tech effects
  const inflationDriftMult = techEffect(state, "inflationDriftMult", 1.0);
  const recessionBuffer = techEffect(state, "recessionBuffer", 0);
  const bankingCrisisMult = techEffect(state, "bankingCrisisMult", 1.0);
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
  // Inflation targeting pulls inflation back to 2%
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

  // Tech points: 1 per 4 turns if at least one target hit
  let techPoints = state.techPoints || 0;
  if (hitsTargets && (state.turn + 1) % 4 === 0) techPoints += 1;

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
  else {
    const decision = rollDecisionEvent(next);
    if (decision) next.pendingEvent = { ...decision, isMajor: false };
  }
  return { next, lessons, crisis, scheduled, warningTriggered: upcomingWarning && upcomingWarning.turnsAway === 3 };
}

// ============================================================
// SAVE / LOAD
// ============================================================

const SAVE_KEY = "aurelia_save_v2";
function saveGame(d) { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...d, savedAt: Date.now() })); return true; } catch { return false; } }
function loadGame() { try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch {} }

// ============================================================
// UI PRIMITIVES
// ============================================================

function StatPill({ icon: Icon, label, value, inTarget }) {
  const tone = inTarget === true ? "text-emerald-300" : inTarget === false ? "text-rose-300" : "text-amber-50";
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border border-amber-900/30 bg-stone-900/50 rounded-xl transition-all hover:bg-stone-900/80 hover:scale-[1.03] hover:-translate-y-0.5">
      <Icon size={14} className="text-amber-200/80" strokeWidth={1.8} />
      <div className="flex flex-col leading-tight">
        <span className="text-[9px] uppercase tracking-[0.18em] text-amber-200/60">{label}</span>
        <span className={`font-[Fraunces] text-[15px] ${tone}`}>{value}</span>
      </div>
    </div>
  );
}

function MinistryButton({ icon: Icon, label, onClick, active, alert, badge }) {
  return (
    <button onClick={onClick}
      className={`group relative px-4 py-3 rounded-xl border flex flex-col items-center gap-1 min-w-[98px] transition-all duration-200 ${
        active ? "border-amber-400 bg-amber-950/60 scale-[1.04]"
        : "border-amber-900/30 bg-stone-900/60 hover:border-amber-500/60 hover:bg-stone-900 hover:-translate-y-1 hover:scale-[1.03]"
      }`}>
      <Icon size={20} className="text-amber-200 transition-transform group-hover:scale-110 group-hover:rotate-3" strokeWidth={1.6} />
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
// COUNTRY MAP with strong hover pop
// ============================================================

function CountryMap({ state, country, onSelectRegion, selectedRegion }) {
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
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.4"/>
        </filter>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="#1e2a36" />
      <g stroke="#3a4a58" strokeWidth="0.5" fill="none" opacity="0.5">
        <path d="M 0 60 Q 340 85 700 55" />
        <path d="M 0 340 Q 340 365 700 340" />
      </g>
      <g>
        {country.regions.map((r) => {
          const delta = regionalStatus[r.id];
          const fill = colorFor(delta);
          const isSel = selectedRegion === r.id;
          return (
            <path key={r.id} d={r.path} fill={fill}
              stroke={isSel ? "#1a1510" : "#2a2117"} strokeWidth={isSel ? "2.5" : "1.2"}
              onClick={() => onSelectRegion(r.id)}
              style={{
                transformOrigin: "center", transformBox: "fill-box",
                transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease, fill-opacity 0.15s ease, stroke-width 0.15s",
                filter: isSel ? "url(#region-shadow) brightness(1.08)" : "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.setAttribute("fill-opacity", "0.92");
                e.currentTarget.style.transform = "scale(1.04) translateY(-2px)";
                e.currentTarget.style.filter = "url(#region-shadow) brightness(1.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.setAttribute("fill-opacity", "1");
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.filter = isSel ? "url(#region-shadow) brightness(1.08)" : "none";
              }}
              className="cursor-pointer" />
          );
        })}
        <g opacity="0.12" style={{ pointerEvents: "none" }}>
          {country.regions.map((r) => <path key={`p-${r.id}`} d={r.path} fill="url(#paper-tx)" />)}
        </g>
      </g>
      <g style={{ pointerEvents: "none" }}>
        {country.regions.map((r) => (
          <g key={`l-${r.id}`} transform={`translate(${r.labelX} ${r.labelY})`}>
            <text textAnchor="middle" fontFamily="Fraunces, serif" fontSize="10" fontStyle="italic" fill="#1a1510" opacity="0.9">{r.name}</text>
            <text textAnchor="middle" y="11" fontFamily="IBM Plex Sans, sans-serif" fontSize="7" fill="#3a2f1f" opacity="0.7" letterSpacing="0.8">{r.industry.toUpperCase()}</text>
          </g>
        ))}
      </g>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#map-vignette)" style={{ pointerEvents: "none" }} />
      <g transform="translate(30 30)" style={{ pointerEvents: "none" }}>
        <text fontFamily="Fraunces, serif" fontSize="13" fontStyle="italic" fill="#c9a961" opacity="0.85">{country.kind === "fiction" ? "Domains of" : "Regions of"}</text>
        <text y="18" fontFamily="Fraunces, serif" fontSize="18" fill="#e8dcc0" letterSpacing="1.5">{country.name.toUpperCase()}</text>
      </g>
    </svg>
  );
}

// ============================================================
// ENHANCED MENU BACKDROP (parallax clouds, drifting lights, birds)
// ============================================================

function MenuBackdrop() {
  return (
    <svg viewBox="0 0 1440 900" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="m-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e2438" />
          <stop offset="50%" stopColor="#2d2518" />
          <stop offset="100%" stopColor="#3a2a1a" />
        </linearGradient>
        <radialGradient id="m-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e8a85c" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#e8a85c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="m-smoke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a3a28" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#4a3a28" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="cloud-soft" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c9a961" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#c9a961" stopOpacity="0" />
        </radialGradient>
        <filter id="twinkle">
          <feGaussianBlur stdDeviation="1" />
        </filter>
      </defs>

      <rect x="0" y="0" width="1440" height="900" fill="url(#m-sky)" />

      {/* Slow drifting cloud masses (far layer) */}
      <g opacity="0.6">
        <ellipse cx="300" cy="200" rx="260" ry="50" fill="url(#cloud-soft)">
          <animate attributeName="cx" values="-200;300;1640" dur="80s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="900" cy="150" rx="300" ry="60" fill="url(#cloud-soft)">
          <animate attributeName="cx" values="1640;900;-300" dur="100s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="1200" cy="260" rx="220" ry="45" fill="url(#cloud-soft)">
          <animate attributeName="cx" values="-300;1200;1640" dur="120s" repeatCount="indefinite" />
        </ellipse>
      </g>

      {/* Twinkling stars */}
      <g fill="#e8dcc0" filter="url(#twinkle)">
        {[
          [120, 100, 1.5, 3], [300, 60, 1, 4], [520, 130, 1.2, 5], [680, 80, 0.8, 3.5],
          [920, 110, 1.4, 4.5], [1100, 75, 1, 3], [1280, 140, 1.2, 5], [1350, 60, 0.9, 4],
          [200, 180, 0.7, 6], [420, 210, 1.1, 4], [760, 220, 0.9, 5], [1040, 240, 1.3, 3.5], [1200, 200, 0.8, 5.5],
        ].map(([x, y, r, dur], i) => (
          <circle key={i} cx={x} cy={y} r={r}>
            <animate attributeName="opacity" values="0.3;1;0.3" dur={`${dur}s`} repeatCount="indefinite" begin={`${i * 0.3}s`} />
          </circle>
        ))}
      </g>

      {/* Pulsing sun */}
      <circle cx="1080" cy="340" r="220" fill="url(#m-sun)">
        <animate attributeName="r" values="210;240;210" dur="10s" repeatCount="indefinite" />
      </circle>
      <circle cx="1080" cy="340" r="58" fill="#e8a85c" opacity="0.5">
        <animate attributeName="opacity" values="0.45;0.6;0.45" dur="6s" repeatCount="indefinite" />
      </circle>

      {/* Distant mountains */}
      <path d="M 0 520 L 120 440 L 260 500 L 380 420 L 520 480 L 680 410 L 820 470 L 980 430 L 1120 480 L 1280 440 L 1440 490 L 1440 900 L 0 900 Z"
        fill="#2a2418" opacity="0.8" />
      <path d="M 0 620 L 150 560 L 320 600 L 480 550 L 640 610 L 800 570 L 960 620 L 1120 580 L 1280 615 L 1440 580 L 1440 900 L 0 900 Z"
        fill="#1e1a14" opacity="0.9" />

      {/* Birds (silhouettes) gliding across */}
      <g opacity="0.55" fill="#1a1510">
        <g>
          <path d="M 0 0 Q 3 -4 6 0 Q 9 -4 12 0" stroke="#1a1510" strokeWidth="1" fill="none">
            <animateTransform attributeName="transform" type="translate" values="-40 380; 1500 320; 1500 320" dur="45s" repeatCount="indefinite" />
          </path>
          <path d="M 0 0 Q 3 -3 6 0 Q 9 -3 12 0" stroke="#1a1510" strokeWidth="0.8" fill="none">
            <animateTransform attributeName="transform" type="translate" values="-60 410; 1520 360; 1520 360" dur="55s" repeatCount="indefinite" begin="8s" />
          </path>
          <path d="M 0 0 Q 2 -2.5 4 0 Q 6 -2.5 8 0" stroke="#1a1510" strokeWidth="0.7" fill="none">
            <animateTransform attributeName="transform" type="translate" values="-30 395; 1500 340; 1500 340" dur="65s" repeatCount="indefinite" begin="15s" />
          </path>
        </g>
      </g>

      {/* Factory silhouettes */}
      <g fill="#0f0c08" opacity="0.95">
        <rect x="80" y="580" width="60" height="120" /><rect x="150" y="560" width="20" height="140" />
        <rect x="180" y="600" width="50" height="100" /><rect x="240" y="570" width="18" height="130" />
        <rect x="280" y="590" width="70" height="110" /><rect x="370" y="550" width="25" height="150" />
        <rect x="410" y="580" width="80" height="120" /><rect x="510" y="600" width="40" height="100" />
        <rect x="570" y="575" width="22" height="125" /><rect x="610" y="585" width="90" height="115" />
        <rect x="720" y="560" width="28" height="140" /><rect x="820" y="595" width="70" height="105" />
        <rect x="910" y="575" width="22" height="125" /><rect x="950" y="605" width="60" height="95" />
      </g>

      {/* Rising smoke plumes */}
      <g opacity="0.5">
        <ellipse cx="160" cy="500" rx="40" ry="80" fill="url(#m-smoke)">
          <animate attributeName="cy" values="500;460;500" dur="11s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.3;0.5" dur="11s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="250" cy="490" rx="35" ry="70" fill="url(#m-smoke)">
          <animate attributeName="cy" values="490;450;490" dur="13s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="380" cy="470" rx="45" ry="90" fill="url(#m-smoke)">
          <animate attributeName="cy" values="470;430;470" dur="12s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="580" cy="485" rx="40" ry="75" fill="url(#m-smoke)">
          <animate attributeName="cy" values="485;445;485" dur="10s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="730" cy="470" rx="42" ry="85" fill="url(#m-smoke)">
          <animate attributeName="cy" values="470;430;470" dur="14s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="850" cy="490" rx="38" ry="78" fill="url(#m-smoke)">
          <animate attributeName="cy" values="490;450;490" dur="12s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="970" cy="485" rx="36" ry="72" fill="url(#m-smoke)">
          <animate attributeName="cy" values="485;445;485" dur="11.5s" repeatCount="indefinite" />
        </ellipse>
      </g>

      {/* Drifting firefly lights */}
      <g fill="#e8a85c">
        <circle cx="200" cy="650" r="1.5" opacity="0.8">
          <animate attributeName="cy" values="650;600;650" dur="7s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.9;0" dur="7s" repeatCount="indefinite" />
        </circle>
        <circle cx="450" cy="680" r="1.2" opacity="0.7">
          <animate attributeName="cy" values="680;620;680" dur="9s" repeatCount="indefinite" begin="2s" />
          <animate attributeName="opacity" values="0;0.8;0" dur="9s" repeatCount="indefinite" begin="2s" />
        </circle>
        <circle cx="680" cy="660" r="1.3" opacity="0.75">
          <animate attributeName="cy" values="660;605;660" dur="8s" repeatCount="indefinite" begin="4s" />
          <animate attributeName="opacity" values="0;0.85;0" dur="8s" repeatCount="indefinite" begin="4s" />
        </circle>
        <circle cx="900" cy="690" r="1.4" opacity="0.7">
          <animate attributeName="cy" values="690;625;690" dur="10s" repeatCount="indefinite" begin="1s" />
          <animate attributeName="opacity" values="0;0.8;0" dur="10s" repeatCount="indefinite" begin="1s" />
        </circle>
      </g>

      <rect x="0" y="0" width="1440" height="900" fill="#0f0c08" opacity="0.42" />
    </svg>
  );
}

// ============================================================
// SCREENS
// ============================================================

function MainMenu({ onNewGame, onContinue, onHow, hasSave }) {
  return (
    <div className="fixed inset-0 bg-[#0f0c08] overflow-hidden">
      <MenuBackdrop />
      <div className="relative z-10 h-full flex flex-col items-center justify-center animate-[fadeIn_0.8s_ease-out]">
        <div className="text-center mb-12">
          <div className="text-[11px] uppercase tracking-[0.5em] mb-3 animate-[slideDown_0.6s_ease-out]" style={{ color: "#c9a961" }}>An Economic Chronicle</div>
          <h1 className="font-[Fraunces] text-[120px] leading-none tracking-[0.02em] mb-2 animate-[slideDown_0.7s_ease-out]" style={{ color: "#f2ead7", textShadow: "0 2px 30px rgba(201, 169, 97, 0.35)" }}>AURELIA</h1>
          <div className="w-36 h-px mx-auto mb-4 animate-[slideDown_0.8s_ease-out]" style={{ background: "linear-gradient(to right, transparent, #c9a961, transparent)" }} />
          <div className="text-[13px] tracking-[0.2em] italic animate-[slideDown_0.9s_ease-out]" style={{ color: "#a89068" }}>Learn Economics by Running an Economy</div>
        </div>
        <div className="flex flex-col gap-3 w-[300px] animate-[slideUp_0.6s_ease-out_0.4s_both]">
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
          <button onClick={onHow}
            className="rounded-xl border border-amber-900/40 bg-stone-950/40 hover:bg-stone-900/60 hover:scale-[1.02] py-3 transition-all duration-200">
            <div className="flex items-center justify-center gap-3">
              <BookOpen size={13} style={{ color: "#a89068" }} />
              <span className="font-[Fraunces] text-[14px] tracking-[0.2em] uppercase" style={{ color: "#d4c090" }}>How to Play</span>
            </div>
          </button>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.3em] uppercase" style={{ color: "#6a5840" }}>
          Version 0.5 &middot; A prototype
        </div>
      </div>
    </div>
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
            { key: "fiction", icon: Sparkles, title: "Fictional",
              desc: "Govern Aurelia or build your own nation from scratch. No history to match, just the principles.",
              color: "#c9a961" },
            { key: "nonfiction", icon: Globe, title: "Real World",
              desc: "Lead a G7 country through the 2026 economy. Real regions, real starting conditions.",
              color: "#7a9960" },
            { key: "historical", icon: History, title: "Historical",
              desc: "Take on famous economic crises. The Great Depression, stagflation, Volcker, 2008, COVID.",
              color: "#b87240" },
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

function CountryPicker({ mode, onSelect, onBack, onCustom }) {
  const fictional = [COUNTRIES.aurelia];
  const nonfictional = Object.values(COUNTRIES).filter(c => c.kind === "nonfiction");
  const visible = mode === "fiction" ? fictional : nonfictional;

  return (
    <div className="fixed inset-0 bg-[#0f0c08] overflow-y-auto">
      <MenuBackdrop />
      <div className="relative z-10 min-h-full flex flex-col items-center justify-center p-6 py-12 animate-[fadeIn_0.4s_ease-out]">
        <div className="text-center mb-6">
          <div className="text-[11px] uppercase tracking-[0.4em] mb-2" style={{ color: "#c9a961" }}>Select a nation</div>
          <h2 className="font-[Fraunces] text-[38px]" style={{ color: "#f2ead7" }}>{mode === "fiction" ? "Fictional Nations" : "Real World · 2026"}</h2>
        </div>

        <div className={`grid ${mode === "nonfiction" ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2"} gap-4 max-w-[1100px] w-full`}>
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
                {c.contextRate && (<><span>&middot;</span><span>{fmtPct(c.contextRate)} rate</span></>)}
              </div>
            </button>
          ))}
          {mode === "fiction" && (
            <button onClick={onCustom}
              className="group text-left rounded-2xl border-2 border-dashed p-5 bg-stone-950/40 hover:bg-stone-900/60 hover:scale-[1.03] hover:-translate-y-1 transition-all duration-200"
              style={{ borderColor: "#c9a96144" }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "#c9a961aa"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "#c9a96144"}>
              <div className="flex items-start gap-3 mb-3">
                <Plus size={26} style={{ color: "#c9a961" }} strokeWidth={1.5} />
                <div>
                  <div className="font-[Fraunces] text-[20px]" style={{ color: "#f2ead7" }}>Create Your Own</div>
                  <div className="text-[10.5px] uppercase tracking-[0.18em] italic" style={{ color: "#c9a961" }}>Custom fictional nation</div>
                </div>
              </div>
              <div className="text-[11.5px] leading-relaxed" style={{ color: "#d4c090" }}>Name your country and pick an archetype.</div>
            </button>
          )}
        </div>
        <button onClick={onBack} className="mt-8 text-[11px] uppercase tracking-[0.2em] hover:text-amber-100 transition-colors" style={{ color: "#a89068" }}>&larr; Back</button>
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
        <button onClick={onBack} className="mt-8 text-[11px] uppercase tracking-[0.2em] hover:text-amber-100 transition-colors" style={{ color: "#a89068" }}>&larr; Back</button>
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
                  <Icon size={22} style={{ color: active ? "#c9a961" : "#a89068" }} strokeWidth={1.5} className="mb-2 transition-transform group-hover:scale-110" />
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
            className="group rounded-xl px-6 py-3 border-2 hover:scale-[1.04] hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-40 disabled:hover:scale-100"
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
                    <div className="flex justify-between"><span>Crisis freq:</span><span className="font-[Fraunces]" style={{ color: "#f2ead7" }}>{(d.crisisChance * 100).toFixed(0)}%</span></div>
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
  const majorEvents = Object.entries(SCHEDULED_EVENTS).slice(0, 6);
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
            <div className="border-l-4 rounded-r-lg pl-4 py-2 my-5" style={{ borderColor: "#a83838", backgroundColor: "#a8383810" }}>
              <div className="font-[Fraunces] text-[16px] mb-2" style={{ color: "#f2ead7" }}>Failure Conditions</div>
              <div className="text-[12px] grid grid-cols-2 gap-0.5">
                <div>&middot; Approval below 5%</div><div>&middot; Unemployment above 18%</div>
                <div>&middot; Inflation above 18%</div><div>&middot; Debt above 200% GDP</div>
              </div>
            </div>
            <div className="border-l-4 rounded-r-lg pl-4 py-2 my-5" style={{ borderColor: "#a89068", backgroundColor: "#a8906810" }}>
              <div className="font-[Fraunces] text-[16px] mb-2" style={{ color: "#f2ead7" }}>Forecast of Major Events</div>
              <div className="space-y-1">
                {majorEvents.map(([turn, ev]) => (
                  <div key={turn} className="flex items-center gap-3 text-[12px]">
                    <div className="w-16 font-[Fraunces] text-right" style={{ color: d.color }}>Turn {turn}</div>
                    <div className="w-px h-4" style={{ backgroundColor: "#3a2f1f" }} />
                    <div style={{ color: "#f2ead7" }}>{ev.title}</div>
                  </div>
                ))}
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
            <p><span className="font-[Fraunces]" style={{ color: "#c9a961" }}>The ministries</span> along the bottom are your tools. Treasury (fiscal), Central Bank (monetary), Trade, Industry (labor/subsidies), Records (charts), Institutions (unlock economic tech).</p>
            <p><span className="font-[Fraunces]" style={{ color: "#c9a961" }}>The map</span> shades each region by how your policies serve it. Hover to inspect, click for details.</p>
            <p><span className="font-[Fraunces]" style={{ color: "#c9a961" }}>Crises</span> arrive randomly and on scheduled turns. Major crises warn three turns in advance.</p>
            <p><span className="font-[Fraunces]" style={{ color: "#c9a961" }}>Institutions</span> unlock permanent improvements: independent central bank reduces inflation, deposit insurance softens banking crises, floating exchange rates absorb foreign shocks, and more. Earn tech points by hitting your targets.</p>
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

function GameScreen({ initialDifficulty, country, scenario, restored, onExit }) {
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

  useEffect(() => {
    if (!state.gameOver) {
      saveGame({
        state, policies, history, log,
        country: country.key === "custom" ? country : { key: country.key },
        scenario: scenario?.key || null,
        difficulty: initialDifficulty,
      });
    } else {
      clearSave();
    }
  }, [state, policies, history, log, country, initialDifficulty, scenario]);

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
    setHistory((h) => [...h, {
      t: next.turn, label: `Q${next.quarter} '${String(next.year).slice(-2)}`,
      gdpGrowth: +(next.gdpGrowth * 100).toFixed(2),
      unemployment: +(next.unemployment * 100).toFixed(2),
      inflation: +(next.inflation * 100).toFixed(2),
    }]);
    const entries = [];
    if (warningTriggered && next.upcomingWarning)
      entries.push({ type: "warning", text: `${next.upcomingWarning.event.warningHeadline}. Expected in ${next.upcomingWarning.turnsAway}Q.` });
    if (scheduled) entries.push({ type: "major", text: scheduled.headline });
    if (crisis) entries.push({ type: "event", text: crisis.headline });
    if (next.techPoints > state.techPoints) entries.push({ type: "tech", text: `You have earned a Tech Point! Open the Institutions panel to spend it.` });
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
    if (!t) return;
    if (state.unlockedTech.includes(key)) return;
    if (state.techPoints < t.cost) return;
    const missing = t.requires.filter(r => !state.unlockedTech.includes(r));
    if (missing.length) return;
    setState((s) => ({
      ...s,
      techPoints: s.techPoints - t.cost,
      unlockedTech: [...s.unlockedTech, key],
    }));
    setLog((lg) => [
      { type: "tech", text: `Unlocked: ${t.name}` },
      { type: "lesson", title: t.name, text: t.lesson },
      ...lg,
    ].slice(0, 50));
  };

  if (state.gameOver) {
    return <EndScreen victory={state.victory} state={state} country={country}
      onMenu={() => { clearSave(); onExit(); }}
      onReplay={() => {
        const s = getInitialState(state.difficulty, country, scenario);
        setState(s);
        setPolicies({ taxRate: s.taxRate, govSpendingRate: s.govSpendingRate, interestRate: s.interestRate, moneyGrowth: s.moneyGrowth, tariff: s.tariff, minWage: s.minWage, subsidy: s.subsidy });
        setHistory([{ t: 0, label: `Q${s.quarter} '${String(s.year).slice(-2)}`, gdpGrowth: s.gdpGrowth * 100, unemployment: s.unemployment * 100, inflation: s.inflation * 100 }]);
        setLog([{ type: "system", text: `Your mandate begins again.` }]);
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

      <div className="relative z-10 border-b border-amber-900/40 bg-gradient-to-b from-stone-950 to-stone-900/90 shadow-lg">
        <div className="max-w-[1280px] mx-auto px-5 py-2 flex items-center gap-4">
          <div className="flex items-center gap-3 pr-4 border-r border-amber-900/30">
            <div className="w-10 h-10 rounded-xl border flex items-center justify-center transition-all hover:scale-110 hover:rotate-6" style={{ background: `${d.color}33`, borderColor: d.color }}>
              {country.flagEmoji ? <div className="text-[20px]">{country.flagEmoji}</div> : <Crown size={17} style={{ color: d.color }} />}
            </div>
            <div className="leading-tight">
              <div className="font-[Fraunces] text-[17px] text-amber-100 tracking-wide">{country.name}</div>
              <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: `${d.color}cc` }}>{d.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1 overflow-x-auto">
            <StatPill icon={TrendingUp} label="Growth" value={fmtPct(state.gdpGrowth, 2)} inTarget={growthInTarget} />
            <StatPill icon={Users} label="Unemp" value={fmtPct(state.unemployment, 1)} inTarget={unempInTarget} />
            <StatPill icon={Percent} label="Inflation" value={fmtPct(state.inflation, 2)} inTarget={inflationInTarget} />
            <StatPill icon={Landmark} label="Debt/GDP" value={fmtPct(debtRatio, 0)} inTarget={debtRatio < 1.0 ? true : debtRatio > 1.4 ? false : null} />
            <StatPill icon={Coins} label="GDP" value={fmtMoney(state.gdp)} />
            <StatPill icon={Users} label="Approval" value={`${state.approval.toFixed(0)}%`} inTarget={state.approval > 55 ? true : state.approval < 30 ? false : null} />
          </div>
          <div className="flex items-center gap-3 pl-3 border-l border-amber-900/30">
            <div className="text-right leading-tight">
              <div className="font-[Fraunces] text-[17px] text-amber-100">Q{state.quarter} {state.year}</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-amber-200/50">Turn {state.turn}</div>
            </div>
            <button onClick={onExit} className="text-amber-200/60 hover:text-amber-100 hover:scale-110 text-[10px] uppercase tracking-[0.18em] flex items-center gap-1 transition-all">
              <RotateCcw size={11} /> Menu
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-[1280px] mx-auto px-5 pt-4 pb-[130px] grid grid-cols-[1fr_320px] gap-4">
        <div className="relative rounded-2xl border-2 border-amber-900/40 bg-[#1a1510] overflow-hidden" style={{ boxShadow: "0 0 0 1px #c9a96144 inset" }}>
          <CountryMap state={state} country={country} onSelectRegion={(id) => { setSelectedRegion(id); setActivePanel("region"); }} selectedRegion={selectedRegion} />
          <div className="absolute bottom-3 left-3 bg-stone-950/80 border border-amber-900/40 rounded-lg px-3 py-2 flex items-center gap-3 text-[10px] text-amber-100/90">
            <span className="uppercase tracking-[0.18em] text-amber-200/60 mr-1">Health</span>
            {[["#7a9960", "Booming"], ["#a69866", "Healthy"], ["#94856a", "Neutral"], ["#96654a", "Slowing"], ["#7a4236", "Falling"]].map(([c, l]) => (
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

        <div className="rounded-2xl bg-[#f5ecd5] border-2 border-amber-900/50 relative max-h-[620px] overflow-y-auto" style={{ boxShadow: "0 0 0 1px #c9a96144 inset" }}>
          <div className="sticky top-0 bg-[#f5ecd5] border-b-2 border-amber-900/30 px-4 py-2 flex items-center gap-2 z-10 rounded-t-2xl">
            <ScrollText size={14} style={{ color: "#44403c" }} />
            <div className="font-[Fraunces] text-[16px]" style={{ color: "#1c1917" }}>Journal</div>
            <div className="text-[10px] uppercase tracking-[0.18em] ml-auto" style={{ color: "#78716c" }}>Events &amp; lessons</div>
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

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-amber-900/40 bg-gradient-to-t from-stone-950 via-stone-950 to-stone-900/95 shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
        <div className="max-w-[1280px] mx-auto px-5 py-3 flex items-center gap-2">
          <div className="flex items-center gap-2">
            <MinistryButton icon={Coins} label="Treasury" onClick={() => setActivePanel("treasury")} active={activePanel === "treasury"} />
            <MinistryButton icon={Banknote} label="Central Bank" onClick={() => setActivePanel("cb")} active={activePanel === "cb"} />
            <MinistryButton icon={Ship} label="Trade" onClick={() => setActivePanel("trade")} active={activePanel === "trade"} />
            <MinistryButton icon={Factory} label="Industry" onClick={() => setActivePanel("industry")} active={activePanel === "industry"} />
            <MinistryButton icon={Lightbulb} label="Institutions" onClick={() => setActivePanel("tech")} active={activePanel === "tech"} badge={state.techPoints > 0 ? state.techPoints : null} />
            <MinistryButton icon={BarChart3} label="Records" onClick={() => setActivePanel("charts")} active={activePanel === "charts"} />
            <MinistryButton icon={Gauge} label="Objectives" onClick={() => setActivePanel("objectives")} active={activePanel === "objectives"} alert={state.upcomingWarning} />
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
                  <div className="text-[11.5px] font-[Fraunces]">{opt.label}</div>
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
              Unlock lasting institutional improvements. You earn tech points by hitting your targets.
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
                      style={unlocked
                        ? { borderColor: "#7a9960", backgroundColor: "#e5f0da", color: "#1c1917" }
                        : available
                        ? { borderColor: "#c9a961", backgroundColor: "rgba(255,255,255,0.6)", color: "#1c1917" }
                        : { borderColor: "#d6d3d1", backgroundColor: "rgba(240,240,240,0.5)", color: "#78716c", opacity: 0.7 }}
                      onMouseEnter={(e) => { if (available) { e.currentTarget.style.transform = "scale(1.03) translateY(-2px)"; e.currentTarget.style.backgroundColor = "#1c1917"; e.currentTarget.style.color = "#f2ead7"; } }}
                      onMouseLeave={(e) => { if (available) { e.currentTarget.style.transform = ""; e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.6)"; e.currentTarget.style.color = "#1c1917"; } }}>
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

      {activePanel === "objectives" && (
        <PanelFrame title="Objectives" subtitle="Mandate briefing" onClose={() => setActivePanel(null)}>
          <div className="text-[13px] leading-relaxed space-y-4" style={{ color: "#1c1917" }}>
            <div>
              <div className="font-[Fraunces] text-[16px] mb-1">Primary objective</div>
              <div className="text-[12.5px]" style={{ color: "#44403c" }}>Streak: <span className="font-[Fraunces]" style={{ color: "#1c1917" }}>{state.inTargetStreak} / {d.winStreak}</span></div>
            </div>
            <div className="pt-3 border-t" style={{ borderColor: "#d6d3d1" }}>
              <div className="font-[Fraunces] text-[16px] mb-1">Upcoming major events</div>
              <div className="space-y-1.5 mt-2">
                {Object.entries(SCHEDULED_EVENTS).filter(([t]) => parseInt(t) > state.turn).map(([t, ev]) => (
                  <div key={t} className="flex items-center gap-3 text-[12px]">
                    <div className="w-14 font-[Fraunces] text-right" style={{ color: d.color }}>Turn {t}</div>
                    <div className="w-px h-4" style={{ backgroundColor: "#d6d3d1" }} />
                    <div style={{ color: "#1c1917" }}>{ev.title}</div>
                    <div className="ml-auto text-[10.5px]" style={{ color: "#78716c" }}>in {parseInt(t) - state.turn}Q</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
// ROOT
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

  useEffect(() => {
    const s = loadGame();
    if (s && s.state && !s.state.gameOver) setHasSave(true);
  }, []);

  const startContinue = () => {
    const s = loadGame();
    if (!s || !s.state) return;
    setRestored({ state: s.state, policies: s.policies, history: s.history, log: s.log });
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        body { font-family: 'IBM Plex Sans', system-ui, sans-serif; margin: 0; background: #0f0c08; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      `}</style>
      {screen === "menu" && <MainMenu hasSave={hasSave} onContinue={startContinue}
        onNewGame={() => { clearSave(); setHasSave(false); setRestored(null); setScreen("mode"); }}
        onHow={() => setScreen("how")} />}
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
        onExit={() => { setScreen("menu"); setRestored(null); setScenarioKey(null); setHasSave(!!loadGame()); }} />}
    </>
  );
}
