'use client'

import { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'fcm' | 'traditional'
  size?: 'sm' | 'md'
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          {
            // Variants
            'bg-gray-100 text-gray-700': variant === 'default',
            'bg-emerald-100 text-emerald-700': variant === 'success',
            'bg-amber-100 text-amber-700': variant === 'warning',
            'bg-red-100 text-red-700': variant === 'danger',
            'bg-blue-100 text-blue-700': variant === 'info',
            'bg-emerald-600 text-white': variant === 'fcm',
            'bg-red-600 text-white': variant === 'traditional',
            // Sizes
            'px-2 py-0.5 text-xs': size === 'sm',
            'px-3 py-1 text-sm': size === 'md',
          },
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }
