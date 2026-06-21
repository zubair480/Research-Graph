import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidDiagram } from "./MermaidDiagram";

type MarkdownContentProps = {
  content: string;
  className?: string;
  variant?: "default" | "compact" | "document";
};

const MERMAID_BLOCK_RE = /```mermaid\s*([\s\S]*?)```/g;

export const markdownComponents = {
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="mb-4 mt-0 text-[15px] font-medium tracking-[-0.02em] text-foreground">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="mb-2 mt-8 text-[13px] font-medium text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="mb-2 mt-5 text-[14px] font-medium text-foreground">{children}</h3>
  ),
  h4: ({ children }: { children?: ReactNode }) => (
    <h4 className="mb-1.5 mt-4 text-[13px] font-medium text-muted-foreground">{children}</h4>
  ),
  p: ({ children }: { children?: ReactNode }) => (
    <p className="text-[14px] leading-[1.75] text-foreground/90 [&:not(:first-child)]:mt-3">
      {children}
    </p>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="my-3 space-y-2 text-[14px] text-foreground/90">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="my-3 list-decimal space-y-2 pl-5 text-[14px] text-foreground/90">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="relative pl-4 leading-[1.7] before:absolute before:left-0 before:top-[0.65em] before:h-px before:w-2 before:bg-muted-foreground/40">
      {children}
    </li>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-medium text-foreground">{children}</strong>
  ),
  em: ({ children }: { children?: ReactNode }) => (
    <em className="text-foreground/85">{children}</em>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="my-4 border-l border-border pl-4 text-[14px] leading-relaxed text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-border" />,
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-foreground underline decoration-border underline-offset-[3px] transition-colors hover:decoration-foreground/40"
    >
      {children}
    </a>
  ),
  table: ({ children }: { children?: ReactNode }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full min-w-[280px] text-left text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: ReactNode }) => (
    <thead className="border-b border-border text-muted-foreground">{children}</thead>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="px-2 py-2 font-medium">{children}</th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="border-t border-border px-2 py-2 text-foreground/90">{children}</td>
  ),
  pre: ({ children }: { children?: ReactNode }) => {
    const child = Array.isArray(children) ? children[0] : children;
    if (
      isValidElement(child) &&
      typeof child.props === "object" &&
      child.props !== null &&
      "className" in child.props &&
      typeof child.props.className === "string" &&
      child.props.className.includes("language-mermaid")
    ) {
      const code = String((child.props as { children?: ReactNode }).children ?? "").trim();
      return <MermaidDiagram chart={code} />;
    }
    return (
      <pre className="my-3 overflow-x-auto rounded-md bg-muted/40 px-3 py-2.5 text-[13px] leading-relaxed">
        {children}
      </pre>
    );
  },
  code: ({
    className,
    children,
    ...props
  }: {
    className?: string;
    children?: ReactNode;
  }) => {
    if (className?.includes("language-mermaid")) {
      return <MermaidDiagram chart={String(children).trim()} />;
    }
    if (className) {
      return (
        <code className="block font-mono text-[13px]" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[13px]" {...props}>
        {children}
      </code>
    );
  },
};

function extractMermaidBlocks(content: string): Array<{ type: "text" | "mermaid"; value: string }> {
  const parts: Array<{ type: "text" | "mermaid"; value: string }> = [];
  let lastIndex = 0;

  for (const match of content.matchAll(MERMAID_BLOCK_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, start) });
    }
    parts.push({ type: "mermaid", value: match[1].trim() });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ type: "text", value: content });
  }

  return parts;
}

function MarkdownText({ content }: { content: string }) {
  if (!content.trim()) return null;

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  );
}

const variantClasses: Record<NonNullable<MarkdownContentProps["variant"]>, string> = {
  default: "thread-prose",
  compact: "thread-prose thread-prose-compact",
  document: "thread-prose thread-prose-document",
};

export function MarkdownContent({
  content,
  className = "",
  variant = "default",
}: MarkdownContentProps) {
  const parts = extractMermaidBlocks(content);

  return (
    <div className={`${variantClasses[variant]} ${className}`}>
      {parts.map((part, index) =>
        part.type === "mermaid" ? (
          <MermaidDiagram key={`mermaid-${index}`} chart={part.value} />
        ) : (
          <MarkdownText key={`text-${index}`} content={part.value} />
        ),
      )}
    </div>
  );
}
