'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedNumberProps {
  value: number
  format?: (value: number) => string
  className?: string
  duration?: number
}

export function AnimatedNumber({
  value,
  format = (v) => v.toFixed(2),
  className,
  duration = 0.5,
}: AnimatedNumberProps) {
  const spring = useSpring(value, {
    stiffness: 100,
    damping: 20,
    duration,
  })

  const display = useTransform(spring, (current) => format(current))
  const [displayValue, setDisplayValue] = useState(format(value))

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  useEffect(() => {
    const unsubscribe = display.on('change', (latest) => {
      setDisplayValue(latest)
    })
    return unsubscribe
  }, [display])

  return (
    <motion.span
      className={cn('tabular-nums', className)}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
    >
      {displayValue}
    </motion.span>
  )
}

// Specialized version for currency
interface AnimatedCurrencyProps {
  value: number
  className?: string
  duration?: number
  showSign?: boolean
}

export function AnimatedCurrency({
  value,
  className,
  duration = 0.5,
  showSign = false,
}: AnimatedCurrencyProps) {
  const formatCurrency = (v: number) => {
    const abs = Math.abs(v)
    const formatted = abs.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    const sign = showSign && v > 0 ? '+' : ''
    const prefix = v < 0 ? '-' : sign
    return `${prefix}$${formatted}`
  }

  return (
    <AnimatedNumber
      value={value}
      format={formatCurrency}
      className={className}
      duration={duration}
    />
  )
}

// Specialized version for percentages
interface AnimatedPercentProps {
  value: number
  className?: string
  duration?: number
  decimals?: number
  showSign?: boolean
}

export function AnimatedPercent({
  value,
  className,
  duration = 0.5,
  decimals = 1,
  showSign = true,
}: AnimatedPercentProps) {
  const formatPercent = (v: number) => {
    const sign = showSign && v > 0 ? '+' : ''
    return `${sign}${v.toFixed(decimals)}%`
  }

  return (
    <AnimatedNumber
      value={value}
      format={formatPercent}
      className={className}
      duration={duration}
    />
  )
}

// Specialized version for health factor
interface AnimatedHealthProps {
  value: number
  className?: string
  duration?: number
}

export function AnimatedHealth({
  value,
  className,
  duration = 0.5,
}: AnimatedHealthProps) {
  const formatHealth = (v: number) => {
    if (v <= 0) return '0.00'
    if (v > 100) return '∞'
    return v.toFixed(2)
  }

  return (
    <AnimatedNumber
      value={value}
      format={formatHealth}
      className={className}
      duration={duration}
    />
  )
}
