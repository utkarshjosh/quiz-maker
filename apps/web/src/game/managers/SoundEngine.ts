/**
 * Sound Engine - Singleton audio manager for the game
 * Unity-style: Centralized audio management with preloading and Web Audio API
 *
 * Features:
 * - Preloads all sounds at initialization
 * - Uses Web Audio API for better performance and control
 * - Singleton pattern ensures single audio context
 * - Handles volume control per sound and master volume
 */

import {
  SOUND_CONFIG,
  MASTER_VOLUME,
  type SoundKey,
} from "../config/soundConfig";

export class SoundEngine {
  private static instance: SoundEngine | null = null;

  private audioContext: AudioContext | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private masterGainNode: GainNode | null = null;
  private isInitialized: boolean = false;
  private isEnabled: boolean = true;
  private loadingPromises: Map<string, Promise<void>> = new Map();
  private useFallbackSounds: boolean = false;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): SoundEngine {
    if (!SoundEngine.instance) {
      SoundEngine.instance = new SoundEngine();
    }
    return SoundEngine.instance;
  }

  /**
   * Initialize the sound engine
   * Should be called once at app startup (after user interaction due to browser autoplay policies)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("[SoundEngine] Already initialized");
      return;
    }

    console.log("[SoundEngine] Initializing...");

    try {
      // Create AudioContext
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.audioContext = new AudioContextClass();

      // Create master gain node for volume control
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.gain.value = MASTER_VOLUME;
      this.masterGainNode.connect(this.audioContext.destination);

      // Preload all sounds
      await this.preloadSounds();

      // Check if any sounds loaded successfully
      if (this.audioBuffers.size === 0) {
        console.info(
          "[SoundEngine] 🔊 Using synthesized sounds (audio files not available)"
        );
        this.useFallbackSounds = true;
      } else {
        console.log("[SoundEngine] 🔊 Using audio file sounds");
      }

      this.isInitialized = true;
      console.log("[SoundEngine] ✓ Ready to play sounds");
    } catch (error) {
      console.error("[SoundEngine] Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Preload all sounds defined in sound config
   */
  private async preloadSounds(): Promise<void> {
    console.log("[SoundEngine] Loading audio files...");

    const loadPromises = Object.values(SOUND_CONFIG).map((soundDef) =>
      this.loadSound(soundDef.key, soundDef.path)
    );

    await Promise.allSettled(loadPromises);

    const loadedCount = this.audioBuffers.size;
    const totalCount = Object.keys(SOUND_CONFIG).length;

    if (loadedCount > 0) {
      console.log(
        `[SoundEngine] Loaded ${loadedCount}/${totalCount} audio files`
      );
    } else {
      console.info(
        `[SoundEngine] No audio files available (${totalCount} files are empty or invalid)`
      );
    }
  }

  /**
   * Load a single sound file
   */
  private async loadSound(key: string, path: string): Promise<void> {
    // Check if already loading
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key);
    }

    const loadPromise = (async () => {
      try {
        // Fetch the audio file
        const response = await fetch(path);
        if (!response.ok) {
          console.warn(
            `[SoundEngine] Could not fetch ${key}: HTTP ${response.status}`
          );
          return; // Gracefully skip this file
        }

        // Get the audio data as ArrayBuffer
        const arrayBuffer = await response.arrayBuffer();

        // Check if file is empty
        if (arrayBuffer.byteLength === 0) {
          console.info(`[SoundEngine] Skipping empty file: ${key}`);
          return; // Gracefully skip empty files
        }

        // Decode the audio data
        if (!this.audioContext) {
          throw new Error("AudioContext not initialized");
        }

        const audioBuffer =
          await this.audioContext.decodeAudioData(arrayBuffer);
        this.audioBuffers.set(key, audioBuffer);
        console.log(`[SoundEngine] ✓ Loaded: ${key}`);
      } catch (error) {
        // Don't log as error since we have fallback sounds
        // This is expected behavior for empty/invalid files
        if (error instanceof Error && error.name === "EncodingError") {
          console.info(
            `[SoundEngine] Skipping invalid audio file: ${key} (will use fallback sound)`
          );
        } else {
          console.warn(`[SoundEngine] Could not load ${key}:`, error);
        }
        // Don't throw - allow initialization to continue with fallback sounds
      } finally {
        this.loadingPromises.delete(key);
      }
    })();

    this.loadingPromises.set(key, loadPromise);
    return loadPromise;
  }

  /**
   * Play a sound by key
   */
  async play(soundKey: SoundKey): Promise<void> {
    console.log(`[SoundEngine] 🔊 play() called: ${soundKey}`);

    if (!this.isEnabled) {
      console.log(`[SoundEngine] Sound disabled, skipping: ${soundKey}`);
      return;
    }

    if (!this.isInitialized) {
      console.warn(`[SoundEngine] Not initialized yet, skipping: ${soundKey}`);
      return;
    }

    if (!this.audioContext || !this.masterGainNode) {
      console.warn("[SoundEngine] AudioContext not available");
      return;
    }

    const soundDef = SOUND_CONFIG[soundKey];
    if (!soundDef) {
      console.warn(`[SoundEngine] Sound not found: ${soundKey}`);
      return;
    }

    // Use fallback if audio files didn't load
    if (this.useFallbackSounds) {
      console.log("[SoundEngine] Using fallback sounds");
      await this.playFallbackSound(soundKey);
      return;
    }

    const audioBuffer = this.audioBuffers.get(soundDef.key);
    if (!audioBuffer) {
      console.warn(
        `[SoundEngine] Audio buffer not loaded, using fallback: ${soundKey}`
      );
      await this.playFallbackSound(soundKey);
      return;
    }

    try {
      // Resume audio context if suspended (due to browser autoplay policy)
      if (this.audioContext.state === "suspended") {
        console.log("[SoundEngine] Resuming suspended AudioContext...");
        await this.audioContext.resume();
        console.log(
          `[SoundEngine] AudioContext state: ${this.audioContext.state}`
        );
      }

      // Create a buffer source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;

      // Create gain node for this sound's volume
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = soundDef.volume ?? 1.0;

      // Connect: source -> gain -> master gain -> destination
      source.connect(gainNode);
      gainNode.connect(this.masterGainNode);

      // Set loop if specified
      if (soundDef.loop) {
        source.loop = true;
      }

      // Play the sound
      source.start(0);

      console.log(`[SoundEngine] ✓ Playing: ${soundKey}`);
    } catch (error) {
      console.error(`[SoundEngine] Error playing sound ${soundKey}:`, error);
    }
  }

  /**
   * Play a synthesized fallback sound when audio files are not available
   */
  private async playFallbackSound(soundKey: SoundKey): Promise<void> {
    if (!this.audioContext || !this.masterGainNode) {
      console.warn(
        "[SoundEngine] AudioContext not available for fallback sound"
      );
      return;
    }

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === "suspended") {
        console.log(
          "[SoundEngine] Resuming suspended AudioContext for fallback..."
        );
        await this.audioContext.resume();
        console.log(
          `[SoundEngine] AudioContext state: ${this.audioContext.state}`
        );
      }

      const now = this.audioContext.currentTime;
      const soundDef = SOUND_CONFIG[soundKey];

      // Create oscillator for tone
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      // Variable to store when the sound should stop
      let stopTime = now + 0.1; // Default duration

      // Configure sound based on type
      switch (soundKey) {
        case "CLICK":
          // Short, high-pitched click
          oscillator.frequency.value = 800;
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.3 * (soundDef.volume ?? 1.0), now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          stopTime = now + 0.05;
          break;

        case "ROOM_JOIN":
          // Welcoming ascending chime
          oscillator.frequency.setValueAtTime(440, now); // A4
          oscillator.frequency.linearRampToValueAtTime(554.37, now + 0.1); // C#5
          oscillator.frequency.linearRampToValueAtTime(659.25, now + 0.2); // E5
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.4 * (soundDef.volume ?? 1.0), now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          stopTime = now + 0.3;
          break;

        case "ROOM_LEAVE":
          // Gentle descending farewell
          oscillator.frequency.setValueAtTime(523.25, now); // C5
          oscillator.frequency.linearRampToValueAtTime(392, now + 0.15); // G4
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.35 * (soundDef.volume ?? 1.0), now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          stopTime = now + 0.2;
          break;

        case "GAME_START":
          // Exciting fanfare - ascending progression
          oscillator.frequency.setValueAtTime(392, now); // G4
          oscillator.frequency.linearRampToValueAtTime(523.25, now + 0.15); // C5
          oscillator.frequency.linearRampToValueAtTime(659.25, now + 0.3); // E5
          oscillator.frequency.linearRampToValueAtTime(783.99, now + 0.45); // G5
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.5 * (soundDef.volume ?? 1.0), now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
          stopTime = now + 0.6;
          break;

        case "CORRECT":
          // Pleasant ascending tone
          oscillator.frequency.setValueAtTime(523.25, now); // C5
          oscillator.frequency.linearRampToValueAtTime(659.25, now + 0.1); // E5
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.4 * (soundDef.volume ?? 1.0), now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          stopTime = now + 0.3;
          break;

        case "INCORRECT":
          // Gentle descending tone
          oscillator.frequency.setValueAtTime(293.66, now); // D4
          oscillator.frequency.linearRampToValueAtTime(246.94, now + 0.15); // B3
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.3 * (soundDef.volume ?? 1.0), now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          stopTime = now + 0.2;
          break;

        default:
          // Generic beep
          oscillator.frequency.value = 440;
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.3 * (soundDef.volume ?? 1.0), now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          stopTime = now + 0.1;
      }

      // Connect: oscillator -> gain -> master gain -> destination
      oscillator.connect(gainNode);
      gainNode.connect(this.masterGainNode);

      // Play the sound - must start before scheduling stop
      oscillator.start(now);
      oscillator.stop(stopTime);

      console.log(`[SoundEngine] ✓ Playing fallback sound: ${soundKey}`);
    } catch (error) {
      console.error(
        `[SoundEngine] Error playing fallback sound ${soundKey}:`,
        error
      );
      console.error("Error details:", error);
    }
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    if (!this.masterGainNode) return;

    // Clamp volume between 0 and 1
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.masterGainNode.gain.value = clampedVolume;
  }

  /**
   * Enable/disable sound
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;

    if (!enabled && this.audioContext) {
      // Suspend audio context to save resources
      this.audioContext.suspend();
    } else if (enabled && this.audioContext) {
      // Resume audio context
      this.audioContext.resume();
    }
  }

  /**
   * Check if sound is enabled
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Check if initialized
   */
  getInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup and destroy the sound engine
   */
  destroy(): void {
    console.log("[SoundEngine] Destroying...");

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioBuffers.clear();
    this.loadingPromises.clear();
    this.masterGainNode = null;
    this.isInitialized = false;
    SoundEngine.instance = null;
  }
}

/**
 * Get the sound engine singleton instance
 */
export function getSoundEngine(): SoundEngine {
  return SoundEngine.getInstance();
}
