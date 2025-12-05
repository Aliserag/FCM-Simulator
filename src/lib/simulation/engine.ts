import { SimulationState, MarketConditions, PositionState, SimulationEvent } from '@/types'
import { PROTOCOL_CONFIG, SIMULATION_DEFAULTS } from '@/lib/constants'
import { calculatePriceAtDay, calculateInitialBorrow } from './calculations'
import { simulateTraditionalPosition, initializeTraditionalPosition } from './traditional'
import { simulateFCMPosition, initializeFCMPosition } from './fcm'
import { generateAllEvents, filterEventsUpToDay } from './events'
import { getTokenPrice, getToken, getTokenCollateralFactor, TOKENS } from '@/data/historicPrices'

/**
 * Main Simulation Engine
 *
 * Orchestrates the comparison between traditional lending and FCM lending
 */

/**
 * Initialize a new simulation
 * @param initialDepositUSD - Initial deposit in USD (e.g., $1000)
 */
export function initializeSimulation(
  initialDepositUSD: number = PROTOCOL_CONFIG.initialDeposit,
  marketConditions: MarketConditions = {
    priceChange: -30,
    volatility: 'medium',
    interestRateChange: 0,
    dataMode: 'historic',
    collateralToken: 'eth',
    debtToken: 'usdc',
  }
): SimulationState {
  // Get day 0 price from token or use default
  let day0Price = PROTOCOL_CONFIG.baseFlowPrice
  if (marketConditions.dataMode === 'historic') {
    // Day 0 price is the token price at the start of the simulation
    day0Price = getTokenPrice(marketConditions.collateralToken, 0)
  }

  // Calculate token amount from USD value at day 0 price
  // e.g., $1000 / $3900 per ETH = 0.256 ETH
  const initialCollateralTokens = initialDepositUSD / day0Price

  return {
    currentDay: 0,
    maxDay: SIMULATION_DEFAULTS.maxDay,
    traditional: initializeTraditionalPosition(initialCollateralTokens, day0Price),
    fcm: initializeFCMPosition(initialCollateralTokens, day0Price),
    events: [],
    marketConditions,
    initialDeposit: initialDepositUSD,
    flowPrice: day0Price,
    baseFlowPrice: day0Price,
    isPlaying: false,
    playSpeed: SIMULATION_DEFAULTS.playSpeed,
  }
}

/**
 * Run simulation to a specific day
 */
export function simulateToDay(
  state: SimulationState,
  targetDay: number
): SimulationState {
  const clampedDay = Math.max(0, Math.min(targetDay, state.maxDay))

  // Calculate current price based on data mode
  let currentPrice: number
  if (state.marketConditions.dataMode === 'historic') {
    // Use real historic price data
    currentPrice = getTokenPrice(state.marketConditions.collateralToken, clampedDay)
  } else {
    // Use simulated price data
    currentPrice = calculatePriceAtDay(
      state.baseFlowPrice,
      state.marketConditions.priceChange,
      clampedDay,
      state.maxDay,
      state.marketConditions.volatility
    )
  }

  // Calculate effective borrow APY with any rate changes
  const effectiveBorrowAPY = PROTOCOL_CONFIG.borrowAPY + (state.marketConditions.interestRateChange / 100)

  // Calculate initial collateral in tokens from USD value at day 0 price
  const initialCollateralTokens = state.initialDeposit / state.baseFlowPrice

  // Simulate traditional position
  const traditional = simulateTraditionalPosition({
    initialCollateral: initialCollateralTokens,
    currentPrice,
    basePrice: state.baseFlowPrice,
    day: clampedDay,
    borrowAPY: effectiveBorrowAPY,
  })

  // Simulate FCM position
  const fcm = simulateFCMPosition({
    initialCollateral: initialCollateralTokens,
    currentPrice,
    basePrice: state.baseFlowPrice,
    day: clampedDay,
    borrowAPY: effectiveBorrowAPY,
  })

  // Generate events
  const allEvents = generateAllEvents(
    clampedDay,
    initialCollateralTokens,
    state.baseFlowPrice,
    state.marketConditions.priceChange,
    traditional,
    fcm
  )

  // Filter events up to current day
  const events = filterEventsUpToDay(allEvents, clampedDay)

  return {
    ...state,
    currentDay: clampedDay,
    flowPrice: currentPrice,
    traditional,
    fcm,
    events,
  }
}

/**
 * Update market conditions and recalculate
 */
export function updateMarketConditions(
  state: SimulationState,
  newConditions: Partial<MarketConditions>
): SimulationState {
  const updatedConditions = {
    ...state.marketConditions,
    ...newConditions,
  }

  const newState = {
    ...state,
    marketConditions: updatedConditions,
  }

  // Recalculate simulation with new conditions
  return simulateToDay(newState, state.currentDay)
}

/**
 * Reset simulation to day 0
 */
export function resetSimulation(state: SimulationState): SimulationState {
  return initializeSimulation(state.initialDeposit, state.marketConditions)
}

/**
 * Get comparison summary between traditional and FCM at current day
 */
export function getComparisonSummary(state: SimulationState): {
  healthDifference: number
  returnsDifference: number
  traditionalLiquidated: boolean
  fcmRebalanceCount: number
  daysTillTraditionalLiquidation: number | null
} {
  const healthDifference = state.fcm.healthFactor - state.traditional.healthFactor
  const returnsDifference = state.fcm.totalReturns - state.traditional.totalReturns
  const traditionalLiquidated = state.traditional.status === 'liquidated'
  const fcmRebalanceCount = state.fcm.rebalanceCount

  // Estimate days till traditional liquidation
  let daysTillLiquidation: number | null = null
  if (!traditionalLiquidated && state.marketConditions.priceChange < 0) {
    // Find the day when traditional would be liquidated
    for (let d = state.currentDay + 1; d <= state.maxDay; d++) {
      const testState = simulateToDay(state, d)
      if (testState.traditional.status === 'liquidated') {
        daysTillLiquidation = d - state.currentDay
        break
      }
    }
  }

  return {
    healthDifference,
    returnsDifference,
    traditionalLiquidated,
    fcmRebalanceCount,
    daysTillTraditionalLiquidation: daysTillLiquidation,
  }
}

/**
 * Get key metrics for display
 */
export function getDisplayMetrics(state: SimulationState): {
  priceChangePercent: number
  traditionalHealthColor: string
  fcmHealthColor: string
  showLiquidationWarning: boolean
} {
  const priceChangePercent = ((state.flowPrice - state.baseFlowPrice) / state.baseFlowPrice) * 100

  const getHealthColor = (health: number, isLiquidated: boolean) => {
    if (isLiquidated) return 'text-purple-600'
    if (health >= 1.3) return 'text-emerald-600'
    if (health >= 1.1) return 'text-amber-600'
    if (health >= 1.0) return 'text-red-600'
    return 'text-purple-600'
  }

  return {
    priceChangePercent,
    traditionalHealthColor: getHealthColor(
      state.traditional.healthFactor,
      state.traditional.status === 'liquidated'
    ),
    fcmHealthColor: getHealthColor(
      state.fcm.healthFactor,
      state.fcm.status === 'liquidated'
    ),
    showLiquidationWarning:
      state.traditional.healthFactor < 1.1 &&
      state.traditional.status !== 'liquidated',
  }
}
