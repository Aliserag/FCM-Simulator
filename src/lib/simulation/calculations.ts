import { PROTOCOL_CONFIG } from '@/lib/constants'
import { PricePattern } from '@/types'

/**
 * Core FCM calculations - Realistic DeFi lending math
 * Based on actual Aave/Compound mechanics
 */

/**
 * Calculate health factor
 * Health = (Collateral × Price × CollateralFactor) / Debt
 * Standard DeFi formula used by Aave, Compound, etc.
 */
export function calculateHealthFactor(
  collateralAmount: number,
  collateralPrice: number,
  debtAmount: number,
  collateralFactor: number = PROTOCOL_CONFIG.collateralFactor
): number {
  // Input validation - return safe defaults for invalid inputs
  if (collateralAmount <= 0 || collateralPrice <= 0) return 0
  if (debtAmount <= 0) return 999 // Cap at 999 instead of Infinity for UI display
  const effectiveCollateral = collateralAmount * collateralPrice * collateralFactor
  return Math.min(999, effectiveCollateral / debtAmount)
}

/**
 * Calculate effective collateral value (what counts toward borrowing power)
 */
export function calculateEffectiveCollateral(
  collateralAmount: number,
  collateralPrice: number,
  collateralFactor: number = PROTOCOL_CONFIG.collateralFactor
): number {
  if (collateralAmount <= 0 || collateralPrice <= 0) return 0
  return collateralAmount * collateralPrice * collateralFactor
}

/**
 * Calculate collateral value in USD
 */
export function calculateCollateralValueUSD(
  collateralAmount: number,
  collateralPrice: number
): number {
  return collateralAmount * collateralPrice
}

/**
 * Calculate initial borrow amount at target health
 * Borrow = Effective Collateral / Target Health
 */
export function calculateInitialBorrow(
  collateralAmount: number,
  collateralPrice: number,
  targetHealth: number = PROTOCOL_CONFIG.targetHealth,
  collateralFactor: number = PROTOCOL_CONFIG.collateralFactor
): number {
  // Prevent division by zero
  const safeTargetHealth = Math.max(0.1, targetHealth)
  const safeCollateralFactor = Math.max(0.1, collateralFactor)
  const effectiveCollateral = calculateEffectiveCollateral(
    collateralAmount,
    collateralPrice,
    safeCollateralFactor
  )
  return effectiveCollateral / safeTargetHealth
}

/**
 * Calculate compound interest accrued over time
 * Standard DeFi compound interest formula
 * Interest = Principal × ((1 + rate/365)^days - 1)
 */
export function calculateCompoundInterest(
  principal: number,
  annualRate: number,
  days: number
): number {
  const dailyRate = annualRate / 365
  return principal * (Math.pow(1 + dailyRate, days) - 1)
}

/**
 * Calculate price at a given day with distinct market patterns
 *
 * Patterns:
 * - linear: Straight line trend (for Decline, Rate Hike)
 * - crash: Sharp drop, stays low with minimal recovery (for Crash)
 * - v_shape: Drop then strong recovery (for V-Shape)
 * - bull: Accelerating growth with pullbacks (for Bull Run)
 */
