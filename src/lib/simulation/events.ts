import { SimulationEvent, PositionState, MarketConditions } from '@/types'
import { PROTOCOL_CONFIG } from '@/lib/constants'
import { generateId } from '@/lib/utils'
import { getFCMRebalanceEvents, FCMRebalanceEvent } from './fcm'
import { getTokenPrice, getTokenSupplyAPY, getToken } from '@/data/historicPrices'
import { calculatePriceAtDay, calculateHealthFactor, calculateInitialBorrow } from './calculations'

/**
 * Helper function to get price at a specific day
 */
function getPriceAtDay(
  day: number,
  basePrice: number,
  marketConditions?: MarketConditions
): number {
  if (marketConditions?.dataMode === 'historic' && marketConditions.collateralToken) {
    return getTokenPrice(marketConditions.collateralToken, day)
  }
  return calculatePriceAtDay(
    basePrice,
    marketConditions?.priceChange ?? -30,
    day,
    365,
    marketConditions?.volatility ?? 'medium'
  )
}

/**
 * Event generation for the transaction log
 * Creates human-readable events with actual code references
 */

/**
 * Format token amount for display in events
 */
function formatTokenForEvent(amount: number): string {
  if (amount >= 1) return amount.toFixed(4)
  if (amount >= 0.0001) return amount.toFixed(6)
  return amount.toExponential(2)
}

/**
 * Generate initial position creation events (both positions)
 */
export function generateCreationEvents(
  initialCollateral: number,
  initialBorrow: number,
  basePrice: number
): SimulationEvent[] {
  const collateralValueUSD = initialCollateral * basePrice
  return [
    {
      id: generateId(),
      day: 0,
      position: 'both',
      type: 'create',
      action: 'Position Created',
      code: `pool.createPosition(funds: ←${formatTokenForEvent(initialCollateral)} tokens, targetHealth: ${PROTOCOL_CONFIG.targetHealth})`,
      details: `Deposited ${formatTokenForEvent(initialCollateral)} tokens (~$${collateralValueUSD.toFixed(0)}) as collateral`,
    },
    {
      id: generateId(),
      day: 0,
      position: 'both',
      type: 'borrow',
      action: 'Borrowed to target health',
      code: `pool.borrow(amount: ${initialBorrow.toFixed(2)}) → stablecoins issued`,
      details: `Borrowed at target health ${PROTOCOL_CONFIG.targetHealth}: $${initialBorrow.toFixed(0)} stablecoins`,
    },
  ]
}

/**
 * Generate FCM rebalancing event (downward - repay debt)
 */
export function generateRebalanceEvent(
  day: number,
  healthBefore: number,
  healthAfter: number,
  repaidAmount: number
): SimulationEvent {
  return {
    id: generateId(),
    day,
    position: 'fcm',
    type: 'rebalance',
    action: 'Auto-rebalancing triggered',
    code: `pool.rebalancePosition(pid: 1, force: false)`,
    details: `Rebalancing repaid $${repaidAmount.toFixed(2)} debt to restore health`,
    healthBefore,
    healthAfter,
  }
}

/**
 * Generate FCM leverage up event (upward - borrow more when overcollateralized)
 */
export function generateLeverageUpEvent(
  day: number,
  healthBefore: number,
  healthAfter: number,
  borrowedAmount: number
): SimulationEvent {
  return {
    id: generateId(),
    day,
    position: 'fcm',
    type: 'leverage_up',
    action: 'Leveraged up (DrawDownSink)',
    code: `pool.borrow(amount: ${borrowedAmount.toFixed(2)}) → DrawDownSink`,
    details: `Health ${healthBefore.toFixed(2)} > ${PROTOCOL_CONFIG.maxHealth} - borrowed $${borrowedAmount.toFixed(2)} more to maximize returns`,
    healthBefore,
    healthAfter,
  }
}

/**
 * Generate FCM scheduled health check event
 */
export function generateScheduledCheckEvent(
  day: number,
  currentHealth: number,
  actionTaken: boolean
): SimulationEvent {
  return {
    id: generateId(),
    day,
    position: 'fcm',
    type: 'scheduled',
    action: actionTaken ? 'Scheduled check - rebalancing needed' : 'Scheduled health check',
    code: `ScheduledTxn.execute() → position.getHealth()`,
    details: actionTaken
      ? `Health: ${currentHealth.toFixed(2)} < ${PROTOCOL_CONFIG.minHealth} (triggering rebalance)`
      : `Health: ${currentHealth.toFixed(2)} (within bounds, no action)`,
  }
}

/**
 * Generate traditional position warning event
 */
