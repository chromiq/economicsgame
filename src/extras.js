// ============================================================
// ACHIEVEMENTS
// Sarcastic, funny, sometimes hidden milestones
// ============================================================

export const ACHIEVEMENTS = [
  // ---- Speed / failure achievements ----
  { key: "speedrun_collapse", title: "Speedrun the Collapse", icon: "💀", hidden: true,
    description: "Lose the entire campaign in your very first quarter.",
    check: (s, prev) => s.gameOver && !s.victory && s.turn <= 1 },
  { key: "one_term", title: "One-Term Wonder", icon: "🫠", hidden: false,
    description: "Lose the campaign before Turn 10. A swift and decisive failure.",
    check: (s) => s.gameOver && !s.victory && s.turn < 10 },
  { key: "shelf_life", title: "Cling to Power", icon: "⏳", hidden: false,
    description: "Survive 50 turns in a single campaign. Historic tenure.",
    check: (s) => s.turn >= 50 && !s.gameOver },

  // ---- Unemployment extremes ----
  { key: "invisible_hand", title: "Invisible Hand, Visible Shoulders", icon: "🧤", hidden: false,
    description: "Keep unemployment below 2.5% for two consecutive quarters. Adam Smith would cackle.",
    check: (s, p, hist) => hist.length >= 2 && hist.slice(-2).every(h => h.unemployment < 2.5) },
  { key: "breadlines", title: "Vibrant Soup Kitchen Economy", icon: "🍜", hidden: false,
    description: "Keep unemployment above 12% for two consecutive quarters. The queues are thriving.",
    check: (s, p, hist) => hist.length >= 2 && hist.slice(-2).every(h => h.unemployment > 12) },

  // ---- Inflation extremes ----
  { key: "weimar_vibes", title: "Wheelbarrow Discourse", icon: "🛒", hidden: false,
    description: "Push inflation above 15% for two consecutive quarters. Bread is now an investment vehicle.",
    check: (s, p, hist) => hist.length >= 2 && hist.slice(-2).every(h => h.inflation > 15) },
  { key: "japan_core", title: "Embraced the Deflation", icon: "❄️", hidden: false,
    description: "Keep inflation negative for two consecutive quarters. Prices are falling. So is hope.",
    check: (s, p, hist) => hist.length >= 2 && hist.slice(-2).every(h => h.inflation < 0) },
  { key: "volcker_moment", title: "Channeled Volcker", icon: "🗡️", hidden: false,
    description: "Break inflation from above 10% down to under 3% within a single campaign.",
    check: (s, p, hist) => {
      const maxI = Math.max(...hist.map(h => h.inflation));
      return maxI > 10 && s.inflation * 100 < 3;
    } },

  // ---- Weird combinations ----
  { key: "phillips_who", title: "Phillips Who?", icon: "📐", hidden: true,
    description: "Achieve inflation below 2% AND unemployment below 3% simultaneously. Macroeconomics in shambles.",
    check: (s) => s.inflation < 0.02 && s.unemployment < 0.03 },
  { key: "stagflation_mood", title: "Living the 70s", icon: "🕺", hidden: false,
    description: "Simultaneously hold inflation above 8% and unemployment above 8%.",
    check: (s) => s.inflation > 0.08 && s.unemployment > 0.08 },

  // ---- Policy obsessions ----
  { key: "print_go_brrr", title: "Printer Goes Brrr", icon: "🖨️", hidden: false,
    description: "Run money supply growth above 10% for four consecutive quarters. Consequences pending.",
    check: (s, p, hist, log, ctx) => ctx.counters.printBrrr >= 4 },
  { key: "tariff_enjoyer", title: "Tariff Connoisseur", icon: "⚓", hidden: false,
    description: "Keep tariffs above 15% for five consecutive quarters. Smoot and Hawley are smiling somewhere.",
    check: (s, p, hist, log, ctx) => ctx.counters.tariffHigh >= 5 },
  { key: "free_trader", title: "Ricardo's Disciple", icon: "🌐", hidden: false,
    description: "Hold tariffs at zero for ten consecutive quarters. Comparative advantage, baby.",
    check: (s, p, hist, log, ctx) => ctx.counters.zeroTariff >= 10 },
  { key: "austerity_fan", title: "Iron Chancellor", icon: "📏", hidden: false,
    description: "Hold government spending below 13% for eight consecutive quarters.",
    check: (s, p, hist, log, ctx) => ctx.counters.austerity >= 8 },

  // ---- Approval extremes ----
  { key: "hated", title: "Universally Despised", icon: "🖕", hidden: false,
    description: "Let approval fall below 15% and survive four more quarters. Impressive staying power.",
    check: (s, p, hist, log, ctx) => ctx.counters.hated >= 4 && !s.gameOver },
  { key: "cult", title: "Cult of Personality", icon: "👑", hidden: false,
    description: "Sustain approval above 90% for four consecutive quarters. Suspicious, honestly.",
    check: (s, p, hist, log, ctx) => ctx.counters.adored >= 4 },

  // ---- Debt extremes ----
  { key: "debt_hoarder", title: "Debt Hoarder", icon: "📉", hidden: true,
    description: "Push debt-to-GDP above 150% without losing the campaign.",
    check: (s) => (s.debt / s.gdp) > 1.5 && !s.gameOver },
  { key: "debt_clear", title: "Fiscal Saint", icon: "✨", hidden: false,
    description: "Bring debt-to-GDP below 40% at any point.",
    check: (s) => (s.debt / s.gdp) < 0.4 },

  // ---- Victory achievements ----
  { key: "first_victory", title: "First Mandate", icon: "🏅", hidden: false,
    description: "Win any campaign.",
    check: (s) => s.victory },
  { key: "autocrat_victory", title: "Absolute Ruler", icon: "🔥", hidden: false,
    description: "Win a campaign on Autocrat difficulty. Respect.",
    check: (s) => s.victory && s.difficulty === "autocrat" },
  { key: "depression_survivor", title: "Weathered the Storm", icon: "☔", hidden: false,
    description: "Complete the Great Depression scenario.",
    check: (s) => s.victory && s.scenarioKey === "depression1929" },
  { key: "paid_the_price", title: "Paid the Price", icon: "⚒️", hidden: false,
    description: "Complete the Volcker scenario. Inflation is dead, and you killed it.",
    check: (s) => s.victory && s.scenarioKey === "volcker1981" },
  { key: "pandemic_survivor", title: "Learned to Live With It", icon: "😷", hidden: false,
    description: "Complete the Pandemic scenario.",
    check: (s) => s.victory && s.scenarioKey === "pandemic2020" },

  // ---- Uncanny ones ----
  { key: "perfect_quarter", title: "The One Good Quarter", icon: "🎯", hidden: false,
    description: "Hit every target simultaneously within the first 5 turns. A fluke, surely.",
    check: (s) => s.turn <= 5 && s.inTargetStreak >= 1 },
  { key: "rollercoaster", title: "Macroeconomic Rollercoaster", icon: "🎢", hidden: true,
    description: "Swing growth by more than 8 percentage points quarter-over-quarter.",
    check: (s, p, hist) => {
      if (hist.length < 2) return false;
      const last = hist[hist.length - 1].gdpGrowth;
      const prev = hist[hist.length - 2].gdpGrowth;
      return Math.abs(last - prev) > 8;
    } },
  { key: "all_techs", title: "Institutional Architect", icon: "🏛️", hidden: false,
    description: "Unlock every Institution in one campaign.",
    check: (s) => (s.unlockedTech || []).length >= 8 },
];

