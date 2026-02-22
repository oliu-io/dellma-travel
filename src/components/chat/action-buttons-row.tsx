"use client";

import { ActionButtonsBlock } from "@/types";
import { Button } from "@/components/ui/button";

interface ActionButtonsRowProps {
  block: ActionButtonsBlock;
  consumed: boolean;
  onAction: (action: string) => void;
}

export function ActionButtonsRow({ block, consumed, onAction }: ActionButtonsRowProps) {
  return (
    <div className="flex flex-wrap gap-2 pl-11">
      {block.buttons.map((btn) => (
        <Button
          key={btn.action}
          variant={consumed ? "outline" : btn.variant}
          size="sm"
          disabled={consumed}
          className={consumed ? "opacity-50 cursor-not-allowed" : ""}
          onClick={() => onAction(btn.action)}
        >
          {btn.label}
        </Button>
      ))}
    </div>
  );
}
