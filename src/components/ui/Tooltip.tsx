'use client'

import { useState, useRef, useEffect, ReactNode, useCallback } from 'react'
import { createPortal } from 'react-dom'
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
  const [mounted, setMounted] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate tooltip position based on trigger element
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipWidth = 280 // Max tooltip width
    const tooltipHeight = 100 // Approximate tooltip height
    const padding = 8

    let top = 0
    let left = 0

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipHeight - padding
        left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2
        break
      case 'bottom':
        top = triggerRect.bottom + padding
        left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2
        break
      case 'left':
        top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2
        left = triggerRect.left - tooltipWidth - padding
        break
      case 'right':
        top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2
        left = triggerRect.right + padding
        break
    }

    // Keep tooltip within viewport
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Horizontal bounds
    if (left < padding) {
      left = padding
    } else if (left + tooltipWidth > viewportWidth - padding) {
      left = viewportWidth - tooltipWidth - padding
    }

    // Vertical bounds
    if (top < padding) {
      top = padding
    } else if (top + tooltipHeight > viewportHeight - padding) {
      top = viewportHeight - tooltipHeight - padding
    }

    setTooltipPosition({ top, left })
  }, [position])

  const showTooltip = () => {
    // Clear any pending hide
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    // Show after delay
    if (!isVisible && !showTimeoutRef.current) {
      showTimeoutRef.current = setTimeout(() => {
        calculatePosition()
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

  // Close tooltip on scroll
  useEffect(() => {
    if (!isVisible) return

    const handleScroll = () => {
      setIsVisible(false)
    }

    window.addEventListener('scroll', handleScroll, true)
    return () => window.removeEventListener('scroll', handleScroll, true)
  }, [isVisible])

  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  const animationVariants = {
    top: { initial: { opacity: 0, y: 5 }, animate: { opacity: 1, y: 0 } },
    bottom: { initial: { opacity: 0, y: -5 }, animate: { opacity: 1, y: 0 } },
    left: { initial: { opacity: 0, x: 5 }, animate: { opacity: 1, x: 0 } },
    right: { initial: { opacity: 0, x: -5 }, animate: { opacity: 1, x: 0 } },
  }

  const tooltipContent = isVisible && mounted && createPortal(
    <AnimatePresence>
      <motion.div
        ref={tooltipRef}
        initial={animationVariants[position].initial}
        animate={animationVariants[position].animate}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'fixed z-[9999] max-w-[280px] rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg',
          className
        )}
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
        onMouseEnter={interactive ? cancelHide : undefined}
        onMouseLeave={interactive ? hideTooltip : undefined}
      >
        {content}
      </motion.div>
    </AnimatePresence>,
    document.body
  )

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
      {tooltipContent}
    </div>
  )
}
