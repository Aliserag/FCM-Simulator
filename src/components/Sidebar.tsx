"use client";

import { Play, ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface Token {
  id: string;
  symbol: string;
  color: string;
  name?: string;
  collateralFactor?: number;
  supplyAPY?: number;
  borrowRate?: number;
}

interface SidebarProps {
  // Data Mode
  dataMode: "historic" | "simulated";
  onDataModeChange: (mode: "historic" | "simulated") => void;

  // Collateral
  collateralToken: string;
  onCollateralChange: (token: string, price?: number) => void;
  availableTokens: Token[];

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

  // Simulated mode props
  depositPresets?: number[];
  onDepositChange?: (amount: number) => void;
  debtTokens?: Token[];
  selectedDebtToken?: string;
  onDebtTokenChange?: (token: string) => void;
  livePrices?: Record<string, number>;
  pricesLoading?: boolean;
  onRefreshPrices?: () => void;
  usingFallback?: boolean;
  onBasePriceChange?: (price: number) => void;
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

// Dropdown component for simulated mode - uses portal to avoid z-index issues
function Dropdown({
  label,
  value,
  options,
  onChange,
  renderOption,
  renderValue,
}: {
  label: string;
  value: string;
  options: { id: string; label: string; sublabel?: string; color?: string }[];
  onChange: (id: string) => void;
  renderOption?: (option: { id: string; label: string; sublabel?: string; color?: string }) => React.ReactNode;
  renderValue?: () => React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const selectedOption = options.find(o => o.id === value);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      setIsOpen(false);
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  const dropdownMenu = isOpen && mounted && createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
      <div
        className="fixed z-[9999] bg-[#1a1d21] border border-[rgba(255,255,255,0.1)] rounded-lg shadow-xl overflow-hidden"
        style={{
          top: menuPosition.top,
          left: menuPosition.left,
          width: menuPosition.width,
        }}
      >
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => {
              onChange(option.id);
              setIsOpen(false);
            }}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[rgba(255,255,255,0.05)] transition-colors",
              value === option.id && "bg-[rgba(255,255,255,0.05)]"
            )}
          >
            {renderOption ? renderOption(option) : (
              <div className="flex items-center gap-2">
                <span style={{ color: option.color }} className="font-medium">
                  {option.label}
                </span>
                {option.sublabel && (
                  <span className="text-text-muted text-xs">{option.sublabel}</span>
                )}
              </div>
            )}
            {value === option.id && (
              <div className="w-2 h-2 rounded-full bg-mint" />
            )}
          </button>
        ))}
      </div>
    </>,
    document.body
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm hover:border-[rgba(255,255,255,0.2)] transition-colors"
      >
        <div className="flex items-center gap-2">
          {renderValue ? renderValue() : (
            <>
              <span style={{ color: selectedOption?.color }} className="font-medium">
                {selectedOption?.label}
              </span>
              {selectedOption?.sublabel && (
                <span className="text-text-muted text-xs">{selectedOption.sublabel}</span>
              )}
            </>
          )}
        </div>
        <ChevronDown className={cn("w-4 h-4 text-text-muted transition-transform", isOpen && "rotate-180")} />
      </button>
      {dropdownMenu}
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
  // Simulated mode props
  depositPresets = [1000, 5000, 10000, 50000],
  onDepositChange,
  debtTokens = [],
  selectedDebtToken,
  onDebtTokenChange,
  livePrices = {},
  pricesLoading = false,
  onRefreshPrices,
  usingFallback = false,
  onBasePriceChange,
}: SidebarProps) {
  const currentToken = availableTokens.find(t => t.id === collateralToken);
  const currentDebtToken = debtTokens.find(t => t.id === selectedDebtToken);

  // Mobile layout - clean stacked design
  const mobileContent = (
    <div className="lg:hidden">
      <ShinyCard>
        <div className="p-4 space-y-4">
          {/* Row 1: Mode Toggle - Full Width */}
          <div className="flex gap-1 bg-bg-secondary rounded-lg p-1">
            <button
              onClick={() => onDataModeChange("historic")}
              className={cn(
                "flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all",
                dataMode === "historic"
                  ? "bg-bg-secondary border border-mint-glow text-text-primary shadow-[0px_1px_4px_0px_rgba(0,0,0,0.4)]"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              Historic Data
            </button>
            <button
              onClick={() => onDataModeChange("simulated")}
              className={cn(
                "flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all",
                dataMode === "simulated"
                  ? "bg-bg-secondary border border-mint-glow text-text-primary shadow-[0px_1px_4px_0px_rgba(0,0,0,0.4)]"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              Simulated
            </button>
          </div>

          {/* Row 2: Collateral Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted uppercase tracking-wide">Collateral</span>
              {dataMode === "simulated" && onRefreshPrices && (
                <button
                  onClick={onRefreshPrices}
                  disabled={pricesLoading}
                  className="text-[10px] text-mint hover:text-mint-hover disabled:opacity-50"
                >
                  {pricesLoading ? "..." : "↻ Refresh Prices"}
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {availableTokens.slice(0, 3).map((token) => (
                <button
                  key={token.id}
                  onClick={() => {
                    const price = livePrices[token.id];
                    onCollateralChange(token.id, price);
                    if (dataMode === "simulated" && price && onBasePriceChange) {
                      onBasePriceChange(price);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    collateralToken === token.id
                      ? "bg-bg-secondary border border-mint-glow text-text-primary shadow-[0px_1px_4px_0px_rgba(0,0,0,0.4)]"
                      : "bg-[rgba(255,255,255,0.05)] border border-transparent text-text-muted hover:text-text-secondary hover:border-[rgba(255,255,255,0.1)]"
                  )}
                >
                  <span style={{ color: token.color }}>{token.symbol}</span>
                  {dataMode === "simulated" && livePrices[token.id] && (
                    <span className="text-[10px] text-text-muted">
                      ${livePrices[token.id].toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Time Window (Historic) or Deposit (Simulated) */}
          {dataMode === "historic" ? (
            <div>
              <span className="text-xs text-text-muted uppercase tracking-wide block mb-2">Time Window</span>
              <div className="flex items-center gap-3">
                <select
                  value={startYear}
                  onChange={(e) => onStartYearChange(Number(e.target.value))}
                  className="flex-1 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2.5 text-sm font-medium text-text-primary focus:outline-none focus:border-mint/50"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year} className="bg-bg-card">
                      {year}
                    </option>
                  ))}
                </select>
                <span className="text-text-muted text-sm">to</span>
                <select
                  value={endYear}
                  onChange={(e) => onEndYearChange(Number(e.target.value))}
                  className="flex-1 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2.5 text-sm font-medium text-text-primary focus:outline-none focus:border-mint/50"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year} className="bg-bg-card">
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            onDepositChange && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-text-muted uppercase tracking-wide block mb-2">Deposit</span>
                  <select
                    value={initialDeposit}
                    onChange={(e) => onDepositChange(Number(e.target.value))}
                    className="w-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2.5 text-sm font-medium text-mint focus:outline-none focus:border-mint/50"
                  >
                    {depositPresets.map((amount) => (
                      <option key={amount} value={amount} className="bg-bg-card">
                        ${amount.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                {onDebtTokenChange && debtTokens.length > 0 && (
                  <div>
                    <span className="text-xs text-text-muted uppercase tracking-wide block mb-2">Borrow</span>
                    <select
                      value={selectedDebtToken || debtTokens[0]?.id || ""}
                      onChange={(e) => onDebtTokenChange(e.target.value)}
                      className="w-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2.5 text-sm font-medium text-text-primary focus:outline-none focus:border-mint/50"
                    >
                      {debtTokens.map((token) => (
                        <option key={token.id} value={token.id} className="bg-bg-card">
                          {token.symbol}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )
          )}

          {/* Row 4: Position Summary + Start Button */}
          <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-2">
              <span className="text-mint font-semibold">
                ${initialDeposit.toLocaleString()}
              </span>
              <span style={{ color: currentToken?.color }} className="font-medium">
                {currentToken?.symbol || "ETH"}
              </span>
              <ArrowRight className="w-4 h-4 text-text-muted" />
              <span className="text-text-secondary">{currentDebtToken?.symbol || debtSymbol}</span>
            </div>
            {onStartSimulation && (
              <button
                onClick={onStartSimulation}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all bg-mint text-bg-primary hover:bg-mint-hover active:scale-95"
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
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Collateral</span>
                {dataMode === "simulated" && onRefreshPrices && (
                  <button
                    onClick={onRefreshPrices}
                    disabled={pricesLoading}
                    className="text-[10px] text-mint hover:text-mint-hover disabled:opacity-50"
                    title="Refresh prices"
                  >
                    {pricesLoading ? "..." : "↻ Refresh"}
                  </button>
                )}
              </div>
              <div className="h-px bg-[rgba(255,255,255,0.05)]" />

              {dataMode === "historic" ? (
                // Historic mode: Simple button group
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
              ) : (
                // Simulated mode: Dropdown with prices and token info
                <Dropdown
                  label="Collateral"
                  value={collateralToken}
                  options={availableTokens.map(t => ({
                    id: t.id,
                    label: t.symbol,
                    sublabel: livePrices[t.id] ? `$${livePrices[t.id].toLocaleString(undefined, { maximumFractionDigits: 0 })}` : undefined,
                    color: t.color,
                  }))}
                  onChange={(id) => {
                    const price = livePrices[id];
                    onCollateralChange(id, price);
                    if (price && onBasePriceChange) {
                      onBasePriceChange(price);
                    }
                  }}
                  renderOption={(option) => {
                    const token = availableTokens.find(t => t.id === option.id);
                    const price = livePrices[option.id];
                    return (
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span style={{ color: option.color }} className="font-medium">
                            {option.label}
                          </span>
                          <span className="text-text-muted text-xs">
                            {price ? `$${price.toLocaleString(undefined, { maximumFractionDigits: price < 1 ? 4 : 0 })}` : '—'}
                          </span>
                        </div>
                        <div className="flex gap-3 text-[10px] text-text-muted mt-0.5">
                          <span>LTV: {token?.collateralFactor ? `${(token.collateralFactor * 100).toFixed(0)}%` : '80%'}</span>
                          <span className="text-mint">+{token?.supplyAPY ? `${(token.supplyAPY * 100).toFixed(1)}%` : '5%'} APY</span>
                        </div>
                      </div>
                    );
                  }}
                  renderValue={() => (
                    <div className="flex items-center gap-2">
                      <span style={{ color: currentToken?.color }} className="font-medium">
                        {currentToken?.symbol}
                      </span>
                      {livePrices[collateralToken] && (
                        <span className="text-text-muted text-xs">
                          ${livePrices[collateralToken].toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      )}
                      {usingFallback && (
                        <span className="text-amber-400 text-[10px]">⚠</span>
                      )}
                    </div>
                  )}
                />
              )}
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

        {/* Deposit Card (Simulated mode only) */}
        {dataMode === "simulated" && onDepositChange && (
          <ShinyCard>
            <div className="p-[17px]">
              <div className="flex flex-col gap-2">
                <span className="text-sm text-text-secondary">Deposit Amount</span>
                <div className="h-px bg-[rgba(255,255,255,0.05)]" />
                <Dropdown
                  label="Deposit"
                  value={initialDeposit.toString()}
                  options={depositPresets.map(amount => ({
                    id: amount.toString(),
                    label: `$${amount.toLocaleString()}`,
                  }))}
                  onChange={(id) => onDepositChange(Number(id))}
                  renderValue={() => (
                    <span className="text-mint font-semibold">
                      ${initialDeposit.toLocaleString()}
                    </span>
                  )}
                />
              </div>
            </div>
          </ShinyCard>
        )}

        {/* Debt Token Card (Simulated mode only) */}
        {dataMode === "simulated" && onDebtTokenChange && debtTokens.length > 0 && (
          <ShinyCard>
            <div className="p-[17px]">
              <div className="flex flex-col gap-2">
                <span className="text-sm text-text-secondary">Borrow Token</span>
                <div className="h-px bg-[rgba(255,255,255,0.05)]" />
                <Dropdown
                  label="Debt Token"
                  value={selectedDebtToken || debtTokens[0]?.id || ""}
                  options={debtTokens.map(t => ({
                    id: t.id,
                    label: t.symbol,
                    sublabel: t.borrowRate ? `${(t.borrowRate * 100).toFixed(1)}% APY` : undefined,
                    color: t.color,
                  }))}
                  onChange={onDebtTokenChange}
                  renderValue={() => (
                    <div className="flex items-center gap-2">
                      <span style={{ color: currentDebtToken?.color }} className="font-medium">
                        {currentDebtToken?.symbol || debtSymbol}
                      </span>
                      {currentDebtToken?.borrowRate && (
                        <span className="text-red-400 text-xs">
                          {(currentDebtToken.borrowRate * 100).toFixed(1)}% APY
                        </span>
                      )}
                    </div>
                  )}
                />
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
                <span className="text-text-secondary">{currentDebtToken?.symbol || debtSymbol}</span>
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
