/**
 * Multi-year historic price data for BTC and ETH (2020-2025)
 *
 * Data sources: Real daily closing prices from Coinbase via CCXT
 * Date range: January 1, 2020 - December 8, 2025 (2169 days per token)
 */

import { BTC_DAILY_PRICES, ETH_DAILY_PRICES, PRICE_DATA_START_YEAR } from './realPrices'

export interface YearPriceData {
  year: number
  avgYield: number // Average DeFi lending yield for the year
}

/**
 * Average DeFi lending supply APY by year
 *
 * These are estimated averages based on historical Aave/Compound rates:
 * - BTC (WBTC): Typically 0.01-2% supply APY
 * - ETH (WETH): Typically 1-4% supply APY
 *
 * Rates varied significantly based on market conditions:
 * - 2020: Low rates early, increased after DeFi Summer
 * - 2021: Peak DeFi activity, higher rates
 * - 2022: Bear market, moderate rates
 * - 2023-2024: Recovery, increasing rates
 * - 2025: Bull market, elevated rates
 *
 * Sources:
 * - Aavescan (aavescan.com) - Historical lending data
 * - The Block DeFi Data (theblock.co/data/decentralized-finance)
 * - BIS Research Paper on Aave V2 (bis.org/publ/work1183.pdf)
 */
export const YEARLY_DATA: YearPriceData[] = [
  { year: 2020, avgYield: 0.025 },  // 2.5% - DeFi Summer started mid-year
  { year: 2021, avgYield: 0.04 },   // 4.0% - Peak DeFi activity
  { year: 2022, avgYield: 0.03 },   // 3.0% - Bear market, LUNA/FTX crashes
  { year: 2023, avgYield: 0.04 },   // 4.0% - Recovery period
  { year: 2024, avgYield: 0.05 },   // 5.0% - Bull market return
  { year: 2025, avgYield: 0.05 },   // 5.0% - Continued bull market
]

/**
 * Get the day index for a specific year start
 * Accounts for leap years (2020 and 2024)
 */
function getYearStartIndex(year: number): number {
  let index = 0
  for (let y = PRICE_DATA_START_YEAR; y < year; y++) {
    // Leap years: 2020, 2024
    const isLeapYear = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0)
    index += isLeapYear ? 366 : 365
  }
  return index
}

/**
 * Get the number of days in a year
 */
function getDaysInYear(year: number): number {
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
  return isLeapYear ? 366 : 365
}

/**
 * Get price data for a specific token across multiple years
 * Uses real daily closing prices from Coinbase
 */
export function getMultiYearPrices(
  token: 'btc' | 'eth',
  startYear: number,
  endYear: number
): number[] {
  const allPrices = token === 'btc' ? BTC_DAILY_PRICES : ETH_DAILY_PRICES

  // Calculate slice indices
  const startIndex = getYearStartIndex(startYear)
  const endIndex = getYearStartIndex(endYear + 1)

  // Clamp to available data
  const clampedStart = Math.max(0, startIndex)
  const clampedEnd = Math.min(allPrices.length, endIndex)

  return allPrices.slice(clampedStart, clampedEnd)
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
 * Uses actual first day price from real data
 */
export function getYearStartPrice(token: 'btc' | 'eth', year: number): number {
  const allPrices = token === 'btc' ? BTC_DAILY_PRICES : ETH_DAILY_PRICES
  const startIndex = getYearStartIndex(year)

  if (startIndex >= 0 && startIndex < allPrices.length) {
    return allPrices[startIndex]
  }
  // Fallback for out-of-range years
  return token === 'btc' ? 50000 : 2000
}

/**
 * Calculate total days for a year range
 * Accounts for leap years
 */
export function getTotalDays(startYear: number, endYear: number): number {
  let totalDays = 0
  for (let year = startYear; year <= endYear; year++) {
    totalDays += getDaysInYear(year)
  }
  return totalDays
}

/**
 * Convert day number to year and day within year
 * Accounts for leap years
 */
export function dayToYearAndDay(day: number, startYear: number): { year: number; dayOfYear: number } {
  let remainingDays = day
  let year = startYear

  while (remainingDays >= getDaysInYear(year)) {
    remainingDays -= getDaysInYear(year)
    year++
  }

  return {
    year,
    dayOfYear: remainingDays
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
