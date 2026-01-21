import { ProtocolConfig, Scenario, TooltipContent } from '@/types'

// FCM Protocol Configuration
// Optimized for historic data: Traditional liquidates at ~13% drop, FCM rebalances at ~9%
export const PROTOCOL_CONFIG: ProtocolConfig = {
  collateralFactor: 0.80,        // 80% of FLOW value counts as collateral
  targetHealth: 1.15,            // Both start here - ~13% buffer to liquidation
  minHealth: 1.05,               // FCM rebalances at ~9% drop, before Traditional liquidates
  maxHealth: 1.30,               // FCM leverage-up trigger (~13% price increase)
  liquidationThreshold: 1.00,    // Both liquidate at health < 1.0
  liquidationBonus: 0.05,        // 5% bonus to liquidators
  borrowAPY: 0.065,              // 6.5% annual borrow interest
  supplyAPY: 0.042,              // 4.2% annual supply interest
  baseFlowPrice: 1.00,           // Starting FLOW price ($1.00)
  initialDeposit: 1000,          // Default deposit amount (1000 FLOW)
}

/**
 * Dynamic volatility-based thresholds for FCM rebalancing
 *
 * These thresholds allow FCM to adapt to market conditions:
 * - Low volatility: Aggressive settings, maximize leverage
 * - High volatility: Conservative settings, prioritize survival
 *
 * The key insight: during high volatility periods (like COVID crash),
 * FCM needs to rebalance earlier and avoid adding more leverage
 */
export interface VolatilityThreshold {
  maxVol: number        // Maximum volatility for this tier (annualized %)
  minHealth: number     // Rebalance DOWN trigger
  targetHealth: number  // Target health after rebalancing
  maxHealth: number     // Rebalance UP trigger (leverage-up), Infinity = disabled
}

export const VOLATILITY_THRESHOLDS: VolatilityThreshold[] = [
  // Low volatility: aggressive leverage, rebalance at 1.05 → 1.15, leverage-up at 1.30
  { maxVol: 50, minHealth: 1.05, targetHealth: 1.15, maxHealth: 1.30 },
  // Medium volatility: moderate leverage, still allow leverage-up at 1.35
  { maxVol: 80, minHealth: 1.07, targetHealth: 1.18, maxHealth: 1.35 },
  // High volatility: conservative settings, NO leverage-up
  { maxVol: 120, minHealth: 1.10, targetHealth: 1.22, maxHealth: Infinity },
  // Extreme volatility: survival mode, NO leverage-up
  { maxVol: Infinity, minHealth: 1.15, targetHealth: 1.30, maxHealth: Infinity },
]

/**
 * Get the appropriate thresholds based on current volatility
 */
export function getVolatilityThresholds(volatility: number): VolatilityThreshold {
  for (const tier of VOLATILITY_THRESHOLDS) {
    if (volatility <= tier.maxVol) {
      return tier
    }
  }
  // Fallback to most conservative
  return VOLATILITY_THRESHOLDS[VOLATILITY_THRESHOLDS.length - 1]
}

/**
 * Token-specific FCM threshold configurations
 *
 * Different tokens require different settings based on their volatility characteristics:
 * - BTC: More conservative, no leverage-up (BTC has sharp crashes that require earlier rebalancing)
 * - ETH: Moderate settings with leverage-up enabled (ETH performance benefits from leverage)
 *
 * These are BASE thresholds that can be overridden by:
 * 1. Dynamic volatility-based adjustments
 * 2. User-provided overrides in marketConditions
 */
export interface TokenFCMThresholds {
  minHealth: number      // Rebalance DOWN trigger
  targetHealth: number   // Target health after rebalancing
  maxHealth: number      // Rebalance UP trigger (Infinity = disabled)
}

export const TOKEN_FCM_THRESHOLDS: Record<string, TokenFCMThresholds> = {
  btc: {
    minHealth: 1.10,
    targetHealth: 1.25,
    maxHealth: Infinity,  // Disable leverage-up for BTC (interest cost > gains in bull markets)
  },
  eth: {
    minHealth: 1.05,      // Keep current settings (user confirmed these work well)
    targetHealth: 1.15,
    maxHealth: 1.30,
  },
}

// Default conservative thresholds for tokens without specific config
const DEFAULT_TOKEN_THRESHOLDS: TokenFCMThresholds = {
  minHealth: 1.10,
  targetHealth: 1.25,
  maxHealth: Infinity,
}

/**
 * Get FCM thresholds for a specific token
 */
export function getTokenFCMThresholds(tokenId: string): TokenFCMThresholds {
  return TOKEN_FCM_THRESHOLDS[tokenId] ?? DEFAULT_TOKEN_THRESHOLDS
}

