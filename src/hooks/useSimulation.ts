'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { SimulationState, MarketConditions, Scenario } from '@/types'
import {
  initializeSimulation,
  simulateToDay,
  updateMarketConditions,
  resetSimulation,
  getComparisonSummary,
  getDisplayMetrics,
  generateChartData,
} from '@/lib/simulation/engine'
import { SCENARIOS, PROTOCOL_CONFIG, SIMULATION_DEFAULTS, DEPOSIT_PRESETS } from '@/lib/constants'
import { TOKENS, DEBT_TOKENS, getToken, getHistoricTokens, getSimulatedTokens, getDebtToken, getDebtTokenBorrowRate } from '@/data/historicPrices'

interface UseSimulationReturn {
  // State
  state: SimulationState
  isPlaying: boolean
  playSpeed: number

  // Actions
  setDay: (day: number) => void
  play: () => void
  pause: () => void
  reset: () => void
  setPlaySpeed: (speed: number) => void
  initChartData: () => void

  // Market conditions
  setPriceChange: (percent: number) => void
  setVolatility: (volatility: 'low' | 'medium' | 'high') => void
  setInterestRateChange: (percent: number) => void
  setDataMode: (mode: 'simulated' | 'historic') => void
  setCollateralToken: (tokenId: string, livePrice?: number) => void
  setDebtToken: (tokenId: string) => void
  applyScenario: (scenario: Scenario) => void

  // Protocol config overrides (for simulated mode)
  setBorrowAPY: (apy: number) => void
  setSupplyAPY: (apy: number) => void
  setBasePrice: (price: number) => void
  setFcmMinHealth: (health: number) => void
  setFcmTargetHealth: (health: number) => void
  setInitialDeposit: (amount: number) => void
  setCollateralFactor: (factor: number) => void

  // Historic mode options
  setStartYear: (year: number) => void
  setEndYear: (year: number) => void

  // Computed
  comparison: ReturnType<typeof getComparisonSummary>
  displayMetrics: ReturnType<typeof getDisplayMetrics>
  scenarios: Scenario[]

  // Token data
  tokens: typeof TOKENS
  debtTokens: typeof DEBT_TOKENS
  getHistoricTokens: typeof getHistoricTokens
  getSimulatedTokens: typeof getSimulatedTokens
  getDebtToken: typeof getDebtToken

  // Constants
  depositPresets: typeof DEPOSIT_PRESETS
  availableYears: number[]
}

