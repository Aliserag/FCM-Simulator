// Position state at any point in time
export interface PositionState {
  day: number
  collateralAmount: number      // in FLOW
  collateralValueUSD: number
  debtAmount: number            // in MOET/USDC
  debtValueUSD: number
  healthFactor: number
  status: 'healthy' | 'warning' | 'liquidated'
  totalReturns: number          // cumulative gains/losses in USD
  accruedInterest: number       // interest paid on debt
  earnedYield: number           // interest earned on collateral (FCM)
  rebalanceCount: number        // number of rebalances down (FCM only)
  leverageUpCount?: number      // number of leverage ups when overcollateralized (FCM only)
  // FYV (Flow Yield Vault) - FCM only
  // Per FCM architecture: Borrowed MOET is deployed to FYV via DrawDownSink
  fyvBalance?: number           // Current MOET balance in FYV (earning yield)
  fyvYieldEarned?: number       // Cumulative yield earned from FYV strategies
}

// Chart data point for visualization
export interface ChartDataPoint {
  day: number
  year: number
  date: string
  traditionalValue: number
  fcmValue: number              // Total Value = ALP Equity + FYV Balance (per FCM architecture)
  price: number
  liquidationPrice: number
  traditionalLiquidated: boolean
  fcmLiquidated: boolean
  // FYV breakdown for tooltip (FCM only)
  fyvBalance?: number           // FYV balance for tooltip display
  alpEquity?: number            // ALP Equity (Collateral - Debt) for tooltip display
}

// Event logged during simulation
// FYV events use FCM terminology: DrawDownSink (deploy), TopUpSource (withdraw)
export interface SimulationEvent {
  id: string
  day: number
  position: 'traditional' | 'fcm' | 'both'
  type:
    | 'create' | 'borrow' | 'rebalance' | 'leverage_up' | 'liquidation'
    | 'interest' | 'yield_earned' | 'yield_applied' | 'scheduled' | 'warning'
    // FYV (Flow Yield Vault) events - per FCM architecture
    | 'fyv_deploy'              // MOET deployed to FYV via DrawDownSink
    | 'fyv_yield'               // FYV yield earned (monthly summary)
    | 'fyv_withdraw'            // FYV provides liquidity via TopUpSource
  action: string                // Human-readable action
  code: string                  // Code/function called
  details?: string              // Additional info
  healthBefore?: number
  healthAfter?: number
}

// Price pattern type for simulated mode
export type PricePattern = 'linear' | 'crash' | 'v_shape' | 'bull'

// Market conditions (user adjustable)
export interface MarketConditions {
  priceChange: number           // % change in token price (-99 to +10000)
  volatility: 'low' | 'medium' | 'high'
  interestRateChange: number    // % adjustment to base rate
  dataMode: 'simulated' | 'historic'  // Use simulated or real historic data
  collateralToken: string       // Selected collateral token (btc, eth, sol, etc.)
  debtToken: string             // Selected debt token (usdc, usdt, dai)
  pattern?: PricePattern        // Price movement pattern for simulated mode
  // Protocol config overrides (for simulated mode)
  borrowAPY?: number            // Override borrow APY
  supplyAPY?: number            // Override supply APY
  basePrice?: number            // Override base token price
  fcmMinHealth?: number         // FCM rebalance trigger threshold
  fcmTargetHealth?: number      // FCM rebalance restore target
  fcmMaxHealth?: number         // FCM leverage-up trigger threshold (Infinity = disabled)
  collateralFactor?: number     // Override LTV (0.5-0.9)
  // Historic mode options
  startYear?: number            // 2020-2025
  endYear?: number              // 2020-2025
}

// Full simulation state
export interface SimulationState {
  currentDay: number
  maxDay: number
  traditional: PositionState
  fcm: PositionState
  events: SimulationEvent[]
  marketConditions: MarketConditions
  initialDeposit: number        // Starting FLOW amount
  flowPrice: number             // Current simulated price
  baseFlowPrice: number         // Starting price ($1.00)
  isPlaying: boolean            // Auto-play animation
  playSpeed: number             // Days per second
  chartData: ChartDataPoint[]   // Pre-computed chart data for all days
  totalDays: number             // Total days in simulation (based on year range)
}

// Preset scenario
export interface Scenario {
  id: string
  name: string
  description: string
  priceChange: number
  volatility: 'low' | 'medium' | 'high'
  interestRateChange: number
  pattern: PricePattern
}

// Tooltip content
export interface TooltipContent {
  title: string
  content: string
  formula?: string
  example?: string
  benefit?: string
  warning?: string
  code?: string
}

// Protocol constants type
export interface ProtocolConfig {
  collateralFactor: number
  targetHealth: number
  minHealth: number
  maxHealth: number
  liquidationThreshold: number
  liquidationBonus: number
  borrowAPY: number
  supplyAPY: number
  baseFlowPrice: number
  initialDeposit: number
}
