import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  trend?: {
    text: string;
    positive?: boolean;
  };
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  description,
  badge,
  icon,
  trend,
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs transition-all duration-150 ${
        onClick
          ? 'cursor-pointer hover:border-[#315F91]/40 hover:shadow-academic hover:-translate-y-0.5'
          : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {badge}
          {icon && <span className="text-[#315F91]">{icon}</span>}
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className="text-3xl font-bold tracking-tight text-[#1E293B] font-tabular">
          {value}
        </div>
        {trend && (
          <span
            className={`text-xs font-medium ${
              trend.positive ? 'text-[#16A34A]' : 'text-[#64748B]'
            }`}
          >
            {trend.text}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-1.5 text-xs text-[#64748B] line-clamp-1">{description}</p>
      )}
    </div>
  );
};
