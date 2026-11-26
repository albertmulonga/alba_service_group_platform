import React from 'react'
import { ChevronRight } from 'lucide-react'

interface Breadcrumb { label: string; path?: string }

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: Breadcrumb[]
  actions?: React.ReactNode
  icon?: React.ReactNode
  iconBg?: string
}

export default function PageHeader({ title, subtitle, breadcrumbs, actions, icon, iconBg }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        {icon && (
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${iconBg || 'gradient-primary'}`}>
            {icon}
          </div>
        )}
        <div>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1.5 mb-1">
              {breadcrumbs.map((b, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight size={12} className="text-gray-400" />}
                  <span className={`text-xs ${i === breadcrumbs.length - 1 ? 'text-gray-500 font-medium' : 'text-gray-400'}`}>
                    {b.label}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
          <h1 className="text-xl font-bold text-gray-800">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
