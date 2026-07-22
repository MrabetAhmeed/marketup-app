import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // shadcn CSS variable bridge
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Brand primary (BrandUP blue, the default app accent)
        primary: {
          DEFAULT: "#0078D4",
          hover: "#106EBE",
          dark: "#005A9E",
          light: "#EFF6FC",
        },

        // Brand accents per product
        traceup: {
          DEFAULT: "#8764B8",
        },
        linkup: {
          black: "#000000",
          gold: "#C5A059",
        },

        // Admin workspace accent
        admin: {
          DEFAULT: "#5C2D91",
          hover: "#4A2375",
          dark: "#3D1F60",
          light: "#F3EFFA",
          tint: "#EBE2F5",
        },

        // Neutral palette (Fluent flat)
        ink: {
          primary: "#242424",
          secondary: "#616161",
          tertiary: "#8A8886",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#FAFAFA",
          muted: "#F5F5F5",
          strong: "#EFEDED",
          border: "#E0E0E0",
        },

        // Semantic status palette (status pills)
        status: {
          "draft-fg": "#475569",
          "draft-bg": "#F1F5F9",
          "draft-border": "#CBD5E1",
          "draft-dot": "#64748B",
          "pending-fg": "#92400E",
          "pending-bg": "#FFFBEB",
          "pending-border": "#FDE68A",
          "pending-dot": "#D97706",
          "active-fg": "#107C10",
          "active-bg": "#F0FDF4",
          "active-border": "#B7EBC0",
          "active-dot": "#107C10",
          "rejected-fg": "#B91C1C",
          "rejected-bg": "#FEF2F2",
          "rejected-border": "#FCA5A5",
          "rejected-dot": "#DC2626",
          "disabled-fg": "#616161",
          "disabled-bg": "#F5F5F5",
          "disabled-border": "#E0E0E0",
          "disabled-dot": "#8A8886",
          "gold-fg": "#8A6A1F",
          "gold-bg": "#FEFCE8",
          "gold-border": "#E8C96A",
          "gold-dot": "#C5A059",
        },
      },
      fontFamily: {
        heading: ["'Plus Jakarta Sans'", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "4px",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        lg: "8px",
        xl: "12px",
        // DO NOT add 2xl / 3xl — Fluent flat scale only
      },
      boxShadow: {
        card: "0 2px 4px rgba(0,0,0,0.08)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.12)",
        modal: "0 8px 32px rgba(0,0,0,0.16)",
      },
    },
  },
  keyframes: {
    breathe: {
      "0%, 100%": { filter: "grayscale(100%) brightness(0.7)" },
      "50%": { filter: "grayscale(0%) brightness(1)" },
    },
  },
  animation: { breathe: "breathe 8s ease-in-out infinite" },

  plugins: [],
};
export default config;