export function calculatePriceAtDay(
  basePrice: number,
  targetChangePercent: number,
  currentDay: number,
  totalDays: number,
  volatility: 'low' | 'medium' | 'high' = 'medium',
  pattern: PricePattern = 'linear'
): number {
  if (currentDay === 0) return basePrice

  const progress = currentDay / totalDays

  // Volatility component for realistic price swings
  const volatilityFactors = {
    low: 0.003,
    medium: 0.008,
    high: 0.015,
  }

  const seed = currentDay * 137.5
  const noise = Math.sin(seed * 0.1) * volatilityFactors[volatility] +
                Math.cos(seed * 0.07) * volatilityFactors[volatility] * 0.5

  let trendChange: number
  const targetChange = targetChangePercent / 100 // Convert to decimal

  switch (pattern) {
    case 'crash':
      // Sharp drop pattern - drops fast, stays low with minimal recovery
      // Reaches ~80% of drop by day 100, then slow grind
      if (progress < 0.27) {
        // Fast initial crash (0-100 days)
        const crashProgress = progress / 0.27
        trendChange = targetChange * 0.8 * Math.pow(crashProgress, 0.6)
      } else if (progress < 0.5) {
        // Dead cat bounce (~10% recovery)
        const bounceProgress = (progress - 0.27) / 0.23
        const bottomValue = targetChange * 0.8
        const bounceAmount = Math.abs(targetChange) * 0.1 * Math.sin(bounceProgress * Math.PI)
        trendChange = bottomValue + bounceAmount
      } else {
        // Slow grind to final value
        const grindProgress = (progress - 0.5) / 0.5
        const midValue = targetChange * 0.8
        trendChange = midValue + (targetChange - midValue) * grindProgress
      }
      break

    case 'v_shape':
      // V-shaped pattern - sharp drop then strong recovery
      // Drops to bottom at ~35% through, then recovers strongly
      const bottomDay = 0.35
      if (progress < bottomDay) {
        // Sharp drop phase
        const dropProgress = progress / bottomDay
        // Drop deeper than final value (oversell)
        trendChange = targetChange * 1.8 * Math.pow(dropProgress, 0.7)
      } else {
        // Strong recovery phase
        const recoveryProgress = (progress - bottomDay) / (1 - bottomDay)
        const bottomValue = targetChange * 1.8
        // Recover strongly - may even go positive
        const recoveryTarget = targetChange * 0.3 // Recover most losses
        const recoveryAmount = recoveryTarget - bottomValue
        trendChange = bottomValue + recoveryAmount * Math.pow(recoveryProgress, 0.5)
      }
      break

    case 'bull':
      // Bull market pattern - accelerating growth with pullbacks
      // Momentum builds, has periodic pullbacks, accelerates near end
      const pullbackPhases = [0.2, 0.45, 0.7] // Days when pullbacks occur
      let pullbackEffect = 0

      for (const phase of pullbackPhases) {
        if (progress > phase && progress < phase + 0.08) {
          // During pullback
          const pullbackProgress = (progress - phase) / 0.08
          pullbackEffect = -0.08 * Math.sin(pullbackProgress * Math.PI)
        }
      }

      // Accelerating growth curve with momentum
      const baseGrowth = targetChange * Math.pow(progress, 0.7)
      // Add momentum acceleration in second half
      const momentum = progress > 0.5 ? targetChange * 0.2 * Math.pow((progress - 0.5) / 0.5, 2) : 0
      trendChange = baseGrowth + momentum + pullbackEffect
      break

    case 'linear':
    default:
      // Simple linear trend - straight line from start to end
      trendChange = targetChange * progress
      break
  }

  // Calculate raw price and enforce a floor (never below 0.1% of base price)
  const rawPrice = basePrice * (1 + trendChange + noise)
  return Math.max(basePrice * 0.001, rawPrice)
}

/**
 * Calculate debt amount needed to repay to reach target health
 * Used for rebalancing calculations
 */
export function calculateRebalanceRepayAmount(
  currentHealth: number,
  targetHealth: number,
  currentDebt: number,
  collateralAmount: number,
  collateralPrice: number,
  collateralFactor: number = PROTOCOL_CONFIG.collateralFactor
): number {
  // Prevent division by zero
  const safeTargetHealth = Math.max(0.1, targetHealth)
  const effectiveCollateral = calculateEffectiveCollateral(
    collateralAmount,
    collateralPrice,
    collateralFactor
  )
  const targetDebt = effectiveCollateral / safeTargetHealth
  const repayAmount = currentDebt - targetDebt

  return Math.max(0, repayAmount)
}

/**
 * Calculate liquidation price - the price at which HF = liquidation threshold
 * Critical for DeFi users to understand their risk
 */
