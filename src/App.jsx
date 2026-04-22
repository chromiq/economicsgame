import React, { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine,
} from "recharts";
import {
  TrendingUp, Landmark, Coins, Percent, Ship, ChevronRight, BookOpen, Target,
  RotateCcw, Users, Factory, Wheat, Anchor, Mountain, Sprout, Banknote, BarChart3,
  X, Crown, ScrollText, AlertTriangle, Flag, Swords, Shield, Flame, Gauge, Skull, Star,
} from "lucide-react";

// ============ DIFFICULTIES ============

const DIFFICULTIES = {
  advisor: {
    key: "advisor", name: "Advisor", tagline: "A gentle introduction",
    description: "Forgiving target bands, rare shocks, a healthier treasury. Recommended for first-time players still learning the concepts.",
    color: "#6b7e4e", icon: Shield,
    bandMultiplier: 1.6, crisisChance: 0.06, scheduledSeverity: 0.5,
    startingDebt: 300, startingApproval: 72, winStreak: 6,
    trend: 0.027, drift: 0.004,
  },
  minister: {
    key: "minister", name: "Minister", tagline: "The standard challenge",
    description: "Realistic target bands calibrated to AP Macro textbook ranges. Occasional random crises, one major scheduled shock every few years.",
    color: "#c9a961", icon: Flag,
    bandMultiplier: 1.0, crisisChance: 0.12, scheduledSeverity: 1.0,
    startingDebt: 500, startingApproval: 60, winStreak: 8,
    trend: 0.025, drift: 0.008,
  },
  chancellor: {
    key: "chancellor", name: "Chancellor", tagline: "For seasoned students",
    description: "Tighter tolerances, more frequent shocks, and elevated starting debt. The economy punishes passivity.",
    color: "#b87240", icon: Swords,
    bandMultiplier: 0.7, crisisChance: 0.18, scheduledSeverity: 1.3,
    startingDebt: 750, startingApproval: 52, winStreak: 10,
    trend: 0.022, drift: 0.012,
  },
  autocrat: {
    key: "autocrat", name: "Autocrat", tagline: "Brutal",
    description: "Narrow windows, cascading crises, a treasury on the brink from turn one. Victory here means you have mastered the syllabus.",
    color: "#8b2d2d", icon: Flame,
    bandMultiplier: 0.5, crisisChance: 0.25, scheduledSeverity: 1.6,
    startingDebt: 1000, startingApproval: 42, winStreak: 12,
    trend: 0.020, drift: 0.016,
  },
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

// ============ REGIONS ============

const REGIONS = [
  { id: "highlands", name: "Vaerholt Highlands", industry: "Mining & Energy", icon: Mountain, share: 0.12,
    path: "M 95 135 L 180 95 L 275 105 L 335 175 L 300 220 L 155 225 L 95 195 Z",
    labelX: 200, labelY: 165,
    sensitivity: { tariff: 0.4, minWage: -0.3, rate: -0.4, subsidyKey: "mining" } },
  { id: "port", name: "Saltmere Coast", industry: "Trade & Shipping", icon: Anchor, share: 0.18,
    path: "M 335 175 L 445 115 L 555 145 L 580 235 L 485 260 L 375 230 Z",
    labelX: 465, labelY: 190,
    sensitivity: { tariff: -1.2, minWage: -0.2, rate: -0.3, subsidyKey: "trade" } },
  { id: "frontier", name: "Western Frontier", industry: "Timber & Frontier", icon: Sprout, share: 0.08,
    path: "M 95 195 L 155 225 L 190 320 L 105 335 L 60 265 Z",
    labelX: 130, labelY: 270,
    sensitivity: { tariff: 0.1, minWage: -0.6, rate: -0.2, subsidyKey: "none" } },
  { id: "industrial", name: "Ironvale", industry: "Manufacturing", icon: Factory, share: 0.22,
    path: "M 155 225 L 300 220 L 375 230 L 400 310 L 310 330 L 190 320 Z",
    labelX: 275, labelY: 275,
    sensitivity: { tariff: 0.8, minWage: -0.5, rate: -0.9, subsidyKey: "manufacturing" } },
  { id: "capital", name: "Meridian District", industry: "Finance & Services", icon: Crown, share: 0.28,
    path: "M 375 230 L 485 260 L 500 330 L 400 310 Z",
    labelX: 440, labelY: 285,
    sensitivity: { tariff: -0.2, minWage: -0.1, rate: -1.1, subsidyKey: "services" } },
  { id: "breadbasket", name: "Goldenreach Plains", industry: "Agriculture", icon: Wheat, share: 0.12,
    path: "M 105 335 L 190 320 L 310 330 L 400 310 L 500 330 L 475 410 L 270 420 L 130 395 Z",
    labelX: 300, labelY: 370,
    sensitivity: { tariff: 0.2, minWage: -0.4, rate: -0.3, subsidyKey: "agriculture" } },
];

const SUBSIDY_OPTIONS = [
  { key: "none", label: "No Subsidy", description: "Let markets clear without intervention." },
  { key: "agriculture", label: "Agriculture", description: "Boost farm output. Helps the plains." },
  { key: "manufacturing", label: "Manufacturing", description: "Support industry. Helps Ironvale." },
  { key: "trade", label: "Export & Shipping", description: "Subsidize exporters. Helps the coast." },
  { key: "mining", label: "Mining & Energy", description: "Lower energy costs. Helps highlands." },
];

// ============ SCHEDULED MAJOR EVENTS ============

const SCHEDULED_EVENTS = {
  8: {
    id: "silverbank", title: "The Silverbank Run",
    warningHeadline: "Reports of deposit withdrawals at Silverbank in Meridian District",
    headline: "Silverbank collapses, panic spreads through the banking system",
    body: "A regional bank has failed and depositors are queuing at other institutions. Credit is freezing across the economy. Your response will shape whether this becomes a contained incident or a full banking crisis.",
    options: [
      { label: "Emergency bailout", blurb: "Restore confidence immediately. Debt rises.",
        effect: { debtAdd: 80, approvalDelta: 6, growthDrag: -0.005 },
        lesson: { title: "Lender of last resort",
          body: "When private banks face a liquidity crisis, a government bailout can halt a panic by guaranteeing deposits. The cost is moral hazard and higher public debt." } },
      { label: "Let the bank fail", blurb: "Market discipline. Contagion risk.",
        effect: { growthDrag: -0.015, unemploymentBump: 0.012, approvalDelta: -10 },
        lesson: { title: "Financial contagion",
          body: "Letting a bank fail punishes bad management but risks spreading panic through interconnected institutions. Investment contracts sharply as credit dries up." } },
      { label: "Nationalize the failed bank", blurb: "Radical. Long term structural fix.",
        effect: { debtAdd: 50, approvalDelta: -3, prodBump: 0.01 },
        lesson: { title: "Public ownership and stability",
          body: "Absorbing a failing bank into public hands prevents contagion while preserving credit. It trades short-term political cost for structural resilience." } },
    ],
  },
  15: {
    id: "great_recession", title: "The Great Recession",
    warningHeadline: "Global markets show severe stress, major downturn feared",
    headline: "Global recession. Aggregate demand collapses worldwide",
    body: "Trading partners are in free fall. Consumer confidence at home has evaporated and firms are canceling investment.",
    options: [
      { label: "Keynesian stimulus", blurb: "Deficit spend to cushion the blow.",
        effect: { spendBump: 0.05, taxBump: -0.02, approvalDelta: 4 },
        lesson: { title: "Keynesian countercyclical policy",
          body: "During a demand-driven recession, expansionary fiscal policy shifts AD rightward. The multiplier amplifies each dollar of spending." } },
      { label: "Austerity", blurb: "Protect the debt. Accept a deeper recession.",
        effect: { growthDrag: -0.025, unemploymentBump: 0.02, approvalDelta: -8 },
        lesson: { title: "Pro-cyclical austerity",
          body: "Cutting spending during a downturn deepens it by pulling AD further left. Debt ratios often worsen anyway." } },
      { label: "Aggressive rate cut", blurb: "Zero lower bound. Future inflation risk.",
        effect: { rateBump: -0.02, moneyBump: 0.03, approvalDelta: 2 },
        lesson: { title: "Monetary policy at the lower bound",
          body: "Slashing rates near zero can revive borrowing, but monetary policy loses traction when households refuse to spend regardless of rates." } },
    ],
  },
  22: {
    id: "energy_shock", title: "Global Energy Shock",
    warningHeadline: "OPEC-style cartel forming, oil futures spiking",
    headline: "Oil prices quadruple. Stagflation grips the economy",
    body: "A supply shock is driving costs through every sector. Inflation is accelerating even as output contracts.",
    options: [
      { label: "Sharp rate hike", blurb: "Volcker-style shock therapy.",
        effect: { rateBump: 0.025, growthDrag: -0.02, inflationBump: -0.015 },
        lesson: { title: "Volcker disinflation",
          body: "A central bank can break inflation expectations with aggressive tightening, but at the cost of a severe recession." } },
      { label: "Energy tax cut", blurb: "Ease consumer pain. Widen deficit.",
        effect: { taxBump: -0.03, inflationBump: 0.005, approvalDelta: 3 },
        lesson: { title: "Subsidizing through a supply shock",
          body: "Cutting taxes to offset higher energy costs supports AD but does not address the supply constraint." } },
      { label: "Impose price controls", blurb: "Populist. Create shortages.",
        effect: { inflationBump: -0.01, growthDrag: -0.01, approvalDelta: -2 },
        lesson: { title: "Price ceilings and shortages",
          body: "A price ceiling below the market clearing price creates persistent shortages. Inflation hides in queues." } },
    ],
  },
  30: {
    id: "debt_crisis", title: "Sovereign Debt Crisis",
    warningHeadline: "Bond spreads widening, international lenders nervous",
    headline: "Bond markets revolt, demanding punishing yields on new debt",
    body: "Investors no longer trust that Aurelia will service its debt. Every new bond issue costs more than the last.",
    options: [
      { label: "Harsh spending cuts", blurb: "Regain credibility. Social pain.",
        effect: { spendBump: -0.05, approvalDelta: -10, growthDrag: -0.015 },
        lesson: { title: "Fiscal credibility",
          body: "Bond markets punish perceived fiscal irresponsibility. Credible austerity can lower yields, but the output cost is often larger than expected." } },
      { label: "Debt restructuring", blurb: "Partial default. Reputation damaged.",
        effect: { debtAdd: -200, approvalDelta: -5, prodBump: -0.02 },
        lesson: { title: "Sovereign default",
          body: "Writing down debt provides immediate relief but locks a country out of capital markets for years." } },
      { label: "Accept foreign bailout", blurb: "Conditions attached. Sovereignty cost.",
        effect: { debtAdd: -100, approvalDelta: -6, taxBump: 0.03 },
        lesson: { title: "Conditional lending",
          body: "Institutions like the IMF provide emergency funds in exchange for austerity. The country gets liquidity but loses policy autonomy." } },
    ],
  },
  38: {
    id: "pandemic", title: "The Great Contagion",
    warningHeadline: "Health officials warn of spreading respiratory outbreak abroad",
    headline: "Pandemic forces economic shutdown",
    body: "A health emergency has forced large parts of the economy offline. This is both a supply shock and a demand shock.",
    options: [
      { label: "Massive emergency spending", blurb: "Pandemic-scale stimulus. Debt explosion.",
        effect: { spendBump: 0.08, rateBump: -0.015, debtAdd: 200, approvalDelta: 8 },
        lesson: { title: "Combined AD and AS shocks",
          body: "When AD and AS both shift leftward, output falls sharply. Massive fiscal support prevents demand collapse but leaves a long debt tail." } },
      { label: "Targeted wage subsidies", blurb: "Keep workers attached to firms.",
        effect: { spendBump: 0.03, unemploymentBump: -0.015, debtAdd: 80 },
        lesson: { title: "Preserving labor attachment",
          body: "Paying firms to retain workers prevents the scarring of mass unemployment. Recovery is faster when demand returns." } },
      { label: "Minimal intervention", blurb: "Let the market adjust. Brutal short run.",
        effect: { unemploymentBump: 0.04, growthDrag: -0.03, approvalDelta: -12 },
        lesson: { title: "Creative destruction vs scarring",
          body: "A hands-off response lets failed firms exit quickly, but mass unemployment creates permanent scars." } },
    ],
  },
  45: {
    id: "trade_war", title: "Trade War Escalation",
    warningHeadline: "Diplomatic tensions with major trade partners escalating",
    headline: "Partners impose retaliatory tariffs on Aurelian exports",
    body: "A cycle of tit-for-tat protectionism has broken out. Aurelian exporters are facing new barriers everywhere.",
    options: [
      { label: "Match their tariffs", blurb: "Escalate. Hurt your own consumers too.",
        effect: { tariffBump: 0.08, inflationBump: 0.01, growthDrag: -0.012 },
        lesson: { title: "Tariff retaliation spiral",
          body: "Reciprocal tariffs impose deadweight losses on both sides. Consumers pay more, trade volume shrinks." } },
      { label: "Negotiate an exit", blurb: "Diplomatic cost. Preserve trade volume.",
        effect: { approvalDelta: -6, tariffBump: -0.02, growthDrag: 0.008 },
        lesson: { title: "Gains from trade",
          body: "De-escalation preserves comparative advantage. Tearing trade apart destroys real income on both sides." } },
      { label: "Open unilaterally", blurb: "Bold. Punish own exporters short term.",
        effect: { tariffBump: -0.04, growthDrag: -0.006, prodBump: 0.015, approvalDelta: -4 },
        lesson: { title: "Unilateral free trade",
          body: "Dropping tariffs maximizes consumer welfare. Export sectors suffer in the short run, but productivity rises." } },
    ],
  },
};

// ============ RANDOM CRISES ============

const RANDOM_CRISES = [
  { headline: "Energy prices spike on regional instability",
    effect: { inflationBump: 0.018, growthDrag: -0.004 },
    lesson: { title: "Minor supply shock",
      body: "Input cost pressure shifts SRAS leftward. Output falls while prices rise." } },
  { headline: "Trade partner enters recession",
    effect: { growthDrag: -0.010, unemploymentBump: 0.005 },
    lesson: { title: "Net exports channel",
      body: "Foreign demand for exports falls, shifting AD leftward. The smaller and more open your economy, the bigger the hit." } },
  { headline: "Productivity surge in technology sector",
    effect: { growthDrag: 0.012, inflationBump: -0.005, prodBump: 0.015 },
    lesson: { title: "Positive supply shock",
      body: "A productivity jump shifts LRAS rightward. Output rises, inflation eases." } },
  { headline: "Currency speculators target the Aurelian mark",
    effect: { inflationBump: 0.01, growthDrag: -0.005 },
    lesson: { title: "Currency pressure",
      body: "Speculative pressure can force a central bank to hike rates to defend the currency." } },
  { headline: "Housing bubble concerns mount in Meridian",
    effect: { inflationBump: 0.008, approvalDelta: -3 },
    lesson: { title: "Asset price bubbles",
      body: "Rising asset prices can outpace fundamentals when credit is cheap. The unwind damages bank balance sheets." } },
  { headline: "Consumer confidence collapses on political uncertainty",
    effect: { growthDrag: -0.008, approvalDelta: -4 },
    lesson: { title: "Animal spirits",
      body: "Confidence shocks reduce consumption and investment even without changes in fundamentals." } },
  { headline: "Natural disaster devastates Goldenreach Plains",
    effect: { growthDrag: -0.007, inflationBump: 0.006 },
    lesson: { title: "Supply disruption",
      body: "A physical shock to productive capacity shifts SRAS leftward. Food prices rise, output falls." } },
  { headline: "Major resource discovery in Vaerholt Highlands",
    effect: { growthDrag: 0.008, prodBump: 0.01 },
    lesson: { title: "Terms of trade improvement",
      body: "A new resource export raises the value of what the country produces relative to what it imports." } },
  { headline: "Labor force demographics shift, retirements accelerate",
    effect: { growthDrag: -0.004, unemploymentBump: -0.008 },
    lesson: { title: "Labor supply contraction",
      body: "A shrinking labor force reduces measured unemployment while also reducing potential output." } },
  { headline: "Foreign direct investment surges into Ironvale",
    effect: { growthDrag: 0.006, prodBump: 0.008 },
    lesson: { title: "Capital account inflows",
      body: "Inbound investment raises the capital stock, boosting labor productivity." } },
  { headline: "Banking regulations tightened after stress tests",
    effect: { growthDrag: -0.005, prodBump: 0.005 },
    lesson: { title: "Regulatory tradeoffs",
      body: "Higher capital requirements reduce lending in the short run but make the financial system more resilient." } },
  { headline: "Major cyberattack disrupts payment systems",
    effect: { growthDrag: -0.008, prodBump: -0.005 },
    lesson: { title: "Infrastructure shocks",
      body: "Disruptions to critical systems reduce productive capacity. Modern economies depend on payment networks." } },
];

// ============ DECISION EVENTS ============

const DECISION_EVENTS = [
  { headline: "Dominant firm accused of monopoly pricing",
    body: "A single telecom has captured most of the market and is charging well above marginal cost.",
    options: [
      { label: "Break up the monopoly", blurb: "Short term disruption, long term welfare gain.",
        effect: { growthDrag: -0.006, approvalDelta: 4, prodBump: 0.005 },
        lesson: { title: "Deadweight loss of monopoly",
          body: "Monopolies restrict output to raise price, creating deadweight loss. Breaking them up restores consumer surplus." } },
      { label: "Leave the market alone", blurb: "Avoid disruption. Accept higher prices.",
        effect: { inflationBump: 0.004, approvalDelta: -3 },
        lesson: { title: "Allocative inefficiency",
          body: "Unregulated market power leads firms to price above marginal cost. Consumers pay more and the market produces less than the socially optimal quantity." } },
    ] },
  { headline: "Industrial runoff poisons a river",
    body: "Factories in Ironvale are dumping untreated waste. The social cost is mounting.",
    options: [
      { label: "Pigouvian tax on polluters", blurb: "Price the externality into production.",
        effect: { growthDrag: -0.004, approvalDelta: 3 },
        lesson: { title: "Pigouvian tax and externalities",
          body: "A tax equal to the marginal external cost forces producers to internalize the damage they cause." } },
      { label: "Ignore the issue", blurb: "Cheaper short term. Externalities accumulate.",
        effect: { approvalDelta: -5, prodBump: -0.008 },
        lesson: { title: "Market failure",
          body: "When externalities go unpriced, private decisions diverge from the socially optimal outcome." } },
    ] },
  { headline: "General strike threatens production",
    body: "Unions demand higher wages across Ironvale. Workers walk off the line.",
    options: [
      { label: "Raise the minimum wage", blurb: "Calm unrest. Risk unemployment.",
        effect: { minWageBump: 0.04, approvalDelta: 2 },
        lesson: { title: "Price floors in labor markets",
          body: "A minimum wage above equilibrium creates a labor surplus. Those still employed earn more, but firms hire fewer." } },
      { label: "Hold the line", blurb: "Protect employment. Accept unrest.",
        effect: { approvalDelta: -4, growthDrag: -0.004 },
        lesson: { title: "Labor market frictions",
          body: "Refusing wage concessions can preserve employment but cause disruption. Strikes reduce output." } },
    ] },
  { headline: "Immigration reform on the table",
    body: "Labor shortages in the frontier and plains are slowing output.",
    options: [
      { label: "Open immigration", blurb: "Boost labor supply. Political cost.",
        effect: { growthDrag: 0.008, prodBump: 0.01, approvalDelta: -5 },
        lesson: { title: "Labor supply shifts",
          body: "Expanding the labor force raises potential output and can lower wage pressure." } },
      { label: "Maintain current quotas", blurb: "Political safety. Constrained growth.",
        effect: { approvalDelta: 3, growthDrag: -0.002 },
        lesson: { title: "Factor constraints on potential GDP",
          body: "Potential output is bounded by labor, capital, and technology." } },
    ] },
  { headline: "Proposal for mass infrastructure investment",
    body: "A ten-year public works program would modernize rail and ports across Aurelia.",
    options: [
      { label: "Approve the program", blurb: "Deficit now, productivity later.",
        effect: { spendBump: 0.02, prodBump: 0.02, debtAdd: 100 },
        lesson: { title: "Public capital and growth",
          body: "Infrastructure spending raises the productive capacity of the economy." } },
      { label: "Reject the proposal", blurb: "Fiscal discipline. Lost opportunity.",
        effect: { approvalDelta: -2 },
        lesson: { title: "Opportunity cost of austerity",
          body: "Declining to invest during low rate periods has a long-run cost." } },
    ] },
  { headline: "Central bank independence challenged",
    body: "Politicians want more control over interest rate decisions.",
    options: [
      { label: "Defend independence", blurb: "Credible policy. Political friction.",
        effect: { inflationBump: -0.005, approvalDelta: -4 },
        lesson: { title: "Central bank credibility",
          body: "Independent central banks tend to produce lower and more stable inflation." } },
      { label: "Allow political oversight", blurb: "Populist. Inflation risk.",
        effect: { inflationBump: 0.015, approvalDelta: 5 },
        lesson: { title: "Time inconsistency",
          body: "A central bank under political control tends to accommodate inflation to boost short-run employment." } },
    ] },
  { headline: "Wealth tax proposal in parliament",
    body: "A new levy on large fortunes would fund social programs but may drive capital abroad.",
    options: [
      { label: "Implement the tax", blurb: "Raise revenue. Capital flight risk.",
        effect: { taxBump: 0.02, growthDrag: -0.005, approvalDelta: 4 },
        lesson: { title: "Tax incidence on mobile factors",
          body: "Taxing mobile capital often produces less revenue than expected, because capital relocates." } },
      { label: "Reject the tax", blurb: "Keep capital. Inequality grows.",
        effect: { approvalDelta: -3 },
        lesson: { title: "Equity-efficiency tradeoff",
          body: "More progressive taxation reduces inequality but may dampen the incentive to save and invest." } },
    ] },
  { headline: "Rent control demands in Meridian",
    body: "Housing costs have become unaffordable. Activists demand caps on rent increases.",
    options: [
      { label: "Impose rent controls", blurb: "Political win. Housing shortage.",
        effect: { approvalDelta: 6, growthDrag: -0.004, inflationBump: -0.003 },
        lesson: { title: "Price ceilings in housing",
          body: "Rent controls below market rate create persistent shortages and reduce new construction." } },
      { label: "Reject controls, subsidize construction", blurb: "Market-oriented. Slower relief.",
        effect: { spendBump: 0.01, prodBump: 0.005, approvalDelta: -2 },
        lesson: { title: "Supply-side housing policy",
          body: "Subsidizing construction addresses shortages by expanding supply." } },
    ] },
];

// ============ HELPERS ============

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmtPct = (v, d = 1) => `${(v * 100).toFixed(d)}%`;
const fmtMoney = (v) => `$${v.toFixed(0)}B`;

function getInitialState(difficulty) {
  const d = DIFFICULTIES[difficulty];
  return {
    difficulty, turn: 0, year: 2026, quarter: 1,
    gdp: 1000, gdpGrowth: 0.025, unemployment: 0.05, inflation: 0.02,
    interestRate: 0.03, moneyGrowth: 0.03, taxRate: 0.25, govSpendingRate: 0.2,
    tariff: 0.03, minWage: 0.42, subsidy: "none", productivity: 1.0,
    debt: d.startingDebt, approval: d.startingApproval,
    inTargetStreak: 0, bestStreak: 0,
    gameOver: false, victory: false,
    lastEvent: null, pendingEvent: null, upcomingWarning: null,
  };
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

function getScheduledForTurn(turn) { return SCHEDULED_EVENTS[turn] || null; }

function getUpcomingScheduled(turn) {
  for (let t = turn + 1; t <= turn + 3; t++) {
    if (SCHEDULED_EVENTS[t]) return { event: SCHEDULED_EVENTS[t], turnsAway: t - turn };
  }
  return null;
}

function buildLessons(prev, next, policies, crisis) {
  const lessons = [];
  const taxDelta = policies.taxRate - prev.taxRate;
  const spendDelta = policies.govSpendingRate - prev.govSpendingRate;
  const rateDelta = policies.interestRate - prev.interestRate;
  if (crisis) lessons.push(crisis.lesson);
  if (next.unemployment < 0.03 && next.inflation > 0.035)
    lessons.push({ title: "Phillips curve in action",
      body: "Unemployment below the natural rate accelerates inflation. Pushing unemployment ever lower eventually lights up the inflation dial." });
  if (next.inflation > 0.06)
    lessons.push({ title: "Runaway inflation",
      body: "Inflation above 6 percent risks unanchoring expectations. Sustained rate hikes reduce aggregate demand, cooling prices but slowing growth." });
  if (next.unemployment > 0.08 && rateDelta > 0)
    lessons.push({ title: "Contractionary policy in a slump",
      body: "Raising rates while unemployment is already elevated is contractionary on top of contraction." });
  if (taxDelta > 0.02 && next.gdpGrowth < 0.01)
    lessons.push({ title: "Fiscal drag",
      body: "Sharp tax hikes pull spending power out of households. Consumption and investment both slip." });
  if (spendDelta > 0.03 && next.inflation > 0.04)
    lessons.push({ title: "Crowding out and overheating",
      body: "Government spending near full capacity mainly lifts prices rather than output." });
  if (policies.tariff > 0.15)
    lessons.push({ title: "Deadweight loss of tariffs",
      body: "High tariffs raise domestic prices and shrink trade volume. Lost consumer surplus exceeds producer gains plus revenue." });
  if (next.debt / next.gdp > 1.2)
    lessons.push({ title: "Debt to GDP in the danger zone",
      body: "When debt outruns output, interest payments eat a growing share of revenue." });
  if (policies.minWage > 0.55)
    lessons.push({ title: "Minimum wage as a price floor",
      body: "A wage floor above the market clearing level creates a labor surplus." });
  if (policies.moneyGrowth > 0.07 && next.inflation > 0.04)
    lessons.push({ title: "Quantity theory of money",
      body: "MV = PY: when the money stock expands faster than real output, prices absorb the gap." });
  if (rateDelta < -0.01 && next.inflation > 0.04)
    lessons.push({ title: "Loose money meets hot economy",
      body: "Cutting rates when inflation is already elevated pours fuel on the fire." });
  return lessons.slice(0, 2);
}

function simulate(state, policies) {
  const d = DIFFICULTIES[state.difficulty];
  const scheduled = getScheduledForTurn(state.turn + 1);
  const crisis = scheduled ? null : rollRandomCrisis(state);

  const taxDelta = policies.taxRate - state.taxRate;
  const spendDelta = policies.govSpendingRate - state.govSpendingRate;
  const rateDelta = policies.interestRate - state.interestRate;

  const fiscalEffect = spendDelta * 1.8 - taxDelta * 1.4;
  const monetaryEffect = -rateDelta * 2.2;
  const tariffDrag = -policies.tariff * 0.25;
  const minWageDrag = -Math.max(0, policies.minWage - 0.45) * 0.4;
  const subsidyBoost = policies.subsidy !== "none" ? 0.004 : 0;
  const moneyBoost = (policies.moneyGrowth - 0.03) * 0.3;
  const confidence = (state.approval - 50) / 800;
  const shock = (Math.random() - 0.5) * d.drift * 2;
  const crisisGrowth = crisis?.effect.growthDrag ?? 0;
  const revert = 0.55 * d.trend + 0.4 * state.gdpGrowth;

  let growth = revert + fiscalEffect + monetaryEffect + tariffDrag + minWageDrag +
    subsidyBoost + moneyBoost + confidence + shock + crisisGrowth;
  growth = clamp(growth, -0.08, 0.10);

  const productivity = clamp(state.productivity + (crisis?.effect.prodBump ?? 0), 0.80, 1.30);
  const newGdp = state.gdp * (1 + growth / 4) * (productivity / state.productivity);

  const natural = 0.045;
  let unemp = state.unemployment - 0.45 * (growth - d.trend) +
    Math.max(0, policies.minWage - 0.45) * 0.12 +
    (crisis?.effect.unemploymentBump ?? 0);
  unemp = clamp(unemp, 0.018, 0.24);

  const phillips = -0.35 * (unemp - natural);
  const tariffInflation = policies.tariff * 0.25;
  const rateDamping = (policies.interestRate - 0.03) * -0.6;
  const moneyInflation = (policies.moneyGrowth - 0.03) * 0.4;
  const subsidyInflation = policies.subsidy !== "none" ? 0.003 : 0;
  const baselineCreep = d.drift * 0.5;
  const inflationBump = crisis?.effect.inflationBump ?? 0;
  let inflation = 0.55 * state.inflation + 0.02 + phillips + tariffInflation +
    rateDamping + moneyInflation + subsidyInflation + baselineCreep + inflationBump;
  inflation = clamp(inflation, -0.03, 0.25);

  const subsidyCost = policies.subsidy !== "none" ? 0.01 * newGdp : 0;
  const deficit = (policies.govSpendingRate - policies.taxRate) * newGdp + subsidyCost;
  const debt = state.debt * (1 + policies.interestRate / 4) + deficit / 4;

  const unempPenalty = Math.max(0, (unemp - 0.05) * 400);
  const inflationPenalty = Math.max(0, Math.abs(inflation - 0.02) * 250);
  const growthBonus = growth * 250;
  const taxPenalty = Math.max(0, (policies.taxRate - 0.3) * 180);
  let approval = state.approval + growthBonus - unempPenalty - inflationPenalty - taxPenalty + (Math.random() - 0.5) * 2;
  approval = clamp(approval, 0, 100);

  const targets = getTargets(state.difficulty);
  const hitsTargets =
    growth >= targets.growth.min && growth <= targets.growth.max &&
    unemp >= targets.unemployment.min && unemp <= targets.unemployment.max &&
    inflation >= targets.inflation.min && inflation <= targets.inflation.max;
  const inTargetStreak = hitsTargets ? state.inTargetStreak + 1 : 0;
  const bestStreak = Math.max(state.bestStreak, inTargetStreak);

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
    upcomingWarning,
  };
  const lessons = buildLessons(state, next, policies, crisis);
  if (scheduled) {
    next.pendingEvent = { ...scheduled, isMajor: true };
  } else {
    const decision = rollDecisionEvent(next);
    if (decision) next.pendingEvent = { ...decision, isMajor: false };
  }
  return { next, lessons, crisis, scheduled, warningTriggered: upcomingWarning && upcomingWarning.turnsAway === 3 };
}

// ============ UI PRIMITIVES ============

function StatPill({ icon: Icon, label, value, inTarget }) {
  const tone = inTarget === true ? "text-emerald-300" : inTarget === false ? "text-rose-300" : "text-amber-100";
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border border-amber-900/40 bg-stone-900/60 rounded-sm">
      <Icon size={13} className="text-amber-200/70" strokeWidth={1.8} />
      <div className="flex flex-col leading-tight">
        <span className="text-[9px] uppercase tracking-[0.18em] text-amber-200/50">{label}</span>
        <span className={`font-[Fraunces] text-[15px] ${tone}`}>{value}</span>
      </div>
    </div>
  );
}

