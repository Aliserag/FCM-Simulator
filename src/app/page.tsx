"use client";

import { useMemo, useCallback, useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingDown,
  TrendingUp,
  Activity,
  Zap,
  Shield,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  ChevronDown,
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
} from "lucide-react";
import { useSimulation } from "@/hooks/useSimulation";
import {
  cn,
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  formatTokenAmount,
} from "@/lib/utils";
import { TOOLTIPS, PROTOCOL_CONFIG } from "@/lib/constants";
import { Tooltip } from "@/components/ui/Tooltip";
import { SimulationEvent } from "@/types";
import { getTokenSupplyAPY, getToken } from "@/data/historicPrices";
import { calculateLiquidationPrice } from "@/lib/simulation/calculations";
import { ComparisonSummary } from "@/components/ComparisonSummary";
import { RebalanceToast } from "@/components/RebalanceToast";
import { useCoinGeckoPrices } from "@/hooks/useCoinGeckoPrices";
import SimulationChart from "@/components/SimulationChart";
import { Sidebar } from "@/components/Sidebar";
import { ShinyCard } from "@/components/ui/ShinyCard";

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
    setInitialDeposit,
    setCollateralFactor,
    setStartYear,
    setEndYear,
    comparison,
    scenarios,
    tokens,
    debtTokens,
    getHistoricTokens,
    getSimulatedTokens,
    getDebtToken,
    depositPresets,
    availableYears,
    initChartData,
  } = useSimulation();

  // Live prices from CoinGecko (for simulated mode)
  const {
    prices: livePrices,
    isLoading: pricesLoading,
    usingFallback,
    fetchPrices,
  } = useCoinGeckoPrices();

  // Track previous status for liquidation detection
  const prevStatusRef = useRef(state.traditional.status);
  const prevRebalanceCountRef = useRef(state.fcm.rebalanceCount);
  const [showLiquidationFlash, setShowLiquidationFlash] = useState(false);
  const [showRebalanceToast, setShowRebalanceToast] = useState(false);
  const [lastRebalanceHealth, setLastRebalanceHealth] = useState({
    before: 0,
    after: 0,
  });
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Handler for starting simulation
  const handleStartSimulation = useCallback(() => {
    setHasStarted(true);
    play();
  }, [play]);

  // Show results when simulation has started or is beyond day 0
  const showResults = hasStarted || state.currentDay > 0;

  // Initialize chart data on mount so chart is visible by default
  useEffect(() => {
    initChartData();
  }, [initChartData]);

  // Detect liquidation and show flash (no pause - let simulation continue to end)
  useEffect(() => {
    if (
      prevStatusRef.current !== "liquidated" &&
      state.traditional.status === "liquidated"
    ) {
      // Liquidation just happened - flash but don't pause
      setShowLiquidationFlash(true);
      setTimeout(() => setShowLiquidationFlash(false), 1000);
    }
    prevStatusRef.current = state.traditional.status;
  }, [state.traditional.status]);

  // Detect rebalance and show toast
  useEffect(() => {
    if (state.fcm.rebalanceCount > prevRebalanceCountRef.current) {
      // Find the latest rebalance event
      const rebalanceEvents = state.events.filter(
        (e) => e.type === "rebalance"
      );
      const latestRebalance = rebalanceEvents[rebalanceEvents.length - 1];
      if (
        latestRebalance?.healthBefore !== undefined &&
        latestRebalance?.healthAfter !== undefined
      ) {
        setLastRebalanceHealth({
          before: latestRebalance.healthBefore,
          after: latestRebalance.healthAfter,
        });
      }
      setShowRebalanceToast(true);
      setTimeout(() => setShowRebalanceToast(false), 3000);
    }
    prevRebalanceCountRef.current = state.fcm.rebalanceCount;
  }, [state.fcm.rebalanceCount, state.events]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDay(Number(e.target.value));
    },
    [setDay]
  );

  const priceChangePercent = useMemo(() => {
    return (
      ((state.flowPrice - state.baseFlowPrice) / state.baseFlowPrice) * 100
    );
  }, [state.flowPrice, state.baseFlowPrice]);

  // Handler for data mode change
  const handleDataModeChange = useCallback(
    (mode: "historic" | "simulated") => {
      if (mode === "simulated") {
        // When switching to simulated mode, use live price as base
        const currentToken = state.marketConditions.collateralToken;
        const livePrice = livePrices[currentToken];
        setDataMode("simulated");
        if (livePrice) {
          setBasePrice(livePrice);
        }
      } else {
        setDataMode("historic");
      }
      setHasStarted(false);
    },
    [state.marketConditions.collateralToken, livePrices, setDataMode, setBasePrice]
  );

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-white">
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Hero Section */}
        <div className="mb-6 sm:mb-8 text-center">
          {/* Logo pill - matches Figma */}
          <div className="inline-flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-full bg-[#111417] mb-4 sm:mb-6">
            <div className="px-3 sm:px-4 py-1 rounded-full bg-[rgba(53,229,160,0.1)]">
              <span className="font-semibold text-white text-sm sm:text-base">FCM Simulator</span>
            </div>
            <span className="text-[10px] sm:text-xs text-[rgba(255,255,255,0.4)] px-1 sm:px-2">Flow Credit Market</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 text-white leading-tight">
            Sleep through the next Crash.<br />
            <span className="text-mint">Wake up wealthy.</span>
          </h1>
          <p className="text-[#a6b0b8] text-sm sm:text-lg max-w-xl mx-auto px-2">
            Watch how Traditional DeFi compares to Flow Credit Markets
          </p>
        </div>

        {/* Results Section */}
        <>
            {/* Sidebar + Chart Row - Stack on mobile, side-by-side on desktop */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6 lg:items-stretch">
              {/* Sidebar (mobile renders above via internal component, desktop renders here) */}
              <Sidebar
                dataMode={state.marketConditions.dataMode}
                onDataModeChange={handleDataModeChange}
                collateralToken={state.marketConditions.collateralToken}
                onCollateralChange={(tokenId, price) => {
                  if (state.marketConditions.dataMode === "simulated" && price) {
                    setCollateralToken(tokenId, price);
                    setBasePrice(price);
                  } else {
                    setCollateralToken(tokenId);
                  }
                }}
                availableTokens={
                  state.marketConditions.dataMode === "historic"
                    ? getHistoricTokens()
                    : getSimulatedTokens()
                }
                startYear={state.marketConditions.startYear ?? 2020}
                endYear={state.marketConditions.endYear ?? 2020}
                onStartYearChange={setStartYear}
                onEndYearChange={setEndYear}
                availableYears={availableYears}
                totalDays={state.totalDays}
                initialDeposit={state.initialDeposit}
                debtSymbol={
                  debtTokens.find((t) => t.id === state.marketConditions.debtToken)
                    ?.symbol || "USDC"
                }
                onStartSimulation={handleStartSimulation}
                isSimulationStarted={hasStarted || state.currentDay > 0}
                // Simulated mode props
                depositPresets={depositPresets}
                onDepositChange={setInitialDeposit}
                debtTokens={debtTokens}
                selectedDebtToken={state.marketConditions.debtToken}
                onDebtTokenChange={setDebtToken}
                livePrices={livePrices}
                pricesLoading={pricesLoading}
                onRefreshPrices={fetchPrices}
                usingFallback={usingFallback}
                onBasePriceChange={setBasePrice}
              />

              {/* Simulation Chart with Timeline Controls + Position Summary */}
              <div className="flex-1 flex flex-col gap-4">
                {state.chartData.length > 0 && (
                <div className="flex-1 relative rounded-xl overflow-hidden">
                  {/* Outer glow/border effect */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-[rgba(255,255,255,0.08)] via-[rgba(255,255,255,0.02)] to-transparent" />

                  {/* Main card background */}
                  <div className="relative m-[1px] rounded-[11px] bg-gradient-to-b from-[#161a1e] to-[#111417] shadow-[0px_4px_16px_0px_rgba(0,0,0,0.3)] p-4 h-[calc(100%-2px)]">
                    {/* Top highlight shine */}
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.1)] to-transparent" />

                    {/* Inner subtle gradient for depth */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-black/[0.05] pointer-events-none rounded-[11px]" />

                    <div className="relative h-full flex flex-col">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-text-primary">
                            Position Equity Over Time
                          </h3>
                          <p className="text-xs text-text-muted hidden sm:block">
                            Net position value (collateral − debt)
                          </p>
                        </div>
                        <div className="text-sm text-text-secondary">
                          Day {state.currentDay} / {state.maxDay}
                        </div>
                      </div>
                      <div className="flex-1 min-h-[280px] sm:min-h-[378px]">
                        <SimulationChart
                          data={state.chartData}
                          currentDay={state.currentDay}
                          totalDays={state.totalDays}
                          startYear={state.marketConditions.startYear ?? 2020}
                          endYear={state.marketConditions.endYear ?? 2020}
                          dataMode={state.marketConditions.dataMode}
                        />
                      </div>

                      {/* Timeline Control inside chart card */}
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-[rgba(255,255,255,0.05)]">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={isPlaying ? pause : play}
                              className={cn(
                                "w-10 h-10 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all active:scale-95",
                                isPlaying
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-mint/20 text-mint"
                              )}
                            >
                              {isPlaying ? (
                                <Pause className="w-5 h-5 sm:w-4 sm:h-4" />
                              ) : (
                                <Play className="w-5 h-5 sm:w-4 sm:h-4" />
                              )}
                            </button>
                            <button
                              onClick={reset}
                              className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-[rgba(255,255,255,0.1)] transition-all active:scale-95"
                            >
                              <RotateCcw className="w-5 h-5 sm:w-4 sm:h-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-0.5 sm:gap-1 bg-[rgba(255,255,255,0.05)] rounded-lg p-1">
                            {[
                              { label: "1x", value: 40 },
                              { label: "2x", value: 80 },
                              { label: "3x", value: 120 },
                              { label: "4x", value: 160 },
                            ].map((speed) => (
                              <button
                                key={speed.value}
                                onClick={() => setPlaySpeed(speed.value)}
                                className={cn(
                                  "px-2.5 sm:px-2 py-1.5 sm:py-1 rounded-md text-xs font-medium transition-all active:scale-95",
                                  playSpeed === speed.value
                                    ? "bg-[rgba(255,255,255,0.1)] text-text-primary"
                                    : "text-text-muted hover:text-text-secondary"
                                )}
                              >
                                {speed.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Slider - taller on mobile for easier touch */}
                        <div className="relative py-2">
                          <input
                            type="range"
                            min={0}
                            max={state.maxDay}
                            value={state.currentDay}
                            onChange={handleSliderChange}
                            className="timeline-slider w-full h-2 sm:h-1.5 rounded-full appearance-none cursor-pointer bg-[rgba(255,255,255,0.1)]"
                            style={{
                              background: `linear-gradient(to right, #35e5a0 0%, #35e5a0 ${
                                (state.currentDay / state.maxDay) * 100
                              }%, rgba(255,255,255,0.1) ${
                                (state.currentDay / state.maxDay) * 100
                              }%)`,
                            }}
                          />
                        </div>

                        <div className="flex justify-between text-xs text-text-muted">
                          <span>Day 0</span>
                          <span className="text-text-primary font-medium">
                            Day {state.currentDay}
                          </span>
                          <span>Day {state.maxDay}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

                {/* Position Summary - Simulated mode only, below chart */}
                {state.marketConditions.dataMode === "simulated" && (
                  <ShinyCard>
                    <div className="px-4 py-3">
                      {/* Mobile: stacked layout, Desktop: inline */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="text-sm text-text-primary flex flex-wrap items-center gap-x-1">
                          <span className="text-text-muted">Deposit</span>
                          <span className="font-semibold text-mint">
                            ${state.initialDeposit.toLocaleString()}
                          </span>
                          <span
                            className="font-semibold"
                            style={{ color: getToken(state.marketConditions.collateralToken)?.color }}
                          >
                            {getToken(state.marketConditions.collateralToken)?.symbol}
                          </span>
                          <span className="text-text-muted mx-1">→</span>
                          <span className="text-text-muted">Borrow</span>
                          <span className="font-semibold text-mint">
                            ${Math.floor(
                              (state.initialDeposit *
                                (state.marketConditions.collateralFactor ??
                                  getToken(state.marketConditions.collateralToken)?.collateralFactor ?? 0.8)) /
                                (state.marketConditions.fcmTargetHealth ?? PROTOCOL_CONFIG.targetHealth)
                            ).toLocaleString()}
                          </span>
                          <span style={{ color: getDebtToken(state.marketConditions.debtToken)?.color }}>
                            {getDebtToken(state.marketConditions.debtToken)?.symbol}
                          </span>
                        </div>
                        <div className="text-xs text-text-muted">
                          {((state.marketConditions.collateralFactor ??
                            getToken(state.marketConditions.collateralToken)?.collateralFactor ?? 0.8) * 100).toFixed(0)}% LTV · {(state.marketConditions.fcmTargetHealth ?? PROTOCOL_CONFIG.targetHealth).toFixed(2)}× Target
                        </div>
                      </div>
                    </div>
                  </ShinyCard>
                )}
              </div>
            </div>

            {/* Market Scenario - Simulated mode only */}
            {state.marketConditions.dataMode === "simulated" && (
              <div className="mb-6">
                <ShinyCard>
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Settings2 className="w-5 h-5 text-text-muted" />
                      <span className="text-base sm:text-lg font-semibold text-text-primary">Market Scenario</span>
                    </div>

                    {/* Scenario Presets - scrollable on very small screens */}
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                      {scenarios.map((scenario) => (
                        <button
                          key={scenario.id}
                          onClick={() => applyScenario(scenario)}
                          className={cn(
                            "px-2 sm:px-3 py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all border active:scale-95",
                            state.marketConditions.priceChange === scenario.priceChange
                              ? "bg-bg-secondary border-mint-glow text-text-primary shadow-[0px_1px_4px_0px_rgba(0,0,0,0.4)]"
                              : "bg-transparent border-[rgba(255,255,255,0.1)] text-text-muted hover:border-[rgba(255,255,255,0.2)] hover:text-text-secondary"
                          )}
                        >
                          {scenario.name}
                        </button>
                      ))}
                    </div>

                    {/* Sliders */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-text-muted">Price Change</span>
                          <span
                            className={cn(
                              "font-mono",
                              state.marketConditions.priceChange >= 0
                                ? "text-mint"
                                : "text-red-400"
                            )}
                          >
                            {formatPercent(state.marketConditions.priceChange, 0)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-99}
                          max={10000}
                          value={state.marketConditions.priceChange}
                          onChange={(e) => setPriceChange(Number(e.target.value))}
                          className="w-full accent-mint h-2"
                        />
                      </div>

                      <div>
                        <div className="text-sm text-text-muted mb-2">Volatility</div>
                        <div className="flex gap-1 bg-bg-secondary rounded-lg p-1">
                          {(["low", "medium", "high"] as const).map((v) => (
                            <button
                              key={v}
                              onClick={() => setVolatility(v)}
                              className={cn(
                                "flex-1 py-2 sm:py-1.5 rounded-md text-xs font-medium capitalize transition-all active:scale-95",
                                state.marketConditions.volatility === v
                                  ? "bg-bg-secondary border border-mint-glow text-text-primary shadow-[0px_1px_4px_0px_rgba(0,0,0,0.4)]"
                                  : "text-text-muted hover:text-text-secondary"
                              )}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Advanced Settings */}
                    <div className="border-t border-[rgba(255,255,255,0.05)] pt-4 mt-4">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                          className="flex items-center gap-2 text-left hover:bg-[rgba(255,255,255,0.05)] -mx-2 px-2 py-1 rounded transition-colors"
                        >
                          <Settings2 className="w-4 h-4 text-text-muted" />
                          <span className="text-sm font-medium text-text-secondary">
                            Advanced Settings
                          </span>
                          <ChevronDown
                            className={cn(
                              "w-4 h-4 text-text-muted transition-transform",
                              showAdvancedSettings && "rotate-180"
                            )}
                          />
                        </button>
                        {showAdvancedSettings && (
                          <button
                            onClick={() => {
                              setBorrowAPY(PROTOCOL_CONFIG.borrowAPY);
                              setSupplyAPY(PROTOCOL_CONFIG.supplyAPY);
                              setFcmMinHealth(PROTOCOL_CONFIG.minHealth);
                              setFcmTargetHealth(PROTOCOL_CONFIG.targetHealth);
                              setCollateralFactor(PROTOCOL_CONFIG.collateralFactor);
                              setBasePrice(livePrices[state.marketConditions.collateralToken]);
                            }}
                            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                          >
                            Reset All
                          </button>
                        )}
                      </div>

                      {showAdvancedSettings && (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                          {/* Token Starting Price */}
                          <div>
                            <label className="text-sm text-text-muted mb-2 block">
                              {getToken(state.marketConditions.collateralToken)?.symbol ?? "Token"} Starting Price
                            </label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                                <input
                                  type="number"
                                  value={state.marketConditions.basePrice ?? livePrices[state.marketConditions.collateralToken] ?? 100}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val) && val > 0) setBasePrice(val);
                                  }}
                                  className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg pl-7 pr-3 py-2 font-mono text-sm focus:border-mint/50 focus:outline-none"
                                  min={0.01}
                                  step="any"
                                />
                              </div>
                              <button
                                onClick={() => setBasePrice(livePrices[state.marketConditions.collateralToken])}
                                className="px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-xs text-text-muted hover:bg-[rgba(255,255,255,0.1)] hover:text-text-secondary transition-colors"
                              >
                                Reset
                              </button>
                            </div>
                          </div>

                          {/* Borrow APY */}
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-text-muted">
                                {getDebtToken(state.marketConditions.debtToken)?.symbol ?? "Debt"} Borrow APY
                              </span>
                              <span className="font-mono text-red-400">
                                {formatPercent(-(state.marketConditions.borrowAPY ?? PROTOCOL_CONFIG.borrowAPY) * 100, 1)}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={20}
                              step={0.5}
                              value={(state.marketConditions.borrowAPY ?? PROTOCOL_CONFIG.borrowAPY) * 100}
                              onChange={(e) => setBorrowAPY(Number(e.target.value) / 100)}
                              className="w-full accent-mint"
                            />
                          </div>

                          {/* Supply APY */}
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-text-muted">
                                {getToken(state.marketConditions.collateralToken)?.symbol ?? "Collateral"} Supply APY
                              </span>
                              <span className="font-mono text-mint">
                                {formatPercent((state.marketConditions.supplyAPY ?? PROTOCOL_CONFIG.supplyAPY) * 100, 1)}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={15}
                              step={0.5}
                              value={(state.marketConditions.supplyAPY ?? PROTOCOL_CONFIG.supplyAPY) * 100}
                              onChange={(e) => setSupplyAPY(Number(e.target.value) / 100)}
                              className="w-full accent-mint"
                            />
                          </div>

                          {/* FCM Min Health */}
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-text-muted">FCM Rebalance Trigger</span>
                              <span className="font-mono text-text-primary">
                                {(state.marketConditions.fcmMinHealth ?? PROTOCOL_CONFIG.minHealth).toFixed(2)}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={1.05}
                              max={1.5}
                              step={0.05}
                              value={state.marketConditions.fcmMinHealth ?? PROTOCOL_CONFIG.minHealth}
                              onChange={(e) => {
                                const newMin = Number(e.target.value);
                                const currentTarget = state.marketConditions.fcmTargetHealth ?? PROTOCOL_CONFIG.targetHealth;
                                setFcmMinHealth(newMin);
                                if (newMin >= currentTarget) {
                                  setFcmTargetHealth(newMin + 0.2);
                                }
                              }}
                              className="w-full accent-mint"
                            />
                          </div>

                          {/* FCM Target Health */}
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-text-muted">FCM Target Health</span>
                              <span className="font-mono text-text-primary">
                                {(state.marketConditions.fcmTargetHealth ?? PROTOCOL_CONFIG.targetHealth).toFixed(2)}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={(state.marketConditions.fcmMinHealth ?? PROTOCOL_CONFIG.minHealth) + 0.1}
                              max={2.0}
                              step={0.05}
                              value={state.marketConditions.fcmTargetHealth ?? PROTOCOL_CONFIG.targetHealth}
                              onChange={(e) => setFcmTargetHealth(Number(e.target.value))}
                              className="w-full accent-mint"
                            />
                          </div>

                          {/* LTV */}
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-text-muted">LTV (Loan-to-Value)</span>
                              <span className="font-mono text-text-primary">
                                {((state.marketConditions.collateralFactor ?? PROTOCOL_CONFIG.collateralFactor) * 100).toFixed(0)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={50}
                              max={90}
                              step={5}
                              value={(state.marketConditions.collateralFactor ?? PROTOCOL_CONFIG.collateralFactor) * 100}
                              onChange={(e) => setCollateralFactor(Number(e.target.value) / 100)}
                              className="w-full accent-mint"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </ShinyCard>
              </div>
            )}

            {/* Stats Bar - Historic mode only */}
            {state.marketConditions.dataMode === "historic" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-6">
              <StatCard
                label="Day"
                value={state.currentDay.toString()}
                subValue={`/ ${state.maxDay}`}
                icon={<Clock className="w-4 h-4 text-white/60" />}
              />
              <StatCard
                label={
                  state.marketConditions.dataMode === "simulated"
                    ? "Token Price"
                    : `${
                        tokens.find(
                          (t) => t.id === state.marketConditions.collateralToken
                        )?.symbol || "Token"
                      } Price`
                }
                value={formatCurrencyCompact(state.flowPrice)}
                subValue={
                  state.marketConditions.dataMode === "simulated"
                    ? `${formatPercent(
                        priceChangePercent
                      )} from ${formatCurrencyCompact(state.baseFlowPrice)}`
                    : formatPercent(priceChangePercent)
                }
                subValueColor={
                  priceChangePercent >= 0 ? "text-emerald-400" : "text-red-400"
                }
                icon={
                  priceChangePercent >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )
                }
              />
              <StatCard
                label="APY Rates"
                value={formatPercent(
                  (state.marketConditions.dataMode === "simulated" &&
                  state.marketConditions.supplyAPY !== undefined
                    ? state.marketConditions.supplyAPY
                    : getTokenSupplyAPY(
                        state.marketConditions.collateralToken
                      )) * 100,
                  1
                )}
                subValue={`${formatPercent(
                  -(state.marketConditions.dataMode === "simulated" &&
                  state.marketConditions.borrowAPY !== undefined
                    ? state.marketConditions.borrowAPY
                    : PROTOCOL_CONFIG.borrowAPY) * 100,
                  1
                )} borrow`}
                subValueColor="text-red-400"
                icon={<Zap className="w-4 h-4 text-white/60" />}
                tooltipContent={
                  state.marketConditions.dataMode === "historic" ? (
                    <div className="space-y-2">
                      <div>
                        <div className="font-semibold text-emerald-400">
                          Supply APY (by year)
                        </div>
                        <ul className="text-white/60 ml-1 text-[10px] space-y-0.5">
                          <li>2020: 2.5% • 2021: 4% (DeFi Summer)</li>
                          <li>2022: 3% • 2023: 4%</li>
                          <li>2024-25: 5% (bull market)</li>
                        </ul>
                      </div>
                      <div>
                        <div className="font-semibold text-red-400">
                          Borrow APY
                        </div>
                        <div className="text-white/60 text-[10px]">
                          6.5% average (Aave/Compound typical rate)
                        </div>
                      </div>
                      <div className="text-white/40 text-[10px] pt-1 border-t border-white/10">
                        Rates based on historical Aave/Compound data.{" "}
                        <a
                          href="https://aavescan.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          Aavescan
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-white/60">
                      Custom APY rates. Adjust in Advanced Settings below.
                    </div>
                  )
                }
              />
              <StatCard
                label="Liq. Price"
                value={
                  state.traditional.status === "liquidated"
                    ? "—"
                    : formatCurrencyCompact(
                        calculateLiquidationPrice(
                          state.traditional.collateralAmount,
                          state.traditional.debtAmount,
                          state.marketConditions.collateralFactor ??
                            getToken(state.marketConditions.collateralToken)
                              ?.collateralFactor ??
                            PROTOCOL_CONFIG.collateralFactor,
                          PROTOCOL_CONFIG.liquidationThreshold
                        )
                      )
                }
                subValue={
                  state.traditional.status === "liquidated"
                    ? "Liquidated"
                    : "Traditional"
                }
                icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
              />
              <StatCard
                label="FCM Actions"
                value={`${state.fcm.rebalanceCount}↓ ${
                  state.fcm.leverageUpCount ?? 0
                }↑`}
                subValue={
                  state.fcm.rebalanceCount > 0
                    ? "Protected"
                    : state.fcm.leverageUpCount
                    ? "Optimized"
                    : "Monitoring"
                }
                icon={<RefreshCw className="w-4 h-4 text-blue-400" />}
              />
            </div>
            )}

            {/* Show Details Toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full bg-gradient-to-r from-[#161a1e] to-[#161a1e] rounded-lg h-12 sm:h-[46px] mb-4 border border-mint-glow shadow-[0px_1px_4px_0px_rgba(0,0,0,0.4)] flex items-center justify-center gap-2 text-[rgba(255,255,255,0.6)] hover:text-white transition-all active:scale-[0.99]"
            >
              <span className="text-sm font-medium">
                {showDetails
                  ? "Hide Position Details"
                  : "Show Position Details"}
              </span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform",
                  showDetails && "scale-y-[-1]"
                )}
              />
            </button>

            {/* Main Grid - Collapsible Details */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
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
                      tokenSymbol={
                        tokens.find(
                          (t) => t.id === state.marketConditions.collateralToken
                        )?.symbol || "TOKEN"
                      }
                      debtSymbol={
                        debtTokens.find(
                          (t) => t.id === state.marketConditions.debtToken
                        )?.symbol || "USD"
                      }
                      minHealth={
                        state.marketConditions.fcmMinHealth ??
                        PROTOCOL_CONFIG.minHealth
                      }
                      targetHealth={
                        state.marketConditions.fcmTargetHealth ??
                        PROTOCOL_CONFIG.targetHealth
                      }
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
                      leverageUps={state.fcm.leverageUpCount}
                      tokenSymbol={
                        tokens.find(
                          (t) => t.id === state.marketConditions.collateralToken
                        )?.symbol || "TOKEN"
                      }
                      debtSymbol={
                        debtTokens.find(
                          (t) => t.id === state.marketConditions.debtToken
                        )?.symbol || "USD"
                      }
                      minHealth={
                        state.marketConditions.fcmMinHealth ??
                        PROTOCOL_CONFIG.minHealth
                      }
                      targetHealth={
                        state.marketConditions.fcmTargetHealth ??
                        PROTOCOL_CONFIG.targetHealth
                      }
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Comparison Summary - Shows at end of simulation when traditional was liquidated */}
            {state.currentDay === state.maxDay &&
              state.traditional.status === "liquidated" && (
                <ComparisonSummary
                  traditionalReturns={state.traditional.totalReturns}
                  fcmReturns={state.fcm.totalReturns}
                  difference={
                    state.fcm.totalReturns - state.traditional.totalReturns
                  }
                  rebalanceCount={state.fcm.rebalanceCount}
                  isVisible={
                    state.currentDay === state.maxDay &&
                    state.traditional.status === "liquidated"
                  }
                />
              )}

            {/* Transaction Log */}
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-white/60" />
                <span className="font-medium">Transaction Log</span>
                <span className="text-white/40 text-sm ml-auto">
                  Under the Hood
                </span>
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
        </>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center text-sm text-white/40">
          <p>Educational simulation of Flow Credit Market</p>
          <p className="mt-2 text-white/30 text-xs max-w-lg mx-auto">
            Simplified simulation for educational purposes. Assumes perfect
            rebalancing execution (no slippage or MEV), synthetic price
            patterns, and no protocol fees.
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
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
  );
}

// ============ Components ============

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  subValueColor?: string;
  icon?: React.ReactNode;
  tooltipContent?: React.ReactNode;
}

function StatCard({
  label,
  value,
  subValue,
  subValueColor,
  icon,
  tooltipContent,
}: StatCardProps) {
  const cardContent = (
    <ShinyCard className="h-full" innerClassName="p-[13px] min-h-[96px] flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#6d7881]">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[22px] font-bold font-mono text-[#f3f6f8]">{value}</span>
        {subValue && (
          <span className={cn("text-xs", subValueColor || "text-[#6d7881]")}>
            {subValue}
          </span>
        )}
      </div>
    </ShinyCard>
  );

  if (tooltipContent) {
    return (
      <Tooltip
        content={<div className="text-xs max-w-xs">{tooltipContent}</div>}
        position="bottom"
      >
        {cardContent}
      </Tooltip>
    );
  }

  return cardContent;
}

interface PositionPanelProps {
  title: string;
  subtitle: string;
  type: "traditional" | "fcm";
  healthFactor: number;
  collateral: number;
  collateralAmount: number;
  debt: number;
  returns: number;
  status: "healthy" | "warning" | "liquidated";
  interestPaid: number;
  earnedYield?: number;
  rebalances?: number;
  leverageUps?: number;
  tokenSymbol: string;
  debtSymbol: string;
  minHealth: number;
  targetHealth: number;
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
  leverageUps,
  tokenSymbol,
  debtSymbol,
  minHealth,
  targetHealth,
}: PositionPanelProps) {
  const isFCM = type === "fcm";
  const isLiquidated = status === "liquidated";

  // Health colors based on thresholds
  const getHealthColor = () => {
    if (isLiquidated || healthFactor < minHealth) return "text-red-400";
    if (healthFactor < targetHealth) return "text-amber-400";
    return "text-emerald-400";
  };

  const getHealthBg = () => {
    if (isLiquidated || healthFactor < minHealth) return "bg-red-500/10";
    if (healthFactor < targetHealth) return "bg-amber-500/10";
    return "bg-emerald-500/10";
  };

  const StatusIcon = isLiquidated
    ? Skull
    : healthFactor >= targetHealth
    ? CheckCircle2
    : AlertCircle;

  return (
    <div
      className={cn(
        "rounded-xl p-4 transition-all bg-white/5 border border-white/10",
        // FCM gets subtle emerald left border accent
        isFCM && "border-l-2 border-l-emerald-500/40",
        isLiquidated && !isFCM && "animate-pulse"
      )}
    >
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
        <div
          className={cn(
            "px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1",
            isLiquidated
              ? "bg-red-500/20 text-red-400"
              : status === "warning"
              ? "bg-amber-500/20 text-amber-400"
              : "bg-emerald-500/20 text-emerald-400"
          )}
        >
          <StatusIcon className="w-3 h-3" />
          {isLiquidated
            ? "Liquidated"
            : status === "warning"
            ? "At Risk"
            : "Healthy"}
        </div>
      </div>

      {/* Health Factor */}
      <div className={cn("rounded-lg p-3 mb-4", getHealthBg())}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/60">Health Factor</span>
          <span
            className={cn("text-2xl font-bold font-mono", getHealthColor())}
          >
            {isLiquidated ? "0.00" : healthFactor.toFixed(2)}
          </span>
        </div>
        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isLiquidated || healthFactor < minHealth
                ? "bg-red-500"
                : healthFactor < targetHealth
                ? "bg-amber-500"
                : "bg-emerald-500"
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
          subValue={`${debt.toLocaleString("en-US", {
            maximumFractionDigits: 0,
          })} ${debtSymbol}`}
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
            valueColor={
              earnedYield - interestPaid >= 0
                ? "text-emerald-400"
                : "text-amber-400"
            }
          />
        )}
        <div className="border-t border-white/10 pt-2 mt-2">
          <MetricRow
            label="Net P&L"
            value={formatCurrencyCompact(returns)}
            valueColor={returns >= 0 ? "text-emerald-400" : "text-red-400"}
            icon={
              returns >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )
            }
          />
        </div>
        {isFCM &&
          ((rebalances !== undefined && rebalances > 0) ||
            (leverageUps !== undefined && leverageUps > 0)) && (
            <div className="space-y-1 mt-2">
              {rebalances !== undefined && rebalances > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-400">
                  <RefreshCw className="w-3 h-3" />
                  <span>
                    {rebalances} protective rebalance{rebalances > 1 ? "s" : ""}{" "}
                    (↓ debt)
                  </span>
                </div>
              )}
              {leverageUps !== undefined && leverageUps > 0 && (
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <TrendingUp className="w-3 h-3" />
                  <span>
                    {leverageUps} leverage up{leverageUps > 1 ? "s" : ""} (↑
                    borrowed)
                  </span>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}

interface MetricRowProps {
  label: string;
  value: string;
  subValue?: string;
  valueColor?: string;
  icon?: React.ReactNode;
}

function MetricRow({
  label,
  value,
  subValue,
  valueColor,
  icon,
}: MetricRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/50">{label}</span>
      <div className="flex flex-col items-end">
        <div
          className={cn(
            "flex items-center gap-1 font-mono text-sm",
            valueColor || "text-white"
          )}
        >
          {icon}
          {value}
        </div>
        {subValue && (
          <span className="text-xs text-white/40 font-mono">{subValue}</span>
        )}
      </div>
    </div>
  );
}

interface EventRowProps {
  event: SimulationEvent;
}

const DOCS_LINKS = {
  scheduledTxn:
    "https://developers.flow.com/blockchain-development-tutorials/forte/scheduled-transactions/scheduled-transactions-introduction",
  defiActions:
    "https://developers.flow.com/blockchain-development-tutorials/forte/flow-actions",
};

function EventRow({ event }: EventRowProps) {
  const getIcon = () => {
    switch (event.type) {
      case "create":
        return <Wallet className="w-4 h-4" />;
      case "borrow":
        return <ArrowDownRight className="w-4 h-4" />;
      case "rebalance":
        return <RefreshCw className="w-4 h-4 text-amber-400" />;
      case "leverage_up":
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case "liquidation":
        return <Skull className="w-4 h-4 text-red-400" />;
      case "interest":
        return <Clock className="w-4 h-4 text-slate-400" />;
      case "yield_earned":
        return <TrendingUp className="w-4 h-4 text-cyan-400" />;
      case "yield_applied":
        return <Shield className="w-4 h-4 text-emerald-400" />;
      case "scheduled":
        return <Timer className="w-4 h-4 text-amber-400" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getPositionColor = () => {
    if (event.position === "fcm") return "text-emerald-400";
    if (event.position === "traditional") return "text-red-400";
    return "text-blue-400";
  };

  // Render action text with hyperlinks for scheduled transactions
  const renderAction = () => {
    if (event.type === "scheduled") {
      return (
        <a
          href={DOCS_LINKS.scheduledTxn}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-amber-400 hover:text-amber-300 underline decoration-amber-400/40 hover:decoration-amber-300"
        >
          {event.action}
        </a>
      );
    }
    if (event.type === "leverage_up") {
      return (
        <span className="text-sm text-emerald-400 font-medium">
          {event.action}
        </span>
      );
    }
    if (event.type === "rebalance") {
      return (
        <span className="text-sm text-amber-400 font-medium">
          {event.action}
        </span>
      );
    }
    if (event.type === "interest") {
      return <span className="text-sm text-slate-400">{event.action}</span>;
    }
    if (event.type === "yield_earned") {
      return (
        <span className="text-sm text-cyan-400 font-medium">
          {event.action}
        </span>
      );
    }
    if (event.type === "yield_applied") {
      return (
        <span className="text-sm text-emerald-400 font-medium">
          {event.action}
        </span>
      );
    }
    return <span className="text-sm text-white/60">{event.action}</span>;
  };

  // Render code with hyperlinks for DeFi actions (TopUpSource, Sink, etc.)
  const renderCode = () => {
    const code = event.code;
    // Check if this event uses DeFi actions (TopUpSource, Sink, DrawDownSink)
    if (
      code.includes("TopUpSource") ||
      code.includes("Sink") ||
      code.includes("DrawDownSink")
    ) {
      return (
        <a
          href={DOCS_LINKS.defiActions}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 font-mono mt-1 block truncate underline decoration-blue-400/40 hover:decoration-blue-300"
        >
          {code}
        </a>
      );
    }
    // Check if this is a scheduled transaction
    if (code.includes("ScheduledTxn")) {
      return (
        <a
          href={DOCS_LINKS.scheduledTxn}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-amber-400 hover:text-amber-300 font-mono mt-1 block truncate underline decoration-amber-400/40 hover:decoration-amber-300"
        >
          {code}
        </a>
      );
    }
    return (
      <code className="text-xs text-blue-400/60 font-mono mt-1 block truncate">
        {code}
      </code>
    );
  };

  return (
    <div className="px-4 py-3 hover:bg-white/5 transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-white/40">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-white/40">Day {event.day}</span>
            <span
              className={cn(
                "text-xs font-medium uppercase",
                getPositionColor()
              )}
            >
              {event.position === "both"
                ? "Both"
                : event.position.toUpperCase()}
            </span>
            {event.healthBefore !== undefined &&
              event.healthAfter !== undefined && (
                <span className="text-xs text-white/40">
                  HF: {event.healthBefore.toFixed(2)} →{" "}
                  {event.healthAfter.toFixed(2)}
                </span>
              )}
          </div>
          {renderAction()}
          {renderCode()}
        </div>
      </div>
    </div>
  );
}
