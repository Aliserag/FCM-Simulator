'use client'

import { Trophy, TrendingUp, Scale } from 'lucide-react'
import { formatCurrencyCompact } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface OutcomeBadgeProps {
  traditionalStatus: 'healthy' | 'warning' | 'liquidated'
  returnsDifference: number
}

export function OutcomeBadge({ traditionalStatus, returnsDifference }: OutcomeBadgeProps) {
  const getOutcomeState = () => {
    if (traditionalStatus === 'liquidated') {
      return {
        label: 'FCM Wins',
        sublabel: 'Traditional liquidated',
        color: 'emerald' as const,
        icon: <Trophy className="w-4 h-4" />,
      }
    }
    if (returnsDifference > 100) {
      return {
        label: `+${formatCurrencyCompact(returnsDifference)}`,
        sublabel: 'FCM advantage',
        color: 'emerald' as const,
        icon: <TrendingUp className="w-4 h-4" />,
      }
    }
    if (returnsDifference < -100) {
      return {
        label: formatCurrencyCompact(returnsDifference),
        sublabel: 'Traditional ahead',
        color: 'amber' as const,
        icon: <TrendingUp className="w-4 h-4" />,
      }
    }
    return {
      label: 'Even',
      sublabel: 'Positions similar',
      color: 'white' as const,
      icon: <Scale className="w-4 h-4" />,
    }
  }

  const outcome = getOutcomeState()

  return (
    <div
      className={cn(
        'bg-white/5 rounded-xl p-3 border border-white/10',
        outcome.color === 'emerald' && 'border-emerald-500/30 bg-emerald-500/5',
        outcome.color === 'amber' && 'border-amber-500/30 bg-amber-500/5'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-white/50">Outcome</span>
        <span
          className={cn(
            outcome.color === 'emerald' ? 'text-emerald-400' :
            outcome.color === 'amber' ? 'text-amber-400' : 'text-white/60'
          )}
        >
          {outcome.icon}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            'text-lg font-semibold font-mono',
            outcome.color === 'emerald' ? 'text-emerald-400' :
            outcome.color === 'amber' ? 'text-amber-400' : 'text-white'
          )}
        >
          {outcome.label}
        </span>
      </div>
      <span className="text-xs text-white/40">{outcome.sublabel}</span>
    </div>
  )
}
