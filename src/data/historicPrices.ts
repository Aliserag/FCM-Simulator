/**
 * Historic price data for popular crypto assets
 * Using current 2025 prices as base, simulating 2020 "COVID Crash & Recovery" patterns
 * 2020 had a V-shaped pattern: March COVID crash followed by massive recovery to ATH
 * This demonstrates FCM's advantage: survive the crash, profit from recovery
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

      case 'sol':
        // SOL 2020: Launched March 2020, volatile first year (~4x gain)
        if (progress < 0.15) {
          // Jan-Feb: Pre-launch (stable at base)
          multiplier = 1.0 + Math.sin(day * 0.3) * 0.02
        } else if (progress < 0.22) {
          // March: Launch period with initial volatility
          const launchProgress = (progress - 0.15) / 0.07
          multiplier = 1.0 - launchProgress * 0.4 + Math.sin(day * 0.6) * 0.05
        } else if (progress < 0.5) {
          // April-June: Early growth phase
          const growthProgress = (progress - 0.22) / 0.28
          multiplier = 0.6 + growthProgress * 0.8 + Math.sin(day * 0.25) * 0.06
        } else if (progress < 0.75) {
          // July-Sept: Consolidation
          multiplier = 1.4 + (progress - 0.5) * 0.8 + Math.sin(day * 0.2) * 0.08
        } else {
          // Oct-Dec: Bull run
          const bullProgress = (progress - 0.75) / 0.25
          multiplier = 1.6 + bullProgress * 2.4 + Math.sin(day * 0.3) * 0.08
        }
        break

      case 'avax':
        // AVAX 2020: Launched Sept 2020, similar V-shape pattern for demo
        if (progress < 0.15) {
          // Jan-Feb: Pre-launch baseline
          multiplier = 1.0 + progress * 0.15 + Math.sin(day * 0.3) * 0.02
        } else if (progress < 0.22) {
          // March: COVID crash period
          const crashProgress = (progress - 0.15) / 0.07
          multiplier = 1.15 - crashProgress * 0.55 + Math.sin(day * 0.5) * 0.04
        } else if (progress < 0.5) {
          // April-June: Recovery
          const recoveryProgress = (progress - 0.22) / 0.28
          multiplier = 0.6 + recoveryProgress * 0.6 + Math.sin(day * 0.2) * 0.05
        } else if (progress < 0.75) {
          // July-Sept: Launch and growth
          multiplier = 1.2 + (progress - 0.5) * 1.0 + Math.sin(day * 0.18) * 0.06
        } else {
          // Oct-Dec: Bull run
          const bullProgress = (progress - 0.75) / 0.25
          multiplier = 1.45 + bullProgress * 2.0 + Math.sin(day * 0.25) * 0.06
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
