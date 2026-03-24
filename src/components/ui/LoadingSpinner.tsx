interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative">
        <div className={`${sizes[size]} border-2 border-white/[0.08] rounded-full`} />
        <div className={`${sizes[size]} border-2 border-nexus-accent border-t-transparent rounded-full animate-spin absolute inset-0`} />
      </div>
      {text && <p className="text-sm text-neutral-500">{text}</p>}
    </div>
  );
}
