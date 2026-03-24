import { Rocket } from 'lucide-react';

/** Corner status — balanced: readable, on-brand, not as heavy as the Landing toast. */
export function SiteStatusNotice() {
  return (
    <div
      className="pointer-events-none fixed bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-[max(1.25rem,env(safe-area-inset-right,0px))] z-[100] w-[min(17rem,calc(100vw-2rem))] select-none sm:bottom-6 sm:right-6"
      role="status"
      aria-live="polite"
    >
      <div className="relative overflow-hidden rounded-2xl border border-nexus-accent/25 bg-nexus-panel/90 p-4 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55)] backdrop-blur-md">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-nexus-accent/[0.08] blur-2xl"
        />
        <div className="relative flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-nexus-accent/30 bg-nexus-accent/[0.1]">
            <Rocket className="h-5 w-5 text-nexus-accent" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-nexus-accent/90">Status</p>
            <p className="font-display text-[15px] font-semibold leading-tight text-white">Site is running</p>
            <p className="mt-1 text-[11px] leading-snug text-neutral-500">Workspace is online.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
