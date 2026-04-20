import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: "#faf8f4",
        "paper-dark": "#f0ece4",
        "paper-100": "#f5f0e8",
        "forest": "#4a7c59",
        "forest-dark": "#3a6147",
        "forest-light": "#6a9c79",
        navy: "#1a1a2e",
        "navy-light": "#2a2a4e",
        walnut: "#3c2415",
        charcoal: "#2c2c2c",
        ink: "#4a4035",
        "ink-light": "#7a6e5f",
        gold: "#c9a84c",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        paper: "0 2px 8px rgba(74, 64, 53, 0.12), 0 1px 3px rgba(74, 64, 53, 0.08)",
        "paper-lg": "0 8px 32px rgba(74, 64, 53, 0.16), 0 2px 8px rgba(74, 64, 53, 0.10)",
        "page-curl": "4px 4px 12px rgba(74, 64, 53, 0.15), inset -2px -2px 6px rgba(74, 64, 53, 0.05)",
      },
      backgroundImage: {
        "paper-grain": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
export default config;
