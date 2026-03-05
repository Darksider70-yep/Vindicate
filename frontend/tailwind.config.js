export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      spacing: {
        xs: "var(--space-xs)",
        sm: "var(--space-sm)",
        md: "var(--space-md)",
        lg: "var(--space-lg)",
        xl: "var(--space-xl)",
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        xxl: "var(--radius-xxl)",
      },
      fontFamily: {
        display: ["Space Grotesk", "Segoe UI", "ui-sans-serif", "sans-serif"],
        body: ["Manrope", "Segoe UI", "ui-sans-serif", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        xs: "0.75rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.875rem",
        "4xl": "2.25rem",
      },
      colors: {
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        text: "rgb(var(--color-text) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        "primary-strong": "rgb(var(--color-primary-strong) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
      },
      boxShadow: {
        soft: "0 14px 40px -22px rgb(15 31 64 / 0.45)",
        card: "0 8px 28px -18px rgb(17 23 42 / 0.35)",
        focus: "0 0 0 3px rgb(var(--color-primary) / 0.35)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-from-left": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-in-from-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-in-from-top": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" },
        },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgb(var(--pulse-color) / 0.35)" },
          "100%": { boxShadow: "0 0 0 18px rgb(var(--pulse-color) / 0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 280ms ease-out",
        "slide-in-from-left": "slide-in-from-left 300ms ease-out",
        "slide-in-from-right": "slide-in-from-right 300ms ease-out",
        "slide-in-from-top": "slide-in-from-top 300ms ease-out",
        pulseRing: "pulseRing 1.35s ease-out infinite",
      },
    },
  },
};