import { SimulationState, MarketConditions, PositionState, SimulationEvent, ChartDataPoint } from '@/types'
import { PROTOCOL_CONFIG, SIMULATION_DEFAULTS } from '@/lib/constants'
import { calculatePriceAtDay, calculateInitialBorrow, calculateLiquidationPrice } from './calculations'
import { simulateTraditionalPosition, initializeTraditionalPosition } from './traditional'
import { simulateFCMPosition, initializeFCMPosition } from './fcm'
import { generateAllEvents, filterEventsUpToDay } from './events'
import { getTokenPrice, getToken, getTokenCollateralFactor, TOKENS } from '@/data/historicPrices'
import { getMultiYearPrices, getMultiYearTokenPrice, getYearStartPrice, getTotalDays, formatDayAsDate } from '@/data/multiYearPrices'

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
  // Determine simulation duration based on year range (for multi-year historic mode)
  const startYear = marketConditions.startYear ?? 2020
  const endYear = marketConditions.endYear ?? 2020
  const isMultiYear = marketConditions.dataMode === 'historic' && startYear && endYear
  const totalDays = isMultiYear ? getTotalDays(startYear, endYear) : SIMULATION_DEFAULTS.maxDay

  // Get day 0 price from token or use override
  let day0Price: number
  if (marketConditions.dataMode === 'historic') {
    // For multi-year simulation, get the price at the start of startYear
    if (isMultiYear && (marketConditions.collateralToken === 'btc' || marketConditions.collateralToken === 'eth')) {
      day0Price = getYearStartPrice(marketConditions.collateralToken as 'btc' | 'eth', startYear)
    } else {
      // Day 0 price is the token price at the start of the simulation
      day0Price = getTokenPrice(marketConditions.collateralToken, 0)
    }
  } else {
    // Simulated mode: Use basePrice override, or token's default, or fallback
    const token = getToken(marketConditions.collateralToken)
    day0Price = marketConditions.basePrice ?? token?.basePrice ?? PROTOCOL_CONFIG.baseFlowPrice
  }

  // Calculate token amount from USD value at day 0 price
  // e.g., $1000 / $3900 per ETH = 0.256 ETH
  const initialCollateralTokens = initialDepositUSD / day0Price

  // Calculate speed to complete in ~1 minute regardless of total days
  const playSpeed = totalDays / 60

  return {
    currentDay: 0,
    maxDay: totalDays,
    totalDays,
    traditional: initializeTraditionalPosition(initialCollateralTokens, day0Price),
    fcm: initializeFCMPosition(initialCollateralTokens, day0Price),
    events: [],
    marketConditions,
    initialDeposit: initialDepositUSD,
    flowPrice: day0Price,
    baseFlowPrice: day0Price,
    isPlaying: false,
    playSpeed,
    chartData: [], // Will be generated lazily on first play
  }
}

/**
 * Generate chart data for all days (pre-computed for smooth animation)
 */
