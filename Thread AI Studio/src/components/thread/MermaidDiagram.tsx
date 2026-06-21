import { useEffect, useRef, useState } from "react";
import {
  enhanceMermaidChart,
  getMermaidInitConfig,
  polishSvg,
  resolveMermaidThemeMode,
  type MermaidThemeMode,
} from "@/lib/mermaid-theme";

type MermaidDiagramProps = {
  chart: string;
  title?: string;
};

let renderCounter = 0;

function sanitizeChart(chart: string): string {
  return chart
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .trim();
}

export function MermaidDiagram({ chart, title = "Pipeline" }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderId = useRef(`thread-graph-${++renderCounter}`);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<MermaidThemeMode>(() => resolveMermaidThemeMode());

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setThemeMode(resolveMermaidThemeMode());
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const cleaned = enhanceMermaidChart(sanitizeChart(chart));
    if (!container || !cleaned) {
      setStatus("error");
      setErrorMessage("No diagram data");
      return;
    }

    let cancelled = false;

    async function renderDiagram() {
      setStatus("loading");
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize(getMermaidInitConfig(themeMode));

        const id = `${renderId.current}-${Date.now()}`;
        const { svg } = await mermaid.render(id, cleaned);

        if (!cancelled && container) {
          container.innerHTML = polishSvg(svg);
          setStatus("ready");
          setErrorMessage(null);
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(err instanceof Error ? err.message : "Render failed");
        }
      }
    }

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [chart, themeMode]);

  return (
    <div className="thread-mermaid">
      <p className="mb-3 text-[13px] text-muted-foreground">{title}</p>

      {status === "loading" && (
        <div className="flex h-36 items-center justify-center rounded-lg border border-border bg-muted/20">
          <p className="text-[13px] text-muted-foreground">Rendering…</p>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-lg border border-border p-4">
          <p className="text-[13px] text-destructive">
            Could not render{errorMessage ? `: ${errorMessage}` : ""}
          </p>
        </div>
      )}

      <div
        ref={containerRef}
        className={`thread-mermaid-canvas overflow-x-auto rounded-lg border border-border bg-muted/10 px-6 py-8 ${
          status === "ready" ? "block" : "hidden"
        }`}
      />
    </div>
  );
}
