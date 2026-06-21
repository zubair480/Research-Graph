type TypingIndicatorProps = {
  label?: string;
};

export function TypingIndicator({ label = "Thinking" }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1 w-1 rounded-full bg-muted-foreground/60 animate-pulse"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
      <span>{label}</span>
    </div>
  );
}
