export type MermaidThemeMode = "light" | "dark";

/** Readable defaults aligned with Mermaid docs (16px default; we use 18px for UI). */
const READABLE_FONT = "Inter, ui-sans-serif, system-ui, sans-serif";

const LIGHT_VARS = {
  darkMode: false,
  background: "#ffffff",
  fontFamily: READABLE_FONT,
  fontSize: "18px",
  primaryColor: "#f4f4f5",
  primaryTextColor: "#18181b",
  primaryBorderColor: "#71717a",
  secondaryColor: "#fafafa",
  secondaryTextColor: "#27272a",
  secondaryBorderColor: "#a1a1aa",
  tertiaryColor: "#f4f4f5",
  tertiaryTextColor: "#3f3f46",
  tertiaryBorderColor: "#a1a1aa",
  lineColor: "#71717a",
  textColor: "#18181b",
  nodeTextColor: "#18181b",
  mainBkg: "#fafafa",
  nodeBorder: "#a1a1aa",
  clusterBkg: "#f9fafb",
  clusterBorder: "#d4d4d8",
  titleColor: "#52525b",
  edgeLabelBackground: "#ffffff",
};

const DARK_VARS = {
  darkMode: true,
  background: "#18181b",
  fontFamily: READABLE_FONT,
  fontSize: "18px",
  primaryColor: "#27272a",
  primaryTextColor: "#fafafa",
  primaryBorderColor: "#a1a1aa",
  secondaryColor: "#1f1f23",
  secondaryTextColor: "#f4f4f5",
  secondaryBorderColor: "#71717a",
  tertiaryColor: "#27272a",
  tertiaryTextColor: "#e4e4e7",
  tertiaryBorderColor: "#71717a",
  lineColor: "#a1a1aa",
  textColor: "#fafafa",
  nodeTextColor: "#fafafa",
  mainBkg: "#27272a",
  nodeBorder: "#71717a",
  clusterBkg: "#1f1f23",
  clusterBorder: "#52525b",
  titleColor: "#d4d4d8",
  edgeLabelBackground: "#18181b",
};

const READABLE_THEME_CSS = `
  .node rect, .node polygon, .node circle, .node path {
    stroke-width: 1.5px !important;
  }
  .nodeLabel, .label, .edgeLabel, .edgeLabel p, .labelText {
    font-size: 18px !important;
    font-weight: 500 !important;
    line-height: 1.45 !important;
  }
  .cluster-label .nodeLabel, .cluster-label span, .cluster-label p {
    font-size: 15px !important;
    font-weight: 600 !important;
    letter-spacing: 0.02em !important;
  }
  .edgeLabel {
    font-size: 14px !important;
  }
  foreignObject div, foreignObject span, foreignObject p {
    font-size: 18px !important;
    font-weight: 500 !important;
    line-height: 1.45 !important;
    color: inherit !important;
  }
`;

export function resolveMermaidThemeMode(): MermaidThemeMode {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function getMermaidInitConfig(mode: MermaidThemeMode) {
  return {
    startOnLoad: false,
    theme: "base" as const,
    securityLevel: "loose" as const,
    htmlLabels: true,
    fontFamily: READABLE_FONT,
    fontSize: 18,
    themeVariables: mode === "dark" ? DARK_VARS : LIGHT_VARS,
    themeCSS: READABLE_THEME_CSS,
    flowchart: {
      curve: "basis" as const,
      padding: 22,
      nodeSpacing: 64,
      rankSpacing: 72,
      diagramPadding: 24,
      wrappingWidth: 240,
      useMaxWidth: false,
      defaultRenderer: "dagre-wrapper" as const,
    },
  };
}

/** Ensure stored charts use readable init + neutral classes when missing. */
export function enhanceMermaidChart(chart: string): string {
  let trimmed = chart.trim();
  if (!trimmed) return trimmed;

  if (!trimmed.includes("%%{init:")) {
    trimmed = `%%{init: {'theme': 'base', 'themeVariables': {'fontSize': '18px'}, 'flowchart': {'useMaxWidth': false, 'wrappingWidth': 240}}}%%\n${trimmed}`;
  }

  if (trimmed.includes("classDef")) return trimmed;

  const isFlowchart = /^\s*(?:%%\{[\s\S]*?\}%%\s*)?(flowchart|graph)\s/im.test(trimmed);
  if (!isFlowchart) return trimmed;

  const styling = `
    classDef threadInput fill:#fafafa,stroke:#71717a,stroke-width:1.5px,color:#18181b
    classDef threadCore fill:#f4f4f5,stroke:#52525b,stroke-width:1.5px,color:#18181b
    classDef threadEval fill:#fafafa,stroke:#71717a,stroke-width:1.5px,color:#27272a
    classDef threadResult fill:#ffffff,stroke:#18181b,stroke-width:1.5px,color:#18181b
    linkStyle default stroke:#71717a,stroke-width:1.5px
`;

  return `${trimmed}\n${styling.trim()}`;
}

/** Bump undersized SVG text after render (Mermaid sometimes shrinks to fit). */
export function polishSvg(svg: string): string {
  const MIN_PX = 16;

  let out = svg.replace(
    "<svg ",
    '<svg style="max-width:none;width:auto;height:auto;display:block;margin:0 auto;min-width:min(100%,520px)" ',
  );

  out = out.replace(/font-size:\s*(\d+(?:\.\d+)?)px/gi, (_match, size) => {
    const n = parseFloat(size);
    return `font-size: ${Math.max(n, MIN_PX)}px`;
  });

  out = out.replace(/font-size="(\d+(?:\.\d+)?)"/gi, (_match, size) => {
    const n = parseFloat(size);
    return `font-size="${Math.max(n, MIN_PX)}"`;
  });

  return out;
}