export function generateChartData(
  state: SimulationState
): ChartDataPoint[] {
  const chartData: ChartDataPoint[] = []
  const { marketConditions, initialDeposit, baseFlowPrice, totalDays } = state

  const startYear = marketConditions.startYear ?? 2020
  const isMultiYear = marketConditions.dataMode === 'historic' &&
    (marketConditions.collateralToken === 'btc' || marketConditions.collateralToken === 'eth')

  // Get multi-year price data if applicable
  const multiYearPrices = isMultiYear
    ? getMultiYearPrices(
        marketConditions.collateralToken as 'btc' | 'eth',
        startYear,
        marketConditions.endYear ?? startYear
      )
    : null

  const baseBorrowAPY = marketConditions.borrowAPY ?? PROTOCOL_CONFIG.borrowAPY
  const effectiveBorrowAPY = baseBorrowAPY + (marketConditions.interestRateChange / 100)
  const collateralFactor = marketConditions.collateralFactor ?? PROTOCOL_CONFIG.collateralFactor
  const initialCollateralTokens = initialDeposit / baseFlowPrice

  // Calculate liquidation price (it's constant for the position)
  const initialBorrow = calculateInitialBorrow(
    initialCollateralTokens,
    baseFlowPrice,
    PROTOCOL_CONFIG.targetHealth,
    collateralFactor
  )
  const liquidationPriceValue = calculateLiquidationPrice(
    initialCollateralTokens,
    initialBorrow,
    collateralFactor
  )
  // Convert to collateral value at liquidation price
  const liquidationValue = initialCollateralTokens * liquidationPriceValue

  let traditionalLiquidated = false
  let fcmLiquidated = false

  for (let day = 0; day <= totalDays; day++) {
    // Get price for this day
    let price: number
    if (multiYearPrices && day < multiYearPrices.length) {
      price = multiYearPrices[day]
    } else if (marketConditions.dataMode === 'historic') {
      price = getTokenPrice(marketConditions.collateralToken, day)
    } else {
      price = calculatePriceAtDay(
        baseFlowPrice,
        marketConditions.priceChange,
        day,
        totalDays,
        marketConditions.volatility,
        marketConditions.pattern ?? 'linear'
      )
    }

    // Calculate year for this day
    const year = startYear + Math.floor(day / 365)

    // Format date
    const date = formatDayAsDate(day, startYear)

    // Simulate positions
    const traditional = simulateTraditionalPosition({
      initialCollateral: initialCollateralTokens,
      currentPrice: price,
      basePrice: baseFlowPrice,
      day,
      borrowAPY: effectiveBorrowAPY,
      marketConditions,
    })

    const fcm = simulateFCMPosition({
      initialCollateral: initialCollateralTokens,
      currentPrice: price,
      basePrice: baseFlowPrice,
      day,
      borrowAPY: effectiveBorrowAPY,
      marketConditions,
    })

    // Track liquidation state
    if (traditional.status === 'liquidated') traditionalLiquidated = true
    if (fcm.status === 'liquidated') fcmLiquidated = true

    // Calculate Portfolio Value = Initial Deposit + Total Returns
    // Both positions start at same value ($1000), then diverge as:
    // - Traditional: Crashes to $0 on liquidation
    // - FCM: Survives via rebalancing + earns FYV yield
    const traditionalPortfolioValue = initialDeposit + traditional.totalReturns
    const fcmPortfolioValue = initialDeposit + fcm.totalReturns

    // Keep FYV breakdown for tooltip
    const alpEquity = fcm.collateralValueUSD - fcm.debtAmount
    const fyvBalance = fcm.fyvBalance ?? 0

    chartData.push({
      day,
      year,
      date,
      traditionalValue: traditionalLiquidated ? 0 : traditionalPortfolioValue,
      fcmValue: fcmLiquidated ? 0 : fcmPortfolioValue,
      price,
      liquidationPrice: liquidationValue,
      traditionalLiquidated,
      fcmLiquidated,
      // FYV breakdown for tooltip
      fyvBalance: fcmLiquidated ? 0 : fyvBalance,
      alpEquity: fcmLiquidated ? 0 : alpEquity,
    })
  }

  return chartData
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
  const startYear = state.marketConditions.startYear ?? 2020
  const endYear = state.marketConditions.endYear ?? 2020
  const isMultiYear = state.marketConditions.dataMode === 'historic' &&
    (state.marketConditions.collateralToken === 'btc' || state.marketConditions.collateralToken === 'eth')

  if (state.marketConditions.dataMode === 'historic') {
    if (isMultiYear) {
      // Use multi-year price data for BTC/ETH
      currentPrice = getMultiYearTokenPrice(
        state.marketConditions.collateralToken as 'btc' | 'eth',
        clampedDay,
        startYear,
        endYear
      )
    } else {
      // Use single-year historic price data
      currentPrice = getTokenPrice(state.marketConditions.collateralToken, clampedDay)
    }
  } else {
    // Use simulated price data
    currentPrice = calculatePriceAtDay(
      state.baseFlowPrice,
      state.marketConditions.priceChange,
      clampedDay,
      state.maxDay,
      state.marketConditions.volatility,
      state.marketConditions.pattern ?? 'linear'
    )
  }

  // Calculate effective borrow APY with any rate changes or overrides
  const baseBorrowAPY = state.marketConditions.borrowAPY ?? PROTOCOL_CONFIG.borrowAPY
  const effectiveBorrowAPY = baseBorrowAPY + (state.marketConditions.interestRateChange / 100)

  // Calculate initial collateral in tokens from USD value at day 0 price
  const initialCollateralTokens = state.initialDeposit / state.baseFlowPrice

  // Simulate traditional position
  const traditional = simulateTraditionalPosition({
    initialCollateral: initialCollateralTokens,
    currentPrice,
    basePrice: state.baseFlowPrice,
    day: clampedDay,
    borrowAPY: effectiveBorrowAPY,
    marketConditions: state.marketConditions,
  })

  // Simulate FCM position
  const fcm = simulateFCMPosition({
    initialCollateral: initialCollateralTokens,
    currentPrice,
    basePrice: state.baseFlowPrice,
    day: clampedDay,
    borrowAPY: effectiveBorrowAPY,
    marketConditions: state.marketConditions,
  })

  // Generate events
  const allEvents = generateAllEvents(
    clampedDay,
    initialCollateralTokens,
    state.baseFlowPrice,
    state.marketConditions.priceChange,
    traditional,
    fcm,
    state.marketConditions
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