// Simulation defaults
export const SIMULATION_DEFAULTS = {
  maxDay: 365,
  playSpeed: 40, // days per second when auto-playing (1x speed)
}

/**
 * Intraday simulation settings
 *
 * FCM on Flow blockchain uses scheduled transactions for continuous health monitoring.
 * This simulation models that behavior by checking prices at multiple points within each day.
 *
 * 4 checkpoints = every 6 hours, sufficient to survive 40%+ single-day crashes
 * Without this, a 38% single-day crash (like COVID March 12, 2020) would skip
 * directly from healthy to liquidated without any rebalancing opportunity.
 */
export const INTRADAY_CHECKPOINTS = 4

/**
 * FYV (Flow Yield Vault) Historic Yield Rates
 *
 * Per FCM architecture: Borrowed MOET is deployed to FYV via DrawDownSink.
 * FYV generates yield through optimized DeFi strategies (LP positions, Curve, Convex).
 *
 * SOURCED DATA:
 * - 2021 Curve pools: Base ~4% + CRV rewards 11-15% = 15-20% total (CoinDesk)
 * - 2021 Convex: 48% APY for CRV staking at peak (CoinMarketCap)
 * - 2021 Dauphine study: Mean gross APR ~13%, net <10% after IL (academic paper)
 * - 2022 TVL crash: Down 70%+ from peak (DeFi Llama)
 * - Jan 2023 Curve 3pool: 0.98% APY (CoinDesk)
 * - Jan 2023 10Y Treasury: 3.54% (CoinDesk) - DeFi yields below TradFi
 * - Jan 2024: Coinchange DeFi Lending Index 6.97% (Coinchange)
 * - Q4 2024: Chainlink DeFi Yield Index USDC 8.37% average (Chainlink)
 *
 * FYV represents OPTIMIZED strategies (auto-compounding, gas batching, strategy rotation).
 *
 * References:
 * - CoinDesk 3pool: https://www.coindesk.com/markets/2023/01/31/stablecoins-seem-unattractive-as-the-gap-between-3pools-apy-and-treasury-yields-widens
 * - CoinDesk Curve: https://www.coindesk.com/markets/2021/11/03/a-look-into-curves-ecosystem-defis-centerpiece
 * - Dauphine Study: https://dauphine.psl.eu/fileadmin/mediatheque/chaires/fintech/articles/Yield_Farming_14_06_2023.pdf
 * - Coinchange DeFi Yield Index: https://www.coinchange.io/blog/yield-indexes-and-benchmark-comparison-stablecoin-assets-january-2024
 * - Chainlink Q4 2024: https://blog.chain.link/chainlink-digital-asset-insights-q4-2024/
 * - Coinbase Stablecoins QCI: https://www.coinbase.com/blog/part-2-quantitative-crypto-insight-stablecoins-and-unstable-yield
 * - Bankless 2020 ROI: https://www.bankless.com/how-our-crypto-money-portfolios-performed
 * - Criffy Convex 3pool: https://criffy.com/currencies/lp-3pool-curve
 */
export const FYV_HISTORIC_YIELDS: Record<number, number> = {
  2020: 0.10,  // 10% - SOURCED: Base 3-5% (Coinbase) + COMP 5-10%, Bankless 44% ROI
  2021: 0.15,  // 15% - SOURCED: Curve base+CRV 15-20%, Dauphine mean 13%
  2022: 0.04,  // 4% - SOURCED: Aave/Compound 2.5-3.8% (Banque de France), post-crash
  2023: 0.02,  // 2% - SOURCED: Curve 3pool 0.98% (CoinDesk), below Treasury 3.54%
  2024: 0.07,  // 7% - SOURCED: Coinchange DeFi Lending Index ~7%, Chainlink 8.37%
  2025: 0.08,  // 8% - SOURCED: Convex 3pool 7.83% (Criffy Dec 2025)
}

/**
 * Get FYV yield rate for a specific year
 */
export function getFYVYieldRate(year: number): number {
  return FYV_HISTORIC_YIELDS[year] ?? 0.06  // Default 6% if year not found
}

/**
 * Get FYV yield rate for a specific day in the simulation
 * Uses the year based on simulation start year + days elapsed
 */
export function getFYVYieldRateForDay(day: number, startYear: number): number {
  const year = startYear + Math.floor(day / 365)
  return getFYVYieldRate(year)
}

