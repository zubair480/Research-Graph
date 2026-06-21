import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { PaneShell } from "./PaneShell";
import { SuggestedPrompts } from "./SuggestedPrompts";
import { TypingIndicator } from "./TypingIndicator";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Upload a paper to start. I can walk through **methodology**, **datasets**, **results**, or draw a **pipeline graph**.",
};

type ChatPaneProps = {
  messages: ChatMessage[];
  isTyping: boolean;
  onSendMessage: (message: string) => void;
  hasDocument: boolean;
};

export function ChatPane({ messages, isTyping, onSendMessage, hasDocument }: ChatPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;
    setDraft("");
    onSendMessage(trimmed);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(draft);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(draft);
    }
  }

  const showPrompts = hasDocument && messages.length <= 2 && !isTyping;
  const paneStatus = isTyping ? "loading" : hasDocument ? "ready" : "waiting";

  const composer = (
    <form onSubmit={handleSubmit} className="relative">
      <div className="rounded-xl border border-border bg-muted/20 transition-colors focus-within:border-foreground/20 focus-within:bg-background">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={hasDocument ? "Ask about this paper…" : "Upload a paper first…"}
          disabled={isTyping || !hasDocument}
          rows={1}
          className="block w-full resize-none bg-transparent px-4 py-3 pr-12 text-[14px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={isTyping || !draft.trim() || !hasDocument}
          className="absolute bottom-2.5 right-2.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-85 disabled:opacity-25"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground/70">
        Enter to send · Shift+Enter for new line
      </p>
    </form>
  );

  return (
    <PaneShell
      label="Assistant"
      meta="Research chat"
      status={paneStatus}
      footer={composer}
      scrollRef={scrollRef}
    >
      <div className="mx-auto max-w-2xl space-y-8 px-5 py-6 md:px-6 md:py-8">
          {messages.map((m, i) => (
            <div key={i} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
              <MessageBubble role={m.role} content={m.content} />
            </div>
          ))}

          {isTyping && <TypingIndicator />}

          {showPrompts && (
            <div className="space-y-3 border-t border-border/60 pt-6 animate-in fade-in duration-500">
              <p className="text-[12px] text-muted-foreground">Suggested</p>
              <SuggestedPrompts onSelect={send} disabled={isTyping} />
            </div>
          )}
        </div>
    </PaneShell>
  );
}