function MinistryButton({ icon: Icon, label, onClick, active, alert }) {
  return (
    <button onClick={onClick}
      className={`group relative px-4 py-3 border flex flex-col items-center gap-1 min-w-[110px] transition-all ${
        active ? "border-amber-400 bg-amber-950/60"
        : "border-amber-900/40 bg-stone-900/70 hover:border-amber-500/70 hover:bg-stone-900"
      }`}>
      <Icon size={18} className="text-amber-200" strokeWidth={1.6} />
      <span className="text-[10px] uppercase tracking-[0.18em] text-amber-100/90">{label}</span>
      {alert && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />}
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
        onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-stone-800" />
      <div className="text-[10.5px] mt-1 leading-snug italic" style={{ color: "#78716c" }}>{desc}</div>
    </div>
  );
}

function PanelFrame({ title, subtitle, onClose, children, wide, hideClose, tone }) {
  const headerBg = tone === "major" ? "#2a1810" : "#ebe0c4";
  const headerFg = tone ? "#f2ead7" : "#1c1917";
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(8, 10, 14, 0.85)", backdropFilter: "blur(4px)" }}>
      <div className={`${wide ? "max-w-[920px]" : "max-w-[620px]"} w-full border-2 border-amber-900/60 shadow-2xl relative`}
        style={{ backgroundColor: "#f2ead7", boxShadow: "0 0 0 1px #c9a961, 0 20px 50px rgba(0,0,0,0.7)", color: "#1c1917" }}>
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-amber-900/40"
          style={{ backgroundColor: headerBg, color: headerFg }}>
          <div>
            <div className="font-[Fraunces] text-[22px] tracking-tight" style={{ color: headerFg }}>{title}</div>
            {subtitle && <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: tone ? "#c9a961" : "#57534e" }}>{subtitle}</div>}
          </div>
          {!hideClose && <button onClick={onClose} style={{ color: tone ? "#c9a961" : "#57534e" }} className="hover:opacity-70"><X size={18} /></button>}
        </div>
        <div className="p-5" style={{ color: "#292524" }}>{children}</div>
      </div>
    </div>
  );
}

