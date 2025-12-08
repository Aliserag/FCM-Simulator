'use client'

import { useState, useEffect, useRef } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Label,
} from 'recharts'
import { getEventsInRange, eventToSimulationDay, type BlackSwanEvent } from '@/data/blackSwanEvents'

export interface ChartDataPoint {
  day: number
  year: number
  date: string
  traditionalValue: number
  fcmValue: number
  price: number
  liquidationPrice: number
  traditionalLiquidated: boolean
  fcmLiquidated: boolean
}

interface SimulationChartProps {
  data: ChartDataPoint[]
  currentDay: number
  totalDays: number
  tokenSymbol?: string
  startYear?: number
  endYear?: number
  showEventMarkers?: boolean
}

// Format USD values
function formatUSD(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

// Custom tooltip component
interface TooltipPayload {
  payload?: ChartDataPoint
  value?: number
  name?: string
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0]?.payload
  if (!data) return null

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
      <p className="text-slate-400 text-xs mb-2">{data.date}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-300 text-sm">FCM</span>
          </span>
          <span className={`text-sm font-medium ${data.fcmLiquidated ? 'text-red-400 line-through' : 'text-emerald-400'}`}>
            {data.fcmLiquidated ? 'Liquidated' : formatUSD(data.fcmValue)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-slate-300 text-sm">Traditional</span>
          </span>
          <span className={`text-sm font-medium ${data.traditionalLiquidated ? 'text-red-400 line-through' : 'text-red-400'}`}>
            {data.traditionalLiquidated ? 'Liquidated' : formatUSD(data.traditionalValue)}
          </span>
        </div>
        <div className="border-t border-slate-700 pt-1.5 mt-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400 text-xs">Token Price</span>
            <span className="text-slate-200 text-xs font-medium">
              ${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Custom legend component
function CustomLegend() {
  return (
    <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-2">
      <div className="flex items-center gap-2">
        <div className="w-4 h-0.5 bg-emerald-500"></div>
        <span className="text-slate-400 text-sm">FCM (Auto-Protected)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-0.5 bg-red-500"></div>
        <span className="text-slate-400 text-sm">Traditional DeFi Lending</span>
      </div>
    </div>
  )
}

export default function SimulationChart({
  data,
  currentDay,
  totalDays,
  startYear: propStartYear,
  endYear: propEndYear,
  showEventMarkers = true,
}: SimulationChartProps) {
  const [showLiquidationPopup, setShowLiquidationPopup] = useState(false)
  const liquidationShownRef = useRef(false)

  // Only show data up to current day for animation effect
  // Add small offset to Traditional values so it renders visually below FCM when they overlap
  const visibleData = data.slice(0, currentDay + 1).map(d => ({
    ...d,
    // Offset Traditional by 0.5% below when values are very close to FCM
    traditionalValueOffset: d.traditionalValue > 0
      ? d.traditionalValue * 0.995
      : d.traditionalValue,
  }))

  // Find the liquidation day (first day where traditionalLiquidated becomes true)
  const liquidationDay = data.findIndex(d => d.traditionalLiquidated)
  const liquidationPoint = liquidationDay >= 0 ? data[liquidationDay] : null
  const hasReachedLiquidation = liquidationDay >= 0 && currentDay >= liquidationDay

  // Show popup when liquidation is first reached during playback
  useEffect(() => {
    // Reset when simulation resets (currentDay goes back to 0)
    if (currentDay === 0) {
      liquidationShownRef.current = false
      setShowLiquidationPopup(false)
      return
    }

    if (hasReachedLiquidation && !liquidationShownRef.current) {
      liquidationShownRef.current = true
      setShowLiquidationPopup(true)
    }
  }, [hasReachedLiquidation, currentDay])

  // Separate effect for auto-hiding the popup after 5 seconds
  useEffect(() => {
    if (showLiquidationPopup) {
      const timer = setTimeout(() => setShowLiquidationPopup(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showLiquidationPopup])

  // Calculate Y-axis domain with some padding
  const allValues = visibleData.flatMap(d => [d.traditionalValue, d.fcmValue]).filter(v => v > 0)
  const maxValue = Math.max(...allValues, 1)
  const minValue = Math.min(...allValues.filter(v => v > 0), maxValue)
  const yDomain = [
    Math.max(0, minValue * 0.8),
    maxValue * 1.1
  ]

  // Generate year tick values for X-axis
  const yearTicks: number[] = []
  const startYear = propStartYear ?? data[0]?.year ?? 2020
  const endYear = propEndYear ?? data[data.length - 1]?.year ?? 2025

  // Get black swan events for this date range
  const blackSwanEvents = showEventMarkers ? getEventsInRange(startYear, endYear) : []
  for (let year = startYear; year <= endYear; year++) {
    const dayIndex = (year - startYear) * 365
    if (dayIndex <= totalDays) {
      yearTicks.push(dayIndex)
    }
  }

  // Format X-axis tick to show year
  const formatXAxis = (day: number) => {
    const year = startYear + Math.floor(day / 365)
    return year.toString()
  }

  return (
    <div className="w-full h-[350px] relative">
      {/* Liquidation Popup */}
      {showLiquidationPopup && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-semibold">Price Crash - Traditional Position Liquidated!</span>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={visibleData}
          margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />

          <XAxis
            dataKey="day"
            ticks={yearTicks}
            tickFormatter={formatXAxis}
            stroke="#64748b"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
          />

          <YAxis
            domain={yDomain}
            tickFormatter={formatUSD}
            stroke="#64748b"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
            width={60}
          />

          <Tooltip content={<CustomTooltip />} />


          {/* Liquidation marker on the chart - X mark at liquidation point */}
          {hasReachedLiquidation && liquidationPoint && (
            <ReferenceDot
              x={liquidationPoint.day}
              y={liquidationPoint.liquidationPrice}
              r={8}
              fill="#dc2626"
              stroke="#fff"
              strokeWidth={2}
              label={{
                value: '✕',
                fill: '#fff',
                fontSize: 10,
                fontWeight: 'bold',
              }}
            />
          )}

          {/* Black Swan Event Labels */}
          {blackSwanEvents.map((event) => {
            const simDay = eventToSimulationDay(event, startYear)
            // Only show if we've reached that day in the simulation
            if (simDay > currentDay || simDay < 0 || simDay > totalDays) return null

            // Find the price data point at that day for positioning
            const dataPoint = data.find(d => d.day === simDay)
            if (!dataPoint) return null

            // Position label above the higher of the two values
            const yPosition = Math.max(dataPoint.fcmValue, dataPoint.traditionalValue) * 1.05

            return (
              <ReferenceDot
                key={event.id}
                x={simDay}
                y={yPosition}
                r={0}
                label={{
                  value: event.shortName,
                  position: 'top',
                  fill: event.severity === 'severe' ? '#dc2626' : '#f59e0b',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )
          })}

          {/* Traditional line (render first so FCM is on top) */}
          {/* Uses offset value to show slightly below FCM when overlapping */}
          <Line
            type="monotone"
            dataKey="traditionalValueOffset"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            name="Traditional DeFi"
            isAnimationActive={false}
          />

          {/* FCM line */}
          <Line
            type="monotone"
            dataKey="fcmValue"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={false}
            name="FCM"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <CustomLegend />
    </div>
  )
}
