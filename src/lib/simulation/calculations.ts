import { PROTOCOL_CONFIG } from '@/lib/constants'

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
  if (debtAmount <= 0) return Infinity
  const effectiveCollateral = collateralAmount * collateralPrice * collateralFactor
  return effectiveCollateral / debtAmount
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
  const effectiveCollateral = calculateEffectiveCollateral(
    collateralAmount,
    collateralPrice,
    collateralFactor
  )
  return effectiveCollateral / targetHealth
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
 * Calculate price at a given day with realistic market movement
 * Uses a V-shaped pattern for negative scenarios: crash then recovery
 * This better demonstrates FCM's advantage over traditional lending
 */
export function calculatePriceAtDay(
  basePrice: number,
  targetChangePercent: number,
  currentDay: number,
  totalDays: number,
  volatility: 'low' | 'medium' | 'high' = 'medium'
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

  if (targetChangePercent < -20) {
    // V-shaped recovery pattern for crash scenarios
    // Price drops to bottom around day 120-150, then recovers
    const bottomDay = 0.35 // 35% through the year (~day 128)
    const dropMagnitude = targetChangePercent / 100 // e.g., -0.40 for -40%

    if (progress < bottomDay) {
      // Dropping phase - accelerated drop
      const dropProgress = progress / bottomDay
      trendChange = dropMagnitude * 1.3 * Math.pow(dropProgress, 0.8)
    } else {
      // Recovery phase - partial recovery
      const recoveryProgress = (progress - bottomDay) / (1 - bottomDay)
      const bottomValue = dropMagnitude * 1.3
      // Recover to end at targetChangePercent (partial recovery)
      const recoveryAmount = (targetChangePercent / 100) - bottomValue
      trendChange = bottomValue + recoveryAmount * Math.pow(recoveryProgress, 0.6)
    }
  } else {
    // Linear trend for non-crash scenarios
    trendChange = (targetChangePercent / 100) * progress
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
  const effectiveCollateral = calculateEffectiveCollateral(
    collateralAmount,
    collateralPrice,
    collateralFactor
  )
  const targetDebt = effectiveCollateral / targetHealth
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
  // Health = (Collateral × Price × CF) / Debt = threshold
  // Price = (Debt × threshold) / (Collateral × CF)
  return (debtAmount * liquidationThreshold) / (collateralAmount * collateralFactor)
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
    // Liquidated = lost all equity
    return -initialEquity
  }

  // Current equity
  const currentEquity = currentCollateralValueUSD - currentDebt

  // Returns = change in equity
  return currentEquity - initialEquity
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
