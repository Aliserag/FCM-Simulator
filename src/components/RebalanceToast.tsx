'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw } from 'lucide-react'

interface RebalanceToastProps {
  visible: boolean
  healthBefore: number
  healthAfter: number
}

export function RebalanceToast({ visible, healthBefore, healthAfter }: RebalanceToastProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg px-4 py-3 backdrop-blur-sm shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
              </div>
              <div>
                <div className="text-sm font-medium text-blue-400">FCM Auto-Rebalanced</div>
                <div className="text-xs text-white/60">
                  Health: {healthBefore.toFixed(2)} → {healthAfter.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
