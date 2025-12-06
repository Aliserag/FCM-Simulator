'use client'

import { useState, useRef, useEffect, ReactNode, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  className?: string
  interactive?: boolean // Allow hovering over tooltip content
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  className,
  interactive = true,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [adjustedPosition, setAdjustedPosition] = useState<'left' | 'center' | 'right'>('center')
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Check if tooltip would overflow and adjust position
  const checkOverflow = useCallback(() => {
    if (!triggerRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const tooltipWidth = 280 // Approximate max tooltip width

    // Check left edge
    if (triggerRect.left < tooltipWidth / 2) {
      setAdjustedPosition('left')
    }
    // Check right edge
    else if (viewportWidth - triggerRect.right < tooltipWidth / 2) {
      setAdjustedPosition('right')
    }
    else {
      setAdjustedPosition('center')
    }
  }, [])

  const showTooltip = () => {
    // Clear any pending hide
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    // Show after delay
    if (!isVisible && !showTimeoutRef.current) {
      showTimeoutRef.current = setTimeout(() => {
        checkOverflow()
        setIsVisible(true)
        showTimeoutRef.current = null
      }, delay)
    }
  }

  const hideTooltip = () => {
    // Clear any pending show
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current)
      showTimeoutRef.current = null
    }
    // Hide after small delay (allows moving to tooltip)
    if (!hideTimeoutRef.current) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false)
        hideTimeoutRef.current = null
      }, interactive ? 150 : 0)
    }
  }

  const cancelHide = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  // Position classes that adapt to viewport edges
  const getPositionClasses = () => {
    if (position === 'top' || position === 'bottom') {
      const vertical = position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
      switch (adjustedPosition) {
        case 'left':
          return `${vertical} left-0`
        case 'right':
          return `${vertical} right-0`
        default:
          return `${vertical} left-1/2 -translate-x-1/2`
      }
    }
    // Left/right positions stay the same
    return position === 'left'
      ? 'right-full top-1/2 -translate-y-1/2 mr-2'
      : 'left-full top-1/2 -translate-y-1/2 ml-2'
  }

  // Arrow classes that adapt to position
  const getArrowClasses = () => {
    if (position === 'top' || position === 'bottom') {
      const vertical = position === 'top' ? 'top-full border-t-gray-900' : 'bottom-full border-b-gray-900'
      switch (adjustedPosition) {
        case 'left':
          return `${vertical} left-4`
        case 'right':
          return `${vertical} right-4`
        default:
          return `${vertical} left-1/2 -translate-x-1/2`
      }
    }
    return position === 'left'
      ? 'left-full top-1/2 -translate-y-1/2 border-l-gray-900'
      : 'right-full top-1/2 -translate-y-1/2 border-r-gray-900'
  }

  const animationVariants = {
    top: { initial: { opacity: 0, y: 5 }, animate: { opacity: 1, y: 0 } },
    bottom: { initial: { opacity: 0, y: -5 }, animate: { opacity: 1, y: 0 } },
    left: { initial: { opacity: 0, x: 5 }, animate: { opacity: 1, x: 0 } },
    right: { initial: { opacity: 0, x: -5 }, animate: { opacity: 1, x: 0 } },
  }

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={animationVariants[position].initial}
            animate={animationVariants[position].animate}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 max-w-[280px] rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg',
              getPositionClasses(),
              className
            )}
            onMouseEnter={interactive ? cancelHide : undefined}
            onMouseLeave={interactive ? hideTooltip : undefined}
          >
            {content}
            {/* Arrow */}
            <div
              className={cn(
                'absolute h-0 w-0 border-4 border-transparent',
                getArrowClasses()
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
