"use client";

// ============================================================================
// DeLLMa Framework Chat Flow — Generic orchestrator
// ============================================================================

import { useStore } from "./store";
import { getDomainConfig } from "./active-domain";

/**
 * Seed the initial chat blocks when the chat container mounts.
 * Called once on mount (if chatBlocks is empty).
 */
export function seedInitialChat() {
  const store = useStore.getState();
  if (store.chatBlocks.length > 0) return; // already seeded

  const config = getDomainConfig();
  const blocks = config.seedChat();
  for (const block of blocks) {
    store.addChatBlock(block);
  }
}

/**
 * Central action dispatcher — handles all button clicks from ActionButtonsRow.
 * Delegates to domain-specific handlers via the active domain config.
 */
export async function dispatchChatAction(action: string) {
  const config = getDomainConfig();
  const handler = config.actionHandlers[action];
  if (handler) {
    await handler();
  } else {
    console.warn(`Unknown chat action: ${action}`);
  }
}
