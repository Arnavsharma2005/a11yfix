import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      colors: {
        ink: "#0F1115",
        slate: "#64748B",
        hairline: "#E2E8F0",
        canvas: "#F6F7F9",
        signal: "#0F766E"
      }
    }
  },
  plugins: []
} satisfies Config;
