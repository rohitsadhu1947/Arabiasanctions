import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-900 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-primary-600 text-white hover:bg-primary-500 focus:ring-primary-500 shadow-lg shadow-primary-600/25 hover:shadow-primary-500/30',
      secondary: 'bg-surface-700 text-surface-100 hover:bg-surface-600 focus:ring-surface-500 border border-surface-600',
      ghost: 'text-surface-300 hover:text-surface-100 hover:bg-surface-800 focus:ring-surface-500',
      danger: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500 shadow-lg shadow-red-600/25',
    };
    
    const sizes = {
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

