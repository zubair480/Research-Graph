import { useRef, useState } from "react";
import { MarkdownContent } from "./MarkdownContent";
import { MermaidDiagram } from "./MermaidDiagram";
import { PaneShell } from "./PaneShell";
import { formatFilename } from "@/lib/format";

export type UploadedDocument = {
  filename: string;
  text_preview: string;
  mermaid_diagram?: string;
};

type DocumentPaneProps = {
  document: UploadedDocument | null;
  isUploading: boolean;
  uploadError: string | null;
  onUpload: (file: File) => void;
};

function UploadSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-6 py-16 animate-in fade-in duration-300">
      <div className="h-2 w-24 rounded-full bg-muted animate-pulse" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded-full bg-muted/80 animate-pulse" />
        <div className="h-3 w-5/6 rounded-full bg-muted/60 animate-pulse" />
        <div className="h-3 w-4/6 rounded-full bg-muted/40 animate-pulse" />
      </div>
      <p className="pt-2 text-center text-[13px] text-muted-foreground">Extracting and indexing…</p>
    </div>
  );
}

export function DocumentPane({ document, isUploading, uploadError, onUpload }: DocumentPaneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeSection, setActiveSection] = useState<"pipeline" | "summary">("summary");

  function handleFile(file: File | undefined) {
    if (!file || isUploading) return;
    onUpload(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  const paneStatus = isUploading ? "loading" : document ? "ready" : "waiting";

  return (
    <PaneShell
      label="Document"
      meta={document ? formatFilename(document.filename) : "No paper loaded"}
      status={paneStatus}
      footer={
        document ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="text-[12px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            Replace document
          </button>
        ) : undefined
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {isUploading && !document ? (
        <UploadSkeleton />
      ) : document ? (
        <div className="mx-auto max-w-2xl px-5 py-6 md:px-6 md:py-8">
          {document.mermaid_diagram && (
            <nav className="mb-6 flex gap-1 rounded-lg border border-border p-0.5">
              {(
                [
                  ["summary", "Summary"],
                  ["pipeline", "Pipeline"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-[12px] transition-colors ${
                    activeSection === id
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          )}

          <div className="animate-in fade-in duration-300">
            {activeSection === "pipeline" && document.mermaid_diagram ? (
              <MermaidDiagram chart={document.mermaid_diagram} title="Methodology pipeline" />
            ) : (
              <MarkdownContent content={document.text_preview} variant="document" />
            )}
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className="flex h-full min-h-[320px] items-center justify-center px-5 py-12 md:px-6"
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className={`group w-full max-w-md rounded-xl border border-dashed px-8 py-16 text-center transition-all duration-200 disabled:opacity-50 ${
              isDragging
                ? "border-foreground/25 bg-muted/60 scale-[1.01]"
                : "border-border hover:border-foreground/15 hover:bg-muted/30"
            }`}
          >
            <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors group-hover:border-foreground/20 group-hover:text-foreground">
              <span className="text-lg leading-none">+</span>
            </div>
            <p className="text-[15px] font-medium tracking-[-0.01em] text-foreground">
              Add a research paper
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Drop a PDF here or click to browse.
              <br />
              Thread will extract methodology, datasets, and results.
            </p>
          </button>
        </div>
      )}

      {uploadError && (
        <p className="px-5 pb-4 text-[13px] text-destructive md:px-6" role="alert">
          {uploadError}
        </p>
      )}
    </PaneShell>
  );
}