export function generateTraditionalWarningEvent(
  day: number,
  currentHealth: number
): SimulationEvent {
  return {
    id: generateId(),
    day,
    position: 'traditional',
    type: 'warning',
    action: `Health dropped to ${currentHealth.toFixed(2)}`,
    code: `// No automatic action - manual intervention required`,
    details: `Position at risk! Traditional lending has no auto-rebalancing.`,
  }
}

/**
 * Generate liquidation event
 */
export function generateLiquidationEvent(
  day: number,
  healthBefore: number,
  collateralLost: number
): SimulationEvent {
  return {
    id: generateId(),
    day,
    position: 'traditional',
    type: 'liquidation',
    action: 'LIQUIDATED',
    code: `LIQUIDATED — position health fell below 1.0`,
    details: `Liquidator repaid debt, seized $${collateralLost.toFixed(2)} collateral + ${(PROTOCOL_CONFIG.liquidationBonus * 100).toFixed(0)}% bonus`,
    healthBefore,
    healthAfter: 0,
  }
}

/**
 * Generate monthly interest summary event (periodic)
 */
export function generateMonthlyInterestEvent(
  day: number,
  position: 'traditional' | 'fcm' | 'both',
  interestAccrued: number,
  borrowAPY: number
): SimulationEvent {
  const month = Math.floor(day / 30)
  return {
    id: generateId(),
    day,
    position,
    type: 'interest',
    action: `Month ${month} Interest`,
    code: `debt += $${interestAccrued.toFixed(2)} (${(borrowAPY * 100).toFixed(1)}% APY)`,
    details: `Compound interest accrued on borrowed stablecoins`,
  }
}

/**
 * Generate yield earned event (FCM in growth mode)
 */
export function generateYieldEarnedEvent(
  day: number,
  yieldAmount: number,
  supplyAPY: number,
  tokenSymbol: string
): SimulationEvent {
  const month = Math.floor(day / 30)
  return {
    id: generateId(),
    day,
    position: 'fcm',
    type: 'yield_earned',
    action: `Month ${month} Yield Earned`,
    code: `yield += $${yieldAmount.toFixed(2)} (${(supplyAPY * 100).toFixed(1)}% APY on ${tokenSymbol})`,
    details: `Collateral yield retained for leverage optimization (health > 1.4)`,
  }
}

/**
 * Generate yield applied to debt event (FCM in protection mode)
 */
export function generateYieldAppliedEvent(
  day: number,
  yieldApplied: number,
  healthBefore: number
): SimulationEvent {
  const month = Math.floor(day / 30)
  return {
    id: generateId(),
    day,
    position: 'fcm',
    type: 'yield_applied',
    action: `Month ${month} Yield → Debt`,
    code: `debt -= $${yieldApplied.toFixed(2)} (auto-applied from yield)`,
    details: `Health ${healthBefore.toFixed(2)} < 1.4 - yield automatically reduces debt`,
    healthBefore,
  }
}

/**
 * Generate all events for a simulation up to a given day
 */
