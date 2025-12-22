import { PositionState, MarketConditions } from '@/types'
import { PROTOCOL_CONFIG, getVolatilityThresholds, getTokenFCMThresholds, INTRADAY_CHECKPOINTS, getFYVYieldRateForDay } from '@/lib/constants'
import {
  calculateHealthFactor,
  calculateCollateralValueUSD,
  calculateInitialBorrow,
  calculateCompoundInterest,
  calculateRebalanceRepayAmount,
  calculateNetReturns,
  needsRebalancing,
  isLiquidatable,
  calculatePriceAtDay,
  calculateVolatility,
} from './calculations'
import { getTokenPrice, getTokenSupplyAPY } from '@/data/historicPrices'
import { getMultiYearTokenPrice, getMultiYearPrices } from '@/data/multiYearPrices'

/**
 * FCM (Flow Credit Market) Lending Simulation
 *
 * FCM has AUTOMATIC REBALANCING based on the Flow Credit Market documentation:
 * - When health < minHealth (1.1), automatically repays debt using collateral
 * - The TopUpSource pulls funds to repay debt, restoring health to target (1.3)
 * - This protects users from liquidation in normal market conditions
 *
 * Key difference from traditional lending:
 * - Traditional: No action taken when health drops → liquidation
 * - FCM: Automatic debt repayment → position survives
 */

export interface FCMSimulationParams {
  initialCollateral: number      // Initial tokens deposited
  currentPrice: number           // Current token price (for final day display)
  basePrice: number              // Starting token price (Day 0)
  day: number                    // Current simulation day
  borrowAPY: number              // Annual borrow interest rate
  marketConditions?: MarketConditions  // For historic price lookup
}

interface FCMState {
  collateralAmount: number
  debtAmount: number
  rebalanceCount: number
  leverageUpCount: number   // Number of upward leverage events (borrow more when overcollateralized)
  totalInterestPaid: number
  totalYieldEarned: number
  accumulatedYield: number  // Yield not yet used for debt repayment
  // FYV (Flow Yield Vault) state - per FCM architecture
  // Borrowed MOET is deployed to FYV via DrawDownSink, earns yield
  fyvBalance: number           // Current MOET balance in FYV
  fyvTotalYieldEarned: number  // Cumulative yield earned from FYV strategies
  fyvTotalDeployed: number     // Cumulative MOET deployed to FYV
  fyvTotalWithdrawn: number    // Cumulative MOET withdrawn from FYV (for rebalancing)
}

// Store FCM state per day for tracking rebalances
const fcmStateCache = new Map<number, FCMState>()

/**
 * Initialize an FCM lending position
 */
export function initializeFCMPosition(
  initialCollateral: number,
  initialPrice: number
): PositionState {
  const collateralValueUSD = calculateCollateralValueUSD(initialCollateral, initialPrice)
  const initialBorrow = calculateInitialBorrow(
    initialCollateral,
    initialPrice,
    PROTOCOL_CONFIG.targetHealth
  )

  // Reset cache for new simulation
  fcmStateCache.clear()

  return {
    day: 0,
    collateralAmount: initialCollateral,
    collateralValueUSD,
    debtAmount: initialBorrow,
    debtValueUSD: initialBorrow,
    healthFactor: PROTOCOL_CONFIG.targetHealth,
    status: 'healthy',
    totalReturns: 0,
    accruedInterest: 0,
    earnedYield: 0,
    rebalanceCount: 0,
    // FYV: Initial borrow is deployed to FYV via DrawDownSink (per FCM architecture)
    fyvBalance: initialBorrow,
    fyvYieldEarned: 0,
  }
}

/**
 * Helper function to get price at a specific day
 * Uses multi-year historic data if available, otherwise falls back to single-year or simulated
 */
