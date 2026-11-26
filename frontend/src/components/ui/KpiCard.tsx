import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  change?: number
  changeLabel?: string
  gradient: string
  textColor?: string
  bgPattern?: string
}

export default function KpiCard({
  title, value, icon, change, changeLabel, gradient, textColor = 'text-white'
}: KpiCardProps) {
  const isPositive = change !== undefined ? change >= 0 : null

  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl p-5 card-hover cursor-pointer',
      gradient
    )}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-white/10" />
      <div className="absolute bottom-0 right-6 w-16 h-16 rounded-full translate-y-6 bg-white/5" />

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          <p className={cn('text-xs font-medium opacity-80 mb-1', textColor)}>{title}</p>
          <p className={cn('text-2xl font-bold mt-1', textColor)}>{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive ? (
                <TrendingUp size={12} className="text-white/70" />
              ) : (
                <TrendingDown size={12} className="text-white/70" />
              )}
              <span className={cn('text-xs font-medium', textColor, 'opacity-80')}>
                {isPositive ? '+' : ''}{change}% {changeLabel || 'ce mois'}
              </span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur flex-shrink-0">
          <span className={cn(textColor, 'opacity-90')}>{icon}</span>
        </div>
      </div>
    </div>
  )
}