// Run a fresh pass over all achievements and return newly unlocked keys
export function checkAchievements(state, prevState, history, log, counters, alreadyUnlocked) {
  const newly = [];
  const ctx = { counters };
  for (const a of ACHIEVEMENTS) {
    if (alreadyUnlocked.includes(a.key)) continue;
    try {
      if (a.check(state, prevState, history, log, ctx)) newly.push(a.key);
    } catch (e) { /* defensive: skip failing check */ }
  }
  return newly;
}

// Update rolling counters used by some achievements
export function updateCounters(counters, state, policies) {
  const c = { ...counters };
  c.printBrrr = policies.moneyGrowth > 0.1 ? (c.printBrrr || 0) + 1 : 0;
  c.tariffHigh = policies.tariff > 0.15 ? (c.tariffHigh || 0) + 1 : 0;
  c.zeroTariff = policies.tariff <= 0.001 ? (c.zeroTariff || 0) + 1 : 0;
  c.austerity = policies.govSpendingRate < 0.13 ? (c.austerity || 0) + 1 : 0;
  c.hated = state.approval < 15 ? (c.hated || 0) + 1 : 0;
  c.adored = state.approval > 90 ? (c.adored || 0) + 1 : 0;
  return c;
}

const UNLOCKS_KEY = "aurelia_achievements_v1";
export function loadUnlocks() {
  try { return JSON.parse(localStorage.getItem(UNLOCKS_KEY) || "[]"); } catch { return []; }
}
export function saveUnlocks(list) {
  try { localStorage.setItem(UNLOCKS_KEY, JSON.stringify(list)); } catch {}
}

