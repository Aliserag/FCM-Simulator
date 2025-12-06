import { PositionState, MarketConditions } from '@/types'
import { PROTOCOL_CONFIG } from '@/lib/constants'
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
} from './calculations'
import { getTokenPrice } from '@/data/historicPrices'

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
  totalInterestPaid: number
  totalYieldEarned: number
  accumulatedYield: number  // Yield not yet used for debt repayment
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
  }
}

/**
 * Helper function to get price at a specific day
 * Uses historic data if available, otherwise calculates simulated price
 */
function getPriceAtDay(
  day: number,
  basePrice: number,
  marketConditions?: MarketConditions
): number {
  if (marketConditions?.dataMode === 'historic' && marketConditions.collateralToken) {
    return getTokenPrice(marketConditions.collateralToken, day)
  }
  // Fallback to simulated price
  return calculatePriceAtDay(
    basePrice,
    marketConditions?.priceChange ?? -30,
    day,
    365,
    marketConditions?.volatility ?? 'medium'
  )
}

/**
 * Simulate FCM position at a given day
 *
 * This is the key differentiator from traditional lending:
 * - FCM monitors health factor continuously
 * - When health drops below minHealth (1.1), FCM triggers automatic rebalancing
 * - Rebalancing uses collateral to repay debt, restoring health to target (1.3)
 * - This protects the position from liquidation
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

  // Get initial borrow amount at target health (1.3)
  // Borrow = (Collateral × Price × CollateralFactor) / TargetHealth
  const initialBorrow = calculateInitialBorrow(
    initialCollateral,
    basePrice,
    PROTOCOL_CONFIG.targetHealth
  )

  // Initialize FCM state
  let state: FCMState = {
    collateralAmount: initialCollateral,
    debtAmount: initialBorrow,
    rebalanceCount: 0,
    totalInterestPaid: 0,
    totalYieldEarned: 0,
    accumulatedYield: 0,
  }

  // Simulate day by day - FCM monitors and rebalances continuously
  for (let d = 1; d <= day; d++) {
    // Get the ACTUAL price at this day (historic or simulated)
    const dayPrice = getPriceAtDay(d, basePrice, marketConditions)

    // 1. Earn daily supply yield on collateral value (deposited collateral earns interest)
    const collateralValueUSD = state.collateralAmount * dayPrice
    const dailyYield = (collateralValueUSD * PROTOCOL_CONFIG.supplyAPY) / 365
    state.accumulatedYield += dailyYield
    state.totalYieldEarned += dailyYield

    // 2. Accrue daily interest on debt (this is a lending fee)
    const dailyInterest = (state.debtAmount * borrowAPY) / 365
    state.debtAmount += dailyInterest
    state.totalInterestPaid += dailyInterest

    // 3. FCM uses accumulated yield to continuously pay down debt
    // This is a key FCM feature: earned interest helps reduce debt
    if (state.accumulatedYield > 0 && state.debtAmount > 0) {
      const yieldToApply = Math.min(state.accumulatedYield, state.debtAmount)
      state.debtAmount -= yieldToApply
      state.accumulatedYield -= yieldToApply
    }

    // 4. Calculate current health factor
    const currentHealth = calculateHealthFactor(
      state.collateralAmount,
      dayPrice,
      state.debtAmount
    )

    // 5. Check if rebalancing is needed (FCM's automatic protection)
    if (currentHealth < PROTOCOL_CONFIG.minHealth && currentHealth > 0) {
      // Health too low - FCM automatically repays debt to restore target health
      // This is the key FCM feature from the documentation:
      // "When health < minHealth (1.1), automatically repays debt using collateral"

      const repayAmount = calculateRebalanceRepayAmount(
        currentHealth,
        PROTOCOL_CONFIG.targetHealth,
        state.debtAmount,
        state.collateralAmount,
        dayPrice
      )

      if (repayAmount > 0 && repayAmount <= state.debtAmount) {
        // First, use any remaining accumulated yield
        let remainingRepay = repayAmount
        if (state.accumulatedYield > 0) {
          const yieldUsed = Math.min(state.accumulatedYield, remainingRepay)
          state.debtAmount -= yieldUsed
          state.accumulatedYield -= yieldUsed
          remainingRepay -= yieldUsed
        }

        // Then sell collateral if still needed
        if (remainingRepay > 0 && remainingRepay <= state.debtAmount) {
          const collateralToSell = remainingRepay / dayPrice

          // Only rebalance if we have enough collateral
          if (collateralToSell <= state.collateralAmount) {
            state.collateralAmount -= collateralToSell
            state.debtAmount -= remainingRepay
            state.rebalanceCount++
          }
        }
      }
    }
  }

  // Final calculations at target day using current price
  const collateralValueUSD = calculateCollateralValueUSD(state.collateralAmount, currentPrice)
  const healthFactor = calculateHealthFactor(
    state.collateralAmount,
    currentPrice,
    state.debtAmount
  )

  // FCM should survive crashes through rebalancing
  // Only liquidates in extreme conditions where rebalancing can't keep up
  const liquidated = isLiquidatable(healthFactor)

  // Calculate net returns (equity-based)
  // Initial equity = $1000 collateral - ~$615 debt = ~$385
  // Final equity = current collateral value - current debt
  const initialCollateralValue = initialCollateral * basePrice
  const totalReturns = calculateNetReturns(
    collateralValueUSD,
    initialCollateralValue,
    state.debtAmount,
    initialBorrow,
    liquidated
  )

  // Determine status
  let status: 'healthy' | 'warning' | 'liquidated' = 'healthy'
  if (liquidated) {
    status = 'liquidated'
  } else if (healthFactor < PROTOCOL_CONFIG.targetHealth) {
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
    earnedYield: state.totalYieldEarned,
    rebalanceCount: state.rebalanceCount,
  }
}

/**
 * Get rebalance events that occurred up to a given day
 */