// ============ COUNTRY MAP ============

function CountryMap({ state, onSelectRegion, selectedRegion }) {
  const regionalStatus = useMemo(() => {
    const map = {};
    for (const r of REGIONS) {
      const rateEffect = r.sensitivity.rate * (state.interestRate - 0.03);
      const tariffEffect = r.sensitivity.tariff * state.tariff;
      const minWageEffect = r.sensitivity.minWage * Math.max(0, state.minWage - 0.45);
      const subsidy = state.subsidy === r.sensitivity.subsidyKey ? 0.03 : 0;
      const base = state.gdpGrowth - 0.025;
      map[r.id] = base + rateEffect + tariffEffect + minWageEffect + subsidy;
    }
    return map;
  }, [state]);

  const colorFor = (delta) => {
    if (delta > 0.02) return "#6b7e4e";
    if (delta > 0.005) return "#9b8c5c";
    if (delta > -0.01) return "#8a7a62";
    if (delta > -0.025) return "#8a5d42";
    return "#6f3a2e";
  };

  return (
    <svg viewBox="0 0 640 450" className="w-full h-full block">
      <defs>
        <pattern id="paper" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#e8dcc0" />
          <circle cx="1" cy="1" r="0.3" fill="#c9b890" opacity="0.4" />
        </pattern>
        <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
          <stop offset="60%" stopColor="transparent" />
          <stop offset="100%" stopColor="#1a1510" stopOpacity="0.45" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="640" height="450" fill="#22303c" />
      <g stroke="#3a4a58" strokeWidth="0.5" fill="none" opacity="0.6">
        <path d="M 0 80 Q 320 100 640 80" />
        <path d="M 0 380 Q 320 400 640 380" />
      </g>
      <g>
        {REGIONS.map((r) => {
          const delta = regionalStatus[r.id];
          const fill = colorFor(delta);
          const isSel = selectedRegion === r.id;
          return (
            <path key={r.id} d={r.path} fill={fill}
              stroke={isSel ? "#1a1510" : "#2a2117"} strokeWidth={isSel ? "2.5" : "1.2"}
              onClick={() => onSelectRegion(r.id)}
              onMouseEnter={(e) => e.currentTarget.setAttribute("fill-opacity", "0.85")}
              onMouseLeave={(e) => e.currentTarget.setAttribute("fill-opacity", "1")}
              className="cursor-pointer transition-all" />
          );
        })}
        <g opacity="0.14" style={{ pointerEvents: "none" }}>
          {REGIONS.map((r) => <path key={`p-${r.id}`} d={r.path} fill="url(#paper)" />)}
        </g>
      </g>
      <g style={{ pointerEvents: "none" }}>
        {REGIONS.map((r) => (
          <g key={`l-${r.id}`} transform={`translate(${r.labelX} ${r.labelY})`}>
            <text textAnchor="middle" fontFamily="Fraunces, serif" fontSize="11" fontStyle="italic" fill="#1a1510" opacity="0.85">{r.name}</text>
            <text textAnchor="middle" y="12" fontFamily="IBM Plex Sans, sans-serif" fontSize="8" fill="#3a2f1f" opacity="0.6" letterSpacing="1">{r.industry.toUpperCase()}</text>
          </g>
        ))}
      </g>
      <g transform="translate(560 380)" opacity="0.75">
        <circle r="22" fill="none" stroke="#c9a961" strokeWidth="0.8" />
        <path d="M 0 -18 L 3 0 L 0 18 L -3 0 Z" fill="#c9a961" />
        <path d="M -18 0 L 0 3 L 18 0 L 0 -3 Z" fill="#c9a961" opacity="0.6" />
        <text y="-24" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="8" fill="#c9a961">N</text>
      </g>
      <rect x="0" y="0" width="640" height="450" fill="url(#vignette)" style={{ pointerEvents: "none" }} />
      <g transform="translate(30 30)" style={{ pointerEvents: "none" }}>
        <text fontFamily="Fraunces, serif" fontSize="14" fontStyle="italic" fill="#c9a961" opacity="0.8">Domains of the</text>
        <text y="18" fontFamily="Fraunces, serif" fontSize="22" fill="#e8dcc0" letterSpacing="2">REPUBLIC OF AURELIA</text>
      </g>
    </svg>
  );
}

