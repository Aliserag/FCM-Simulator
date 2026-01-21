# FCM Simulator

An interactive educational simulator comparing Traditional DeFi Lending (Aave/Compound style) vs Flow Credit Market (FCM) lending. Demonstrates how FCM's automatic rebalancing protects users from liquidation during market crashes while maximizing returns in bull markets.

**Tagline**: *"Sleep through the next Crash. Wake up wealthy."*

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the simulator.

## Historic Price Data

The simulator includes real historic price data for backtesting against actual market conditions.

### Data Source

| Attribute | Value |
|-----------|-------|
| **Source** | Coinbase via CCXT |
| **Date Range** | January 1, 2020 - December 8, 2025 |
| **Total Days** | 2,169 daily prices per token |
| **Tokens** | BTC and ETH |
| **Granularity** | Daily closing prices |

### Price Snapshots

| Date | BTC | ETH |
|------|-----|-----|
| Jan 1, 2020 | $7,174 | $130 |
| Jan 1, 2021 | $29,412 | $730 |
| Jan 1, 2022 | $46,311 | $3,682 |
| Jan 1, 2023 | $16,530 | $1,195 |
| Jan 1, 2024 | $42,266 | $2,281 |
| Jan 1, 2025 | $93,429 | $3,329 |

### Black Swan Events Captured

The historic data includes these major market events:

- **COVID-19 Crash** (March 12, 2020): ~47% drop in 26 days
- **LUNA Collapse** (May 9, 2022): ~30% drop
- **FTX Collapse** (November 6, 2022): ~25% drop

### Intraday Simulation

The price data consists of daily closing prices only - no real intraday data. However, FCM simulates intraday health monitoring with **4 checkpoints per day** (every 6 hours) by interpolating between daily prices. This allows FCM to survive sharp single-day crashes by rebalancing partway through the day.

### Data Files

| File | Contents |
|------|----------|
| `src/data/realPrices.ts` | Raw price arrays (`BTC_DAILY_PRICES`, `ETH_DAILY_PRICES`) |
| `src/data/multiYearPrices.ts` | Lookup functions for querying prices by date/year range |
| `src/data/blackSwanEvents.ts` | COVID, LUNA, FTX crash date markers |

## How It Works

### Traditional DeFi Lending
- Deposit collateral, borrow stablecoins
- No automatic protection
- Liquidated when health factor drops below 1.0 (~13% price drop)
- 5% liquidation penalty

### FCM (Flow Credit Market)
- Same initial position as Traditional
- **Automatic downward rebalancing** at health 1.05 (~9% drop) - sells collateral to repay debt
- **Automatic upward rebalancing** at health 1.30 (~13% gain) - borrows more to buy collateral
- Survives crashes that liquidate Traditional positions

## Tech Stack

- Next.js 14
- React
- TypeScript
- Tailwind CSS
- Recharts (visualization)

## License

MIT
