/**
 * Color utility functions for automatic contrast calculation
 */

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(
  hex: string
): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.1 guidelines
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * Returns a value between 1 and 21
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 1;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Get the best contrast color (black or white) for a given background color
 * Returns '#000000' for dark backgrounds, '#ffffff' for light backgrounds
 */
export function getContrastColor(backgroundColor: string): string {
  const whiteContrast = getContrastRatio(backgroundColor, "#ffffff");
  const blackContrast = getContrastRatio(backgroundColor, "#000000");

  return whiteContrast > blackContrast ? "#ffffff" : "#000000";
}

/**
 * Check if a color combination meets WCAG AA standards
 * Returns true if contrast ratio is >= 4.5:1
 */
export function meetsWCAGAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 4.5;
}

/**
 * Check if a color combination meets WCAG AAA standards
 * Returns true if contrast ratio is >= 7:1
 */
export function meetsWCAGAAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 7;
}

/**
 * Generate CSS custom properties for automatic contrast
 * This can be used to dynamically update CSS variables
 */
export function generateContrastVariables(
  colors: Record<string, string>
): Record<string, string> {
  const variables: Record<string, string> = {};

  Object.entries(colors).forEach(([key, color]) => {
    const contrastColor = getContrastColor(color);
    const contrastRatio = getContrastRatio(color, contrastColor);

    variables[`--${key}`] = color;
    variables[`--${key}-contrast`] = contrastColor;
    variables[`--${key}-contrast-ratio`] = contrastRatio.toFixed(2);
  });

  return variables;
}

/**
 * Apply contrast variables to the document root
 * This updates CSS custom properties dynamically
 */
export function applyContrastVariables(colors: Record<string, string>): void {
  const variables = generateContrastVariables(colors);
  const root = document.documentElement;

  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

// Predefined color schemes with automatic contrast
export const colorSchemes = {
  quizchamp: {
    primary: "#6577ff",
    secondary: "#38bdf8",
    accent: "#facc15",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
  },
  dark: {
    primary: "#1e40af",
    secondary: "#0891b2",
    accent: "#eab308",
    success: "#059669",
    warning: "#d97706",
    error: "#dc2626",
  },
  light: {
    primary: "#3b82f6",
    secondary: "#06b6d4",
    accent: "#f59e0b",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
  },
};

/**
 * Initialize color scheme with automatic contrast
 */
export function initializeColorScheme(
  schemeName: keyof typeof colorSchemes = "quizchamp"
): void {
  const scheme = colorSchemes[schemeName];
  applyContrastVariables(scheme);
}

