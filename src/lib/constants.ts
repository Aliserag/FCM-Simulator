import { ProtocolConfig, Scenario, TooltipContent } from '@/types'

// FCM Protocol Configuration
export const PROTOCOL_CONFIG: ProtocolConfig = {
  collateralFactor: 0.80,        // 80% of FLOW value counts as collateral
  targetHealth: 1.40,            // FCM target health factor (aggressive)
  minHealth: 1.20,               // FCM rebalance trigger - rebalance early at higher prices
  maxHealth: 1.60,               // FCM over-collateralized trigger
  liquidationThreshold: 1.00,    // Both liquidate at health < 1.0
  liquidationBonus: 0.05,        // 5% bonus to liquidators
  borrowAPY: 0.065,              // 6.5% annual borrow interest
  supplyAPY: 0.042,              // 4.2% annual supply interest
  baseFlowPrice: 1.00,           // Starting FLOW price ($1.00)
  initialDeposit: 1000,          // Default deposit amount (1000 FLOW)
}

// Simulation defaults
export const SIMULATION_DEFAULTS = {
  maxDay: 365,
  playSpeed: 10, // days per second when auto-playing
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
    priceChange: -30,
    volatility: 'high',
    interestRateChange: 0,
    pattern: 'v_shape',
  },
  {
    id: 'bull_run',
    name: 'Bull Run',
    description: '+50% with momentum & pullbacks',
    priceChange: 50,
    volatility: 'medium',
    interestRateChange: 0,
    pattern: 'bull',
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
    example: '$1000 collateral × 0.8 factor / $615 debt = 1.30 health',
  },
  collateralFactor: {
    title: 'Collateral Factor (80%)',
    content: 'Only 80% of your FLOW\'s value counts as borrowing power. This safety buffer protects the protocol from sudden price drops.',
    example: '$1000 FLOW → $800 effective collateral',
  },
  rebalancing: {
    title: 'Automatic Rebalancing',
    content: 'When health drops below 1.2, FCM automatically repays some debt using your collateral to restore health to 1.4. Rebalancing early preserves more value!',
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
    title: 'Target Health (1.4)',
    content: 'FCM maintains this health ratio through automatic rebalancing. Set aggressively high to preserve more value during crashes.',
  },
  minHealth: {
    title: 'Minimum Health (1.2)',
    content: 'When health drops below this threshold, FCM triggers automatic rebalancing. Set high to rebalance early when prices are still good.',
  },
  maxHealth: {
    title: 'Maximum Health (1.6)',
    content: 'When health rises above this threshold, FCM can borrow more to maximize capital efficiency. Keeps your money working!',
  },
  effectiveCollateral: {
    title: 'Effective Collateral',
    content: 'Your collateral value multiplied by the collateral factor. This is what actually counts toward your borrowing power.',
    formula: 'Effective = Collateral Value × 0.80',
  },
  borrowCapacity: {
    title: 'Initial Borrow',
    content: 'At position creation, FCM borrows up to the target health ratio (1.3) automatically. This maximizes capital efficiency.',
    formula: 'Borrow = Effective Collateral / Target Health',
    example: '$800 effective / 1.3 = $615 borrowed',
  },
  returns: {
    title: 'Net Returns',
    content: 'Your total gains or losses including: collateral value changes, interest earned on deposits, interest paid on debt, and any liquidation losses.',
  },
}

// Health status colors and labels
export const HEALTH_STATUS = {
  safe: {
    min: 1.4,
    color: 'health-safe',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    label: 'Healthy',
  },
  warning: {
    min: 1.2,
    color: 'health-warning',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    label: 'Warning',
  },
  danger: {
    min: 1.0,
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
