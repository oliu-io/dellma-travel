// ============================================================================
// Active Domain — Module-level singleton for the current domain config
// ============================================================================

import type { DomainConfig } from "./domain-config";

let _activeDomain: DomainConfig | null = null;

export function setActiveDomain(config: DomainConfig) {
  _activeDomain = config;
}

export function getDomainConfig(): DomainConfig {
  if (!_activeDomain) {
    throw new Error("No domain configured. Call setActiveDomain() first.");
  }
  return _activeDomain;
}
