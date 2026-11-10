import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Loading...',
  size = 'md',
  fullHeight = false,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-slate-500 ${
        fullHeight ? 'min-h-[300px]' : 'py-8'
      }`}
    >
      <Loader2 className={`${sizeClasses[size]} animate-spin text-slate-700`} />
      {label && <p className="text-xs font-medium text-slate-600">{label}</p>}
    </div>
  );
};

