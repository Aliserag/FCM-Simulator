# FCM Simulator - Technical Documentation

## CRITICAL: FCM Protocol Specification

**ALWAYS refer to this document when implementing or modifying FCM behavior.**
**DO NOT hallucinate or invent functionality outside this specification.**

### FCM Health Thresholds (Optimized for Historic Data)

| Threshold | Value | Purpose |
|-----------|-------|---------|
| **Minimum Health** | **1.05** | Triggers downward rebalance (~9% price drop) |
| **Target Health** | **1.15** | Initial borrow target, health restored after rebalancing |
| **Maximum Health** | **1.30** | Triggers upward rebalance (~13% price increase) |
| **Liquidation** | **1.0** | Position liquidated, 5% penalty |

### Why These Values Matter

- **At health 1.15**: Both Traditional and FCM start with ~13% buffer before liquidation
- **At health 1.05 (~9% drop)**: FCM rebalances BEFORE Traditional liquidates, restoring to 1.15
- **At ~13% drop**: Traditional gets liquidated (health 1.0), FCM already rebalanced and survives
- **At health 1.30 (~13% gain)**: FCM leverages up in bull markets (buys more collateral with borrowed funds)

### The Key Differentiation
Both positions start at identical targetHealth 1.15. The difference is:
- **Traditional**: No rebalancing, liquidated when health drops below 1.0 (~13% price drop)
- **FCM**: Rebalances at health 1.05 (~9% drop), restores to 1.15, survives the crash

### FCM Formula Reference

```
Health Factor = (Collateral x Price x Collateral Factor) / Debt
Initial Borrow = (Collateral x Price x 0.80) / 1.15 = ~69.5% LTV
```

---

## What is This App?

An **interactive educational simulator** comparing Traditional DeFi Lending (Aave/Compound style) vs Flow Credit Market (FCM) lending. It demonstrates how FCM's automatic rebalancing protects users from liquidation during market crashes while maximizing returns in bull markets.

**Tagline**: *"Sleep through the next Crash. Wake up wealthy."*

---

## Historic Price Data

**Data Source**: Real daily closing prices from **Coinbase via CCXT**
**Date Range**: January 1, 2020 - December 5, 2025 (~2,166 days per token)

| Year | BTC Jan 1 | ETH Jan 1 | Days | Avg Supply APY |
|------|-----------|-----------|------|----------------|
| 2020 | $7,174 | $130 | 366 (leap) | 2.5% |
| 2021 | $29,412 | $730 | 365 | 4.0% |
| 2022 | $46,311 | $3,682 | 365 | 3.0% |
| 2023 | $16,530 | $1,195 | 365 | 4.0% |
| 2024 | $42,266 | $2,281 | 366 (leap) | 5.0% |
| 2025 | $93,429 | $3,329 | ~339 | 5.0% |

**Black Swan Events** (marked on chart):
- **COVID-19 Crash** (March 12, 2020): -47% in 26 days
- **LUNA Collapse** (May 9, 2022): -30%
- **FTX Collapse** (November 6, 2022): -25%

**Files**:
- `src/data/realPrices.ts` - Raw daily price arrays (~36KB embedded data)
- `src/data/multiYearPrices.ts` - Price lookup functions
- `src/data/blackSwanEvents.ts` - COVID, LUNA, FTX crash dates

---

## Core Mechanics

### Health Factor
The fundamental metric for lending position safety:

```
Health Factor = (Collateral x Price x CollateralFactor) / Debt
```

- **Collateral Factor**: 80% (only 80% of collateral counts as borrowing power)
- **Health > 1.0**: Position is safe
- **Health < 1.0**: Position gets liquidated (user loses collateral + 5% penalty)

### Initial Position Setup
When a user deposits collateral:
1. Deposit tokens (e.g., $1000 worth of BTC/ETH)
2. Borrow stablecoins at **Target Health 1.15**
3. Initial borrow = `(Collateral x Price x 0.80) / 1.15` = **69.5% LTV**

---

## Dynamic Volatility-Based Thresholds

FCM adapts to market conditions using rolling 30-day volatility:

| Volatility Tier | Max Vol | minHealth | targetHealth | maxHealth |
|-----------------|---------|-----------|--------------|-----------|
| Low | <=50% | 1.05 | 1.15 | 1.30 |
| Medium | <=80% | 1.07 | 1.18 | 1.35 |
| High | <=120% | 1.10 | 1.22 | Infinity (disabled) |
| Extreme | >120% | 1.15 | 1.30 | Infinity (disabled) |

**Key insight**: During high volatility (like COVID crash), leverage-up is DISABLED and thresholds become more conservative to prioritize survival.

**Code location**: `src/lib/constants.ts` - `VOLATILITY_THRESHOLDS`

---

## FCM's Automatic Rebalancing

### Downward Rebalancing (Protection Mode)
**Trigger**: Health Factor drops below **minHealth** (1.05 in low vol)

**What happens**:
1. FCM detects health < 1.05 (~9% price drop from start)
2. Automatically sells collateral to repay debt
3. Restores health to **1.15** (targetHealth)
4. Position survives crashes that would liquidate traditional positions (~13% drop)

**Code location**: `src/lib/simulation/fcm.ts`

### Upward Rebalancing (Growth Mode)
**Trigger**: Health Factor rises above **maxHealth** (1.30 in low vol)

**Additional Requirements** (to prevent over-leveraging before crashes):
- Require 7+ consecutive days of price increases
- Volatility must be < 80% (low-medium volatility environment)
- Only leverage up 75% toward target (gradual, not aggressive)

