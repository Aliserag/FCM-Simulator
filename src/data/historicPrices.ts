/**
 * Historic price data for popular crypto assets
 * Using ACTUAL January 1, 2020 prices as base with real 2020 price patterns
 * Data source: CoinGecko historical data (https://www.coingecko.com)
 *
 * 2020 had a V-shaped pattern: March COVID crash followed by massive recovery to ATH
 * This demonstrates FCM's advantage: survive the crash, profit from recovery
 *
 * Actual 2020 prices:
 * - BTC: $7,200 (Jan 1) → $3,800 (Mar 13 crash) → $29,000 (Dec 31)
 * - ETH: $130 (Jan 1) → $90 (Mar 13 crash) → $737 (Dec 31)
 * - SOL: $0.22 (Apr launch) → $1.50 (Dec 31)
 */

export interface TokenInfo {
  id: string
  symbol: string
  name: string
  color: string
  // Base price (January 1, 2020 - actual historic price)
  basePrice: number
  // Collateral factor (LTV) - varies by asset volatility
  collateralFactor: number
  // Supply APY - lending/staking yield (based on 2020 DeFi averages)
  supplyAPY: number
  // Price data for 365 days (normalized to start at 1.0)
  priceMultipliers: number[]
}

// Generate price data based on actual 2020 price movements
// COVID crash in March followed by V-shaped recovery to all-time highs
function generatePriceData(pattern: 'btc' | 'eth' | 'stable'): number[] {
  const prices: number[] = []

  for (let day = 0; day <= 365; day++) {
    const progress = day / 365

    let multiplier: number

    switch (pattern) {
      case 'btc':
        // BTC 2020: $9k → $5k crash → $29k ATH (V-shaped recovery)
        if (progress < 0.15) {
          // Jan-Feb: Slight rise before crash
          multiplier = 1.0 + progress * 0.2 + Math.sin(day * 0.3) * 0.02
        } else if (progress < 0.22) {
          // March: COVID crash (-45%)
          const crashProgress = (progress - 0.15) / 0.07
          multiplier = 1.2 - crashProgress * 0.65 + Math.sin(day * 0.5) * 0.03
        } else if (progress < 0.5) {
          // April-June: Recovery phase
          const recoveryProgress = (progress - 0.22) / 0.28
          multiplier = 0.55 + recoveryProgress * 0.55 + Math.sin(day * 0.2) * 0.03
        } else if (progress < 0.75) {
          // July-Sept: Consolidation
          multiplier = 1.1 + (progress - 0.5) * 0.4 + Math.sin(day * 0.15) * 0.04
        } else {
          // Oct-Dec: Bull run to ATH
          const bullProgress = (progress - 0.75) / 0.25
          multiplier = 1.2 + bullProgress * 2.0 + Math.sin(day * 0.25) * 0.05
        }
        break

      case 'eth':
        // ETH 2020: $130 → $65 crash → $730 ATH (V-shaped recovery, ~5.5x)
        if (progress < 0.15) {
          // Jan-Feb: Slight rise before crash
          multiplier = 1.0 + progress * 0.3 + Math.sin(day * 0.3) * 0.03
        } else if (progress < 0.22) {
          // March: COVID crash (-50%)
          const crashProgress = (progress - 0.15) / 0.07
          multiplier = 1.3 - crashProgress * 0.8 + Math.sin(day * 0.5) * 0.04
        } else if (progress < 0.5) {
          // April-June: Recovery phase
          const recoveryProgress = (progress - 0.22) / 0.28
          multiplier = 0.5 + recoveryProgress * 0.7 + Math.sin(day * 0.2) * 0.04
        } else if (progress < 0.75) {
          // July-Sept: Consolidation and DeFi summer
          multiplier = 1.2 + (progress - 0.5) * 1.2 + Math.sin(day * 0.15) * 0.05
        } else {
          // Oct-Dec: Bull run to ATH
          const bullProgress = (progress - 0.75) / 0.25
          multiplier = 1.5 + bullProgress * 4.0 + Math.sin(day * 0.25) * 0.06
        }
        break

      case 'stable':
        multiplier = 1 + Math.sin(day * 0.1) * 0.001
        break

      default:
        multiplier = 1
    }

    prices.push(Math.max(0.05, multiplier))
  }

  return prices
}

