import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  AlertTriangle,
  Landmark,
  Coins,
  Percent,
  Ship,
  ChevronRight,
  BookOpen,
  Target,
  RotateCcw,
  Users,
  Factory,
  Wheat,
  Anchor,
  Mountain,
  Sprout,
  Banknote,
  BarChart3,
  X,
  Crown,
  ScrollText,
} from "lucide-react";

const COUNTRY_NAME = "Aurelia";

const REGIONS = [
  {
    id: "highlands",
    name: "Vaerholt Highlands",
    industry: "Mining & Energy",
    icon: Mountain,
    share: 0.12,
    path: "M 95 135 L 180 95 L 275 105 L 335 175 L 300 220 L 155 225 L 95 195 Z",
    labelX: 200,
    labelY: 165,
    sensitivity: { tariff: 0.4, minWage: -0.3, rate: -0.4, subsidyKey: "mining" },
  },
  {
    id: "port",
    name: "Saltmere Coast",
    industry: "Trade & Shipping",
    icon: Anchor,
    share: 0.18,
    path: "M 335 175 L 445 115 L 555 145 L 580 235 L 485 260 L 375 230 Z",
    labelX: 465,
    labelY: 190,
    sensitivity: { tariff: -1.2, minWage: -0.2, rate: -0.3, subsidyKey: "trade" },
  },
  {
    id: "frontier",
    name: "Western Frontier",
    industry: "Timber & Frontier",
    icon: Sprout,
    share: 0.08,
    path: "M 95 195 L 155 225 L 190 320 L 105 335 L 60 265 Z",
    labelX: 130,
    labelY: 270,
    sensitivity: { tariff: 0.1, minWage: -0.6, rate: -0.2, subsidyKey: "none" },
  },
  {
    id: "industrial",
    name: "Ironvale",
    industry: "Manufacturing",
    icon: Factory,
    share: 0.22,
    path: "M 155 225 L 300 220 L 375 230 L 400 310 L 310 330 L 190 320 Z",
    labelX: 275,
    labelY: 275,
    sensitivity: { tariff: 0.8, minWage: -0.5, rate: -0.9, subsidyKey: "manufacturing" },
  },
  {
    id: "capital",
    name: "Meridian District",
    industry: "Finance & Services",
    icon: Crown,
    share: 0.28,
    path: "M 375 230 L 485 260 L 500 330 L 400 310 Z",
    labelX: 440,
    labelY: 285,
    sensitivity: { tariff: -0.2, minWage: -0.1, rate: -1.1, subsidyKey: "services" },
  },
  {
    id: "breadbasket",
    name: "Goldenreach Plains",
    industry: "Agriculture",
    icon: Wheat,
    share: 0.12,
    path: "M 105 335 L 190 320 L 310 330 L 400 310 L 500 330 L 475 410 L 270 420 L 130 395 Z",
    labelX: 300,
    labelY: 370,
    sensitivity: { tariff: 0.2, minWage: -0.4, rate: -0.3, subsidyKey: "agriculture" },
  },
];

const SUBSIDY_OPTIONS = [
  { key: "none", label: "No Subsidy", description: "Let markets clear without intervention." },
  { key: "agriculture", label: "Agriculture", description: "Boost farm output. Helps the plains." },
  { key: "manufacturing", label: "Manufacturing", description: "Support industry. Helps Ironvale." },
  { key: "trade", label: "Export & Shipping", description: "Subsidize exporters. Helps the coast." },
  { key: "mining", label: "Mining & Energy", description: "Lower energy costs. Helps highlands." },
];

const INITIAL_STATE = {
  turn: 0,
  year: 2026,
  quarter: 1,
  gdp: 1000,
  gdpGrowth: 0.025,
  unemployment: 0.05,
  inflation: 0.02,
  interestRate: 0.03,
  moneyGrowth: 0.03,
  taxRate: 0.25,
  govSpendingRate: 0.2,
  tariff: 0.03,
  minWage: 0.42,
  subsidy: "none",
  productivity: 1.0,
  debt: 500,
  approval: 60,
  inTargetStreak: 0,
  gameOver: false,
  victory: false,
  lastEvent: null,
  pendingEvent: null,
};

