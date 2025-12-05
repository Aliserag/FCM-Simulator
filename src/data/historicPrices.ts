/**
 * Historic price data for popular crypto assets
 * Using current 2025 prices as base, simulating 2024 market patterns
 */

export interface TokenInfo {
  id: string
  symbol: string
  name: string
  color: string
  // Current price (December 2025)
  basePrice: number
  // Collateral factor (LTV) - varies by asset volatility
  collateralFactor: number
  // Price data for 365 days (normalized to start at 1.0)
  priceMultipliers: number[]
}

// Generate price data based on realistic market patterns
function generatePriceData(pattern: 'btc' | 'eth' | 'sol' | 'avax' | 'stable'): number[] {
  const prices: number[] = []

  for (let day = 0; day <= 365; day++) {
    const progress = day / 365

    let multiplier: number

    switch (pattern) {
      case 'btc':
        // BTC 2024 pattern: Started ~42k, ran to 73k, corrected, then ATH run to 100k
        if (progress < 0.15) {
          // Jan-Feb: Rally from 42k to 52k
          multiplier = 1 + progress * 1.5 + Math.sin(day * 0.3) * 0.02
        } else if (progress < 0.25) {
          // Mar: ETF pump to ATH ~73k
          const pumpProgress = (progress - 0.15) / 0.1
          multiplier = 1.25 + pumpProgress * 0.5 + Math.sin(day * 0.2) * 0.03
        } else if (progress < 0.55) {
          // Apr-Jul: Correction and sideways 55k-65k
          const correctionProgress = (progress - 0.25) / 0.3
          multiplier = 1.75 - correctionProgress * 0.4 + Math.sin(day * 0.15) * 0.05
        } else if (progress < 0.75) {
          // Aug-Oct: Accumulation 58k-68k
          multiplier = 1.35 + Math.sin(day * 0.12) * 0.08
        } else {
          // Nov-Dec: Trump election pump to 100k+
          const pumpProgress = (progress - 0.75) / 0.25
          multiplier = 1.4 + pumpProgress * 1.0 + Math.sin(day * 0.25) * 0.03
        }
        break

      case 'eth':
        // ETH 2024: Similar but weaker, 2.2k to 4k range
        if (progress < 0.15) {
          multiplier = 1 + progress * 1.2 + Math.sin(day * 0.35) * 0.03
        } else if (progress < 0.25) {
          const pumpProgress = (progress - 0.15) / 0.1
          multiplier = 1.2 + pumpProgress * 0.4 + Math.sin(day * 0.25) * 0.04
        } else if (progress < 0.55) {
          const correctionProgress = (progress - 0.25) / 0.3
          multiplier = 1.6 - correctionProgress * 0.35 + Math.sin(day * 0.18) * 0.06
        } else if (progress < 0.75) {
          multiplier = 1.25 + Math.sin(day * 0.14) * 0.1
        } else {
          const pumpProgress = (progress - 0.75) / 0.25
          multiplier = 1.3 + pumpProgress * 0.6 + Math.sin(day * 0.22) * 0.04
        }
        break

      case 'sol':
        // SOL 2024: Strong year, 100 to 250 range
        if (progress < 0.15) {
          multiplier = 1 + progress * 2 + Math.sin(day * 0.4) * 0.04
        } else if (progress < 0.25) {
          const pumpProgress = (progress - 0.15) / 0.1
          multiplier = 1.3 + pumpProgress * 0.5 + Math.sin(day * 0.3) * 0.05
        } else if (progress < 0.55) {
          const correctionProgress = (progress - 0.25) / 0.3
          multiplier = 1.8 - correctionProgress * 0.5 + Math.sin(day * 0.2) * 0.08
        } else if (progress < 0.75) {
          multiplier = 1.3 + Math.sin(day * 0.16) * 0.12
        } else {
          const pumpProgress = (progress - 0.75) / 0.25
          multiplier = 1.4 + pumpProgress * 1.2 + Math.sin(day * 0.28) * 0.05
        }
        break

      case 'avax':
        // AVAX 2024: Weaker performance, 35 to 55 range mostly
        if (progress < 0.15) {
          multiplier = 1 + progress * 0.8 + Math.sin(day * 0.35) * 0.04
        } else if (progress < 0.25) {
          const pumpProgress = (progress - 0.15) / 0.1
          multiplier = 1.12 + pumpProgress * 0.3 + Math.sin(day * 0.28) * 0.05
        } else if (progress < 0.55) {
          const correctionProgress = (progress - 0.25) / 0.3
          multiplier = 1.4 - correctionProgress * 0.5 + Math.sin(day * 0.22) * 0.06
        } else if (progress < 0.75) {
          multiplier = 0.9 + Math.sin(day * 0.18) * 0.1
        } else {
          const pumpProgress = (progress - 0.75) / 0.25
          multiplier = 0.95 + pumpProgress * 0.5 + Math.sin(day * 0.25) * 0.04
        }
        break

      case 'stable':
        multiplier = 1 + Math.sin(day * 0.1) * 0.001
        break

      default:
        multiplier = 1
    }

    prices.push(Math.max(0.1, multiplier))
  }

  return prices
}

// Current prices as of December 2025
export const TOKENS: TokenInfo[] = [
  {
    id: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    color: '#F7931A',
    basePrice: 97000,      // ~$97k December 2025
    collateralFactor: 0.75,
    priceMultipliers: generatePriceData('btc'),
  },
  {
    id: 'eth',
    symbol: 'ETH',
    name: 'Ethereum',
    color: '#627EEA',
    basePrice: 3900,       // ~$3.9k December 2025
    collateralFactor: 0.80,
    priceMultipliers: generatePriceData('eth'),
  },
  {
    id: 'sol',
    symbol: 'SOL',
    name: 'Solana',
    color: '#00FFA3',
    basePrice: 230,        // ~$230 December 2025
    collateralFactor: 0.70,
    priceMultipliers: generatePriceData('sol'),
  },
  {
    id: 'avax',
    symbol: 'AVAX',
    name: 'Avalanche',
    color: '#E84142',
    basePrice: 52,         // ~$52 December 2025
    collateralFactor: 0.65,
    priceMultipliers: generatePriceData('avax'),
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
