'use client'

import { useMemo, useCallback, useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingDown,
  TrendingUp,
  Activity,
  Zap,
  Shield,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Code2,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Skull,
  CheckCircle2,
  AlertCircle,
  Timer,
  Settings2,
  ExternalLink,
} from 'lucide-react'
import { useSimulation } from '@/hooks/useSimulation'
import { cn, formatCurrency, formatCurrencyCompact, formatPercent, formatTokenAmount } from '@/lib/utils'
import { TOOLTIPS, PROTOCOL_CONFIG } from '@/lib/constants'
import { Tooltip } from '@/components/ui/Tooltip'
import { SimulationEvent } from '@/types'
import { getTokenSupplyAPY } from '@/data/historicPrices'
import { ComparisonSummary } from '@/components/ComparisonSummary'
import { OutcomeBadge } from '@/components/OutcomeBadge'
import { RebalanceToast } from '@/components/RebalanceToast'

export default function SimulatorPage() {
  const {
    state,
    isPlaying,
    playSpeed,
    setDay,
    play,
    pause,
    reset,
    setPlaySpeed,
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
    comparison,
    scenarios,
    tokens,
    debtTokens,
  } = useSimulation()

  // Track previous status for liquidation detection
  const prevStatusRef = useRef(state.traditional.status)
  const prevRebalanceCountRef = useRef(state.fcm.rebalanceCount)
  const [showLiquidationFlash, setShowLiquidationFlash] = useState(false)
  const [showRebalanceToast, setShowRebalanceToast] = useState(false)
  const [lastRebalanceHealth, setLastRebalanceHealth] = useState({ before: 0, after: 0 })

  // Detect liquidation and auto-pause
  useEffect(() => {
    if (prevStatusRef.current !== 'liquidated' && state.traditional.status === 'liquidated') {
      // Liquidation just happened!
      pause()
      setShowLiquidationFlash(true)
      setTimeout(() => setShowLiquidationFlash(false), 1000)
    }
    prevStatusRef.current = state.traditional.status
  }, [state.traditional.status, pause])

  // Detect rebalance and show toast
  useEffect(() => {
    if (state.fcm.rebalanceCount > prevRebalanceCountRef.current) {
      // Find the latest rebalance event
      const rebalanceEvents = state.events.filter(e => e.type === 'rebalance')
      const latestRebalance = rebalanceEvents[rebalanceEvents.length - 1]
      if (latestRebalance?.healthBefore !== undefined && latestRebalance?.healthAfter !== undefined) {
        setLastRebalanceHealth({
          before: latestRebalance.healthBefore,
          after: latestRebalance.healthAfter,
        })
      }
      setShowRebalanceToast(true)
      setTimeout(() => setShowRebalanceToast(false), 3000)
    }
    prevRebalanceCountRef.current = state.fcm.rebalanceCount
  }, [state.fcm.rebalanceCount, state.events])

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDay(Number(e.target.value))
    },
    [setDay]
  )

  const priceChangePercent = useMemo(() => {
    return ((state.flowPrice - state.baseFlowPrice) / state.baseFlowPrice) * 100
  }, [state.flowPrice, state.baseFlowPrice])

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0b0d]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center">
          <span className="font-semibold">FCM Simulator</span>
          <span className="text-xs text-white/40 ml-2 hidden sm:inline">Flow Credit Market</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Hero Section - Compelling CTA */}
        <div className="bg-gradient-to-b from-blue-500/5 via-blue-500/5 to-transparent rounded-2xl p-8 mb-8 text-center border border-white/5">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            What happens when the market crashes?
          </h1>
          <p className="text-white/60 text-lg mb-6 max-w-xl mx-auto">
            Watch two identical positions. Only one survives.
          </p>

          <button
            onClick={isPlaying ? pause : play}
            className={cn(
              "inline-flex items-center gap-3 px-6 py-3 rounded-xl font-semibold text-lg transition-all",
              isPlaying
                ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 animate-pulse-attention"
            )}
          >
            {isPlaying ? (
              <>
                <Pause className="w-6 h-6" />
                Pause Simulation
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                Start Simulation
              </>
            )}
          </button>

          <p className="text-white/40 text-sm mt-4">
            Using real 2020 prices · COVID crash · BTC & ETH
          </p>
        </div>

        {/* Token Selection */}
        <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60">Collateral:</span>
              <div className="flex gap-1">
                {tokens.map((token) => (
                  <button
                    key={token.id}
                    onClick={() => setCollateralToken(token.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                      state.marketConditions.collateralToken === token.id
                        ? "border-white/30 bg-white/10 text-white"
                        : "border-transparent text-white/50 hover:text-white hover:bg-white/5"
                    )}
                    style={{
                      borderColor: state.marketConditions.collateralToken === token.id ? token.color : undefined
                    }}
                  >
                    {token.symbol}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60">Debt:</span>
              <div className="flex gap-1">
                {debtTokens.map((token) => (
                  <button
                    key={token.id}
                    onClick={() => setDebtToken(token.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      state.marketConditions.debtToken === token.id
                        ? "bg-white/10 text-white"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {token.symbol}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-white/60">Data:</span>
              <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                <Tooltip
                  position="bottom"
                  className="!whitespace-normal w-64 text-left"
                  content={
                    <div className="space-y-2">
                      <p className="font-semibold text-white">Real 2020 Price Data</p>
                      <p className="text-xs text-white/80 leading-relaxed">
                        Actual crypto prices from January to December 2020, including the COVID crash in March and the bull run recovery.
                      </p>
                      <a
                        href="https://www.coingecko.com/en/coins/bitcoin/historical_data"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 underline mt-1"
                      >
                        Source: CoinGecko
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  }
                >
                  <button
                    onClick={() => setDataMode('historic')}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-medium transition-all",
                      state.marketConditions.dataMode === 'historic'
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "text-white/40 hover:text-white/60"
                    )}
                  >
                    Historic (2020)
                  </button>
                </Tooltip>
                <button
                  onClick={() => setDataMode('simulated')}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-all",
                    state.marketConditions.dataMode === 'simulated'
                      ? "bg-purple-500/20 text-purple-400"
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  Simulated
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <StatCard
            label="Day"
            value={state.currentDay.toString()}
            subValue={`/ ${state.maxDay}`}
            icon={<Clock className="w-4 h-4 text-white/60" />}
          />
          <StatCard
            label={`${tokens.find(t => t.id === state.marketConditions.collateralToken)?.symbol || 'Token'} Price`}
            value={formatCurrencyCompact(state.flowPrice)}
            subValue={formatPercent(priceChangePercent)}
            subValueColor={priceChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}
            icon={priceChangePercent >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
          />
          <StatCard
            label="APY Rates"
            value={formatPercent(getTokenSupplyAPY(state.marketConditions.collateralToken) * 100, 1)}
            subValue={`${formatPercent(-PROTOCOL_CONFIG.borrowAPY * 100, 1)} borrow`}
            subValueColor="text-red-400"
            icon={<Zap className="w-4 h-4 text-white/60" />}
            tooltipContent={state.marketConditions.dataMode === 'historic'
              ? (
                <div className="space-y-2">
                  <div>
                    <div className="font-semibold text-emerald-400">Supply APY</div>
                    <div className="text-white/60">Based on 2020 Compound/Aave rates:</div>
                    <ul className="list-disc list-inside text-white/40 ml-1">
                      <li>BTC: ~2% (varied 0.1-5%)</li>
                      <li>ETH: ~3% (varied 0.5-10%)</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold text-red-400">Borrow APY</div>
                    <div className="text-white/60">5% average DeFi lending rate</div>
                  </div>
                  <div className="text-white/40 text-[10px] pt-1 border-t border-white/10">
                    Source:{' '}
                    <a
                      href="https://www.theblock.co/data/decentralized-finance/cryptocurrency-lending"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      The Block DeFi Lending Data
                    </a>
                  </div>
                </div>
              )
              : (
                <div className="text-white/60">
                  Simulated APY rates for demonstration purposes.
                </div>
              )}
          />
          <OutcomeBadge
            traditionalStatus={state.traditional.status}
            returnsDifference={state.fcm.totalReturns - state.traditional.totalReturns}
          />
          <StatCard
            label="FCM Rebalances"
            value={state.fcm.rebalanceCount.toString()}
            subValue="Auto-protected"
            icon={<RefreshCw className="w-4 h-4 text-blue-400" />}
          />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-4 mb-6">
          {/* Traditional Position */}
          <PositionPanel
            title="Traditional Lending"
            subtitle="No auto-rebalancing"
            type="traditional"
            healthFactor={state.traditional.healthFactor}
            collateral={state.traditional.collateralValueUSD}
            collateralAmount={state.traditional.collateralAmount}
            debt={state.traditional.debtAmount}
            returns={state.traditional.totalReturns}
            status={state.traditional.status}
            interestPaid={state.traditional.accruedInterest}
            earnedYield={state.traditional.earnedYield}
            tokenSymbol={tokens.find(t => t.id === state.marketConditions.collateralToken)?.symbol || 'TOKEN'}
            debtSymbol={debtTokens.find(t => t.id === state.marketConditions.debtToken)?.symbol || 'USD'}
          />

          {/* FCM Position */}
          <PositionPanel
            title="FCM Lending"
            subtitle="Auto-rebalancing enabled"
            type="fcm"
            healthFactor={state.fcm.healthFactor}
            collateral={state.fcm.collateralValueUSD}
            collateralAmount={state.fcm.collateralAmount}
            debt={state.fcm.debtAmount}
            returns={state.fcm.totalReturns}
            status={state.fcm.status}
            interestPaid={state.fcm.accruedInterest}
            earnedYield={state.fcm.earnedYield}
            rebalances={state.fcm.rebalanceCount}
            tokenSymbol={tokens.find(t => t.id === state.marketConditions.collateralToken)?.symbol || 'TOKEN'}
            debtSymbol={debtTokens.find(t => t.id === state.marketConditions.debtToken)?.symbol || 'USD'}
          />
        </div>

        {/* Comparison Summary - Shows when Traditional gets liquidated */}
        {state.traditional.status === 'liquidated' && (
          <ComparisonSummary
            traditionalReturns={state.traditional.totalReturns}
            fcmReturns={state.fcm.totalReturns}
            difference={state.fcm.totalReturns - state.traditional.totalReturns}
            rebalanceCount={state.fcm.rebalanceCount}
            isVisible={state.traditional.status === 'liquidated'}
          />
        )}

        {/* Timeline Control */}
        <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={isPlaying ? pause : play}
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                  isPlaying ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"
                )}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button
                onClick={reset}
                className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              {[
                { label: '1x', value: 10 },
                { label: '2x', value: 20 },
                { label: '3x', value: 30 },
                { label: '4x', value: 40 },
              ].map((speed) => (
                <button
                  key={speed.value}
                  onClick={() => setPlaySpeed(speed.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    playSpeed === speed.value
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  {speed.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slider */}
          <div className="relative pt-2 pb-1">
            <input
              type="range"
              min={0}
              max={state.maxDay}
              value={state.currentDay}
              onChange={handleSliderChange}
              className="timeline-slider w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10"
              style={{
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(state.currentDay / state.maxDay) * 100}%, rgba(255,255,255,0.1) ${(state.currentDay / state.maxDay) * 100}%)`
              }}
            />
          </div>

          <div className="flex justify-between text-xs text-white/40">
            <span>Day 0</span>
            <span className="text-white font-medium">Day {state.currentDay}</span>
            <span>Day {state.maxDay}</span>
          </div>
        </div>

        {/* Market Controls - Only show for Simulated mode */}
        {state.marketConditions.dataMode === 'simulated' && (
          <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="w-4 h-4 text-white/60" />
              <span className="font-medium">Market Scenario</span>
            </div>

            {/* Scenario Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => applyScenario(scenario)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all border",
                    state.marketConditions.priceChange === scenario.priceChange
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-transparent border-white/10 text-white/60 hover:border-white/20 hover:text-white"
                  )}
                >
                  {scenario.name}
                </button>
              ))}
            </div>

            {/* Sliders */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">Price Change</span>
                  <span className={cn(
                    "font-mono",
                    state.marketConditions.priceChange >= 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {formatPercent(state.marketConditions.priceChange, 0)}
                  </span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={100}
                  value={state.marketConditions.priceChange}
                  onChange={(e) => setPriceChange(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">Volatility</span>
                  <span className="font-mono capitalize">{state.marketConditions.volatility}</span>
                </div>
                <div className="flex gap-1">
                  {(['low', 'medium', 'high'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setVolatility(v)}
                      className={cn(
                        "flex-1 py-1.5 rounded text-xs font-medium capitalize transition-all",
                        state.marketConditions.volatility === v
                          ? "bg-white/10 text-white"
                          : "text-white/40 hover:text-white/60"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">Rate Change</span>
                  <span className="font-mono">{formatPercent(state.marketConditions.interestRateChange)}</span>
                </div>
                <input
                  type="range"
                  min={-3}
                  max={5}
                  step={0.5}
                  value={state.marketConditions.interestRateChange}
                  onChange={(e) => setInterestRateChange(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="border-t border-white/10 pt-4 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="w-4 h-4 text-white/60" />
                <span className="text-sm font-medium text-white/80">Advanced Settings</span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Base Token Price */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/60">Base Token Price</span>
                    <span className="font-mono">${state.marketConditions.basePrice ?? PROTOCOL_CONFIG.baseFlowPrice}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    step={1}
                    value={state.marketConditions.basePrice ?? PROTOCOL_CONFIG.baseFlowPrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Borrow APY */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/60">Borrow APY</span>
                    <span className="font-mono">{formatPercent((state.marketConditions.borrowAPY ?? PROTOCOL_CONFIG.borrowAPY) * 100, 1)}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={0.5}
                    value={(state.marketConditions.borrowAPY ?? PROTOCOL_CONFIG.borrowAPY) * 100}
                    onChange={(e) => setBorrowAPY(Number(e.target.value) / 100)}
                    className="w-full"
                  />
                </div>

                {/* Supply APY */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/60">Supply APY</span>
                    <span className="font-mono">{formatPercent((state.marketConditions.supplyAPY ?? PROTOCOL_CONFIG.supplyAPY) * 100, 1)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={15}
                    step={0.5}
                    value={(state.marketConditions.supplyAPY ?? PROTOCOL_CONFIG.supplyAPY) * 100}
                    onChange={(e) => setSupplyAPY(Number(e.target.value) / 100)}
                    className="w-full"
                  />
                </div>

                {/* FCM Min Health (Rebalance Trigger) */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/60">FCM Rebalance Trigger</span>
                    <span className="font-mono">{(state.marketConditions.fcmMinHealth ?? PROTOCOL_CONFIG.minHealth).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={1.05}
                    max={1.5}
                    step={0.05}
                    value={state.marketConditions.fcmMinHealth ?? PROTOCOL_CONFIG.minHealth}
                    onChange={(e) => setFcmMinHealth(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* FCM Target Health (Restore To) */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/60">FCM Target Health</span>
                    <span className="font-mono">{(state.marketConditions.fcmTargetHealth ?? PROTOCOL_CONFIG.targetHealth).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={1.1}
                    max={2.0}
                    step={0.05}
                    value={state.marketConditions.fcmTargetHealth ?? PROTOCOL_CONFIG.targetHealth}
                    onChange={(e) => setFcmTargetHealth(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Log */}
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-white/60" />
            <span className="font-medium">Transaction Log</span>
            <span className="text-white/40 text-sm ml-auto">Under the Hood</span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {state.events.length === 0 ? (
              <div className="p-8 text-center text-white/40">
                Move the timeline to see events
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {state.events.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center text-sm text-white/40">
          <p>Educational simulation of Flow Credit Market</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <a
              href="https://developers.flow.com/blockchain-development-tutorials/forte/scheduled-transactions-introduction"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300"
            >
              Flow Docs
            </a>
            <span className="text-white/20">·</span>
            <a
              href="https://github.com/onflow/FlowCreditMarket"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 hover:text-white/60"
            >
              GitHub
            </a>
          </div>
          <p className="mt-2 text-white/30 text-xs">Not Financial Advice</p>
        </div>
      </main>

      {/* Rebalance Toast Notification */}
      <RebalanceToast
        visible={showRebalanceToast}
        healthBefore={lastRebalanceHealth.before}
        healthAfter={lastRebalanceHealth.after}
      />
    </div>
  )
}

// ============ Components ============

interface StatCardProps {
  label: string
  value: string
  subValue?: string
  subValueColor?: string
  icon?: React.ReactNode
  tooltipContent?: React.ReactNode
}

function StatCard({ label, value, subValue, subValueColor, icon, tooltipContent }: StatCardProps) {
  const cardContent = (
    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-white/50">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-semibold font-mono">{value}</span>
        {subValue && (
          <span className={cn("text-xs", subValueColor || "text-white/40")}>{subValue}</span>
        )}
      </div>
    </div>
  )

  if (tooltipContent) {
    return (
      <Tooltip content={<div className="text-xs max-w-xs">{tooltipContent}</div>} position="bottom">
        {cardContent}
      </Tooltip>
    )
  }

  return cardContent
}

interface PositionPanelProps {
  title: string
  subtitle: string
  type: 'traditional' | 'fcm'
  healthFactor: number
  collateral: number
  collateralAmount: number
  debt: number
  returns: number
  status: 'healthy' | 'warning' | 'liquidated'
  interestPaid: number
  earnedYield?: number
  rebalances?: number
  tokenSymbol: string
  debtSymbol: string
}

function PositionPanel({
  title,
  subtitle,
  type,
  healthFactor,
  collateral,
  collateralAmount,
  debt,
  returns,
  status,
  interestPaid,
  earnedYield,
  rebalances,
  tokenSymbol,
  debtSymbol,
}: PositionPanelProps) {
  const isFCM = type === 'fcm'
  const isLiquidated = status === 'liquidated'

  // Simplified health color - no purple, only 3 semantic colors
  const getHealthColor = () => {
    if (isLiquidated || healthFactor < 1.2) return 'text-red-400'
    if (healthFactor < 1.4) return 'text-amber-400'
    return 'text-emerald-400'
  }

  const getHealthBg = () => {
    if (isLiquidated || healthFactor < 1.2) return 'bg-red-500/10'
    if (healthFactor < 1.4) return 'bg-amber-500/10'
    return 'bg-emerald-500/10'
  }

  const StatusIcon = isLiquidated ? Skull : healthFactor >= 1.4 ? CheckCircle2 : AlertCircle

  return (
    <div className={cn(
      "rounded-xl p-4 transition-all bg-white/5 border border-white/10",
      // FCM gets subtle emerald left border accent
      isFCM && "border-l-2 border-l-emerald-500/40",
      isLiquidated && !isFCM && "animate-pulse"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            {isFCM ? (
              <Shield className="w-4 h-4 text-white/60" />
            ) : (
              <Wallet className="w-4 h-4 text-white/60" />
            )}
            <span className="font-semibold">{title}</span>
          </div>
          <span className="text-xs text-white/40">{subtitle}</span>
        </div>
        <div className={cn(
          "px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1",
          isLiquidated ? "bg-red-500/20 text-red-400" :
          status === 'warning' ? "bg-amber-500/20 text-amber-400" :
          "bg-emerald-500/20 text-emerald-400"
        )}>
          <StatusIcon className="w-3 h-3" />
          {isLiquidated ? 'Liquidated' : status === 'warning' ? 'At Risk' : 'Healthy'}
        </div>
      </div>

      {/* Health Factor */}
      <div className={cn("rounded-lg p-3 mb-4", getHealthBg())}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/60">Health Factor</span>
          <span className={cn("text-2xl font-bold font-mono", getHealthColor())}>
            {isLiquidated ? '0.00' : healthFactor.toFixed(2)}
          </span>
        </div>
        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isLiquidated || healthFactor < 1.2 ? "bg-red-500" :
              healthFactor < 1.4 ? "bg-amber-500" : "bg-emerald-500"
            )}
            style={{ width: `${Math.min((healthFactor / 2) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-white/40">
          <span>0</span>
          <span>1.0</span>
          <span>2.0</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-2">
        <MetricRow
          label="Collateral"
          value={formatCurrencyCompact(collateral)}
          subValue={formatTokenAmount(collateralAmount, tokenSymbol)}
        />
        <MetricRow
          label="Debt"
          value={formatCurrencyCompact(debt)}
          subValue={`${debt.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${debtSymbol}`}
        />
        <MetricRow
          label="Interest Paid"
          value={formatCurrencyCompact(interestPaid)}
          valueColor="text-red-400"
        />
        {earnedYield !== undefined && earnedYield > 0 && (
          <MetricRow
            label="Yield Earned"
            value={`+${formatCurrencyCompact(earnedYield)}`}
            subValue={isFCM ? "Auto-applied to debt" : "Manual management"}
            valueColor="text-emerald-400"
          />
        )}
        {earnedYield !== undefined && (
          <MetricRow
            label="Net Interest"
            value={formatCurrencyCompact(earnedYield - interestPaid)}
            valueColor={earnedYield - interestPaid >= 0 ? "text-emerald-400" : "text-amber-400"}
          />
        )}
        <div className="border-t border-white/10 pt-2 mt-2">
          <MetricRow
            label="Net P&L"
            value={formatCurrencyCompact(returns)}
            valueColor={returns >= 0 ? "text-emerald-400" : "text-red-400"}
            icon={returns >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          />
        </div>
        {isFCM && rebalances !== undefined && rebalances > 0 && (
          <div className="flex items-center gap-2 text-xs text-blue-400 mt-2">
            <RefreshCw className="w-3 h-3" />
            <span>{rebalances} auto-rebalance{rebalances > 1 ? 's' : ''} performed</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface MetricRowProps {
  label: string
  value: string
  subValue?: string
  valueColor?: string
  icon?: React.ReactNode
}

function MetricRow({ label, value, subValue, valueColor, icon }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/50">{label}</span>
      <div className="flex flex-col items-end">
        <div className={cn("flex items-center gap-1 font-mono text-sm", valueColor || "text-white")}>
          {icon}
          {value}
        </div>
        {subValue && (
          <span className="text-xs text-white/40 font-mono">{subValue}</span>
        )}
      </div>
    </div>
  )
}

interface EventRowProps {
  event: SimulationEvent
}

const DOCS_LINKS = {
  scheduledTxn: 'https://developers.flow.com/blockchain-development-tutorials/forte/scheduled-transactions/scheduled-transactions-introduction',
  defiActions: 'https://developers.flow.com/blockchain-development-tutorials/forte/flow-actions',
}

function EventRow({ event }: EventRowProps) {
  const getIcon = () => {
    switch (event.type) {
      case 'create': return <Wallet className="w-4 h-4" />
      case 'borrow': return <ArrowDownRight className="w-4 h-4" />
      case 'rebalance': return <RefreshCw className="w-4 h-4 text-blue-400" />
      case 'liquidation': return <Skull className="w-4 h-4 text-red-400" />
      case 'scheduled': return <Timer className="w-4 h-4 text-amber-400" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const getPositionColor = () => {
    if (event.position === 'fcm') return 'text-emerald-400'
    if (event.position === 'traditional') return 'text-red-400'
    return 'text-blue-400'
  }

  // Render action text with hyperlinks for scheduled transactions
  const renderAction = () => {
    if (event.type === 'scheduled') {
      return (
        <a
          href={DOCS_LINKS.scheduledTxn}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-amber-400 hover:text-amber-300 underline decoration-amber-400/40 hover:decoration-amber-300"
        >
          {event.action}
        </a>
      )
    }
    return <span className="text-sm text-white/60">{event.action}</span>
  }

  // Render code with hyperlinks for DeFi actions (TopUpSource, Sink, etc.)
  const renderCode = () => {
    const code = event.code
    // Check if this event uses DeFi actions (TopUpSource, Sink, DrawDownSink)
    if (code.includes('TopUpSource') || code.includes('Sink') || code.includes('DrawDownSink')) {
      return (
        <a
          href={DOCS_LINKS.defiActions}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 font-mono mt-1 block truncate underline decoration-blue-400/40 hover:decoration-blue-300"
        >
          {code}
        </a>
      )
    }
    // Check if this is a scheduled transaction
    if (code.includes('ScheduledTxn')) {
      return (
        <a
          href={DOCS_LINKS.scheduledTxn}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-amber-400 hover:text-amber-300 font-mono mt-1 block truncate underline decoration-amber-400/40 hover:decoration-amber-300"
        >
          {code}
        </a>
      )
    }
    return (
      <code className="text-xs text-blue-400/60 font-mono mt-1 block truncate">
        {code}
      </code>
    )
  }

  return (
    <div className="px-4 py-3 hover:bg-white/5 transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-white/40">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-white/40">Day {event.day}</span>
            <span className={cn("text-xs font-medium uppercase", getPositionColor())}>
              {event.position === 'both' ? 'Both' : event.position.toUpperCase()}
            </span>
            {event.healthBefore !== undefined && event.healthAfter !== undefined && (
              <span className="text-xs text-white/40">
                HF: {event.healthBefore.toFixed(2)} → {event.healthAfter.toFixed(2)}
              </span>
            )}
          </div>
          {renderAction()}
          {renderCode()}
        </div>
      </div>
    </div>
  )
}