// ============ MAIN MENU BACKDROP ============

function MenuBackdrop() {
  return (
    <svg viewBox="0 0 1440 900" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1f2e" />
          <stop offset="50%" stopColor="#2a2418" />
          <stop offset="100%" stopColor="#3a2a1a" />
        </linearGradient>
        <linearGradient id="smoke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a3a28" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#4a3a28" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e8a85c" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#e8a85c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="1440" height="900" fill="url(#sky)" />
      <circle cx="1080" cy="340" r="220" fill="url(#sun)" />
      <circle cx="1080" cy="340" r="55" fill="#e8a85c" opacity="0.45" />
      <path d="M 0 520 L 120 440 L 260 500 L 380 420 L 520 480 L 680 410 L 820 470 L 980 430 L 1120 480 L 1280 440 L 1440 490 L 1440 900 L 0 900 Z"
        fill="#2a2418" opacity="0.8" />
      <path d="M 0 620 L 150 560 L 320 600 L 480 550 L 640 610 L 800 570 L 960 620 L 1120 580 L 1280 615 L 1440 580 L 1440 900 L 0 900 Z"
        fill="#1e1a14" opacity="0.9" />
      <g fill="#0f0c08" opacity="0.95">
        <rect x="80" y="580" width="60" height="120" />
        <rect x="150" y="560" width="20" height="140" />
        <rect x="180" y="600" width="50" height="100" />
        <rect x="240" y="570" width="18" height="130" />
        <rect x="280" y="590" width="70" height="110" />
        <rect x="370" y="550" width="25" height="150" />
        <rect x="410" y="580" width="80" height="120" />
        <rect x="510" y="600" width="40" height="100" />
        <rect x="570" y="575" width="22" height="125" />
        <rect x="610" y="585" width="90" height="115" />
        <rect x="720" y="560" width="28" height="140" />
      </g>
      <g opacity="0.5">
        <ellipse cx="160" cy="500" rx="40" ry="80" fill="url(#smoke)" />
        <ellipse cx="250" cy="490" rx="35" ry="70" fill="url(#smoke)" />
        <ellipse cx="380" cy="470" rx="45" ry="90" fill="url(#smoke)" />
        <ellipse cx="580" cy="485" rx="40" ry="75" fill="url(#smoke)" />
        <ellipse cx="730" cy="470" rx="42" ry="85" fill="url(#smoke)" />
      </g>
      <rect x="0" y="0" width="1440" height="900" fill="#0f0c08" opacity="0.45" />
    </svg>
  );
}

// ============ SCREENS ============

