import { PositionState, MarketConditions } from '@/types'
import { PROTOCOL_CONFIG, getBorrowRateForDay, getSupplyRateForDay, getTraditionalYieldRateForDay } from '@/lib/constants'
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
import { getTokenPrice, getTokenSupplyAPY } from '@/data/historicPrices'
import { getMultiYearTokenPrice } from '@/data/multiYearPrices'

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

  // Get collateral factor from override or default
  const collateralFactor = marketConditions?.collateralFactor ?? PROTOCOL_CONFIG.collateralFactor

  // Get initial borrow amount at target health (1.3)
  const initialBorrow = calculateInitialBorrow(
    initialCollateral,
    basePrice,
    PROTOCOL_CONFIG.targetHealth,
    collateralFactor
  )

  // Get supply APY from override or token-specific value
  const tokenSupplyAPY = marketConditions?.supplyAPY
    ?? (marketConditions?.collateralToken
      ? getTokenSupplyAPY(marketConditions.collateralToken)
      : PROTOCOL_CONFIG.supplyAPY)

  // Get start year for rate lookups (historic mode)
  const startYear = marketConditions?.startYear ?? 2020

  // Track state through simulation
  let collateralAmount = initialCollateral
  let debtAmount = initialBorrow
  let totalInterestPaid = 0
  let totalYieldEarned = 0  // Supply yield on collateral
  let borrowedFundsYieldEarned = 0  // Yield from manual farming of borrowed stablecoins
  let borrowedFundsBalance = initialBorrow  // Track borrowed funds like a simple yield account
  let liquidated = false
  let liquidationDay = 0

  // Simulate day by day to check for liquidation with actual prices
  for (let d = 1; d <= day; d++) {
    // Get the ACTUAL price at this day (historic or simulated)
    const dayPrice = getPriceAtDay(d, basePrice, marketConditions)

    // 1. Earn daily supply yield on collateral value
    // Traditional lending earns yield, but does NOT auto-apply it to debt
    // Historic mode: Uses year-based rates from actual Aave/Compound data
    const collateralValueUSD = collateralAmount * dayPrice
    const effectiveSupplyAPY = marketConditions?.dataMode === 'historic'
      ? getSupplyRateForDay(d, startYear, marketConditions.collateralToken ?? 'eth')
      : tokenSupplyAPY
    const dailyYield = (collateralValueUSD * effectiveSupplyAPY) / 365
    totalYieldEarned += dailyYield

    // 2. Traditional user earns yield on borrowed stablecoins (manual yield farming)
    // This models what DeFi users typically do: borrow stables and deploy to yield strategies
    // Traditional yields are LOWER than FYV due to manual management, gas costs, etc.
    // Historic mode: Uses year-based rates based on DeFi farming returns
    if (marketConditions?.dataMode === 'historic') {
      const tradYieldRate = getTraditionalYieldRateForDay(d, startYear)
      const dailyBorrowedYield = (borrowedFundsBalance * tradYieldRate) / 365
      borrowedFundsBalance += dailyBorrowedYield  // Compound into balance
      borrowedFundsYieldEarned += dailyBorrowedYield
    }

    // 3. Accrue daily interest on debt
    // Historic mode: Uses year-based rates from actual Aave/Compound data
    const effectiveBorrowAPY = marketConditions?.dataMode === 'historic'
      ? getBorrowRateForDay(d, startYear)
      : borrowAPY
    const dailyInterest = (debtAmount * effectiveBorrowAPY) / 365
    debtAmount += dailyInterest
    totalInterestPaid += dailyInterest

    // Traditional lending has NO automatic yield application to debt
    // This is a key difference from FCM which auto-applies yield daily

    // 4. Calculate current health factor
    const currentHealth = calculateHealthFactor(
      collateralAmount,
      dayPrice,
      debtAmount,
      collateralFactor
    )

    // 5. Check for liquidation (traditional has no protection)
    // Liquidate when health drops to or below threshold (1.0)
    if (currentHealth <= PROTOCOL_CONFIG.liquidationThreshold) {
      liquidated = true
      liquidationDay = d
      break
    }
  }

  // Final calculations at target day
  const finalPrice = liquidated ? getPriceAtDay(liquidationDay, basePrice, marketConditions) : currentPrice
  const collateralValueUSD = liquidated ? 0 : calculateCollateralValueUSD(collateralAmount, currentPrice)
  const healthFactor = liquidated ? 0 : calculateHealthFactor(collateralAmount, currentPrice, debtAmount, collateralFactor)

  // Calculate returns using equity-based formula
  // For Traditional in historic mode: Include borrowed funds balance (like a yield account)
  const initialCollateralValue = initialCollateral * basePrice

  // Traditional Total Value = (Collateral - Debt) + BorrowedFundsBalance
  // Similar to FCM's: ALP Equity + FYV Balance
  const alpEquity = collateralValueUSD - debtAmount
  const totalValue = liquidated ? 0 : (alpEquity + borrowedFundsBalance)

  // Returns based on Total Value change
  const totalReturns = liquidated ? -initialCollateralValue : (totalValue - initialCollateralValue)

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
    earnedYield: totalYieldEarned + borrowedFundsYieldEarned, // Supply yield + borrowed funds yield
    rebalanceCount: 0,
    // Traditional borrowed funds tracking (like FCM's FYV)
    borrowedFundsBalance: liquidated ? 0 : borrowedFundsBalance,
    borrowedFundsYieldEarned: borrowedFundsYieldEarned,
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
