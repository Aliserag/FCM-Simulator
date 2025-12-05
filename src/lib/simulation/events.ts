import { SimulationEvent, PositionState } from '@/types'
import { PROTOCOL_CONFIG } from '@/lib/constants'
import { generateId } from '@/lib/utils'
import { getFCMRebalanceEvents } from './fcm'

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
      action: 'Auto-borrowed to target health',
      code: `autoBorrow() → ${initialBorrow.toFixed(2)} stablecoins issued to DrawDownSink`,
      details: `Effective collateral: $${(collateralValueUSD * PROTOCOL_CONFIG.collateralFactor).toFixed(0)} / ${PROTOCOL_CONFIG.targetHealth} = $${initialBorrow.toFixed(0)} debt`,
    },
  ]
}

/**
 * Generate FCM rebalancing event
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
    details: `TopUpSource.pull() → Pool.repay(${repaidAmount.toFixed(2)} MOET)`,
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
    code: `ScheduledTxn.execute() → position.checkHealth()`,
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
    code: `liquidator.liquidateRepayForSeize(pid, debtType, seizeType)`,
    details: `Liquidator repaid debt, seized $${collateralLost.toFixed(2)} collateral + ${(PROTOCOL_CONFIG.liquidationBonus * 100).toFixed(0)}% bonus`,
    healthBefore,
    healthAfter: 0,
  }
}

/**
 * Generate interest accrual event (periodic)
 */
export function generateInterestEvent(
  day: number,
  position: 'traditional' | 'fcm',
  interestAmount: number
): SimulationEvent {
  return {
    id: generateId(),
    day,
    position,
    type: 'interest',
    action: 'Interest accrued',
    code: `position.debtBalance += ${interestAmount.toFixed(4)} MOET`,
    details: `Daily compound interest at ${(PROTOCOL_CONFIG.borrowAPY * 100).toFixed(1)}% APY`,
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
  fcmPosition: PositionState
): SimulationEvent[] {
  const events: SimulationEvent[] = []

  // Initial events
  const initialBorrow = (initialCollateral * basePrice * PROTOCOL_CONFIG.collateralFactor) / PROTOCOL_CONFIG.targetHealth
  events.push(...generateCreationEvents(initialCollateral, initialBorrow, basePrice))

  // Get FCM rebalance events
  const rebalanceEvents = getFCMRebalanceEvents(
    initialCollateral,
    basePrice,
    targetPriceChangePercent,
    day,
    PROTOCOL_CONFIG.borrowAPY
  )

  // Add rebalance events
  for (const re of rebalanceEvents) {
    // Add scheduled check before rebalance
    events.push(generateScheduledCheckEvent(re.day, re.healthBefore, true))
    events.push(generateRebalanceEvent(re.day, re.healthBefore, re.healthAfter, re.repaidAmount))
  }

  // Add traditional warning events at key health thresholds
  const warningDays = [30, 60, 90, 120, 150, 180]
  for (const wd of warningDays) {
    if (wd <= day) {
      // Calculate health at this day (approximation)
      const progress = wd / 365
      const priceAtDay = basePrice * (1 + (targetPriceChangePercent / 100) * progress)
      const debtAtDay = initialBorrow * Math.pow(1 + PROTOCOL_CONFIG.borrowAPY / 365, wd)
      const healthAtDay = (initialCollateral * priceAtDay * PROTOCOL_CONFIG.collateralFactor) / debtAtDay

      if (healthAtDay < PROTOCOL_CONFIG.targetHealth && healthAtDay > PROTOCOL_CONFIG.liquidationThreshold) {
        events.push(generateTraditionalWarningEvent(wd, healthAtDay))
      }
    }
  }

  // Add liquidation event if traditional position was liquidated
  if (traditionalPosition.status === 'liquidated') {
    // Find approximate liquidation day
    let liquidationDay = day
    for (let d = 1; d <= day; d++) {
      const progress = d / 365
      const priceAtDay = basePrice * (1 + (targetPriceChangePercent / 100) * progress)
      const debtAtDay = initialBorrow * Math.pow(1 + PROTOCOL_CONFIG.borrowAPY / 365, d)
      const healthAtDay = (initialCollateral * priceAtDay * PROTOCOL_CONFIG.collateralFactor) / debtAtDay

      if (healthAtDay < PROTOCOL_CONFIG.liquidationThreshold) {
        liquidationDay = d
        break
      }
    }

    events.push(generateLiquidationEvent(
      liquidationDay,
      0.98, // Approximate health just before liquidation
      initialCollateral * basePrice // Approximate collateral lost
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
