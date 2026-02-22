"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useStore } from "@/lib/dellma/store";
import { seedInitialChat, dispatchChatAction } from "@/lib/dellma/chat-flow";
import { getDomainConfig } from "@/lib/dellma/active-domain";
import { BlockRenderer } from "./chat/block-renderer";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2 } from "lucide-react";

export function ChatContainer() {
  const { chatBlocks, stage, loading, reset } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const config = getDomainConfig();

  const stageOrder = config.stages.map((s) => s.key);

  // Track which action-button blocks have been consumed (clicked)
  const [consumedBlocks, setConsumedBlocks] = useState<Set<string>>(new Set());

  // Seed initial chat on mount
  useEffect(() => {
    seedInitialChat();
  }, []);

  // Auto-scroll on new blocks or loading changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatBlocks.length, loading]);

  const handleAction = useCallback(
    async (blockId: string, action: string) => {
      setConsumedBlocks((prev) => new Set(prev).add(blockId));
      await dispatchChatAction(action);
    },
    []
  );

  // Determine locked stage index
  const currentStageIdx = stageOrder.indexOf(stage);

  // Find stage dividers to determine which blocks are in which stage
  const stageDividerIndices: { idx: number; stage: string }[] = [];
  chatBlocks.forEach((block, idx) => {
    if (block.kind === "stage-divider") {
      const title = (block as { title: string }).title;
      // Map title back to stage key — try label match
      const stageKey = config.stages.find((s) => title.includes(s.label))?.key;
      if (stageKey) stageDividerIndices.push({ idx, stage: stageKey });
    }
  });

  function isBlockLocked(blockIndex: number): boolean {
    let blockStage = stageOrder[0] ?? "setup";
    for (const sd of stageDividerIndices) {
      if (blockIndex >= sd.idx) blockStage = sd.stage;
    }
    const blockStageIdx = stageOrder.indexOf(blockStage);
    return blockStageIdx < currentStageIdx;
  }

  const handleReset = useCallback(() => {
    setConsumedBlocks(new Set());
    reset();
    setTimeout(() => seedInitialChat(), 0);
  }, [reset]);

  const { HeaderIcon } = config;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <HeaderIcon className="w-5 h-5 text-primary" strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                {config.name}
              </h1>
              <p className="text-xs text-muted-foreground">
                {config.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Thinking...
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Start over
            </Button>
          </div>
        </div>
      </header>

      {/* Scrollable chat feed */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
          {chatBlocks.map((block, idx) => (
            <BlockRenderer
              key={block.id}
              block={block}
              locked={isBlockLocked(idx)}
              consumed={
                block.kind === "action-buttons"
                  ? consumedBlocks.has(block.id)
                  : false
              }
              onAction={(action) => handleAction(block.id, action)}
            />
          ))}
          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center gap-3 pl-11">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-xs text-muted-foreground italic">Agents are thinking...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Bottom progress bar */}
      <footer className="border-t border-border/60 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky bottom-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-2 flex items-center justify-center gap-2">
          {config.stages.map((s, idx) => {
            const isCurrent = s.key === stage;
            const isPast = idx < currentStageIdx;
            return (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    isCurrent
                      ? "bg-primary"
                      : isPast
                        ? "bg-primary/40"
                        : "bg-muted-foreground/20"
                  }`}
                />
                <span
                  className={`text-xs ${
                    isCurrent
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
                {idx < config.stages.length - 1 && (
                  <div className="w-6 h-px bg-border" />
                )}
              </div>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