// ============================================================
// GLOBAL GDP RANKING
// Top 30 real economies with 2026 approximated GDPs in billions USD
// ============================================================

export const WORLD_GDP_2026 = [
  { name: "United States", flag: "🇺🇸", gdp: 28800, growth: 0.022 },
  { name: "China", flag: "🇨🇳", gdp: 19400, growth: 0.045 },
  { name: "Germany", flag: "🇩🇪", gdp: 4580, growth: 0.009 },
  { name: "Japan", flag: "🇯🇵", gdp: 4200, growth: 0.008 },
  { name: "India", flag: "🇮🇳", gdp: 4100, growth: 0.065 },
  { name: "United Kingdom", flag: "🇬🇧", gdp: 3580, growth: 0.014 },
  { name: "France", flag: "🇫🇷", gdp: 3220, growth: 0.012 },
  { name: "Italy", flag: "🇮🇹", gdp: 2330, growth: 0.007 },
  { name: "Brazil", flag: "🇧🇷", gdp: 2300, growth: 0.025 },
  { name: "Canada", flag: "🇨🇦", gdp: 2240, growth: 0.017 },
  { name: "Russia", flag: "🇷🇺", gdp: 2100, growth: 0.015 },
  { name: "South Korea", flag: "🇰🇷", gdp: 1870, growth: 0.022 },
  { name: "Australia", flag: "🇦🇺", gdp: 1800, growth: 0.020 },
  { name: "Mexico", flag: "🇲🇽", gdp: 1790, growth: 0.022 },
  { name: "Spain", flag: "🇪🇸", gdp: 1620, growth: 0.018 },
  { name: "Indonesia", flag: "🇮🇩", gdp: 1520, growth: 0.051 },
  { name: "Turkey", flag: "🇹🇷", gdp: 1430, growth: 0.030 },
  { name: "Netherlands", flag: "🇳🇱", gdp: 1130, growth: 0.013 },
  { name: "Saudi Arabia", flag: "🇸🇦", gdp: 1100, growth: 0.028 },
  { name: "Switzerland", flag: "🇨🇭", gdp: 950, growth: 0.011 },
  { name: "Poland", flag: "🇵🇱", gdp: 880, growth: 0.032 },
  { name: "Taiwan", flag: "🇹🇼", gdp: 830, growth: 0.028 },
  { name: "Belgium", flag: "🇧🇪", gdp: 710, growth: 0.010 },
  { name: "Argentina", flag: "🇦🇷", gdp: 680, growth: 0.018 },
  { name: "Sweden", flag: "🇸🇪", gdp: 640, growth: 0.013 },
  { name: "Ireland", flag: "🇮🇪", gdp: 620, growth: 0.030 },
  { name: "Thailand", flag: "🇹🇭", gdp: 580, growth: 0.028 },
  { name: "Israel", flag: "🇮🇱", gdp: 550, growth: 0.020 },
  { name: "Norway", flag: "🇳🇴", gdp: 520, growth: 0.011 },
  { name: "Austria", flag: "🇦🇹", gdp: 510, growth: 0.010 },
];

// Difficulty multiplier on world GDP growth (makes the rest grow faster on harder)
const DIFF_WORLD_MULT = { advisor: 0.7, minister: 1.0, chancellor: 1.25, autocrat: 1.5 };

// Advance the whole world by one quarter. Adds mild noise.
export function advanceWorld(snapshot, difficulty) {
  const mult = DIFF_WORLD_MULT[difficulty] || 1.0;
  return snapshot.map((c) => {
    const noise = (Math.random() - 0.5) * 0.01;
    const quarterlyGrowth = (c.growth * mult) / 4 + noise;
    return { ...c, gdp: c.gdp * (1 + quarterlyGrowth) };
  });
}

export function buildRanking(worldSnapshot, userCountryName, userGdp, userFlag) {
  const user = { name: userCountryName, flag: userFlag || "🏛️", gdp: userGdp, isUser: true };
  const combined = [...worldSnapshot.map(c => ({ ...c, isUser: false })), user];
  return combined.sort((a, b) => b.gdp - a.gdp);
}