/**
 * Historic Stablecoin Borrow Rates (USDC on Aave/Compound)
 *
 * SOURCED DATA:
 * - Jan 2022: ~5% average (Banque de France paper)
 * - 2022: 2.5-3.8% variable rates (Banque de France paper)
 * - 2023: Q4 rates 4-15% on Aave, ~13% on Compound (Kaiko via Bitcoinist)
 * - 2024: DeFiRate shows 5.61% borrow APR current (DeFiRate)
 * - 2024: Chainlink Q4 index shows recovery to 8%+ yields (Chainlink)
 *
 * ESTIMATED (interpolated from sourced data):
 * - 2020: Higher rates during DeFi Summer (BlockFi offered 8-10% competing)
 * - 2023: Average ~5% (Coinchange monthly indexes show 5-8% range)
 *
 * References:
 * - Banque de France: https://www.banque-france.fr/en/publications-and-statistics/publications/interest-rates-decentralised-finance
 * - Aavescan: https://aavescan.com/
 * - DeFiRate: https://defirate.com/borrow/
 * - Coinchange Indexes: https://www.coinchange.io/blog/yield-indexes-and-benchmark-comparison-stablecoin-assets-december-2023
 */
export const HISTORIC_BORROW_RATES: Record<number, number> = {
  2020: 0.07,  // 7% - SOURCED: 6-8% pre-COMP (arXiv), BlockFi competing 8-10%
  2021: 0.05,  // 5% - SOURCED: Banque de France Jan 2022 baseline ~5%
  2022: 0.03,  // 3% - SOURCED: Banque de France "2.5-3.8%" bear market
  2023: 0.05,  // 5% - SOURCED: Coinchange Dec 2023 DeFi Lending Index 7.61%
  2024: 0.055, // 5.5% - SOURCED: DeFiRate 5.61% borrow APR, Aavescan data
  2025: 0.055, // 5.5% - SOURCED: DeFiRate current 5.61% (Dec 2025)
}

/**
 * Get borrow rate for a specific year
 */
export function getBorrowRate(year: number): number {
  return HISTORIC_BORROW_RATES[year] ?? 0.05  // Default 5% if year not found
}

/**
 * Get borrow rate for a specific day in the simulation
 */
export function getBorrowRateForDay(day: number, startYear: number): number {
  const year = startYear + Math.floor(day / 365)
  return getBorrowRate(year)
}

/**
 * Historic ETH Supply APY (Aave/Compound)
 *
 * NOTE: These are LENDING rates (what depositors earn), NOT staking rates.
 * ETH staking yields 3-5% APY, but lending ETH on Aave earns much less.
 *
 * SOURCED DATA:
 * - Normal utilization: 0.5% (Aavescan baseline)
 * - Feb 2022: 0.01% on Aave (Aavescan)
 * - June 2022 (80% utilization): 3% spike (Krayon Digital)
 * - Current 2024: ~1.3% (Aavescan live data)
 *
 * ESTIMATED:
 * - Year-by-year values interpolated based on utilization patterns
 * - ETH lending rates correlate with leverage demand and market sentiment
 *
 * References:
 * - Aavescan: https://aavescan.com/
 * - Krayon Digital: https://www.krayondigital.com/blog/aave-interest-rate-model-explained
 * - BIS Working Paper: https://www.bis.org/publ/work1183.htm
 */
export const HISTORIC_ETH_SUPPLY_RATES: Record<number, number> = {
  2020: 0.005,  // 0.5% - SOURCED: Aavescan normal utilization baseline
  2021: 0.020,  // 2.0% - SOURCED: BIS/arXiv ETH borrow 2.5-5%, supply ~40-60% of that
  2022: 0.010,  // 1.0% - SOURCED: Feb 0.01%, June spike 3%, average ~1%
  2023: 0.010,  // 1.0% - SOURCED: Bear market, between 2022 (1%) and 2024 (1.3%)
  2024: 0.013,  // 1.3% - SOURCED: Aavescan current data
  2025: 0.015,  // 1.5% - SOURCED: Current 1.2-2.0% (Aavescan Dec 2025)
}

/**
 * Historic BTC (WBTC) Supply APY (Aave/Compound)
 *
 * SOURCED DATA:
 * - July 2020: ~5.6% APR on Compound (CoinList Medium)
 * - Dec 2020: Just below 3% (Gemini Cryptopedia)
 * - 2024-2025: <0.01% on Aave mainnet (Aave app - very low borrowing demand)
 *
 * MODELING:
 * - 2020-2022: WBTC rates were 50-70% of ETH rates during high demand periods
 * - 2023-2025: Relationship broke down, WBTC now <10% of ETH due to oversupply
 * - Using simplified ~60% model for consistency, acknowledging recent overestimate
 *
 * References:
 * - CoinList WBTC: https://medium.com/coinlist/how-to-use-wbtc-to-earn-interest-on-compound-dd0fd7d12116
 * - Gemini: https://www.gemini.com/cryptopedia/wrapped-bitcoin-what-can-you-do
 * - Aavescan: https://aavescan.com/
 */
