'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TooltipContent } from '@/types'

interface InfoTooltipProps {
  content: TooltipContent
  icon?: 'help' | 'info'
  size?: 'sm' | 'md'
  className?: string
}

export function InfoTooltip({
  content,
  icon = 'help',
  size = 'sm',
  className,
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)

  const IconComponent = icon === 'help' ? HelpCircle : Info

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        type="button"
        className={cn(
          'text-gray-400 transition-colors hover:text-gray-600',
          {
            'h-4 w-4': size === 'sm',
            'h-5 w-5': size === 'md',
          }
        )}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        aria-label={`More info about ${content.title}`}
      >
        <IconComponent className="h-full w-full" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2"
          >
            <div className="rounded-xl bg-gray-900 p-4 text-sm text-white shadow-xl">
              {/* Title */}
              <h4 className="mb-2 font-semibold text-white">
                {content.title}
              </h4>

              {/* Main content */}
              <p className="text-gray-300">
                {content.content}
              </p>

              {/* Formula */}
              {content.formula && (
                <div className="mt-3 rounded-md bg-gray-800 p-2">
                  <code className="font-mono text-xs text-emerald-400">
                    {content.formula}
                  </code>
                </div>
              )}

              {/* Example */}
              {content.example && (
                <div className="mt-3 border-t border-gray-700 pt-3">
                  <span className="text-xs font-medium text-gray-400">Example:</span>
                  <p className="mt-1 text-gray-300">{content.example}</p>
                </div>
              )}

              {/* Benefit */}
              {content.benefit && (
                <div className="mt-3 flex items-start gap-2 rounded-md bg-emerald-900/30 p-2">
                  <span className="text-emerald-400">✓</span>
                  <p className="text-emerald-300">{content.benefit}</p>
                </div>
              )}

              {/* Warning */}
              {content.warning && (
                <div className="mt-3 flex items-start gap-2 rounded-md bg-red-900/30 p-2">
                  <span className="text-red-400">⚠</span>
                  <p className="text-red-300">{content.warning}</p>
                </div>
              )}

              {/* Code */}
              {content.code && (
                <div className="mt-3 rounded-md bg-gray-800 p-2">
                  <code className="font-mono text-xs text-blue-400">
                    {content.code}
                  </code>
                </div>
              )}

              {/* Arrow */}
              <div className="absolute left-1/2 top-full -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Simplified inline tooltip for quick hover hints
interface QuickTooltipProps {
  text: string
  children: React.ReactNode
  className?: string
}

export function QuickTooltip({ text, children, className }: QuickTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <span
      className={cn('relative inline-block', className)}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span className="border-b border-dashed border-gray-400 cursor-help">
        {children}
      </span>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white shadow-lg"
          >
            {text}
            <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}
