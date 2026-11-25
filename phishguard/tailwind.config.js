import animate from "tailwindcss-animate";

/** 60-30-10: navy #0F1B3D (60) / white #FFFFFF (30) / cyan #00D1FF (10) */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0F1B3D", 800: "#16254D", 700: "#1E2F5C", 600: "#2A3D70" },
        cyan: { DEFAULT: "#00D1FF", dark: "#0089A8" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "0 0% 100%" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        safe: "#0F9D6B",
        warn: "#C77A00",
        danger: "#D64045",
      },
      transitionDuration: { 250: "250ms" },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        scan: { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(520%)" } },
        "fade-up": { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "node-pulse": { "0%,100%": { opacity: "0.5", transform: "scale(1)" }, "50%": { opacity: "1", transform: "scale(1.5)" } },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        scan: "scan 5s linear infinite",
        "fade-up": "fade-up 0.7s ease-out both",
        "node-pulse": "node-pulse 3s ease-in-out infinite",
      },
      borderRadius: { lg: "0.5rem", md: "0.375rem", sm: "0.25rem" },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [animate],
};
