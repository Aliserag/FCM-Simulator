# FCM Simulator - Technical Documentation

## What is This App?

An **interactive educational simulator** comparing Traditional DeFi Lending (Aave/Compound style) vs Flow Credit Market (FCM) lending. It demonstrates how FCM's automatic rebalancing protects users from liquidation during market crashes while maximizing returns in bull markets.

**Tagline**: *"Sleep through the next Crash. Wake up wealthy."*

---

## Core Mechanics

### Health Factor
The fundamental metric for lending position safety:

```
Health Factor = (Collateral × Price × Collateral Factor) / Debt
```

- **Collateral Factor**: 80% (only 80% of collateral counts as borrowing power)
- **Health > 1.0**: Position is safe
- **Health < 1.0**: Position gets liquidated (user loses collateral + 5% penalty)

### Initial Position Setup
When a user deposits collateral:
1. Deposit tokens (e.g., $1000 worth of ETH)
2. Borrow stablecoins at **Target Health 1.4**
3. Initial borrow = `(Collateral × Price × 0.80) / 1.4` ≈ 57% LTV

---

## FCM's Automatic Rebalancing

### Downward Rebalancing (Protection Mode)
**Trigger**: Health Factor drops below **1.2** (minHealth)

**What happens**:
1. FCM detects health < 1.2
2. Automatically sells collateral to repay debt
3. Restores health to **1.4** (targetHealth)
4. Position survives crashes that would liquidate traditional positions

**Code location**: `src/lib/simulation/fcm.ts` lines 209-244

```typescript
if (currentHealth < fcmMinHealth && currentHealth > 0) {
  // Calculate repay amount to restore target health
  const repayAmount = calculateRebalanceRepayAmount(...)
  // Sell collateral, repay debt
  state.collateralAmount -= collateralToSell
  state.debtAmount -= repayAmount
  state.rebalanceCount++
}
```

### Upward Rebalancing (Growth Mode)
**Trigger**: Health Factor rises above **1.6** (maxHealth)

**What happens**:
1. FCM detects position is overcollateralized (health > 1.6)
2. Borrows more stablecoins against excess collateral
3. Uses borrowed funds to buy MORE collateral (recursive leverage)
4. Restores health to **1.4** (targetHealth)
5. Results in higher leveraged returns in bull markets

**Code location**: `src/lib/simulation/fcm.ts` lines 249-266

```typescript
if (currentHealth > fcmMaxHealth) {
  const targetDebt = effectiveCollateral / fcmTargetHealth
  const additionalBorrow = targetDebt - state.debtAmount
  // Borrow more, buy more collateral
  state.debtAmount += additionalBorrow
  state.collateralAmount += additionalBorrow / dayPrice
  state.leverageUpCount++
}
```

---

## FCM's Automatic Yield Management

### How Yield Works
Collateral deposited in FCM earns supply APY:
- **ETH**: 2.5% APY
- **BTC**: 1.5% APY
- **SOL**: 5.0% APY
- **AVAX**: 4.0% APY

### Conditional Yield Application
FCM applies yield differently based on health status:

**When Health < 1.4 (Protection Mode)**:
- Yield is automatically applied to reduce debt
- Provides extra protection during market downturns
- Code: `src/lib/simulation/fcm.ts` lines 202-206

**When Health ≥ 1.4 (Growth Mode)**:
- Yield is retained/accumulated
- Allows health to rise naturally
- Enables upward rebalancing triggers for more leverage

```typescript
if (currentHealth < fcmTargetHealth && state.accumulatedYield > 0) {
  const yieldToApply = Math.min(state.accumulatedYield, state.debtAmount)
  state.debtAmount -= yieldToApply
  state.accumulatedYield -= yieldToApply
}
```

---

## Automatic Compounding

### Interest on Debt (Both Positions)
- Default Borrow APY: **6.5%**
- Compounds daily: `debt += (debt × borrowAPY) / 365`
- Shown in transaction log as monthly summaries

### Yield on Collateral (FCM Only)
- Earns token-specific supply APY daily
- Compounds into accumulated yield or debt reduction
- Traditional lending does NOT auto-compound yield

---

## Historic Mode - Real Price Data

### Data Source
**Real daily closing prices** from Coinbase (via CCXT library) for 2020-2025:
- **2,169 actual daily prices per token**
- Date range: January 1, 2020 - December 8, 2025
- Accounts for leap years (2020, 2024)

**Files**:
- `src/data/realPrices.ts` - Raw daily price arrays (~36KB embedded data)
- `src/data/multiYearPrices.ts` - Price lookup functions

| Year | BTC Jan 1 | ETH Jan 1 | Days |
|------|-----------|-----------|------|
| 2020 | $7,174 | $130 | 366 (leap) |
| 2021 | $29,412 | $730 | 365 |
| 2022 | $46,311 | $3,682 | 365 |
| 2023 | $16,530 | $1,195 | 365 |
| 2024 | $42,266 | $2,281 | 366 (leap) |
| 2025 | $93,429 | $3,329 | ~342 |

### Black Swan Events Marked on Chart
- **COVID-19 Crash** (March 2020, Day 72): -47% in 26 days
- **LUNA Collapse** (May 2022): -30%
- **FTX Collapse** (November 2022): -25%

**File**: `src/data/blackSwanEvents.ts`

---

## Simulated Mode

### What's Available
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

### Preset Scenarios
1. **Market Crash**: -40% crash pattern, high volatility
2. **Gradual Decline**: -25% linear, medium volatility
3. **V-Shape Recovery**: -30% then +50%, crash pattern
4. **Bull Run**: +50% bull pattern, high volatility
5. **Rate Hike**: +2% borrow APY, -15% price

---

## Key Thresholds Summary

| Threshold | Value | What Happens |
|-----------|-------|--------------|
| Target Health | 1.4 | Initial borrow target, rebalance restore target |
| Min Health | 1.2 | Triggers downward rebalance (sell collateral, repay debt) |
| Max Health | 1.6 | Triggers upward rebalance (borrow more, buy more collateral) |
| Liquidation | 1.0 | Position liquidated, 5% penalty |

---

## File Structure

| File | Purpose |
|------|---------|
| `src/lib/simulation/fcm.ts` | FCM rebalancing logic (up/down) |
| `src/lib/simulation/traditional.ts` | Traditional lending (no protection) |
| `src/lib/simulation/calculations.ts` | Health factor, liquidation math |
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
| Downward Rebalancing | None (manual only) | Automatic at HF < 1.2 |
| Upward Rebalancing | None | Automatic at HF > 1.6 |
| Yield Management | Manual claim | Auto-applied based on health |
| Liquidation Risk | High (HF < 1.0 = total loss) | Low (rebalancing prevents it) |
| Bull Market Returns | Standard | Higher (recursive leverage) |
| Bear Market Survival | Often liquidated | Survives through rebalancing |
| Required Monitoring | Constant | None (fully automated) |
