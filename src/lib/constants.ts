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
 * FYV generates yield through various DeFi strategies (LP positions, farming, lending).
 *
 * These rates reflect historic stablecoin DeFi yields:
 * - 2020: DeFi Summer - high yields as protocols competed for liquidity
 * - 2021: Peak yield farming - extreme yields during bull market
 * - 2022: Bear market - reduced yields, capital flight
 * - 2023: Recovery - moderate yields returning
 * - 2024-2025: Bull market - healthy yields
 *
 * Reference: /docs/FCM-REFERENCE.md
 */
export const FYV_HISTORIC_YIELDS: Record<number, number> = {
  2020: 0.15,  // 15% APY - DeFi summer
  2021: 0.20,  // 20% APY - Peak yield farming
  2022: 0.08,  // 8% APY - Bear market
  2023: 0.10,  // 10% APY - Recovery
  2024: 0.12,  // 12% APY - Bull market
  2025: 0.12,  // 12% APY - Continued bull
}

/**
 * Get FYV yield rate for a specific year
 */
export function getFYVYieldRate(year: number): number {
  return FYV_HISTORIC_YIELDS[year] ?? 0.10  // Default 10% if year not found
}

/**
 * Get FYV yield rate for a specific day in the simulation
 * Uses the year based on simulation start year + days elapsed
 */
export function getFYVYieldRateForDay(day: number, startYear: number): number {
  const year = startYear + Math.floor(day / 365)
  return getFYVYieldRate(year)
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