const TARGETS = {
  growth: { min: 0.02, max: 0.04 },
  unemployment: { min: 0.03, max: 0.05 },
  inflation: { min: 0.015, max: 0.03 },
};

const WIN_STREAK = 8;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function rollPassiveCrisis(state) {
  if (state.turn < 5) return null;
  if (Math.random() > 0.11) return null;
  const pool = [
    {
      headline: "Energy shock rattles import costs",
      effect: { inflationBump: 0.025, growthDrag: -0.005 },
      lesson: {
        title: "Cost-push inflation",
        body: "A sudden rise in input prices shifts short run aggregate supply leftward. Output falls while prices rise, the classic stagflation signature. Rate hikes cool inflation but deepen the slowdown.",
      },
    },
    {
      headline: "Largest trade partner enters recession",
      effect: { growthDrag: -0.012, unemploymentBump: 0.006 },
      lesson: {
        title: "Net exports channel",
        body: "When a key partner contracts, foreign demand for your exports drops. Net exports fall, aggregate demand shifts left, unemployment climbs.",
      },
    },
    {
      headline: "Banking sector under stress",
      effect: { growthDrag: -0.01, inflationBump: -0.004 },
      lesson: {
        title: "Credit channel",
        body: "When banks retrench, firms struggle to finance investment. Aggregate demand shrinks through the investment component even before the central bank acts.",
      },
    },
    {
      headline: "Productivity surge in tech sector",
      effect: { growthDrag: 0.012, inflationBump: -0.006, prodBump: 0.02 },
      lesson: {
        title: "Positive supply shock",
        body: "A productivity jump shifts long run aggregate supply rightward. Output rises while inflation eases, a rare win on both fronts.",
      },
    },
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

function rollDecisionEvent(state) {
  if (state.turn < 4) return null;
  if (state.pendingEvent) return null;
  if (Math.random() > 0.18) return null;
  const pool = [
    {
      headline: "Dominant firm accused of monopoly pricing",
      body: "A single telecom has captured most of the market and is charging well above marginal cost. Regulators want your call.",
      options: [
        {
          label: "Break up the monopoly",
          blurb: "Short term disruption, long term welfare gain.",
          effect: { growthDrag: -0.006, approvalDelta: 4, prodBump: 0.005 },
          lesson: {
            title: "Deadweight loss of monopoly",
            body: "Monopolies charge above marginal cost and restrict output, creating deadweight loss. Breaking them up restores consumer surplus at a short run adjustment cost.",
          },
        },
        {
          label: "Leave the market alone",
          blurb: "Avoid disruption, accept higher prices.",
          effect: { inflationBump: 0.004, approvalDelta: -3 },
          lesson: {
            title: "Allocative inefficiency",
            body: "Unregulated market power leads firms to price above marginal cost. Consumers pay more and the market produces less than the socially optimal quantity.",
          },
        },
      ],
    },
    {
      headline: "Industrial runoff poisons a river",
      body: "Factories in Ironvale are dumping untreated waste. The social cost is mounting.",
      options: [
        {
          label: "Pigouvian tax on polluters",
          blurb: "Prices the externality into production.",
          effect: { growthDrag: -0.004, approvalDelta: 3 },
          lesson: {
            title: "Pigouvian tax and externalities",
            body: "Negative externalities cause private cost to sit below social cost, so markets overproduce the harmful good. A tax equal to the marginal external cost realigns the two.",
          },
        },
        {
          label: "Ignore the issue",
          blurb: "Cheaper short term, externalities accumulate.",
          effect: { approvalDelta: -5, prodBump: -0.01 },
          lesson: {
            title: "Market failure",
            body: "When externalities go unpriced, private decisions diverge from the socially optimal outcome. The damage shows up later as lower productivity and cleanup bills.",
          },
        },
      ],
    },
    {
      headline: "General strike threatens production",
      body: "Unions demand higher wages across Ironvale. Workers walk off the line.",
      options: [
        {
          label: "Raise the minimum wage",
          blurb: "Calm the unrest, risk unemployment.",
          effect: { minWageBump: 0.04, approvalDelta: 2 },
          lesson: {
            title: "Price floors in labor markets",
            body: "A minimum wage above equilibrium creates a labor surplus among low productivity workers. It lifts incomes for those still employed but reduces quantity demanded.",
          },
        },
        {
          label: "Hold the line",
          blurb: "Protect employment, accept unrest.",
          effect: { approvalDelta: -4, growthDrag: -0.004 },
          lesson: {
            title: "Labor market frictions",
            body: "Refusing wage concessions can preserve employment but cause disruption. Strikes reduce output in the short run and damage long run trust between capital and labor.",
          },
        },
      ],
    },
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildLessons(prev, next, policies, crisis) {
  const lessons = [];
  const taxDelta = policies.taxRate - prev.taxRate;
  const spendDelta = policies.govSpendingRate - prev.govSpendingRate;
  const rateDelta = policies.interestRate - prev.interestRate;

  if (crisis) lessons.push(crisis.lesson);

  if (next.unemployment < 0.03 && next.inflation > 0.035)
    lessons.push({
      title: "Phillips curve in action",
      body: "Unemployment below the natural rate accelerates inflation. In the short run these two move in opposite directions, so pushing unemployment ever lower eventually lights up the inflation dial.",
    });

  if (next.inflation > 0.06)
    lessons.push({
      title: "Runaway inflation",
      body: "Inflation above 6 percent risks unanchoring expectations. Sustained rate hikes reduce aggregate demand, cooling prices but slowing growth.",
    });

  if (next.unemployment > 0.08 && rateDelta > 0)
    lessons.push({
      title: "Contractionary policy in a slump",
      body: "Raising rates while unemployment is already elevated is contractionary on top of contraction. Recessions usually call for easier policy, not tighter.",
    });

  if (taxDelta > 0.02 && next.gdpGrowth < 0.01)
    lessons.push({
      title: "Fiscal drag",
      body: "Sharp tax hikes pull spending power out of households. Consumption and investment both slip, shifting aggregate demand left.",
    });

  if (spendDelta > 0.03 && next.inflation > 0.04)
    lessons.push({
      title: "Crowding out and overheating",
      body: "Government spending near full capacity mainly lifts prices rather than output. Higher deficits push rates up and squeeze private investment.",
    });

  if (policies.tariff > 0.15)
    lessons.push({
      title: "Deadweight loss of tariffs",
      body: "High tariffs raise domestic prices and shrink trade volume. Lost consumer surplus exceeds producer gains plus revenue.",
    });

  if (next.debt / next.gdp > 1.2)
    lessons.push({
      title: "Debt to GDP in the danger zone",
      body: "When debt outruns output, interest payments eat a growing share of revenue. Bond markets may demand higher yields.",
    });

  if (policies.minWage > 0.55)
    lessons.push({
      title: "Minimum wage as a price floor",
      body: "A wage floor above the market clearing level creates a labor surplus. Workers who keep their jobs earn more, but firms hire fewer of them.",
    });

  if (policies.moneyGrowth > 0.07 && next.inflation > 0.04)
    lessons.push({
      title: "Quantity theory of money",
      body: "MV = PY: when the money stock expands faster than real output, prices absorb the gap over the long run.",
    });

  if (rateDelta < -0.01 && next.inflation > 0.04)
    lessons.push({
      title: "Loose money meets hot economy",
      body: "Cutting rates when inflation is already elevated pours fuel on the fire. Monetary easing expands AD when AS is the binding constraint.",
    });

  return lessons.slice(0, 2);
}

function simulate(state, policies) {
  const crisis = rollPassiveCrisis(state);
  const taxDelta = policies.taxRate - state.taxRate;
  const spendDelta = policies.govSpendingRate - state.govSpendingRate;
  const rateDelta = policies.interestRate - state.interestRate;

  const trend = 0.025;
  const fiscalEffect = spendDelta * 1.8 - taxDelta * 1.4;
  const monetaryEffect = -rateDelta * 2.2;
  const tariffDrag = -policies.tariff * 0.25;
  const minWageDrag = -Math.max(0, policies.minWage - 0.45) * 0.4;
  const subsidyBoost = policies.subsidy !== "none" ? 0.004 : 0;
  const moneyBoost = (policies.moneyGrowth - 0.03) * 0.3;
  const confidence = (state.approval - 50) / 800;
  const shock = (Math.random() - 0.5) * 0.008;
  const crisisGrowth = crisis?.effect.growthDrag ?? 0;

  let growth =
    0.6 * trend + 0.35 * state.gdpGrowth + fiscalEffect + monetaryEffect + tariffDrag +
    minWageDrag + subsidyBoost + moneyBoost + confidence + shock + crisisGrowth;
  growth = clamp(growth, -0.06, 0.09);

  const productivity = clamp(state.productivity + (crisis?.effect.prodBump ?? 0), 0.85, 1.25);
  const newGdp = state.gdp * (1 + growth / 4) * (productivity / state.productivity);

  const natural = 0.045;
  let unemp =
    state.unemployment - 0.45 * (growth - 0.025) +
    Math.max(0, policies.minWage - 0.45) * 0.12 + (crisis?.effect.unemploymentBump ?? 0);
  unemp = clamp(unemp, 0.02, 0.22);

  const phillips = -0.35 * (unemp - natural);
  const tariffInflation = policies.tariff * 0.25;
  const rateDamping = (policies.interestRate - 0.03) * -0.6;
  const moneyInflation = (policies.moneyGrowth - 0.03) * 0.4;
  const subsidyInflation = policies.subsidy !== "none" ? 0.003 : 0;
  const inflationBump = crisis?.effect.inflationBump ?? 0;
  let inflation = 0.55 * state.inflation + 0.02 + phillips + tariffInflation +
    rateDamping + moneyInflation + subsidyInflation + inflationBump;
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

  const hitsTargets =
    growth >= TARGETS.growth.min && growth <= TARGETS.growth.max &&
    unemp >= TARGETS.unemployment.min && unemp <= TARGETS.unemployment.max &&
    inflation >= TARGETS.inflation.min && inflation <= TARGETS.inflation.max;
  const inTargetStreak = hitsTargets ? state.inTargetStreak + 1 : 0;

  let quarter = state.quarter + 1, year = state.year;
  if (quarter > 4) { quarter = 1; year += 1; }

  const victory = inTargetStreak >= WIN_STREAK;
  const gameOver = victory || approval <= 5 || unemp >= 0.18 || inflation >= 0.18 || debt / newGdp > 2.0;

  const next = {
    ...state, ...policies,
    turn: state.turn + 1, year, quarter,
    gdp: newGdp, gdpGrowth: growth, unemployment: unemp, inflation,
    productivity, debt, approval, inTargetStreak, victory, gameOver,
    lastEvent: crisis ? { headline: crisis.headline } : null,
  };
  const lessons = buildLessons(state, next, policies, crisis);
  const decision = rollDecisionEvent(next);
  if (decision) next.pendingEvent = decision;
  return { next, lessons, crisis };
}

const fmtPct = (v, d = 1) => `${(v * 100).toFixed(d)}%`;
const fmtMoney = (v) => `$${v.toFixed(0)}B`;

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

function MinistryButton({ icon: Icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`group relative px-4 py-3 border flex flex-col items-center gap-1 min-w-[110px] transition-all ${
        active ? "border-amber-400 bg-amber-950/60"
        : "border-amber-900/40 bg-stone-900/70 hover:border-amber-500/70 hover:bg-stone-900"
      }`}
    >
      <Icon size={18} className="text-amber-200" strokeWidth={1.6} />
      <span className="text-[10px] uppercase tracking-[0.18em] text-amber-100/90">{label}</span>
    </button>
  );
}

function PolicySlider({ label, icon: Icon, value, onChange, min, max, step, format, desc }) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon size={13} strokeWidth={1.8} className="text-stone-700" />
          <span className="text-[11.5px] uppercase tracking-[0.14em] text-stone-700">{label}</span>
        </div>
        <span className="font-[Fraunces] text-[15px] text-stone-900">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-stone-800" />
      <div className="text-[10.5px] text-stone-500 mt-1 leading-snug italic">{desc}</div>
    </div>
  );
}

function PanelFrame({ title, subtitle, onClose, children, wide, hideClose }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(8, 10, 14, 0.82)", backdropFilter: "blur(3px)" }}
    >
      <div
        className={`${wide ? "max-w-[920px]" : "max-w-[620px]"} w-full border-2 border-amber-900/60 shadow-2xl relative`}
        style={{
          backgroundColor: "#f2ead7",
          boxShadow: "0 0 0 1px #c9a961, 0 20px 50px rgba(0,0,0,0.7)",
          color: "#1c1917",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3 border-b-2 border-amber-900/40"
          style={{ backgroundColor: "#ebe0c4" }}
        >
          <div>
            <div className="font-[Fraunces] text-[22px] tracking-tight" style={{ color: "#1c1917" }}>{title}</div>
            {subtitle && (
              <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "#57534e" }}>
                {subtitle}
              </div>
            )}
          </div>
          {!hideClose && (
            <button onClick={onClose} style={{ color: "#57534e" }} className="hover:opacity-70">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="p-5" style={{ color: "#292524" }}>{children}</div>
      </div>
    </div>
  );
}

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
              stroke={isSel ? "#1a1510" : "#2a2117"}
              strokeWidth={isSel ? "2.5" : "1.2"}
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

export default function EconManager() {
  const [state, setState] = useState(INITIAL_STATE);
  const [policies, setPolicies] = useState({
    taxRate: INITIAL_STATE.taxRate, govSpendingRate: INITIAL_STATE.govSpendingRate,
    interestRate: INITIAL_STATE.interestRate, moneyGrowth: INITIAL_STATE.moneyGrowth,
    tariff: INITIAL_STATE.tariff, minWage: INITIAL_STATE.minWage, subsidy: INITIAL_STATE.subsidy,
  });
  const [history, setHistory] = useState([{ t: 0, label: "Q1 '26", gdpGrowth: 2.5, unemployment: 5.0, inflation: 2.0 }]);
  const [log, setLog] = useState([{ type: "system", text: `As chief advisor to the ${COUNTRY_NAME}, hit all three target ranges for ${WIN_STREAK} consecutive quarters to secure your legacy.` }]);
  const [activePanel, setActivePanel] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);

  const advance = () => {
    if (state.gameOver || state.pendingEvent) return;
    const { next, lessons, crisis } = simulate(state, policies);
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
    if (crisis) entries.push({ type: "event", text: crisis.headline });
    lessons.forEach((l) => entries.push({ type: "lesson", title: l.title, text: l.body }));
    if (next.victory) entries.push({ type: "victory", text: "You have steered Aurelia to eight straight quarters of textbook performance. History will remember you." });
    else if (next.gameOver) entries.push({ type: "defeat", text: "The economy has collapsed. Review the lessons and try again." });
    if (entries.length) setLog((lg) => [...entries, ...lg].slice(0, 40));
  };

  const resolveEvent = (option) => {
    const e = state.pendingEvent;
    if (!e) return;
    const eff = option.effect;
    setState((s) => ({
      ...s,
      gdpGrowth: clamp(s.gdpGrowth + (eff.growthDrag ?? 0), -0.06, 0.09),
      inflation: clamp(s.inflation + (eff.inflationBump ?? 0), -0.03, 0.25),
      productivity: clamp(s.productivity + (eff.prodBump ?? 0), 0.85, 1.25),
      approval: clamp(s.approval + (eff.approvalDelta ?? 0), 0, 100),
      minWage: eff.minWageBump ? clamp(s.minWage + eff.minWageBump, 0.2, 0.8) : s.minWage,
      pendingEvent: null,
    }));
    setPolicies((p) => ({
      ...p,
      minWage: eff.minWageBump ? clamp(p.minWage + eff.minWageBump, 0.2, 0.8) : p.minWage,
    }));
    setLog((lg) => [
      { type: "decision", text: `${e.headline} — You chose: ${option.label}` },
      { type: "lesson", title: option.lesson.title, text: option.lesson.body },
      ...lg,
    ].slice(0, 40));
  };

  const reset = () => {
    setState(INITIAL_STATE);
    setPolicies({
      taxRate: INITIAL_STATE.taxRate, govSpendingRate: INITIAL_STATE.govSpendingRate,
      interestRate: INITIAL_STATE.interestRate, moneyGrowth: INITIAL_STATE.moneyGrowth,
      tariff: INITIAL_STATE.tariff, minWage: INITIAL_STATE.minWage, subsidy: INITIAL_STATE.subsidy,
    });
    setHistory([{ t: 0, label: "Q1 '26", gdpGrowth: 2.5, unemployment: 5.0, inflation: 2.0 }]);
    setLog([{ type: "system", text: `As chief advisor to the ${COUNTRY_NAME}, hit all three target ranges for ${WIN_STREAK} consecutive quarters to secure your legacy.` }]);
    setActivePanel(null);
    setSelectedRegion(null);
  };

  const growthInTarget = state.gdpGrowth >= TARGETS.growth.min && state.gdpGrowth <= TARGETS.growth.max;
  const unempInTarget = state.unemployment >= TARGETS.unemployment.min && state.unemployment <= TARGETS.unemployment.max;
  const inflationInTarget = state.inflation >= TARGETS.inflation.min && state.inflation <= TARGETS.inflation.max;
  const debtRatio = state.debt / state.gdp;
  const selectedRegionData = selectedRegion ? REGIONS.find((r) => r.id === selectedRegion) : null;

  return (
    <div className="min-h-screen w-full bg-[#0f1319] text-amber-50 font-[IBM_Plex_Sans] relative overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        body { font-family: 'IBM Plex Sans', system-ui, sans-serif; }
        input[type=range] { height: 2px; }
      `}</style>

      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(#c9a961 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

      <div className="relative z-10 border-b-2 border-amber-900/50 bg-gradient-to-b from-stone-950 to-stone-900/90 shadow-lg">
        <div className="max-w-[1280px] mx-auto px-5 py-2 flex items-center gap-4">
          <div className="flex items-center gap-3 pr-4 border-r border-amber-900/40">
            <div className="w-9 h-9 rounded-full bg-amber-900/30 border border-amber-600/60 flex items-center justify-center">
              <Crown size={16} className="text-amber-300" />
            </div>
            <div className="leading-tight">
              <div className="font-[Fraunces] text-[17px] text-amber-100 tracking-wide">{COUNTRY_NAME}</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-amber-200/50">Ministry of the Economy</div>
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
            <button onClick={reset} className="text-amber-200/60 hover:text-amber-100 text-[10px] uppercase tracking-[0.18em] flex items-center gap-1">
              <RotateCcw size={11} /> Reset
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
          <div className="absolute top-3 right-3 bg-stone-950/80 border border-amber-900/50 px-3 py-2 flex items-center gap-2 text-[11px] text-amber-100/90">
            <Target size={12} className="text-amber-300" />
            <span className="uppercase tracking-[0.16em] text-amber-200/60">Streak</span>
            <span className="font-[Fraunces] text-amber-200 text-[15px]">{state.inTargetStreak} / {WIN_STREAK}</span>
          </div>
        </div>

        <div className="bg-[#f2ead7] border-2 border-amber-900/60 relative max-h-[600px] overflow-y-auto"
          style={{ boxShadow: "0 0 0 1px #c9a96155 inset" }}>
          <div className="sticky top-0 bg-[#f2ead7] border-b-2 border-amber-900/40 px-4 py-2 flex items-center gap-2 z-10">
            <ScrollText size={14} className="text-stone-700" />
            <div className="font-[Fraunces] text-[16px] text-stone-900">Journal</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 ml-auto">Events & lessons</div>
          </div>
          <div className="p-3 space-y-2.5">
            {log.map((entry, i) => {
              if (entry.type === "system")
                return <div key={i} className="text-[11.5px] text-stone-600 border-l-2 border-stone-400 pl-2.5 py-0.5 italic">{entry.text}</div>;
              if (entry.type === "event")
                return (
                  <div key={i} className="border-l-2 border-amber-700 pl-2.5 py-0.5">
                    <div className="text-[9px] uppercase tracking-[0.18em] text-amber-800">Dispatch</div>
                    <div className="text-[12.5px] font-[Fraunces] text-stone-900">{entry.text}</div>
                  </div>
                );
              if (entry.type === "decision")
                return (
                  <div key={i} className="border-l-2 border-sky-800 pl-2.5 py-0.5">
                    <div className="text-[9px] uppercase tracking-[0.18em] text-sky-900">Decision</div>
                    <div className="text-[12px] text-stone-900">{entry.text}</div>
                  </div>
                );
              if (entry.type === "lesson")
                return (
                  <div key={i} className="border-l-2 border-stone-900 pl-2.5 py-0.5">
                    <div className="text-[9px] uppercase tracking-[0.18em] text-stone-600 flex items-center gap-1"><BookOpen size={9} /> Concept</div>
                    <div className="text-[12.5px] font-[Fraunces] text-stone-900">{entry.title}</div>
                    <div className="text-[11px] text-stone-700 leading-snug mt-0.5">{entry.text}</div>
                  </div>
                );
              if (entry.type === "victory")
                return <div key={i} className="border-l-2 border-emerald-700 pl-2.5 py-0.5"><div className="text-[9px] uppercase tracking-[0.18em] text-emerald-800">Victory</div><div className="text-[12px] text-stone-900">{entry.text}</div></div>;
              if (entry.type === "defeat")
                return <div key={i} className="border-l-2 border-rose-700 pl-2.5 py-0.5"><div className="text-[9px] uppercase tracking-[0.18em] text-rose-800">Collapse</div><div className="text-[12px] text-stone-900">{entry.text}</div></div>;
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
          <div className="mt-3 pt-3 border-t border-stone-300 text-[12px] text-stone-700 leading-relaxed">
            <span className="font-[Fraunces] text-[14px] text-stone-900">Primary balance: </span>
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
          <div className="mt-3 pt-3 border-t border-stone-300 text-[12px] text-stone-700 leading-relaxed">
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
          <div className="mt-3 pt-3 border-t border-stone-300 text-[12px] text-stone-700 leading-relaxed">
            Tariffs transfer welfare from consumers to protected producers and the government, but the total effect on welfare is negative. Saltmere, your shipping coast, feels the pain most directly.
          </div>
        </PanelFrame>
      )}

      {activePanel === "industry" && (
        <PanelFrame title="Ministry of Industry & Labor" subtitle="Microeconomic levers" onClose={() => setActivePanel(null)} wide>
          <PolicySlider label="Minimum wage" icon={Users} value={policies.minWage}
            onChange={(v) => setPolicies({ ...policies, minWage: v })}
            min={0.25} max={0.75} step={0.01} format={(v) => `${(v * 100).toFixed(0)}% of avg`}
            desc="A binding price floor above the market wage creates a labor surplus, especially in low productivity regions." />
          <div className="mt-5 pt-4 border-t border-stone-300">
            <div className="flex items-center gap-2 mb-2">
              <Factory size={13} className="text-stone-700" />
              <span className="text-[11.5px] uppercase tracking-[0.14em] text-stone-700">Industrial subsidy</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {SUBSIDY_OPTIONS.map((opt) => (
                <button key={opt.key} onClick={() => setPolicies({ ...policies, subsidy: opt.key })}
                  className={`text-left p-2.5 border transition-colors ${policies.subsidy === opt.key ? "border-stone-900 bg-stone-900 text-[#f2ead7]" : "border-stone-400 bg-white/40 hover:border-stone-700"}`}>
                  <div className="text-[11.5px] font-[Fraunces]">{opt.label}</div>
                  <div className={`text-[10px] mt-0.5 leading-snug ${policies.subsidy === opt.key ? "text-amber-100/80" : "text-stone-600"}`}>{opt.description}</div>
                </button>
              ))}
            </div>
            <div className="text-[11px] text-stone-600 mt-3 italic leading-snug">
              Subsidies shift the supply curve of the chosen sector rightward, increasing producer surplus and quantity but creating deadweight loss. They also add to the deficit.
            </div>
          </div>
        </PanelFrame>
      )}

      {activePanel === "charts" && (
        <PanelFrame title="Economic Records" subtitle="Time series" onClose={() => setActivePanel(null)} wide>
          <div className="flex items-center gap-4 text-[11px] text-stone-700 mb-2">
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
          <div className="grid grid-cols-3 gap-3 mt-4 text-[11px] text-stone-700">
            <div className="p-2 border border-stone-300 bg-white/40">
              <div className="uppercase tracking-[0.18em] text-stone-500 text-[9px]">Productivity index</div>
              <div className="font-[Fraunces] text-[18px] text-stone-900">{state.productivity.toFixed(3)}</div>
              <div className="text-[10.5px] leading-snug">Long run AS shifter. Rises with positive supply shocks.</div>
            </div>
            <div className="p-2 border border-stone-300 bg-white/40">
              <div className="uppercase tracking-[0.18em] text-stone-500 text-[9px]">Primary balance</div>
              <div className="font-[Fraunces] text-[18px] text-stone-900">{((state.taxRate - state.govSpendingRate) * 100).toFixed(1)}%</div>
              <div className="text-[10.5px] leading-snug">Of GDP. Negative means deficit, adds to debt each quarter.</div>
            </div>
            <div className="p-2 border border-stone-300 bg-white/40">
              <div className="uppercase tracking-[0.18em] text-stone-500 text-[9px]">Debt / GDP</div>
              <div className="font-[Fraunces] text-[18px] text-stone-900">{fmtPct(debtRatio, 0)}</div>
              <div className="text-[10.5px] leading-snug">Above 120% and bond markets get nervous.</div>
            </div>
          </div>
        </PanelFrame>
      )}

      {activePanel === "region" && selectedRegionData && (
        <PanelFrame title={selectedRegionData.name} subtitle={selectedRegionData.industry}
          onClose={() => { setActivePanel(null); setSelectedRegion(null); }}>
          <div className="text-[13px] text-stone-800 leading-relaxed space-y-3">
            <div><span className="font-[Fraunces] text-stone-900">Share of national output:</span> {(selectedRegionData.share * 100).toFixed(0)}%</div>
            <div>
              <span className="font-[Fraunces] text-stone-900">Sensitivities:</span>
              <ul className="mt-1 pl-4 text-[12px] space-y-0.5">
                <li>Tariff response: {selectedRegionData.sensitivity.tariff > 0 ? "benefits from protection" : "hurt by protection"}</li>
                <li>Minimum wage: {selectedRegionData.sensitivity.minWage < -0.4 ? "very sensitive" : "moderate sensitivity"}</li>
                <li>Interest rate: {selectedRegionData.sensitivity.rate < -0.8 ? "highly rate-sensitive" : "moderately rate-sensitive"}</li>
                <li>Subsidy match: {selectedRegionData.sensitivity.subsidyKey !== "none" ? selectedRegionData.sensitivity.subsidyKey : "none available"}</li>
              </ul>
            </div>
            <div className="pt-2 border-t border-stone-300 text-[11.5px] italic text-stone-600">
              Different regions respond differently to the same policy. This is structural heterogeneity, and it is why national averages can hide regional pain.
            </div>
          </div>
        </PanelFrame>
      )}

      {state.pendingEvent && (
        <PanelFrame title={state.pendingEvent.headline} subtitle="Decision required" onClose={() => {}} wide hideClose>
          <div className="text-[13px] text-stone-800 mb-4">{state.pendingEvent.body}</div>
          <div className="grid grid-cols-2 gap-3">
            {state.pendingEvent.options.map((opt, i) => (
              <button key={i} onClick={() => resolveEvent(opt)}
                className="text-left p-4 border-2 border-stone-400 bg-white/50 hover:bg-stone-900 hover:text-[#f2ead7] hover:border-stone-900 transition-colors group">
                <div className="font-[Fraunces] text-[16px] mb-1">{opt.label}</div>
                <div className="text-[11.5px] text-stone-600 group-hover:text-amber-100/80 italic">{opt.blurb}</div>
              </button>
            ))}
          </div>
        </PanelFrame>
      )}
    </div>
  );
}