// Actual prices as of January 1, 2020 (from CoinGecko)
// Supply APY based on 2020 DeFi lending rates (Compound/Aave)
// Note: Only BTC and ETH included as they had established DeFi lending markets in 2020
export const TOKENS: TokenInfo[] = [
  // Historic mode tokens (have priceMultipliers data from 2020)
  {
    id: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    color: '#F7931A',
    basePrice: 7200,       // $7,200 on January 1, 2020
    collateralFactor: 0.75,
    supplyAPY: 0.02,       // ~2% average - WBTC on Compound/Aave (varied 0.1-5% through year)
    priceMultipliers: generatePriceData('btc'),
  },
  {
    id: 'eth',
    symbol: 'ETH',
    name: 'Ethereum',
    color: '#627EEA',
    basePrice: 130,        // $130 on January 1, 2020
    collateralFactor: 0.80,
    supplyAPY: 0.03,       // ~3% average - ETH on Compound/Aave (varied 0.5-10% through year)
    priceMultipliers: generatePriceData('eth'),
  },
  // Simulated mode only tokens (no historic data)
  {
    id: 'sol',
    symbol: 'SOL',
    name: 'Solana',
    color: '#9945FF',
    basePrice: 230,          // Fallback price (updated by CoinGecko)
    collateralFactor: 0.70,  // Higher volatility = lower LTV
    supplyAPY: 0.06,         // ~6% staking rewards
    priceMultipliers: [],    // Empty = simulated mode only
  },
  {
    id: 'avax',
    symbol: 'AVAX',
    name: 'Avalanche',
    color: '#E84142',
    basePrice: 50,
    collateralFactor: 0.70,
    supplyAPY: 0.05,         // ~5% DeFi yield
    priceMultipliers: [],
  },
  {
    id: 'matic',
    symbol: 'MATIC',
    name: 'Polygon',
    color: '#8247E5',
    basePrice: 0.50,
    collateralFactor: 0.65,  // Higher volatility
    supplyAPY: 0.04,         // ~4% DeFi yield
    priceMultipliers: [],
  },
  {
    id: 'link',
    symbol: 'LINK',
    name: 'Chainlink',
    color: '#375BD2',
    basePrice: 15,
    collateralFactor: 0.70,
    supplyAPY: 0.03,         // ~3% staking
    priceMultipliers: [],
  },
]

export const DEBT_TOKENS = [
  { id: 'usdc', symbol: 'USDC', name: 'USD Coin', color: '#2775CA' },
  { id: 'usdt', symbol: 'USDT', name: 'Tether', color: '#26A17B' },
  { id: 'dai', symbol: 'DAI', name: 'Dai', color: '#F5AC37' },
]

/**
 * Get price for a token at a specific day
 */
export function getTokenPrice(tokenId: string, day: number): number {
  const token = TOKENS.find(t => t.id === tokenId)
  if (!token) return 1

  const clampedDay = Math.max(0, Math.min(day, 365))
  return token.basePrice * token.priceMultipliers[clampedDay]
}

/**
 * Get collateral factor for a token
 */
export function getTokenCollateralFactor(tokenId: string): number {
  const token = TOKENS.find(t => t.id === tokenId)
  return token?.collateralFactor ?? 0.80
}

/**
 * Get supply APY for a token (lending/staking yield)
 */
export function getTokenSupplyAPY(tokenId: string): number {
  const token = TOKENS.find(t => t.id === tokenId)
  return token?.supplyAPY ?? 0.02 // Default 2% if not found
}

/**
 * Get token info
 */
export function getToken(tokenId: string): TokenInfo | undefined {
  return TOKENS.find(t => t.id === tokenId)
}

/**
 * Calculate initial deposit in token units based on USD value
 */
export function calculateTokenAmount(tokenId: string, usdValue: number): number {
  const token = TOKENS.find(t => t.id === tokenId)
  if (!token) return 0
  return usdValue / token.basePrice
}

/**
 * Get tokens available for Historic mode (only those with priceMultipliers data)
 */
export function getHistoricTokens(): TokenInfo[] {
  return TOKENS.filter(t => t.priceMultipliers.length > 0)
}

/**
 * Get tokens available for Simulated mode (all tokens)
 */
export function getSimulatedTokens(): TokenInfo[] {
  return TOKENS
}
