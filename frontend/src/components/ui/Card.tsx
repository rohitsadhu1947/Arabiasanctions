import { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'gradient';
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  const variants = {
    default: 'bg-surface-800/50 border border-surface-700/50',
    glass: 'glass',
    gradient: 'gradient-border bg-surface-800/80',
  };

  return (
    <div
      className={cn(
        'rounded-xl p-5',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  );
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h3 className={cn('text-lg font-semibold text-surface-100', className)} {...props}>
      {children}
    </h3>
  );
}

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export function CardDescription({ className, children, ...props }: CardDescriptionProps) {
  return (
    <p className={cn('text-sm text-surface-400 mt-1', className)} {...props}>
      {children}
    </p>
  );
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

