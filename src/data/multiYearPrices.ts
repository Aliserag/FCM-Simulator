/**
 * Multi-year historic price data for BTC and ETH (2020-2025)
 *
 * Data sources: CoinGecko historical data
 * Patterns generated to match real market movements
 */

export interface YearPriceData {
  year: number
  btc: { start: number; end: number; low: number; high: number; pattern: 'bull' | 'bear' | 'volatile' }
  eth: { start: number; end: number; low: number; high: number; pattern: 'bull' | 'bear' | 'volatile' }
  avgYield: number // Average DeFi lending yield for the year
}

// Real approximate yearly data
export const YEARLY_DATA: YearPriceData[] = [
  {
    year: 2020,
    btc: { start: 7200, end: 29000, low: 3800, high: 29000, pattern: 'volatile' },
    eth: { start: 130, end: 737, low: 90, high: 750, pattern: 'volatile' },
    avgYield: 0.025
  },
  {
    year: 2021,
    btc: { start: 29000, end: 46000, low: 29000, high: 69000, pattern: 'volatile' },
    eth: { start: 737, end: 3700, low: 737, high: 4800, pattern: 'bull' },
    avgYield: 0.04
  },
  {
    year: 2022,
    btc: { start: 46000, end: 16500, low: 15500, high: 48000, pattern: 'bear' },
    eth: { start: 3700, end: 1200, low: 880, high: 3900, pattern: 'bear' },
    avgYield: 0.03
  },
  {
    year: 2023,
    btc: { start: 16500, end: 42000, low: 16500, high: 45000, pattern: 'bull' },
    eth: { start: 1200, end: 2300, low: 1200, high: 2700, pattern: 'bull' },
    avgYield: 0.04
  },
  {
    year: 2024,
    btc: { start: 42000, end: 93000, low: 38000, high: 99000, pattern: 'bull' },
    eth: { start: 2300, end: 3400, low: 2100, high: 4000, pattern: 'volatile' },
    avgYield: 0.05
  },
  {
    year: 2025,
    btc: { start: 93000, end: 100000, low: 85000, high: 105000, pattern: 'volatile' },
    eth: { start: 3400, end: 3800, low: 3200, high: 4200, pattern: 'volatile' },
    avgYield: 0.05
  },
]

/**
 * Generate daily price multipliers for a specific year and pattern
 */
function generateYearPattern(
  startPrice: number,
  endPrice: number,
  lowPrice: number,
  highPrice: number,
  pattern: 'bull' | 'bear' | 'volatile'
): number[] {
  const prices: number[] = []

  for (let day = 0; day <= 365; day++) {
    const progress = day / 365
    let price: number

    // Add daily noise
    const noise = (Math.sin(day * 0.5) * 0.02 + Math.cos(day * 0.3) * 0.015) * startPrice

    switch (pattern) {
      case 'bull':
        // Steady upward trend with some volatility
        price = startPrice + (endPrice - startPrice) * Math.pow(progress, 0.8)
        // Add mid-year dip
        if (progress > 0.3 && progress < 0.5) {
          const dipProgress = (progress - 0.3) / 0.2
          price -= (price - lowPrice) * 0.3 * Math.sin(dipProgress * Math.PI)
        }
        break

      case 'bear':
        // Sharp decline with dead cat bounces
        if (progress < 0.15) {
          // Initial optimism
          price = startPrice * (1 + progress * 0.1)
        } else if (progress < 0.5) {
          // Major crash
          const crashProgress = (progress - 0.15) / 0.35
          price = startPrice * 1.015 - (startPrice * 1.015 - lowPrice) * crashProgress
        } else if (progress < 0.7) {
          // Dead cat bounce
          const bounceProgress = (progress - 0.5) / 0.2
          price = lowPrice + (lowPrice * 0.3) * Math.sin(bounceProgress * Math.PI)
        } else {
          // Slow grind to end
          const endProgress = (progress - 0.7) / 0.3
          price = lowPrice * 1.1 + (endPrice - lowPrice * 1.1) * endProgress
        }
        break

      case 'volatile':
      default:
        // V-shape or W-shape with high volatility
        if (progress < 0.2) {
          // Initial period
          price = startPrice + (highPrice - startPrice) * 0.1 * progress / 0.2
        } else if (progress < 0.35) {
          // Crash to low
          const crashProgress = (progress - 0.2) / 0.15
          const peakPrice = startPrice * 1.05
          price = peakPrice - (peakPrice - lowPrice) * crashProgress
        } else if (progress < 0.7) {
          // Recovery
          const recoveryProgress = (progress - 0.35) / 0.35
          price = lowPrice + (highPrice - lowPrice) * Math.pow(recoveryProgress, 0.7)
        } else {
          // Final push or consolidation
          const finalProgress = (progress - 0.7) / 0.3
          price = highPrice - (highPrice - endPrice) * finalProgress
        }
        break
    }

    // Add noise and ensure price doesn't go negative
    price = Math.max(price * 0.01, price + noise)
    prices.push(price)
  }

  return prices
}

