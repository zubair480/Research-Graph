const PROMPTS = [
  "What is the core methodology?",
  "Which datasets were used?",
  "Summarize key results",
  "Create a graph",
] as const;

type SuggestedPromptsProps = {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

export function SuggestedPrompts({ onSelect, disabled }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROMPTS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(prompt)}
          className="rounded-full border border-border bg-background px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/50 hover:text-foreground disabled:opacity-40"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