function getPriceAtDay(
  day: number,
  basePrice: number,
  marketConditions?: MarketConditions
): number {
  if (marketConditions?.dataMode === 'historic' && marketConditions.collateralToken) {
    const startYear = marketConditions.startYear ?? 2020
    const endYear = marketConditions.endYear ?? 2020
    const isMultiYear = (marketConditions.collateralToken === 'btc' || marketConditions.collateralToken === 'eth')

    if (isMultiYear) {
      // Use multi-year price data for BTC/ETH
      return getMultiYearTokenPrice(
        marketConditions.collateralToken as 'btc' | 'eth',
        day,
        startYear,
        endYear
      )
    }
    // Single-year historic data
    return getTokenPrice(marketConditions.collateralToken, day)
  }
  // Fallback to simulated price
  return calculatePriceAtDay(
    basePrice,
    marketConditions?.priceChange ?? -30,
    day,
    365,
    marketConditions?.volatility ?? 'medium',
    marketConditions?.pattern ?? 'linear'
  )
}

/**
 * Simulate FCM position at a given day
 *
 * This is the key differentiator from traditional lending:
 * - FCM monitors health factor continuously
 * - When health drops below minHealth, FCM triggers automatic rebalancing
 * - Rebalancing uses collateral to repay debt, restoring health to target
 * - This protects the position from liquidation
 *
 * NEW: Dynamic volatility-based thresholds
 * - Low volatility: aggressive leverage settings
 * - High volatility: conservative settings, disable leverage-up
 */
