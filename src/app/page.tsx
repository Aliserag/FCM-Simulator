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
import { ComparisonSummary } from "@/components/ComparisonSummary";
import { RebalanceToast } from "@/components/RebalanceToast";
import { useCoinGeckoPrices } from "@/hooks/useCoinGeckoPrices";
import SimulationChart from "@/components/SimulationChart";

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

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0b0d]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center">
          <span className="font-semibold">FCM Simulator</span>
          <span className="text-xs text-white/40 ml-2 hidden sm:inline">
            Flow Credit Market
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-b from-blue-500/5 via-blue-500/5 to-transparent rounded-2xl p-8 mb-8 text-center border border-white/5">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Sleep through the next Crash. Wake up wealthy.
          </h1>
          <p className="text-white/60 text-lg mb-2 max-w-xl mx-auto">
            Watch how Traditional DeFi compares to Flow Credit Market
          </p>

          {/* Show Start Simulation button for Simulated mode before starting */}
          {state.marketConditions.dataMode === "simulated" && !showResults && (
            <button
              onClick={handleStartSimulation}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-xl font-semibold text-lg transition-all mt-4 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 animate-pulse-attention"
            >
              <Play className="w-6 h-6" />
              Start Simulation
            </button>
          )}

          {/* Show Try Again button when simulated mode simulation is complete */}
          {state.marketConditions.dataMode === "simulated" &&
            showResults &&
            state.currentDay === state.maxDay && (
              <button
                onClick={() => {
                  setHasStarted(false);
                  reset();
                }}
                className="inline-flex items-center gap-3 px-6 py-3 rounded-xl font-semibold text-lg transition-all mt-4 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 animate-pulse-attention"
              >
                <RotateCcw className="w-6 h-6" />
                Try Again
              </button>
            )}

          {/* Show play/pause button for Historic mode, or Simulated mode in progress */}
          {(state.marketConditions.dataMode === "historic" ||
            (showResults && state.currentDay < state.maxDay)) && (
            <button
              onClick={isPlaying ? pause : play}
              className={cn(
                "inline-flex items-center gap-3 px-6 py-3 rounded-xl font-semibold text-lg transition-all mt-4",
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
                  {showResults ? "Resume Simulation" : "Start Simulation"}
                </>
              )}
            </button>
          )}
        </div>

        {/* Data Mode Toggle */}
        <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Data Mode:</span>
            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
              <Tooltip
                position="bottom"
                className="!whitespace-normal w-72 text-left"
                content={
                  <div className="space-y-2">
                    <p className="font-semibold text-white">
                      Real Daily Price Data (2020-2025)
                    </p>
                    <p className="text-xs text-white/80 leading-relaxed">
                      2,169 actual daily closing prices per token, including
                      COVID crash (Mar 2020), LUNA collapse (May 2022), and FTX
                      crash (Nov 2022).
                    </p>
                    <p className="text-xs text-white/60">
                      Source: Coinbase via CCXT library
                    </p>
                  </div>
                }
              >
                <button
                  onClick={() => {
                    setDataMode("historic");
                    setHasStarted(false);
                  }}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-all",
                    state.marketConditions.dataMode === "historic"
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  Historic Data
                </button>
              </Tooltip>
              <Tooltip
                position="bottom"
                className="!whitespace-normal w-72 text-left"
                content={
                  <div className="space-y-2">
                    <p className="font-semibold text-white">
                      Simulated Price Patterns
                    </p>
                    <p className="text-xs text-white/80 leading-relaxed">
                      Synthetic price movements based on your settings. Adjust
                      price change and volatility to model different market
                      conditions.
                    </p>
                    <p className="text-xs text-white/60">
                      Uses realistic price patterns with configurable
                      volatility.
                    </p>
                  </div>
                }
              >
                <button
                  onClick={() => {
                    setDataMode("simulated");
                    setHasStarted(false);
                  }}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-all",
                    state.marketConditions.dataMode === "simulated"
                      ? "bg-purple-500/20 text-purple-400"
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  Simulated
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Historic Mode: Token, Year Selection, and Compounding */}
        {state.marketConditions.dataMode === "historic" && (
          <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10 space-y-4">
            {/* Token Selector */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/60">Collateral:</span>
              <div className="flex gap-1">
                {getHistoricTokens().map((token) => (
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
                      borderColor:
                        state.marketConditions.collateralToken === token.id
                          ? token.color
                          : undefined,
                    }}
                  >
                    {token.symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Year Selection and Compounding */}
            <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-white/10">
              {/* Year Range Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/60">From:</span>
                <select
                  value={state.marketConditions.startYear ?? 2020}
                  onChange={(e) => setStartYear(Number(e.target.value))}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-cyan-400/50"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year} className="bg-slate-800">
                      {year}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-white/60">To:</span>
                <select
                  value={state.marketConditions.endYear ?? 2020}
                  onChange={(e) => setEndYear(Number(e.target.value))}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-cyan-400/50"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year} className="bg-slate-800">
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration indicator */}
              <span className="text-xs text-white/40 ml-auto">
                {state.totalDays} days • ~1 min simulation
              </span>
            </div>
          </div>
        )}

        {/* Simulated Mode: Full Configuration Section */}
        {state.marketConditions.dataMode === "simulated" && !showResults && (
          <div className="space-y-4 mb-6">
            {/* Position Setup */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-white/60" />
                Configure Your Position
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Collateral Selection */}
                <div>
                  <label className="text-sm text-white/60 block mb-2">
                    Collateral Asset
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {getSimulatedTokens().map((token) => {
                      const isSelected =
                        state.marketConditions.collateralToken === token.id;
                      const price = livePrices[token.id];
                      return (
                        <Tooltip
                          key={token.id}
                          position="bottom"
                          content={
                            <div className="text-xs min-w-[140px]">
                              <div className="font-semibold text-sm mb-2">
                                {token.name}
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex justify-between">
                                  <span className="text-white/50">Price</span>
                                  <span className="font-mono">
                                    $
                                    {price?.toLocaleString(undefined, {
                                      maximumFractionDigits: price < 1 ? 4 : 2,
                                    }) ?? "—"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-white/50">Max LTV</span>
                                  <span className="font-mono">
                                    {(token.collateralFactor * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-white/50">
                                    Supply APY
                                  </span>
                                  <span className="font-mono text-emerald-400">
                                    +{(token.supplyAPY * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          }
                        >
                          <button
                            onClick={() => {
                              setCollateralToken(token.id, price);
                              setBasePrice(price);
                            }}
                            className={cn(
                              "flex flex-col items-center px-2 py-1.5 rounded-lg text-sm font-medium transition-all border min-w-[60px]",
                              isSelected
                                ? "border-white/30 bg-white/10"
                                : "border-transparent hover:bg-white/5"
                            )}
                            style={{
                              borderColor: isSelected ? token.color : undefined,
                            }}
                          >
                            <span
                              style={{
                                color: isSelected
                                  ? token.color
                                  : "rgba(255,255,255,0.7)",
                              }}
                            >
                              {token.symbol}
                            </span>
                            <span className="text-[10px] text-white/40 font-mono">
                              {pricesLoading
                                ? "..."
                                : `$${
                                    price?.toLocaleString(undefined, {
                                      maximumFractionDigits: price < 1 ? 2 : 0,
                                    }) ?? "?"
                                  }`}
                            </span>
                          </button>
                        </Tooltip>
                      );
                    })}
                    <button
                      onClick={fetchPrices}
                      disabled={pricesLoading}
                      className="ml-1 px-2 py-1 text-[10px] text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                      title="Refresh prices from CoinGecko"
                    >
                      {pricesLoading ? "..." : "↻"}
                    </button>
                    {usingFallback && (
                      <span
                        className="ml-2 text-[10px] text-amber-400"
                        title="Using cached prices - CoinGecko unavailable"
                      >
                        ⚠ Cached
                      </span>
                    )}
                  </div>
                </div>

                {/* Deposit Amount */}
                <div>
                  <label className="text-sm text-white/60 block mb-2">
                    Deposit Amount (USD)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {depositPresets.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setInitialDeposit(amount)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                          state.initialDeposit === amount
                            ? "border-blue-500/50 bg-blue-500/20 text-blue-400"
                            : "border-white/10 text-white/60 hover:border-white/20 hover:text-white"
                        )}
                      >
                        ${amount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Debt Token Selection */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <label className="text-sm text-white/60 block mb-2">
                  Borrow Against (Debt Token)
                </label>
                <div className="flex flex-wrap gap-2">
                  {debtTokens.map((token) => {
                    const isSelected =
                      state.marketConditions.debtToken === token.id;
                    return (
                      <button
                        key={token.id}
                        onClick={() => setDebtToken(token.id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                          isSelected
                            ? "border-white/30 bg-white/10"
                            : "border-white/10 hover:border-white/20"
                        )}
                        style={{
                          borderColor: isSelected ? token.color : undefined,
                        }}
                      >
                        <span
                          style={{
                            color: isSelected
                              ? token.color
                              : "rgba(255,255,255,0.7)",
                          }}
                        >
                          {token.symbol}
                        </span>
                        <span className="text-xs text-white/40">
                          {(token.borrowRate * 100).toFixed(1)}% APY
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Position Summary */}
              <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="text-sm text-white/60 mb-2">
                  Position Summary
                </div>
                <div className="text-white">
                  You will deposit{" "}
                  <span className="font-semibold text-blue-400">
                    ${state.initialDeposit.toLocaleString()}
                  </span>{" "}
                  worth of{" "}
                  <span
                    className="font-semibold"
                    style={{
                      color: getToken(state.marketConditions.collateralToken)
                        ?.color,
                    }}
                  >
                    {getToken(state.marketConditions.collateralToken)?.symbol}
                  </span>{" "}
                  and borrow{" "}
                  <span className="font-semibold text-emerald-400">
                    $
                    {Math.floor(
                      (state.initialDeposit *
                        (state.marketConditions.collateralFactor ??
                          getToken(state.marketConditions.collateralToken)
                            ?.collateralFactor ??
                          0.8)) /
                        (state.marketConditions.fcmTargetHealth ??
                          PROTOCOL_CONFIG.targetHealth)
                    ).toLocaleString()}
                  </span>{" "}
                  <span
                    style={{
                      color: getDebtToken(state.marketConditions.debtToken)
                        ?.color,
                    }}
                  >
                    {getDebtToken(state.marketConditions.debtToken)?.symbol}
                  </span>{" "}
                  at{" "}
                  <span className="text-white/60">
                    {(
                      (state.marketConditions.collateralFactor ??
                        getToken(state.marketConditions.collateralToken)
                          ?.collateralFactor ??
                        0.8) * 100
                    ).toFixed(0)}
                    % LTV
                  </span>
                </div>
                <div className="text-xs text-white/40 mt-1">
                  Borrow reduced by Target Health (
                  {(
                    state.marketConditions.fcmTargetHealth ??
                    PROTOCOL_CONFIG.targetHealth
                  ).toFixed(1)}
                  ×) for safety margin
                </div>
              </div>
            </div>

            {/* Market Scenario */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="w-5 h-5 text-white/60" />
                <span className="text-lg font-semibold">Market Scenario</span>
              </div>

              {/* Scenario Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                {scenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => applyScenario(scenario)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-all border",
                      state.marketConditions.priceChange ===
                        scenario.priceChange
                        ? "bg-white/10 border-white/20 text-white"
                        : "bg-transparent border-white/10 text-white/60 hover:border-white/20 hover:text-white"
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
                    <span className="text-white/60">Price Change</span>
                    <span
                      className={cn(
                        "font-mono",
                        state.marketConditions.priceChange >= 0
                          ? "text-emerald-400"
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
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="text-sm text-white/60 mb-2">Volatility</div>
                  <div className="flex gap-1">
                    {(["low", "medium", "high"] as const).map((v) => (
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
              </div>

              {/* Advanced Settings */}
              <div className="border-t border-white/10 pt-4 mt-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() =>
                      setShowAdvancedSettings(!showAdvancedSettings)
                    }
                    className="flex items-center gap-2 text-left hover:bg-white/5 -mx-2 px-2 py-1 rounded transition-colors"
                  >
                    <Settings2 className="w-4 h-4 text-white/60" />
                    <span className="text-sm font-medium text-white/80">
                      Advanced Settings
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-white/40 transition-transform",
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
                        setBasePrice(
                          livePrices[state.marketConditions.collateralToken]
                        );
                      }}
                      className="text-xs text-white/40 hover:text-white/60 transition-colors"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {showAdvancedSettings && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {/* Token Starting Price */}
                    <div>
                      <label className="text-sm text-white/60 mb-2 block">
                        {getToken(state.marketConditions.collateralToken)
                          ?.symbol ?? "Token"}{" "}
                        Starting Price
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                            $
                          </span>
                          <input
                            type="number"
                            value={
                              state.marketConditions.basePrice ??
                              livePrices[
                                state.marketConditions.collateralToken
                              ] ??
                              100
                            }
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val > 0) setBasePrice(val);
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-2 font-mono text-sm focus:border-white/30 focus:outline-none"
                            min={0.01}
                            step="any"
                          />
                        </div>
                        <button
                          onClick={() =>
                            setBasePrice(
                              livePrices[state.marketConditions.collateralToken]
                            )
                          }
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white/60 hover:bg-white/10 hover:text-white/80 transition-colors"
                          title="Reset to live CoinGecko price"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* Borrow APY */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/60">
                          {getDebtToken(state.marketConditions.debtToken)
                            ?.symbol ?? "Debt"}{" "}
                          Borrow APY
                        </span>
                        <span className="font-mono text-red-400">
                          {formatPercent(
                            -(
                              state.marketConditions.borrowAPY ??
                              PROTOCOL_CONFIG.borrowAPY
                            ) * 100,
                            1
                          )}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={20}
                        step={0.5}
                        value={
                          (state.marketConditions.borrowAPY ??
                            PROTOCOL_CONFIG.borrowAPY) * 100
                        }
                        onChange={(e) =>
                          setBorrowAPY(Number(e.target.value) / 100)
                        }
                        className="w-full"
                      />
                    </div>

                    {/* Supply APY */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/60">
                          {getToken(state.marketConditions.collateralToken)
                            ?.symbol ?? "Collateral"}{" "}
                          Supply APY
                        </span>
                        <span className="font-mono text-emerald-400">
                          {formatPercent(
                            (state.marketConditions.supplyAPY ??
                              PROTOCOL_CONFIG.supplyAPY) * 100,
                            1
                          )}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={15}
                        step={0.5}
                        value={
                          (state.marketConditions.supplyAPY ??
                            PROTOCOL_CONFIG.supplyAPY) * 100
                        }
                        onChange={(e) =>
                          setSupplyAPY(Number(e.target.value) / 100)
                        }
                        className="w-full"
                      />
                      {(state.marketConditions.supplyAPY ??
                        PROTOCOL_CONFIG.supplyAPY) >
                        (state.marketConditions.borrowAPY ??
                          PROTOCOL_CONFIG.borrowAPY) && (
                        <p className="text-[10px] text-amber-400 mt-1">
                          ⚠ Supply APY &gt; Borrow APY creates unrealistic
                          arbitrage
                        </p>
                      )}
                    </div>

                    {/* FCM Min Health */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/60">
                          FCM Rebalance Trigger
                        </span>
                        <span className="font-mono">
                          {(
                            state.marketConditions.fcmMinHealth ??
                            PROTOCOL_CONFIG.minHealth
                          ).toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1.05}
                        max={1.5}
                        step={0.05}
                        value={
                          state.marketConditions.fcmMinHealth ??
                          PROTOCOL_CONFIG.minHealth
                        }
                        onChange={(e) => {
                          const newMin = Number(e.target.value);
                          const currentTarget =
                            state.marketConditions.fcmTargetHealth ??
                            PROTOCOL_CONFIG.targetHealth;
                          setFcmMinHealth(newMin);
                          if (newMin >= currentTarget) {
                            setFcmTargetHealth(newMin + 0.2);
                          }
                        }}
                        className="w-full"
                      />
                    </div>

                    {/* FCM Target Health */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/60">FCM Target Health</span>
                        <span className="font-mono">
                          {(
                            state.marketConditions.fcmTargetHealth ??
                            PROTOCOL_CONFIG.targetHealth
                          ).toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={
                          (state.marketConditions.fcmMinHealth ??
                            PROTOCOL_CONFIG.minHealth) + 0.1
                        }
                        max={2.0}
                        step={0.05}
                        value={
                          state.marketConditions.fcmTargetHealth ??
                          PROTOCOL_CONFIG.targetHealth
                        }
                        onChange={(e) =>
                          setFcmTargetHealth(Number(e.target.value))
                        }
                        className="w-full"
                      />
                    </div>

                    {/* LTV (Collateral Factor) */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/60">
                          LTV (Loan-to-Value)
                        </span>
                        <span className="font-mono">
                          {(
                            (state.marketConditions.collateralFactor ??
                              PROTOCOL_CONFIG.collateralFactor) * 100
                          ).toFixed(0)}
                          %
                        </span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={90}
                        step={5}
                        value={
                          (state.marketConditions.collateralFactor ??
                            PROTOCOL_CONFIG.collateralFactor) * 100
                        }
                        onChange={(e) =>
                          setCollateralFactor(Number(e.target.value) / 100)
                        }
                        className="w-full"
                      />
                      <p className="text-[10px] text-white/40 mt-1">
                        Higher LTV = more borrowing power, higher liquidation
                        risk
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Simulated Mode: Token selector when simulation is running */}
        {state.marketConditions.dataMode === "simulated" && showResults && (
          <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/60">Position:</span>
                <span
                  className="font-semibold"
                  style={{
                    color: getToken(state.marketConditions.collateralToken)
                      ?.color,
                  }}
                >
                  ${state.initialDeposit.toLocaleString()}{" "}
                  {getToken(state.marketConditions.collateralToken)?.symbol}
                </span>
                <span className="text-white/40">→</span>
                <span
                  style={{
                    color: getDebtToken(state.marketConditions.debtToken)
                      ?.color,
                  }}
                >
                  {getDebtToken(state.marketConditions.debtToken)?.symbol}
                </span>
              </div>
              <button
                onClick={() => {
                  setHasStarted(false);
                  reset();
                }}
                className="text-sm text-white/40 hover:text-white/60 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-4 h-4" />
                Reconfigure
              </button>
            </div>
          </div>
        )}

        {/* Results Section - show for Historic always, Simulated only when started */}
        {(state.marketConditions.dataMode === "historic" || showResults) && (
          <>
            {/* Stats Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
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
                    ? `${formatPercent(priceChangePercent)} from $${
                        state.marketConditions.basePrice ??
                        PROTOCOL_CONFIG.baseFlowPrice
                      }`
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
                        state.traditional.debtAmount /
                          (state.traditional.collateralAmount *
                            (state.marketConditions.collateralFactor ??
                              getToken(state.marketConditions.collateralToken)
                                ?.collateralFactor ??
                              PROTOCOL_CONFIG.collateralFactor))
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
                value={`${state.fcm.rebalanceCount}↓ ${state.fcm.leverageUpCount ?? 0}↑`}
                subValue={state.fcm.rebalanceCount > 0 ? "Protected" : state.fcm.leverageUpCount ? "Optimized" : "Monitoring"}
                icon={<RefreshCw className="w-4 h-4 text-blue-400" />}
              />
            </div>

            {/* Simulation Chart */}
            {state.chartData.length > 0 && (
              <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Position Equity Over Time</h3>
                    <p className="text-xs text-white/40">Net position value (collateral − debt)</p>
                  </div>
                  <div className="text-sm text-white/60">
                    Day {state.currentDay} / {state.maxDay}
                  </div>
                </div>
                <SimulationChart
                  data={state.chartData}
                  currentDay={state.currentDay}
                  totalDays={state.totalDays}
                  startYear={state.marketConditions.startYear ?? 2020}
                  endYear={state.marketConditions.endYear ?? 2020}
                />
              </div>
            )}

            {/* Show Details Toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full bg-white/5 rounded-xl p-3 mb-4 border border-white/10 flex items-center justify-center gap-2 text-white/60 hover:bg-white/10 hover:text-white transition-all"
            >
              <span className="text-sm font-medium">
                {showDetails ? "Hide Position Details" : "Show Position Details"}
              </span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform",
                  showDetails && "rotate-180"
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

            {/* Timeline Control */}
            <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={isPlaying ? pause : play}
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                      isPlaying
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-blue-500/20 text-blue-400"
                    )}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
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
                    { label: "1x", value: 40 },
                    { label: "2x", value: 80 },
                    { label: "3x", value: 120 },
                    { label: "4x", value: 160 },
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
                    background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${
                      (state.currentDay / state.maxDay) * 100
                    }%, rgba(255,255,255,0.1) ${
                      (state.currentDay / state.maxDay) * 100
                    }%)`,
                  }}
                />
              </div>

              <div className="flex justify-between text-xs text-white/40">
                <span>Day 0</span>
                <span className="text-white font-medium">
                  Day {state.currentDay}
                </span>
                <span>Day {state.maxDay}</span>
              </div>
            </div>

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
        )}

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
    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-white/50">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-semibold font-mono">{value}</span>
        {subValue && (
          <span className={cn("text-xs", subValueColor || "text-white/40")}>
            {subValue}
          </span>
        )}
      </div>
    </div>
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
        {isFCM && (rebalances !== undefined && rebalances > 0 || leverageUps !== undefined && leverageUps > 0) && (
          <div className="space-y-1 mt-2">
            {rebalances !== undefined && rebalances > 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <RefreshCw className="w-3 h-3" />
                <span>
                  {rebalances} protective rebalance{rebalances > 1 ? "s" : ""} (↓ debt)
                </span>
              </div>
            )}
            {leverageUps !== undefined && leverageUps > 0 && (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <TrendingUp className="w-3 h-3" />
                <span>
                  {leverageUps} leverage up{leverageUps > 1 ? "s" : ""} (↑ borrowed)
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
      return (
        <span className="text-sm text-slate-400">
          {event.action}
        </span>
      );
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
