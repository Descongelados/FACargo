import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: { value: number; label: string };
  className?: string;
}

export default function KpiCard({
  title, value, subtitle, icon: Icon, iconColor = 'text-blue-400', trend, className,
}: KpiCardProps) {
  return (
    <div className={cn('bg-slate-800 border border-slate-700/50 rounded-xl p-5', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-400 font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1 truncate">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          {trend && (
            <p className={cn(
              'text-xs mt-1 font-medium',
              trend.value >= 0 ? 'text-emerald-400' : 'text-rose-400'
            )}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn('p-2.5 rounded-lg bg-slate-700/50', iconColor.replace('text-', 'bg-').replace('400', '500/10'))}>
          <Icon className={cn('w-6 h-6', iconColor)} />
        </div>
      </div>
    </div>
  );
}
