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
          className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 rounded-xl p-6 mb-6"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-400">FCM Protected Your Position</h3>
              <p className="text-sm text-white/60">Traditional lending was liquidated</p>
            </div>
          </div>

          {/* Main comparison - big numbers */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-red-400 font-mono">
                {formatCurrencyCompact(traditionalReturns)}
              </div>
              <div className="text-xs text-white/40 mt-1">Traditional (Lost)</div>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />
            </div>

            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">
                {formatCurrencyCompact(fcmReturns)}
              </div>
              <div className="text-xs text-white/40 mt-1">FCM (Preserved)</div>
            </div>
          </div>

          {/* Bottom stats row */}
          <div className="flex flex-col sm:flex-row justify-between gap-2 mt-4 pt-4 border-t border-white/10 text-sm">
            <span className="text-white/60">
              <span className="text-blue-400 font-medium">{rebalanceCount}</span> auto-rebalance{rebalanceCount !== 1 ? 's' : ''} performed
            </span>
            <span className="text-white/60">
              Saved{' '}
              <span className="text-emerald-400 font-bold font-mono">
                {formatCurrencyCompact(difference)}
              </span>
            </span>
          </div>

          {/* CTA to Flow Docs */}
          <div className="mt-4 pt-4 border-t border-white/10 flex justify-center">
            <a
              href="https://developers.flow.com/blockchain-development-tutorials/forte/scheduled-transactions-introduction"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all font-medium"
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