**What happens**:
1. FCM detects position is overcollateralized (health > 1.30)
2. Borrows more stablecoins against excess collateral
3. Uses borrowed funds to buy MORE collateral (recursive leverage)
4. Partially restores health toward **1.15** (targetHealth)
5. Results in higher leveraged returns in bull markets

**Code location**: `src/lib/simulation/fcm.ts`

### Intraday Health Monitoring
FCM simulates Flow's scheduled transaction system with **4 intraday checkpoints** (every 6 hours). This allows FCM to survive sharp single-day crashes (like COVID's 38.81% drop on March 12, 2020) by rebalancing before the full daily drop is realized.

**Code location**: `src/lib/constants.ts` - `INTRADAY_CHECKPOINTS = 4`

---

## FCM's Automatic Yield Management

### How Yield Works
Collateral deposited in FCM earns supply APY based on the year:

| Year | Supply APY |
|------|------------|
| 2020 | 2.5% |
| 2021 | 4.0% |
| 2022 | 3.0% |
| 2023 | 4.0% |
| 2024-2025 | 5.0% |

### Conditional Yield Application
FCM applies yield differently based on health status:

**When Health < 1.15 (Protection Mode)**:
- Yield is automatically applied to reduce debt
- Provides extra protection during market downturns

**When Health >= 1.15 (Growth Mode)**:
- Yield is retained/accumulated
- Allows health to rise naturally
- Enables upward rebalancing triggers for more leverage

---

## Automatic Compounding

### Interest on Debt (Both Positions)
- Default Borrow APY: **6.5%**
- Compounds daily: `debt += (debt x borrowAPY) / 365`
- Shown in transaction log as monthly summaries

### Yield on Collateral (FCM Only)
- Earns year-specific supply APY daily
- Compounds into accumulated yield or debt reduction
- Traditional lending does NOT auto-compound yield

---

## Simulated Mode - Preset Scenarios

| Scenario | Price Change | Volatility | Pattern | Description |
|----------|--------------|------------|---------|-------------|
| **Crash** | -40% | high | crash | Sharp drop, minimal recovery |
| **Decline** | -25% | low | linear | Gradual decline over time |
| **V-Shape** | +10% | high | v_shape | Crash then strong recovery |
| **Bull Run** | +80% | low | linear | Steady growth |
| **Rate Hike** | -10% | medium | linear | +3% borrow rate, price decline |

### Custom Parameters Available
Users can customize scenarios with:

| Parameter | Options | Description |
|-----------|---------|-------------|
| Price Change | -99% to +1000% | Target price movement |
| Pattern | linear, crash, v_shape, bull | Price movement shape |
| Volatility | low, medium, high | Day-to-day variation |
| Borrow APY | Custom % | Override default 6.5% |
| Supply APY | Custom % | Override token default |
| Collateral Factor | 50-90% | LTV ratio |
| FCM Min Health | Custom | Rebalance trigger |
| FCM Target Health | Custom | Rebalance restore target |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/constants.ts` | Protocol config, thresholds, scenarios, INTRADAY_CHECKPOINTS |
| `src/lib/simulation/fcm.ts` | FCM rebalancing logic (up/down) |
| `src/lib/simulation/traditional.ts` | Traditional lending (no protection) |
| `src/lib/simulation/calculations.ts` | Health factor, volatility math |
| `src/lib/simulation/engine.ts` | Orchestrates both simulations |
| `src/lib/simulation/events.ts` | Transaction log event generation |
| `src/data/realPrices.ts` | Real daily BTC/ETH prices (2,169 per token) |
| `src/data/multiYearPrices.ts` | Price lookup functions for multi-year mode |
| `src/data/blackSwanEvents.ts` | COVID, LUNA, FTX crash dates |
| `src/data/historicPrices.ts` | Token configs and single-year data |
| `src/hooks/useSimulation.ts` | React state management |
| `src/components/SimulationChart.tsx` | Recharts visualization |
| `src/app/page.tsx` | Main UI |

---

## Why FCM Wins

| Aspect | Traditional | FCM |
|--------|-------------|-----|
| Downward Rebalancing | None (manual only) | Automatic at HF < 1.05 |
| Upward Rebalancing | None | Automatic at HF > 1.30 |
| Yield Management | Manual claim | Auto-applied based on health |
| Liquidation Risk | High (HF < 1.0 = total loss) | Low (rebalancing prevents it) |
| Bull Market Returns | Standard | Higher (recursive leverage) |
| Bear Market Survival | Often liquidated | Survives through rebalancing |
| Required Monitoring | Constant | None (fully automated) |

---

## Implementation Notes

When modifying FCM simulation logic:

1. **ALWAYS use these thresholds**: minHealth=1.05, targetHealth=1.15, maxHealth=1.30
2. **NEVER invent new mechanics** not described in this document
3. **Leverage-up requires**: 7+ consecutive up days AND volatility < 80%
4. **Leverage-up is meaningful**: 75% toward target for real gains
5. **High volatility disables leverage-up**: maxHealth = Infinity when vol > 80%
6. **Expected behavior**: FCM survives crashes via rebalancing at ~9% drop, Traditional gets liquidated at ~13% drop
7. **Both start at same LTV**: Initial borrow at targetHealth 1.15 (~69.5% LTV) for both Traditional and FCM
8. **Intraday checkpoints**: 4 per day to survive single-day crashes
9. **Data ends Dec 5, 2025**: Simulation has 3-day buffer to prevent running beyond available data