export function calculateLiquidationPrice(
  collateralAmount: number,
  debtAmount: number,
  collateralFactor: number = PROTOCOL_CONFIG.collateralFactor,
  liquidationThreshold: number = PROTOCOL_CONFIG.liquidationThreshold
): number {
  if (collateralAmount <= 0) return 0
  // Prevent division by zero
  const safeCollateralFactor = Math.max(0.1, collateralFactor)
  // Health = (Collateral × Price × CF) / Debt = threshold
  // Price = (Debt × threshold) / (Collateral × CF)
  return (debtAmount * liquidationThreshold) / (collateralAmount * safeCollateralFactor)
}

/**
 * Calculate liquidation loss
 * When liquidated: user loses their equity (collateral - debt)
 * This represents the initial investment that's now gone
 */
export function calculateLiquidationLoss(
  initialCollateralValueUSD: number,
  initialDebtAmount: number,
  liquidationBonus: number = PROTOCOL_CONFIG.liquidationBonus
): number {
  // User's initial equity was: collateral - debt
  const initialEquity = initialCollateralValueUSD - initialDebtAmount
  // When liquidated, they lose this equity plus the liquidation penalty
  return initialEquity * (1 + liquidationBonus)
}

/**
 * Calculate net returns for a position
 * Returns = Final Equity - Initial Equity
 * Equity = Collateral Value - Debt
 */
export function calculateNetReturns(
  currentCollateralValueUSD: number,
  initialCollateralValueUSD: number,
  currentDebt: number,
  initialDebt: number,
  isLiquidated: boolean
): number {
  // Initial equity (what user started with after borrowing)
  const initialEquity = initialCollateralValueUSD - initialDebt

  if (isLiquidated) {
    // Liquidated = lost full deposit (consistent with Portfolio Value display)
    return -initialCollateralValueUSD
  }

  // Current equity
  const currentEquity = currentCollateralValueUSD - currentDebt

  // Returns = change in equity
  return currentEquity - initialEquity
}

/**
 * Calculate rolling volatility (annualized) from a price array
 * Uses standard deviation of daily returns over a window
 *
 * @param prices - Array of daily prices
 * @param currentDay - Current day index in the array
 * @param windowDays - Number of days to look back (default 30)
 * @returns Annualized volatility as a percentage (0-100+)
 */
export function calculateVolatility(
  prices: number[],
  currentDay: number,
  windowDays: number = 30
): number {
  // Need at least 2 prices to calculate returns
  if (currentDay < 2 || prices.length < 2) return 0

  // Get the price window (look back from currentDay)
  const startDay = Math.max(0, currentDay - windowDays)
  const endDay = Math.min(currentDay, prices.length - 1)

  if (endDay - startDay < 2) return 0

  // Calculate daily returns
  const returns: number[] = []
  for (let i = startDay + 1; i <= endDay; i++) {
    const prevPrice = prices[i - 1]
    const currPrice = prices[i]
    if (prevPrice > 0) {
      returns.push((currPrice - prevPrice) / prevPrice)
    }
  }

  if (returns.length < 2) return 0

  // Calculate mean return
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length

  // Calculate variance
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length

  // Standard deviation of daily returns
  const dailyStdDev = Math.sqrt(variance)

  // Annualize (multiply by sqrt(365)) and convert to percentage
  const annualizedVolatility = dailyStdDev * Math.sqrt(365) * 100

  return annualizedVolatility
}

/**
 * Check if position needs rebalancing (FCM specific)
 */
export function needsRebalancing(
  healthFactor: number,
  minHealth: number = PROTOCOL_CONFIG.minHealth,
  maxHealth: number = PROTOCOL_CONFIG.maxHealth
): 'under' | 'over' | false {
  if (healthFactor < minHealth) return 'under'
  if (healthFactor > maxHealth) return 'over'
  return false
}

/**
 * Check if position is liquidatable
 */
export function isLiquidatable(
  healthFactor: number,
  threshold: number = PROTOCOL_CONFIG.liquidationThreshold
): boolean {
  return healthFactor < threshold
}
