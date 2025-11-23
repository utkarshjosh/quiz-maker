/**
 * React Hook for Game Manager
 * Unity-style: Clean React integration for the game system
 */

import { useEffect, useRef, useMemo } from "react";
import { getGameManager, destroyGameManager } from "../managers/GameManager";
import { getWebSocketService } from "../services/WebSocketService";
import { useGameStore } from "../store/gameStore";
import { useAuth } from "@/auth/AuthContext";
import authService from "@/services/authService";
import { config } from "@/config/env";
import {
  isGlobalInitialized,
  isGlobalInitializing,
  setGlobalInitialized,
  setGlobalInitializing,
  resetGlobalFlags,
} from "../utils/flags";

/**
 * Reset global flags (called when cleaning up game system)
 */
export function resetGameManagerFlags(): void {
  resetGlobalFlags();
}

/**
 * Hook to initialize and manage the game system
 * Use this once at the root of your game (e.g., in the immersive index or App)
 */
export function useGameManager() {
  const { isAuthenticated, user } = useAuth();
  const isInitialized = useRef(false);
  const connectionAttempted = useRef(false);

  useEffect(() => {
    // Multiple guards to prevent duplicate initialization
    if (!isAuthenticated || !user) {
      return;
    }

    if (
      isInitialized.current ||
      isGlobalInitialized() ||
      isGlobalInitializing()
    ) {
      console.log("[useGameManager] Already initialized - skipping");
      return;
    }

    // Set flags immediately to prevent race conditions
    isInitialized.current = true;
    setGlobalInitializing(true);

    console.log("[useGameManager] Initializing game system (first time only)");

    // Initialize WebSocket service (singleton)
    const wsService = getWebSocketService({
      url: config.socketUrl,
      protocols: ["quiz-protocol"],
    });

    // Only connect if not already connected or connecting
    if (
      !connectionAttempted.current &&
      wsService.getStatus() === "disconnected"
    ) {
      connectionAttempted.current = true;

      // Get WebSocket token and connect
      authService
        .getWebSocketToken()
        .then((tokenData) => {
          console.log("[useGameManager] Got WebSocket token");

          // Set current player ID in store (so we know who we are)
          // Use the user's sub (subject) as the ID
          const userId = user?.id || tokenData.user.sub;
          useGameStore.getState().setCurrentPlayerId(userId);
          console.log("[useGameManager] Current player ID set:", userId);

          wsService.connect(tokenData.token);
          setGlobalInitialized(true);
          setGlobalInitializing(false);
        })
        .catch((error) => {
          console.error(
            "[useGameManager] Failed to get WebSocket token:",
            error
          );
          setGlobalInitializing(false);
          isInitialized.current = false;
          connectionAttempted.current = false;
        });
    } else {
      console.log(
        "[useGameManager] WebSocket already connected/connecting - skipping"
      );
      setGlobalInitialized(true);
      setGlobalInitializing(false);
    }

    // Initialize game manager (singleton) - async but non-blocking
    const manager = getGameManager();
    manager.initialize().catch((error) => {
      console.error(
        "[useGameManager] Game manager initialization error:",
        error
      );
    });

    // Cleanup on unmount
    return () => {
      console.log(
        "[useGameManager] Component unmounting - keeping game system alive"
      );
      // DON'T destroy on unmount unless it's the last instance
      // This prevents reconnection issues when components remount
    };
  }, [isAuthenticated, user]);

  return getGameManager();
}

/**
 * Hook to access game manager actions
 * Use this in components that need to interact with the game
 */
export function useGameActions() {
  const manager = getGameManager();

  // Memoize actions to prevent infinite re-renders
  return useMemo(
    () => ({
      createRoom: manager.createRoom.bind(manager),
      joinRoom: manager.joinRoom.bind(manager),
      startQuiz: manager.startQuiz.bind(manager),
      submitAnswer: manager.submitAnswer.bind(manager),
      leaveRoom: manager.leaveRoom.bind(manager),
      playSound: manager.playSound.bind(manager),
      setSoundEnabled: manager.setSoundEnabled.bind(manager),
      isSoundEnabled: manager.isSoundEnabled.bind(manager),
      setMasterVolume: manager.setMasterVolume.bind(manager),
    }),
    [manager]
  );
}
