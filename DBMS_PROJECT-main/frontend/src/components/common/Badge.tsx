import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'navy';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
  dotColor?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
  dot = false,
  dotColor,
}) => {
  const variantStyles = {
    default: 'bg-[#F1F5F9] text-[#1E293B] border-[#E2E8F0]',
    navy: 'bg-[#EBF3FC] text-[#173D70] border-[#C7DCF8]',
    success: 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]',
    warning: 'bg-[#FFFBEB] text-[#D97706] border-[#FEF3C7]',
    danger: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
    info: 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]',
    neutral: 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 rounded-md font-medium tracking-wide',
    md: 'text-xs px-2.5 py-1 rounded-md font-medium tracking-wide',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
            dotColor ||
            (variant === 'danger'
              ? 'bg-[#DC2626]'
              : variant === 'success'
              ? 'bg-[#16A34A]'
              : variant === 'warning'
              ? 'bg-[#D97706]'
              : variant === 'info'
              ? 'bg-[#2563EB]'
              : variant === 'navy'
              ? 'bg-[#173D70]'
              : 'bg-[#64748B]')
          }`}
        />
      )}
      {children}
    </span>
  );
};
