import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        // Legacy palette
        sky: "#C3EBFA",
        skyLight: "#EDF9FD",
        purple: "#CFCEFF",
        purpleLight: "#F1F0FF",
        yellow: "#FAE27C",
        yellowLight: "#FEFCE8",
        // Light theme — refined cool-white + signature orange
        meadowOrange: "#F97316",
        meadowLight: "#F5F8FC",
        meadowMuted: "#FFF7ED",
        meadowBorder: "#DDE3EB",
        // Dark theme — deep navy luxury
        darkBg: "#0B1120",
        darkSurface: "#111827",
        darkCard: "#1C2437",
        darkBorder: "#2A3650",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 12px 0 rgba(0,0,0,0.10), 0 2px 4px -1px rgba(0,0,0,0.06)",
        "card-dark": "0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.3)",
        "card-dark-hover": "0 4px 16px 0 rgba(0,0,0,0.5), 0 2px 6px -1px rgba(0,0,0,0.4)",
        glow: "0 0 20px rgba(249,115,22,0.25)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
    },
  },
  plugins: [],
};
export default config;
