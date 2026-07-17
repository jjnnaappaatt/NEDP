import type { Config } from "tailwindcss";

/**
 * NEDP "civic gamification" design system.
 * Colors are wired to CSS variables (see app/globals.css) so a dark theme can swap later;
 * the §8 spec tokens (hero blue, gold/silver/bronze, 12px radius) are the backbone, with an
 * indigo→violet gamification accent for the leaderboard.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "var(--page)",
        surface: { DEFAULT: "var(--surface-1)", soft: "var(--surface-2)" },
        border: { DEFAULT: "var(--border)", accent: "var(--border-accent)" },
        ink: {
          DEFAULT: "var(--text-primary)",
          soft: "var(--text-secondary)",
          muted: "var(--text-muted)",
          accent: "var(--text-accent)",
        },
        hero: { DEFAULT: "var(--hero)", border: "var(--hero-border)" },
        gold: "var(--gold)",
        silver: "var(--silver)",
        bronze: "var(--bronze)",
        accent: { DEFAULT: "var(--accent)", 2: "var(--accent-2)", soft: "var(--accent-soft)" },
        success: { DEFAULT: "var(--success)", bg: "var(--success-bg)", fg: "var(--success-fg)" },
        warning: { DEFAULT: "var(--warning)", bg: "var(--warning-bg)", fg: "var(--warning-fg)" },
        danger: { DEFAULT: "var(--danger)", bg: "var(--danger-bg)", fg: "var(--danger-fg)" },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
      },
      // Mobile readability: lift the two smallest steps (xs 12→13, sm 14→15) so Thai text
      // never reads cramped on a phone; base stays 16. Hero/number sizes are unaffected.
      fontSize: {
        xs: ["0.8125rem", { lineHeight: "1.15rem" }],
        sm: ["0.9375rem", { lineHeight: "1.4rem" }],
      },
      borderRadius: {
        card: "var(--card-radius)",
        xl2: "20px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04)",
        pop: "0 12px 30px rgba(76,29,149,0.18)",
        podium: "0 18px 40px rgba(76,29,149,0.28)",
      },
      keyframes: {
        fadeUp: { "0%": { opacity: "0", transform: "translateY(10px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        pop: { "0%": { transform: "scale(0.9)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
        routebar: { "0%": { transform: "translateX(-120%)" }, "100%": { transform: "translateX(420%)" } },
      },
      animation: {
        fadeUp: "fadeUp 0.5s ease-out both",
        pop: "pop 0.4s cubic-bezier(0.22,1,0.36,1) both",
        routebar: "routebar 0.9s ease-in-out infinite",
      },
      maxWidth: { content: "768px" },
    },
  },
  plugins: [],
};
export default config;
