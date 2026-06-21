import { useState, type ReactNode } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

type MobileView = "document" | "chat";

type WorkspaceLayoutProps = {
  documentPane: ReactNode;
  chatPane: ReactNode;
  hasDocument: boolean;
};

export function WorkspaceLayout({ documentPane, chatPane, hasDocument }: WorkspaceLayoutProps) {
  const [mobileView, setMobileView] = useState<MobileView>("document");

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 border-b border-border md:hidden">
          {(["document", "chat"] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setMobileView(view)}
              className={cn(
                "flex-1 py-2.5 text-[13px] transition-colors",
                mobileView === view
                  ? "border-b border-foreground font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {view === "document" ? "Document" : "Chat"}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 md:hidden">
          {mobileView === "document" ? documentPane : chatPane}
        </div>

        <ResizablePanelGroup orientation="horizontal" className="hidden min-h-0 flex-1 md:flex">
          <ResizablePanel defaultSize={hasDocument ? 46 : 50} minSize={32}>
            {documentPane}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={hasDocument ? 54 : 50} minSize={36}>
            {chatPane}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </>
  );
}
