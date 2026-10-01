/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#006948",
          dark: "#005137",
          container: "#00855d",
          "on-container": "#f5fff7",
          fixed: "#85f8c4",
          "fixed-dim": "#68dba9",
        },
        surface: {
          DEFAULT: "#f8f9ff",
          dim: "#cbdbf5",
          bright: "#f8f9ff",
          container: "#e5eeff",
          "container-lowest": "#ffffff",
          "container-low": "#eff4ff",
          "container-high": "#dce9ff",
          "container-highest": "#d3e4fe",
        },
        "on-surface": "#0b1c30",
        "on-surface-variant": "#3d4a42",
        "outline-variant": "#bccac0",
        outline: "#6d7a72",
        secondary: {
          DEFAULT: "#565e74",
          dark: "#0f172a",
          fixed: "#dae2fd",
          container: "#dae2fd",
          "on-container": "#5c647a",
        },
        tertiary: {
          DEFAULT: "#712ae2",
          container: "#8a4cfc",
          "on-container": "#fffbff",
          fixed: "#eaddff",
        },
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
          "on-container": "#93000a",
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "'Inter'", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        stitch: "0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.03)",
        "stitch-hover": "0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)",
        "stitch-elevated": "0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)",
      },
    },
  },
  plugins: [],
};
