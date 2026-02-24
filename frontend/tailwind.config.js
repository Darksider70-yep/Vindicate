export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "Segoe UI", "ui-sans-serif", "sans-serif"],
        body: ["Manrope", "Segoe UI", "ui-sans-serif", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"]
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
        warning: "rgb(var(--color-warning) / <alpha-value>)"
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        xxl: "var(--radius-xxl)"
      },
      boxShadow: {
        soft: "0 14px 40px -22px rgb(15 31 64 / 0.45)",
        card: "0 8px 28px -18px rgb(17 23 42 / 0.35)",
        focus: "0 0 0 3px rgb(var(--color-primary) / 0.35)"
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgb(var(--pulse-color) / 0.35)" },
          "100%": { boxShadow: "0 0 0 18px rgb(var(--pulse-color) / 0)" }
        }
      },
      animation: {
        "fade-in": "fade-in 280ms ease-out",
        pulseRing: "pulseRing 1.35s ease-out infinite"
      }
    }
  }
};