// ============================================================
// STAT TIPS (difficulty-scaled hints for clickable stats)
// ============================================================

export function getStatTip(statKey, state, targets, difficulty) {
  const tips = {
    growth: {
      low: {
        advisor: "Growth is soft. The classic move is expansionary fiscal policy: raise spending or cut taxes to lift aggregate demand. If inflation is also low, the central bank can also cut rates to pull forward investment. Both levers together usually produce a clear bounce in two to three quarters.",
        minister: "Growth is soft. Loosen fiscal or monetary policy: more government spending, lower taxes, or a rate cut. Watch for crowding out if debt is already high.",
        chancellor: "Growth below target. Stimulate, but mind side effects.",
        autocrat: "Growth weak. Act.",
      },
      high: {
        advisor: "Growth is running above the target range. This sounds good but it usually means the economy is overheating, which feeds inflation. The standard response is to tighten: raise taxes, cut spending, or raise rates. One of those three is usually enough to pull growth into the target window.",
        minister: "Overheating. Tighten policy to pull growth into the target band before inflation runs away.",
        chancellor: "Growth too high. Expect inflation consequences soon.",
        autocrat: "Overheating. Tighten.",
      },
      ok: { advisor: "Growth is on target. Hold steady.", minister: "On target.", chancellor: "On target.", autocrat: "On target." },
    },
    unemployment: {
      low: {
        advisor: "Unemployment is below the target floor. Sounds great but it's actually an overheating signal: wages will start pushing up inflation (the Phillips curve). Consider raising rates slightly or tightening fiscal policy to cool the labor market before inflation builds.",
        minister: "Below the natural rate. Expect wage-price pressure. Tighten modestly.",
        chancellor: "Labor market too hot.",
        autocrat: "Hot labor market.",
      },
      high: {
        advisor: "Unemployment is too high. The cleanest fix is stimulating aggregate demand: spend more, cut taxes, or cut rates. Be careful with minimum wage right now, since raising the wage floor makes unemployment worse when it's already elevated.",
        minister: "Stimulate AD. Avoid raising the minimum wage in a weak labor market.",
        chancellor: "Stimulate.",
        autocrat: "Stimulate.",
      },
      ok: { advisor: "Unemployment is in range.", minister: "On target.", chancellor: "On target.", autocrat: "On target." },
    },
    inflation: {
      low: {
        advisor: "Inflation is below target or even negative. Deflation is a trap: it raises the real cost of debt and makes consumers delay spending. Cut interest rates, expand the money supply, or loosen fiscal policy. Japan spent three decades in this trap.",
        minister: "Below target. Loosen. Watch for deflation spirals.",
        chancellor: "Too cold.",
        autocrat: "Too cold.",
      },
      high: {
        advisor: "Inflation is above target. The primary tool is the central bank: raise interest rates. You can also reduce money supply growth, cut government spending, or lower tariffs (tariffs directly push prices up). Quick action prevents expectations from unanchoring, which makes the problem much harder.",
        minister: "Tighten: raise rates, slow money growth, trim spending. Lower tariffs cut some input-price pressure.",
        chancellor: "Tighten fast.",
        autocrat: "Tighten.",
      },
      ok: { advisor: "Inflation is in range. Your credibility is building.", minister: "On target.", chancellor: "On target.", autocrat: "On target." },
    },
    debt: {
      low: { advisor: "Debt is healthy. You have room to borrow in a future crisis without markets panicking.", minister: "Healthy.", chancellor: "Healthy.", autocrat: "Healthy." },
      high: {
        advisor: "Debt-to-GDP is climbing into danger territory. Interest payments are eating the budget. To reduce it: run primary surpluses (taxes higher than spending), grow GDP faster, or tolerate a bit of inflation which erodes the real debt. Above 200% of GDP the game ends.",
        minister: "Climbing. Run primary surpluses or grow out of it.",
        chancellor: "Danger.",
        autocrat: "Danger.",
      },
      ok: { advisor: "Debt is manageable.", minister: "OK.", chancellor: "OK.", autocrat: "OK." },
    },
    approval: {
      low: {
        advisor: "Approval is low. The biggest drivers are unemployment and inflation. Get those into the target range, even temporarily, and approval rebounds. Tax hikes above 30% also bleed approval, so watch that lever.",
        minister: "Fix unemployment and inflation. Approval follows.",
        chancellor: "Fix macro.",
        autocrat: "Fix macro.",
      },
      high: { advisor: "High approval. You have political capital to take harder decisions now.", minister: "Strong.", chancellor: "Strong.", autocrat: "Strong." },
      ok: { advisor: "Approval is stable.", minister: "OK.", chancellor: "OK.", autocrat: "OK." },
    },
    gdp: {
      ok: {
        advisor: "GDP is the size of the economy. It grows from the compounding effect of quarterly growth rates. Unlock Institutions to raise long-run productivity.",
        minister: "Compounds over time. Unlock institutions for long-run productivity.",
        chancellor: "Compound.",
        autocrat: "Compound.",
      },
    },
  };
  const tier = difficulty;
  const group = tips[statKey];
  if (!group) return "";
  // Classify state relative to targets
  let mood = "ok";
  if (statKey === "growth") {
    if (state.gdpGrowth < targets.growth.min) mood = "low";
    else if (state.gdpGrowth > targets.growth.max) mood = "high";
  } else if (statKey === "unemployment") {
    if (state.unemployment < targets.unemployment.min) mood = "low";
    else if (state.unemployment > targets.unemployment.max) mood = "high";
  } else if (statKey === "inflation") {
    if (state.inflation < targets.inflation.min) mood = "low";
    else if (state.inflation > targets.inflation.max) mood = "high";
  } else if (statKey === "debt") {
    const r = state.debt / state.gdp;
    if (r < 0.6) mood = "low"; else if (r > 1.1) mood = "high"; else mood = "ok";
  } else if (statKey === "approval") {
    if (state.approval > 70) mood = "high";
    else if (state.approval < 35) mood = "low";
    else mood = "ok";
  }
  return (group[mood] && group[mood][tier]) || (group.ok && group.ok[tier]) || "";
}

