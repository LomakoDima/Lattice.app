import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'pending' | 'running' | 'completed' | 'failed' | 'waiting' | 'cancelled' | 'low' | 'medium' | 'high' | 'urgent';
  pulse?: boolean;
}

export function Badge({ variant = 'pending', pulse = false, children, className = '', ...props }: BadgeProps) {
  const variants = {
    pending: 'bg-nexus-ink text-neutral-400 border-white/[0.08]',
    running: 'bg-nexus-accent/15 text-nexus-accent border-nexus-accent/35',
    completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
    failed: 'bg-red-500/20 text-red-300 border-red-500/50',
    waiting: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
    cancelled: 'bg-nexus-ink text-neutral-500 border-white/[0.06]',
    low: 'bg-nexus-ink text-neutral-500 border-white/[0.08]',
    medium: 'bg-nexus-accent/12 text-nexus-accent border-nexus-accent/30',
    high: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    urgent: 'bg-red-500/20 text-red-300 border-red-500/50',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border ${variants[variant]} ${pulse ? 'animate-pulse' : ''} ${className}`}
      {...props}
    >
      {pulse && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${variant === 'running' ? 'bg-nexus-accent' : 'bg-amber-400'}`}
        />
      )}
      {children}
    </span>
  );
}