export function useSimulation(
  initialDeposit: number = PROTOCOL_CONFIG.initialDeposit
): UseSimulationReturn {
  // Initialize state with historic data mode by default
  const [state, setState] = useState<SimulationState>(() =>
    initializeSimulation(initialDeposit, {
      priceChange: -35,
      volatility: 'medium',
      interestRateChange: 0,
      dataMode: 'historic',
      collateralToken: 'eth',
      debtToken: 'usdc',
      startYear: 2020,
      endYear: 2020,
    })
  )

  const [isPlaying, setIsPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState(SIMULATION_DEFAULTS.playSpeed)

  // Ref for animation frame
  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  // Set day
  const setDay = useCallback((day: number) => {
    setState(prev => simulateToDay(prev, day))
  }, [])

  // Play animation
  const play = useCallback(() => {
    // Initialize chart data before playing if not already done
    setState(prev => {
      if (prev.chartData.length === 0) {
        const chartData = generateChartData(prev)
        return { ...prev, chartData }
      }
      return prev
    })
    setIsPlaying(true)
  }, [])

  // Pause animation
  const pause = useCallback(() => {
    setIsPlaying(false)
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    // Reset timing ref so next play starts fresh
    lastTimeRef.current = 0
  }, [])

  // Reset simulation
  const reset = useCallback(() => {
    pause()
    setState(prev => resetSimulation(prev))
  }, [pause])

  // Market condition setters
  const setPriceChange = useCallback((percent: number) => {
    setState(prev => updateMarketConditions(prev, { priceChange: percent }))
  }, [])

  const setVolatility = useCallback((volatility: 'low' | 'medium' | 'high') => {
    setState(prev => updateMarketConditions(prev, { volatility }))
  }, [])

  const setInterestRateChange = useCallback((percent: number) => {
    setState(prev => updateMarketConditions(prev, { interestRateChange: percent }))
  }, [])

  const setDataMode = useCallback((mode: 'simulated' | 'historic') => {
    pause()
    setState(prev => {
      const newState = initializeSimulation(prev.initialDeposit, {
        ...prev.marketConditions,
        dataMode: mode,
      })
      return simulateToDay(newState, 0)
    })
  }, [pause])

  const setCollateralToken = useCallback((tokenId: string, livePrice?: number) => {
    pause()
    setState(prev => {
      // Use live price if provided, otherwise use token's basePrice
      const token = getToken(tokenId)
      const basePrice = livePrice ?? token?.basePrice ?? 100

      const newState = initializeSimulation(prev.initialDeposit, {
        ...prev.marketConditions,
        collateralToken: tokenId,
        basePrice: basePrice,
      })
      return simulateToDay(newState, 0)
    })
  }, [pause])

  const setDebtToken = useCallback((tokenId: string) => {
    pause()
    setState(prev => {
      // Get borrow rate for the new debt token
      const borrowRate = getDebtTokenBorrowRate(tokenId)
      const newState = initializeSimulation(prev.initialDeposit, {
        ...prev.marketConditions,
        debtToken: tokenId,
        borrowAPY: borrowRate,
      })
      return simulateToDay(newState, 0)
    })
  }, [pause])

  // Protocol config overrides (for simulated mode)
  // These preserve the current day position instead of resetting to day 0
  const setBorrowAPY = useCallback((apy: number) => {
    setState(prev => {
      const newState = initializeSimulation(prev.initialDeposit, {
        ...prev.marketConditions,
        borrowAPY: apy,
      })
      return simulateToDay(newState, prev.currentDay)
    })
  }, [])

  const setSupplyAPY = useCallback((apy: number) => {
    setState(prev => {
      const newState = initializeSimulation(prev.initialDeposit, {
        ...prev.marketConditions,
        supplyAPY: apy,
      })
      return simulateToDay(newState, prev.currentDay)
    })
  }, [])

  const setBasePrice = useCallback((price: number) => {
    setState(prev => {
      const newState = initializeSimulation(prev.initialDeposit, {
        ...prev.marketConditions,
        basePrice: price,
      })
      return simulateToDay(newState, prev.currentDay)
    })
  }, [])

  const setFcmMinHealth = useCallback((health: number) => {
    setState(prev => {
      const newState = initializeSimulation(prev.initialDeposit, {
        ...prev.marketConditions,
        fcmMinHealth: health,
      })
      return simulateToDay(newState, prev.currentDay)
    })
  }, [])

  const setFcmTargetHealth = useCallback((health: number) => {
    setState(prev => {
      const newState = initializeSimulation(prev.initialDeposit, {
        ...prev.marketConditions,
        fcmTargetHealth: health,
      })
      return simulateToDay(newState, prev.currentDay)
    })
  }, [])

  const setCollateralFactor = useCallback((factor: number) => {
    setState(prev => {
      const newState = initializeSimulation(prev.initialDeposit, {
        ...prev.marketConditions,
        collateralFactor: factor,
      })
      return simulateToDay(newState, prev.currentDay)
    })
  }, [])

  const setInitialDeposit = useCallback((amount: number) => {
    pause()
    setState(prev => {
      const newState = initializeSimulation(amount, {
        ...prev.marketConditions,
      })
      return simulateToDay(newState, 0)
    })
  }, [pause])

  // Historic mode options
  const setStartYear = useCallback((year: number) => {
    pause()
    setState(prev => {
      const currentEndYear = prev.marketConditions.endYear ?? 2020
      const newState = initializeSimulation(prev.initialDeposit, {
        ...prev.marketConditions,
        startYear: year,
        // Ensure endYear is at least startYear
        endYear: Math.max(year, currentEndYear),
      })
      return simulateToDay(newState, 0)
    })
  }, [pause])

  const setEndYear = useCallback((year: number) => {
    pause()
    setState(prev => {
      const currentStartYear = prev.marketConditions.startYear ?? 2020
      const newState = initializeSimulation(prev.initialDeposit, {
        ...prev.marketConditions,
        endYear: year,
        // Ensure startYear is at most endYear
        startYear: Math.min(year, currentStartYear),
      })
      return simulateToDay(newState, 0)
    })
  }, [pause])

  // Initialize chart data (called before play to pre-compute all data points)
  const initChartData = useCallback(() => {
    setState(prev => {
      if (prev.chartData.length > 0) return prev // Already initialized
      const chartData = generateChartData(prev)
      return { ...prev, chartData }
    })
  }, [])

  // Apply scenario preset
  const applyScenario = useCallback((scenario: Scenario) => {
    pause()
    setState(prev => {
      // Switch to simulated mode when applying scenarios
      const newState = updateMarketConditions(prev, {
        priceChange: scenario.priceChange,
        volatility: scenario.volatility,
        interestRateChange: scenario.interestRateChange,
        pattern: scenario.pattern,
        dataMode: 'simulated',
      })
      // Reset to day 0 when applying scenario
      return simulateToDay(newState, 0)
    })
  }, [pause])

  // Animation loop - uses state.playSpeed for dynamic speed based on total days
  useEffect(() => {
    if (!isPlaying) return

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp
      }

      const deltaTime = timestamp - lastTimeRef.current

      setState(prev => {
        // Base speed calculated from totalDays (completes in ~1 minute at 1x)
        // User's playSpeed (1, 2, 3, 4) acts as a multiplier
        const baseSpeed = prev.playSpeed / 4 // Slow down base speed so 1x is comfortable
        const effectiveSpeed = baseSpeed * playSpeed // Apply user's speed multiplier
        const daysToAdvance = (deltaTime / 1000) * effectiveSpeed

        if (daysToAdvance >= 1) {
          lastTimeRef.current = timestamp
          const newDay = Math.min(prev.currentDay + Math.floor(daysToAdvance), prev.maxDay)

          // Stop playing if we've reached the end
          if (newDay >= prev.maxDay) {
            setIsPlaying(false)
            return simulateToDay(prev, prev.maxDay)
          }

          return simulateToDay(prev, newDay)
        }
        return prev
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, playSpeed])

  // Computed values
  const comparison = getComparisonSummary(state)
  const displayMetrics = getDisplayMetrics(state)

  // Available years for historic simulation
  const availableYears = [2020, 2021, 2022, 2023, 2024, 2025]

  return {
    state,
    isPlaying,
    playSpeed,
    setDay,
    play,
    pause,
    reset,
    setPlaySpeed,
    initChartData,
    setPriceChange,
    setVolatility,
    setInterestRateChange,
    setDataMode,
    setCollateralToken,
    setDebtToken,
    applyScenario,
    setBorrowAPY,
    setSupplyAPY,
    setBasePrice,
    setFcmMinHealth,
    setFcmTargetHealth,
    setInitialDeposit,
    setCollateralFactor,
    setStartYear,
    setEndYear,
    comparison,
    displayMetrics,
    scenarios: SCENARIOS,
    tokens: TOKENS,
    debtTokens: DEBT_TOKENS,
    getHistoricTokens,
    getSimulatedTokens,
    getDebtToken,
    depositPresets: DEPOSIT_PRESETS,
    availableYears,
  }
}
