/**
 * Shared Global Flags - Prevents circular dependencies
 * Used to track initialization state across the game system
 */

// Global flag to prevent multiple initializations across all instances
let globalInitialized = false;
let globalInitializing = false;

export function isGlobalInitialized(): boolean {
  return globalInitialized;
}

export function isGlobalInitializing(): boolean {
  return globalInitializing;
}

export function setGlobalInitialized(value: boolean): void {
  globalInitialized = value;
}

export function setGlobalInitializing(value: boolean): void {
  globalInitializing = value;
}

export function resetGlobalFlags(): void {
  globalInitialized = false;
  globalInitializing = false;
  console.log('[GlobalFlags] Reset - can re-initialize');
}


