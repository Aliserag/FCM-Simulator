import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency with $ sign
export function formatCurrency(value: number, decimals: number = 2): string {
  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  return `${sign}$${absValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

// Format currency in compact form ($1.2k, $45.3k, $1.2M)
export function formatCurrencyCompact(value: number): string {
  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (absValue >= 1000000) {
    return `${sign}$${(absValue / 1000000).toFixed(1)}M`
  }
  if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(1)}k`
  }
  return `${sign}$${absValue.toFixed(0)}`
}

// Format token amount with appropriate decimals
export function formatTokenAmount(amount: number, symbol: string): string {
  if (amount >= 1000) {
    return `${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${symbol}`
  }
  if (amount >= 1) {
    return `${amount.toFixed(4)} ${symbol}`
  }
  if (amount >= 0.0001) {
    return `${amount.toFixed(6)} ${symbol}`
  }
  return `${amount.toExponential(2)} ${symbol}`
}

// Format percentage
export function formatPercent(value: number, decimals: number = 1): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

// Format health factor
export function formatHealth(value: number): string {
  if (value <= 0) return '0.00'
  if (value > 100) return '∞'
  return value.toFixed(2)
}

// Format large numbers with K, M suffixes
export function formatCompact(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toFixed(0)
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// Clamp a value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// Linear interpolation
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

// Ease out cubic
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

// Calculate days to specific event based on rate of change
export function daysUntil(
  currentValue: number,
  targetValue: number,
  dailyChangeRate: number
): number | null {
  if (dailyChangeRate === 0) return null
  const days = (targetValue - currentValue) / dailyChangeRate
  return days > 0 ? Math.ceil(days) : null
}
