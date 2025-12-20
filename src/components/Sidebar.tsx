"use client";

import { Play, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";

interface SidebarProps {
  // Data Mode
  dataMode: "historic" | "simulated";
  onDataModeChange: (mode: "historic" | "simulated") => void;

  // Collateral
  collateralToken: string;
  onCollateralChange: (token: string) => void;
  availableTokens: Array<{ id: string; symbol: string; color: string }>;

  // Time Window (Historic mode)
  startYear: number;
  endYear: number;
  onStartYearChange: (year: number) => void;
  onEndYearChange: (year: number) => void;
  availableYears: number[];
  totalDays: number;

  // Position info
  initialDeposit?: number;
  debtSymbol?: string;

  // Start simulation
  onStartSimulation?: () => void;
  isSimulationStarted?: boolean;
}

// Shiny card wrapper component with 3D effect
function ShinyCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "relative rounded-xl overflow-hidden",
      className
    )}>
      {/* Outer glow/border effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-[rgba(255,255,255,0.08)] via-[rgba(255,255,255,0.02)] to-transparent" />

      {/* Main card background */}
      <div className="relative m-[1px] rounded-[11px] bg-gradient-to-b from-[#161a1e] to-[#111417] shadow-[0px_4px_16px_0px_rgba(0,0,0,0.3)]">
        {/* Top highlight shine */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.1)] to-transparent" />

        {/* Inner subtle gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-black/[0.05] pointer-events-none rounded-[11px]" />

        <div className="relative">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Sidebar({
  dataMode,
  onDataModeChange,
  collateralToken,
  onCollateralChange,
  availableTokens,
  startYear,
  endYear,
  onStartYearChange,
  onEndYearChange,
  availableYears,
  totalDays,
  initialDeposit = 1000,
  debtSymbol = "USDC",
  onStartSimulation,
  isSimulationStarted = false,
}: SidebarProps) {
  const currentToken = availableTokens.find(t => t.id === collateralToken);

  // Mobile horizontal layout
  const mobileContent = (
    <div className="lg:hidden mb-4">
      <ShinyCard>
        <div className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Data Mode */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-text-muted">Mode</span>
              <div className="flex gap-1 bg-bg-secondary rounded-lg p-1">
                <button
                  onClick={() => onDataModeChange("historic")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    dataMode === "historic"
                      ? "bg-bg-secondary border border-mint-glow text-text-primary shadow-[0px_1px_4px_0px_rgba(0,0,0,0.4)]"
                      : "text-text-muted hover:text-text-secondary"
                  )}
                >
                  Historic
                </button>
                <button
                  onClick={() => onDataModeChange("simulated")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    dataMode === "simulated"
                      ? "bg-bg-secondary border border-mint-glow text-text-primary shadow-[0px_1px_4px_0px_rgba(0,0,0,0.4)]"
                      : "text-text-muted hover:text-text-secondary"
                  )}
                >
                  Simulated
                </button>
              </div>
            </div>

            {/* Collateral */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-text-muted">Collateral</span>
              <div className="flex gap-1 bg-bg-secondary rounded-lg p-1">
                {availableTokens.map((token) => (
                  <button
                    key={token.id}
                    onClick={() => onCollateralChange(token.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      collateralToken === token.id
                        ? "bg-bg-secondary border border-mint-glow text-text-primary shadow-[0px_1px_4px_0px_rgba(0,0,0,0.4)]"
                        : "text-text-muted hover:text-text-secondary"
                    )}
                  >
                    {token.symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Window (Historic mode only) */}
            {dataMode === "historic" && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-text-muted">Time Window</span>
                <div className="flex items-center gap-2">
                  <select
                    value={startYear}
                    onChange={(e) => onStartYearChange(Number(e.target.value))}
                    className="bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] rounded-md px-2 py-1.5 text-xs font-medium text-text-primary focus:outline-none focus:border-mint/50"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year} className="bg-bg-card">
                        {year}
                      </option>
                    ))}
                  </select>
                  <span className="text-text-muted text-xs">to</span>
                  <select
                    value={endYear}
                    onChange={(e) => onEndYearChange(Number(e.target.value))}
                    className="bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] rounded-md px-2 py-1.5 text-xs font-medium text-text-primary focus:outline-none focus:border-mint/50"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year} className="bg-bg-card">
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Position */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-text-muted">Position</span>
              <div className="flex items-center gap-2 bg-bg-secondary rounded-lg px-3 py-1.5">
                <span className="text-mint font-semibold text-sm">
                  ${initialDeposit.toLocaleString()} {currentToken?.symbol || "ETH"}
                </span>
                <ArrowRight className="w-3 h-3 text-text-muted" />
                <span className="text-text-secondary text-sm">{debtSymbol}</span>
              </div>
            </div>

            {/* Start Simulation Button */}
            {onStartSimulation && (
              <button
                onClick={onStartSimulation}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all bg-mint text-bg-primary hover:bg-mint-hover ml-auto"
              >
                <Play className="w-4 h-4" />
                Start
              </button>
            )}
          </div>
        </div>
      </ShinyCard>
    </div>
  );

  // Desktop sidebar content
  const desktopContent = (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-3 p-[17px] flex-1">
        {/* Data Mode Card */}
        <ShinyCard>
          <div className="px-[17px] py-[13px]">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-text-secondary">Data Mode</span>
              <div className="h-px bg-[rgba(255,255,255,0.05)]" />
              <div className="flex gap-1 bg-bg-secondary rounded-lg p-1">
                <Tooltip
                  position="bottom"
                  className="!whitespace-normal w-64 text-left"
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
                    onClick={() => onDataModeChange("historic")}
                    className={cn(
                      "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      dataMode === "historic"
                        ? "bg-bg-secondary border border-mint-glow text-text-primary shadow-[0px_1px_4px_0px_rgba(0,0,0,0.4)]"
                        : "text-text-muted hover:text-text-secondary"
                    )}
                  >
                    Historic
                  </button>
                </Tooltip>
                <Tooltip
                  position="bottom"
                  className="!whitespace-normal w-64 text-left"
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
                        Uses realistic price patterns with configurable volatility.
                      </p>
                    </div>
                  }
                >
                  <button
                    onClick={() => onDataModeChange("simulated")}
                    className={cn(
                      "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      dataMode === "simulated"
                        ? "bg-bg-secondary border border-mint-glow text-text-primary shadow-[0px_1px_4px_0px_rgba(0,0,0,0.4)]"
                        : "text-text-muted hover:text-text-secondary"
                    )}
                  >
                    Simulated
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </ShinyCard>

        {/* Collateral Card */}
        <ShinyCard>
          <div className="p-[17px]">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-text-secondary">Collateral</span>
              <div className="h-px bg-[rgba(255,255,255,0.05)]" />
              <div className="flex gap-1 bg-bg-secondary rounded-lg p-1">
                {availableTokens.map((token) => (
                  <button
                    key={token.id}
                    onClick={() => onCollateralChange(token.id)}
                    className={cn(
                      "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      collateralToken === token.id
                        ? "bg-bg-secondary border border-mint-glow text-text-primary shadow-[0px_1px_4px_0px_rgba(0,0,0,0.4)]"
                        : "text-text-muted hover:text-text-secondary"
                    )}
                  >
                    {token.symbol}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ShinyCard>

        {/* Time Window Card (Historic mode only) */}
        {dataMode === "historic" && (
          <ShinyCard>
            <div className="p-[17px]">
              <div className="flex flex-col gap-2">
                <span className="text-sm text-text-secondary">Time window</span>
                <div className="h-px bg-[rgba(255,255,255,0.05)]" />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">From:</span>
                    <select
                      value={startYear}
                      onChange={(e) => onStartYearChange(Number(e.target.value))}
                      className="bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] rounded-md px-3 py-1.5 text-xs font-medium text-text-primary focus:outline-none focus:border-mint/50 shadow-[0px_2px_6px_0px_rgba(0,0,0,0.25)]"
                    >
                      {availableYears.map((year) => (
                        <option key={year} value={year} className="bg-bg-card">
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">To:</span>
                    <select
                      value={endYear}
                      onChange={(e) => onEndYearChange(Number(e.target.value))}
                      className="bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] rounded-md px-3 py-1.5 text-xs font-medium text-text-primary focus:outline-none focus:border-mint/50 shadow-[0px_2px_6px_0px_rgba(0,0,0,0.25)]"
                    >
                      {availableYears.map((year) => (
                        <option key={year} value={year} className="bg-bg-card">
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </ShinyCard>
        )}

        {/* Position Card */}
        <ShinyCard>
          <div className="p-[17px]">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-text-secondary">Position</span>
              <div className="h-px bg-[rgba(255,255,255,0.05)]" />
              <div className="flex items-center gap-2">
                <span className="text-mint font-semibold">
                  ${initialDeposit.toLocaleString()} {currentToken?.symbol || "ETH"}
                </span>
                <ArrowRight className="w-4 h-4 text-text-muted" />
                <span className="text-text-secondary">{debtSymbol}</span>
              </div>
            </div>
          </div>
        </ShinyCard>
      </div>

      {/* Start Simulation Button - Pinned to bottom */}
      {onStartSimulation && (
        <div className="p-[17px] pt-0 mt-auto">
          <button
            onClick={onStartSimulation}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all bg-mint text-bg-primary hover:bg-mint-hover"
          >
            <Play className="w-4 h-4" />
            Start Simulation
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile layout - horizontal bar above chart */}
      {mobileContent}

      {/* Desktop layout - vertical sidebar */}
      <aside className="w-[240px] flex-shrink-0 hidden lg:block h-full">
        {/* Shiny card wrapper for entire sidebar */}
        <div className="relative rounded-xl overflow-hidden h-full">
          {/* Outer glow/border effect */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-[rgba(255,255,255,0.08)] via-[rgba(255,255,255,0.02)] to-transparent" />

          {/* Main card background */}
          <div className="relative m-[1px] rounded-[11px] bg-gradient-to-b from-[#161a1e] to-[#111417] shadow-[0px_4px_16px_0px_rgba(0,0,0,0.3)] h-[calc(100%-2px)]">
            {/* Top highlight shine */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.1)] to-transparent" />

            {/* Inner subtle gradient for depth */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-black/[0.05] pointer-events-none rounded-[11px]" />

            <div className="relative h-full">
              {desktopContent}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
