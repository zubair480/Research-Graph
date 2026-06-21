import type { ReactNode, RefObject } from "react";

type PaneShellProps = {
  label: string;
  meta?: ReactNode;
  status?: "idle" | "ready" | "loading" | "waiting";
  children: ReactNode;
  footer?: ReactNode;
  scrollRef?: RefObject<HTMLDivElement | null>;
};

const STATUS_LABEL: Record<NonNullable<PaneShellProps["status"]>, string> = {
  idle: "Idle",
  ready: "Ready",
  loading: "Working",
  waiting: "Waiting",
};

export function PaneShell({ label, meta, status, children, footer, scrollRef }: PaneShellProps) {
  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="sticky top-0 z-10 shrink-0 border-b border-border/80 bg-background/95 px-5 py-3 backdrop-blur-sm md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {label}
            </p>
            {meta && (
              <p className="mt-0.5 truncate text-[13px] text-foreground/90">{meta}</p>
            )}
          </div>
          {status && (
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  status === "ready"
                    ? "bg-emerald-500/80"
                    : status === "loading"
                      ? "animate-pulse bg-amber-500/80"
                      : status === "waiting"
                        ? "bg-muted-foreground/40"
                        : "bg-muted-foreground/30"
                }`}
              />
              <span className="text-[11px] text-muted-foreground">{STATUS_LABEL[status]}</span>
            </div>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="thread-scroll min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>

      {footer && (
        <footer className="shrink-0 border-t border-border/80 bg-background/95 px-5 py-3 backdrop-blur-sm md:px-6">
          {footer}
        </footer>
      )}
    </section>
  );
}
