import { PositionState } from '@/types'
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
} from './calculations'

/**
 * FCM (Flow Credit Market) Lending Simulation
 *
 * FCM has AUTOMATIC REBALANCING:
 * - When health < minHealth (1.1), automatically repays debt
 * - When health > maxHealth (1.5), can borrow more
 * - Target health is 1.3
 *
 * This protects users from liquidation in normal market conditions.
 */

export interface FCMSimulationParams {
  initialCollateral: number      // Initial FLOW deposited
  currentPrice: number           // Current FLOW price
  basePrice: number              // Starting FLOW price
  day: number                    // Current simulation day
  borrowAPY: number              // Annual borrow interest rate
}

interface FCMState {
  collateralAmount: number
  debtAmount: number
  rebalanceCount: number
  totalInterestPaid: number
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
    rebalanceCount: 0,
  }
}

/**
 * Simulate FCM position at a given day
 * This is the key differentiator from traditional lending
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
  } = params

  // Get initial borrow amount
  const initialBorrow = calculateInitialBorrow(
    initialCollateral,
    basePrice,
    PROTOCOL_CONFIG.targetHealth
  )

  // Start simulation from day 0 or get cached state
  let state: FCMState = {
    collateralAmount: initialCollateral,
    debtAmount: initialBorrow,
    rebalanceCount: 0,
    totalInterestPaid: 0,
  }

  // Simulate day by day (needed because rebalancing changes state)
  for (let d = 1; d <= day; d++) {
    // Calculate price at this day (linear interpolation)
    const progress = d / 365 // Assuming 365 day simulation
    const priceChangePercent = ((currentPrice - basePrice) / basePrice) * 100
    const dayPrice = basePrice * (1 + (priceChangePercent / 100) * (d / day))

    // Add daily interest to debt
    const dailyInterest = (state.debtAmount * borrowAPY) / 365
    state.debtAmount += dailyInterest
    state.totalInterestPaid += dailyInterest

    // Calculate current health
    const currentHealth = calculateHealthFactor(
      state.collateralAmount,
      dayPrice,
      state.debtAmount
    )

    // Check if rebalancing is needed
    const rebalanceType = needsRebalancing(currentHealth)

    if (rebalanceType === 'under') {
      // Health too low - repay debt to restore target health
      const repayAmount = calculateRebalanceRepayAmount(
        currentHealth,
        PROTOCOL_CONFIG.targetHealth,
        state.debtAmount,
        state.collateralAmount,
        dayPrice
      )

      if (repayAmount > 0) {
        // In FCM, repayment comes from collateral (via TopUpSource)
        // The debt is reduced, but some collateral is sold to cover it
        const collateralToSell = repayAmount / dayPrice
        state.collateralAmount -= collateralToSell
        state.debtAmount -= repayAmount
        state.rebalanceCount++
      }
    } else if (rebalanceType === 'over') {
      // Health too high - could borrow more (but we'll skip this for simplicity)
      // This is a feature but not critical for the demo
    }
  }

  // Final calculations at target day
  const collateralValueUSD = calculateCollateralValueUSD(state.collateralAmount, currentPrice)
  const healthFactor = calculateHealthFactor(
    state.collateralAmount,
    currentPrice,
    state.debtAmount
  )

  // FCM should never be liquidated (in normal conditions)
  const liquidated = isLiquidatable(healthFactor)

  // Calculate returns using equity-based formula
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
  borrowAPY: number
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
    const progress = d / 365
    const dayPrice = basePrice * (1 + (targetPriceChangePercent / 100) * progress)

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
    if (healthBefore < PROTOCOL_CONFIG.minHealth) {
      const repayAmount = calculateRebalanceRepayAmount(
        healthBefore,
        PROTOCOL_CONFIG.targetHealth,
        state.debtAmount,
        state.collateralAmount,
        dayPrice
      )

      if (repayAmount > 0) {
        const collateralToSell = repayAmount / dayPrice
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

  return events
}