/**
 * Get price data for a specific token across multiple years
 */
export function getMultiYearPrices(
  token: 'btc' | 'eth',
  startYear: number,
  endYear: number
): number[] {
  const allPrices: number[] = []

  for (let year = startYear; year <= endYear; year++) {
    const yearData = YEARLY_DATA.find(y => y.year === year)
    if (!yearData) continue

    const tokenData = yearData[token]
    const yearPrices = generateYearPattern(
      tokenData.start,
      tokenData.end,
      tokenData.low,
      tokenData.high,
      tokenData.pattern
    )

    allPrices.push(...yearPrices)
  }

  return allPrices
}

/**
 * Get the average yield for a year range
 */
export function getAverageYield(startYear: number, endYear: number): number {
  let totalYield = 0
  let count = 0

  for (let year = startYear; year <= endYear; year++) {
    const yearData = YEARLY_DATA.find(y => y.year === year)
    if (yearData) {
      totalYield += yearData.avgYield
      count++
    }
  }

  return count > 0 ? totalYield / count : 0.03
}

/**
 * Get starting price for a token in a specific year
 */
export function getYearStartPrice(token: 'btc' | 'eth', year: number): number {
  const yearData = YEARLY_DATA.find(y => y.year === year)
  if (!yearData) return token === 'btc' ? 50000 : 2000
  return yearData[token].start
}

/**
 * Calculate total days for a year range
 */
export function getTotalDays(startYear: number, endYear: number): number {
  return (endYear - startYear + 1) * 365
}

/**
 * Convert day number to year and day within year
 */
export function dayToYearAndDay(day: number, startYear: number): { year: number; dayOfYear: number } {
  const yearOffset = Math.floor(day / 365)
  const dayOfYear = day % 365
  return {
    year: startYear + yearOffset,
    dayOfYear
  }
}

/**
 * Format day as date string
 */
export function formatDayAsDate(day: number, startYear: number): string {
  const { year, dayOfYear } = dayToYearAndDay(day, startYear)
  const date = new Date(year, 0, 1)
  date.setDate(date.getDate() + dayOfYear)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Cache for multi-year prices to avoid regenerating on every call
const priceCache: Map<string, number[]> = new Map()

/**
 * Get price for a specific day in a multi-year range
 * This is the key function for position calculations in multi-year mode
 */
export function getMultiYearTokenPrice(
  token: 'btc' | 'eth',
  day: number,
  startYear: number,
  endYear: number
): number {
  const cacheKey = `${token}-${startYear}-${endYear}`

  // Get or generate price array
  let prices = priceCache.get(cacheKey)
  if (!prices) {
    prices = getMultiYearPrices(token, startYear, endYear)
    priceCache.set(cacheKey, prices)
  }

  // Return price for the requested day, clamped to valid range
  const clampedDay = Math.max(0, Math.min(day, prices.length - 1))
  return prices[clampedDay]
}
