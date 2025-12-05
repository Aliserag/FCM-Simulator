import { PositionState } from '@/types'
import { PROTOCOL_CONFIG } from '@/lib/constants'
import {
  calculateHealthFactor,
  calculateCollateralValueUSD,
  calculateInitialBorrow,
  calculateCompoundInterest,
  calculateLiquidationLoss,
  calculateNetReturns,
  isLiquidatable,
} from './calculations'

/**
 * Traditional Lending Simulation
 *
 * Traditional lending (like Aave) does NOT have automatic rebalancing.
 * When health factor drops, the user must manually repay or add collateral.
 * If they don't, and health drops below 1.0, they get liquidated.
 */

export interface TraditionalSimulationParams {
  initialCollateral: number      // Initial FLOW deposited
  currentPrice: number           // Current FLOW price
  basePrice: number              // Starting FLOW price
  day: number                    // Current simulation day
  borrowAPY: number              // Annual borrow interest rate
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
    rebalanceCount: 0, // Traditional never rebalances
  }
}

/**
 * Simulate traditional position at a given day
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
  } = params

  // Get initial state values
  const initialBorrow = calculateInitialBorrow(
    initialCollateral,
    basePrice,
    PROTOCOL_CONFIG.targetHealth
  )

  // Calculate accrued interest
  const accruedInterest = calculateCompoundInterest(initialBorrow, borrowAPY, day)

  // Current debt = initial borrow + accrued interest
  const currentDebt = initialBorrow + accruedInterest

  // Collateral value at current price
  const collateralValueUSD = calculateCollateralValueUSD(initialCollateral, currentPrice)

  // Calculate health factor
  const healthFactor = calculateHealthFactor(
    initialCollateral,
    currentPrice,
    currentDebt
  )

  // Check for liquidation
  const liquidated = isLiquidatable(healthFactor)

  // Calculate returns using equity-based formula
  const initialCollateralValue = initialCollateral * basePrice
  let totalReturns: number
  let status: 'healthy' | 'warning' | 'liquidated'

  if (liquidated) {
    totalReturns = calculateNetReturns(
      collateralValueUSD,
      initialCollateralValue,
      currentDebt,
      initialBorrow,
      true
    )
    status = 'liquidated'
  } else {
    totalReturns = calculateNetReturns(
      collateralValueUSD,
      initialCollateralValue,
      currentDebt,
      initialBorrow,
      false
    )

    // Determine status based on health
    if (healthFactor >= PROTOCOL_CONFIG.targetHealth) {
      status = 'healthy'
    } else {
      status = 'warning'
    }
  }

  return {
    day,
    collateralAmount: liquidated ? 0 : initialCollateral,
    collateralValueUSD: liquidated ? 0 : collateralValueUSD,
    debtAmount: liquidated ? 0 : currentDebt,
    debtValueUSD: liquidated ? 0 : currentDebt,
    healthFactor: liquidated ? 0 : healthFactor,
    status,
    totalReturns,
    accruedInterest,
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