function MainMenu({ onStart, onHow }) {
  return (
    <div className="fixed inset-0 bg-[#0f0c08] overflow-hidden">
      <MenuBackdrop />
      <div className="relative z-10 h-full flex flex-col items-center justify-center">
        <div className="text-center mb-14">
          <div className="text-[11px] uppercase tracking-[0.5em] mb-3" style={{ color: "#c9a961" }}>An Economic Chronicle</div>
          <h1 className="font-[Fraunces] text-[110px] leading-none tracking-[0.02em] mb-2" style={{ color: "#f2ead7", textShadow: "0 2px 30px rgba(201, 169, 97, 0.3)" }}>AURELIA</h1>
          <div className="w-32 h-px mx-auto mb-4" style={{ background: "linear-gradient(to right, transparent, #c9a961, transparent)" }} />
          <div className="text-[13px] tracking-[0.2em] italic" style={{ color: "#a89068" }}>A simulation for AP Micro and Macroeconomics</div>
        </div>
        <div className="flex flex-col gap-3 w-[280px]">
          <button onClick={onStart}
            className="group border-2 border-amber-600/60 bg-stone-950/60 hover:bg-amber-950/60 hover:border-amber-400 py-4 transition-all">
            <div className="flex items-center justify-center gap-3">
              <Crown size={16} style={{ color: "#c9a961" }} />
              <span className="font-[Fraunces] text-[17px] tracking-[0.2em] uppercase" style={{ color: "#f2ead7" }}>New Campaign</span>
              <ChevronRight size={14} style={{ color: "#c9a961" }} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
          <button onClick={onHow}
            className="border border-amber-900/40 bg-stone-950/40 hover:bg-stone-900/60 py-3 transition-all">
            <div className="flex items-center justify-center gap-3">
              <BookOpen size={13} style={{ color: "#a89068" }} />
              <span className="font-[Fraunces] text-[14px] tracking-[0.2em] uppercase" style={{ color: "#d4c090" }}>How to Play</span>
            </div>
          </button>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.3em] uppercase" style={{ color: "#6a5840" }}>
          Version 0.3 &middot; A prototype
        </div>
      </div>
    </div>
  );
}