export function simulateFCMPosition(
  params: FCMSimulationParams
): PositionState {
  const {
    initialCollateral,
    currentPrice,
    basePrice,
    day,
    borrowAPY,
    marketConditions,
  } = params

  // Get token-specific base thresholds
  const tokenThresholds = marketConditions?.collateralToken
    ? getTokenFCMThresholds(marketConditions.collateralToken)
    : { minHealth: PROTOCOL_CONFIG.minHealth, targetHealth: PROTOCOL_CONFIG.targetHealth, maxHealth: PROTOCOL_CONFIG.maxHealth }

  // User overrides take precedence over token defaults
  const baseTargetHealth = marketConditions?.fcmTargetHealth ?? tokenThresholds.targetHealth
  const baseMinHealth = marketConditions?.fcmMinHealth ?? tokenThresholds.minHealth
  const baseMaxHealth = marketConditions?.fcmMaxHealth ?? tokenThresholds.maxHealth
  const collateralFactor = marketConditions?.collateralFactor ?? PROTOCOL_CONFIG.collateralFactor

  // Get initial borrow amount at target health
  // Borrow = (Collateral × Price × CollateralFactor) / TargetHealth
  const initialBorrow = calculateInitialBorrow(
    initialCollateral,
    basePrice,
    baseTargetHealth,
    collateralFactor
  )

  // Initialize FCM state
  // Per FCM architecture: Initial borrow is deployed to FYV via DrawDownSink
  let state: FCMState = {
    collateralAmount: initialCollateral,
    debtAmount: initialBorrow,
    rebalanceCount: 0,
    leverageUpCount: 0,
    totalInterestPaid: 0,
    totalYieldEarned: 0,
    accumulatedYield: 0,
    // FYV: Initial borrow goes to FYV (DrawDownSink → FYV.swap(MOET → YieldToken))
    fyvBalance: initialBorrow,
    fyvTotalYieldEarned: 0,
    fyvTotalDeployed: initialBorrow,
    fyvTotalWithdrawn: 0,
  }

  // Get start year for FYV yield rate lookup
  const startYear = marketConditions?.startYear ?? 2020

  // Get supply APY from override or token-specific value
  const tokenSupplyAPY = marketConditions?.supplyAPY
    ?? (marketConditions?.collateralToken
      ? getTokenSupplyAPY(marketConditions.collateralToken)
      : PROTOCOL_CONFIG.supplyAPY)

  // Get price array for volatility calculation (historic mode only)
  let priceArray: number[] = []
  if (marketConditions?.dataMode === 'historic' && marketConditions.collateralToken) {
    const startYear = marketConditions.startYear ?? 2020
    const endYear = marketConditions.endYear ?? 2020
    if (marketConditions.collateralToken === 'btc' || marketConditions.collateralToken === 'eth') {
      priceArray = getMultiYearPrices(marketConditions.collateralToken, startYear, endYear)
    }
  }

  // Track sustained growth for leverage-up
  let consecutiveUpDays = 0
  const SUSTAINED_GROWTH_DAYS = 7  // Require 1 week of uptrend before leverage-up
  const MAX_VOLATILITY_FOR_LEVERAGE = 80  // Allow leverage-up in low-medium volatility

  // Simulate day by day - FCM monitors and rebalances continuously
  // Using intraday checkpoints to simulate Flow's scheduled transaction monitoring
  for (let d = 1; d <= day; d++) {
    // Get the ACTUAL price at start and end of day
    const prevDayPrice = d > 0 ? getPriceAtDay(d - 1, basePrice, marketConditions) : basePrice
    const dayEndPrice = getPriceAtDay(d, basePrice, marketConditions)

    // Track price trend for sustained growth check (at end of day)
    if (dayEndPrice > prevDayPrice * 1.001) {  // Require >0.1% gain to count as "up"
      consecutiveUpDays++
    } else {
      consecutiveUpDays = 0  // Reset on any flat or down day
    }

    // Calculate rolling volatility and get dynamic thresholds
    // For historic mode: calculate from real price data
    // For simulated mode: map user's volatility selection to percentage
    let volatility: number
    if (priceArray.length > 0) {
      volatility = calculateVolatility(priceArray, d, 30)
    } else {
      // Simulated mode: map user's volatility selection to representative percentage
      // This ensures dynamic thresholds work correctly in simulated scenarios
      const volMap: Record<string, number> = { low: 30, medium: 60, high: 100 }
      volatility = volMap[marketConditions?.volatility ?? 'medium']
    }
    const dynamicThresholds = getVolatilityThresholds(volatility)

    // Threshold priority: User overrides > Dynamic volatility-adjusted
    // This ensures high volatility scenarios use conservative thresholds
    const fcmMinHealth = marketConditions?.fcmMinHealth ?? dynamicThresholds.minHealth
    const fcmTargetHealth = marketConditions?.fcmTargetHealth ?? dynamicThresholds.targetHealth
    // For maxHealth: high volatility forces Infinity for safety (disable leverage-up)
    const fcmMaxHealth = dynamicThresholds.maxHealth === Infinity
      ? Infinity
      : (marketConditions?.fcmMaxHealth ?? dynamicThresholds.maxHealth)

    // Calculate price ratio for intraday interpolation
    // This models continuous price movement within the day
    const priceRatio = dayEndPrice / prevDayPrice

    // ========== INTRADAY CHECKPOINTS FOR REBALANCING ==========
    // FCM checks health multiple times per day via scheduled transactions
    // This allows rebalancing during sharp intraday crashes before liquidation
    for (let checkpoint = 0; checkpoint < INTRADAY_CHECKPOINTS; checkpoint++) {
      const progress = (checkpoint + 1) / INTRADAY_CHECKPOINTS
      // Interpolate price using geometric progression (more realistic for price movements)
      const intradayPrice = prevDayPrice * Math.pow(priceRatio, progress)

      // Calculate health at this intraday checkpoint
      const checkpointHealth = calculateHealthFactor(
        state.collateralAmount,
        intradayPrice,
        state.debtAmount,
        collateralFactor
      )

      // Check if DOWNWARD rebalancing is needed at this checkpoint
      if (checkpointHealth < fcmMinHealth && checkpointHealth > 0) {
        // Health too low - FCM automatically repays debt to restore target health
        const repayAmount = calculateRebalanceRepayAmount(
          checkpointHealth,
          fcmTargetHealth,
          state.debtAmount,
          state.collateralAmount,
          intradayPrice
        )

        if (repayAmount > 0 && repayAmount <= state.debtAmount) {
          let remainingRepay = repayAmount

          // Priority 1: Use accumulated collateral yield
          if (state.accumulatedYield > 0) {
            const yieldUsed = Math.min(state.accumulatedYield, remainingRepay)
            state.debtAmount -= yieldUsed
            state.accumulatedYield -= yieldUsed
            remainingRepay -= yieldUsed
          }

          // Priority 2: Withdraw from FYV via TopUpSource (per FCM architecture)
          // FYV swaps YieldToken → MOET to provide liquidity
          if (remainingRepay > 0 && state.fyvBalance > 0) {
            const fyvWithdraw = Math.min(state.fyvBalance, remainingRepay)
            state.fyvBalance -= fyvWithdraw
            state.debtAmount -= fyvWithdraw
            state.fyvTotalWithdrawn += fyvWithdraw
            remainingRepay -= fyvWithdraw
          }

          // Priority 3: Sell collateral only if FYV insufficient
          if (remainingRepay > 0 && remainingRepay <= state.debtAmount) {
            const collateralToSell = remainingRepay / intradayPrice

            // Only rebalance if we have enough collateral
            if (collateralToSell <= state.collateralAmount) {
              state.collateralAmount -= collateralToSell
              state.debtAmount -= remainingRepay
            }
          }

          state.rebalanceCount++
        }
      }
    }
    // ========== END INTRADAY CHECKPOINTS ==========

    // Daily operations use end-of-day price
    const dayPrice = dayEndPrice

    // 1. Earn daily supply yield on collateral value (deposited collateral earns interest)
    // Uses token-specific APY: BTC 1.5%, ETH 2.5%, SOL 5%, AVAX 4%
    const collateralValueUSD = state.collateralAmount * dayPrice
    const dailyYield = (collateralValueUSD * tokenSupplyAPY) / 365
    state.accumulatedYield += dailyYield
    state.totalYieldEarned += dailyYield

    // 2. FYV (Flow Yield Vault) earns yield on deployed MOET
    // Per FCM architecture: FYV strategies generate yield from LP positions, farming, lending
    // Uses historic DeFi stablecoin yields (15-20% in bull markets, 8% in bear)
    const fyvYieldRate = getFYVYieldRateForDay(d, startYear)
    const dailyFYVYield = (state.fyvBalance * fyvYieldRate) / 365
    state.fyvBalance += dailyFYVYield  // Yield compounds into FYV balance
    state.fyvTotalYieldEarned += dailyFYVYield

    // 3. Accrue daily interest on debt (this is a lending fee)
    const dailyInterest = (state.debtAmount * borrowAPY) / 365
    state.debtAmount += dailyInterest
    state.totalInterestPaid += dailyInterest

    // 3. Calculate current health factor at end of day
    const currentHealth = calculateHealthFactor(
      state.collateralAmount,
      dayPrice,
      state.debtAmount,
      collateralFactor
    )

    // 4. Apply yield to debt ONLY when health is LOW (protection mode)
    // When health >= targetHealth, retain yield for growth/leverage optimization
    // This allows health to rise naturally and trigger leverage-up events in bull markets
    if (currentHealth < fcmTargetHealth && state.accumulatedYield > 0 && state.debtAmount > 0) {
      const yieldToApply = Math.min(state.accumulatedYield, state.debtAmount)
      state.debtAmount -= yieldToApply
      state.accumulatedYield -= yieldToApply
    }

    // 5. Final end-of-day rebalance check (in case intraday missed any edge cases)
    if (currentHealth < fcmMinHealth && currentHealth > 0) {
      const repayAmount = calculateRebalanceRepayAmount(
        currentHealth,
        fcmTargetHealth,
        state.debtAmount,
        state.collateralAmount,
        dayPrice
      )

      if (repayAmount > 0 && repayAmount <= state.debtAmount) {
        let remainingRepay = repayAmount

        // Priority 1: Use accumulated collateral yield
        if (state.accumulatedYield > 0) {
          const yieldUsed = Math.min(state.accumulatedYield, remainingRepay)
          state.debtAmount -= yieldUsed
          state.accumulatedYield -= yieldUsed
          remainingRepay -= yieldUsed
        }

        // Priority 2: Withdraw from FYV via TopUpSource
        if (remainingRepay > 0 && state.fyvBalance > 0) {
          const fyvWithdraw = Math.min(state.fyvBalance, remainingRepay)
          state.fyvBalance -= fyvWithdraw
          state.debtAmount -= fyvWithdraw
          state.fyvTotalWithdrawn += fyvWithdraw
          remainingRepay -= fyvWithdraw
        }

        // Priority 3: Sell collateral only if FYV insufficient
        if (remainingRepay > 0 && remainingRepay <= state.debtAmount) {
          const collateralToSell = remainingRepay / dayPrice
          if (collateralToSell <= state.collateralAmount) {
            state.collateralAmount -= collateralToSell
            state.debtAmount -= remainingRepay
          }
        }

        state.rebalanceCount++
      }
    }

    // 6. Check if UPWARD rebalancing is needed (overcollateralized - maximize capital efficiency)
    // Per FCM architecture: When health > maxHealth, FCM borrows more and deploys to FYV
    // IMPORTANT: fcmMaxHealth = Infinity during high volatility disables this
    // Require sustained growth AND low volatility before leverage-up
    if (currentHealth > fcmMaxHealth && fcmMaxHealth < Infinity) {
      // Additional safety checks for leverage-up:
      // 1. Require sustained uptrend (7+ consecutive up days)
      // 2. Require low volatility environment
      const canLeverageUp = consecutiveUpDays >= SUSTAINED_GROWTH_DAYS && volatility < MAX_VOLATILITY_FOR_LEVERAGE

      if (canLeverageUp) {
        // Calculate effective collateral at current price
        const effectiveCollateral = state.collateralAmount * dayPrice * collateralFactor
        // Calculate target debt to restore target health
        const targetDebt = effectiveCollateral / fcmTargetHealth
        const fullAdditionalBorrow = targetDebt - state.debtAmount

        if (fullAdditionalBorrow > 0) {
          // Leverage-up: go 75% of the way to target for meaningful gains
          const additionalBorrow = fullAdditionalBorrow * 0.75

          // Per FCM architecture: Borrow more MOET and deploy to FYV via DrawDownSink
          // This is the KEY CHANGE from recursive collateral purchasing
          // Collateral stays UNCHANGED - borrowed MOET goes to yield strategies
          state.debtAmount += additionalBorrow
          state.fyvBalance += additionalBorrow  // Deploy to FYV
          state.fyvTotalDeployed += additionalBorrow
          state.leverageUpCount++

          // Reset consecutive up days after leverage-up to prevent back-to-back leverage
          consecutiveUpDays = 0
        }
      }
    }
  }

  // Final calculations at target day using current price
  const collateralValueUSD = calculateCollateralValueUSD(state.collateralAmount, currentPrice)
  const healthFactor = calculateHealthFactor(
    state.collateralAmount,
    currentPrice,
    state.debtAmount,
    collateralFactor
  )

  // FCM should survive crashes through rebalancing
  // Only liquidates in extreme conditions where rebalancing can't keep up
  const liquidated = isLiquidatable(healthFactor)

  // Calculate net returns (equity-based)
  // Per FCM architecture: Total Value = ALP Equity + FYV Balance
  // Initial equity = $1000 collateral - ~$615 debt = ~$385
  // Final Total Value = (collateral value - debt) + FYV balance
  const initialCollateralValue = initialCollateral * basePrice
  const alpEquity = collateralValueUSD - state.debtAmount
  const totalValue = alpEquity + state.fyvBalance

  // Returns based on Total Value change (includes FYV gains)
  // Compare against initialCollateralValue (user's deposit), not initialEquity
  // This ensures totalReturns = 0 at day 0 when totalValue = initialDeposit
  const totalReturns = liquidated ? -initialCollateralValue : (totalValue - initialCollateralValue)

  // Determine status based on health factor vs base target
  let status: 'healthy' | 'warning' | 'liquidated' = 'healthy'
  if (liquidated) {
    status = 'liquidated'
  } else if (healthFactor < baseTargetHealth) {
    status = 'warning'
  }

  return {
    day,
    collateralAmount: state.collateralAmount,
    collateralValueUSD,
    debtAmount: state.debtAmount,
    debtValueUSD: state.debtAmount,
    healthFactor,
    status,
    totalReturns,
    accruedInterest: state.totalInterestPaid,
    earnedYield: state.totalYieldEarned + state.fyvTotalYieldEarned,
    rebalanceCount: state.rebalanceCount,
    leverageUpCount: state.leverageUpCount,
    // FYV (Flow Yield Vault) data
    fyvBalance: state.fyvBalance,
    fyvYieldEarned: state.fyvTotalYieldEarned,
  }
}

