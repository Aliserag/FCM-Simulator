/**
 * Historic price data for popular crypto assets
 * Using current 2025 prices as base, simulating 2022 "Crypto Winter" patterns
 * 2022 had two major crash events: Luna/3AC (May) and FTX (November)
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
  // Supply APY - lending/staking yield (based on 2022 averages)
  supplyAPY: number
  // Price data for 365 days (normalized to start at 1.0)
  priceMultipliers: number[]
}

// Generate price data based on 2022 "Crypto Winter" patterns
// This year had two major crashes: Luna/3AC (May) and FTX (November)
function generatePriceData(pattern: 'btc' | 'eth' | 'sol' | 'avax' | 'stable'): number[] {
  const prices: number[] = []

  for (let day = 0; day <= 365; day++) {
    const progress = day / 365

    let multiplier: number

    switch (pattern) {
      case 'btc':
        // BTC 2022: $47k → $16k (66% drop)
        if (progress < 0.25) {
          // Q1: Initial decline from ATH
          multiplier = 1.0 - progress * 0.4 + Math.sin(day * 0.3) * 0.02
        } else if (progress < 0.42) {
          // May-June: Luna/3AC crash - steep drop
          const crashProgress = (progress - 0.25) / 0.17
          multiplier = 0.90 - crashProgress * 0.35 + Math.sin(day * 0.2) * 0.03
        } else if (progress < 0.75) {
          // Q3: Sideways at lows (~$20k)
          multiplier = 0.55 + Math.sin(day * 0.15) * 0.04
        } else if (progress < 0.85) {
          // Nov: FTX collapse
          const ftxCrash = (progress - 0.75) / 0.1
          multiplier = 0.55 - ftxCrash * 0.2 + Math.sin(day * 0.3) * 0.02
        } else {
          // Dec: Slight recovery
          const recovery = (progress - 0.85) / 0.15
          multiplier = 0.35 + recovery * 0.05 + Math.sin(day * 0.25) * 0.02
        }
        break

      case 'eth':
        // ETH 2022: $3.4k → $880 (74% drop)
        if (progress < 0.25) {
          // Q1: Initial decline from ATH
          multiplier = 1.0 - progress * 0.5 + Math.sin(day * 0.3) * 0.03
        } else if (progress < 0.42) {
          // May-June: Luna crash - steep drop
          const crashProgress = (progress - 0.25) / 0.17
          multiplier = 0.875 - crashProgress * 0.45 + Math.sin(day * 0.2) * 0.04
        } else if (progress < 0.75) {
          // Q3: Sideways at lows
          multiplier = 0.42 + Math.sin(day * 0.15) * 0.05
        } else if (progress < 0.85) {
          // Nov: FTX collapse
          const ftxCrash = (progress - 0.75) / 0.1
          multiplier = 0.45 - ftxCrash * 0.18 + Math.sin(day * 0.3) * 0.02
        } else {
          // Dec: Slight recovery
          const recovery = (progress - 0.85) / 0.15
          multiplier = 0.27 + recovery * 0.06 + Math.sin(day * 0.25) * 0.02
        }
        break

      case 'sol':
        // SOL 2022: $180 → $8 (96% drop) - hit hardest due to FTX connection
        if (progress < 0.25) {
          // Q1: Initial decline
          multiplier = 1.0 - progress * 0.6 + Math.sin(day * 0.4) * 0.04
        } else if (progress < 0.42) {
          // May-June: Luna crash
          const crashProgress = (progress - 0.25) / 0.17
          multiplier = 0.85 - crashProgress * 0.45 + Math.sin(day * 0.3) * 0.05
        } else if (progress < 0.75) {
          // Q3: Weak consolidation
          multiplier = 0.40 + Math.sin(day * 0.2) * 0.06
        } else if (progress < 0.85) {
          // Nov: FTX collapse - SOL hit hardest
          const ftxCrash = (progress - 0.75) / 0.1
          multiplier = 0.35 - ftxCrash * 0.28 + Math.sin(day * 0.35) * 0.02
        } else {
          // Dec: Barely any recovery
          const recovery = (progress - 0.85) / 0.15
          multiplier = 0.07 + recovery * 0.03 + Math.sin(day * 0.25) * 0.01
        }
        break

      case 'avax':
        // AVAX 2022: $130 → $12 (91% drop)
        if (progress < 0.25) {
          // Q1: Initial decline
          multiplier = 1.0 - progress * 0.55 + Math.sin(day * 0.35) * 0.04
        } else if (progress < 0.42) {
          // May-June: Luna crash
          const crashProgress = (progress - 0.25) / 0.17
          multiplier = 0.86 - crashProgress * 0.50 + Math.sin(day * 0.28) * 0.05
        } else if (progress < 0.75) {
          // Q3: Weak at lows
          multiplier = 0.36 + Math.sin(day * 0.18) * 0.05
        } else if (progress < 0.85) {
          // Nov: FTX collapse
          const ftxCrash = (progress - 0.75) / 0.1
          multiplier = 0.38 - ftxCrash * 0.25 + Math.sin(day * 0.3) * 0.02
        } else {
          // Dec: Slight recovery
          const recovery = (progress - 0.85) / 0.15
          multiplier = 0.13 + recovery * 0.04 + Math.sin(day * 0.25) * 0.01
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

// Current prices as of December 2025
// Supply APY based on 2022 DeFi lending/staking averages
export const TOKENS: TokenInfo[] = [
  {
    id: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    color: '#F7931A',
    basePrice: 97000,      // ~$97k December 2025
    collateralFactor: 0.75,
    supplyAPY: 0.015,      // 1.5% - low utilization on Aave/Compound
    priceMultipliers: generatePriceData('btc'),
  },
  {
    id: 'eth',
    symbol: 'ETH',
    name: 'Ethereum',
    color: '#627EEA',
    basePrice: 3900,       // ~$3.9k December 2025
    collateralFactor: 0.80,
    supplyAPY: 0.025,      // 2.5% - lending + staking rewards
    priceMultipliers: generatePriceData('eth'),
  },
  {
    id: 'sol',
    symbol: 'SOL',
    name: 'Solana',
    color: '#00FFA3',
    basePrice: 230,        // ~$230 December 2025
    collateralFactor: 0.70,
    supplyAPY: 0.05,       // 5% - higher yields on Solana DeFi
    priceMultipliers: generatePriceData('sol'),
  },
  {
    id: 'avax',
    symbol: 'AVAX',
    name: 'Avalanche',
    color: '#E84142',
    basePrice: 52,         // ~$52 December 2025
    collateralFactor: 0.65,
    supplyAPY: 0.04,       // 4% - competitive Avalanche yields
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