function DifficultySelect({ onSelect, onBack }) {
  return (
    <div className="fixed inset-0 bg-[#0f0c08] overflow-hidden">
      <MenuBackdrop />
      <div className="relative z-10 h-full flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <div className="text-[11px] uppercase tracking-[0.4em] mb-2" style={{ color: "#c9a961" }}>Choose Your Mandate</div>
          <h2 className="font-[Fraunces] text-[38px]" style={{ color: "#f2ead7" }}>Difficulty</h2>
        </div>
        <div className="grid grid-cols-4 gap-4 max-w-[1100px] w-full">
          {Object.values(DIFFICULTIES).map((d) => {
            const Icon = d.icon;
            return (
              <button key={d.key} onClick={() => onSelect(d.key)}
                className="group text-left border-2 p-5 bg-stone-950/70 hover:bg-stone-900 transition-all"
                style={{ borderColor: `${d.color}55` }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = d.color}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = `${d.color}55`}>
                <Icon size={28} style={{ color: d.color }} strokeWidth={1.5} className="mb-3" />
                <div className="font-[Fraunces] text-[22px] mb-1" style={{ color: "#f2ead7" }}>{d.name}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] italic mb-3" style={{ color: d.color }}>{d.tagline}</div>
                <div className="text-[11.5px] leading-snug mb-4" style={{ color: "#d4c090" }}>{d.description}</div>
                <div className="pt-3 border-t" style={{ borderColor: "#3a2f1f" }}>
                  <div className="text-[10px] space-y-0.5" style={{ color: "#a89068" }}>
                    <div className="flex justify-between"><span>Win streak:</span><span className="font-[Fraunces]" style={{ color: "#f2ead7" }}>{d.winStreak} quarters</span></div>
                    <div className="flex justify-between"><span>Starting debt:</span><span className="font-[Fraunces]" style={{ color: "#f2ead7" }}>${d.startingDebt}B</span></div>
                    <div className="flex justify-between"><span>Starting approval:</span><span className="font-[Fraunces]" style={{ color: "#f2ead7" }}>{d.startingApproval}%</span></div>
                    <div className="flex justify-between"><span>Target width:</span><span className="font-[Fraunces]" style={{ color: "#f2ead7" }}>{d.bandMultiplier < 1 ? "Narrow" : d.bandMultiplier > 1 ? "Wide" : "Standard"}</span></div>
                    <div className="flex justify-between"><span>Crisis frequency:</span><span className="font-[Fraunces]" style={{ color: "#f2ead7" }}>{(d.crisisChance * 100).toFixed(0)}%</span></div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={onBack} className="mt-6 text-[11px] uppercase tracking-[0.2em] hover:opacity-100" style={{ color: "#a89068" }}>
          &larr; Back to menu
        </button>
      </div>
    </div>
  );
}

function Briefing({ difficulty, onBegin, onBack }) {
  const d = DIFFICULTIES[difficulty];
  const targets = getTargets(difficulty);
  const majorEvents = Object.entries(SCHEDULED_EVENTS).slice(0, 6);
  return (
    <div className="fixed inset-0 bg-[#0f0c08] overflow-y-auto">
      <MenuBackdrop />
      <div className="relative z-10 min-h-full flex items-center justify-center p-6">
        <div className="max-w-[780px] w-full bg-stone-950/80 border-2 p-8" style={{ borderColor: d.color }}>
          <div className="text-[11px] uppercase tracking-[0.4em] mb-2" style={{ color: d.color }}>Your Mandate</div>
          <h2 className="font-[Fraunces] text-[38px] mb-1" style={{ color: "#f2ead7" }}>Minister of the Economy</h2>
          <div className="text-[13px] italic mb-6" style={{ color: "#a89068" }}>Difficulty: {d.name}</div>
          <div className="space-y-4 text-[13px] leading-relaxed" style={{ color: "#d4c090" }}>
            <p>The Republic of Aurelia has appointed you chief economic advisor. The parliament and the people expect results within measurable targets, sustained over time.</p>
            <div className="border-l-2 pl-4 my-5" style={{ borderColor: d.color }}>
              <div className="font-[Fraunces] text-[16px] mb-2" style={{ color: "#f2ead7" }}>Primary Objective</div>
              <div className="text-[12.5px]">Keep all three indicators within their target bands for <span className="font-[Fraunces] text-[15px]" style={{ color: d.color }}>{d.winStreak} consecutive quarters</span>.</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                <div className="border p-2" style={{ borderColor: "#3a2f1f" }}>
                  <div className="uppercase tracking-[0.16em] text-[9px]" style={{ color: "#a89068" }}>GDP Growth</div>
                  <div className="font-[Fraunces] text-[14px]" style={{ color: "#f2ead7" }}>{fmtPct(targets.growth.min, 1)} to {fmtPct(targets.growth.max, 1)}</div>
                </div>
                <div className="border p-2" style={{ borderColor: "#3a2f1f" }}>
                  <div className="uppercase tracking-[0.16em] text-[9px]" style={{ color: "#a89068" }}>Unemployment</div>
                  <div className="font-[Fraunces] text-[14px]" style={{ color: "#f2ead7" }}>{fmtPct(targets.unemployment.min, 1)} to {fmtPct(targets.unemployment.max, 1)}</div>
                </div>
                <div className="border p-2" style={{ borderColor: "#3a2f1f" }}>
                  <div className="uppercase tracking-[0.16em] text-[9px]" style={{ color: "#a89068" }}>Inflation</div>
                  <div className="font-[Fraunces] text-[14px]" style={{ color: "#f2ead7" }}>{fmtPct(targets.inflation.min, 1)} to {fmtPct(targets.inflation.max, 1)}</div>
                </div>
              </div>
            </div>
            <div className="border-l-2 pl-4 my-5" style={{ borderColor: "#8b2d2d" }}>
              <div className="font-[Fraunces] text-[16px] mb-2" style={{ color: "#f2ead7" }}>Failure Conditions</div>
              <div className="text-[12px] space-y-0.5">
                <div>&middot; Public approval falls below 5 percent</div>
                <div>&middot; Unemployment exceeds 18 percent</div>
                <div>&middot; Inflation exceeds 18 percent</div>
                <div>&middot; Debt exceeds 200 percent of GDP</div>
              </div>
            </div>
            <div className="border-l-2 pl-4 my-5" style={{ borderColor: "#a89068" }}>
              <div className="font-[Fraunces] text-[16px] mb-2" style={{ color: "#f2ead7" }}>Forecast of Major Events</div>
              <div className="text-[12px] mb-2 italic" style={{ color: "#a89068" }}>Intelligence analysts project the following crises during your tenure. Prepare accordingly.</div>
              <div className="space-y-1.5">
                {majorEvents.map(([turn, ev]) => (
                  <div key={turn} className="flex items-center gap-3 text-[12px]">
                    <div className="w-14 font-[Fraunces] text-right" style={{ color: d.color }}>Turn {turn}</div>
                    <div className="w-px h-4" style={{ backgroundColor: "#3a2f1f" }} />
                    <div style={{ color: "#f2ead7" }}>{ev.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-8 pt-5 border-t" style={{ borderColor: "#3a2f1f" }}>
            <button onClick={onBack} className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "#a89068" }}>&larr; Change difficulty</button>
            <button onClick={onBegin}
              className="group px-8 py-3 border-2 hover:bg-amber-950/60 transition-all flex items-center gap-3"
              style={{ borderColor: d.color, color: "#f2ead7" }}>
              <span className="font-[Fraunces] text-[14px] tracking-[0.22em] uppercase">Accept the Mandate</span>
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
      <div className="relative z-10 min-h-full flex items-center justify-center p-6">
        <div className="max-w-[720px] w-full bg-stone-950/80 border-2 border-amber-900/60 p-8">
          <div className="text-[11px] uppercase tracking-[0.4em] mb-2" style={{ color: "#c9a961" }}>A Primer</div>
          <h2 className="font-[Fraunces] text-[36px] mb-5" style={{ color: "#f2ead7" }}>How to Play</h2>
          <div className="space-y-3 text-[13px] leading-relaxed" style={{ color: "#d4c090" }}>
            <p>Each turn represents one quarter. You adjust policy levers, advance time, and watch the economy respond.</p>
            <p><span className="font-[Fraunces]" style={{ color: "#c9a961" }}>The ministries</span> at the bottom of the screen hold your tools. Treasury sets fiscal policy. Central Bank controls monetary policy. Trade handles tariffs. Industry manages minimum wage and subsidies. Records shows your time series.</p>
            <p><span className="font-[Fraunces]" style={{ color: "#c9a961" }}>The map</span> shades each region according to how well your policies serve it. Saltmere hates tariffs. Ironvale loves low rates. Meridian lives and dies by credit.</p>
            <p><span className="font-[Fraunces]" style={{ color: "#c9a961" }}>Crises and decisions</span> arrive throughout the game. Random shocks appear without warning. Major scheduled crises are forecast to you three turns in advance, so prepare the ground before they hit.</p>
            <p><span className="font-[Fraunces]" style={{ color: "#c9a961" }}>The journal</span> on the right records every event and teaches the underlying economic concept when your choices trigger a textbook outcome.</p>
            <p>Victory is sustained competence across many quarters, not a single good turn.</p>
          </div>
          <button onClick={onBack} className="mt-6 text-[11px] uppercase tracking-[0.2em]" style={{ color: "#a89068" }}>&larr; Back to menu</button>
        </div>
      </div>
    </div>
  );
}

function EndScreen({ victory, state, onMenu, onReplay }) {
  const d = DIFFICULTIES[state.difficulty];
  return (
    <div className="fixed inset-0 bg-[#0f0c08] overflow-hidden">
      <MenuBackdrop />
      <div className="relative z-10 h-full flex items-center justify-center p-6">
        <div className="max-w-[620px] w-full bg-stone-950/85 border-2 p-10 text-center"
          style={{ borderColor: victory ? "#6b7e4e" : "#8b2d2d" }}>
          {victory ? <Star size={48} style={{ color: "#c9a961" }} strokeWidth={1.5} className="mx-auto mb-4" />
                   : <Skull size={48} style={{ color: "#8b2d2d" }} strokeWidth={1.5} className="mx-auto mb-4" />}
          <div className="text-[11px] uppercase tracking-[0.4em] mb-2" style={{ color: victory ? "#6b7e4e" : "#8b2d2d" }}>
            {victory ? "Legacy Secured" : "The Nation Falls"}
          </div>
          <h1 className="font-[Fraunces] text-[46px] mb-4" style={{ color: "#f2ead7" }}>{victory ? "Victory" : "Collapse"}</h1>
          <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: "#d4c090" }}>
            {victory
              ? `You have steered Aurelia through ${state.turn} quarters on the ${d.name} difficulty, sustaining textbook performance when it mattered. History will remember this stewardship.`
              : `The economy of Aurelia has collapsed after ${state.turn} quarters on the ${d.name} difficulty. Study the journal, adjust your approach, and try again.`}
          </p>
          <div className="grid grid-cols-3 gap-3 mb-6 text-center">
            <div className="border p-2" style={{ borderColor: "#3a2f1f" }}>
              <div className="uppercase tracking-[0.16em] text-[9px]" style={{ color: "#a89068" }}>Final GDP</div>
              <div className="font-[Fraunces] text-[16px]" style={{ color: "#f2ead7" }}>{fmtMoney(state.gdp)}</div>
            </div>
            <div className="border p-2" style={{ borderColor: "#3a2f1f" }}>
              <div className="uppercase tracking-[0.16em] text-[9px]" style={{ color: "#a89068" }}>Best streak</div>
              <div className="font-[Fraunces] text-[16px]" style={{ color: "#f2ead7" }}>{state.bestStreak}</div>
            </div>
            <div className="border p-2" style={{ borderColor: "#3a2f1f" }}>
              <div className="uppercase tracking-[0.16em] text-[9px]" style={{ color: "#a89068" }}>Approval</div>
              <div className="font-[Fraunces] text-[16px]" style={{ color: "#f2ead7" }}>{state.approval.toFixed(0)}%</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button onClick={onReplay}
              className="px-5 py-2.5 border hover:bg-amber-950/60 transition-all text-[12px] uppercase tracking-[0.22em]"
              style={{ borderColor: "#c9a961", color: "#f2ead7" }}>Play Again</button>
            <button onClick={onMenu}
              className="px-5 py-2.5 border hover:bg-stone-900 transition-all text-[12px] uppercase tracking-[0.22em]"
              style={{ borderColor: "#3a2f1f", color: "#a89068" }}>Main Menu</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ GAME SCREEN ============

function GameScreen({ initialDifficulty, onExit }) {
  const [state, setState] = useState(getInitialState(initialDifficulty));
  const [policies, setPolicies] = useState({
    taxRate: state.taxRate, govSpendingRate: state.govSpendingRate,
    interestRate: state.interestRate, moneyGrowth: state.moneyGrowth,
    tariff: state.tariff, minWage: state.minWage, subsidy: state.subsidy,
  });
  const [history, setHistory] = useState([{ t: 0, label: "Q1 '26", gdpGrowth: 2.5, unemployment: 5.0, inflation: 2.0 }]);
  const [log, setLog] = useState([
    { type: "system", text: `Your mandate begins. Steer Aurelia through ${DIFFICULTIES[initialDifficulty].winStreak} consecutive quarters in target to secure your legacy.` },
  ]);
  const [activePanel, setActivePanel] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);

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
      entries.push({ type: "warning", text: `Analysts warn: ${next.upcomingWarning.event.warningHeadline}. Expected in ${next.upcomingWarning.turnsAway} quarters.` });
    if (scheduled) entries.push({ type: "major", text: scheduled.headline });
    if (crisis) entries.push({ type: "event", text: crisis.headline });
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
      taxRate: eff.taxBump ? clamp(p.taxRate + eff.taxBump, 0.15, 0.4) : p.taxRate,
      govSpendingRate: eff.spendBump ? clamp(p.govSpendingRate + eff.spendBump, 0.1, 0.35) : p.govSpendingRate,
      interestRate: eff.rateBump ? clamp(p.interestRate + eff.rateBump, 0, 0.1) : p.interestRate,
      moneyGrowth: eff.moneyBump ? clamp(p.moneyGrowth + eff.moneyBump, 0, 0.12) : p.moneyGrowth,
      tariff: eff.tariffBump ? clamp(p.tariff + eff.tariffBump, 0, 0.25) : p.tariff,
      minWage: eff.minWageBump ? clamp(p.minWage + eff.minWageBump, 0.2, 0.8) : p.minWage,
      subsidy: p.subsidy,
    }));
    setLog((lg) => [
      { type: e.isMajor ? "majorDecision" : "decision", text: `${e.headline || e.title} — You chose: ${option.label}` },
      { type: "lesson", title: option.lesson.title, text: option.lesson.body },
      ...lg,
    ].slice(0, 50));
  };

  if (state.gameOver) {
    return <EndScreen victory={state.victory} state={state}
      onMenu={onExit}
      onReplay={() => {
        const s = getInitialState(state.difficulty);
        setState(s);
        setPolicies({
          taxRate: s.taxRate, govSpendingRate: s.govSpendingRate,
          interestRate: s.interestRate, moneyGrowth: s.moneyGrowth,
          tariff: s.tariff, minWage: s.minWage, subsidy: s.subsidy,
        });
        setHistory([{ t: 0, label: "Q1 '26", gdpGrowth: 2.5, unemployment: 5.0, inflation: 2.0 }]);
        setLog([{ type: "system", text: `Your mandate begins again.` }]);
      }} />;
  }

  const growthInTarget = state.gdpGrowth >= targets.growth.min && state.gdpGrowth <= targets.growth.max;
  const unempInTarget = state.unemployment >= targets.unemployment.min && state.unemployment <= targets.unemployment.max;
  const inflationInTarget = state.inflation >= targets.inflation.min && state.inflation <= targets.inflation.max;
  const debtRatio = state.debt / state.gdp;
  const selectedRegionData = selectedRegion ? REGIONS.find((r) => r.id === selectedRegion) : null;
  const d = DIFFICULTIES[state.difficulty];

  return (
    <div className="min-h-screen w-full bg-[#0f1319] text-amber-50 font-[IBM_Plex_Sans] relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(#c9a961 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

      <div className="relative z-10 border-b-2 border-amber-900/50 bg-gradient-to-b from-stone-950 to-stone-900/90 shadow-lg">
        <div className="max-w-[1280px] mx-auto px-5 py-2 flex items-center gap-4">
          <div className="flex items-center gap-3 pr-4 border-r border-amber-900/40">
            <div className="w-9 h-9 rounded-full border flex items-center justify-center" style={{ background: `${d.color}33`, borderColor: d.color }}>
              <Crown size={16} style={{ color: d.color }} />
            </div>
            <div className="leading-tight">
              <div className="font-[Fraunces] text-[17px] text-amber-100 tracking-wide">Aurelia</div>
              <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: `${d.color}bb` }}>{d.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1 overflow-x-auto">
            <StatPill icon={TrendingUp} label="GDP Growth" value={fmtPct(state.gdpGrowth, 2)} inTarget={growthInTarget} />
            <StatPill icon={Users} label="Unemployment" value={fmtPct(state.unemployment, 1)} inTarget={unempInTarget} />
            <StatPill icon={Percent} label="Inflation" value={fmtPct(state.inflation, 2)} inTarget={inflationInTarget} />
            <StatPill icon={Landmark} label="Debt / GDP" value={fmtPct(debtRatio, 0)} inTarget={debtRatio < 1.0 ? true : debtRatio > 1.4 ? false : null} />
            <StatPill icon={Coins} label="GDP" value={fmtMoney(state.gdp)} />
            <StatPill icon={Users} label="Approval" value={`${state.approval.toFixed(0)}%`} inTarget={state.approval > 55 ? true : state.approval < 30 ? false : null} />
          </div>
          <div className="flex items-center gap-3 pl-3 border-l border-amber-900/40">
            <div className="text-right leading-tight">
              <div className="font-[Fraunces] text-[17px] text-amber-100">Q{state.quarter} {state.year}</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-amber-200/50">Turn {state.turn}</div>
            </div>
            <button onClick={onExit} className="text-amber-200/60 hover:text-amber-100 text-[10px] uppercase tracking-[0.18em] flex items-center gap-1">
              <RotateCcw size={11} /> Menu
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-[1280px] mx-auto px-5 pt-4 pb-[130px] grid grid-cols-[1fr_320px] gap-4">
        <div className="relative border-2 border-amber-900/50 bg-[#1a1510]" style={{ boxShadow: "0 0 0 1px #c9a96155 inset" }}>
          <CountryMap state={state} onSelectRegion={(id) => { setSelectedRegion(id); setActivePanel("region"); }} selectedRegion={selectedRegion} />
          <div className="absolute bottom-3 left-3 bg-stone-950/80 border border-amber-900/50 px-3 py-2 flex items-center gap-3 text-[10px] text-amber-100/90">
            <span className="uppercase tracking-[0.18em] text-amber-200/60 mr-1">Regional health</span>
            {[["#6b7e4e", "Booming"], ["#9b8c5c", "Healthy"], ["#8a7a62", "Neutral"], ["#8a5d42", "Slowing"], ["#6f3a2e", "Collapsing"]].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1"><span className="w-2.5 h-2.5 inline-block" style={{ background: c }} /> {l}</span>
            ))}
          </div>
          <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
            <div className="bg-stone-950/80 border border-amber-900/50 px-3 py-2 flex items-center gap-2 text-[11px] text-amber-100/90">
              <Target size={12} className="text-amber-300" />
              <span className="uppercase tracking-[0.16em] text-amber-200/60">Streak</span>
              <span className="font-[Fraunces] text-amber-200 text-[15px]">{state.inTargetStreak} / {d.winStreak}</span>
            </div>
            {state.upcomingWarning && (
              <div className="bg-stone-950/90 border px-3 py-2 max-w-[260px] text-[10.5px] flex items-start gap-2"
                style={{ borderColor: "#8b2d2d" }}>
                <AlertTriangle size={12} style={{ color: "#e05555" }} className="mt-0.5 flex-shrink-0" />
                <div>
                  <div className="uppercase tracking-[0.16em] text-[9px]" style={{ color: "#e05555" }}>Incoming in {state.upcomingWarning.turnsAway}Q</div>
                  <div className="font-[Fraunces] text-[12px] text-amber-100 leading-tight">{state.upcomingWarning.event.title}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#f2ead7] border-2 border-amber-900/60 relative max-h-[620px] overflow-y-auto"
          style={{ boxShadow: "0 0 0 1px #c9a96155 inset" }}>
          <div className="sticky top-0 bg-[#f2ead7] border-b-2 border-amber-900/40 px-4 py-2 flex items-center gap-2 z-10">
            <ScrollText size={14} style={{ color: "#44403c" }} />
            <div className="font-[Fraunces] text-[16px]" style={{ color: "#1c1917" }}>Journal</div>
            <div className="text-[10px] uppercase tracking-[0.18em] ml-auto" style={{ color: "#78716c" }}>Events & lessons</div>
          </div>
          <div className="p-3 space-y-2.5">
            {log.map((entry, i) => {
              if (entry.type === "system")
                return <div key={i} className="text-[11.5px] border-l-2 pl-2.5 py-0.5 italic" style={{ color: "#57534e", borderColor: "#a8a29e" }}>{entry.text}</div>;
              if (entry.type === "warning")
                return (
                  <div key={i} className="border-l-2 pl-2.5 py-0.5" style={{ borderColor: "#8b2d2d" }}>
                    <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: "#8b2d2d" }}>Warning</div>
                    <div className="text-[12px]" style={{ color: "#1c1917" }}>{entry.text}</div>
                  </div>
                );
              if (entry.type === "major")
                return (
                  <div key={i} className="border-l-2 pl-2.5 py-0.5" style={{ borderColor: "#b45309" }}>
                    <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: "#b45309" }}>Major Crisis</div>
                    <div className="text-[13px] font-[Fraunces]" style={{ color: "#1c1917" }}>{entry.text}</div>
                  </div>
                );
              if (entry.type === "event")
                return (
                  <div key={i} className="border-l-2 pl-2.5 py-0.5" style={{ borderColor: "#a16207" }}>
                    <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: "#a16207" }}>Dispatch</div>
                    <div className="text-[12.5px] font-[Fraunces]" style={{ color: "#1c1917" }}>{entry.text}</div>
                  </div>
                );
              if (entry.type === "decision" || entry.type === "majorDecision")
                return (
                  <div key={i} className="border-l-2 pl-2.5 py-0.5" style={{ borderColor: entry.type === "majorDecision" ? "#b45309" : "#0369a1" }}>
                    <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: entry.type === "majorDecision" ? "#b45309" : "#075985" }}>{entry.type === "majorDecision" ? "Pivotal Decision" : "Decision"}</div>
                    <div className="text-[12px]" style={{ color: "#1c1917" }}>{entry.text}</div>
                  </div>
                );
              if (entry.type === "lesson")
                return (
                  <div key={i} className="border-l-2 pl-2.5 py-0.5" style={{ borderColor: "#1c1917" }}>
                    <div className="text-[9px] uppercase tracking-[0.18em] flex items-center gap-1" style={{ color: "#44403c" }}><BookOpen size={9} /> Concept</div>
                    <div className="text-[12.5px] font-[Fraunces]" style={{ color: "#1c1917" }}>{entry.title}</div>
                    <div className="text-[11px] leading-snug mt-0.5" style={{ color: "#44403c" }}>{entry.text}</div>
                  </div>
                );
              return null;
            })}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t-2 border-amber-900/50 bg-gradient-to-t from-stone-950 via-stone-950 to-stone-900/95 shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
        <div className="max-w-[1280px] mx-auto px-5 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <MinistryButton icon={Coins} label="Treasury" onClick={() => setActivePanel("treasury")} active={activePanel === "treasury"} />
            <MinistryButton icon={Banknote} label="Central Bank" onClick={() => setActivePanel("cb")} active={activePanel === "cb"} />
            <MinistryButton icon={Ship} label="Trade" onClick={() => setActivePanel("trade")} active={activePanel === "trade"} />
            <MinistryButton icon={Factory} label="Industry" onClick={() => setActivePanel("industry")} active={activePanel === "industry"} />
            <MinistryButton icon={BarChart3} label="Records" onClick={() => setActivePanel("charts")} active={activePanel === "charts"} />
            <MinistryButton icon={Gauge} label="Objectives" onClick={() => setActivePanel("objectives")} active={activePanel === "objectives"} alert={state.upcomingWarning} />
          </div>
          <div className="ml-auto flex items-center gap-3">
            {state.pendingEvent && (
              <div className="text-[11px] uppercase tracking-[0.18em] text-amber-300 border border-amber-400 px-3 py-2 animate-pulse">
                Awaiting your decision
              </div>
            )}
            <button onClick={advance} disabled={state.gameOver || !!state.pendingEvent}
              className="group bg-amber-700 hover:bg-amber-600 text-stone-950 px-6 py-3 flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] font-medium transition-colors disabled:bg-stone-700 disabled:text-stone-500 border-2 border-amber-500/50"
              style={{ boxShadow: "0 0 0 1px #1a1510 inset" }}>
              Advance Quarter
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {activePanel === "treasury" && (
        <PanelFrame title="Treasury" subtitle="Fiscal policy" onClose={() => setActivePanel(null)}>
          <div className="grid grid-cols-2 gap-x-6">
            <PolicySlider label="Tax rate" icon={Coins} value={policies.taxRate}
              onChange={(v) => setPolicies({ ...policies, taxRate: v })}
              min={0.15} max={0.4} step={0.005} format={(v) => fmtPct(v, 1)}
              desc="Higher taxes cool demand but fund spending. Lower taxes lift disposable income." />
            <PolicySlider label="Government spending" icon={Landmark} value={policies.govSpendingRate}
              onChange={(v) => setPolicies({ ...policies, govSpendingRate: v })}
              min={0.1} max={0.35} step={0.005} format={(v) => fmtPct(v, 1)}
              desc="Expansionary fiscal policy lifts AD. Persistent deficits add to debt." />
          </div>
          <div className="mt-3 pt-3 border-t text-[12px] leading-relaxed" style={{ borderColor: "#d6d3d1", color: "#44403c" }}>
            <span className="font-[Fraunces] text-[14px]" style={{ color: "#1c1917" }}>Primary balance: </span>
            {((policies.taxRate - policies.govSpendingRate) * 100).toFixed(1)}% of GDP. A deficit finances stimulus today and borrows from tomorrow.
          </div>
        </PanelFrame>
      )}

      {activePanel === "cb" && (
        <PanelFrame title="Central Bank" subtitle="Monetary policy" onClose={() => setActivePanel(null)}>
          <div className="grid grid-cols-2 gap-x-6">
            <PolicySlider label="Policy interest rate" icon={Percent} value={policies.interestRate}
              onChange={(v) => setPolicies({ ...policies, interestRate: v })}
              min={0} max={0.1} step={0.0025} format={(v) => fmtPct(v, 2)}
              desc="Lower rates encourage investment. Higher rates cool inflation through AD." />
            <PolicySlider label="Money supply growth" icon={Banknote} value={policies.moneyGrowth}
              onChange={(v) => setPolicies({ ...policies, moneyGrowth: v })}
              min={0} max={0.12} step={0.0025} format={(v) => fmtPct(v, 2)}
              desc="Quantity theory: money growth above output growth feeds inflation over time." />
          </div>
          <div className="mt-3 pt-3 border-t text-[12px] leading-relaxed" style={{ borderColor: "#d6d3d1", color: "#44403c" }}>
            The rate sets the price of credit today. Money growth shapes inflation expectations over the long run.
          </div>
        </PanelFrame>
      )}

      {activePanel === "trade" && (
        <PanelFrame title="Trade Ministry" subtitle="International economics" onClose={() => setActivePanel(null)}>
          <PolicySlider label="Average tariff" icon={Ship} value={policies.tariff}
            onChange={(v) => setPolicies({ ...policies, tariff: v })}
            min={0} max={0.25} step={0.005} format={(v) => fmtPct(v, 1)}
            desc="Protects some producers but raises consumer prices and reduces trade volume." />
          <div className="mt-3 pt-3 border-t text-[12px] leading-relaxed" style={{ borderColor: "#d6d3d1", color: "#44403c" }}>
            Tariffs transfer welfare from consumers to protected producers and the government, but the total effect on welfare is negative.
          </div>
        </PanelFrame>
      )}

      {activePanel === "industry" && (
        <PanelFrame title="Ministry of Industry & Labor" subtitle="Microeconomic levers" onClose={() => setActivePanel(null)} wide>
          <PolicySlider label="Minimum wage" icon={Users} value={policies.minWage}
            onChange={(v) => setPolicies({ ...policies, minWage: v })}
            min={0.25} max={0.75} step={0.01} format={(v) => `${(v * 100).toFixed(0)}% of avg`}
            desc="A binding price floor above the market wage creates a labor surplus." />
          <div className="mt-5 pt-4 border-t" style={{ borderColor: "#d6d3d1" }}>
            <div className="flex items-center gap-2 mb-2">
              <Factory size={13} style={{ color: "#44403c" }} />
              <span className="text-[11.5px] uppercase tracking-[0.14em]" style={{ color: "#44403c" }}>Industrial subsidy</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {SUBSIDY_OPTIONS.map((opt) => (
                <button key={opt.key} onClick={() => setPolicies({ ...policies, subsidy: opt.key })}
                  className="text-left p-2.5 border transition-colors"
                  style={policies.subsidy === opt.key
                    ? { borderColor: "#1c1917", backgroundColor: "#1c1917", color: "#f2ead7" }
                    : { borderColor: "#a8a29e", backgroundColor: "rgba(255,255,255,0.4)", color: "#1c1917" }}>
                  <div className="text-[11.5px] font-[Fraunces]">{opt.label}</div>
                  <div className="text-[10px] mt-0.5 leading-snug" style={policies.subsidy === opt.key ? { color: "#d4c090" } : { color: "#57534e" }}>{opt.description}</div>
                </button>
              ))}
            </div>
          </div>
        </PanelFrame>
      )}

      {activePanel === "charts" && (
        <PanelFrame title="Economic Records" subtitle="Time series" onClose={() => setActivePanel(null)} wide>
          <div className="flex items-center gap-4 text-[11px] mb-2" style={{ color: "#44403c" }}>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-stone-900 inline-block" /> GDP growth</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-700 inline-block" /> Unemployment</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-700 inline-block" /> Inflation</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={history} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#57534e" }} stroke="#a8a29e" />
              <YAxis tick={{ fontSize: 10, fill: "#57534e" }} stroke="#a8a29e" />
              <Tooltip contentStyle={{ background: "#f2ead7", border: "1px solid #8a6d3b", fontSize: 12, borderRadius: 0 }} formatter={(v) => `${v}%`} />
              <ReferenceLine y={0} stroke="#d6d3d1" />
              <Line type="monotone" dataKey="gdpGrowth" stroke="#1c1917" strokeWidth={1.8} dot={false} />
              <Line type="monotone" dataKey="unemployment" stroke="#9f1239" strokeWidth={1.8} dot={false} />
              <Line type="monotone" dataKey="inflation" stroke="#a16207" strokeWidth={1.8} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-3 mt-4 text-[11px]" style={{ color: "#44403c" }}>
            <div className="p-2 border" style={{ borderColor: "#d6d3d1", backgroundColor: "rgba(255,255,255,0.4)" }}>
              <div className="uppercase tracking-[0.18em] text-[9px]" style={{ color: "#78716c" }}>Productivity index</div>
              <div className="font-[Fraunces] text-[18px]" style={{ color: "#1c1917" }}>{state.productivity.toFixed(3)}</div>
            </div>
            <div className="p-2 border" style={{ borderColor: "#d6d3d1", backgroundColor: "rgba(255,255,255,0.4)" }}>
              <div className="uppercase tracking-[0.18em] text-[9px]" style={{ color: "#78716c" }}>Primary balance</div>
              <div className="font-[Fraunces] text-[18px]" style={{ color: "#1c1917" }}>{((state.taxRate - state.govSpendingRate) * 100).toFixed(1)}%</div>
            </div>
            <div className="p-2 border" style={{ borderColor: "#d6d3d1", backgroundColor: "rgba(255,255,255,0.4)" }}>
              <div className="uppercase tracking-[0.18em] text-[9px]" style={{ color: "#78716c" }}>Best streak</div>
              <div className="font-[Fraunces] text-[18px]" style={{ color: "#1c1917" }}>{state.bestStreak}</div>
            </div>
          </div>
        </PanelFrame>
      )}

      {activePanel === "objectives" && (
        <PanelFrame title="Objectives" subtitle="Mandate briefing" onClose={() => setActivePanel(null)}>
          <div className="text-[13px] leading-relaxed space-y-4" style={{ color: "#1c1917" }}>
            <div>
              <div className="font-[Fraunces] text-[16px] mb-1">Primary objective</div>
              <div className="text-[12.5px]" style={{ color: "#44403c" }}>Maintain all three indicators within target for {d.winStreak} consecutive quarters. Current streak: <span className="font-[Fraunces]" style={{ color: "#1c1917" }}>{state.inTargetStreak} / {d.winStreak}</span>.</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                <div className="border p-2" style={{ borderColor: "#d6d3d1" }}>
                  <div className="uppercase tracking-[0.16em] text-[9px]" style={{ color: "#78716c" }}>GDP Growth</div>
                  <div className="font-[Fraunces] text-[13px]" style={{ color: "#1c1917" }}>{fmtPct(targets.growth.min, 1)} to {fmtPct(targets.growth.max, 1)}</div>
                </div>
                <div className="border p-2" style={{ borderColor: "#d6d3d1" }}>
                  <div className="uppercase tracking-[0.16em] text-[9px]" style={{ color: "#78716c" }}>Unemployment</div>
                  <div className="font-[Fraunces] text-[13px]" style={{ color: "#1c1917" }}>{fmtPct(targets.unemployment.min, 1)} to {fmtPct(targets.unemployment.max, 1)}</div>
                </div>
                <div className="border p-2" style={{ borderColor: "#d6d3d1" }}>
                  <div className="uppercase tracking-[0.16em] text-[9px]" style={{ color: "#78716c" }}>Inflation</div>
                  <div className="font-[Fraunces] text-[13px]" style={{ color: "#1c1917" }}>{fmtPct(targets.inflation.min, 1)} to {fmtPct(targets.inflation.max, 1)}</div>
                </div>
              </div>
            </div>
            <div className="pt-3 border-t" style={{ borderColor: "#d6d3d1" }}>
              <div className="font-[Fraunces] text-[16px] mb-1">Upcoming major events</div>
              <div className="space-y-1.5 mt-2">
                {Object.entries(SCHEDULED_EVENTS).filter(([turn]) => parseInt(turn) > state.turn).map(([turn, ev]) => (
                  <div key={turn} className="flex items-center gap-3 text-[12px]">
                    <div className="w-14 font-[Fraunces] text-right" style={{ color: d.color }}>Turn {turn}</div>
                    <div className="w-px h-4" style={{ backgroundColor: "#d6d3d1" }} />
                    <div style={{ color: "#1c1917" }}>{ev.title}</div>
                    <div className="ml-auto text-[10.5px]" style={{ color: "#78716c" }}>in {parseInt(turn) - state.turn}Q</div>
                  </div>
                ))}
                {Object.entries(SCHEDULED_EVENTS).filter(([turn]) => parseInt(turn) > state.turn).length === 0 && (
                  <div className="text-[12px] italic" style={{ color: "#78716c" }}>No further scheduled crises. Only random events from here.</div>
                )}
              </div>
            </div>
          </div>
        </PanelFrame>
      )}

      {activePanel === "region" && selectedRegionData && (
        <PanelFrame title={selectedRegionData.name} subtitle={selectedRegionData.industry}
          onClose={() => { setActivePanel(null); setSelectedRegion(null); }}>
          <div className="text-[13px] leading-relaxed space-y-3" style={{ color: "#1c1917" }}>
            <div><span className="font-[Fraunces]">Share of national output:</span> {(selectedRegionData.share * 100).toFixed(0)}%</div>
            <div>
              <span className="font-[Fraunces]">Sensitivities:</span>
              <ul className="mt-1 pl-4 text-[12px] space-y-0.5" style={{ color: "#44403c" }}>
                <li>Tariff response: {selectedRegionData.sensitivity.tariff > 0 ? "benefits from protection" : "hurt by protection"}</li>
                <li>Minimum wage: {selectedRegionData.sensitivity.minWage < -0.4 ? "very sensitive" : "moderate sensitivity"}</li>
                <li>Interest rate: {selectedRegionData.sensitivity.rate < -0.8 ? "highly rate-sensitive" : "moderately rate-sensitive"}</li>
                <li>Subsidy match: {selectedRegionData.sensitivity.subsidyKey !== "none" ? selectedRegionData.sensitivity.subsidyKey : "none available"}</li>
              </ul>
            </div>
          </div>
        </PanelFrame>
      )}

      {state.pendingEvent && (
        <PanelFrame
          title={state.pendingEvent.title || state.pendingEvent.headline}
          subtitle={state.pendingEvent.isMajor ? "Pivotal decision" : "Decision required"}
          onClose={() => {}} wide hideClose
          tone={state.pendingEvent.isMajor ? "major" : null}>
          {state.pendingEvent.isMajor && (
            <div className="mb-3 text-[12px] uppercase tracking-[0.2em] font-[Fraunces]" style={{ color: "#b45309" }}>{state.pendingEvent.headline}</div>
          )}
          <div className="text-[13px] mb-4" style={{ color: "#292524" }}>{state.pendingEvent.body}</div>
          <div className={`grid ${state.pendingEvent.options.length === 3 ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
            {state.pendingEvent.options.map((opt, i) => (
              <button key={i} onClick={() => resolveEvent(opt)}
                className="text-left p-4 border-2 transition-colors group"
                style={{ borderColor: "#a8a29e", backgroundColor: "rgba(255,255,255,0.5)", color: "#1c1917" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1c1917"; e.currentTarget.style.color = "#f2ead7"; e.currentTarget.style.borderColor = "#1c1917"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.5)"; e.currentTarget.style.color = "#1c1917"; e.currentTarget.style.borderColor = "#a8a29e"; }}>
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

// ============ ROOT APP ============

export default function App() {
  const [screen, setScreen] = useState("menu");
  const [difficulty, setDifficulty] = useState(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        body { font-family: 'IBM Plex Sans', system-ui, sans-serif; margin: 0; background: #0f0c08; }
      `}</style>
      {screen === "menu" && (
        <MainMenu onStart={() => setScreen("difficulty")} onHow={() => setScreen("how")} />
      )}
      {screen === "how" && <HowToPlay onBack={() => setScreen("menu")} />}
      {screen === "difficulty" && (
        <DifficultySelect
          onSelect={(d) => { setDifficulty(d); setScreen("briefing"); }}
          onBack={() => setScreen("menu")} />
      )}
      {screen === "briefing" && (
        <Briefing difficulty={difficulty}
          onBegin={() => setScreen("game")}
          onBack={() => setScreen("difficulty")} />
      )}
      {screen === "game" && (
        <GameScreen initialDifficulty={difficulty} onExit={() => setScreen("menu")} />
      )}
    </>
  );
}

