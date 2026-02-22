// ============================================================================
// DomainConfig — The interface every DMUU domain implements
// ============================================================================

import type { LucideIcon } from "lucide-react";
import type { AgentId, NewChatBlock } from "./types";
import type { ComponentType } from "react";

/** A DMUU domain defines everything needed to run the DeLLMa pipeline in one problem domain. */
export interface DomainConfig {
  /** Unique domain key, e.g. "travel", "hiring", "investment" */
  id: string;

  /** Display name for the header */
  name: string;

  /** Subtitle shown below the name */
  subtitle: string;

  /** Icon for the header */
  HeaderIcon: LucideIcon;

  // ── Pipeline Stage Definitions ──────────────────────────────────────

  /** Ordered list of stage keys. */
  stages: StageDefinition[];

  // ── Agent Metadata ──────────────────────────────────────────────────

  /** Maps agent IDs to their display metadata */
  agentMeta: Record<AgentId, AgentMeta>;

  // ── Preference Dimensions ──────────────────────────────────────────

  /** The utility dimensions users weight. Travel has 4; other domains could have 3-8. */
  preferenceDimensions: PreferenceDimension[];

  /** Default weight per dimension (must sum to 1.0) */
  defaultWeights: Record<string, number>;

  // ── Domain Entity (the "actions" in DMUU) ──────────────────────────

  /** The generic name for actions: "destination" (travel), "candidate" (hiring), etc. */
  actionLabel: { singular: string; plural: string };

  // ── Chat Flow (the domain-specific orchestration) ──────────────────

  /** Returns the chat blocks to seed when the chat starts */
  seedChat: () => NewChatBlock[];

  /** Action dispatcher: maps action strings to handler functions */
  actionHandlers: Record<string, () => Promise<void> | void>;

  // ── Block Registry ─────────────────────────────────────────────────

  /** Domain-specific block kinds and their React components */
  blockRegistry: Record<string, ComponentType<{ locked: boolean }>>;

  // ── Prompt Builders ────────────────────────────────────────────────

  /** Domain-specific system prompt for the BT ranking step */
  buildRankingSystemPrompt: () => string;

  /** Domain-specific scenario label prefix for each action in BT ranking */
  buildRankingScenarioLabel: (actionLabel: string) => string;

  // ── Domain Store Extension ─────────────────────────────────────────

  /** Initial state for domain-specific store fields */
  initialDomainState: Record<string, unknown>;

  /** Domain-specific store actions creator */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createDomainActions: (set: any, get: any) => Record<string, (...args: any[]) => void>;
}

export interface StageDefinition {
  key: string;        // e.g. "setup", "forecast"
  label: string;      // e.g. "Trip Setup", "Forecasting"
  Icon: LucideIcon;   // Stage divider icon
}

export interface AgentMeta {
  Icon: LucideIcon;
  label: string;
  color: string;      // Tailwind text color class
  bgColor: string;    // Tailwind bg color class
}

export interface PreferenceDimension {
  key: string;        // e.g. "experience"
  label: string;      // e.g. "Experience"
  Icon: LucideIcon;
  description: string; // e.g. "Weather, activities, cultural richness"
}
