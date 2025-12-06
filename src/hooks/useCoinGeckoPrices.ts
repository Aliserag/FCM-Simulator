'use client'

import { useState, useEffect, useCallback } from 'react'

// CoinGecko API token IDs
const COINGECKO_IDS: Record<string, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  sol: 'solana',
  avax: 'avalanche-2',
  matic: 'matic-network',
  link: 'chainlink',
}

// Fallback prices if API fails (approximate Dec 2024 prices)
const FALLBACK_PRICES: Record<string, number> = {
  btc: 97000,
  eth: 3600,
  sol: 230,
  avax: 50,
  matic: 0.50,
  link: 15,
}

interface UseCoinGeckoPricesReturn {
  prices: Record<string, number>
  isLoading: boolean
  error: string | null
  fetchPrices: () => Promise<void>
  updatePrice: (tokenId: string, price: number) => void
}

export function useCoinGeckoPrices(): UseCoinGeckoPricesReturn {
  const [prices, setPrices] = useState<Record<string, number>>(FALLBACK_PRICES)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPrices = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const ids = Object.values(COINGECKO_IDS).join(',')
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
        { cache: 'no-store' }
      )

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }

      const data = await res.json()

      const newPrices: Record<string, number> = {}
      for (const [tokenId, geckoId] of Object.entries(COINGECKO_IDS)) {
        newPrices[tokenId] = data[geckoId]?.usd ?? FALLBACK_PRICES[tokenId]
      }

      setPrices(newPrices)
    } catch (e) {
      console.warn('CoinGecko fetch failed, using fallback prices:', e)
      setError('Failed to fetch live prices')
      setPrices(FALLBACK_PRICES)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch prices on mount
  useEffect(() => {
    fetchPrices()
  }, [fetchPrices])

  // Allow manual price updates (for user edits)
  const updatePrice = useCallback((tokenId: string, price: number) => {
    setPrices(prev => ({ ...prev, [tokenId]: price }))
  }, [])

  return { prices, isLoading, error, fetchPrices, updatePrice }
}

// Export fallback prices for use elsewhere
export { FALLBACK_PRICES }