// ============================================================
// CHEAT MENU
// Access code: aureliacheat1
// ============================================================

export const CHEAT_CODE = "aureliacheat1";

export const CHEATS = [
  { key: "gift_gdp", label: "Economic Miracle", icon: "💰",
    description: "Adds 20% to current GDP. No strings attached.",
    apply: (s) => ({ ...s, gdp: s.gdp * 1.2 }) },
  { key: "clear_debt", label: "Jubilee", icon: "🧼",
    description: "Wipes all outstanding debt to zero.",
    apply: (s) => ({ ...s, debt: 0 }) },
  { key: "max_approval", label: "Loved by Millions", icon: "❤️",
    description: "Sets approval to 100%.",
    apply: (s) => ({ ...s, approval: 100 }) },
  { key: "tech_points", label: "Institutional Windfall", icon: "🏛️",
    description: "Adds 10 tech points.",
    apply: (s) => ({ ...s, techPoints: (s.techPoints || 0) + 10 }) },
  { key: "all_techs", label: "Enlightenment", icon: "✨",
    description: "Instantly unlocks every economic institution.",
    apply: (s) => ({ ...s, unlockedTech: ["independentCB", "automaticStabilizers", "floatingExchange", "depositInsurance", "progressiveTax", "freeTradeAgreement", "inflationTargeting", "welfareState"] }) },
  { key: "perfect_macro", label: "Reset to Target", icon: "🎯",
    description: "Snaps growth, unemployment, and inflation to their target centers.",
    apply: (s) => ({ ...s, gdpGrowth: 0.03, unemployment: 0.04, inflation: 0.0225 }) },
  { key: "skip_event", label: "Dismiss the Crisis", icon: "🚪",
    description: "Cancels the current pending decision, if any.",
    apply: (s) => ({ ...s, pendingEvent: null }) },
  { key: "force_streak", label: "Pad the Résumé", icon: "📜",
    description: "Adds 3 to the current target streak.",
    apply: (s) => ({ ...s, inTargetStreak: s.inTargetStreak + 3 }) },
  { key: "big_win", label: "Declare Mission Accomplished", icon: "🏆",
    description: "Immediate victory. Some people would call this unearned.",
    apply: (s) => ({ ...s, gameOver: true, victory: true }) },
  { key: "reset_stats", label: "Fresh Start", icon: "🔄",
    description: "Returns you to starting values without losing your tech or turn count.",
    apply: (s) => ({ ...s, gdp: 1000, gdpGrowth: 0.025, unemployment: 0.05, inflation: 0.02, interestRate: 0.03, debt: 500, approval: 60 }) },
];