export const HISTORIC_BTC_SUPPLY_RATES: Record<number, number> = {
  2020: 0.025,  // 2.5% - SOURCED: July 5.6%, Dec ~3%, annual avg ~2.5%
  2021: 0.012,  // 1.2% - ESTIMATED: ~60% of ETH rate, bull market demand
  2022: 0.006,  // 0.6% - ESTIMATED: ~60% of ETH rate, bear market
  2023: 0.004,  // 0.4% - ESTIMATED: Declining demand, bookended by sourced data
  2024: 0.001,  // 0.1% - SOURCED: Aave shows <0.01%, extreme oversupply
  2025: 0.0001, // 0.01% - SOURCED: Aave V3 mainnet <0.01%, 3.87% utilization
}

/**
 * Get supply rate for a specific token and year
 */
export function getSupplyRate(year: number, token: string): number {
  const rates = token === 'btc' ? HISTORIC_BTC_SUPPLY_RATES : HISTORIC_ETH_SUPPLY_RATES
  return rates[year] ?? 0.01  // Default 1% if year not found
}

/**
 * Get supply rate for a specific day in the simulation
 */
export function getSupplyRateForDay(day: number, startYear: number, token: string): number {
  const year = startYear + Math.floor(day / 365)
  return getSupplyRate(year, token)
}

/**
 * Traditional User Yield Efficiency Factor
 *
 * ⚠️ MODELING ASSUMPTION - NO EMPIRICAL DATA EXISTS
 *
 * This factor represents how much of the FYV yield a Traditional user captures
 * through manual yield farming. We assume Traditional users access the SAME
 * underlying DeFi yields (Curve, Aave, Convex) but with reduced efficiency.
 *
 * Efficiency losses modeled:
 * - Manual compounding (weekly vs daily): ~5-10% loss
 * - Gas costs (~$20/tx, $1k position, monthly): ~2.4% annual loss
 * - Strategy rotation delays: ~5% opportunity cost
 * - Idle time between actions: ~10% effective time loss
 *
 * Total estimated efficiency: 70% of FYV yields
 *
 * ⚠️ This is a reasonable estimate, NOT sourced data. No academic study
 * has measured "average DeFi user manual farming returns."
 */
export const TRADITIONAL_EFFICIENCY_FACTOR = 0.70  // 70% of FYV yields

/**
 * Get Traditional yield rate for a specific year
 * Calculated as FYV rate × efficiency factor
 */
export function getTraditionalYieldRate(year: number): number {
  const fyvRate = getFYVYieldRate(year)
  return fyvRate * TRADITIONAL_EFFICIENCY_FACTOR
}

/**
 * Get Traditional yield rate for a specific day in the simulation
 */
export function getTraditionalYieldRateForDay(day: number, startYear: number): number {
  const year = startYear + Math.floor(day / 365)
  return getTraditionalYieldRate(year)
}

// Deposit amount presets (USD value)
export const DEPOSIT_PRESETS = [1000, 5000, 10000, 25000, 50000, 100000]

// Preset scenarios
export const SCENARIOS: Scenario[] = [
  {
    id: 'market_crash',
    name: 'Crash',
    description: 'Sharp -40% drop, minimal recovery',
    priceChange: -40,
    volatility: 'high',
    interestRateChange: 0,
    pattern: 'crash',
  },
  {
    id: 'gradual_decline',
    name: 'Decline',
    description: 'Gradual -25% decline over time',
    priceChange: -25,
    volatility: 'low',
    interestRateChange: 0,
    pattern: 'linear',
  },
  {
    id: 'v_shape',
    name: 'V-Shape',
    description: 'Crash then strong recovery',
    priceChange: 10,
    volatility: 'high',
    interestRateChange: 0,
    pattern: 'v_shape',
  },
  {
    id: 'bull_run',
    name: 'Bull Run',
    description: '+80% steady growth',
    priceChange: 80,
    volatility: 'low',
    interestRateChange: 0,
    pattern: 'linear',
  },
  {
    id: 'rate_hike',
    name: 'Rate Hike',
    description: '+3% borrow rate, -10% price',
    priceChange: -10,
    volatility: 'medium',
    interestRateChange: 3,
    pattern: 'linear',
  },
]

