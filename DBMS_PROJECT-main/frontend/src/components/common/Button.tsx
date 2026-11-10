import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173D70]/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none';

  const variants = {
    primary:
      'bg-[#173D70] text-white hover:bg-[#0F294D] shadow-xs active:bg-[#0A1C35] border border-transparent',
    secondary:
      'bg-[#EBF3FC] text-[#173D70] hover:bg-[#D9EAFB] active:bg-[#C7DCF8] border border-[#C7DCF8]/60 font-semibold',
    outline:
      'border border-[#E2E8F0] bg-white text-[#1E293B] hover:bg-[#F5F7FA] hover:text-[#173D70] hover:border-[#CBD5E1] shadow-2xs active:bg-[#E2E8F0]',
    destructive:
      'bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-xs active:bg-[#991B1B] border border-transparent',
    ghost:
      'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#173D70] active:bg-[#E2E8F0]',
    link:
      'text-[#173D70] underline-offset-4 hover:underline p-0 h-auto font-medium',
  };

  const sizes = {
    sm: 'text-xs h-8 px-3 gap-1.5',
    md: 'text-sm h-9 px-4 gap-2',
    lg: 'text-base h-10 px-5 gap-2.5',
    icon: 'h-9 w-9 p-0',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-current" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
};
