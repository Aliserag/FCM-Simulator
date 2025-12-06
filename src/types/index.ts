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
  rebalanceCount: number        // number of rebalances (FCM only)
}

// Event logged during simulation
export interface SimulationEvent {
  id: string
  day: number
  position: 'traditional' | 'fcm' | 'both'
  type: 'create' | 'borrow' | 'rebalance' | 'liquidation' | 'interest' | 'scheduled' | 'warning'
  action: string                // Human-readable action
  code: string                  // Code/function called
  details?: string              // Additional info
  healthBefore?: number
  healthAfter?: number
}

// Market conditions (user adjustable)
export interface MarketConditions {
  priceChange: number           // % change in token price (-99 to +10000)
  volatility: 'low' | 'medium' | 'high'
  interestRateChange: number    // % adjustment to base rate
  dataMode: 'simulated' | 'historic'  // Use simulated or real historic data
  collateralToken: string       // Selected collateral token (btc, eth, sol, etc.)
  debtToken: string             // Selected debt token (usdc, usdt, dai)
  // Protocol config overrides (for simulated mode)
  borrowAPY?: number            // Override borrow APY
  supplyAPY?: number            // Override supply APY
  basePrice?: number            // Override base token price
  fcmMinHealth?: number         // FCM rebalance trigger threshold
  fcmTargetHealth?: number      // FCM rebalance restore target
  collateralFactor?: number     // Override LTV (0.5-0.9)
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
}

// Preset scenario
export interface Scenario {
  id: string
  name: string
  description: string
  priceChange: number
  volatility: 'low' | 'medium' | 'high'
  interestRateChange: number
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
