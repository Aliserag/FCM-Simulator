'use client'

import { forwardRef, InputHTMLAttributes, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: number
  min: number
  max: number
  step?: number
  label?: string
  showValue?: boolean
  formatValue?: (value: number) => string
  onChange: (value: number) => void
  trackColor?: 'default' | 'gradient'
}

const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      value,
      min,
      max,
      step = 1,
      label,
      showValue = true,
      formatValue = (v) => v.toString(),
      onChange,
      trackColor = 'default',
      ...props
    },
    ref
  ) => {
    const percentage = ((value - min) / (max - min)) * 100

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(Number(e.target.value))
      },
      [onChange]
    )

    return (
      <div className={cn('w-full', className)}>
        {(label || showValue) && (
          <div className="mb-2 flex items-center justify-between">
            {label && (
              <label className="text-sm font-medium text-gray-700">{label}</label>
            )}
            {showValue && (
              <span className="text-sm font-mono font-semibold text-gray-900">
                {formatValue(value)}
              </span>
            )}
          </div>
        )}
        <div className="relative h-6 flex items-center">
          {/* Track background */}
          <div className="absolute inset-x-0 h-2 rounded-full bg-gray-200" />

          {/* Filled track */}
          <div
            className={cn(
              'absolute h-2 rounded-full transition-all',
              {
                'bg-primary': trackColor === 'default',
                'bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500': trackColor === 'gradient',
              }
            )}
            style={{ width: `${percentage}%` }}
          />

          {/* Input */}
          <input
            ref={ref}
            type="range"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={handleChange}
            className={cn(
              'absolute inset-0 h-6 w-full cursor-pointer appearance-none bg-transparent',
              '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5',
              '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
              '[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md',
              '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary',
              '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110',
              '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5',
              '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2',
              '[&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-white'
            )}
            {...props}
          />
        </div>

        {/* Min/Max labels */}
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>{formatValue(min)}</span>
          <span>{formatValue(max)}</span>
        </div>
      </div>
    )
  }
)

Slider.displayName = 'Slider'

export { Slider }