export function getFCMRebalanceEvents(
  initialCollateral: number,
  basePrice: number,
  targetPriceChangePercent: number,
  targetDay: number,
  borrowAPY: number,
  marketConditions?: MarketConditions
): Array<{ day: number; healthBefore: number; healthAfter: number; repaidAmount: number }> {
  const events: Array<{ day: number; healthBefore: number; healthAfter: number; repaidAmount: number }> = []

  const initialBorrow = calculateInitialBorrow(
    initialCollateral,
    basePrice,
    PROTOCOL_CONFIG.targetHealth
  )

  let state = {
    collateralAmount: initialCollateral,
    debtAmount: initialBorrow,
  }

  for (let d = 1; d <= targetDay; d++) {
    // Get ACTUAL price at this day (historic or simulated)
    const dayPrice = getPriceAtDay(d, basePrice, marketConditions)

    // Add interest
    const dailyInterest = (state.debtAmount * borrowAPY) / 365
    state.debtAmount += dailyInterest

    // Calculate health
    const healthBefore = calculateHealthFactor(
      state.collateralAmount,
      dayPrice,
      state.debtAmount
    )

    // Check for rebalancing
    if (healthBefore < PROTOCOL_CONFIG.minHealth && healthBefore > 0) {
      const repayAmount = calculateRebalanceRepayAmount(
        healthBefore,
        PROTOCOL_CONFIG.targetHealth,
        state.debtAmount,
        state.collateralAmount,
        dayPrice
      )

      if (repayAmount > 0 && repayAmount <= state.debtAmount) {
        const collateralToSell = repayAmount / dayPrice
        if (collateralToSell <= state.collateralAmount) {
          state.collateralAmount -= collateralToSell
          state.debtAmount -= repayAmount

          const healthAfter = calculateHealthFactor(
            state.collateralAmount,
            dayPrice,
            state.debtAmount
          )

          events.push({
            day: d,
            healthBefore,
            healthAfter,
            repaidAmount: repayAmount,
          })
        }
      }
    }
  }

  return events
}
