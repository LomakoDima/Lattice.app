import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  glass?: boolean;
}

export function Card({ children, hover = false, glass = false, className = '', ...props }: CardProps) {
  const baseStyles = 'rounded-2xl transition-all duration-300';
  const glassStyles = glass
    ? 'border border-nexus-line bg-nexus-panel shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]'
    : 'bg-nexus-panel border border-nexus-line';
  const hoverStyles = hover
    ? 'hover:border-nexus-accent/20 hover:-translate-y-0.5 hover:shadow-[0_16px_48px_-16px_rgba(0,0,0,0.55)]'
    : '';

  return (
    <div className={`${baseStyles} ${glassStyles} ${hoverStyles} ${className}`} {...props}>
      {children}
    </div>
  );
}
