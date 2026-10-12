import { cn } from '../../utils/cn';

interface StatusBadgeProps {
  colorClass: string;
  label: string;
  className?: string;
}

export default function StatusBadge({ colorClass, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
