'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Shield, ArrowRight, ExternalLink } from 'lucide-react'
import { formatCurrencyCompact } from '@/lib/utils'

interface ComparisonSummaryProps {
  traditionalReturns: number
  fcmReturns: number
  difference: number
  rebalanceCount: number
  isVisible: boolean
}

export function ComparisonSummary({
  traditionalReturns,
  fcmReturns,
  difference,
  rebalanceCount,
  isVisible,
}: ComparisonSummaryProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative bg-[#111417] border border-[rgba(53,229,160,0.2)] rounded-xl p-[17px] mb-6 overflow-hidden"
        >
          {/* Inner glow effect */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0px_12px_56px_0px_rgba(52,211,153,0.1)]" />

          {/* Header - centered with icon */}
          <div className="relative flex flex-col items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[rgba(53,229,160,0.2)] flex items-center justify-center">
              <Shield className="w-4 h-4 text-mint" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-mint">FCM Protected Your Position</h3>
              <p className="text-sm text-text-secondary">Traditional lending was liquidated</p>
            </div>
          </div>

          {/* Main comparison - two cards with arrow */}
          <div className="relative flex items-center justify-center gap-4 mb-4">
            {/* Traditional Card */}
            <div className="w-[240px] bg-[#161a1e] rounded-xl px-5 py-6 flex flex-col items-center gap-1">
              <div className="text-[30px] leading-[36px] font-bold text-[#f87171] font-mono">
                {formatCurrencyCompact(traditionalReturns)}
              </div>
              <div className="text-xs text-[rgba(248,113,113,0.6)]">
                Traditional (Lost)
              </div>
            </div>

            {/* Arrow */}
            <div className="w-[120px] flex items-center justify-center">
              <ArrowRight className="w-8 h-8 text-mint" />
            </div>

            {/* FCM Card */}
            <div className="relative w-[240px] bg-[#111417] border border-[rgba(53,229,160,0.2)] rounded-xl px-5 py-6 flex flex-col items-center gap-1 overflow-hidden">
              <div className="absolute inset-0 pointer-events-none shadow-[inset_0px_4px_40px_0px_rgba(52,211,153,0.25)]" />
              <div className="relative text-[30px] leading-[36px] font-bold text-[#f3f6f8] font-mono">
                {formatCurrencyCompact(fcmReturns)}
              </div>
              <div className="relative text-xs text-[#f3f6f8]">
                FCM (Preserved)
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="relative max-w-[632px] mx-auto border-t border-[rgba(255,255,255,0.1)] pt-[17px]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">
                <span className="text-[#60a5fa] font-medium">{rebalanceCount}</span>
                {' '}auto-rebalance{rebalanceCount !== 1 ? 's' : ''} performed
              </span>
              <span className="text-text-secondary">
                Saved{' '}
                <span className="text-mint font-bold font-mono">
                  {formatCurrencyCompact(difference)}
                </span>
              </span>
            </div>
          </div>

          {/* CTA Button */}
          <div className="relative border-t border-[rgba(255,255,255,0.1)] mt-4 pt-[17px] flex justify-center">
            <a
              href="https://developers.flow.com/blockchain-development-tutorials/forte/scheduled-transactions-introduction"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-6 py-3 bg-mint text-[#0a0b0d] rounded-xl hover:bg-mint-hover transition-all font-medium text-base"
            >
              Learn how Scheduled Transactions power FCM
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
