import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "rgb(11 13 18)",
        panel: "rgb(17 21 29)",
        line: "rgb(37 44 57)",
        text: "rgb(236 240 245)",
        muted: "rgb(156 163 175)",
        accent: "rgb(77 208 225)",
        accent2: "rgb(244 114 182)",
        good: "rgb(52 211 153)",
        bad: "rgb(248 113 113)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(77,208,225,.15), 0 20px 60px rgba(0,0,0,.35)",
      },
    },
  },
  plugins: [],
};

export default config;
