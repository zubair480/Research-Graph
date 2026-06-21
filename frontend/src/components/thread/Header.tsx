import { ThemeToggle } from "./ThemeToggle";

type HeaderProps = {
  isUploading: boolean;
  hasDocument: boolean;
  onUpload: (file: File) => void;
};

export function Header({ isUploading, hasDocument, onUpload }: HeaderProps) {
  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4 md:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-[10px] font-semibold text-background">
          T
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[14px] font-medium tracking-[-0.02em]">Thread</span>
          <span className="hidden text-[12px] text-muted-foreground sm:inline">Research</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {hasDocument && !isUploading && (
          <span className="hidden text-[11px] text-muted-foreground sm:inline">Indexed</span>
        )}
        <label
          className={`cursor-pointer rounded-md px-2.5 py-1.5 text-[12px] transition-colors ${
            isUploading
              ? "text-muted-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={isUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
          {isUploading ? "Uploading…" : "Upload"}
        </label>
        <ThemeToggle />
      </div>
    </header>
  );
}
