import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Header } from "@/components/thread/Header";
import { DocumentPane, type UploadedDocument } from "@/components/thread/DocumentPane";
import { ChatPane, INITIAL_MESSAGE, type ChatMessage } from "@/components/thread/ChatPane";
import { WorkspaceLayout } from "@/components/thread/WorkspaceLayout";

const API_BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");
const MEMORY_SERVER_ERROR = "Could not reach the server. Check that the backend is running.";

type UploadResponse = {
  filename: string;
  status: string;
  preview?: string;
  summary?: string;
  mermaid_diagram?: string;
  text_preview?: string;
};

type ChatResponse = {
  response: string;
  mermaid_diagram?: string;
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Thread — AI Research Assistant" },
      {
        name: "description",
        content:
          "Upload research papers and converse with an AI assistant to unpack methodology, datasets, and findings.",
      },
      { property: "og:title", content: "Thread — AI Research Assistant" },
      {
        property: "og:description",
        content:
          "Upload research papers and converse with an AI assistant to unpack methodology, datasets, and findings.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [document, setDocument] = useState<UploadedDocument | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [isUploading, setIsUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files are supported.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed (${response.status})`);
      }

      const data = (await response.json()) as UploadResponse;
      const fullSummary = data.summary ?? data.text_preview ?? data.preview ?? "";
      const diagram = data.mermaid_diagram ?? "";

      setDocument({
        filename: data.filename,
        text_preview: fullSummary,
        mermaid_diagram: diagram,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `**${data.filename}** is indexed.\n\nAsk me anything about its methods, data, or results.`,
        },
      ]);
    } catch (err) {
      console.error(err);
      setUploadError(MEMORY_SERVER_ERROR);
      setMessages((prev) => [...prev, { role: "assistant", content: MEMORY_SERVER_ERROR }]);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleSendMessage = useCallback(async (userText: string) => {
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setIsTyping(true);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      if (!response.ok) {
        throw new Error(`Chat failed (${response.status})`);
      }

      const data = (await response.json()) as ChatResponse;

      let assistantContent = data.response;
      if (data.mermaid_diagram) {
        assistantContent += `\n\n\`\`\`mermaid\n${data.mermaid_diagram}\n\`\`\``;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: assistantContent }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", content: MEMORY_SERVER_ERROR }]);
    } finally {
      setIsTyping(false);
    }
  }, []);

  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground">
      <Header isUploading={isUploading} hasDocument={document !== null} onUpload={handleUpload} />
      <WorkspaceLayout
        hasDocument={document !== null}
        documentPane={
          <DocumentPane
            document={document}
            isUploading={isUploading}
            uploadError={uploadError}
            onUpload={handleUpload}
          />
        }
        chatPane={
          <ChatPane
            messages={messages}
            isTyping={isTyping}
            onSendMessage={handleSendMessage}
            hasDocument={document !== null}
          />
        }
      />
    </div>
  );
}
