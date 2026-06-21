const MERMAID_BLOCK_RE = /```mermaid\s*([\s\S]*?)```/i;

export function extractMermaidDiagram(content: string): {
  prose: string;
  diagram: string | null;
} {
  const match = content.match(MERMAID_BLOCK_RE);
  if (!match) {
    return { prose: content, diagram: null };
  }
  return {
    prose: content.replace(match[0], "").trim(),
    diagram: match[1].trim(),
  };
}

export const DEMO_MERMAID = `flowchart TD
    A[Upload PDF] --> B[Extract Text]
    B --> C[Summarize Methodology]
    C --> D[Store in Memory]
    D --> E[Chat with Context]`;
