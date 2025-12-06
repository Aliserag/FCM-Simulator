import { PositionState, MarketConditions } from '@/types'
import { PROTOCOL_CONFIG } from '@/lib/constants'
import {
  calculateHealthFactor,
  calculateCollateralValueUSD,
  calculateInitialBorrow,
  calculateCompoundInterest,
  calculateLiquidationLoss,
  calculateNetReturns,
  isLiquidatable,
  calculatePriceAtDay,
} from './calculations'
import { getTokenPrice } from '@/data/historicPrices'

/**
 * Traditional Lending Simulation
 *
 * Traditional lending (like Aave) does NOT have automatic rebalancing.
 * When health factor drops, the user must manually repay or add collateral.
 * If they don't, and health drops below 1.0, they get liquidated.
 */

export interface TraditionalSimulationParams {
  initialCollateral: number      // Initial FLOW deposited
  currentPrice: number           // Current FLOW price (for final day display)
  basePrice: number              // Starting FLOW price (Day 0)
  day: number                    // Current simulation day
  borrowAPY: number              // Annual borrow interest rate
  marketConditions?: MarketConditions  // For historic price lookup
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
 * Initialize a traditional lending position
 */
export function initializeTraditionalPosition(
  initialCollateral: number,
  initialPrice: number
): PositionState {
  const collateralValueUSD = calculateCollateralValueUSD(initialCollateral, initialPrice)
  const initialBorrow = calculateInitialBorrow(
    initialCollateral,
    initialPrice,
    PROTOCOL_CONFIG.targetHealth
  )

  return {
    day: 0,
    collateralAmount: initialCollateral,
    collateralValueUSD,
    debtAmount: initialBorrow,
    debtValueUSD: initialBorrow, // MOET/USDC = $1
    healthFactor: PROTOCOL_CONFIG.targetHealth, // Starts at target
    status: 'healthy',
    totalReturns: 0,
    accruedInterest: 0,
    earnedYield: 0, // Traditional doesn't auto-apply yield to debt
    rebalanceCount: 0, // Traditional never rebalances
  }
}

/**
 * Simulate traditional position at a given day
 *
 * Traditional lending has NO automatic protection:
 * - When health drops below liquidation threshold (1.0), position is liquidated
 * - No rebalancing, no automatic debt repayment
 * - User loses collateral to liquidators
 */
export function simulateTraditionalPosition(
  params: TraditionalSimulationParams
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
  const initialBorrow = calculateInitialBorrow(
    initialCollateral,
    basePrice,
    PROTOCOL_CONFIG.targetHealth
  )

  // Track state through simulation
  let collateralAmount = initialCollateral
  let debtAmount = initialBorrow
  let totalInterestPaid = 0
  let liquidated = false
  let liquidationDay = 0

  // Simulate day by day to check for liquidation with actual prices
  for (let d = 1; d <= day; d++) {
    // Get the ACTUAL price at this day (historic or simulated)
    const dayPrice = getPriceAtDay(d, basePrice, marketConditions)

    // 1. Accrue daily interest on debt
    const dailyInterest = (debtAmount * borrowAPY) / 365
    debtAmount += dailyInterest
    totalInterestPaid += dailyInterest

    // 2. Calculate current health factor
    const currentHealth = calculateHealthFactor(
      collateralAmount,
      dayPrice,
      debtAmount
    )

    // 3. Check for liquidation (traditional has no protection)
    if (currentHealth < PROTOCOL_CONFIG.liquidationThreshold) {
      liquidated = true
      liquidationDay = d
      break
    }
  }

  // Final calculations at target day
  const finalPrice = liquidated ? getPriceAtDay(liquidationDay, basePrice, marketConditions) : currentPrice
  const collateralValueUSD = liquidated ? 0 : calculateCollateralValueUSD(collateralAmount, currentPrice)
  const healthFactor = liquidated ? 0 : calculateHealthFactor(collateralAmount, currentPrice, debtAmount)

  // Calculate returns using equity-based formula
  const initialCollateralValue = initialCollateral * basePrice
  const totalReturns = calculateNetReturns(
    liquidated ? 0 : collateralValueUSD,
    initialCollateralValue,
    liquidated ? 0 : debtAmount,
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
    collateralAmount: liquidated ? 0 : collateralAmount,
    collateralValueUSD,
    debtAmount: liquidated ? 0 : debtAmount,
    debtValueUSD: liquidated ? 0 : debtAmount,
    healthFactor,
    status,
    totalReturns,
    accruedInterest: totalInterestPaid,
    earnedYield: 0, // Traditional doesn't auto-apply yield to debt
    rebalanceCount: 0,
  }
}

/**
 * Check when traditional position will be liquidated given price trajectory
 * Returns the day of liquidation or null if no liquidation occurs
 */
export function predictTraditionalLiquidationDay(
  initialCollateral: number,
  basePrice: number,
  targetPriceChangePercent: number,
  totalDays: number,
  borrowAPY: number
): number | null {
  // Binary search for liquidation day
  for (let day = 1; day <= totalDays; day++) {
    const progress = day / totalDays
    const currentPrice = basePrice * (1 + (targetPriceChangePercent / 100) * progress)

    const position = simulateTraditionalPosition({
      initialCollateral,
      currentPrice,
      basePrice,
      day,
      borrowAPY,
    })

    if (position.status === 'liquidated') {
      return day
    }
  }

  return null
}