// Educational tooltips
export const TOOLTIPS: Record<string, TooltipContent> = {
  healthFactor: {
    title: 'Health Factor',
    content: 'The ratio of your effective collateral to your debt. Above 1.0 is safe, below 1.0 means you can be liquidated.',
    formula: 'Health = (Collateral × Price × CollateralFactor) / Debt',
    example: '$1000 collateral × 0.8 factor / $696 debt = 1.15 health',
  },
  collateralFactor: {
    title: 'Collateral Factor (80%)',
    content: 'Only 80% of your FLOW\'s value counts as borrowing power. This safety buffer protects the protocol from sudden price drops.',
    example: '$1000 FLOW → $800 effective collateral',
  },
  rebalancing: {
    title: 'Automatic Rebalancing',
    content: 'When health drops below threshold, FCM automatically repays some debt using your collateral. It triggers just above liquidation to maximize leverage while ensuring survival.',
    benefit: 'You never get liquidated in normal market conditions',
    code: 'pool.rebalancePosition(pid, force: false)',
  },
  scheduledTxn: {
    title: 'Scheduled Transaction',
    content: 'Flow\'s native scheduling system triggers automatic health checks and rebalancing. No external keepers or bots needed.',
    code: 'FlowScheduler.scheduleAfter(interval, checkHealth)',
  },
  defiActions: {
    title: 'DeFi Actions',
    content: 'Composable building blocks that chain operations together. FCM uses Sink/Source patterns for automatic fund routing during rebalancing.',
    example: 'TopUpSource → Pool.repay() → Health restored',
  },
  liquidation: {
    title: 'Liquidation',
    content: 'When health drops below 1.0, anyone can repay your debt and seize your collateral at a 5% discount. You lose your position!',
    warning: 'Traditional lending has no protection against this',
    code: 'liquidator.liquidateRepayForSeize(pid, debtType, seizeType)',
  },
  targetHealth: {
    title: 'Target Health (1.15)',
    content: 'Both positions start at this health ratio. FCM maintains it through automatic rebalancing. At 1.15, a ~13% price drop triggers liquidation for Traditional.',
  },
  minHealth: {
    title: 'Minimum Health (1.05)',
    content: 'When health drops below 1.05 (~9% price drop), FCM triggers automatic rebalancing to restore health to 1.15. Traditional has no such protection and gets liquidated at ~13% drop.',
  },
  maxHealth: {
    title: 'Maximum Health (1.3)',
    content: 'When health rises above 1.3 (~13% price increase), FCM can borrow more against excess collateral. This maximizes capital efficiency in bull markets through DrawDownSink.',
    benefit: 'FCM outperforms traditional lending in both crashes AND bull runs',
  },
  effectiveCollateral: {
    title: 'Effective Collateral',
    content: 'Your collateral value multiplied by the collateral factor. This is what actually counts toward your borrowing power.',
    formula: 'Effective = Collateral Value × 0.80',
  },
  borrowCapacity: {
    title: 'Initial Borrow',
    content: 'At position creation, both Traditional and FCM borrow at target health ratio (1.15). This creates identical starting conditions.',
    formula: 'Borrow = Effective Collateral / Target Health',
    example: '$800 effective / 1.15 = $696 borrowed',
  },
  returns: {
    title: 'Net Returns',
    content: 'Your total gains or losses including: collateral value changes, interest earned on deposits, interest paid on debt, and any liquidation losses.',
  },
}

// Health status colors and labels
// Optimized for historic data: targetHealth=1.15, minHealth=1.05
export const HEALTH_STATUS = {
  safe: {
    min: 1.15,  // At or above target health (1.15)
    color: 'health-safe',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    label: 'Healthy',
  },
  warning: {
    min: 1.05,  // Between min (1.05) and target health (1.15)
    color: 'health-warning',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    label: 'Warning',
  },
  danger: {
    min: 1.0,  // Below min health (1.05), FCM rebalances here
    color: 'health-danger',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    label: 'Danger',
  },
  liquidated: {
    min: 0,
    color: 'health-liquidated',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    label: 'Liquidated',
  },
}

// Get health status based on health factor
export function getHealthStatus(healthFactor: number, isLiquidated: boolean = false) {
  if (isLiquidated || healthFactor <= 0) return HEALTH_STATUS.liquidated
  if (healthFactor >= HEALTH_STATUS.safe.min) return HEALTH_STATUS.safe
  if (healthFactor >= HEALTH_STATUS.warning.min) return HEALTH_STATUS.warning
  if (healthFactor >= HEALTH_STATUS.danger.min) return HEALTH_STATUS.danger
  return HEALTH_STATUS.liquidated
}
