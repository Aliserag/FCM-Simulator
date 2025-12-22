/**
 * Debug script to understand leverage-up behavior
 */

import { getMultiYearPrices, getMultiYearTokenPrice } from '../src/data/multiYearPrices'

const COLLATERAL_FACTOR = 0.80
const BORROW_APY = 0.065
const SUPPLY_APY = 0.015

function calculateHealth(collateral: number, price: number, debt: number): number {
  return (collateral * price * COLLATERAL_FACTOR) / debt
}

function runDetailedSimulation(startYear: number, endYear: number, config: {
  minHealth: number
  targetHealth: number
  maxHealth: number
}) {
  const prices = getMultiYearPrices('btc', startYear, endYear)
  const totalDays = prices.length - 1
  const basePrice = prices[0]
  const INITIAL_DEPOSIT = 1000

  console.log(`\n${'='.repeat(80)}`)
  console.log(`BTC ${startYear}-${endYear} | Config: ${config.minHealth}/${config.targetHealth}/${config.maxHealth === Infinity ? '∞' : config.maxHealth}`)
  console.log(`${'='.repeat(80)}`)
  console.log(`Start price: $${basePrice.toFixed(2)}`)
  console.log(`End price: $${prices[totalDays].toFixed(2)}`)
  console.log(`Price change: ${((prices[totalDays] / basePrice - 1) * 100).toFixed(1)}%`)

  const initialCollateral = INITIAL_DEPOSIT / basePrice
  const initialBorrow = (initialCollateral * basePrice * COLLATERAL_FACTOR) / config.targetHealth

  let collateral = initialCollateral
  let debt = initialBorrow
  let rebalances = 0
  let leverageUps = 0
  let consecutiveUpDays = 0
  let liquidated = false

  console.log(`\nInitial: ${collateral.toFixed(6)} BTC ($${(collateral * basePrice).toFixed(0)}), Debt: $${debt.toFixed(0)}`)
  console.log(`Initial Equity: $${(collateral * basePrice - debt).toFixed(0)}`)

  const milestones = [30, 90, 180, 365, 730, 1095, 1460, totalDays]
  let nextMilestone = 0

  for (let day = 1; day <= totalDays; day++) {
    if (liquidated) break

    const prevPrice = prices[day - 1]
    const currentPrice = prices[day]

    // Track consecutive up days
    if (currentPrice > prevPrice * 1.001) {
      consecutiveUpDays++
    } else {
      consecutiveUpDays = 0
    }

    // Daily interest
    debt *= (1 + BORROW_APY / 365)

    // Calculate health
    let health = calculateHealth(collateral, currentPrice, debt)

    // INTRADAY CHECKPOINTS (4 per day) - critical for surviving sharp crashes
    const priceRatio = currentPrice / prevPrice
    for (let checkpoint = 0; checkpoint < 4; checkpoint++) {
      const progress = (checkpoint + 1) / 4
      const intradayPrice = prevPrice * Math.pow(priceRatio, progress)
      let checkpointHealth = calculateHealth(collateral, intradayPrice, debt)

      // Downward rebalancing at checkpoint
      if (checkpointHealth < config.minHealth && checkpointHealth > 0) {
        const effectiveCollateral = collateral * intradayPrice * COLLATERAL_FACTOR
        const targetDebt = effectiveCollateral / config.targetHealth
        const repayAmount = debt - targetDebt
        if (repayAmount > 0 && repayAmount < debt) {
          const collateralToSell = repayAmount / intradayPrice
          if (collateralToSell < collateral) {
            collateral -= collateralToSell
            debt -= repayAmount
            rebalances++
          }
        }
      }
    }

    // End of day health check
    health = calculateHealth(collateral, currentPrice, debt)

    // Final rebalance check
    if (health < config.minHealth && health > 0) {
      const effectiveCollateral = collateral * currentPrice * COLLATERAL_FACTOR
      const targetDebt = effectiveCollateral / config.targetHealth
      const repayAmount = debt - targetDebt
      if (repayAmount > 0 && repayAmount < debt) {
        const collateralToSell = repayAmount / currentPrice
        if (collateralToSell < collateral) {
          collateral -= collateralToSell
          debt -= repayAmount
          rebalances++
          health = calculateHealth(collateral, currentPrice, debt)
        }
      }
    }

    // Check liquidation
    if (health < 1.0) {
      liquidated = true
      console.log(`\n💀 LIQUIDATED on day ${day} at price $${currentPrice.toFixed(2)}, health ${health.toFixed(3)}`)
      break
    }

    // Upward rebalancing (leverage-up)
    if (config.maxHealth < Infinity && health > config.maxHealth && consecutiveUpDays >= 7) {
      const effectiveCollateral = collateral * currentPrice * COLLATERAL_FACTOR
      const targetDebt = effectiveCollateral / config.targetHealth
      const additionalBorrow = (targetDebt - debt) * 0.75

      if (additionalBorrow > 0) {
        const oldCollateral = collateral
        const oldDebt = debt
        debt += additionalBorrow
        collateral += additionalBorrow / currentPrice
        leverageUps++
        consecutiveUpDays = 0

        console.log(`\n📈 LEVERAGE UP on day ${day} (price $${currentPrice.toFixed(0)}):`)
        console.log(`   Collateral: ${oldCollateral.toFixed(6)} → ${collateral.toFixed(6)} BTC`)
        console.log(`   Debt: $${oldDebt.toFixed(0)} → $${debt.toFixed(0)}`)
        console.log(`   Health: ${calculateHealth(oldCollateral, currentPrice, oldDebt).toFixed(2)} → ${health.toFixed(2)}`)
      }
    }

    // Print milestones
    if (nextMilestone < milestones.length && day >= milestones[nextMilestone]) {
      const equity = collateral * currentPrice - debt
      console.log(`\nDay ${day}: Price $${currentPrice.toFixed(0)}, Health ${health.toFixed(2)}, Equity $${equity.toFixed(0)}, Rebal ${rebalances}, LevUp ${leverageUps}`)
      nextMilestone++
    }
  }

  if (!liquidated) {
    const finalPrice = prices[totalDays]
    const finalEquity = collateral * finalPrice - debt
    const initialEquity = INITIAL_DEPOSIT - initialBorrow

    console.log(`\n${'─'.repeat(60)}`)
    console.log(`FINAL RESULTS:`)
    console.log(`  Collateral: ${collateral.toFixed(6)} BTC ($${(collateral * finalPrice).toFixed(0)})`)
    console.log(`  Debt: $${debt.toFixed(0)}`)
    console.log(`  Equity: $${finalEquity.toFixed(0)}`)
    console.log(`  P&L: $${(finalEquity - initialEquity).toFixed(0)}`)
    console.log(`  Rebalances: ${rebalances}, Leverage-ups: ${leverageUps}`)

    // Compare to just holding BTC
    const holdValue = INITIAL_DEPOSIT * (finalPrice / basePrice)
    console.log(`\n  vs Just Holding BTC: $${holdValue.toFixed(0)} (${((holdValue / INITIAL_DEPOSIT - 1) * 100).toFixed(0)}% gain)`)
  }
}

// Test different configs
console.log('\n' + '█'.repeat(80))
console.log('TESTING LEVERAGE-UP BEHAVIOR')
console.log('█'.repeat(80))

// Conservative (no leverage-up) - current BTC setting
runDetailedSimulation(2020, 2025, { minHealth: 1.10, targetHealth: 1.25, maxHealth: Infinity })

// With leverage-up enabled
runDetailedSimulation(2020, 2025, { minHealth: 1.10, targetHealth: 1.25, maxHealth: 1.50 })

// More aggressive leverage-up
runDetailedSimulation(2020, 2025, { minHealth: 1.10, targetHealth: 1.25, maxHealth: 1.40 })

// Original settings (that failed due to liquidation)
runDetailedSimulation(2020, 2025, { minHealth: 1.05, targetHealth: 1.15, maxHealth: 1.30 })