export function generateAllEvents(
  day: number,
  initialCollateral: number,
  basePrice: number,
  targetPriceChangePercent: number,
  traditionalPosition: PositionState,
  fcmPosition: PositionState,
  marketConditions?: MarketConditions
): SimulationEvent[] {
  const events: SimulationEvent[] = []

  // Initial events
  const initialBorrow = calculateInitialBorrow(initialCollateral, basePrice, PROTOCOL_CONFIG.targetHealth)
  events.push(...generateCreationEvents(initialCollateral, initialBorrow, basePrice))

  // Get FCM rebalance events (both downward and upward) with historic prices
  const fcmEvents = getFCMRebalanceEvents(
    initialCollateral,
    basePrice,
    targetPriceChangePercent,
    day,
    PROTOCOL_CONFIG.borrowAPY,
    marketConditions
  )

  // Add rebalance and leverage up events
  for (const re of fcmEvents) {
    if (re.type === 'rebalance_down') {
      // Add scheduled check before downward rebalance
      events.push(generateScheduledCheckEvent(re.day, re.healthBefore, true))
      events.push(generateRebalanceEvent(re.day, re.healthBefore, re.healthAfter, re.amount))
    } else if (re.type === 'leverage_up') {
      // Add leverage up event (upward rebalancing - borrow more)
      events.push(generateLeverageUpEvent(re.day, re.healthBefore, re.healthAfter, re.amount))
    }
  }

  // Add traditional warning events at key health thresholds using actual prices
  const warningDays = [30, 60, 90, 120, 150, 180]
  let debtAtDay = initialBorrow
  for (const wd of warningDays) {
    if (wd <= day) {
      // Get ACTUAL price at this day (historic or simulated)
      const priceAtDay = getPriceAtDay(wd, basePrice, marketConditions)
      // Calculate debt with compound interest
      debtAtDay = initialBorrow * Math.pow(1 + PROTOCOL_CONFIG.borrowAPY / 365, wd)
      const healthAtDay = calculateHealthFactor(initialCollateral, priceAtDay, debtAtDay)

      if (healthAtDay < PROTOCOL_CONFIG.targetHealth && healthAtDay > PROTOCOL_CONFIG.liquidationThreshold) {
        events.push(generateTraditionalWarningEvent(wd, healthAtDay))
      }
    }
  }

  // Add monthly interest/yield summary events
  const borrowAPY = marketConditions?.borrowAPY ?? PROTOCOL_CONFIG.borrowAPY
  const tokenSymbol = marketConditions?.collateralToken
    ? (getToken(marketConditions.collateralToken)?.symbol ?? 'TOKEN')
    : 'TOKEN'
  const supplyAPY = marketConditions?.supplyAPY
    ?? (marketConditions?.collateralToken
      ? getTokenSupplyAPY(marketConditions.collateralToken)
      : PROTOCOL_CONFIG.supplyAPY)
  const collateralFactor = marketConditions?.collateralFactor ?? PROTOCOL_CONFIG.collateralFactor
  const fcmTargetHealth = marketConditions?.fcmTargetHealth ?? PROTOCOL_CONFIG.targetHealth

  const monthlyDays = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360]
  let prevMonthDebt = initialBorrow
  let prevMonthYield = 0
  let cumulativeYieldApplied = 0

  for (const monthDay of monthlyDays) {
    if (monthDay <= day) {
      // Calculate interest accrued this month (both positions)
      const currentMonthDebt = initialBorrow * Math.pow(1 + borrowAPY / 365, monthDay)
      const interestThisMonth = currentMonthDebt - prevMonthDebt
      prevMonthDebt = currentMonthDebt

      // Add monthly interest event (affects both positions)
      events.push(generateMonthlyInterestEvent(monthDay, 'both', interestThisMonth, borrowAPY))

      // Calculate FCM yield earned this month
      const priceAtMonth = getPriceAtDay(monthDay, basePrice, marketConditions)
      const collateralValueAtMonth = initialCollateral * priceAtMonth
      const monthlyYield = (collateralValueAtMonth * supplyAPY) / 12 // Approximate monthly yield
      const healthAtMonth = calculateHealthFactor(initialCollateral, priceAtMonth, currentMonthDebt, collateralFactor)

      // FCM: Either yield is earned (growth mode) or applied to debt (protection mode)
      if (healthAtMonth >= fcmTargetHealth) {
        // Growth mode: yield is retained
        events.push(generateYieldEarnedEvent(monthDay, monthlyYield, supplyAPY, tokenSymbol))
        prevMonthYield += monthlyYield
      } else if (prevMonthYield > 0 || monthlyYield > 0) {
        // Protection mode: yield applied to debt
        const yieldToApply = prevMonthYield + monthlyYield
        events.push(generateYieldAppliedEvent(monthDay, yieldToApply, healthAtMonth))
        cumulativeYieldApplied += yieldToApply
        prevMonthYield = 0
      }
    }
  }

  // Add liquidation event if traditional position was liquidated
  if (traditionalPosition.status === 'liquidated') {
    // Find liquidation day using actual prices
    let liquidationDay = day
    let debtTracker = initialBorrow
    for (let d = 1; d <= day; d++) {
      // Get ACTUAL price at this day
      const priceAtDay = getPriceAtDay(d, basePrice, marketConditions)
      // Accrue daily interest
      debtTracker += (debtTracker * PROTOCOL_CONFIG.borrowAPY) / 365
      const healthAtDay = calculateHealthFactor(initialCollateral, priceAtDay, debtTracker)

      if (healthAtDay < PROTOCOL_CONFIG.liquidationThreshold) {
        liquidationDay = d
        break
      }
    }

    events.push(generateLiquidationEvent(
      liquidationDay,
      0.98, // Approximate health just before liquidation
      initialCollateral * getPriceAtDay(liquidationDay, basePrice, marketConditions)
    ))
  }

  // Sort by day
  events.sort((a, b) => a.day - b.day)

  return events
}

/**
 * Filter events up to a specific day
 */
export function filterEventsUpToDay(
  events: SimulationEvent[],
  day: number
): SimulationEvent[] {
  return events.filter(e => e.day <= day)
}