// Event type for FCM rebalancing (both downward and upward)
// Includes FYV-related data per FCM architecture
export interface FCMRebalanceEvent {
  day: number
  healthBefore: number
  healthAfter: number
  type: 'rebalance_down' | 'leverage_up'
  amount: number  // repaidAmount for down, borrowedAmount for up
  // FYV-related data
  fyvWithdrawn?: number   // MOET withdrawn from FYV via TopUpSource (for rebalance_down)
  fyvDeployed?: number    // MOET deployed to FYV via DrawDownSink (for leverage_up)
  collateralSold?: number // Collateral sold (only if FYV insufficient)
}

/**
 * Get all FCM rebalance events (both downward and upward) up to a given day
 * Uses dynamic volatility-based thresholds for rebalancing decisions
 */
export function getFCMRebalanceEvents(
  initialCollateral: number,
  basePrice: number,
  targetPriceChangePercent: number,
  targetDay: number,
  borrowAPY: number,
  marketConditions?: MarketConditions
): FCMRebalanceEvent[] {
  const events: FCMRebalanceEvent[] = []

  // Get token-specific base thresholds
  const tokenThresholds = marketConditions?.collateralToken
    ? getTokenFCMThresholds(marketConditions.collateralToken)
    : { minHealth: PROTOCOL_CONFIG.minHealth, targetHealth: PROTOCOL_CONFIG.targetHealth, maxHealth: PROTOCOL_CONFIG.maxHealth }

  // User overrides take precedence over token defaults
  const collateralFactor = marketConditions?.collateralFactor ?? PROTOCOL_CONFIG.collateralFactor
  const baseTargetHealth = marketConditions?.fcmTargetHealth ?? tokenThresholds.targetHealth
  const baseMinHealth = marketConditions?.fcmMinHealth ?? tokenThresholds.minHealth
  const baseMaxHealth = marketConditions?.fcmMaxHealth ?? tokenThresholds.maxHealth

  const initialBorrow = calculateInitialBorrow(
    initialCollateral,
    basePrice,
    baseTargetHealth,
    collateralFactor
  )

  // Get supply APY from override or token-specific value (matching main simulation)
  const tokenSupplyAPY = marketConditions?.supplyAPY
    ?? (marketConditions?.collateralToken
      ? getTokenSupplyAPY(marketConditions.collateralToken)
      : PROTOCOL_CONFIG.supplyAPY)

  // Get start year for FYV yield rate lookup and price array
  const startYear = marketConditions?.startYear ?? 2020
  const endYear = marketConditions?.endYear ?? 2020

  // Get price array for volatility calculation (historic mode only)
  let priceArray: number[] = []
  if (marketConditions?.dataMode === 'historic' && marketConditions.collateralToken) {
    if (marketConditions.collateralToken === 'btc' || marketConditions.collateralToken === 'eth') {
      priceArray = getMultiYearPrices(marketConditions.collateralToken, startYear, endYear)
    }
  }

  let state = {
    collateralAmount: initialCollateral,
    debtAmount: initialBorrow,
    accumulatedYield: 0,
    // FYV state - initial borrow deployed to FYV via DrawDownSink
    fyvBalance: initialBorrow,
  }

  // Track sustained growth for leverage-up
  let consecutiveUpDays = 0
  const SUSTAINED_GROWTH_DAYS = 7  // Require 1 week of uptrend before leverage-up
  const MAX_VOLATILITY_FOR_LEVERAGE = 80  // Allow leverage-up in low-medium volatility

  for (let d = 1; d <= targetDay; d++) {
    // Get ACTUAL price at start and end of day
    const prevDayPrice = d > 0 ? getPriceAtDay(d - 1, basePrice, marketConditions) : basePrice
    const dayEndPrice = getPriceAtDay(d, basePrice, marketConditions)

    // Track price trend for sustained growth check (at end of day)
    if (dayEndPrice > prevDayPrice * 1.001) {  // Require >0.1% gain to count as "up"
      consecutiveUpDays++
    } else {
      consecutiveUpDays = 0  // Reset on any flat or down day
    }

    // Calculate rolling volatility and get dynamic thresholds
    // For historic mode: calculate from real price data
    // For simulated mode: map user's volatility selection to percentage
    let volatility: number
    if (priceArray.length > 0) {
      volatility = calculateVolatility(priceArray, d, 30)
    } else {
      // Simulated mode: map user's volatility selection to representative percentage
      const volMap: Record<string, number> = { low: 30, medium: 60, high: 100 }
      volatility = volMap[marketConditions?.volatility ?? 'medium']
    }
    const dynamicThresholds = getVolatilityThresholds(volatility)

    // Threshold priority: User overrides > Dynamic volatility-adjusted
    const fcmMinHealth = marketConditions?.fcmMinHealth ?? dynamicThresholds.minHealth
    const fcmTargetHealth = marketConditions?.fcmTargetHealth ?? dynamicThresholds.targetHealth
    // For maxHealth: high volatility forces Infinity for safety (disable leverage-up)
    const fcmMaxHealth = dynamicThresholds.maxHealth === Infinity
      ? Infinity
      : (marketConditions?.fcmMaxHealth ?? dynamicThresholds.maxHealth)

    // Calculate price ratio for intraday interpolation
    const priceRatio = dayEndPrice / prevDayPrice

    // ========== INTRADAY CHECKPOINTS FOR REBALANCING ==========
    // FCM checks health multiple times per day via scheduled transactions
    for (let checkpoint = 0; checkpoint < INTRADAY_CHECKPOINTS; checkpoint++) {
      const progress = (checkpoint + 1) / INTRADAY_CHECKPOINTS
      const intradayPrice = prevDayPrice * Math.pow(priceRatio, progress)

      // Calculate health at this intraday checkpoint
      const checkpointHealth = calculateHealthFactor(
        state.collateralAmount,
        intradayPrice,
        state.debtAmount,
        collateralFactor
      )

      // Check for DOWNWARD rebalancing at this checkpoint
      if (checkpointHealth < fcmMinHealth && checkpointHealth > 0) {
        const repayAmount = calculateRebalanceRepayAmount(
          checkpointHealth,
          fcmTargetHealth,
          state.debtAmount,
          state.collateralAmount,
          intradayPrice
        )

        if (repayAmount > 0 && repayAmount <= state.debtAmount) {
          let remainingRepay = repayAmount
          let fyvWithdrawn = 0
          let collateralSold = 0

          // Priority 1: Withdraw from FYV via TopUpSource
          if (state.fyvBalance > 0) {
            fyvWithdrawn = Math.min(state.fyvBalance, remainingRepay)
            state.fyvBalance -= fyvWithdrawn
            state.debtAmount -= fyvWithdrawn
            remainingRepay -= fyvWithdrawn
          }

          // Priority 2: Sell collateral if FYV insufficient
          if (remainingRepay > 0) {
            const collateralToSell = remainingRepay / intradayPrice
            if (collateralToSell <= state.collateralAmount) {
              state.collateralAmount -= collateralToSell
              state.debtAmount -= remainingRepay
              collateralSold = collateralToSell
            }
          }

          const healthAfter = calculateHealthFactor(
            state.collateralAmount,
            intradayPrice,
            state.debtAmount,
            collateralFactor
          )

          events.push({
            day: d,
            healthBefore: checkpointHealth,
            healthAfter,
            type: 'rebalance_down',
            amount: repayAmount,
            fyvWithdrawn: fyvWithdrawn > 0 ? fyvWithdrawn : undefined,
            collateralSold: collateralSold > 0 ? collateralSold : undefined,
          })
        }
      }
    }
    // ========== END INTRADAY CHECKPOINTS ==========

    // Daily operations use end-of-day price
    const dayPrice = dayEndPrice

    // 1. Earn daily supply yield on collateral value
    const collateralValueUSD = state.collateralAmount * dayPrice
    const dailyYield = (collateralValueUSD * tokenSupplyAPY) / 365
    state.accumulatedYield += dailyYield

    // 2. FYV earns yield on deployed MOET
    const fyvYieldRate = getFYVYieldRateForDay(d, startYear)
    const dailyFYVYield = (state.fyvBalance * fyvYieldRate) / 365
    state.fyvBalance += dailyFYVYield

    // 3. Add interest on debt
    const dailyInterest = (state.debtAmount * borrowAPY) / 365
    state.debtAmount += dailyInterest

    // 4. Calculate health at end of day
    const healthBefore = calculateHealthFactor(
      state.collateralAmount,
      dayPrice,
      state.debtAmount,
      collateralFactor
    )

    // 5. Apply yield to debt ONLY when health is LOW (protection mode)
    if (healthBefore < fcmTargetHealth && state.accumulatedYield > 0 && state.debtAmount > 0) {
      const yieldToApply = Math.min(state.accumulatedYield, state.debtAmount)
      state.debtAmount -= yieldToApply
      state.accumulatedYield -= yieldToApply
    }

    // Final end-of-day rebalance check (in case intraday missed any edge cases)
    if (healthBefore < fcmMinHealth && healthBefore > 0) {
      const repayAmount = calculateRebalanceRepayAmount(
        healthBefore,
        fcmTargetHealth,
        state.debtAmount,
        state.collateralAmount,
        dayPrice
      )

      if (repayAmount > 0 && repayAmount <= state.debtAmount) {
        let remainingRepay = repayAmount
        let fyvWithdrawn = 0
        let collateralSold = 0

        // Priority 1: Withdraw from FYV via TopUpSource
        if (state.fyvBalance > 0) {
          fyvWithdrawn = Math.min(state.fyvBalance, remainingRepay)
          state.fyvBalance -= fyvWithdrawn
          state.debtAmount -= fyvWithdrawn
          remainingRepay -= fyvWithdrawn
        }

        // Priority 2: Sell collateral if FYV insufficient
        if (remainingRepay > 0) {
          const collateralToSell = remainingRepay / dayPrice
          if (collateralToSell <= state.collateralAmount) {
            state.collateralAmount -= collateralToSell
            state.debtAmount -= remainingRepay
            collateralSold = collateralToSell
          }
        }

        const healthAfter = calculateHealthFactor(
          state.collateralAmount,
          dayPrice,
          state.debtAmount,
          collateralFactor
        )

        events.push({
          day: d,
          healthBefore,
          healthAfter,
          type: 'rebalance_down',
          amount: repayAmount,
          fyvWithdrawn: fyvWithdrawn > 0 ? fyvWithdrawn : undefined,
          collateralSold: collateralSold > 0 ? collateralSold : undefined,
        })
      }
    }

    // Check for UPWARD rebalancing (overcollateralized)
    // Per FCM architecture: Borrow more and deploy to FYV via DrawDownSink
    // IMPORTANT: fcmMaxHealth = Infinity during high volatility disables this
    if (healthBefore > fcmMaxHealth && fcmMaxHealth < Infinity) {
      const canLeverageUp = consecutiveUpDays >= SUSTAINED_GROWTH_DAYS && volatility < MAX_VOLATILITY_FOR_LEVERAGE

      if (canLeverageUp) {
        const effectiveCollateral = state.collateralAmount * dayPrice * collateralFactor
        const targetDebt = effectiveCollateral / fcmTargetHealth
        const fullAdditionalBorrow = targetDebt - state.debtAmount

        if (fullAdditionalBorrow > 0) {
          const additionalBorrow = fullAdditionalBorrow * 0.75

          // Per FCM architecture: Deploy to FYV (not buy collateral)
          state.debtAmount += additionalBorrow
          state.fyvBalance += additionalBorrow  // Deploy to FYV via DrawDownSink

          const healthAfter = calculateHealthFactor(
            state.collateralAmount,
            dayPrice,
            state.debtAmount,
            collateralFactor
          )

          events.push({
            day: d,
            healthBefore,
            healthAfter,
            type: 'leverage_up',
            amount: additionalBorrow,
            fyvDeployed: additionalBorrow,
          })

          consecutiveUpDays = 0
        }
      }
    }
  }

  return events
}
