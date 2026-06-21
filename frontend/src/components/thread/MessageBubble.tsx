import { extractMermaidDiagram } from "@/lib/mermaid-utils";
import { MarkdownContent } from "./MarkdownContent";
import { MermaidDiagram } from "./MermaidDiagram";

type Role = "user" | "assistant";

export function MessageBubble({ role, content }: { role: Role; content: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[90%] rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-[14px] leading-relaxed text-background">
          {content}
        </div>
      </div>
    );
  }

  const { prose, diagram } = extractMermaidDiagram(content);

  return (
    <article className="max-w-none space-y-6">
      {prose.trim() && <MarkdownContent content={prose} variant="compact" />}
      {diagram && <MermaidDiagram chart={diagram} title="Pipeline" />}
    </article>
  );
}
