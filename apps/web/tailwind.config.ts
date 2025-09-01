import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import daisyui from "daisyui";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        "quiz-pink": "var(--quiz-pink)",
        "quiz-blue": "var(--quiz-blue)",
        "quiz-yellow": "var(--quiz-yellow)",
        "quiz-green": "var(--quiz-green)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "bounce-in": {
          "0%": {
            transform: "scale(0.3)",
            opacity: "0",
          },
          "50%": {
            transform: "scale(1.05)",
            opacity: "1",
          },
          "70%": {
            transform: "scale(0.9)",
          },
          "100%": {
            transform: "scale(1)",
          },
        },
        "slide-up": {
          "0%": {
            transform: "translateY(100%)",
            opacity: "0",
          },
          "100%": {
            transform: "translateY(0)",
            opacity: "1",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "bounce-in": "bounce-in 0.5s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
      },
      boxShadow: {
        quiz: "var(--quiz-shadow)",
        "quiz-hover": "var(--quiz-shadow-hover)",
      },
    },
  },
  plugins: [tailwindcssAnimate, daisyui],
  daisyui: {
    themes: [
      {
        quizchamp: {
          primary: "#6577ff", // Playful blue - main brand color
          "primary-content": "#ffffff", // White text on blue
          secondary: "#38bdf8", // Light sky blue - secondary brand color
          "secondary-content": "#ffffff", // White text on secondary blue
          accent: "#facc15", // Cheerful yellow - accent color
          "accent-content": "#000000", // Black text on yellow
          neutral: "#6b7280", // Medium gray - neutral color
          "neutral-content": "#ffffff", // White text on neutral
          "base-100": "#fefefe", // Off-white background (controlled by CSS variables)
          "base-200": "#f9fafb", // Light gray for subtle backgrounds
          "base-300": "#e5e7eb", // Medium gray for borders
          "base-content": "#475569", // Slate gray text
          info: "#38bdf8", // Sky blue for info
          "info-content": "#ffffff",
          success: "#10b981", // Green for success
          "success-content": "#ffffff",
          warning: "#f59e0b", // Amber for warnings
          "warning-content": "#ffffff",
          error: "#ef4444", // Red for errors
          "error-content": "#ffffff",
        },
      },
    ],
    base: true,
    styled: true,
    utils: true,
  },
} satisfies Config;
