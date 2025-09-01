import { useEffect } from "react";
import {
  initializeColorScheme,
  applyContrastVariables,
  colorSchemes,
} from "@/utils/colorUtils";

/**
 * Hook for managing color schemes with automatic contrast calculation
 */
export function useColorScheme(
  schemeName: keyof typeof colorSchemes = "quizchamp"
) {
  useEffect(() => {
    // Initialize the color scheme on mount
    initializeColorScheme(schemeName);
  }, [schemeName]);

  const switchColorScheme = (newSchemeName: keyof typeof colorSchemes) => {
    initializeColorScheme(newSchemeName);
  };

  const updateColors = (colors: Record<string, string>) => {
    applyContrastVariables(colors);
  };

  return {
    currentScheme: schemeName,
    switchColorScheme,
    updateColors,
    availableSchemes: Object.keys(colorSchemes) as Array<
      keyof typeof colorSchemes
    >,
  };
}

